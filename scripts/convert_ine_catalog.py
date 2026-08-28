from pathlib import Path
import json
import pandas as pd

source = Path('/home/ubuntu/Downloads/0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls')
out = Path('/home/ubuntu/reclutamiento-automatizado/database/ine_guatemala_departments_municipalities.json')
out.parent.mkdir(parents=True, exist_ok=True)

book = pd.ExcelFile(source, engine='xlrd')
rows = []
for sheet in book.sheet_names:
    frame = pd.read_excel(source, sheet_name=sheet, engine='xlrd', header=None)
    for values in frame.fillna('').astype(str).values.tolist():
        clean = [value.strip() for value in values if value.strip()]
        if clean:
            rows.append({'source_sheet': sheet, 'values': clean})

out.write_text(json.dumps({'source': 'INE Guatemala', 'source_url': 'https://www.ine.gob.gt/sistema/uploads/2016/10/28/0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls', 'sheets': book.sheet_names, 'rows': rows}, ensure_ascii=False, indent=2) + '\n')
print(f'Converted {len(rows)} rows from {len(book.sheet_names)} sheets to {out}')
