# 16 · Módulo Mensajes y Tablón de la comunidad

> Sustituye por completo a los módulos **05 (incidencias)** y **13 (anuncios)**,
> que quedan **retirados** (código y BD eliminados en la migración 0013).

## Concepto

Un modelo **unificado de "mensajes"** con **cuatro tipos**:

- **Aviso** (ámbar) — avisos importantes (corte de agua, fumigación…). Solo gestión.
- **Anuncio** (azul) — comunicados generales (piscina abierta…). Gestión directo;
  el vecino puede proponer uno (moderado).
- **Incidencia** (rojo) — problemas de la comunidad (ascensor averiado…). Gestión
  directo; el vecino puede reportarla (moderada).
- **Sugerencia** (lavanda) — propuestas de vecinos para la comunidad (moderadas),
  con **autor visible** y **likes** (ver sección al final).

Quien tenga permiso publica **directo**; el **vecino** envía
incidencias/anuncios/sugerencias desde **Buzón → Publicar** y pasan por
**moderación** antes de verse (mig. 0031, sección "Publicaciones de vecinos").
Los colores de fondo son **configurables por usuario** (Ajustes).

## Quién ve y quién publica — POR TIPO (mig. 0038/0040)

Desde v1.26.0 el tablón se controla **por tipo de mensaje** y por rol, con dos
permisos por tipo (personalizables, ver `specs/03`):

- **`ver_<tipo>`** — ver ese tipo en el tablón. Por defecto todos ven avisos e
  incidencias; anuncios y sugerencias los ven todos **menos el conserje**.
- **`publicar_<tipo>`** — crear y **editar/borrar** ese tipo. Por defecto la
  gestión publica los cuatro tipos; el **conserje** solo **avisos e
  incidencias**. (Retirado el permiso único `publicar_mensajes`.)

El vecino envía **propuestas moderadas** (ver "Publicaciones de vecinos");
aprobarlas requiere `aprobar_incidencias`/`aprobar_anuncios`. La pantalla de
Mensajes solo muestra las **pestañas** de los tipos que el rol puede ver, y el
botón **Nuevo** solo para los tipos que puede publicar. La seguridad la impone la
RLS (`mensajes`, migraciones 0012/0031/0034/0040): un mensaje publicado solo lo
lee quien puede ver ese tipo.

## Datos (`mensajes`)

| Campo | Notas |
|-------|-------|
| `tipo` | enum `mensaje_tipo`: aviso / anuncio / incidencia / sugerencia (0032) |
| `titulo`, `cuerpo` | texto (1–140 / 1–4000) |
| `firma` | quién firma: Administrador / Conserje / la Junta / una vivienda (0015). Aparece como firma manuscrita en el post-it |
| `expira_at` | fecha de caducidad **opcional** (sobre todo avisos, 0014). En el formulario se prefija a **mañana** con papelera para quitarla |
| `activo` | true = visible; se borra para retirarlo |
| `created_by`, `created_at` | autor y fecha |

## Pantalla "Mensajes"

- **4 pestañas** (Avisos / Anuncios / Incidencias / Sugerencias) con **contador**.
- Muestra la lista del tipo seleccionado. La gestión ve el botón **Nuevo** y
  puede editar/borrar cada tarjeta. La pestaña **Sugerencias es de solo
  lectura** (las envían los vecinos; se aprueban en Gestión → Publicaciones) —
  solo permite borrar.
- Formulario de alta: tipo, título, mensaje, **firma** (desplegable) y **caduca
  el** (opcional, con papelera).

## Inicio · "Tablón de la comunidad" (diseño 2a)

En Inicio, bajo **"Actividad reciente"**, un tablón con **notas de papel
pinchadas con chincheta**, una **pila por tipo**:

- Si un tipo tiene varias, la nota se ve **apilada con contador**; al pulsarla se
  abre un **bloc de post-its** (modal): se **despega la hoja superior**
  arrastrándola hacia arriba (o con un toque), con perspectiva, puntos de
  progreso y estado final "✓ Estás al día". Cerrar tocando fuera de la nota o la ✕.
- Firma manuscrita (Caveat) y, en avisos con caducidad, sello "caduca en N días".

### Filtro de "Actividad reciente" (solo Inicio)

- **Incidencias y sugerencias:** siempre.
- **Avisos y anuncios:** con fecha de **caducidad** → **hasta que caducan**;
  **sin** caducidad → solo mientras son **recientes** (2 días).
- **"Reciente" cuenta desde la última actividad** (creación o **edición**): al
  **editar** un mensaje, su `updated_at` se actualiza (trigger, mig. 0042) y el
  mensaje **reaparece** en Inicio. Igual al **aprobar** una publicación de vecino.

La pantalla completa de Mensajes muestra **todo** (por pestañas); el filtro es
solo para el resumen de Inicio.

## Estilo estacional e importancia (post-its decorados) — mig. 0043

Dos campos **cosméticos** opcionales en `mensajes` (mismas políticas de escritura;
sin cambios de RLS). `null`/desconocido ⇒ el post-it se pinta como siempre.

- **`estilo`** (`primavera|verano|otono|halloween|navidad|valentin|carnaval|ssanta`):
  decoración de temporada. Se elige en el formulario ("Estilo de temporada,
  opcional"). Receta "Fuerte" (handoff): papel degradado, **cinta washi** en vez
  de chincheta, marco punteado interior, marca de agua con el motivo y nombre de
  temporada en el pie. Tokens y motivos en `postit.ts` (`TEMPORADAS`) +
  `MotivoTemporada.tsx` (SVG; lucide donde existe: Sun/Leaf/Snowflake/Heart).
- **`importancia`** (`media`=IMPORTANTE / `alta`=URGENTE; solo **avisos e
  incidencias**): sello en el pie (ámbar/rojo) y color del icono; en **urgente**
  la cinta pasa a rayas rojas y el marco se enrojece. Convive con "caduca hoy".
- **Sin estilo**: se mantiene el post-it actual (chincheta + fecha) y el **icono
  automático del tipo** (aviso = triángulo ⚠️, incidencia = triángulo con aspa).
- Se aplica en los **3 sitios**: `PostItHome` y `PostItVisor` (TablonGadget) con
  la receta completa, y `MensajeCard` (gestión) en versión plana (fondo de
  temporada + chip + marca de agua, sin cinta).

## Notificaciones

Al publicar un mensaje → **push a quien puede ver ese tipo** (`notificar`, kind
`mensaje`, filtra por `ver_<tipo>`) + entra en la campana (`listAvisos`). **Sin correo.**

## Implementación

- UI: `src/features/mensajes/` (`MensajesPage`, `MensajeCard`, `TablonBoard`,
  `PostItNote`, `PostItPadModal`, `postit.ts`). Colores en el store (`msgColors`).
- Datos: `src/lib/db/mensajes.ts` (real) / mock. Edge: `notificar`.
- BD: migraciones 0012 (tabla+RLS+permiso), 0014 (expira_at), 0015 (firma).

## Tablón en la Home (gadget, rediseño 2026-07-11)

La Home es un **panel de gadgets sin scroll** (ver `specs/10`). El tablón:

- **Una línea**: se ve **un post-it** grande (con asomo del siguiente) y se
  desliza horizontalmente (snap + puntitos). "Ver todo ›" abre el visor.
- **Altura elástica**: el gadget absorbe el hueco libre de la Home (`flex-1`);
  el texto muestra tantas líneas como quepan (clamp dinámico por medición).
  Si no hay parking/encuesta, el post-it crece; en pantallas pequeñas se comprime.
- **Visor a pantalla completa** al tocar un post-it: se pasan con el dedo
  (izquierda/derecha o deslizar hacia arriba = siguiente), contador
  "Incidencia · 1 de N", puntitos coloreados por tipo, texto completo con firma
  y caducidad. Toca fuera para cerrar.
- **Orden**: **incidencias → avisos → anuncios** (recientes primero en cada tipo).
- Componente: `src/features/mensajes/TablonGadget.tsx` (sustituye a
  TablonBoard/PostItNote/PostItPadModal, retirados).

## Publicaciones de vecinos (incidencias/anuncios con moderación) — mig. 0031

Desde el **Buzón → sección "Publicar"** un vecino puede:
- **Reportar incidencia**: *¿Qué quieres reportar?* + descripción.
- **Publicar anuncio**: título + descripción + **fecha de publicación** (hoy,
  editable) y **fecha de finalización** (calendario, **máx. 2 meses**).

En ambos elige **destino**:
- **Para todos los vecinos** → se guarda `estado=pendiente` y se avisa a los
  moderadores; se publica en el tablón cuando lo **aprueban** (`estado=publicado`
  → push a todos). Aviso al vecino: "se ha levantado y se envía a aprobación".
- **Solo a administración** → `destino=administracion`, `estado=publicado`
  (privado: no sale en el tablón, solo lo ve la gestión).
- **Borrador** → `estado=borrador` (queda en "Mis publicaciones", editable).

**Datos:** en `mensajes` con `estado` (borrador/pendiente/publicado/rechazado),
`destino` (todos/administracion), `publica_at`, `created_by`. El **tablón** solo
muestra `publicado` + `todos` + vigente (`publica_at ≤ ahora`, no caducado).

**Moderación:** Panel de gestión → pestaña **"Publicaciones"** (permiso
`aprobar_incidencias`/`aprobar_anuncios`, roletizable): cola de pendientes
(Aprobar/Rechazar) + reportes privados a administración. Aprobar → publicado +
push a todos.

## Sugerencias de la comunidad (con autor y likes) — mig. 0032/0033

Nueva clase de mensaje **`sugerencia`** (junto a aviso/anuncio/incidencia), pensada
para propuestas que un vecino quiere mostrar al resto. Se envía desde **Buzón →
Publicar → Sugerencia** (mismo flujo de moderación: pendiente → aprobada →
tablón). A diferencia de los demás:
- **Se muestra el autor** (nombre + piso) en el post-it y en el visor.
- **Likes: uno por vivienda** (`mensaje_likes`, RLS: piso real, sobre sugerencia
  publicada). Botón de like con contador en el visor del tablón; `alternarLike`.
- NO tiene fechas (como la incidencia).

La pantalla **Servicios → Sugerencias** es el **tablón de estas sugerencias**:
lista las aprobadas (autor + me gusta) y el **administrador** puede añadir una
directamente. El feedback privado al desarrollador ya NO vive aquí: se hace por
el **chat del buzón** (canal Desarrollador).

## Moderación: avisos y edición (mig. 0035)

- Al **aprobar** una publicación → push masivo a todos (kind `mensaje`).
- Al **rechazar** → push al **autor** (kind `publicacion_rechazada`): "Tu
  incidencia/anuncio/sugerencia no se ha publicado".
- Una publicación **pendiente** (ya enviada a aprobar) **no la edita el autor**;
  solo la editan los moderadores. El autor puede **retirarla borrándola**
  (RLS `msg_upd`/`msg_del`, mig. 0034/0035).

## Fotos en incidencias (mig. 0036)

Al reportar una **incidencia** o publicar un **anuncio** desde Buzón → Publicar
se pueden adjuntar **1–2 fotos**:
- **Compresión en el cliente** (`src/lib/imagen.ts`): redimensiona a lado máx.
  1600px y reencoda a **WebP** (≤~800 KB). El paso por `<canvas>` **elimina el
  EXIF**, incluida la geolocalización.
- **Bucket privado `adjuntos`** (tope duro 3 MB, solo webp/jpeg/png). Rutas
  `{mensaje_id}/{orden}.webp`. Tabla `mensaje_adjuntos` (RLS: se ve la foto si se
  ve el mensaje; sube el autor mientras está sin publicar o un moderador; nunca
  el tester). Se sirven con **URL firmada** (5 min).
- **Limpieza:** al borrar el mensaje, el cascade borra las filas y un **trigger**
  borra el objeto de Storage. Los ficheros no quedan huérfanos.
- Se ven en el tablón (visor), en "Mis publicaciones" y en Gestión →
  Publicaciones (el moderador ve la foto antes de aprobar).
