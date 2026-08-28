# Project TODO

## Aplicación y experiencia pública

- [x] Crear formulario público responsive mobile-first por plaza.
- [x] Confirmar visualmente la plaza antes de iniciar la postulación.
- [x] Usar identificadores seguros no predecibles para los enlaces de plaza.
- [x] Registrar la aplicación únicamente al pulsar el botón de envío.
- [x] No permitir pausar ni guardar parcialmente el cuestionario.
- [x] Mostrar confirmación de envío exitoso.
- [x] Mostrar aviso de aplicación previa únicamente después de detectar una postulación finalizada.
- [x] Bloquear duplicados mediante teléfono normalizado + plaza.
- [x] Normalizar teléfonos de Guatemala a formato internacional.
- [x] Mantener configuración de país predeterminado para futuras expansiones.

## Administración y configuración

- [x] Crear panel administrativo con rol Administrador de control total.
- [x] Crear rol Reclutador con acceso a candidatos, plazas e informes, sin acceso a configuración de formularios/campos.
- [x] Crear, editar, publicar, despublicar y eliminar plazas.
- [x] Crear, editar, publicar, despublicar y eliminar formularios.
- [x] Configurar un formulario asociado a una plaza.
- [x] Crear, editar, ordenar, activar y eliminar preguntas.
- [x] Configurar tipos de pregunta, obligatoriedad y respuestas aceptadas.
- [x] Configurar reglas de descarte por pregunta.
- [x] Configurar rangos numéricos y condiciones dependientes.
- [x] Configurar criterios de evaluación de respuestas abiertas por agente/plaza.
- [x] Configurar mensaje inicial de WhatsApp por plaza.
- [x] Configurar lista de números internos para alertas de WhatsApp.
- [x] Configurar variables de integración ApiChat/WhatsApp.
- [x] Crear mantenimiento del catálogo geográfico de Guatemala.
- [x] Preparar importación y actualización de departamentos, municipios y zonas oficiales del INE.

## Datos y evaluación

- [x] Definir esquema PostgreSQL para plazas, formularios, preguntas, opciones, reglas, candidatos, respuestas, estados, evaluaciones, conversaciones, auditoría e integraciones.
- [x] Crear restricción transaccional de unicidad teléfono normalizado + plaza.
- [x] Guardar estado del candidato con los estados requeridos.
- [x] Guardar motivo de evaluación generado por IA.
- [x] Guardar resumen del perfil del candidato.
- [x] Guardar resultado determinista por pregunta.
- [x] Guardar resultado estructurado de evaluación de respuestas abiertas.
- [x] Permitir actualización manual de estado por usuarios autorizados.
- [x] Registrar bitácora de cambios con usuario, valor anterior, valor nuevo, comentario y fecha.
- [x] Disparar proceso diferido cuando un humano cambie el estado a Calificado.
- [x] Esperar 10 minutos antes de continuar el proceso de entrevista.
- [x] Cancelar la continuación si el estado deja de ser Calificado durante la espera.

## Workflows n8n

- [x] Crear workflow maestro importable para recepción y coordinación de eventos.
- [x] Crear workflow independiente por plaza/agente.
- [x] Validar teléfono, duplicados, datos obligatorios y asociación con plaza.
- [x] Ejecutar reglas deterministas configuradas por pregunta.
- [x] Invocar el nodo nativo OpenAI/ChatGPT de n8n para respuestas abiertas.
- [x] Exigir salida estructurada con estado, motivo y resumen de perfil.
- [x] Persistir resultados en PostgreSQL.
- [x] Crear workflow para cambios manuales de estado.
- [x] Crear espera diferida de 10 minutos para cambios humanos a Calificado.
- [x] Crear workflow de continuación de entrevista por WhatsApp.
- [x] Crear workflow de notificaciones a lista configurable de números internos.
- [x] Parametrizar URL Webhook de ApiChat.
- [x] Parametrizar Conectar a de ApiChat.
- [x] Parametrizar API Endpoint de ApiChat.
- [x] Parametrizar ID Cuenta de ApiChat.
- [x] Parametrizar Token de ApiChat.
- [x] Dejar credenciales de PostgreSQL, OpenAI/ChatGPT y ApiChat/WhatsApp pendientes.
- [x] Generar JSONs importables para la versión vigente de n8n on-premise.

## Panel de candidatos e informes

- [x] Crear listado de candidatos con filtros por plaza, estado, fecha y resultado.
- [x] Crear detalle de candidato con respuestas, evaluación, perfil, historial y conversación.
- [x] Permitir edición manual de campos autorizados: estado y comentario auditables.
- [x] Mostrar claramente efectos y confirmación de cambios manuales.
- [x] Crear informes por período.
- [x] Crear informes por plaza.
- [x] Crear informes por resultado y motivo.
- [x] Crear informe de conversiones a entrevista.
- [x] Crear informe de tiempos de respuesta.

## Calidad y entrega

- [x] Aplicar diseño elegante, consistente, accesible y responsive para Android/iOS.
- [x] Usar DashboardLayout para la zona administrativa.
- [x] Crear pruebas Vitest para reglas, normalización, duplicados, estados y permisos.
- [x] Validar TypeScript, build y pruebas.
- [x] Verificar visualmente las vistas desktop y móvil.
- [x] Crear README de instalación on-premise en EasyPanel.
- [x] Documentar variables de entorno y credenciales pendientes.
- [x] Documentar configuración de PostgreSQL.
- [x] Documentar configuración de URLs públicas y webhooks.
- [x] Documentar orden de importación de workflows n8n.
- [x] Documentar pruebas de aceptación y operación.
- [x] Crear archivo descargable de migración/esquema PostgreSQL.
- [x] Crear archivos JSON descargables de workflows n8n.
- [x] Guardar checkpoint final con todos los elementos completados.

## Correcciones y validaciones pendientes detectadas

- [x] Implementar rol real `reclutador` en PostgreSQL, guardas backend y visibilidad restringida de configuración.
- [x] Completar edición real de preguntas existentes.
- [x] Persistir ordenamiento y activación/desactivación de preguntas desde la UI.
- [x] Exponer en el constructor los rangos numéricos, mínimos de experiencia y condiciones dependientes.
- [x] Persistir y administrar por plaza el mensaje inicial de WhatsApp.
- [x] Persistir y administrar el país predeterminado de normalización.
- [x] Persistir `deterministic_result` por cada respuesta durante la evaluación.
- [x] Conectar el cambio manual de estado a `Calificado` con la activación real del workflow diferido.
- [x] Añadir filtros de candidatos por plaza, fecha y resultado.
- [x] Conectar filtros de período del informe con la UI.
- [x] Calcular y mostrar tiempos de respuesta reales.
- [x] Agregar pruebas de duplicados, transiciones de estado y permisos.
- [x] Ejecutar `pnpm build` y corregir cualquier error de producción.
- [x] Revisar visualmente la aplicación también en viewport desktop.
- [x] Validar JSONs estructuralmente y documentar la importación pendiente en la instancia n8n del usuario.
- [x] Mantener marcadores `PENDIENTE` como referencias configurables sin exponer secretos.
- [x] Revisar y corregir expresiones de nodos n8n para que el flujo WhatsApp y el parser estructurado sean coherentes.

## Validación semántica adicional

- [x] Inspeccionar y validar en contexto el contenido de cada workflow JSON: nodos, expresiones, parser estructurado, Wait y cancelación.
- [x] Implementar CRUD visible para departamentos, municipios y zonas; las zonas quedan configurables porque no se estableció una nomenclatura nacional única.
- [x] Agregar historial/auditoría y conversación al detalle de candidato.
- [x] Corregir reordenamiento de preguntas con intercambio transaccional consistente.
- [x] Agregar selector visible de plaza en filtros de candidatos.
- [x] Mantener marcadores de credenciales pendientes y documentarlos como pendientes de configuración, no como reemplazados.
- [x] Validar semánticamente expresiones de workflows n8n y coherencia entre parser estructurado y WhatsApp.
