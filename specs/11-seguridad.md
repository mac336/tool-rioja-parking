# 11 · Seguridad (modelo de amenazas y controles)

> Requisito explícito del proyecto: **no queremos que nos hackeen.** Este
> documento es prioritario y transversal a todos los módulos. La app maneja
> datos personales de vecinos y decisiones de la comunidad.

## Estado actual (decisiones y controles vigentes)

- **La seguridad la impone la RLS**, no la interfaz. Toda tabla tiene RLS; las
  operaciones sensibles (rol/estado/alta, publicar mensajes) pasan por **Edge
  Functions con service_role** o por políticas que comprueban permisos.
- **Permisos personalizables reales:** los helpers RLS leen `role_permissions`
  en vivo (`tiene_permiso`), así que quitar un permiso en el panel lo aplica en
  el servidor, no solo en el cliente. `app_admin` es SUPERADMIN.
- **Buzón privado por canales:** `puede_ver_hilo(canal)` limita la visibilidad al
  rol del canal + el vecino dueño. **Ni el app_admin husmea** Presidencia/
  Conserje (verificado en `tests/rls/rls_test.sql`).
- **PII / cifrado de nombres:** se decidió **NO cifrar el nombre por columna**.
  Motivo: para mostrarlo hay que descifrarlo con una clave; en cliente sería
  inútil y en servidor rompe búsqueda/orden y añade mucha complejidad. Se protege
  con **cifrado de disco en reposo** (Supabase) + **RLS estricta** (solo vecinos
  activos ven el directorio; anónimos nada) + **minimización** (solo nombre o
  alias, sin apellidos).
- **Login sin contraseñas** (código OTP de 6 dígitos): no hay contraseñas que
  robar; mensaje de solicitud idéntico exista o no el correo (anti-enumeración).
- **Verificación:** `tests/rls/rls_test.sql` (asserts de RLS por psql) +
  `tests/db-int` (integración con Supabase local). Se amplían con cada frontera
  de seguridad nueva.

## Principios

1. **Nunca confiar en el cliente.** El navegador es manipulable. Toda regla de
   autorización se aplica en el servidor: **RLS en PostgreSQL** y **Edge
   Functions**. Ocultar un botón no protege un dato.
2. **Mínimo privilegio.** Cada rol solo puede lo que necesita (matriz módulo 03).
   La clave `service_role` jamás llega al navegador.
3. **Defensa en profundidad.** Validación en interfaz **y** en base de datos.
4. **Superficie mínima.** Sin contraseñas propias (login federado / enlace
   mágico), sin servicios de terceros innecesarios.

## Controles por área

### Autenticación
- Login solo vía Supabase Auth (Google OAuth + Email OTP). Sin contraseñas
  propias que robar/reutilizar.
- OAuth de Google con dominios de *redirect* restringidos a la URL de la app.
- Enlaces mágicos y de invitación de **un solo uso** y con caducidad.
- Sesiones con JWT + refresh; expiración razonable; logout efectivo.

### Autorización (el control central)
- **RLS activado y forzado en TODAS las tablas.** Sin excepciones.
- Políticas escritas a partir de la matriz de permisos (módulo 03) y revisadas
  una a una.
- Cambios de rol/estado y aprobaciones **solo** por Edge Function con
  `service_role`; el cliente nunca escribe `rol` ni `estado`.
- `estado = 'activo'` requerido para cualquier acceso a datos de comunidad.
- Pruebas de RLS: por cada tabla, verificar que un `vecino` no puede leer/editar
  lo que no le corresponde (ver "Verificación").

### Formulario público de solicitud de acceso (único punto anónimo)
- Pasa **siempre** por la Edge Function `solicitar-acceso` (módulo 03); la tabla
  `access_requests` no admite INSERT anónimo directo. El captcha y el rate-limit
  **solo** pueden verificarse en servidor: una política RLS no puede validar un
  token de Turnstile.
- **Captcha** (Cloudflare Turnstile / hCaptcha), verificado server-side.
- **Rate-limiting** por IP y por correo (contador en tabla auxiliar).
- Validación y saneado de entradas; longitud máxima de campos.
- No revelar si un correo ya existe (mensajes neutros) para evitar enumeración.

### Datos y entradas
- **XSS:** React escapa por defecto; **prohibido** `dangerouslySetInnerHTML` con
  contenido de usuario. Sanear cualquier HTML si alguna vez fuera necesario.
- **SQL injection:** se usa el SDK/consultas parametrizadas de Supabase; nunca
  concatenar SQL con entrada de usuario.
- **Validación de archivos** (adjuntos de incidencias): tipo MIME real, tamaño
  máximo, extensiones permitidas; almacenamiento en **bucket privado** con URLs
  firmadas de caducidad corta.
- Límites de tamaño en todos los campos de texto.

### Secretos y configuración
- `service_role`, contraseña SMTP de Gmail y secretos de Edge Functions: solo en
  variables de entorno de servidor (Supabase/Vercel). **Nunca** en el repo ni en
  el bundle.
- Gmail: usar **contraseña de aplicación** dedicada (no la contraseña real de la
  cuenta) y activar 2FA en `cdelarioja25@gmail.com`.
- **Revisar el repositorio y su historial de Git** antes de mantenerlo público:
  que no haya tokens, PDFs con datos, ni el `setup-github.sh` con lógica de
  credenciales. Rotar cualquier token que haya podido quedar expuesto.
- El `.gitignore` debe excluir `.env*`, credenciales y documentos con datos
  personales (hoy ya excluye `*.pdf`).

### Transporte y cabeceras
- **HTTPS** siempre (Vercel y Supabase lo fuerzan).
- Cabeceras de seguridad en Vercel: `Content-Security-Policy` (restringir
  orígenes a Supabase y lo imprescindible), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/CSP
  `frame-ancestors` para evitar *clickjacking*.
- CORS de Supabase limitado a los dominios de la app.

### Integridad de encuestas
- `UNIQUE(encuesta_id, vivienda)` + RLS: **un voto por vivienda**, solo con
  encuesta abierta, sin editar votos de otras viviendas.
- Cómputo de resultados en base de datos, no en el cliente.

### Moderación del tablón de anuncios (anti-XSS)
- Los anuncios los crea cualquier miembro, pero el "formato cuidado" se produce
  con un editor que genera **formato controlado** (Markdown restringido o marcas
  cerradas) y se **sanea en servidor** antes de guardar y de mostrar.
- **Prohibido** renderizar HTML arbitrario del usuario. Nada de
  `dangerouslySetInnerHTML` con contenido no saneado.
- Solo se publican tras aprobación de un rol autorizado; los `pendiente` no son
  visibles para el resto de vecinos (RLS).
- Límites de longitud aplicados en interfaz y base de datos.

### Cuentas y ciclo de vida
- Suspensión inmediata de cuentas (vecinos que se van). El acceso se corta al
  refrescar token porque RLS lee `profiles` en vivo.
- `audit_log` de acciones sensibles (aprobaciones, cambios de rol, borrados),
  escrito por triggers de BD y Edge Functions — nunca por el cliente
  (módulo 04).

## Dependencias y mantenimiento
- Dependencias mínimas y de fuentes fiables; `npm audit` en el pipeline.
- Actualizaciones de seguridad periódicas de Supabase y librerías.
- Fijar versiones (lockfile) y revisar antes de actualizar.

## Verificación de seguridad (antes de dar por hecho)
Checklist a pasar antes de publicar:
- [ ] RLS activado en todas las tablas y probado con un usuario `vecino` real.
- [ ] Un usuario no aprobado no accede a ningún dato de comunidad.
- [ ] `service_role` y SMTP no aparecen en el frontend ni en el repo.
- [ ] Historial de Git limpio de secretos y datos personales.
- [ ] Captcha + rate-limit activos en el formulario de solicitud.
- [ ] Cabeceras de seguridad y CSP configuradas y verificadas.
- [ ] Adjuntos en bucket privado; sin URLs públicas.
- [ ] Service worker no cachea datos personales.
- [ ] Prueba de doble voto y de reserva solapada: rechazadas por la BD.
- [ ] 2FA activo en la cuenta de Gmail; contraseña de aplicación dedicada.

> Recomendación: al terminar el desarrollo, hacer una **revisión de seguridad
> dedicada** (revisión de políticas RLS + pruebas de intrusión básicas) antes de
> abrir la app a los vecinos.

## Endurecimiento de grants (mig. 0028, 2026-07-11)

`authenticated` tenía `UPDATE` sobre TODAS las columnas de `profiles`; junto a la
política "actualiza tu propia fila", permitía a un usuario cambiarse su propio
`rol`/`estado` (escalada de privilegios). Corregido: `UPDATE` solo sobre
`nombre`, `normas_aceptadas_at` y `avisos_vistos_at`. Rol/estado/vivienda siguen
siendo exclusivos de las Edge Functions (service_role).

## Auditoría de seguridad (2026-07-11) y correcciones

Revisión de RLS, grants y Edge Functions. Estado y arreglos:

**RLS/BD (bien):** todas las tablas con RLS; escritura gateada por permisos
(`publicar_<tipo>`, es_gestion, es_app_admin, aprobar_*); un vecino ve solo su
propio `profiles` (sin emails ajenos); votos/reservas protegidos; vistas
(`directorio`, `ocupacion_reservas`, `encuesta_participacion`) exponen solo
columnas no sensibles (sin email).

**Corregido:**
- **profiles (mig. 0028):** el UPDATE de `authenticated` estaba abierto a TODAS
  las columnas → un usuario podía cambiarse su `rol`/`estado`. Limitado a
  `nombre`, `normas_aceptadas_at`, `avisos_vistos_at`.
- **Escalada de rol (Edge `gestionar-usuario`, `aprobar-solicitud`):** quien
  tenía `aprobar_altas` podía crear/asignar `app_admin`. Ahora **solo el
  app_admin** puede asignar/crear roles de gestión (el resto: `vecino`/`tester`);
  y nadie que no sea app_admin puede gestionar a un app_admin.
- **`notificar-admin`:** era anónimo (spam/phishing a admins). Ahora solo se
  acepta la llamada INTERNA (clave de servicio).
- **`notificar`:** exige `publicar_<tipo>` (o moderación) para el push masivo, y
  lo envía **solo a quien puede ver ese tipo** (`ver_<tipo>`); visibilidad del
  hilo (RLS) para el aviso de buzón.
- **`notificar-reserva` + cliente:** `grupoId` validado como UUID antes de
  interpolar en `.or()` (evita inyección de filtro PostgREST).
- **`log_audit` (mig. 0029):** revocado EXECUTE público (los triggers lo siguen
  usando); `role_permissions` SELECT restringido a usuarios activos.

**Pendiente / aceptado:** `acceso-directo` (login solo con correo) es una
relajación **temporal y deliberada** (flag `ACCESO_DIRECTO`, ver `specs/03`);
mientras esté activo, quien conozca el correo de un vecino aprobado puede entrar
como él. Recomendado volver a OTP (`ACCESO_DIRECTO=false`) cuando termine la fase
de adopción, o añadir captcha + rate-limit si debe seguir.
