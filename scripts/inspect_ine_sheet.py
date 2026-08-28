from pathlib import Path
import pandas as pd

source = Path('/home/ubuntu/Downloads/0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls')
frame = pd.read_excel(source, sheet_name='Departamentos y municipios', engine='xlrd', header=None)
print(frame.head(25).to_string(index=False, header=False))
print('shape', frame.shape)
