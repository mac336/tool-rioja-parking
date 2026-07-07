# 05 · Módulo Incidencias

## Objetivo
Que cualquier vecino reporte incidencias de la comunidad (avería de ascensor,
filtración en garaje, jardín, ruido, etc.) y que la junta/admin les dé
seguimiento hasta cerrarlas.

## Historias de usuario
- Como **vecino**, quiero reportar una incidencia con foto para que se sepa qué
  pasa y dónde.
- Como **vecino**, quiero ver el estado de las incidencias y comentar.
- Como **junta/admin**, quiero cambiar el estado y cerrar incidencias.

## Requisitos funcionales
1. **Crear incidencia**: título, descripción, categoría, ubicación (opcional),
   prioridad (opcional) y hasta N fotos (adjuntos).
2. **Listado**: filtrable por estado y categoría; orden por fecha o prioridad.
   Se ve quién la creó (nombre + piso) y cuándo.
3. **Detalle**: descripción, fotos, historial de estado (tabla
   `incidencia_eventos`, módulo 04) y comentarios.
4. **Comentarios**: cualquier miembro activo puede comentar (salvo hilo
   bloqueado, flag `comentarios_bloqueados`).
5. **Cambio de estado**: `abierta → en_curso → resuelta → cerrada`. Solo
   `junta`/`admin`. Cada cambio queda registrado (quién y cuándo) en
   `incidencia_eventos` mediante trigger, visible en el detalle.
6. **Edición/borrado**: el autor puede editar/borrar **su** incidencia mientras
   esté `abierta`; el admin puede borrar cualquiera (queda en `audit_log`).

## Reglas
- Estados válidos y transiciones controladas (no saltar de `cerrada` a `abierta`
  salvo admin).
- Adjuntos en **bucket privado**; se sirven con URLs firmadas de caducidad corta.
- Validación de imágenes: tipo permitido (jpg/png/webp/heic), tamaño máx.
  (p. ej. 8 MB), y **no** confiar en la extensión (validar tipo real).

## Reglas de uso (anti-abuso y convivencia, ver módulo 15)
- **Anti-spam:** límite de creación por vivienda (p. ej. máx. 5/día, aplicado
  con trigger en BD — módulo 04) y detección de duplicados; la gestión puede
  **fusionar** duplicados.
- **Sin señalar a personas:** una incidencia describe un problema de la
  comunidad, **no** acusa ni nombra a vecinos concretos. La gestión puede editar/
  ocultar contenido que incumpla y avisar al autor.
- **Comentarios:** la gestión puede **ocultar** comentarios ofensivos (flag
  `oculto`) o **bloquear** el hilo si se calienta (flag `comentarios_bloqueados`
  en la incidencia).
- **Fotos:** sin personas identificables ni matrículas (privacidad, módulo 10).

## Seguridad (ver módulo 11)
- Escapado/normalización de texto para evitar XSS al renderizar descripciones y
  comentarios (React escapa por defecto; nunca usar `dangerouslySetInnerHTML`).
- RLS: crear = miembro activo; cerrar/estado = junta/admin; editar contenido =
  autor. Nada de esto depende de ocultar botones en la interfaz.

## Notificaciones (opcional v1.1)
Aviso por correo al admin/junta cuando entra una incidencia de prioridad alta.
