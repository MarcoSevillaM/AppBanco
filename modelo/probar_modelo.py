"""
Script para probar el modelo entrenado

Uso:
    python probar_modelo.py                                  # ejemplos predefinidos
    python probar_modelo.py "Pago Movil En Mercadona ..."    # un concepto
    python probar_modelo.py "Bizum De Ana Concepto Cena" --importe 15
"""

import sys
from modelo_clasificador import ModeloClasificador


def probar_ejemplos():
    """Probar con ejemplos predefinidos"""
    modelo = ModeloClasificador()
    
    if not modelo.cargar():
        print('❌ Modelo no encontrado. Entrena el modelo primero.')
        print('   python entrenar_modelo.py')
        return
    
    print('\n' + '=' * 60)
    print('  🧪 PRUEBA DEL MODELO DE CLASIFICACIÓN')
    print('=' * 60)
    
    ejemplos = [
        'MERCADONA SUPERMERCADO MADRID',
        'CARREFOUR COMPRA SEMANAL',
        'REPSOL GASOLINERA',
        'PARKING CENTRO COMERCIAL',
        'NETFLIX SUSCRIPCION MENSUAL',
        'IBERDROLA ELECTRICIDAD',
        'RESTAURANTE LA TASCA',
        'ZARA ROPA',
        'DEGIRO COMPRA ACCIONES',
        'NOMINA EMPRESA SL',
        'AMAZON COMPRA',
        'TRANSFERENCIA',
    ]
    
    print('\n📊 Clasificando ejemplos...\n')
    
    for concepto in ejemplos:
        resultado = modelo.predecir(concepto)
        
        # Emoji por categoría
        emoji = {
            'Alimentación': '🛒',
            'Coche': '🚗',
            'Gastos recurrentes': '🔁',
            'Ocio': '🎉',
            'Inversiones': '📈',
            'Vivienda': '🏠',
            'Ingresos': '💰',
            'Otros': '📦'
        }.get(resultado['categoria'], '📦')
        
        # Color por confianza
        confianza = resultado['confianza']
        color = '🟢' if confianza > 0.8 else '🟡' if confianza > 0.6 else '🔴'
        
        print(f'{emoji} "{concepto}"')
        print(f'   → {resultado["categoria"]} {color} {confianza:.1%}\n')


def probar_concepto(concepto, importe=None):
    """Probar con un concepto específico (el importe es opcional)"""
    modelo = ModeloClasificador()
    
    if not modelo.cargar():
        print('❌ Modelo no encontrado.')
        return
    
    resultado = modelo.predecir(concepto, importe)

    print(f'\n🔍 Analizando: "{concepto}"' + (f' ({importe} €)' if importe is not None else ''))
    print(f'\n📊 Resultado: {resultado["categoria"]}')
    print(f'🎯 Confianza: {resultado["confianza"]:.1%}')
    print('\nProbabilidades por categoría:')
    
    for prob in sorted(resultado['probabilidades'], key=lambda x: x['probabilidad'], reverse=True):
        barra = '█' * int(prob['probabilidad'] * 20)
        print(f'   {prob["categoria"]:<20} {barra} {prob["probabilidad"]:.1%}')
    
    print()


if __name__ == '__main__':
    args = sys.argv[1:]
    importe = None
    if '--importe' in args:
        i = args.index('--importe')
        importe = float(args[i + 1].replace(',', '.'))
        args = args[:i] + args[i + 2:]

    if args:
        probar_concepto(' '.join(args), importe)
    else:
        probar_ejemplos()
