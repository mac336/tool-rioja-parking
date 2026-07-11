# Especificaciones — App Comunidad Rioja 25

Este directorio contiene las especificaciones funcionales y técnicas de la
evolución del portal **Rioja 25** desde una PWA estática informativa hacia una
**app de comunidad** con cuentas, roles y datos compartidos.

> Estas specs describen el **comportamiento actual** de la app (ya en producción).
> Se mantienen al día con cada cambio (ver `../CLAUDE.md` → Forma de trabajo, y el
> `../CHANGELOG.md`). La **fuente de verdad** técnica es el código y las
> migraciones `supabase/migrations/`.

## Índice

| Nº | Documento | Contenido |
|----|-----------|-----------|
| 01 | [01-vision-y-alcance.md](01-vision-y-alcance.md) | Objetivo, usuarios, alcance |
| 02 | [02-arquitectura.md](02-arquitectura.md) | Stack, hosting, entornos, despliegue, Edge Functions |
| 03 | [03-autenticacion-roles-y-acceso.md](03-autenticacion-roles-y-acceso.md) | Login (OTP + acceso directo temporal), roles (8), permisos personalizables, estados |
| 04 | [04-modelo-de-datos.md](04-modelo-de-datos.md) | Tablas, relaciones y RLS (estado actual arriba) |
| 06 | [06-modulo-encuestas.md](06-modulo-encuestas.md) | Encuestas (sondeos informales) |
| 07 | [07-modulo-reservas.md](07-modulo-reservas.md) | Reserva de zonas comunes (multi-zona, con aprobación) |
| 08 | [08-modulo-parking.md](08-modulo-parking.md) | Rotación de plazas + cesión + aviso contextual en Inicio |
| 09 | [09-modulo-contactos.md](09-modulo-contactos.md) | Directorio de contactos |
| 14 | [14-modulo-sugerencias-app.md](14-modulo-sugerencias-app.md) | **RETIRADO** — el feedback va por el chat del buzón; histórico en Dashboard |
| 15 | [15-reglas-de-uso-limites-y-moderacion.md](15-reglas-de-uso-limites-y-moderacion.md) | Límites anti-abuso y reglas de convivencia |
| **16** | [16-modulo-mensajes-y-tablon.md](16-modulo-mensajes-y-tablon.md) | **Mensajes (aviso/anuncio/incidencia/sugerencia) + Tablón + publicaciones de vecinos con moderación y likes** |
| **17** | [17-modulo-buzon-privado.md](17-modulo-buzon-privado.md) | **Buzón privado por canales (vecino ↔ gestión)** |
| **18** | [18-sistema-de-estilos.md](18-sistema-de-estilos.md) | **Design system: cabeceras, títulos de sección, layout** |
| 10 | [10-no-funcionales-y-privacidad.md](10-no-funcionales-y-privacidad.md) | Rendimiento, PWA, notificaciones, RGPD, layout |
| 11 | [11-seguridad.md](11-seguridad.md) | Modelo de amenazas y controles |
| 12 | [12-roadmap.md](12-roadmap.md) | Fases de entrega |
| — | [design-prompt.md](design-prompt.md) | Prompt de diseño (look & feel) |
| ~~05~~ | ~~incidencias~~ | **RETIRADO** → ver 16 (reemplazado por mensajes) |
| ~~13~~ | ~~anuncios~~ | **RETIRADO** → ver 16 (reemplazado por mensajes) |

## Decisiones ya cerradas

- **Backend / datos / auth:** Supabase (PostgreSQL + Auth + RLS).
- **Frontend:** React + Vite (SPA, mobile-first, PWA). Uso mayoritario en móvil,
  pero también funciona en PC (responsive).
- **Hosting:** Vercel (despliegue automático desde GitHub).
- **Login:** sin contraseña. **TEMPORAL (flag `ACCESO_DIRECTO=true`):** los
  aprobados entran **solo con su correo, sin código**; con el flag a `false`
  vuelve el **código OTP de 6 dígitos por correo**. Sin Google ni enlace mágico.
- **Emisor de correos:** SMTP propio con la cuenta `cdelarioja25@gmail.com`
  (contraseña de aplicación de Google). Sin servicios de pago.
- **Altas:** el vecino **solicita acceso**; un administrador aprueba cada alta,
  asigna vivienda y rol. Nadie entra sin aprobación.
- **Roles (8):** `app_admin` (SUPERADMIN), `presidente`, `vicepresidente`,
  `administrador_finca`, `junta`, `conserje`, `vecino`, `tester` (solo lectura).
  **Permisos personalizables** por rol desde el panel (tabla `role_permissions`;
  módulo 03).
- **Cuentas por vivienda:** hasta **2**. En votos/encuestas y necesidad de
  parking cuenta **1 por vivienda**.
- **Alcance actual:** login + gestión de usuarios, **mensajes/tablón** (la
  gestión publica directo; el **vecino propone** incidencias/anuncios/sugerencias
  desde Buzón → Publicar, con **moderación**; módulo 16), **buzón privado** por
  canales (módulo 17), encuestas, reservas multi-zona (con aprobación), parking
  (rotación + cesión) y contactos.
- **Sistema viejo de incidencias/anuncios (pre-0013):** RETIRADO; hoy todo vive
  en el modelo de **mensajes** con estados/moderación. Ver módulos 16 y 17.
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
