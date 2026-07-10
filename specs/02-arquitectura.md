# 02 · Arquitectura

## Edge Functions (estado actual)

Operaciones sensibles y envíos, server-side con `service_role`:
- `solicitar-acceso` — alta pública (captcha + rate-limit).
- `aprobar-solicitud` — aprueba alta (crea usuario + profile + correo).
- `gestionar-usuario` — rol / suspender / baja / editar (permiso `aprobar_altas`).
- `notificar-admin` — avisa a la gestión de nuevas solicitudes.
- `notificar-reserva` — correo + push al aprobar/rechazar reserva.
- `notificar` — push de mensajes (a todos) y del buzón (al canal / al vecino).
- `enviar-sugerencia` — correo de sugerencias sobre la app.

Correo: **Gmail SMTP** (`cdelarioja25@gmail.com`, contraseña de aplicación en
secreto de la función). Push: **Web Push/VAPID** (clave privada en secreto).

## Visión general

```
┌──────────────────────┐        HTTPS         ┌───────────────────────────┐
│  Navegador / PWA      │  ───────────────►    │  Supabase (proyecto UE)   │
│  React + Vite (SPA)   │                      │  ├─ Auth (Google + OTP)   │
│  - mobile-first       │  ◄───────────────    │  ├─ PostgreSQL + RLS      │
│  - instalable         │   JS SDK (supabase-js)│  ├─ Storage (adjuntos)   │
└──────────┬───────────┘                      │  └─ Edge Functions        │
           │ deploy                            └────────────┬──────────────┘
           ▼                                                │ SMTP
┌──────────────────────┐                        ┌───────────▼─────────────┐
│  Vercel (hosting SPA) │                        │  Gmail SMTP             │
│  build desde GitHub   │                        │  cdelarioja25@gmail.com │
└──────────────────────┘                        └─────────────────────────┘
```

**Principio clave de seguridad:** el frontend es "no confiable". Toda regla de
acceso se aplica en la base de datos con **Row-Level Security (RLS)** y, cuando
haga falta lógica privilegiada, en **Edge Functions** del lado servidor. El
navegador solo usa la clave pública (`anon key`); la `service_role` **nunca**
sale del servidor.

## Componentes

### Frontend — React + Vite
- SPA en React con Vite (build rápido, sin configuración pesada).
- Cliente `@supabase/supabase-js` para auth y datos.
- Enrutado con `react-router`. Rutas protegidas por sesión + rol.
- PWA: `manifest.webmanifest` + service worker (se reaprovecha el enfoque
  actual, revisando el cacheo para no cachear datos sensibles — ver módulo 11).
- Mobile-first. El look & feel final vendrá del prompt de diseño.

### Backend — Supabase
- **Auth:** proveedores Google (OAuth) y Email OTP (enlace mágico).
- **PostgreSQL:** tablas del módulo 04, con RLS activado en **todas**.
- **Storage:** bucket privado para adjuntos de incidencias (fotos). Acceso por
  políticas; nunca público.
- **Edge Functions (Deno/TypeScript):** operaciones que requieren privilegios o
  no deben depender del cliente:
  - `solicitar-acceso`: recibe el formulario público, **verifica el captcha y el
    rate-limit en servidor** e inserta la solicitud (la tabla no admite INSERT
    anónimo directo — módulo 03).
  - `aprobar-solicitud`: crea/activa el usuario, asigna vivienda y rol, envía
    invitación (respetando el máx. de 2 cuentas por vivienda).
  - `notificar-admin`: avisa a los administradores de una nueva solicitud.
  - (según módulos) cierre/cómputo de encuestas y saneado de anuncios si se
    decide server-side.
- **Región:** proyecto en la **UE** (RGPD — ver módulo 10).

### Correo — Gmail SMTP
- Supabase → *Custom SMTP* apuntando a Gmail (`smtp.gmail.com`, puerto 587,
  STARTTLS) con **contraseña de aplicación** de `cdelarioja25@gmail.com`.
- Cubre: enlaces mágicos, invitaciones y correos de las Edge Functions.
- Límite práctico de Gmail (~500 envíos/día) muy por encima de lo necesario.

### Hosting — Vercel
- Proyecto conectado al repo de GitHub; **deploy automático** en cada push a
  `main`. *Preview deployments* en ramas.
- Variables de entorno en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
  **Nunca** secretos de servidor en el frontend.
- Dominio gratis de Vercel; opción de dominio propio más adelante.

## Zona horaria

Toda la lógica de negocio con fechas/horas opera en **Europe/Madrid**: cambio de
quincena del parking, límite de "sábados a las 20:00", ventanas de vigencia de
anuncios (`fecha_inicio`/`fecha_fin` son días naturales en Madrid), horarios de
zonas comunes y la condición "reserva en el pasado". En base de datos se
almacena `timestamptz` (UTC); la conversión a Europe/Madrid se hace al calcular
y mostrar. Cuidado con los triggers/constraints que comparan con `now()`: usar
la zona explícita, no la del servidor.

## Entornos

| Entorno | Uso | Datos |
|---------|-----|-------|
| **local** | Desarrollo | Proyecto Supabase de pruebas o local |
| **preview** | Revisión de ramas (Vercel) | Proyecto Supabase de pruebas |
| **producción** | App real de la comunidad | Proyecto Supabase de producción (UE) |

Datos de prueba **ficticios**: nunca cargar datos reales de vecinos en entornos
que no sean producción.

## Gestión de secretos

- `anon key` y `URL` de Supabase: públicas por diseño (van en el frontend); su
  seguridad depende **exclusivamente** de RLS.
- `service_role`, contraseña SMTP y claves de Edge Functions: solo en
  configuración de servidor (Supabase / Vercel), nunca en el repo ni en el
  bundle del navegador.
- El repositorio **no** contiene credenciales. Revisar `.gitignore` y el
  historial antes de hacerlo público (ver módulo 11).

## Repositorio y despliegue

- El código de la app es **público** (Vercel/GitHub free), lo cual es aceptable:
  la seguridad no depende de ocultar el código, sino de la autenticación y RLS.
- Los **datos personales** nunca están en el repo (hoy los contactos están
  incrustados en el HTML público: se migran a base de datos tras login —
  ver módulos 09 y 11).
