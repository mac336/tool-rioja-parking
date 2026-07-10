# Changelog — Rioja 25

Cambios funcionales relevantes, más recientes arriba. Cada entrada nueva se añade
al implementar el cambio (ver `CLAUDE.md` → Forma de trabajo).

## 2026-07-10

- **Layout app-shell general:** la app se fija al viewport visible (`--app-h`
  vía VisualViewport); cabecera y TabBar siempre fijos, solo scrollea el
  contenido. Arregla el desplazamiento de toda la pantalla con el teclado en iOS.
- **Buzón · canal "Desarrollador de la app"** → lo atiende el `app_admin`
  (migración 0018). Ya existían Administración/Presidencia/Conserje.
- **Buzón por canales privados dirigidos** (migración 0017): el vecino elige a
  quién escribe (Administración → administrador_finca; Presidencia → presidente+
  vicepresidente; Conserje → conserje). Privado por rol; ni el app_admin husmea
  otros canales. Push dirigido al canal. Ver `specs/17`.
- **Rol nuevo `conserje`** (migración 0016), asignable y configurable como el resto.
- **Mensajes:** firma seleccionable (Administrador/Conserje/la Junta + viviendas;
  migración 0015) que aparece en el post-it; fecha de caducidad opcional
  prefijada a mañana con papelera para quitarla (migración 0014).
- **Rediseño de Inicio (diseño 2a):** "Tablón de la comunidad" con post-its
  pinchados por tipo; pila con contador que abre un bloc de post-its (gesto de
  despegar hoja). Strip de parking contextual (solo ≤7 días antes / durante /
  cuenta atrás ≤3). Servicios en círculo. Fuente manuscrita Caveat.
- **Instalar app:** Android con instalador nativo (botón); iPhone con guía
  animada (solo Safari). Icono de mensajes junto a la campana → buzón.

## 2026-07-09 — 07-08

- **Mensajería (mensajes públicos + buzón):** modelo unificado de "mensajes"
  (tipo aviso/anuncio/incidencia) que publica solo la gestión; buzón privado
  vecino↔administración (migración 0012). **Retirado por completo** el sistema
  viejo de incidencias y anuncios creados por vecinos (código y BD, migración
  0013). Ver `specs/16`.
- **Permisos personalizables** (migración 0010): tabla `role_permissions`;
  el app_admin (SUPERADMIN) configura permisos por rol; los helpers RLS los leen.
- **Notificaciones push** (Web Push/VAPID, migración 0011) para reservas, mensajes
  y buzón. Correo (Gmail SMTP) para código de acceso, altas, reservas y sugerencias.
- **Gestión de vecinos:** editar (nombre/vivienda), suspender y **dar de baja**
  reversible (estado `baja`, migración 0009). Panel de gestión unificado.
- **Reservas multi-zona** (migraciones 0006/0008): una reserva puede abarcar
  varias zonas en el mismo horario (grupo); 1 reserva vigente por vivienda.
- **Incidencias con aprobación previa** (migración 0007) — luego retirado por el
  modelo de mensajes.
- **Login:** paso a **código OTP de 6 dígitos** por correo (sin Google ni enlace
  mágico). Sugerencias envían correo real (Edge Function + Gmail SMTP).

## 2026-07-06 — 07-07 · Base

- Esqueleto de la app (React+Vite+Supabase), esquema inicial, RLS, triggers,
  vistas y storage (migraciones 0001–0005). Módulos: incidencias, encuestas,
  reservas, parking, contactos, anuncios, sugerencias. Despliegue en Vercel +
  Supabase. Ver specs 01–15.
