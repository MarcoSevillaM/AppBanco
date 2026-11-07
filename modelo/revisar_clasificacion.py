"""
Consultar cómo están clasificadas las transacciones en la base de datos (solo lectura)

Uso:
    python revisar_clasificacion.py resumen             # cuántas hay por origen y por categoría
    python revisar_clasificacion.py dudosas [n]         # las n con menos confianza (por defecto 20)
    python revisar_clasificacion.py buscar <texto>      # las que contienen el texto en el concepto
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'data' / 'banco.db'


def conectar():
    if not DB_PATH.exists():
        print(f'❌ Base de datos no encontrada en {DB_PATH}')
        sys.exit(1)
    # Solo lectura: no se puede modificar la BD por error
    return sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)


def imprimir(filas):
    for fecha, concepto, importe, categoria, origen, confianza in filas:
        conf = f'{confianza:.0%}' if confianza is not None else '  -'
        print(f'{fecha}  {importe:>9.2f} €  {categoria:<19} {origen or "-":<9} {conf:>4}  {concepto[:60]}')


def resumen(conn):
    print('\n📊 Por origen de la categoría:')
    for origen, n in conn.execute(
            'SELECT categoria_origen, COUNT(*) FROM transacciones GROUP BY 1 ORDER BY 2 DESC'):
        print(f'   {origen or "-":<10} {n:>5}')

    print('\n📁 Por categoría (total / revisadas a mano):')
    for categoria, n, manuales in conn.execute("""
            SELECT categoria, COUNT(*), SUM(categoria_origen = 'manual')
            FROM transacciones GROUP BY 1 ORDER BY 2 DESC"""):
        print(f'   {categoria:<20} {n:>5} / {manuales}')


def dudosas(conn, n):
    print(f'\n🔴 Las {n} clasificaciones automáticas con menos confianza:\n')
    imprimir(conn.execute("""
        SELECT fecha, concepto, importe, categoria, categoria_origen, categoria_confianza
        FROM transacciones
        WHERE categoria_origen != 'manual' AND categoria_confianza IS NOT NULL
        ORDER BY categoria_confianza LIMIT ?""", (n,)))


def buscar(conn, texto):
    print(f'\n🔍 Transacciones con "{texto}":\n')
    imprimir(conn.execute("""
        SELECT fecha, concepto, importe, categoria, categoria_origen, categoria_confianza
        FROM transacciones WHERE concepto LIKE ? ORDER BY fecha DESC""", (f'%{texto}%',)))


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ('resumen', 'dudosas', 'buscar'):
        print(__doc__)
        sys.exit(1)

    conn = conectar()
    comando = sys.argv[1]
    if comando == 'resumen':
        resumen(conn)
    elif comando == 'dudosas':
        dudosas(conn, int(sys.argv[2]) if len(sys.argv) > 2 else 20)
    else:
        buscar(conn, ' '.join(sys.argv[2:]))
    conn.close()
    print()


if __name__ == '__main__':
    main()
