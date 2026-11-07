"""
Modelo de IA para clasificación de transacciones bancarias
TF-IDF de palabras + TF-IDF de caracteres + Regresión logística.
Los n-gramas de caracteres aguantan bien los textos recortados del banco
("Mercadona Los T", "Carref S S De L") y el importe aporta el signo y la magnitud.
"""

import pathlib
import pickle
import json
import re
import sys
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline, FeatureUnion
import unidecode

# Mismos nombres que en la BD y el frontend
CATEGORIAS = [
    'Inversiones',
    'Coche',
    'Alimentación',
    'Gastos recurrentes',
    'Ocio',
    'Ingresos',
    'Vivienda',
    'Otros'
]

# Nombres antiguos -> nombre canónico
ALIAS_CATEGORIAS = {
    'Inversión': 'Inversiones',
    'Inversion': 'Inversiones',
    'Gastos Recurrentes': 'Gastos recurrentes'
}

# Partes del concepto de Santander que no dicen nada del comercio
RUIDO = [
    re.compile(r'[,\s]*tarj(?:eta)?\b.*$'),        # "Tarj. :*047140" / "Tarjeta 5489..., Comision 0,00"
    re.compile(r'^(pago movil en|compra internet en|compra de|compra)\b'),
    re.compile(r'\d+'),
]

PREFIJO_IMPORTE = 'zz'


def normalizar_categoria(categoria):
    return ALIAS_CATEGORIAS.get(categoria, categoria)


def limpiar_concepto(texto):
    """Minúsculas, sin tildes, sin datos de tarjeta, números ni signos"""
    if not texto:
        return ''
    texto = unidecode.unidecode(texto.lower())
    texto = ''.join(c if c.isalnum() or c.isspace() or c == ',' else ' ' for c in texto)
    for patron in RUIDO:
        texto = patron.sub(' ', texto.strip())
    return ' '.join(texto.replace(',', ' ').split())


def texto_con_importe(concepto, importe=None):
    """Concepto limpio más dos marcas del importe: signo y tamaño"""
    texto = limpiar_concepto(concepto)
    if importe is None:
        return texto
    importe = float(importe)
    signo = 'entrada' if importe > 0 else 'salida'
    absoluto = abs(importe)
    if absoluto < 10:
        tamano = 'pequeno'
    elif absoluto < 50:
        tamano = 'medio'
    elif absoluto < 200:
        tamano = 'alto'
    else:
        tamano = 'muyalto'
    return f'{texto} {PREFIJO_IMPORTE}{signo} {PREFIJO_IMPORTE}{tamano}'


def solo_texto(texto):
    """Quitar las marcas del importe para los n-gramas de caracteres"""
    return ' '.join(p for p in texto.split() if not p.startswith(PREFIJO_IMPORTE))


def crear_pipeline():
    return Pipeline([
        ('features', FeatureUnion([
            ('palabras', TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
            ('caracteres', TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5),
                                           preprocessor=solo_texto, sublinear_tf=True)),
        ])),
        ('clf', LogisticRegression(C=10, class_weight='balanced', max_iter=3000))
    ])


class _CrossPlatformUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module == "pathlib" and name == "WindowsPath":
            return pathlib.PosixPath
        return super().find_class(module, name)


class ModeloClasificador:
    def __init__(self):
        self.categorias = CATEGORIAS
        self.modelo = crear_pipeline()
        self.modelo_path = Path(__file__).parent / 'modelo_guardado.pkl'
        self.cargado = False

    def entrenar(self, transacciones):
        """
        Entrenar con todas las transacciones.
        transacciones: lista de dict con 'concepto', 'importe' y 'categoria'
        """
        X = [texto_con_importe(t['concepto'], t.get('importe')) for t in transacciones]
        y = [normalizar_categoria(t['categoria']) for t in transacciones]
        self.modelo.fit(X, y)
        self.cargado = True
        return self

    def predecir_lote(self, items):
        """
        items: lista de dict con 'concepto' y opcionalmente 'importe'
        Devuelve categoría, confianza y probabilidades de cada uno
        """
        if not self.cargado:
            raise Exception('Modelo no entrenado. Ejecuta entrenar_modelo.py primero.')

        textos = [texto_con_importe(i.get('concepto'), i.get('importe')) for i in items]
        probabilidades = self.modelo.predict_proba(textos)
        clases = [normalizar_categoria(c) for c in self.modelo.classes_]

        resultados = []
        for item, probs in zip(items, probabilidades):
            ordenadas = sorted(zip(clases, probs), key=lambda p: p[1], reverse=True)
            resultados.append({
                'concepto': item.get('concepto'),
                'categoria': ordenadas[0][0],
                'confianza': float(ordenadas[0][1]),
                'probabilidades': [
                    {'categoria': cat, 'probabilidad': float(prob)} for cat, prob in ordenadas
                ]
            })
        return resultados

    def predecir(self, concepto, importe=None):
        return self.predecir_lote([{'concepto': concepto, 'importe': importe}])[0]

    def guardar(self):
        print(f'\n💾 Guardando modelo en {self.modelo_path}...')
        with open(self.modelo_path, 'wb') as f:
            pickle.dump(self.modelo, f)
        print('✅ Modelo guardado')

    def cargar(self):
        if not self.modelo_path.exists():
            return False

        try:
            with open(self.modelo_path, 'rb') as f:
                try:
                    self.modelo = pickle.load(f)
                except NotImplementedError:
                    f.seek(0)
                    self.modelo = _CrossPlatformUnpickler(f).load()
            self.cargado = True
            return True
        except Exception as e:
            print(f'Error cargando modelo: {e}', file=sys.stderr)
            return False


def main():
    """Interfaz de línea de comandos (la usa ClasificadorService.js)"""
    if len(sys.argv) < 2:
        print('Uso: python modelo_clasificador.py <comando> [argumentos]')
        print('\nComandos:')
        print('  predecir <concepto>  - Clasificar un concepto')
        print('  predecir_json        - Clasificar desde stdin: {"items": [{"concepto", "importe"}]}')
        sys.exit(1)

    comando = sys.argv[1]
    modelo = ModeloClasificador()

    if not modelo.cargar():
        print('❌ Modelo no encontrado. Ejecuta: python entrenar_modelo.py', file=sys.stderr)
        sys.exit(1)

    if comando == 'predecir':
        if len(sys.argv) < 3:
            print('Error: Falta el concepto a clasificar', file=sys.stderr)
            sys.exit(1)
        resultado = modelo.predecir(' '.join(sys.argv[2:]))
        print(json.dumps(resultado, ensure_ascii=False))

    elif comando == 'predecir_json':
        datos = json.loads(sys.stdin.buffer.read().decode('utf-8'))
        items = datos.get('items') or [{'concepto': c} for c in datos.get('conceptos', [])]
        print(json.dumps(modelo.predecir_lote(items), ensure_ascii=False))

    else:
        print(f'Comando desconocido: {comando}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
