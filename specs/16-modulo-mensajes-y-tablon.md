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
- Alta/edición **paso a paso** (asistente, como reservas): tipo → título →
  mensaje → **importancia** (solo aviso/incidencia) → **firma** → **opciones**
  (caducidad con papelera + estilo de temporada + **color pastel** + **prioridad
  del tablón**) → **resumen y publicar**, con "Paso X de N" y botones Atrás/Siguiente.

## Grado de importancia y color del post-it (mig. 0054)

- **`grado`** (1..3, NULL = por defecto del tipo): orden **INVISIBLE** del tablón
  de la **Home** — se ordena por grado desc y, a igual grado, lo más reciente
  arriba (`ordenarTablon`). Defaults: **incidencia 3 (Alta) · aviso 2 (Media) ·
  anuncio 1 (Baja)** (sugerencia 1). No se muestra ninguna etiqueta en pantalla;
  sirve p. ej. para subir un anuncio por encima de todo poniéndole grado Alta.
  Las listas de Servicios → Mensajes siguen por fecha (el grado solo ordena la Home).
- **`color`**: clave de un **color pastel** del catálogo `PASTELES` (postit.ts)
  que tiñe el **papel** del post-it; combinable con el estilo de temporada (el
  color manda en el papel, el estilo aporta motivo/cinta). Clave desconocida se ignora.
- **Solo la gestión** (permiso `publicar_<tipo>`, el mismo que abre Servicios →
  Mensajes → Nuevo) puede fijar grado y color: un **trigger en BD**
  (`mensajes_guard_grado_color`) los limpia si el autor no tiene el permiso — el
  vecino que propone desde el buzón ni los ve ni puede colarlos. Es independiente
  del selector visual Normal/Importante/Urgente (que sí se ve y se mantiene).

## Inicio · "Tablón de la comunidad" (diseño 2a)

En Inicio, bajo **"Actividad reciente"**, un tablón con **notas de papel
pinchadas con chincheta**, una **pila por tipo**:

- Si un tipo tiene varias, la nota se ve **apilada con contador**; al pulsarla se
  abre un **bloc de post-its** (modal): se **despega la hoja superior**
  arrastrándola hacia arriba (o con un toque), con perspectiva, puntos de
  progreso y estado final "✓ Estás al día". Cerrar tocando fuera de la nota o la ✕.
- Firma manuscrita (Caveat) y, en avisos con caducidad, sello "caduca en N días".

### Filtro de "Actividad reciente" (solo Inicio)

- **Incidencias:** siempre.
- **Sugerencias:** solo mientras tengan **≤ 30 días naturales** desde su fecha
  de actividad (decisión del usuario, 2026-09-06: *"una vez que pase más de 1
  mes, las ocultes del tablón principal"*). Pasado ese plazo se ocultan **solo
  del tablón de Inicio**: siguen visibles (con autor y **votables**, mismos
  likes de `mensaje_likes`) en **Servicios → Sugerencias**, que no usa este
  filtro y siempre lista TODAS las sugerencias.
- **Avisos y anuncios:** con fecha de **caducidad** → **hasta que caducan**;
  **sin** caducidad → solo mientras son **recientes** (2 días).
- **"Reciente"/"actividad" cuenta desde la última actividad** (creación o
  **edición**): al **editar** un mensaje, su `updated_at` se actualiza
  (trigger, mig. 0042) y el mensaje **reaparece** en Inicio — para una
  sugerencia esto también vale como "resucitar": si el vecino la edita pasados
  los 30 días, vuelve a contar como reciente y reaparece en el tablón.
- Implementación: función pura `esActividadDeTablon(mensaje, ahora)` +
  `fechaActividad(mensaje)` en `src/features/mensajes/actividadTablon.ts`
  (constante `DIAS_SUGERENCIA_EN_TABLON = 30`), con test unitario
  (`tests/actividadTablon.test.ts`). `HomePage.tsx` la usa para construir la
  lista que recibe `TablonGadget`.

La pantalla completa de Mensajes muestra **todo** (por pestañas); el filtro es
solo para el resumen de Inicio. **Servicios → Sugerencias** (`SugerenciasPage`)
tiene su **propio** filtro (por tipo, sin límite de antigüedad): no comparte
código con `esActividadDeTablon` y no debe empezar a hacerlo sin querer.

### Tablón vacío: invitación a sugerir (decisión del usuario, 2026-09-06)

Cuando no hay **ninguna** actividad que mostrar (`lista.length === 0` en
`TablonGadget`), en vez del antiguo "No hay novedades…" se pinta una
**tarjeta-invitación** a proponer una sugerencia:

- **Estilo:** fondo lila muy claro (`#F1ECFB`, el `paper` de "sugerencia" en
  `postit.ts`) con **borde discontinuo** lila (`#B79BEA`), esquinas
  redondeadas; **sin `shadow-neu*`** (diseño plano, `specs/18`).
- **Contenido, centrado:** icono `Lightbulb` (`#7A4FC0`) → titular «¿Se te
  ocurre algo para mejorar la comunidad?» (`font-display`, `#6D4AA3`) → texto
  «Hoy el tablón está tranquilo. Este hueco puede ser para tu idea.» → botón
  píldora **«Escribir una sugerencia»** (icono `Pencil`, fondo `#7A4FC0`,
  texto blanco, alto ≥ 44 px) → enlace discreto **«Ver sugerencias de vecinos
  ›»**.
- **Destinos:** el botón navega a `/buzon?publicar=sugerencia` (ver
  "Publicaciones de vecinos" más abajo: `PublicarPanel` lee ese query param y
  abre el formulario ya en tipo Sugerencia, limpiando el parámetro tras
  abrirlo). El enlace navega a `/sugerencias`.
- **Quién ve el botón:** cualquier rol que pueda **proponer** una sugerencia
  vía Buzón, es decir, todos **salvo el tester** (`!esTester(rol)`, mismo
  criterio que impone la RLS `msg_ins`: `not es_tester()`, mig. 0040). **No**
  se usa `publicar_sugerencia`/`tiposQuePublica`: ese permiso es para publicar
  **directo** (sin moderación, uso de gestión) y habría ocultado el botón a
  cualquier vecino normal, que sí puede proponer. Si el rol no puede proponer,
  se ve la tarjeta **sin el botón** (el enlace a Sugerencias se ve siempre).
- Componente `InvitacionSugerir` dentro de `TablonGadget.tsx`; prop
  `puedeProponerSugerencia` calculada en `HomePage.tsx`.

## Estilo estacional e importancia (post-its decorados) — mig. 0043

Dos campos **cosméticos** opcionales en `mensajes` (mismas políticas de escritura;
sin cambios de RLS). `null`/desconocido ⇒ el post-it se pinta como siempre.

- **`estilo`** (`primavera|verano|otono|halloween|navidad|valentin|carnaval|ssanta|warning|problem`):
  decoración del post-it (temporadas + dos semánticos: **warning** amarillo ⚠️ y
  **problem** rojo ⊗). Se elige en el formulario ("Estilo de temporada,
  opcional"). Receta "Fuerte" (handoff): papel degradado, **cinta washi** en vez
  de chincheta, marco punteado interior y marca de agua con el motivo. El **nombre
  de la temporada NO se muestra** (se reconoce por papel, motivo y marca de agua).
  Tokens y motivos en `postit.ts` (`TEMPORADAS`) +
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

## Asistente único de alta (v1.54.0)

Había **tres** formularios distintos para crear lo mismo. Ahora los tres abren el
mismo asistente por pasos, `src/features/mensajes/AsistenteMensaje.tsx`:

| Entrada | `origen` | Tipo | Resultado |
|---|---|---|---|
| Buzón → Publicar | `buzon` | el que pulses (salta el paso 1) | a **aprobación**, o privado a administración |
| Gestión → Mensajes → Nuevo | `gestion` | se elige en el paso 1 | **publicado** directo |
| Servicios → Sugerencias → Nueva | `gestion` | sugerencia (salta el paso 1) | **publicado** directo |

- **La publicación NO cambia** respecto a antes: cada entrada conserva su función
  (`crearPublicacion` / `crearMensaje`) y su resultado.
- **Paso 1 con botones** (icono + nombre), no desplegable. Si la entrada ya trae
  el tipo, ese paso no aparece.
- **Textos por tipo**, los del buzón: «¿Qué quieres reportar?» / «Describe el
  problema» en incidencia, y sus equivalentes en anuncio y sugerencia.
- **«¿Dónde lo publicas?» es un paso** (solo en el buzón), con el aviso de que va
  a aprobación.
### Firma y autoría (mig. 0062)
El catálogo de firmas incluye «Administrador», «Conserje», «la Junta» **y todos
los pisos**, así que elegir firma es **firmar en nombre de otro**. Pasa a ser un
permiso configurable, **`elegir_firma`**:

- **Con el permiso** (por defecto gestión + conserje; app_admin siempre): ve el
  paso *«¿De parte de quién?»* y firma como quiera.
- **Sin él** (vecino, inquilino): **el paso no aparece**, se publica **sin firma**
  y el post-it muestra a **su autor** (nombre · piso). Nada queda anónimo ni
  atribuido a otro.
- ⚠️ Lo impone la **BD**, no la interfaz: el trigger `mensajes_guard_firma`
  anula la firma de quien no tiene el permiso (mismo patrón que el guard de
  `grado`/`color` de la 0054). Verificado en producción: un vecino que intenta
  firmar «Administrador» acaba con `firma = null`; la junta firma «la Junta» sin
  problema.
- El pie del post-it lo resuelve `pieAutoria()` (`postit.ts`): firma si la hay,
  si no el autor. `listMensajes` rellena el autor de **todo mensaje sin firma**,
  no solo de las sugerencias.

- Pasos que dependen del origen: *importancia*, *firma*, *caducidad* y *prioridad
  invisible* solo en `gestion`; *Borrador* y las fechas del anuncio solo en
  `buzon`. La **sugerencia nunca** elige importancia ni firma (lleva autor visible).

### Aspecto fijo por tipo
`ASPECTO_FIJO` en `postit.ts` decide el aspecto sin preguntar:

| Tipo | Estilo | Papel | ¿Se elige? |
|---|---|---|---|
| incidencia | `problem` | rosa | no, ni se muestra |
| sugerencia | `idea` (**foco**, estilo nuevo) | lila | no, ni se muestra |
| aviso y anuncio | a elección | a elección | sí |

El estilo `idea` se añadió en v1.54.0 (`TEMPORADAS` + motivo `foco`); `estilo` es
una columna `text` libre, así que **no hizo falta migración**.

## Comentarios en las tarjetas (mig. 0063, v1.56.0)

Cada tarjeta lleva al pie una **barra de acciones discreta**, al estilo de las
redes (iconos de trazo, sin fondo): **comentar** y **compartir**. Está en los
**dos** sitios —el post-it del tablón de la Home y el visor— y hace lo mismo en
ambos, así que no hace falta abrir la tarjeta para responder (v1.57.0).

- **Comentar** abre un **popup** (`ComentariosModal`): hoja inferior en móvil,
  diálogo centrado en escritorio. Ahí se leen los comentarios y se escribe el
  propio. El icono muestra el **número** al lado cuando hay alguno, y se
  actualiza al instante al comentar o borrar (contador local: no espera a que
  caduque la caché de 2 min del tablón).
- El hilo **ya no va incrustado** en el visor: ocupaba demasiado y obligaba a
  abrir la tarjeta. La Home sigue **sin scroll** (`specs/10`).

- **Dónde se puede:** incidencias, anuncios y sugerencias. Los **avisos NO**: son
  comunicados de la administración y no queremos que un corte de agua se
  convierta en un hilo de quejas. Lo impone la RLS `com_ins`, no la interfaz.
- **Autor siempre visible** (nombre · piso). Nada anónimo, igual que las firmas.
- **Publicación directa**, sin cola de moderación: si pasara por aprobación no
  habría conversación. A cambio:
  - **Borrar**: el autor del comentario, o quien gestiona/modera (`com_del`).
  - **Reportar**: 1 por persona (`comentario_reportes`). Solo **marca**; no oculta
    nada solo. La gestión ve el contador de reportes junto al comentario.
- **Permiso `comentar`** (configurable): por defecto todos menos el **tester**
  (cuenta de solo lectura).
- **Aviso de convivencia** bajo la caja de texto, recordando las normas que el
  vecino **ya aceptó** en el primer acceso (`normas_aceptadas_at`, `specs/15`).
- **Notificación**: push **solo al autor de la tarjeta** (`kind: 'comentario'`).
  A los demás que hayan comentado no se les avisa: con un hilo activo sería
  ruidoso enseguida.
- **Ciclo de vida:** los comentarios **mueren con su tarjeta** (`on delete
  cascade`), igual que los likes y las fotos. No hay purga automática: los borra
  el **app_admin** desde la pestaña **Caducados**.
- Máximo **1000 caracteres** por comentario (constraint en BD).

### Compartir una tarjeta como imagen (v1.57.0)
El botón de **compartir** genera un **PNG del post-it** y lo entrega al **menú
nativo** del móvil (Web Share API con ficheros: WhatsApp, Telegram, correo…).

- `src/lib/compartir.ts`, con **`html-to-image` cargado por `import()` dinámico**:
  el arranque de la app va justo contra el objetivo de <200 KB gzip de
  `specs/10`, así que la librería queda en un **chunk aparte** (~5 KB gzip) que
  solo se descarga la primera vez que alguien pulsa Compartir.
- La barra de acciones se marca con `data-no-captura="1"` y se **excluye** de la
  foto, para que no salgan los botones dentro de la imagen.
- **Sin Web Share de ficheros** (escritorio, iOS antiguo) se **descarga** el PNG.
  Si el usuario cierra la hoja de compartir no se avisa de nada: no es un error.
- ⚠️ **Privacidad:** la imagen incluye el **pie de autoría** (nombre · piso), así
  que compartirla fuera de la comunidad saca datos de un vecino. Es una decisión
  consciente —es lo que hace útil compartir una incidencia— pero conviene tenerlo
  presente si algún día se revisa el aviso de privacidad (`specs/10`).

### Cerrar una incidencia y la pestaña «Caducados»
Las incidencias **no caducan solas** (`esActividadDeTablon` las devuelve siempre),
así que hasta v1.56.0 no había forma de retirar una ya resuelta salvo borrarla:

- Botón **«Marcar como cerrada»** (Gestión → Mensajes, quien pueda publicar
  incidencias): pone `expira_at` **ayer**. Deja de verse en el tablón, **no se
  borra**, y conserva sus comentarios.
- Pestaña **«Caducados»** (solo **app_admin**): lista lo que ya no se ve en el
  tablón —caducado o cerrado— para borrarlo de verdad. Avisa de que al borrar se
  van también **comentarios y fotos**, sin vuelta atrás.

## Fotos en incidencias (mig. 0036)

Se pueden adjuntar **1–2 fotos** desde cualquiera de las vías de alta, en el paso
*Mensaje* del asistente y para todo tipo salvo sugerencia. Al **editar** un mensaje
no se ofrece el selector: las fotos que ya tiene no se tocan.
- **Compresión en el cliente** (`src/lib/imagen.ts`): redimensiona a lado máx.
  1600px y reencoda a **WebP** (≤~800 KB). El paso por `<canvas>` **elimina el
  EXIF**, incluida la geolocalización.
- **Bucket privado `adjuntos`** (tope duro 3 MB, solo webp/jpeg/png). Rutas
  `{mensaje_id}/{orden}.webp`. Tabla `mensaje_adjuntos` (RLS: se ve la foto si se
  ve el mensaje; sube el autor mientras está sin publicar o un moderador; nunca
  el tester). Se sirven con **URL firmada** (5 min). La rama de `adj_ins` que
  permite adjuntar al **publicar directo** (autor con `publicar_<tipo>`) la añade
  la mig. **0060**: sin ella el mensaje nace ya `publicado` y la RLS rechazaba
  sus fotos.
- **Limpieza (mig. 0061):** `borrarMensaje()` borra **primero las fotos con la
  Storage API** y luego el mensaje (el cascade se lleva las filas). Ese orden es
  a propósito: si falla el borrado del fichero, el mensaje sigue intacto y se
  reintenta; al revés se perderían las rutas y el fichero quedaría huérfano.
  - ⚠️ **No se puede borrar de `storage.objects` con SQL.** Supabase lo prohíbe
    (`protect_objects_delete`, error `42501`) para evitar ficheros huérfanos. El
    trigger de la 0036 hacía justo eso, así que lanzaba excepción y **tumbaba la
    transacción entera: ningún mensaje con fotos se podía borrar** (y en la app
    fallaba en silencio). Saltaba incluso si el objeto ya no existía, porque la
    protección es de sentencia. Retirado en la 0061.
  - El permiso de borrado del bucket (`adjuntos_delete`) se alinea con quien
    puede borrar el mensaje (`msg_del`): si no, un moderador borraba la
    incidencia de otro y las fotos quedaban huérfanas ocupando espacio.
- Se ven en el tablón (visor), en "Mis publicaciones" y en Gestión →
  Publicaciones (el moderador ve la foto antes de aprobar). En la **nota de la
  Home** no caben, así que el post-it muestra un **distintivo con el nº de fotos**
  (icono + número, v1.52.0); al pulsar la nota, el visor las despliega bajo el
  cuerpo del mensaje.
- ⚠️ **La CSP debe permitir Supabase en `img-src`.** Las fotos se sirven desde
  `https://<proyecto>.supabase.co/storage/...`, que es **otro origen**: con
  `img-src 'self' data: blob:` el navegador las bloquea y no se ve ninguna, aunque
  el fichero, la RLS y la URL firmada estén perfectos (fallo real en producción,
  v1.52.0). Ver `specs/11`.
- ⚠️ **El reencodado a WebP no siempre ocurre.** `canvas.toBlob(cb,'image/webp',q)`
  **cae a PNG en silencio** si el navegador no sabe codificar WebP (Safari/iOS), y
  PNG ignora la calidad, así que el bucle de `imagen.ts` no reduce el tamaño. Se
  sube entonces un PNG de ~2 MB con nombre `.webp` (el redimensionado a 1600 px y
  el borrado de EXIF sí se aplican). Queda cerca del tope de 3 MB del bucket.
