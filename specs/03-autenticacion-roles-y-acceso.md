# 03 · Autenticación, roles y flujo de acceso

## Login (sin contraseña) — código OTP de 6 dígitos

El acceso es con un **código de un solo uso de 6 dígitos** enviado por correo
(Supabase Auth, `signInWithOtp` con `shouldCreateUser:false` → solo entran
vecinos **ya aprobados**). El vecino introduce su correo, recibe el código y lo
teclea para entrar. El campo usa `autocomplete="one-time-code"` para que el móvil
lo ofrezca automáticamente.

> No hay contraseñas propias, ni Google, ni enlace mágico (se retiraron). La
> sesión se recuerda en el dispositivo (persistente). Emisor de correo: SMTP de
> Gmail de la comunidad (`cdelarioja25@gmail.com`).

> **Acceso directo (TEMPORAL, flag `ACCESO_DIRECTO=true` en `src/lib/session.ts`):**
> para facilitar la entrada a vecinos mayores, si el correo introducido es de un
> vecino **ya aprobado y activo**, la app le da sesión **directamente sin código**
> (Edge Function `acceso-directo`: genera un token de magic link sin enviar
> correo y lo canjea por sesión). Es login por correo como **único factor**
> (relajación deliberada de seguridad). Para volver al bloqueo por código OTP:
> poner el flag en `false` (no requiere más cambios; la función puede quedarse
> desplegada, deja de llamarse).

## Autenticado ≠ autorizado

Tener sesión no da acceso: lo concede la gestión al aprobar la solicitud. Estado
en `profiles.estado`:

- `pendiente` — ha solicitado pero no está aprobado.
- `activo` — aprobado; accede según su rol y permisos.
- `suspendido` — acceso revocado (sanción temporal).
- `baja` — dado de baja (reversible): no accede, sale del directorio y **libera
  la plaza** de su vivienda, pero conserva su historial (migración 0009).

**Regla de oro (RLS):** todo acceso a datos exige `estado = 'activo'`
(helper `es_activo()`). Suspendido/baja quedan bloqueados.

## Alta de vecinos

- El vecino **solicita acceso** (formulario: **nombre o alias** —sin apellidos—
  y correo; sin comentario), vía Edge Function `solicitar-acceso` (captcha +
  rate-limit + service_role). Avisa a la gestión (`notificar-admin`).
- La gestión con permiso `aprobar_altas` la **aprueba** asignando **vivienda** y
  **rol** (Edge `aprobar-solicitud`, crea el usuario + profile activo + correo).
- **Máx. 2 cuentas por vivienda** (estados activo/pendiente). **1 voto/postura
  por vivienda** en encuestas y parking.

## Roles (8)

`app_admin` (SUPERADMIN), `presidente`, `vicepresidente`, `administrador_finca`,
`junta`, `conserje`, `vecino` y `tester` (solo lectura, ver abajo).

## Rol `tester` (solo lectura)

Cuenta de pruebas (migraciones 0021/0022): ve la app como un vecino pero **no
puede ejecutar acciones** — reservar, votar, ceder plaza y sugerir están
bloqueados **en RLS** (`es_tester()`) y ocultos/deshabilitados en la interfaz.
Única acción permitida: **chatear por el buzón** (permiso `usar_buzon`).

## Permisos personalizables (por rol)

Los permisos **no son fijos**: el `app_admin` los activa/desactiva por rol desde
**Panel → Permisos**. Viven en `role_permissions` y los **helpers RLS los leen en
vivo** (migración 0010): un permiso quitado se aplica de verdad en el servidor,
no solo en la interfaz.

- **`app_admin` = SUPERADMIN**: siempre todos los permisos, no editable.
- Catálogo:
  - `panel` — acceder al panel de gestión y moderar.
  - `usar_buzon` — chatear por el buzón (por defecto TODOS los roles, tester incluido).
  - `publicar_mensajes` — crear avisos/anuncios/incidencias (ver `specs/16`).
  - `aprobar_altas` — aprobar solicitudes y gestionar vecinos (editar, suspender,
    dar de baja, cambiar rol).
  - `aprobar_reservas` — aprobar/rechazar reservas (ver `specs/07`).
  - `votar_encuestas` — emitir voto en encuestas (por defecto todos menos tester).
  - `realizar_reservas` — solicitar reservas de zonas comunes (idem).
  - `escribir_vecinos` — iniciar chats del buzón con cualquier vecino, en su
    canal (por defecto administrador_finca y conserje; ver `specs/17`).
- Semilla por defecto: toda la gestión (todos menos `vecino`) tiene `panel` y
  `publicar_mensajes`; `aprobar_altas` = presidente/administrador_finca/app_admin;
  `aprobar_reservas` = presidente/app_admin. `conserje` sin permisos por defecto.

> Operaciones sensibles (rol, estado, alta) → **Edge Functions con service_role**
> que comprueban el permiso. El cliente nunca escribe rol/estado. Ocultar botones
> en la interfaz **no** es seguridad: cada regla vive también en la RLS.

## Panel de gestión

Acceso con permiso `panel` (o app_admin). Cabecera **fija y compacta** (icono +
"Panel de gestión" + pestañas); solo el contenido scrollea. Los usuarios de
gestión tienen además un acceso **"Gestión"** en la barra inferior (empuja
Mensajes; cede el sitio a Parking, que sigue en "Más"). Pestañas:

- **Vecinos** (unifica el antiguo "Acceso") — arriba del todo las **solicitudes
  de acceso pendientes** (se aprueban primero); botón **"Añadir vecino"** para
  **alta directa sin registro** (nombre, correo, vivienda y rol; crea Auth +
  perfil activo vía `gestionar-usuario` accion `crear` y envía una **invitación
  por correo** con un enlace que abre la app — plantilla "invite" en español,
  `redirectTo=APP_ORIGIN` — útil para cuentas de prueba con rol **Tester**). En el alta directa —y **solo
  ahí**— el desplegable de vivienda ofrece además tres **viviendas especiales**
  (Conserje / Administrador / Tester) para cuentas que **no** representan un piso:
  `es_piso=false`, **no cuentan** como vivienda en votaciones, censo de vecinos
  ni parking (migración 0023). Después
  **buscador por piso/nombre** y por vecino: **editar**, **cambiar rol**,
  **suspender/reactivar** y **dar de baja** (papelera) **/reactivar**.
  Requiere `aprobar_altas`.
- **Reservas** — cola de pendientes + **agenda mensual** (ver `specs/07`).
- **Permisos** — editor de permisos por rol (solo app_admin).

**Ver como** (en "Más", **solo app_admin**): previsualiza la interfaz con otro rol
(vecino, presidente, etc.). Es **solo de interfaz** — cambia el rol efectivo en el
cliente (`store.verComo`) y recalcula los permisos de ese rol; tu identidad/JWT
sigue siendo la real (la RLS del servidor no cambia). Una **barra fija** ("Viendo
como…") permite **volver a administrador** (`salirVerComo` → `refreshAuth`). Se
sale también al recargar o al refrescarse la sesión.

**Dashboard de la app** (menú en "Más", **solo app_admin**; ruta `/dashboard`):
selector de dos secciones:
- **Adopción** — donut de **viviendas dentro vs por inscribir** y tabla **por
  piso** (un piso "está dentro" si tiene ≥1 cuenta activa; `listViviendas` +
  `listVecinos`) + **cuántas cuentas han conseguido entrar** alguna vez
  (`stats_acceso`, migración 0024). En la tabla por piso, cada vivienda con
  cuenta marca **"Ha entrado"** (ya inició sesión) o **"Sin entrar"** (cuenta
  aprobada pero aún no ha accedido) — `stats_acceso_por_vivienda`, migración
  0025. "Dentro/Con cuenta" = cuenta aprobada; NO implica haber entrado.
- **Reservas** — estadísticas de gestión (`estadisticasReservas`): reservas
  **aprobadas este mes** y **este año**, **canceladas este año**, **total del
  año** y **ranking** de quién ha reservado y cuántas veces este año. Cuenta por
  grupo (una reserva multi-zona = 1); RLS `es_gestion` ve todas.

## Buzón por canales (roles con canal propio)

Aparte de los permisos, ciertos roles atienden **canales privados del buzón**:
administrador_finca → Administración; presidente/vicepresidente → Presidencia;
conserje → Conserje; app_admin → Desarrollador de la app. Ver `specs/17`.

## Primer acceso y normas

En el primer acceso se muestran las **normas de uso** (ver `specs/15`) y se
guarda `normas_aceptadas_at`; mientras sea `null`, la app vuelve a esa pantalla. La pantalla fija el botón **"Acepto las normas"** abajo (siempre visible; el texto scrollea en el centro) para que sea accesible también en Android.

## Sesiones

Sesión gestionada por Supabase (JWT + refresh); logout siempre disponible.
Cambiar rol/estado/permiso surte efecto al refrescar: la RLS lee `profiles` y
`role_permissions` en vivo.
