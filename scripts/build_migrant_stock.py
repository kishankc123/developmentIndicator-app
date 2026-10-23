"""Builds public/data/migrant-stock.json from the UN DESA International Migrant Stock 2024 file.

Source (CC BY 3.0 IGO): United Nations Department of Economic and Social Affairs, Population
Division (2024). International Migrant Stock 2024.
https://www.un.org/development/desa/pd/content/international-migrant-stock

Usage (needs `pip install openpyxl pycountry`; the .xlsx is not fetched by this script):
  python scripts/build_migrant_stock.py \
    CLAUDE/data/undesa_pd_2024_ims_stock_by_sex_destination_and_origin.xlsx \
    public/data/migrant-stock.json

Output: for each origin country (ISO3), how many people born there live abroad in total, and the
TOP_N destinations (ISO3), each with a count per year. Stock is a count of people living in a
country at mid-year, not people who moved that year.
"""
import json
import sys

import openpyxl
import pycountry

TOP_N = 15
HEADER_ROW = 11  # row with the column titles in "Table 1"
FIRST_VALUE_COL = 7  # both-sexes block: 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024
DEST_CODE, ORIGIN_CODE = 4, 6
WORLD = 900
# UN M49 codes below 900 are countries or areas; 900 and above are regions and groups.


def numeric_to_iso3() -> dict[int, str]:
    return {int(c.numeric): c.alpha_3 for c in pycountry.countries}


def main(source: str, target: str) -> None:
    to_iso3 = numeric_to_iso3()
    ws = openpyxl.load_workbook(source, read_only=True, data_only=True)['Table 1']
    rows = ws.iter_rows(min_row=HEADER_ROW, values_only=True)
    header = next(rows)
    years = [int(y) for y in header[FIRST_VALUE_COL : FIRST_VALUE_COL + 8]]

    totals: dict[str, list] = {}  # origin ISO3 -> people living abroad, per year
    pairs: dict[str, list] = {}  # origin ISO3 -> [[dest ISO3, per-year counts], ...]
    unmapped: set[tuple[int, str]] = set()

    for row in rows:
        dest, origin = row[DEST_CODE], row[ORIGIN_CODE]
        if not isinstance(origin, int) or not isinstance(dest, int) or origin >= WORLD:
            continue
        values = [int(v) if isinstance(v, (int, float)) else None for v in row[FIRST_VALUE_COL : FIRST_VALUE_COL + 8]]
        if origin not in to_iso3:
            unmapped.add((origin, str(row[5])))
            continue
        if dest == WORLD:
            totals[to_iso3[origin]] = values
        elif dest < WORLD:
            if dest not in to_iso3:
                unmapped.add((dest, str(row[1])))
                continue
            pairs.setdefault(to_iso3[origin], []).append([to_iso3[dest], values])

    out = {}
    for origin, dests in pairs.items():
        # The latest year decides the ranking; countries with no 2024 figure sort last.
        dests.sort(key=lambda d: d[1][-1] or 0, reverse=True)
        top = [d for d in dests[:TOP_N] if (d[1][-1] or 0) > 0]
        if top:
            out[origin] = {'total': totals.get(origin, [None] * len(years)), 'to': top}

    with open(target, 'w') as f:
        json.dump({'years': years, 'origins': out}, f, separators=(',', ':'))
    print(f'{len(out)} origin countries, years {years[0]}-{years[-1]}, top {TOP_N} destinations each')
    if unmapped:
        print('No ISO3 for (skipped):', sorted(unmapped))


if __name__ == '__main__':
    main(*sys.argv[1:3])
