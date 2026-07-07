# 03 · Autenticación, roles y flujo de acceso

## Métodos de login

Dos métodos, ambos vía Supabase Auth:

1. **Google (OAuth)** — "Entrar con Google". Cómodo en móvil, sin contraseñas.
2. **Enlace mágico (Email OTP)** — el vecino recibe un enlace de un solo uso en
   su correo y entra sin contraseña.

No se usan contraseñas propias (reduce la superficie de ataque). El envío de
correos usa el SMTP de Gmail de la comunidad (módulo 02).

## Concepto clave: autenticado ≠ autorizado

Iniciar sesión con Google **no** da acceso a la app. El acceso lo concede un
administrador al aprobar la solicitud. La pertenencia se guarda en `profiles`:

- `pendiente`: ha iniciado sesión/solicitado pero no está aprobado.
- `activo`: aprobado; accede según su rol.
- `suspendido`: acceso revocado.

**Regla de oro (RLS):** cualquier acceso a datos de la comunidad exige
`estado = 'activo'`. Un usuario autenticado pero no aprobado solo ve la pantalla
de "solicitud pendiente".

## Viviendas y cuentas

- Cada cuenta se vincula a una **vivienda** (catálogo `viviendas`, módulo 04).
- **Hasta 2 cuentas por vivienda.** Al aprobar una tercera para la misma
  vivienda, el sistema avisa y lo impide (salvo que un admin lo fuerce).
- **1 voto/postura por vivienda** en encuestas y en la necesidad/donación de
  plaza (aunque haya 2 cuentas). Ver módulos 06 y 08.

## Roles y permisos

Seis roles: `app_admin`, `presidente`, `vicepresidente`, `administrador_finca`,
`junta`, `vecino`. Los cinco primeros son **roles de gestión**.

### Matriz de permisos (por defecto)

Columnas agrupadas: **Vecino** · **Junta** (presidente/vicepresidente/vocales) ·
**Adm. finca** · **App admin**.

| Acción | Vecino | Junta | Adm. finca | App admin |
|--------|:------:|:-----:|:----------:|:---------:|
| Ver contenidos de la comunidad | ✅ | ✅ | ✅ | ✅ |
| Crear incidencia / comentar | ✅ | ✅ | ✅ | ✅ |
| Editar/borrar **su** incidencia | ✅ | ✅ | ✅ | ✅ |
| Cambiar estado / cerrar incidencias | ❌ | ✅ | ✅ | ✅ |
| Votar encuesta (1/vivienda) | ✅ | ✅ | ✅ | ✅ |
| Crear/cerrar encuestas | ❌ | ✅ | ✅ | ✅ |
| Crear anuncio (1 pendiente/vivienda) | ✅ | ✅ | ✅ | ✅ |
| **Aprobar/publicar anuncios** | ❌ | ✅ | ✅ | ✅ |
| **Bloquear a una vivienda para crear anuncios** | ❌ | pres.* | ✅ | ✅ |
| Solicitar reserva de zona común | ✅ | ✅ | ✅ | ✅ |
| **Aprobar/rechazar reservas** | ❌ | pres. | ❌ | ✅ |
| Anular **su** reserva | ✅ | ✅ | ✅ | ✅ |
| Donar/ceder su plaza de parking | ✅ | ✅ | ✅ | ✅ |
| Gestionar/reasignar plazas donadas | ❌ | ✅ | ✅ | ✅ |
| Editar contactos | ❌ | ❌* | ✅ | ✅ |
| **Aprobar altas**, asignar vivienda/rol, suspender | ❌ | pres.* | ✅ | ✅ |
| Configurar zonas comunes y parámetros de parking | ❌ | ❌ | ❌ | ✅ |
| Gestionar roles y configuración de la app | ❌ | ❌ | ❌ | ✅ |

\* `pres.` = solo el **presidente** dentro del grupo Junta (no vicepresidente ni
vocales), salvo que `app_admin` lo ajuste. **Aprobar/rechazar reservas** las hace
el **presidente** (y `app_admin` como respaldo). **Aprobar altas** por defecto:
`app_admin`, `presidente` y `administrador_finca`.

> La matriz es la **fuente de verdad** para las políticas RLS (módulo 04).
> Ocultar botones en la interfaz **no** es un control de seguridad: cada regla se
> aplica también en la base de datos.

## Flujo de acceso (solicitud → aprobación → alta)

### 1. Pantalla de entrada
Dos caminos: **Entrar** (Google / enlace mágico) para miembros activos, y
**Solicitar acceso** para vecinos nuevos.

### 2. Solicitar acceso
Formulario: **nombre y apellidos**, **vivienda** (selector), **correo** y
comentario opcional. Al enviar:
- El formulario llama a la Edge Function **`solicitar-acceso`** (la tabla
  `access_requests` **no** tiene política de INSERT anónimo). La función:
  1. Verifica el **token de captcha** (Turnstile/hCaptcha) contra el servicio
     del captcha — esto no puede hacerse con RLS, por eso es una función.
  2. Aplica **rate-limit** por IP y por correo (contador en una tabla auxiliar
     `request_throttle` o similar; p. ej. máx. 3 solicitudes/hora por IP).
  3. Valida y sanea los campos (longitudes máximas, vivienda del catálogo).
  4. Inserta la fila en `access_requests` (estado `pendiente`) con
     `service_role` e invoca `notificar-admin`.
- Una Edge Function `notificar-admin` avisa por correo a los administradores.
- El solicitante ve: "Tu solicitud se ha enviado. Un administrador la revisará y
  recibirás un correo para completar tu acceso." (Mensaje **idéntico** aunque el
  correo ya exista, para no permitir enumeración — módulo 11.)

### 3. Aprobación
En el **panel de administración**, un rol autorizado (por defecto `app_admin`,
`presidente`, `administrador_finca`) ve las solicitudes y puede:
- **Aprobar**: confirma **vivienda** y **rol** (por defecto `vecino`), respetando
  el máximo de 2 cuentas/vivienda. La Edge Function `aprobar-solicitud`
  (server-side, `service_role`):
  1. Crea/vincula el usuario en Supabase Auth por su correo.
  2. Crea/actualiza `profiles` con vivienda, rol y `estado = 'activo'`.
  3. Envía por Gmail SMTP la **invitación** con enlace de acceso.
- **Rechazar**: marca la solicitud como `rechazada` (motivo opcional).

> El frontend nunca asigna roles/estados: siempre por Edge Function.

### 4. Primer acceso
Al entrar con **el correo aprobado**, su sesión ya tiene `estado = 'activo'` y su
rol. Un correo no aprobado queda `pendiente` y solo ve la pantalla de acceso
pendiente.

En el primer acceso, antes de usar la app, se muestran las **normas de uso**
(resumen del módulo 15) y el usuario debe aceptarlas; se guarda
`normas_aceptadas_at` en `profiles`. Mientras sea `null`, la app vuelve a esa
pantalla.

> **Nota (Google OAuth):** el vecino debe entrar con **el mismo correo** que fue
> aprobado. Si su cuenta de Google usa otro correo, entrará como `pendiente`;
> la pantalla de "pendiente" debe recordar este caso ("¿solicitaste acceso con
> otro correo?").

## Sesiones

- Sesión gestionada por Supabase (JWT + refresh). Logout disponible siempre.
- Cambiar rol o suspender surte efecto al refrescar token: las políticas RLS leen
  `profiles` en vivo, no solo el JWT.

## Correos del sistema (vía Gmail SMTP)

| Correo | Destinatario | Disparador |
|--------|--------------|-----------|
| Enlace mágico | Vecino | Login por email |
| Aviso de nueva solicitud | Administradores | Nueva `access_request` |
| Invitación / alta aprobada | Vecino | Aprobación |
| Solicitud rechazada (opcional) | Vecino | Rechazo |

Plantillas en español, sobrias, sin datos sensibles innecesarios.
