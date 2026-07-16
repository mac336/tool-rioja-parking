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
6. **Versiona la subida**: incrementa `version` en `package.json` en cada push
   que despliegue (parche para arreglos, minor para funcionalidad). La versión
   se inyecta como `__APP_VERSION__` (vite.config) y se muestra abajo del todo
   en la pantalla de bienvenida.

## 🚀 Despliegue a producción (mecánica exacta — la hace Claude, no el usuario)

**Claude Code aplica las migraciones a producción y despliega las Edge Functions
él mismo desde esta sesión.** No hay que pedirle al usuario que abra su terminal:
si estas credenciales están disponibles, Claude hace todos los pasos. El front
(Vercel) se despliega solo al hacer `git push` a `main`.

Datos fijos del proyecto:
- **Project ref (prod):** `ektnyaspcobkliixfply`
- **Token de la Management API:** en `~/.supabase-token` (PAT de Supabase). NUNCA
  imprimir su contenido; usarlo solo como variable de entorno.
- **Contenedor de la BD local:** `supabase_db_tool-rioja-parking` (Supabase local
  vía Docker; la CLI se invoca con `npx supabase`).

**Regla de oro (memoria del proyecto): copia de seguridad de prod ANTES de tocar
la BD.** `npx supabase db dump --linked -f actas/backups/backup-AAAAMMDD.sql`
(o desde el panel de Supabase → Database → Backups). Nunca tocar datos de prod
sin respaldo.

**1) Aplicar una migración en LOCAL** (psql dentro del contenedor):
```bash
docker exec -i supabase_db_tool-rioja-parking psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < supabase/migrations/00NN_x.sql
```

**2) Aplicar la MISMA migración en PRODUCCIÓN** (Management API, endpoint SQL):
```bash
export SUPABASE_ACCESS_TOKEN="$(cat ~/.supabase-token)"
python3 -c "import json;print(json.dumps({'query':open('supabase/migrations/00NN_x.sql').read()}))" > /tmp/m.json
curl -s -m 60 -X POST \
  "https://api.supabase.com/v1/projects/ektnyaspcobkliixfply/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/m.json
```
Respuesta `[]` = OK. El mismo endpoint sirve para **consultas de verificación**
(SELECT) en prod. Las migraciones deben ser **idempotentes** (`if not exists`,
`on conflict do nothing`, `drop policy if exists ... create policy`).

**3) Desplegar / borrar Edge Functions** (CLI con el token, sin abrir terminal
del usuario):
```bash
export SUPABASE_ACCESS_TOKEN="$(cat ~/.supabase-token)"
npx supabase functions deploy <nombre> --project-ref ektnyaspcobkliixfply
npx supabase functions delete <nombre> --project-ref ektnyaspcobkliixfply
```

**4) Front:** `git push origin main` → Vercel despliega automático. Recuerda el
`version` de `package.json` (paso 6 de arriba).

**⚠️ Dos sesiones a la vez:** puede haber otro chat trabajando el mismo repo. Antes
de aplicar algo a prod, comprueba con un SELECT si ya está aplicado (p. ej. si el
valor de enum / la columna / la política ya existen) y evita pisarte con el otro
carril. Tras `git push`, si hay divergencia, reconcilia sin perder trabajo ajeno.

## Estado y decisiones vigentes (resumen)

- **Login:** sin contraseña. **Flag EN VIVO `acceso_directo`** (tabla `app_config`,
  editable en **Gestión → Configuración** por el app_admin): con `true` los vecinos
  aprobados entran **solo con su correo, sin código** (Edge `acceso-directo`), por
  usabilidad con gente mayor; con `false` vuelve al **código OTP de 6 dígitos por
  correo**. No hay Google ni enlace mágico. Ver `specs/03`.
- **Configuración general (`app_config`):** feature flags que el app_admin cambia
  sin desplegar (Gestión → Configuración): `acceso_directo` y
  `reservas_requieren_aprobacion`. Ver `specs/03` y `specs/07`.
- **Roles (8):** `app_admin` (SUPERADMIN), `presidente`, `vicepresidente`,
  `administrador_finca`, `junta`, `conserje`, `vecino`, `tester` (cuenta de
  pruebas SOLO lectura + chat del buzón).
- **Permisos personalizables:** el app_admin activa/desactiva permisos por rol
  (tabla `role_permissions`). Los helpers RLS los leen en vivo. Ver `specs/03`.
- **Estados de cuenta:** `pendiente`, `activo`, `suspendido`, `baja` (reversible).
- **Mensajes (tablón):** 4 tipos (aviso/anuncio/incidencia/**sugerencia**),
  con **permisos POR TIPO** (`ver_<tipo>`/`publicar_<tipo>`; el conserje ve/publica
  solo avisos e incidencias). Quien tiene el permiso publica directo; el **vecino
  propone** desde Buzón → Publicar (incidencia/anuncio/sugerencia) con
  **moderación** (`aprobar_incidencias`/`aprobar_anuncios`) o manda reportes
  privados a
  administración. Las **sugerencias** llevan autor visible y **likes 1/vivienda**
  (`mensaje_likes`). Sustituye al viejo sistema pre-0013 (RETIRADO). Ver `specs/16`.
- **Buzón privado por canales:** vecino↔(Administración/Presidencia/Conserje/
  Desarrollador de la app), dirigido y privado por rol; incluye la sección
  **Publicar** (propuestas de vecinos al tablón). El feedback sobre la app va por
  el chat del canal Desarrollador (el formulario viejo se retiró). Ver `specs/17`.
- **Notificaciones:** push (Web Push/VAPID) para casi todo (mensajes, buzón,
  reservas, nuevas solicitudes, sugerencias). Los **correos de notificación están
  desactivados** (flag `supabase/functions/_shared/config.ts`); solo se envían por
  correo los **imprescindibles**: código de acceso (login OTP) e invitación al
  aprobar un alta.
- **PWA:** instalable; Android con botón nativo, iPhone con guía (solo Safari).
  Layout app-shell: la app se fija al viewport visible (`--app-h`), cabecera y
  TabBar siempre fijos, solo scrollea el contenido. Al abrirse **instalada**
  (standalone) la app sella `profiles.pwa_at` (RPC `registrar_pwa`); el Dashboard
  de la app muestra cuántos vecinos han entrado y cuántos la tienen instalada.
- **Home = panel de gadgets SIN scroll** (tablón elástico de 1 línea + visor;
  servicios como pieza clave pegada al footer; TabBar solo Inicio y Más; "Más"
  solo con lo que no está en la Home). Ver `specs/10` y `specs/16`.
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
