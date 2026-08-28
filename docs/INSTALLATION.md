# Talento Claro · instalación on-premise

## Alcance

Este proyecto contiene una aplicación web responsive para postulaciones y operación de reclutamiento, una base PostgreSQL transaccional, un catálogo inicial de departamentos y municipios de Guatemala y cuatro workflows JSON para n8n. Las credenciales permanecen fuera del repositorio.

> La configuración de la base de datos del entorno administrado de desarrollo no se utiliza para PostgreSQL. La migración se entrega para ejecutarse en la instancia PostgreSQL que se configure en EasyPanel.

## Componentes

| Componente | Responsabilidad | Credencial pendiente |
|---|---|---|
| Aplicación React + Express + tRPC | Formulario público, panel, configuración e informes | `DATABASE_URL`, autenticación del proveedor elegido |
| PostgreSQL | Plazas, formularios, respuestas, candidatos, evaluaciones, conversaciones y auditoría | Usuario, contraseña, host, puerto, SSL |
| n8n on-premise | Orquestación, agentes por plaza, espera y WhatsApp | Credenciales Postgres, OpenAI/ChatGPT y ApiChat |
| ApiChat | Mensajes de WhatsApp y alertas internas | `APICHAT_ACCOUNT_ID`, `APICHAT_TOKEN` y parámetros de conexión |
| OpenAI/ChatGPT | Razonamiento de respuestas abiertas | Credencial del nodo nativo de n8n |

## PostgreSQL

1. Crear una base PostgreSQL en EasyPanel y activar SSL si la red lo requiere.
2. Definir `DATABASE_URL` en la aplicación y crear una credencial PostgreSQL con el mismo acceso dentro de n8n.
3. Ejecutar, en este orden, `drizzle/migrations/0000_smooth_jasper_sitwell.sql`, `drizzle/migrations/0001_daffy_wendigo.sql`, `drizzle/migrations/0002_same_bromley.sql` y `database/001_functions.sql`.
4. Ejecutar `database/002_ine_catalog_seed.sql` para cargar los 22 departamentos y 338 municipios identificados en el archivo oficial del INE. Las zonas se mantienen administrables porque su fuente y granularidad operativa pueden variar.
5. Promover el primer usuario administrador por medio de SQL controlado, por ejemplo: `UPDATE users SET role='admin' WHERE email='correo-del-administrador';`.

Las funciones `process_public_application` y `finalize_application_evaluation` son usadas por el flujo maestro y el agente. La primera normaliza la recepción, resuelve la plaza por `public_slug`, crea o actualiza el candidato y devuelve `alreadyApplied` cuando la combinación candidato + plaza ya existe. La segunda persiste evaluación y estado.

## Variables de entorno

### Aplicación

`DATABASE_URL` es obligatorio para operación real. `JWT_SECRET`, las variables de OAuth del template y los valores `VITE_*` se gestionan desde la configuración segura del proyecto.

### n8n y evaluación

| Variable | Uso |
|---|---|
| `N8N_AGENT_EVALUATION_URL` | Webhook público del agente que evalúa una postulación nueva. |
| `N8N_MANUAL_STATUS_WEBHOOK_URL` | Webhook público que recibe cambios humanos y programa la espera de diez minutos. |
| `OPENAI_MODEL` | Modelo opcional del nodo OpenAI Chat Model. |

### ApiChat

| Variable | Uso |
|---|---|
| `APICHAT_WEBHOOK_URL` | URL de callbacks o eventos entrantes. |
| `APICHAT_CONNECT_TO` | Conexión o instancia de WhatsApp. |
| `APICHAT_API_ENDPOINT` | Endpoint HTTP para enviar mensajes. |
| `APICHAT_ACCOUNT_ID` | ID de cuenta, obligatorio. |
| `APICHAT_TOKEN` | Token, obligatorio y secreto. |

No copiar la URL del editor de n8n (`/workflow/...`) como webhook. Cada nodo Webhook muestra su URL de producción después de activar el workflow; esas URLs son las que se deben colocar en las variables.

## Importación de n8n

Importar los archivos en este orden:

1. `01_flujo_maestro_postulaciones.json` recibe el POST de la aplicación, guarda la postulación, bloquea duplicados y llama al agente.
2. `02_agente_plaza_template.json` es una plantilla. Duplicarla una vez por plaza, cambiar el nombre, `path`, criterios o referencias de plaza y conservar la conexión al nodo OpenAI Chat Model y al Structured Output Parser.
3. `03_revision_humana_10m.json` recibe cambios humanos a `Calificado`, guarda la ventana, espera diez minutos, consulta el estado actual y cancela si cambió.
4. `04_whatsapp_apichat.json` prepara el mensaje configurado, envía al candidato, separa las alertas internas y actualiza la conversación.

Después de importar, asignar una credencial PostgreSQL a cada nodo Postgres y una credencial OpenAI/ChatGPT al nodo `OpenAI Chat Model`. Los IDs `PENDIENTE` y `PENDIENTE_WORKFLOW_WHATSAPP` son marcadores intencionales: deben reemplazarse por la credencial o workflow correspondiente dentro de la instancia n8n, sin guardar secretos en los JSON.

El flujo de revisión humana depende de `Wait` y debe tener persistencia de ejecuciones habilitada en n8n. Si se cambia el estado durante la pausa, la consulta posterior evita iniciar la entrevista.

## Publicación de la aplicación

La aplicación puede montarse en EasyPanel como servicio Node con el comando `pnpm build` y `pnpm start`. No hardcodear el puerto: EasyPanel debe inyectar `PORT`. El formulario público usa `/apply/{public_slug}` y el panel protegido usa `/admin`. Se recomienda servir HTTPS y colocar la aplicación y n8n bajo un proxy inverso con límites de solicitud adecuados.

## Pruebas de aceptación

Enviar una postulación completa y comprobar que solo se crea al pulsar `Enviar formulario`. Repetir el envío con el mismo teléfono y plaza para verificar el aviso de duplicado. Crear una regla `hardFail`, probar una respuesta incorrecta y confirmar `no_calificado`. Probar una respuesta abierta con experiencia expresada en meses y verificar que la IA devuelve JSON estructurado. Cambiar manualmente a `calificado`, comprobar la marca de espera y cambiar el estado antes de diez minutos para confirmar cancelación. Luego repetir sin cambiarlo y comprobar mensaje al candidato y alerta a la lista interna.


## Validación de workflows y límites de la plantilla

Los cuatro archivos JSON fueron validados localmente como JSON importable, con nombres de nodo únicos, conexiones internas válidas y marcadores semánticos para duplicados, PostgreSQL, OpenAI/ChatGPT estructurado, espera de 10 minutos, cancelación por cambio de estado y ApiChat. La validación final se ejecuta con `python3 scripts/validate_workflows.py`.

Los valores `PENDIENTE` se mantienen deliberadamente en credenciales de PostgreSQL, OpenAI/ChatGPT y el ID del subworkflow de WhatsApp. No son secretos ni deben sustituirse por valores inventados: deben mapearse a credenciales y workflow IDs reales después de importar los JSON en la instancia on-premise.

El archivo `02_agente_plaza_template.json` funciona como plantilla versionada para clonar un agente por plaza. Después de crear una plaza en la aplicación, se debe duplicar este workflow, asignarle el identificador de la plaza mediante el payload y actualizar la URL `N8N_AGENT_EVALUATION_URL` del flujo maestro para apuntar al agente correspondiente o a un router de agentes.

La fuente inicial del catálogo contiene 22 departamentos y 338 municipios. Las zonas no se tratan como nomenclatura nacional única dentro de la fuente inicial; por ello se dejaron como catálogo configurable, con importación JSON y mantenimiento administrativo de nombre y estado activo.

La aplicación se verificó con TypeScript, pruebas Vitest y build de producción. La prueba real de envío a OpenAI, PostgreSQL y ApiChat queda pendiente hasta que el operador configure las credenciales y endpoints de su infraestructura.
