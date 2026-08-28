# Documento de implementación
## Talento AISA · Reclutamiento automatizado por plaza

**Versión de referencia:** `5a988757`  
**Proyecto:** `reclutamiento-automatizado`  
**Fecha:** 27 de agosto de 2026  
**Destino operativo:** VPS de Google administrada con EasyPanel y n8n on-premise

---

## 1. Propósito y alcance

Talento Claro es una solución web para administrar la postulación y evaluación de candidatos por plaza laboral. Sustituye la dependencia de Google Sheets por formularios propios y una base de datos PostgreSQL transaccional. La solución separa el canal público de postulación, el panel interno de reclutamiento, el constructor de formularios, los agentes de evaluación y la continuación de entrevistas por WhatsApp.

El diseño se organiza alrededor de una regla central: **una aplicación finalizada se identifica por la combinación del teléfono normalizado del candidato y la plaza laboral**. Las respuestas no se guardan hasta que el candidato pulse `Enviar formulario`. Una vez registrada la aplicación, un segundo intento para la misma plaza se rechaza con un aviso claro.

La entrega incluye la aplicación React/Express/tRPC, el modelo PostgreSQL, el catálogo inicial de departamentos y municipios de Guatemala, funciones SQL, cuatro workflows JSON de n8n, scripts de validación y documentación de instalación. Las credenciales y endpoints externos permanecen deliberadamente fuera de los archivos entregados.

---

## 2. Arquitectura de la solución

La aplicación se ejecuta como un servicio Node en EasyPanel. El frontend público y el panel administrativo comparten el mismo servicio, mientras que n8n puede ejecutarse como servicio independiente bajo el mismo dominio o proxy inverso. PostgreSQL es la fuente central de verdad para plazas, formularios, respuestas, candidatos, estados, evaluaciones, conversaciones e historial.

| Capa | Componente | Responsabilidad |
|---|---|---|
| Experiencia pública | React + Tailwind | Confirmación de plaza, cuestionario mobile-first y envío final |
| Operación interna | DashboardLayout + React | Plazas, candidatos, informes, configuración y catálogo |
| API | Express + tRPC | Contratos tipados, autorización y operaciones transaccionales |
| Persistencia | PostgreSQL | Datos operativos, estados, auditoría y configuraciones |
| Orquestación | n8n on-premise | Evaluación por agente, revisión humana, espera y WhatsApp |
| IA | Nodo nativo OpenAI/ChatGPT de n8n | Razonamiento de respuestas abiertas y salida estructurada |
| Mensajería | ApiChat / WhatsApp | Mensajes al candidato y alertas a receptores internos |
| Catálogo | SQL + JSON del INE | Departamentos y municipios; zonas configurables |

### 2.1 Flujo público de postulación

1. El anuncio de Facebook o Instagram contiene una URL con un identificador seguro asociado a una sola plaza.
2. La pantalla pública muestra título, ubicación, descripción y confirmación explícita de la plaza.
3. El candidato completa el formulario sin posibilidad de pausarlo o guardar una sesión parcial.
4. El frontend valida campos obligatorios y envía las respuestas solamente al presionar `Enviar formulario`.
5. El backend normaliza el teléfono de Guatemala a formato internacional `+502XXXXXXXX`.
6. PostgreSQL comprueba la combinación teléfono + plaza dentro de una transacción.
7. Si ya existe una aplicación finalizada, se devuelve el aviso de solicitud previamente registrada.
8. Si es una aplicación nueva, se guarda candidato, aplicación y respuestas, y se inicia la evaluación del agente correspondiente.

### 2.2 Flujo de evaluación

Las preguntas pueden tener respuesta esperada, respuestas aceptadas, regla de descarte, rangos numéricos, mínimo o máximo de meses de experiencia, condición dependiente y criterio de razonamiento para IA. Las reglas deterministas se evalúan antes de solicitar el razonamiento de la IA. Una sola regla marcada como descarte directo puede llevar el resultado a `No calificado`.

Las respuestas abiertas se procesan mediante el nodo nativo de OpenAI/ChatGPT de n8n. El parser estructurado solicita como mínimo `status`, `reason`, `profileSummary`, `keyPoints`, `confidence` y `ruleResults`. El resultado queda guardado en la evaluación y los resultados por pregunta se persisten en `application_answers.deterministic_result`.

### 2.3 Flujo de revisión humana

Cuando un administrador o reclutador cambia manualmente el estado a `Calificado`, la aplicación registra el cambio y notifica al webhook de revisión humana. El workflow guarda una ventana de diez minutos, ejecuta un nodo `Wait`, vuelve a consultar el estado actual y solo continúa si todavía es `calificado`. Si el estado cambió, la continuación se cancela.

---

## 3. Componentes funcionales de la aplicación

### 3.1 Rutas públicas

| Ruta | Uso |
|---|---|
| `/` | Presentación de Talento Claro y acceso al panel o formulario de ejemplo |
| `/apply/{public_slug}` | Formulario público seguro asociado a una plaza |

El valor `{public_slug}` no debe sustituirse por un ID incremental expuesto. El sistema genera un slug derivado del código de la plaza más un sufijo aleatorio.

### 3.2 Rutas administrativas

| Ruta | Uso | Acceso |
|---|---|---|
| `/admin` | Resumen operativo | Administrador y Reclutador |
| `/admin/jobs` | Crear y administrar plazas | Administrador y Reclutador; cambios restringidos a Administrador |
| `/admin/forms/{positionId}` | Constructor de formulario y agente | Administrador |
| `/admin/candidates` | Seguimiento, filtros, detalle y cambios de estado | Administrador y Reclutador |
| `/admin/reports` | Informes por período, plaza, resultado, motivos y tiempos | Administrador y Reclutador |
| `/admin/config` | ApiChat, receptores, país y catálogo | Administrador |

El rol `reclutador` puede operar candidatos, plazas e informes, pero no puede administrar formularios, campos, reglas ni integraciones. La autorización se aplica en los procedimientos backend, no solo mediante ocultamiento visual.

---

## 4. Modelo de datos PostgreSQL

El esquema se encuentra en `drizzle/schema.ts` y las migraciones en `drizzle/migrations/`. Las funciones operativas se encuentran en `database/001_functions.sql`.

| Entidad | Finalidad |
|---|---|
| `users` | Usuarios autenticados y rol operativo |
| `job_positions` | Plazas, slug público, agente, mensaje de WhatsApp y país predeterminado |
| `application_forms` | Formulario versionado asociado a una plaza |
| `form_questions` | Preguntas, tipos, orden, respuestas aceptadas y criterios de IA |
| `candidates` | Identidad del candidato mediante teléfono internacional |
| `applications` | Relación candidato-plaza, estado, evaluación y ventana humana |
| `application_answers` | Respuestas originales, normalizadas y resultado determinista |
| `evaluations` | Resultado IA, motivo, resumen, reglas y payload estructurado |
| `conversations` | Estado de conversación de WhatsApp por aplicación |
| `conversation_messages` | Mensajes enviados y recibidos |
| `audit_log` | Cambios de estado y bitácora operativa |
| `countries`, `geo_departments`, `geo_municipalities`, `geo_zones` | País y catálogo geográfico administrable |
| `internal_alert_recipients` | Números internos para alertas |
| `integration_settings` | Preferencias no secretas y parámetros de integración |

La unicidad de teléfono + plaza se protege en la base de datos, además de validarse en la aplicación. Esta defensa evita duplicados incluso cuando dos solicitudes llegan simultáneamente.

### 4.1 Estados de aplicación

| Valor técnico | Etiqueta operativa |
|---|---|
| `en_revision` | En revisión |
| `calificado` | Calificado |
| `no_calificado` | No calificado |
| `entrevista_iniciada` | Entrevista iniciada |
| `entrevista_en_curso` | Entrevista en curso |
| `entrevista_finalizada` | Entrevista finalizada |
| `pendiente_revision_humana` | Pendiente de revisión humana |
| `error_procesamiento` | Error de procesamiento |

---

## 5. Instalación en EasyPanel

### 5.1 Servicio de la aplicación

Crear un servicio Node para el proyecto `reclutamiento-automatizado`. El servicio debe utilizar Node.js 22 o una versión compatible con la plantilla y exponer el puerto que EasyPanel inyecte mediante `PORT`.

| Parámetro | Valor |
|---|---|
| Instalación | `pnpm install --frozen-lockfile` |
| Construcción | `pnpm build` |
| Inicio | `pnpm start` |
| Puerto | Variable `PORT` de EasyPanel; no fijarlo en código |
| HTTPS | Recomendado y necesario para formularios públicos y webhooks |
| Dominio | Puede ser un subdominio del dominio usado con n8n |

No copiar `node_modules`, `dist`, `.git` ni `.manus-logs` al paquete de despliegue. El archivo `reclutamiento-automatizado-entrega.zip` ya fue generado sin esas carpetas.

### 5.2 PostgreSQL

Crear una base PostgreSQL en EasyPanel o utilizar una instancia PostgreSQL administrada. Definir `DATABASE_URL` en el servicio de la aplicación y crear una credencial PostgreSQL equivalente dentro de n8n. Si el proveedor exige SSL, utilizar los parámetros SSL correspondientes en la URL o en la configuración de la credencial.

El entorno de desarrollo administrado de esta entrega no debe considerarse una base PostgreSQL de producción. Durante la preparación se detectó que una sesión sin credenciales PostgreSQL válidas puede producir un error de conexión SSL durante OAuth; esto desaparece al configurar una base PostgreSQL accesible y sus parámetros de certificado/SSL.

### 5.3 Orden de ejecución SQL

Ejecutar los archivos en este orden, verificando cada paso antes del siguiente:

1. `drizzle/migrations/0000_smooth_jasper_sitwell.sql`.
2. `drizzle/migrations/0001_daffy_wendigo.sql`.
3. `drizzle/migrations/0002_same_bromley.sql`.
4. `database/001_functions.sql`.
5. `database/002_ine_catalog_seed.sql`.

La última migración incluye funciones y triggers necesarios para el flujo transaccional. No ejecutar comandos destructivos sobre una base con datos existentes sin respaldo previo.

El primer usuario debe promoverse a administrador mediante un cambio controlado en PostgreSQL, por ejemplo:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'correo-del-administrador';
```

---

## 6. Variables de entorno y credenciales

### 6.1 Aplicación

| Variable | Obligatoria | Uso |
|---|---:|---|
| `DATABASE_URL` | Sí | Conexión PostgreSQL de la aplicación |
| `JWT_SECRET` | Sí | Firma de sesión |
| Variables OAuth del template | Según proveedor | Autenticación del panel |

### 6.2 n8n y OpenAI/ChatGPT

| Elemento | Ubicación | Acción pendiente |
|---|---|---|
| Credencial PostgreSQL | Credenciales de n8n | Crear con acceso a la base |
| Credencial OpenAI/ChatGPT | Nodo `OpenAI Chat Model` | Asignar token o credencial |
| `OPENAI_MODEL` | Variables de entorno de n8n | Opcional; definir el modelo aprobado |
| `N8N_AGENT_EVALUATION_URL` | Variables de entorno de n8n | URL de producción del agente/router |
| `N8N_MANUAL_STATUS_WEBHOOK_URL` | Variables de entorno de n8n o aplicación | URL de producción del workflow de revisión |
| `PENDIENTE_WORKFLOW_WHATSAPP` | Nodo Execute Workflow | Sustituir por el ID real del workflow WhatsApp |

### 6.3 ApiChat / WhatsApp

| Variable | Obligatoria | Uso |
|---|---:|---|
| `APICHAT_WEBHOOK_URL` | No | URL de callbacks o eventos entrantes |
| `APICHAT_CONNECT_TO` | No | Instancia o conexión de WhatsApp |
| `APICHAT_API_ENDPOINT` | No | Endpoint HTTP para enviar mensajes |
| `APICHAT_ACCOUNT_ID` | Sí | ID de cuenta ApiChat |
| `APICHAT_TOKEN` | Sí | Token secreto ApiChat |

Los JSON conservan marcadores `PENDIENTE` en credenciales e IDs que dependen de la instalación. No colocar tokens reales dentro de los workflows exportados ni dentro del repositorio.

La URL compartida durante el análisis —`https://aisa-testing-n8n-testing.4ugrim.easypanel.host/workflow/ZY6v5gZ3pUN5EL_KVJSpe`— es una URL del editor de n8n. No debe utilizarse como webhook. Después de activar cada workflow, copiar la URL de producción que muestra el nodo Webhook.

---

## 7. Importación de workflows n8n

Los archivos se encuentran en `n8n-workflows/` y también en el paquete `reclutamiento-n8n-workflows.zip`.

| Orden | Archivo | Función |
|---:|---|---|
| 1 | `01_flujo_maestro_postulaciones.json` | Recibe la aplicación, valida payload, ejecuta la función transaccional, rechaza duplicados y llama al agente |
| 2 | `02_agente_plaza_template.json` | Plantilla para clonar un agente independiente por plaza |
| 3 | `03_revision_humana_10m.json` | Programa la ventana de diez minutos y cancela si el estado cambia |
| 4 | `04_whatsapp_apichat.json` | Envía el mensaje al candidato, separa alertas internas y actualiza el estado de conversación |

### 7.1 Configuración del flujo maestro

El Webhook recibe `POST` en `reclutamiento/application`. El payload mínimo esperado es:

```json
{
  "token": "slug-seguro-de-la-plaza",
  "phone": "+50255555555",
  "fullName": "Nombre del candidato",
  "email": "candidato@example.com",
  "answers": {
    "experiencia_meses": 18,
    "sabe_conducir": "Sí"
  }
}
```

El nodo Postgres llama `process_public_application`. El nodo `¿Ya aplicada?` dirige los duplicados a una respuesta HTTP 409 y las aplicaciones nuevas al webhook del agente configurado en `N8N_AGENT_EVALUATION_URL`.

### 7.2 Configuración de agentes por plaza

Duplicar `02_agente_plaza_template.json` una vez por plaza. Para cada copia:

1. Cambiar el nombre del workflow para incluir la plaza.
2. Definir un `path` propio para el Webhook.
3. Asignar la credencial PostgreSQL.
4. Asignar la credencial del nodo `OpenAI Chat Model`.
5. Confirmar que las preguntas y reglas se cargan desde PostgreSQL por `applicationId`.
6. Confirmar que el agente devuelve el esquema estructurado exigido.
7. Actualizar el router o URL que utilice `N8N_AGENT_EVALUATION_URL`.

La configuración de criterios no debe codificarse en el JSON del agente. Debe mantenerse en `form_questions`, donde el administrador puede editar reglas, respuestas aceptadas, rangos y criterios de IA.

### 7.3 Configuración de revisión humana

El Webhook de `03_revision_humana_10m.json` recibe, como mínimo:

```json
{
  "applicationId": 123,
  "status": "calificado",
  "actorType": "human",
  "actorUserId": 7,
  "comment": "Validado por reclutamiento"
}
```

El nodo `Wait` requiere que n8n conserve las ejecuciones en modo que permita reanudar la ejecución. El workflow vuelve a consultar PostgreSQL después de diez minutos; no debe confiar únicamente en el estado recibido antes de la espera.

### 7.4 Configuración de WhatsApp

El workflow `04_whatsapp_apichat.json` utiliza `APICHAT_API_ENDPOINT` y el encabezado `Authorization: Bearer ...`. El cuerpo incluye cuenta, conexión, teléfono internacional y mensaje. ApiChat debe confirmar el formato final de su endpoint y de los campos `accountId`, `connectTo`, `to` y `message` antes de activar el envío productivo.

Los receptores internos se generan desde la lista configurada en la aplicación. El flujo divide `internalMessages` y envía una alerta individual a cada número. La prueba inicial debe usar un número controlado y una cuenta de prueba.

---

## 8. Catálogo geográfico

El archivo `database/ine_guatemala_departments_municipalities.json` contiene el catálogo inicial de 22 departamentos y 338 municipios obtenido de la fuente pública del [Instituto Nacional de Estadística de Guatemala](https://www.ine.gob.gt/sistema/uploads/2016/10/28/0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls).

La aplicación permite importar actualizaciones mediante JSON y administrar nombre/estado activo. Las zonas se dejan configurables porque su granularidad operativa puede depender del proceso interno y no se asumió una nomenclatura nacional única. Los códigos geográficos deben conservarse para no romper respuestas históricas.

Formato de importación:

```json
{
  "departments": [
    { "code": "01", "name": "Guatemala" }
  ],
  "municipalities": [
    { "departmentCode": "01", "code": "0101", "name": "Guatemala" }
  ],
  "zones": [
    { "municipalityCode": "0101", "code": "Z-001", "name": "Zona 1" }
  ]
}
```

---

## 9. Operación por plaza

La creación de una plaza genera automáticamente un formulario base. El administrador debe abrir el constructor de formulario y completar:

| Configuración | Recomendación operativa |
|---|---|
| Título e introducción | Explicar el trabajo y el propósito del cuestionario |
| Teléfono | Mantenerlo obligatorio y usar tipo teléfono |
| Plaza | Mantener la asociación fija al enlace publicado |
| Preguntas de descarte | Activar `Descarte directo` solo para requisitos esenciales |
| Respuestas aceptadas | Registrar todas las variantes válidas necesarias |
| Experiencia | Usar `minMonths` para exigir, por ejemplo, 12 meses |
| Preguntas abiertas | Escribir criterios concretos para la IA |
| Dependencias | Usar `dependsOn` cuando una respuesta habilite otra condición |
| Mensaje WhatsApp | Personalizar el mensaje por plaza con `{{plaza}}` si corresponde |
| Publicación | Publicar el formulario y luego publicar la plaza |

La URL pública debe copiarse desde el registro de la plaza y utilizarse en el anuncio de Facebook o Instagram. No se recomienda editar manualmente el slug.

---

## 10. Pruebas de aceptación

### 10.1 Pruebas automatizadas realizadas

La entrega pasó las siguientes validaciones:

| Validación | Resultado |
|---|---|
| TypeScript (`pnpm check`) | Correcto |
| Vitest | 4 archivos, 12 pruebas aprobadas |
| Build (`pnpm build`) | Correcto; solo advertencia de tamaño de bundle |
| JSON de n8n | 4 archivos válidos |
| Semántica de workflows | Marcadores de duplicado, IA estructurada, Wait/cancelación y ApiChat presentes |
| Revisión visual | Desktop y formulario público responsive revisados |

### 10.2 Pruebas manuales en infraestructura

Ejecutar estas pruebas después de configurar credenciales:

1. Publicar una plaza y abrir su URL desde un teléfono Android y un iPhone.
2. Confirmar que la plaza mostrada coincide con el anuncio.
3. Intentar abandonar el formulario y verificar que no se crea ninguna aplicación.
4. Enviar un formulario completo y confirmar que se crea una sola aplicación.
5. Repetir la aplicación con el mismo teléfono y plaza y comprobar el aviso de duplicado.
6. Probar un teléfono local y confirmar la normalización internacional.
7. Probar una regla `hardFail` con respuesta incorrecta.
8. Probar una respuesta abierta con experiencia expresada en meses.
9. Cambiar manualmente el estado a `Calificado`, esperar diez minutos y verificar la continuación.
10. Cambiar el estado durante la espera y verificar que no se envía WhatsApp.
11. Ejecutar la continuación con ApiChat en modo de prueba.
12. Confirmar la alerta en todos los números internos configurados.
13. Revisar el detalle del candidato y comprobar respuestas, evaluación, conversación y bitácora.
14. Confirmar que un Reclutador no puede abrir configuración ni constructor de formularios.

---

## 11. Seguridad y operación productiva

Las credenciales deben cargarse en el gestor de secretos de EasyPanel o en las credenciales seguras de n8n. No deben incluirse en JSON exportados, capturas, variables públicas del frontend ni archivos de documentación con valores reales.

Usar HTTPS, límites de tamaño de solicitud, protección contra abuso en los webhooks y políticas de respaldo de PostgreSQL. Registrar los errores de ApiChat y n8n sin registrar tokens ni cuerpos completos que contengan datos personales innecesarios.

El teléfono es un dato personal y debe tratarse con acceso restringido. Los reclutadores necesitan acceso operativo, pero la configuración de reglas e integraciones debe permanecer reservada a administradores. Antes de habilitar WhatsApp productivo, confirmar consentimiento y las políticas aplicables al envío de mensajes.

---

## 12. Archivos principales entregados

| Archivo | Descripción |
|---|---|
| `docs/IMPLEMENTACION.md` | Este documento |
| `docs/INSTALLATION.md` | Guía resumida de instalación |
| `drizzle/schema.ts` | Modelo Drizzle/PostgreSQL |
| `drizzle/migrations/*.sql` | Migraciones de esquema |
| `database/001_functions.sql` | Funciones y trigger operativos |
| `database/002_ine_catalog_seed.sql` | Carga inicial del catálogo |
| `database/ine_guatemala_departments_municipalities.json` | Catálogo JSON reutilizable |
| `n8n-workflows/*.json` | Workflows importables de n8n |
| `scripts/validate_workflows.py` | Validador estructural y semántico |
| `reclutamiento-automatizado-entrega.zip` | Paquete completo de la aplicación |
| `reclutamiento-n8n-workflows.zip` | Paquete reducido de workflows y operación |

---

## 13. Estado de implementación

La solución está preparada para ser configurada y desplegada, pero la integración real queda condicionada a que el operador complete `DATABASE_URL`, la credencial PostgreSQL de n8n, la credencial OpenAI/ChatGPT, los endpoints definitivos de ApiChat, el ID de cuenta, el token y los IDs reales de los workflows clonados por plaza.

La validación local no sustituye una prueba de extremo a extremo en la VPS. La activación productiva debe realizarse únicamente después de ejecutar las pruebas de aceptación con una plaza de prueba, un número controlado y credenciales no productivas.
