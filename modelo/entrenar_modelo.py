"""
Script para entrenar el modelo de clasificación
Lee las transacciones de la base de datos SQLite y entrena el modelo.

Se entrena con todas, pero la precisión se mide solo contra las categorías
puestas a mano (categoria_origen = 'manual'): medir contra lo que puso el
propio modelo no dice nada.
"""

import sqlite3
from pathlib import Path

from sklearn.model_selection import KFold

from modelo_clasificador import ModeloClasificador, normalizar_categoria


def obtener_transacciones_db():
    """Devuelve (manuales, automáticas) con concepto, importe y categoría"""
    db_path = Path(__file__).parent.parent / 'data' / 'banco.db'

    if not db_path.exists():
        print(f'❌ Base de datos no encontrada en {db_path}')
        return [], []

    print(f'📁 Conectando a base de datos: {db_path}')
    conn = sqlite3.connect(db_path)
    columnas = [fila[1] for fila in conn.execute('PRAGMA table_info(transacciones)')]
    origen = "categoria_origen = 'manual'" if 'categoria_origen' in columnas else '0'

    filas = conn.execute(f"""
        SELECT concepto, importe, categoria, {origen}
        FROM transacciones
        WHERE concepto IS NOT NULL AND categoria IS NOT NULL
    """).fetchall()
    conn.close()

    manuales, automaticas = [], []
    for concepto, importe, categoria, es_manual in filas:
        t = {'concepto': concepto, 'importe': importe, 'categoria': normalizar_categoria(categoria)}
        (manuales if es_manual else automaticas).append(t)

    print(f'✅ {len(filas)} transacciones ({len(manuales)} revisadas a mano)')
    return manuales, automaticas


def evaluar(manuales, automaticas):
    """Validación cruzada: precisión sobre las categorías puestas a mano"""
    if len(manuales) < 20:
        print('⚠️  Menos de 20 transacciones revisadas a mano: no se puede medir la precisión')
        return

    aciertos = 0
    for entrenamiento, prueba in KFold(5, shuffle=True, random_state=0).split(manuales):
        datos = [manuales[i] for i in entrenamiento] + automaticas
        modelo = ModeloClasificador().entrenar(datos)
        casos = [manuales[i] for i in prueba]
        predicciones = modelo.predecir_lote(casos)
        aciertos += sum(p['categoria'] == c['categoria'] for p, c in zip(predicciones, casos))

    print(f'\n🎯 Precisión sobre lo revisado a mano (validación cruzada): {aciertos / len(manuales):.1%}')


def main():
    print('')
    print('=' * 50)
    print('  🧠 ENTRENAMIENTO DEL MODELO DE IA (Python)')
    print('=' * 50)
    print('')

    manuales, automaticas = obtener_transacciones_db()
    if not manuales and not automaticas:
        return

    evaluar(manuales, automaticas)

    modelo = ModeloClasificador()
    modelo.entrenar(manuales + automaticas)
    modelo.guardar()

    print('\n🧪 Probando clasificaciones:')
    print('-' * 50)
    ejemplos = [
        ('Pago Movil En Mercadona Avda, Salamanca, Tarj. :*047140', -25.0),
        ('Pago Movil En E.s. Campsa Red, Madrid Es, Tarj. :*199140', -40.0),
        ('Bizum A Favor De Ana Isabel Martin Saiz Concepto: Telefono', -20.0),
        ('Transferencia De Universidad De Salamanca, Concepto Abono De Nominas.', 1400.0),
        ('Compra Internet En Vueling Airline, Prat De Llobr, Tarj. :*047140', -120.0),
    ]
    for concepto, importe in ejemplos:
        resultado = modelo.predecir(concepto, importe)
        print(f'\n📝 "{concepto}" ({importe} €)')
        print(f'   → {resultado["categoria"]} ({resultado["confianza"]:.1%})')

    print('\n' + '=' * 50)
    print('  ✅ ENTRENAMIENTO COMPLETADO')
    print('=' * 50)
    print('')


if __name__ == '__main__':
    main()
