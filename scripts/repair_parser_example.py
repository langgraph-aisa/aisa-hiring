from pathlib import Path
path = Path('/home/ubuntu/reclutamiento-automatizado/n8n-workflows/02_agente_plaza_template.json')
lines = path.read_text().splitlines()
replacement = '        "jsonSchemaExample": "{\\"status\\":\\"calificado\\",\\"reason\\":\\"Cumple las condiciones configuradas\\",\\"profileSummary\\":\\"Resumen del perfil\\",\\"keyPoints\\":[\\"experiencia\\",\\"ubicacion\\"],\\"confidence\\":0.92,\\"ruleResults\\":[{\\"question_id\\":12,\\"result\\":\\"passed\\"}]}"'
for i, line in enumerate(lines):
    if '"jsonSchemaExample"' in line:
        lines[i] = replacement
        break
else:
    raise SystemExit('jsonSchemaExample not found')
path.write_text('\n'.join(lines) + '\n')
