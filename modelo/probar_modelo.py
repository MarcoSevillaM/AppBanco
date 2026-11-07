"""
Script para probar el modelo entrenado
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
            'Gastos Recurrentes': '🔁',
            'Ocio': '🎉',
            'Inversión': '📈',
            'Ingresos': '💰',
            'Otros': '📦'
        }.get(resultado['categoria'], '📦')
        
        # Color por confianza
        confianza = resultado['confianza']
        color = '🟢' if confianza > 0.8 else '🟡' if confianza > 0.6 else '🔴'
        
        print(f'{emoji} "{concepto}"')
        print(f'   → {resultado["categoria"]} {color} {confianza:.1%}\n')


def probar_concepto(concepto):
    """Probar con un concepto específico"""
    modelo = ModeloClasificador()
    
    if not modelo.cargar():
        print('❌ Modelo no encontrado.')
        return
    
    resultado = modelo.predecir(concepto)
    
    print(f'\n🔍 Analizando: "{concepto}"')
    print(f'\n📊 Resultado: {resultado["categoria"]}')
    print(f'🎯 Confianza: {resultado["confianza"]:.1%}')
    print('\nProbabilidades por categoría:')
    
    for prob in sorted(resultado['probabilidades'], key=lambda x: x['probabilidad'], reverse=True):
        barra = '█' * int(prob['probabilidad'] * 20)
        print(f'   {prob["categoria"]:<20} {barra} {prob["probabilidad"]:.1%}')
    
    print()


if __name__ == '__main__':
    if len(sys.argv) > 1:
        concepto = ' '.join(sys.argv[1:])
        probar_concepto(concepto)
    else:
        probar_ejemplos()
