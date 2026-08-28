import json
from pathlib import Path

root = Path('/home/ubuntu/reclutamiento-automatizado/n8n-workflows')
files = sorted(root.glob('*.json'))
if len(files) < 4:
    raise SystemExit(f'Expected at least 4 workflow JSON files, found {len(files)}')

for path in files:
    data = json.loads(path.read_text())
    if not data.get('name') or not isinstance(data.get('nodes'), list):
        raise SystemExit(f'{path.name}: missing name/nodes')
    names = {node.get('name') for node in data['nodes']}
    if None in names or len(names) != len(data['nodes']):
        raise SystemExit(f'{path.name}: node names must be unique and present')
    for node in data['nodes']:
        for key in ('id', 'name', 'type', 'typeVersion', 'position'):
            if key not in node:
                raise SystemExit(f'{path.name}: node {node.get("name")} missing {key}')
        credentials = json.dumps(node.get('credentials', {}), ensure_ascii=False)
        if any(secret in credentials.lower() for secret in ('api_key', 'bearer ', 'sk-', 'token_value')):
            raise SystemExit(f'{path.name}: possible secret in credentials for {node["name"]}')
    for source, targets in data.get('connections', {}).items():
        if source not in names:
            raise SystemExit(f'{path.name}: connection source {source} not found')
        for branches in targets.values():
            for branch in branches:
                for target in branch:
                    if target.get('node') not in names:
                        raise SystemExit(f'{path.name}: connection target {target.get("node")} not found')
    text = path.read_text()
    if 'PENDIENTE' not in text and path.name != '01_flujo_maestro_postulaciones.json':
        raise SystemExit(f'{path.name}: expected explicit pending credential markers')
    required = {
        '01_flujo_maestro_postulaciones.json': ['process_public_application', 'alreadyApplied', 'N8N_AGENT_EVALUATION_URL'],
        '02_agente_plaza_template.json': ['lmChatOpenAi', 'outputParserStructured', 'jsonSchemaExample', 'application_id', 'finalize_application_evaluation'],
        '03_revision_humana_10m.json': ['10', 'timeInterval', 'Verificar estado actual', 'Cancelar continuación', 'Sigue calificado'],
        '04_whatsapp_apichat.json': ['APICHAT_API_ENDPOINT', 'APICHAT_TOKEN', 'APICHAT_ACCOUNT_ID', 'APICHAT_CONNECT_TO', 'internalMessages', 'whatsapp_status'],
    }
    for marker in required.get(path.name, []):
        if marker not in text:
            raise SystemExit(f'{path.name}: missing semantic marker {marker}')
    print(f'OK {path.name}: {len(data["nodes"])} nodes; semantic markers present')
print(f'Validated {len(files)} n8n workflow files')
