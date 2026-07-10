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

## Roles (7)

`app_admin` (SUPERADMIN), `presidente`, `vicepresidente`, `administrador_finca`,
`junta`, `conserje`, `vecino`.

## Permisos personalizables (por rol)

Los permisos **no son fijos**: el `app_admin` los activa/desactiva por rol desde
**Panel → Permisos**. Viven en `role_permissions` y los **helpers RLS los leen en
vivo** (migración 0010): un permiso quitado se aplica de verdad en el servidor,
no solo en la interfaz.

- **`app_admin` = SUPERADMIN**: siempre todos los permisos, no editable.
- Catálogo:
  - `panel` — acceder al panel de gestión y moderar.
  - `publicar_mensajes` — crear avisos/anuncios/incidencias (ver `specs/16`).
  - `aprobar_altas` — aprobar solicitudes y gestionar vecinos (editar, suspender,
    dar de baja, cambiar rol).
  - `aprobar_reservas` — aprobar/rechazar reservas (ver `specs/07`).
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

- **Acceso** — cola de altas por aprobar (asignar vivienda y rol).
- **Reservas** — cola de pendientes + **agenda mensual** (ver `specs/07`).
- **Vecinos** — **buscador por piso/nombre**, y por vecino: **editar**
  nombre/vivienda, **cambiar rol**, **suspender/reactivar** y **dar de baja**
  (icono papelera) **/reactivar**. Requiere `aprobar_altas`.
- **Permisos** — editor de permisos por rol (solo app_admin).

## Buzón por canales (roles con canal propio)

Aparte de los permisos, ciertos roles atienden **canales privados del buzón**:
administrador_finca → Administración; presidente/vicepresidente → Presidencia;
conserje → Conserje; app_admin → Desarrollador de la app. Ver `specs/17`.

## Primer acceso y normas

En el primer acceso se muestran las **normas de uso** (ver `specs/15`) y se
guarda `normas_aceptadas_at`; mientras sea `null`, la app vuelve a esa pantalla.

## Sesiones

Sesión gestionada por Supabase (JWT + refresh); logout siempre disponible.
Cambiar rol/estado/permiso surte efecto al refrescar: la RLS lee `profiles` y
`role_permissions` en vivo.
