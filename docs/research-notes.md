# Fuentes externas y decisiones verificadas

## Instituto Nacional de Estadística de Guatemala

La página oficial del [Instituto Nacional de Estadística de Guatemala](https://www.ine.gob.gt/) expone las secciones de Población, Censo 2018 y Cartografía, que serán las rutas de referencia para mantener el catálogo geográfico. La búsqueda oficial identificó el archivo descargable [Departamentos y municipios](https://www.ine.gob.gt/sistema/uploads/2016/10/28/0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls), que contiene nomenclatura de departamentos y municipios de Guatemala. El diseño conservará códigos y nombres, permitirá importaciones posteriores y dejará el nivel “zona” administrable porque puede requerir una fuente o granularidad operativa adicional.

## n8n: importación de workflows

La documentación oficial [Export and import](https://docs.n8n.io/build/manage-workflows/export-and-import) confirma que n8n guarda workflows en JSON y permite importarlos desde archivo o URL. También advierte que los JSON exportados pueden incluir nombres e IDs de credenciales, por lo que los entregables no deben contener secretos y deben usar marcadores o referencias pendientes.

## n8n: salida estructurada de IA

La documentación oficial [Structured Output Parser](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserstructured) confirma que el nodo puede devolver campos conforme a un JSON Schema. Se usará para exigir `status`, `reason`, `profileSummary`, `keyPoints` y `confidence` en la evaluación de respuestas abiertas. La página también señala que los subnodos resuelven expresiones respecto al primer item, decisión relevante para no enviar lotes ambiguos al evaluador.

## n8n: espera diferida

La documentación oficial [Wait](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait) confirma que el nodo puede pausar y descargar los datos de ejecución a la base de n8n, reanudando después de un intervalo o por webhook. Se usará una espera de 10 minutos únicamente para cambios humanos a `calificado`, seguida de una consulta del estado actual para cancelar la continuación si el estado cambió.

## n8n: nodo OpenAI/ChatGPT

La documentación [OpenAI Functions Agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/openai-functions-agent) indica que el nodo histórico OpenAI Functions Agent está deprecado desde n8n 1.82 y se recomienda utilizar el agente actual Tools Agent para nuevas implementaciones. La solución usa el subnodo OpenAI Chat Model y Basic LLM Chain con parser estructurado, evitando depender del agente deprecado.

## Decisiones del proyecto

La aplicación se diseñó como React + Express + tRPC con una capa PostgreSQL dedicada, porque el proyecto requiere formularios públicos, autenticación y administración. La infraestructura administrada del proyecto de desarrollo trae una configuración de base distinta, por lo que la migración PostgreSQL se entrega como artefacto explícito para EasyPanel y no se aplica contra una base incompatible mientras las credenciales permanezcan pendientes.

La URL compartida por el usuario (`https://aisa-testing-n8n-testing.4ugrim.easypanel.host/workflow/ZY6v5gZ3pUN5EL_KVJSpe`) es una URL del editor de n8n; la integración de producción debe utilizar la URL pública de cada webhook, no la URL del editor. Los workflows dejan `APICHAT_WEBHOOK_URL`, `APICHAT_CONNECT_TO`, `APICHAT_API_ENDPOINT`, `APICHAT_ACCOUNT_ID`, `APICHAT_TOKEN`, `N8N_AGENT_EVALUATION_URL` y `N8N_MANUAL_STATUS_WEBHOOK_URL` parametrizados.

## Verificación del archivo oficial

El archivo XLS del INE fue abierto desde la URL oficial y descargado en el entorno de trabajo como `0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls`. La navegación confirmó que el sitio oficial mantiene las secciones de Censo Población 2018 y Cartografía. La aplicación usará este archivo como fuente inicial de departamentos y municipios, con zonas como catálogo configurable.
