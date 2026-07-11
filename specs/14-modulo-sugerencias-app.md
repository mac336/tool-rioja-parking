# 14 · Módulo Sugerencias sobre la app — **RETIRADO** (v1.20.0)

> **RETIRADO.** El formulario de feedback y su Edge Function `enviar-sugerencia`
> se eliminaron: el feedback sobre la app se hace por el **chat del buzón**,
> canal **"Desarrollador de la app"** (ver `specs/17`).
>
> La tabla `sugerencias` (mig. 0026) queda como **histórico de solo lectura**,
> visible para el app_admin en **Dashboard → Sugerencias** (`listSugerencias`).
>
> La pantalla **"Sugerencias"** de Servicios es hoy el **tablón de sugerencias
> de la comunidad** (autor + likes), documentado en `specs/16`.
>
> Lo que sigue es la spec histórica del formulario retirado.

## Objetivo
Un apartado sencillo para que cualquier vecino envíe **feedback sobre la propia
app** (fallos, ideas de mejora, "echo en falta X") por **correo** a
`cdelarioja25@gmail.com`. Es feedback del producto, distinto de los mensajes del
tablón (módulo 16) y de las encuestas (módulo 06).

## Historias de usuario
- Como **vecino**, quiero enviar rápido una sugerencia sobre la app sin
  complicaciones.

## Requisitos funcionales
1. Apartado accesible (p. ej. en el menú/ajustes o pie) con un botón
   **"Enviar sugerencia"**.
2. Al pulsar, se abre un mensaje de correo **dirigido a
   `cdelarioja25@gmail.com`** con asunto y cuerpo prerrellenados en español
   (equivalente al `mailto:` que ya existe en la app actual).
   - Opción A (mínima, como hoy): enlace `mailto:` que abre la app de correo del
     dispositivo. Cero backend.
   - Opción B (opcional): formulario dentro de la app que envía el correo vía
     Gmail SMTP (Edge Function). Útil si se quiere no depender del cliente de
     correo del usuario. **Requiere** captcha/rate-limit si se deja accesible.
3. Confirmación visual de "gracias, sugerencia enviada".

## Reglas
- Por defecto, **Opción A** (`mailto:`) por simplicidad y coste cero.
- Si se elige la Opción B, aplica el saneado y anti-abuso del módulo 11.

## Seguridad
- Con `mailto:` no hay superficie de servidor. Con formulario propio: validar y
  limitar (captcha/rate-limit), no exponer el correo a scraping innecesario.

## Persistencia y lectura (2026-07-11)

- Toda sugerencia se **guarda en la tabla `sugerencias`** (migración 0026; la
  inserta la Edge Function con service_role). Antes solo se enviaba por
  correo/push y podía perderse.
- El **app_admin las lee en Dashboard → Sugerencias** (RLS: solo `es_app_admin`).
- El push "💡 Nueva sugerencia" lleva a `/dashboard`.
