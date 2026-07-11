# 16 · Módulo Mensajes y Tablón de la comunidad

> Sustituye por completo a los módulos **05 (incidencias)** y **13 (anuncios)**,
> que quedan **retirados** (código y BD eliminados en la migración 0013).

## Concepto

Un modelo **unificado de "mensajes"** que publica **solo la gestión**; el vecino
solo los lee. Cada mensaje tiene un **tipo**:

- **Aviso** (ámbar) — avisos importantes (corte de agua, fumigación…).
- **Anuncio** (azul) — comunicados generales (piscina abierta…).
- **Incidencia** (rojo) — problemas de la comunidad (ascensor averiado…).

Los colores de fondo son **configurables por usuario** (Ajustes), por defecto
ámbar/azul/rojo claros.

## Quién puede publicar

Crear/editar/borrar mensajes requiere el permiso **`publicar_mensajes`**
(personalizable por rol, ver `specs/03`). El vecino base solo lee. La seguridad
la impone la RLS (`mensajes` en la migración 0012).

## Datos (`mensajes`)

| Campo | Notas |
|-------|-------|
| `tipo` | enum `mensaje_tipo`: aviso / anuncio / incidencia |
| `titulo`, `cuerpo` | texto (1–140 / 1–4000) |
| `firma` | quién firma: Administrador / Conserje / la Junta / una vivienda (0015). Aparece como firma manuscrita en el post-it |
| `expira_at` | fecha de caducidad **opcional** (sobre todo avisos, 0014). En el formulario se prefija a **mañana** con papelera para quitarla |
| `activo` | true = visible; se borra para retirarlo |
| `created_by`, `created_at` | autor y fecha |

## Pantalla "Mensajes"

- **3 pestañas** (Avisos / Anuncios / Incidencias) con **contador** por grupo.
- Muestra la lista del tipo seleccionado. La gestión ve el botón **Nuevo** y
  puede editar/borrar cada tarjeta.
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

- **Incidencias:** mientras estén abiertas (activas).
- **Avisos:** con fecha de caducidad → hasta ese día; **sin** caducidad → los
  primeros **2 días**.
- **Anuncios:** los de los **últimos 2 días**.

La pantalla completa de Mensajes muestra **todo** (por pestañas); el filtro es
solo para el resumen de Inicio.

## Notificaciones

Al publicar un mensaje → **notificación push a todos** los vecinos activos
(`notificar`, kind `mensaje`) + entra en la campana (`listAvisos`). **Sin correo.**

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
