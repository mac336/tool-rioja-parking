# Rioja 25 — Guía del repositorio (para Claude Code)

App de comunidad de vecinos "Rioja 25": **React 18 + Vite + TypeScript + Tailwind
+ Supabase (Postgres + Auth + RLS + Edge Functions) + PWA**, desplegada en Vercel.
La hace un vecino del Bajo C, sin ánimo de lucro, para centralizar gestiones.

## ⚙️ Forma de trabajo (OBLIGATORIA)

**Cada cambio funcional actualiza la documentación en el mismo commit.** No se
considera "hecho" hasta que las specs reflejan el nuevo comportamiento.

Al implementar algo nuevo o cambiar algo existente:
1. **Actualiza el spec** del módulo afectado en `specs/` (o crea uno nuevo y
   añádelo al índice `specs/README.md`). Las specs describen el comportamiento
   ACTUAL, no el histórico.
2. **Añade una entrada a `CHANGELOG.md`** (arriba del todo, con fecha) resumiendo
   el cambio.
3. Si tocas la **base de datos**, hazlo con una **migración nueva** en
   `supabase/migrations/` (append-only, numerada `00NN_...`); nunca edites
   migraciones ya aplicadas. Aplícala en local **y en producción**.
4. Si tocas una **Edge Function**, **despliégala** (`supabase functions deploy`).
5. Verifica: `npx tsc --noEmit`, tests relevantes y `npx vite build`.

## Estado y decisiones vigentes (resumen)

- **Login:** sin contraseña — **código OTP de 6 dígitos por correo** (solo a
  vecinos ya aprobados). No hay Google ni enlace mágico. Ver `specs/03`.
- **Roles (7):** `app_admin` (SUPERADMIN), `presidente`, `vicepresidente`,
  `administrador_finca`, `junta`, `conserje`, `vecino`.
- **Permisos personalizables:** el app_admin activa/desactiva permisos por rol
  (tabla `role_permissions`). Los helpers RLS los leen en vivo. Ver `specs/03`.
- **Estados de cuenta:** `pendiente`, `activo`, `suspendido`, `baja` (reversible).
- **Mensajes (tablón):** avisos/anuncios/incidencias los publica solo la gestión
  con permiso `publicar_mensajes`; el vecino solo lee. Sustituyen al viejo sistema
  de incidencias y anuncios (RETIRADOS). Ver `specs/16`.
- **Buzón privado por canales:** vecino↔(Administración/Presidencia/Conserje/
  Desarrollador de la app), dirigido y privado por rol. Ver `specs/17`.
- **Notificaciones:** push (Web Push/VAPID) para casi todo (mensajes, buzón,
  reservas, nuevas solicitudes, sugerencias). Los **correos de notificación están
  desactivados** (flag `supabase/functions/_shared/config.ts`); solo se envían por
  correo los **imprescindibles**: código de acceso (login OTP) e invitación al
  aprobar un alta.
- **PWA:** instalable; Android con botón nativo, iPhone con guía (solo Safari).
  Layout app-shell: la app se fija al viewport visible (`--app-h`), cabecera y
  TabBar siempre fijos, solo scrollea el contenido.
- **PII:** NO se cifra el nombre por columna (decisión tomada); se protege con
  cifrado de disco en reposo + RLS + minimización (solo nombre/alias).
- **Zona horaria:** Europe/Madrid para toda la lógica de fechas.

## Mapa del código

- `src/lib/api.ts` — switch mock/real. `apiMock.ts` (demo en memoria) /
  `apiSupabase.ts` (real, compuesto de `src/lib/db/*`).
- `src/lib/roles.ts` — roles, permisos y helpers (con caché del usuario actual).
- `src/features/*` — pantallas por módulo (home, mensajes, buzon, bookings,
  encuestas, parking, contacts, admin, settings, auth, misc).
- `src/components/layout/AppShell.tsx` — shell (Sidebar/TabBar/altura viewport).
- `supabase/migrations/*` — esquema, RLS, funciones/triggers (fuente de verdad
  de la BD). `supabase/functions/*` — Edge Functions.
- `tests/` — `render.test.tsx`, `parking.test.ts`, `db-int/` (integración con
  Supabase local, `SUPA_ITEST=1`), `rls/rls_test.sql` (RLS por psql).

## Convenciones

- **Estilos (`specs/18`):** la Home manda. Cabeceras de pantalla con
  `ScreenHeader`; títulos de sección con `SectionTitle`/`.section-title` (NO el
  viejo `overline`, que queda solo para micro-rótulos en tarjetas). Diseño plano
  (evitar `shadow-neu*`). Cabecera/TabBar fijas; solo scrollea el contenido.
- Textos de UI en **español**. Fechas en Europe/Madrid.
- La seguridad la impone la **RLS**, no la interfaz. Toda función de datos nueva
  debe tener su política RLS y, si aplica, su aserción en `tests/rls/rls_test.sql`.
- No reintroducir el sistema viejo de incidencias/anuncios (retirado en 0013).
