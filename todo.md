# TODO / Diario de build — App Comunidad Rioja 25

> Este archivo es el **estado vivo** del desarrollo autónomo nocturno.
> Si algo se queda a medias, aquí está dónde me quedé y qué falta.
> Última actualización: 2026-07-06 noche (inicio).

---

## 🚦 Estado general

- Fase: **arrancando scaffolding**.
- Enfoque: **las specs (`/specs`) son el contrato de comportamiento**; el
  `design_handoff_rioja25` es el **lenguaje visual** (tokens, componentes,
  pantallas). Donde chocan, mando las specs para lógica/datos/seguridad y adapto
  el diseño. Todos los choques están abajo en "Conflictos".

---

## ✅ Requisitos verificados (entorno)

- [x] Node v24.15.0 + npm 11.12.1 — OK
- [x] Supabase CLI 2.109.0 (vía npx) — OK
- [x] `gh` autenticado (cuenta `migueldelcallejopereyra-sketch`, scopes repo/workflow) — OK
- [x] Git remote `origin` → github.com/mac336/tool-rioja-parking — OK
- [x] Diseño presente (`design_handoff_rioja25`: tokens.css/json, types.ts, mock-data.json, README, BUILD_GUIDE, .dc.html) — OK
- [x] **Docker daemon accesible desde WSL — RESUELTO** (socket 666, `docker ps` OK, server 29.3.1). `supabase start` + tests RLS posibles esta noche.

---

## ⛔ Bloqueos (necesitan acción del usuario)

### B1 · Docker socket sin permiso — ✅ RESUELTO (2026-07-06 noche)
- El usuario ejecutó `sudo usermod -aG docker $USER && sudo chmod 666 /var/run/docker.sock`
  en un terminal WSL real. Socket ahora `srw-rw-rw-`, `docker ps` OK, server 29.3.1.
- Nota: el `chmod 666` se pierde si Docker reinicia; el `usermod` es permanente
  tras reiniciar WSL. Si por la mañana `docker ps` diera permiso denegado otra
  vez, reinicia WSL (`wsl --shutdown` desde PowerShell) y ya entrará por grupo.

---

## ✔️ Decisiones CERRADAS con el usuario (2026-07-06 noche)

- **Eventos/RSVP:** NO hay módulo de eventos. La "cena de vecinos" y similares son
  **anuncios** normales del tablón (sin botón "Voy" ni asistentes).
- **Junta:** SIN sección propia. Se publica como anuncio (coherente con specs).
- **Votaciones:** **informales** según specs (participación X/Y viviendas +
  "sondeo informal", 1 voto/vivienda con `emitido_por` para auditoría). Sin
  quórum legal, sin anonimato total.
- **Tablón de anuncios de DOS NIVELES** (nuevo, confirmado):
  - **Principal**: carrusel rotativo ~10 s (accesible: controles manuales, pausa
    al interactuar, respeta `prefers-reduced-motion`). En Anuncios (arriba) + Home compacto.
  - **Secundario**: listado completo de publicados vigentes.
  - El vecino **pide** nivel al crear (`nivel_solicitado`); la gestión aprueba en
    ese nivel, lo mueve al secundario o rechaza (`nivel` definitivo). Un publicado
    se puede mover de nivel después. Ya reflejado en specs 13 y modelo 04.

## ❓ Conflictos diseño ⇄ specs y decisiones por defecto tomadas

> Todo esto es "review pendiente" por la mañana. He elegido la opción que menos
> rompe el contrato de specs y he seguido adelante para no bloquear.

1. **Roles: specs = 6, diseño = 3.**
   Specs: `app_admin, presidente, vicepresidente, administrador_finca, junta, vecino`.
   Diseño: badges `vecino / junta / admin`.
   → **Decisión:** modelo de datos + RLS con los **6 roles** (contrato). En UI, 3
   estilos de badge: `vecino`→vecino; `presidente/vicepresidente/junta`→"junta";
   `app_admin/administrador_finca`→"admin". Reconciliación limpia.

2. **Reservas: diseño confirma al instante (toast); specs exigen aprobación.**
   → **Decisión:** sigo specs: estado `pendiente`→ aprobación del **presidente**,
   anti-solapamiento y **1 reserva vigente por vivienda**. Reutilizo el visual de
   franjas/toast pero añadiendo estado "pendiente de aprobar" y la cola de
   aprobación.

3. **Votaciones: diseño muestra "Quórum ✓"; specs dicen sondeo informal sin valor legal.**
   → **Decisión:** mantengo participación (X/Y viviendas) y "sondeo informal, sin
   valor oficial" (specs). **Quito** el concepto de "quórum" legal (o lo dejo como
   simple % informativo sin sello de validez).

4. **Parking: diseño enseña "Plaza P-14 · nivel −1" (numerada, subterránea);**
   **specs = 6 plazas exteriores con rotación quincenal calculada del index.html.**
   → **Decisión:** sigo specs (matemática real de `index.html`: grupos, anchors,
   quincenas desde 31-01-2026, corte sábado 20:00). Uso la tarjeta visual del
   diseño pero con datos reales de rotación.

5. **Zonas comunes: diseño = "Sala social / Piscina / Barbacoa"; specs = "Jardín,**
   **Piscina, Sala comunidad, Lonja Delantera".**
   → **Decisión:** zonas de las specs (son las reales; configurables por app_admin).

6. **Terminología "Propuestas y votaciones" (diseño) = módulo "Encuestas" (specs).**
   → **Decisión:** etiqueta UI "Votaciones"; entidad de datos = `encuestas`.

7. **Features del diseño que NO están en specs:**
   - Banner "Cena de vecinos · Voy" (vida vecinal con RSVP).
   - Tarjeta "Junta · reunión anual" en Home.
   → **Decisión:** Junta está **fuera de v1** en specs (será un anuncio del
   tablón). Implemento el Home mostrando en su lugar el/los **anuncios
   publicados** vigentes (el tablón cubre eventos/junta). **Sin backend de RSVP
   "Voy"** en v1 (se puede añadir luego). Revisar si quieres el RSVP.

8. **Features de specs que NO tienen pantalla en el diseño (las creo por**
   **extrapolación de tokens + librería de componentes; revisar look por la mañana):**
   - **Tablón de anuncios** (lista + crear con editor controlado + cola moderación).
   - **Sugerencias de la app** (mailto).
   - **Parking**: donar/ceder plaza + panel de demanda.
   - **Reservas**: cola de aprobación del presidente + "ya tienes una reserva vigente".
   - **Contactos**: edición por admin.
   - **Normas de uso** (aceptación primer acceso) + **aviso de privacidad**.
   - **Panel admin**: bloqueo de anuncios por vivienda, gestión de zonas.

9. **`mock-data.json` del diseño** usa pisos/datos de ejemplo; los reemplazo por
   el catálogo real de **41 viviendas** (array `PISOS` de `index.html`) para
   parking y selects.

---

## 📋 Checklist de construcción

### Fase 0 · Scaffolding
- [x] Proyecto Vite + React + TS en la raíz (legacy movido a `/legacy`)
- [x] Tailwind + tokens.css + fuentes (Bricolage Grotesque, Figtree)
- [x] vite-plugin-pwa (manifest + SW, sin cachear datos Supabase)
- [x] `.env.example` + vite-env.d.ts
- [x] Tipos de dominio (`src/types/index.ts`) alineados con specs (6 roles)
- [x] **Parking portado (`src/lib/parking.ts`) + 12 tests en VERDE** ✅
- [ ] React Router + estructura de carpetas de BUILD_GUIDE
- [ ] `mock-data.json` portado; `lib/api.ts` (mock→real)
- [ ] Cliente supabase-js

### Fase 1 · Design system (primitivos)
- [ ] Button, Field, Select, Card, StatusChip, RoleBadge, CategoryChip
- [ ] Avatar, Toast, Alert, Table, EmptyState, Skeleton, ErrorState
- [ ] Stepper, ProgressBar, Fab, Logo
- [ ] AppShell + TabBar (móvil) + Sidebar (escritorio) + headers

### Fase 2 · Backend Supabase (local) — ✅ APLICADO Y VERIFICADO
- [x] `supabase init` + migraciones: 17 tablas del módulo 04
- [x] Triggers/constraints: 2 cuentas/vivienda, 1 voto/vivienda, anti-solapamiento reservas (gist), 1 reserva vigente/vivienda, 1 anuncio pendiente/vivienda, 5 incidencias/día, updated_at, audit_log, incidencia_eventos
- [x] Políticas RLS en las 17 tablas (49 políticas) — matriz módulo 03
- [x] Funciones auxiliares (es_activo, rol_actual, es_gestion, puede_aprobar_*, ...)
- [x] Vistas: directorio (sin email), ocupación reservas (sin identidad), participación encuestas, `encuesta_resultados()`
- [x] Seed: 41 viviendas + 4 zonas + 14 contactos migrados del index.html
- [x] **`supabase start` + reset + 17 tests RLS en VERDE** ✅ (idempotentes, `bash scripts/run-rls-tests.sh`)
- [x] FKs actor/aprobador `on delete set null` (soporta borrado de cuenta RGPD)
- [x] Edge Functions escritas (listas para desplegar; sin probar aún — necesitan
  secretos): `solicitar-acceso` (captcha+rate-limit server-side),
  `aprobar-solicitud` (crea usuario, vivienda/rol, máx 2/vivienda),
  `notificar-admin` (Gmail SMTP).

### Correcciones aplicadas durante el build (para revisar)
- Hueco RLS detectado y corregido: `res_upd_own` permitía al solicitante
  auto-aprobar su reserva; ahora el WITH CHECK limita el estado a
  pendiente/cancelada. Test 'vecino auto-aprueba su reserva' lo cubre.

### Revisión de seguridad (2026-07-07) — 5 findings CORREGIDOS ✅
Ver `SECURITY_REVIEW.md`. Auditoría con ataques reales contra la BD local:
- 🔴 CRÍTICO: un vecino podía INSERTAR un anuncio ya 'publicado' en el tablón
  principal (sin moderación). Corregido: `anuncio_before_insert` fuerza
  estado='pendiente', nivel/publicado_at/aprobado_por/motivo_rechazo nulos.
- 🟠 Parking: dueño podía auto-reasignar su cesión → WITH CHECK restringido.
- 🟠 Incidencias: el autor podía cambiar estado/moderación → trigger guard
  `incidencia_guard_update` + RLS reforzada.
- 🟡 Votos: opción de otra encuesta / borrar tras cierre → validaciones en trigger.
- 🟡 Funcional: la gestión (presidente/adm. finca/app_admin) ya puede bloquear
  anuncios de una vivienda (grant de columna + `puede_bloquear_anuncios()`).
- **24 tests RLS en verde** (6 nuevos de regresión). Bien blindado y verificado:
  auto-ascenso a admin, moderar/aprobar ajeno y auto-aprobar reservas → bloqueado.

### Fase 3 · Pantallas (specs + diseño) — ✅ COMPLETADAS
- [x] Login / Solicitar acceso / Solicitud enviada
- [x] Aceptación de normas (primer acceso) + aviso de privacidad
- [x] Home (móvil + escritorio) con carrusel de anuncios compacto
- [x] Incidencias: lista / detalle (stepper, comentarios) / nueva (foto local)
- [x] Votaciones (encuestas): lista / votar / resultados (informal, sin quórum)
- [x] Tablón de anuncios: carrusel principal + listado + crear (2 niveles) + cola moderación
- [x] Reservas: zonas/franjas / mis reservas / "ya tienes vigente" / cola presidente
- [x] Parking: rotación quincenal real / donar-ceder / panel demanda
- [x] Contactos: directorio por categorías (tel/mailto)
- [x] Sugerencias (mailto) + Reciclaje (estático)
- [x] Panel admin: solicitudes (aprobar/rol/vivienda) + info de gestión
- [x] Estados vacío/cargando/error en cada lista (useAsync)
- [x] Selector DEMO de rol (en "Más") para ver vistas de gestión sin login real

### Fase 4 · Verificación
- [x] Typecheck estricto de src+tests (exit 0)
- [x] **Build de producción sin errores** (`npm run build` → 99 KB JS gzip, PWA generada)
- [x] **12 tests de rotación de parking (Node) en VERDE**
- [x] **17 tests RLS en VERDE** contra Supabase local
- [x] Dev server responde 200 + todos los módulos de pantalla transforman sin error
- [x] Assets PWA (iconos, favicon casita 25, manifest, SW) empaquetados
- [ ] Revisión visual manual (pendiente para la mañana — ver RUNBOOK)

---

## 📝 Para ti por la mañana (lo que NO puedo hacer yo)
Estos requieren tu identidad; los dejo documentados en `RUNBOOK.md` (lo creo al final):
1. Contraseña de aplicación de Gmail para `cdelarioja25@gmail.com` (activar 2FA).
2. Cliente OAuth de Google (Google Cloud Console) para "Entrar con Google".
3. Claves Turnstile (Cloudflare) — de momento uso las de test públicas.
4. Crear proyecto Supabase de producción (UE) + Vercel (o me pasas tokens y lo hago).

---

## ✅ Verificación final (3 iteraciones, todo en verde)
- `npm run build` → OK (99 KB JS gzip, bajo el objetivo de 200 KB; PWA generada).
- `npx vitest run` → **34 tests OK** (12 rotación parking + 22 render de pantallas sin crash).
- `bash scripts/run-rls-tests.sh` → **17 tests RLS OK** contra Supabase local.
- Typecheck estricto exit 0. Dev server 200 + todos los módulos transforman.
- `npm audit --omit=dev` → **0 vulnerabilidades en producción** (las 6 son dev: esbuild/vite/vitest, no se despliegan).
- Añadido `vercel.json` (rewrite SPA + CSP + cabeceras de seguridad).

## 🔜 Pendiente para conectar a PRODUCCIÓN (siguiente sesión — no bloquea ver la app)
La app es **totalmente navegable en modo demo** (datos mock en memoria). Para
pasar a datos reales quedan estos pasos (ninguno inventa nada; el backend ya está
hecho y probado con RLS):
1. **Wiring de pantallas a Supabase**: hoy `src/lib/api.ts` usa un store mock en
   memoria. Falta reimplementar cada función contra `supabase-js` (lecturas con
   RLS + escrituras). Es mecánico y localizado en ese único fichero + auth.
2. **Auth real**: conectar Login (Google/magic link) con Supabase Auth y el
   guard de sesión/estado 'activo' + pantalla de "pendiente". Hoy el login es un
   bypass de demo.
3. **Subida de imágenes**: incidencias y anuncios usan preview local; falta el
   bucket privado + URLs firmadas.
4. **Panel admin**: hecho "Solicitudes"; faltan UIs de gestión de zonas,
   bloqueo de anuncios por vivienda y listado/edición de vecinos y contactos
   (las RLS ya lo permiten; falta la interfaz).
5. **Probar las 3 Edge Functions** con secretos reales (Gmail/Turnstile).
6. Pasos de cuentas: ver `RUNBOOK.md` sección 3 (Gmail, Supabase prod, Google
   OAuth, Turnstile, Vercel).

## 📝 Notas de revisión para la mañana
- **Diseño vs specs**: se siguieron las specs (6 roles→3 badges, reservas con
  aprobación, parking real, votaciones informales sin quórum, sin módulo de
  eventos/RSVP ni sección Junta). Revisa si estás de acuerdo con el look
  resultante en las pantallas que el diseño no dibujaba (anuncios/moderación,
  parking cesiones, admin, normas, privacidad).
- **Tablón de 2 niveles** (principal rotativo + secundario) implementado según lo
  que acordamos.
- **Reciclaje**: contenido informativo genérico portado; revisa si quieres el
  texto exacto del legacy.
- El PDF de convocatoria y `setup-github.sh` están en `.gitignore`; **revisa el
  historial de git** antes de hacer el repo público (specs/11).

## 🧭 Dónde me quedé
- **PRODUCTO BASE COMPLETO Y VERIFICADO.** Frontend (22 pantallas) + backend
  (17 tablas, RLS, triggers, vistas, 3 edge functions) + tests (34) + build.
- Trabajo **sin commitear** (lo dejo para que revises `git status` primero).
- Siguiente sesión: wiring a Supabase (punto 1-2 de arriba) para datos reales.
