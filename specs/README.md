# Especificaciones — App Comunidad Rioja 25

Este directorio contiene las especificaciones funcionales y técnicas de la
evolución del portal **Rioja 25** desde una PWA estática informativa hacia una
**app de comunidad** con cuentas, roles y datos compartidos.

> Estas specs son el contrato de lo que hay que construir. **Todavía no hay
> código nuevo.** Sirven para revisarse (p. ej. con Fable) antes de desarrollar.

## Índice

| Nº | Documento | Contenido |
|----|-----------|-----------|
| 01 | [01-vision-y-alcance.md](01-vision-y-alcance.md) | Objetivo, usuarios, alcance de la v1 y fuera de alcance |
| 02 | [02-arquitectura.md](02-arquitectura.md) | Stack, hosting, entornos y despliegue |
| 03 | [03-autenticacion-roles-y-acceso.md](03-autenticacion-roles-y-acceso.md) | Login, roles, flujo de solicitud/aprobación de alta, correos |
| 04 | [04-modelo-de-datos.md](04-modelo-de-datos.md) | Tablas, relaciones y políticas de seguridad (RLS) |
| 05 | [05-modulo-incidencias.md](05-modulo-incidencias.md) | Reporte y seguimiento de incidencias |
| 06 | [06-modulo-encuestas.md](06-modulo-encuestas.md) | Encuestas de la comunidad (sondeos informales) |
| 07 | [07-modulo-reservas.md](07-modulo-reservas.md) | Reserva de zonas comunes con aprobación |
| 08 | [08-modulo-parking.md](08-modulo-parking.md) | Rotación de plazas + donación/cesión de plaza |
| 09 | [09-modulo-contactos.md](09-modulo-contactos.md) | Directorio de contactos tras login |
| 13 | [13-modulo-anuncios.md](13-modulo-anuncios.md) | Tablón de anuncios (creación abierta + aprobación) |
| 14 | [14-modulo-sugerencias-app.md](14-modulo-sugerencias-app.md) | Sugerencias sobre la propia app (email) |
| 15 | [15-reglas-de-uso-limites-y-moderacion.md](15-reglas-de-uso-limites-y-moderacion.md) | **Límites anti-abuso, reglas de convivencia y moderación** |
| 10 | [10-no-funcionales-y-privacidad.md](10-no-funcionales-y-privacidad.md) | Rendimiento, PWA, RGPD, accesibilidad, i18n |
| 11 | [11-seguridad.md](11-seguridad.md) | **Modelo de amenazas y controles de seguridad** |
| 12 | [12-roadmap.md](12-roadmap.md) | Fases de entrega |
| — | [design-prompt.md](design-prompt.md) | Prompt para enviar a diseño (look & feel) |

> Nota de numeración: los módulos 13, 14 y 15 se añadieron después; su lugar de
> lectura es junto al resto de módulos (tras el 09), aunque el número sea mayor.

## Decisiones ya cerradas

- **Backend / datos / auth:** Supabase (PostgreSQL + Auth + RLS).
- **Frontend:** React + Vite (SPA, mobile-first, PWA). Uso mayoritario en móvil,
  pero también funciona en PC (responsive).
- **Hosting:** Vercel (despliegue automático desde GitHub).
- **Login:** Google **y** enlace mágico por correo (ambos).
- **Emisor de correos:** SMTP propio con la cuenta `cdelarioja25@gmail.com`
  (contraseña de aplicación de Google). Sin servicios de pago.
- **Altas:** el vecino **solicita acceso**; un administrador aprueba cada alta,
  asigna vivienda y rol. Nadie entra sin aprobación.
- **Roles (6):** `app_admin`, `presidente`, `vicepresidente`,
  `administrador_finca`, `junta`, `vecino` (detalle en módulo 03).
- **Cuentas por vivienda:** hasta **2**. En votos/encuestas y necesidad de
  parking cuenta **1 por vivienda**.
- **Alcance v1:** login + gestión de usuarios, incidencias, encuestas, reservas
  de zonas comunes (con aprobación), parking (rotación + donación de plaza),
  contactos, tablón de anuncios (con aprobación) y sugerencias sobre la app.
- **Junta:** fuera de la v1 como sección propia; cuando haga falta será un
  **anuncio** en el tablón.
- **Reglas anti-abuso (módulo 15):** 1 reserva vigente por vivienda (cualquier
  zona), sin límite de antelación, aprobadas por el **presidente**; 1 anuncio
  pendiente por vivienda con fecha de inicio/fin obligatorias (≤ 1 año o revisión
  del presidente) y opción de bloquear a quien abuse.
- **Bloqueo de anuncios:** por **vivienda** (afecta a sus 2 cuentas), no por
  cuenta individual.
- **Privacidad de reservas:** los vecinos ven solo el estado de cada franja
  (libre/pendiente/ocupada), sin la identidad de quien reservó; la gestión sí la
  ve.
- **Retención de datos:** 2 años por defecto para incidencias/encuestas cerradas
  y anuncios archivados (configurable; módulo 10).
- **Zona horaria:** toda la lógica de fechas opera en **Europe/Madrid**
  (módulo 02).

## Contexto: qué existe hoy

App actual = un único `index.html` (HTML/CSS/JS puro, sin build) empaquetado
como PWA. Secciones: Contactos (datos fijos en el código), Parking (rotación
**calculada** por fecha, no reservas), Reciclaje (info estática), Junta (fecha y
orden del día fijos + exportar a calendario) y Sugerencias (`mailto:`). No hay
login, ni base de datos, ni roles: lo único que se guarda es el piso elegido, y
en el propio móvil (localStorage).

**Se reaprovecha:** la lógica de rotación del parking, el contenido de reciclaje,
los contactos actuales y el lenguaje visual como punto de partida (aunque el
look & feel se rehará con el prompt de diseño).
