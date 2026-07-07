# 04 · Modelo de datos y seguridad (RLS)

Base de datos PostgreSQL en Supabase. **RLS activado en todas las tablas.** El
esquema es orientativo (nombres/tipos afinables en desarrollo).

## Convenciones

- Claves primarias `uuid` (`gen_random_uuid()`), salvo catálogos pequeños.
- `created_at timestamptz default now()`; `updated_at` por trigger.
- Referencias a usuario → `profiles.id` (= `auth.users.id`).
- Enumerados con `check` o tipos `enum`.

## Tablas

### `viviendas`
Catálogo cerrado de viviendas. Unidad para el conteo "1 por vivienda".

**Contenido inicial:** se extrae **tal cual** del array `PISOS` del `index.html`
actual — 41 viviendas: `Bajo A/B/C/E/F` (no existe Bajo D) y `1º–3º A–F` en
`Dcha`/`Izqda`. Los códigos deben coincidir carácter a carácter con los de la
rotación del parking (módulo 08), porque son la clave del mapeo
vivienda → grupo/plaza.

| Campo | Tipo | Notas |
|-------|------|-------|
| codigo | text PK | p. ej. `2º C Dcha` (idéntico al de `PISOS` en `index.html`) |
| orden | int | orden de presentación |
| puede_publicar_anuncios | bool | por defecto `true`; la gestión lo pone `false` para **bloquear a la vivienda entera** (módulos 13 y 15). El bloqueo es **por vivienda**, no por cuenta: afecta a las 2 cuentas. |

### `profiles`
Extiende `auth.users`. Una fila por cuenta; **máx. 2 por vivienda**.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | = `auth.users.id` |
| email | text | único |
| nombre | text | nombre y apellidos |
| vivienda | text | FK → `viviendas.codigo` |
| rol | enum(`app_admin`,`presidente`,`vicepresidente`,`administrador_finca`,`junta`,`vecino`) | por defecto `vecino` |
| estado | enum(`pendiente`,`activo`,`suspendido`) | por defecto `pendiente` |
| normas_aceptadas_at | timestamptz | cuándo aceptó las normas de uso en el primer acceso (módulo 15); `null` = aún no aceptadas → la app muestra la pantalla de aceptación antes de continuar |
| created_at / updated_at | timestamptz | |

> El bloqueo para publicar anuncios es **por vivienda** (flag en `viviendas`),
> no por cuenta.

Restricción: no más de 2 filas `activo`/`pendiente` por `vivienda` (trigger/check).

### `access_requests`
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| nombre / email / vivienda / comentario | text | |
| estado | enum(`pendiente`,`aprobada`,`rechazada`) | |
| motivo_rechazo | text | opcional |
| revisada_por | uuid | administrador que resolvió |
| created_at | timestamptz | |

### `incidencias` (módulo 05)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| autor_id | uuid → profiles | |
| titulo / descripcion | text | |
| categoria | enum(`limpieza`,`ascensor`,`garaje`,`jardin`,`piscina`,`ruido`,`otros`) | *(categorías por confirmar)* |
| ubicacion | text | opcional |
| estado | enum(`abierta`,`en_curso`,`resuelta`,`cerrada`) | por defecto `abierta` |
| prioridad | enum(`baja`,`media`,`alta`) | opcional |
| comentarios_bloqueados | bool | por defecto `false`; la gestión lo activa para **cerrar el hilo** (módulo 05) |
| created_at / updated_at | timestamptz | |

Tablas hijas:

- `incidencia_adjuntos`: fotos en bucket privado (incidencia_id, path, subido_por, created_at).
- `incidencia_comentarios`: autor_id, texto, `oculto bool` (por defecto `false`;
  la gestión oculta comentarios ofensivos — módulo 05), created_at.
- `incidencia_eventos`: **historial de cambios de estado visible en el detalle**
  (incidencia_id, estado_anterior, estado_nuevo, actor_id, created_at). Se
  rellena por trigger al cambiar `estado`. Cubre el requisito "cada cambio queda
  registrado (quién y cuándo)" del módulo 05 — el `audit_log` no sirve para esto
  porque solo lo lee `app_admin`.

> **Anti-spam 5/día (módulo 15):** se aplica con un trigger `BEFORE INSERT` que
> cuenta las incidencias creadas hoy por la vivienda del autor y rechaza la
> sexta. No basta con RLS (una política no puede contar filas cómodamente) ni
> con la interfaz.

### `encuestas` (módulo 06)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| titulo / descripcion | text | |
| tipo | enum(`opcion_unica`,`opcion_multiple`) | |
| apertura / cierre | timestamptz | |
| estado | enum(`programada`,`abierta`,`cerrada`) | derivable de fechas; el **cierre forzado** se implementa poniendo `cierre = now()` |
| mostrar_participacion | bool | por defecto `true`: durante la votación se muestra "han votado X de Y viviendas" (nunca los conteos por opción hasta el cierre) — módulo 06 |
| creada_por | uuid → profiles | rol de gestión |

`encuesta_opciones` (encuesta_id, texto, orden).

### `encuesta_votos`
**Un voto por vivienda** (no por cuenta). Se guarda **una fila por opción
marcada**: en `opcion_unica` la vivienda tiene como máximo 1 fila; en
`opcion_multiple`, una fila por cada opción que marque.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| encuesta_id | uuid → encuestas | |
| vivienda | text → viviendas | **clave del conteo** |
| opcion_id | uuid → encuesta_opciones | |
| emitido_por | uuid → profiles | quién de la vivienda lo emitió (auditoría) |
| created_at | timestamptz | |
| **UNIQUE(encuesta_id, vivienda, opcion_id)** | | no repetir la misma opción |

Garantías del "1 voto por vivienda":

- `opcion_unica`: trigger que impide una segunda fila de la misma vivienda en la
  misma encuesta (un `UNIQUE(encuesta_id, vivienda)` simple rompería el tipo
  `opcion_multiple`, por eso se resuelve con trigger condicionado al tipo).
- `opcion_multiple`: las filas de una vivienda cuentan como **una participación**
  (la métrica "han votado X viviendas" cuenta viviendas distintas, no filas).
- **Cambiar el voto** = borrar las filas de su vivienda e insertar las nuevas,
  solo con la encuesta `abierta`. Detalle en módulo 06.

### `zonas_comunes` (módulo 07)
Zonas: **Jardín, Piscina, Sala comunidad, Lonja Delantera** (configurables).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| nombre / descripcion / reglas | text | |
| activa | bool | |
| franja_min / franja_max | time | horario reservable |
| duracion_max_min | int | opcional |
| requiere_invitados | bool | pedir nº de invitados |

### `reservas`
Con **nº de invitados** y **aprobación**.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| zona_id | uuid → zonas_comunes | |
| vivienda | text → viviendas | vivienda solicitante |
| solicitada_por | uuid → profiles | |
| inicio / fin | timestamptz | fecha + hora inicio/fin |
| num_invitados | int | |
| estado | enum(`pendiente`,`aprobada`,`rechazada`,`cancelada`) | |
| aprobada_por | uuid → profiles | **presidente** (o `app_admin`) |
| motivo_rechazo | text | opcional |
| created_at | timestamptz | |

**Anti-solapamiento (crítico):** una franja está bloqueada si existe otra reserva
`pendiente` **o** `aprobada` en la misma zona y rango horario. Se garantiza con
constraint de exclusión (`tstzrange` + `EXCLUDE USING gist`) filtrando por
`estado IN ('pendiente','aprobada')`. Ver módulo 07.

**Una reserva vigente por vivienda (crítico):** máx. una fila con
`estado IN ('pendiente','aprobada')` y `fin >= now()` por `vivienda`, sin importar
la zona. Se garantiza con índice único parcial. Ver módulos 07 y 15.

### `parking_cesiones` (módulo 08)
Cesión/donación de plaza y medición de demanda.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| vivienda | text → viviendas | dueña de la plaza en esa quincena |
| tipo | enum(`cede`,`no_necesita`,`necesita`) | cede temporal / no la usa / demanda plaza |
| desde / hasta | date | periodo (día, semana, quincena) |
| nota | text | opcional |
| estado | enum(`activa`,`reasignada`,`cancelada`) | por defecto `activa`; `reasignada` cierra el hueco (no reclamable, módulo 08); el autor puede `cancelar` mientras siga `activa` |
| gestionada_por | uuid → profiles | quién la tramita (gestión) |
| reasignada_a | text → viviendas | opcional: a quién se le da el hueco |
| created_at | timestamptz | `created_at` de las filas `necesita` fija la **prioridad de reasignación** (módulo 08) |

> La rotación en sí es **cálculo** (no requiere tabla); estas cesiones y la
> demanda son la capa nueva. Ver módulo 08.

### `anuncios` (módulo 13)
Tablón. Creación **abierta**; publicación **con aprobación**.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| autor_id | uuid → profiles | cualquier miembro activo |
| vivienda | text → viviendas | vivienda del autor, **desnormalizada al crear**: necesaria para el índice único "1 pendiente por vivienda" y el bloqueo por vivienda (un índice parcial no puede hacer join con `profiles`) |
| titulo | text | límite de longitud (≤ 80 car.) |
| cuerpo | text | límite de longitud (p. ej. 1.000–1.500 car.) |
| formato | jsonb/text | formato enriquecido controlado (ver módulo 13) |
| imagen_path | text | opcional, bucket privado |
| fecha_inicio | date | **obligatoria**: inicio de vigencia |
| fecha_fin | date | **obligatoria**: fin de vigencia; `>= fecha_inicio` |
| revision_larga | bool | `true` si `fecha_fin` supera 1 año → se marca al presidente |
| nivel_solicitado | enum(`principal`,`secundario`) | lo que **pide** el vecino al crear (módulo 13) |
| nivel | enum(`principal`,`secundario`) | nivel **definitivo** tras aprobación; lo fija/ajusta la gestión (`null` mientras `pendiente`). El carrusel del Home/Anuncios muestra `nivel = 'principal'`; el listado, todos los publicados |
| estado | enum(`pendiente`,`publicado`,`rechazado`,`archivado`) | por defecto `pendiente` |
| aprobado_por | uuid → profiles | rol autorizado |
| motivo_rechazo | text | opcional |
| publicado_at | timestamptz | |
| created_at | timestamptz | |

> **Uno pendiente por vivienda:** índice único parcial → máx. una fila `pendiente`
> por vivienda del autor. Visible en el tablón solo si `estado = 'publicado'` y
> hoy está dentro de `[fecha_inicio, fecha_fin]`. Ver módulos 13 y 15.

### `contactos` (módulo 09)
Directorio (proveedores/junta), migrado desde el HTML actual.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| funcion / nombre / direccion | text | |
| telefonos | text[] | |
| web_o_email | text | |
| orden | int | |

### `reportes`
Reportes de contenido por vecinos (módulos 13 y 15: "los vecinos pueden
reportar" un anuncio publicado o un comentario).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| entidad | enum(`anuncio`,`comentario`) | |
| entidad_id | uuid | |
| autor_id | uuid → profiles | quién reporta |
| motivo | text | breve, obligatorio |
| estado | enum(`pendiente`,`atendido`,`descartado`) | |
| resuelto_por | uuid → profiles | gestión |
| created_at | timestamptz | |

> Límite: **1 reporte por cuenta y contenido** (`UNIQUE(entidad, entidad_id,
> autor_id)`). La gestión ve la cola de reportes pendientes en su panel.

### `audit_log` (recomendado)
Acciones sensibles (aprobaciones de alta/reserva/anuncio, cambios de rol,
borrados, reasignación de plaza).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| actor_id | uuid → profiles | |
| accion / entidad | text | |
| entidad_id | uuid | |
| detalle | jsonb | |
| created_at | timestamptz | |

> **Cómo se escribe:** las acciones que pasan por Edge Function (altas, cambios
> de rol) lo escriben desde el servidor; las que el cliente hace directamente
> bajo RLS (aprobar reserva/anuncio, cambiar estado de incidencia, bloquear
> vivienda, reasignar plaza) lo escriben mediante **triggers** en la BD. El
> cliente nunca inserta en `audit_log` directamente.

> **Sugerencias de la app** (módulo 14) se resuelven por **correo** a
> `cdelarioja25@gmail.com`; no requieren tabla (opcionalmente se registran).

## Políticas RLS (principios)

RLS **activado y forzado** en todas las tablas. Funciones auxiliares:
`es_activo()`, `rol_actual()`, `es_gestion()`, `puede_aprobar_altas()`,
`es_app_admin()` (leen `profiles` de `auth.uid()`).

- **viviendas / contactos**: lectura miembros activos; escritura de contactos por
  `administrador_finca`/`app_admin`.
- **profiles**: cada uno lee su fila; miembros activos ven campos públicos
  (nombre, vivienda) de otros; cambios de `rol`/`estado`/`vivienda` solo por Edge
  Function (roles con permiso de altas).
- **access_requests**: **sin política de INSERT para anónimos.** El formulario
  público llama a la Edge Function `solicitar-acceso`, que verifica el captcha y
  el rate-limit en servidor e inserta con `service_role` (módulos 03 y 11).
  Lectura/gestión solo roles con permiso de altas.
- **incidencias/adjuntos/comentarios/eventos**: lectura activos (los comentarios
  `oculto = true` solo los ven gestión y su autor); crear = autor activo (y
  comentar solo si el hilo no está bloqueado); editar contenido = autor;
  estado/cierre y moderación (`oculto`, `comentarios_bloqueados`) = gestión;
  borrado = autor o `app_admin`; `incidencia_eventos` se escribe solo por
  trigger.
- **encuestas/opciones**: lectura activos; crear/cerrar = gestión.
- **encuesta_votos**: un activo inserta/borra filas **de su vivienda** solo si la
  encuesta está `abierta`; nadie lee ni edita votos de otras viviendas; los
  conteos por opción solo se exponen (vía vista/función agregada) con la
  encuesta `cerrada`.
- **zonas_comunes**: lectura activos; escritura solo `app_admin`.
- **reservas**: **los vecinos no leen las filas de otras viviendas**; consultan
  la ocupación a través de una **vista de ocupación** (o función) que expone
  solo zona, franja y estado (`pendiente`/`aprobada`), sin identidad del
  solicitante. Lectura completa = la propia vivienda y la gestión (el presidente
  necesita ver quién solicita para aprobar). Crear = activo para su vivienda **y
  solo si no tiene otra reserva vigente**; aprobar/rechazar =
  **presidente**/`app_admin`; cancelar/anular = solicitante o presidente/
  app_admin; constraint anti-solapamiento y "una vigente por vivienda" a nivel BD.
- **parking_cesiones**: crear = activo para su vivienda; cancelar = su vivienda
  mientras `activa`; gestionar/reasignar = gestión; lectura de agregados de
  demanda para activos.
- **anuncios**: crear = cualquier activo **cuya vivienda tenga
  `puede_publicar_anuncios = true` y sin otro `pendiente`** (queda `pendiente`);
  aprobar/publicar/rechazar = roles autorizados; **solo se leen los `publicado` y
  vigentes** por vecinos (los autores ven además los suyos
  `pendiente`/`rechazado`; la gestión ve todos).
- **reportes**: crear = activo (1 por cuenta y contenido); lectura/resolución =
  gestión (el autor ve los suyos).
- **audit_log**: escritura solo por triggers y Edge Functions; lectura solo
  `app_admin`.

## Índices y rendimiento

Índices en FKs y campos de filtro (`estado`, `inicio`, `encuesta_id`,
`vivienda`, `publicado_at`). Volumen pequeño (~50 cuentas), pero preparados para
listados y calendarios.
