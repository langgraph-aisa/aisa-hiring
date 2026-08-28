from pathlib import Path
import pandas as pd

source = Path('/home/ubuntu/Downloads/0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls')
out = Path('/home/ubuntu/reclutamiento-automatizado/database/002_ine_catalog_seed.sql')
frame = pd.read_excel(source, sheet_name='Departamentos y municipios', engine='xlrd', header=None).fillna('')
departments = []
municipalities = []
for _, row in frame.iterrows():
    code = str(row.iloc[1]).strip()
    name = str(row.iloc[2]).strip()
    if not code or not name or code == 'nan' or not code.replace('.', '', 1).isdigit():
        continue
    code = str(int(float(code)))
    if len(code) <= 2:
        departments.append((code.zfill(2), name))
    else:
        municipalities.append((code, name))

def q(value):
    return "'" + value.replace("'", "''") + "'"

lines = ["-- Fuente: INE Guatemala", "-- Archivo: 0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls", "-- Ejecutar después de la migración base y de crear el país GT.", "INSERT INTO countries (iso2,name,dialing_code,active) VALUES ('GT','Guatemala','+502',true) ON CONFLICT (iso2) DO NOTHING;", ""]
for code, name in departments:
    lines.append(f"INSERT INTO geo_departments (country_id,code,name,active) SELECT id,{q(code)},{q(name)},true FROM countries WHERE iso2='GT' ON CONFLICT (country_id,code) DO UPDATE SET name=EXCLUDED.name,active=true;")
lines.append("")
for code, name in municipalities:
    department_code = code[:2]
    lines.append(f"INSERT INTO geo_municipalities (department_id,code,name,active) SELECT id,{q(code)},{q(name)},true FROM geo_departments WHERE code={q(department_code)} AND country_id=(SELECT id FROM countries WHERE iso2='GT') ON CONFLICT (department_id,code) DO UPDATE SET name=EXCLUDED.name,active=true;")
lines.append("")
out.write_text('\n'.join(lines) + '\n')
print(f'Generated {len(departments)} departments and {len(municipalities)} municipalities in {out}')
