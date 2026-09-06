# claude-progress — Rioja 25 (tool-rioja-parking)

> Progreso de implementación por evolutivo. El estado del caso (specs, gates,
> journal) vive en `/mnt/c/personal/apps-harness/projects/tool-rioja-parking/`;
> este fichero es el resumen técnico del propio repo, para retomar en frío.

## Evolutivo 1 · Calendario (rama `feat/calendario`, specs/21) — v1.49.0

Petición: ocupar el hueco de Servicios con un Calendario en modo lista
(festivos de Madrid + fechas de la comunidad) + un recordatorio en la Home.
Fuente de la verdad: `specs/21-modulo-calendario.md` (estado: **implementado en
v1.49.0**; escenarios C1..C26).

**Pasada 1 de 2**: refactor de la Home + BD + capa de datos + mock.
**Pasada 2 de 2** (esta): pantalla `/calendario`, celda "Calendario" real en
Servicios, recordatorio cableado en `HomePage.tsx`, e2e en verde + capturas,
release v1.49.0. **Implementación de código COMPLETA** — falta el cierre de
bloque (aplicar la migración en producción, re-auditoría, design-review,
`passes:true`, push), que hace el orquestador.

### Hecho (pasada 1 — commits `4786e6e`, `21e884e`, `4698eb8`)

- **Bloque A — refactor D1** (sin cambio visual): `gadgetsHome.ts`
  (`seleccionarGadgets`, `diasEntre`, `textoDia`, `esPasado`,
  `recordatorioCalendario`, todas con test), `GadgetContextual.tsx` (markup
  único de la tarjeta contextual), `src/types/index.ts` (`TipoEvento`,
  `EventoCalendario`).
- **Bloque B — BD y datos**: `supabase/migrations/0056_calendario.sql` (tabla
  `calendario_eventos` + constraints + índices + trigger `updated_at` + grants
  + RLS `cal_sel/cal_ins/cal_upd/cal_del` + permiso `gestionar_calendario`
  sembrado + 14 festivos de Madrid 2026 con fuente oficial), aplicada en LOCAL
  por psql y registrada en `schema_migrations`. **Pendiente aplicarla en
  PRODUCCIÓN** (vía Management API; la aplica el orquestador al cierre del
  bloque, tras la re-auditoría §7.12). `roles.ts` (permiso + `DEFAULTS` +
  `puedeGestionarCalendario`), `cache.ts` (`TTL.calendario`),
  `src/lib/db/calendario.ts` + `api.ts`/`apiSupabase.ts` (`listEventos`,
  `crearEvento`, `editarEvento`, `borrarEvento`), `apiMock.ts` (3 festivos +
  "Cierre de la piscina").

### Hecho (pasada 2 — commits `efaf4e6`, `7eb8b76`, `ac8f8d3`, y este de release)

- **Commit 1** (`efaf4e6`): `src/features/calendario/CalendarioPage.tsx`
  (lista "Próximos" agrupada por mes + "Pasados (este año)" plegada; fila con
  día/título/píldora de tipo/rango/nota/fuente + Editar/Borrar con permiso;
  hoja modal crear/editar patrón Sugerencias; aviso de festivos pendientes de
  publicación por año a la vista). `src/router.tsx` (`/calendario`, sin guard).
  8ª celda "Calendario" en `servicios` de `HomePage.tsx` (`CalendarRange`,
  `#D06A5A`, sin flag `solo*`).
- **Commit 2** (`7eb8b76`): `HomePage.tsx` carga `listEventos` (misma
  key/TTL que `/calendario`), calcula `recordatorioCalendario(eventos, hoy)` y
  lo añade como candidato `calendario` (prioridad 3) a `seleccionarGadgets`
  (cupo 2: parking > reserva > calendario). Icono `CalendarRange` (comunidad)
  / `PartyPopper` (festivo), gradiente terracota.
- **Commit 3** (`ac8f8d3`, `fix(e2e)`): arreglados `tests/e2e/calendario.spec.ts`
  / `captura.spec.ts` / `helpers.ts` — el rol de "ver como" vive en memoria del
  mock (`currentUser` de `apiMock.ts`); `page.goto()` hace una recarga completa
  del documento que lo reseteaba a `vecino` justo antes de que se pintara
  `/calendario`, así que el botón "Nueva" nunca aparecía para presidente/junta
  en los tests. Nuevo helper `irACalendarioSinRecargar()` navega por clic
  (Inicio → celda Calendario) en vez de `page.goto`. Playwright: **19 passed, 1
  skipped** (C23 solo aplica en móvil) — capturas en
  `apps-harness/projects/tool-rioja-parking/screenshots/`
  (`home-{movil,escritorio}.png`, `calendario-{movil,escritorio}.png`,
  `calendario-nueva-{movil,escritorio}.png`).
- **Commit 4** (release): `package.json` → `1.49.0`; `CHANGELOG.md` nueva
  sección `## 2026-09-05`; `specs/21-modulo-calendario.md` → estado
  "implementado en v1.49.0" + corregido el icono de la píldora comunidad en la
  fila (`CalendarRange`, no `CalendarDays`: la sección "Fila" del documento no
  se había actualizado tras la decisión resuelta por el orquestador). `npx vite
  build` sin errores y sin `.map` en `dist/`.

### Verificado en esta pasada

```bash
cd /mnt/c/personal/tool-rioja-parking
npx tsc --noEmit                                  # limpio
npx vitest run                                    # 77/77 (calendario 39, parking 12, render 26)
npx vite build                                    # OK, sin .map en dist/
CAPTURAS_DIR=<ruta> npx playwright test           # 19 passed, 1 skipped
```

### Pendiente (cierre de bloque, lo hace el orquestador)

- Aplicar `0056_calendario.sql` en **PRODUCCIÓN** (Management API; ver nota de
  memoria "Supabase CLI sin privilegios en esta máquina" — por SQL Editor del
  dashboard si el CLI no tiene privilegios en la nube).
- Re-auditoría OWASP / `npm audit` del bloque completo (§7.11-12): superficie
  nueva = 1 tabla + 1 permiso, sin Edge/push/Storage/anon/dependencias nuevas.
- `design-reviewer` sobre las capturas de
  `apps-harness/projects/tool-rioja-parking/screenshots/` (§7.15).
- Marcar `passes:true` de las features de este bloque en `31-feature-list.json`
  (solo vía `scripts/feature_list.py`), actualizar `checkpoint.md` /
  `97-resume` / journal del harness, comprobar PWA válida (lighthouse).
- El **push** y cualquier despliegue lo dispara el usuario con el runbook
  (§7.4); el harness no hace push.

NUNCA `supabase db reset` ni `npm run db:test` en este repo: la migración
`0007_incidencias_moderacion` no es transaccional (`alter type … add value` +
uso en la misma transacción → 55P04) y el reset deja la BD local rota. Las
migraciones se aplican por `psql` fichero a fichero (ver `CLAUDE.md` del repo).

## Evolutivo 1 · Calendario — remediación del design-review (NO APTO → cierre)

`design-reviewer` dio **NO APTO** (1 ROTO + 4 POBRE + 3 DETALLE,
`49-design-review.md`). Commits en `feat/calendario`, en este orden:

- **`1531354` / `1ac56f7`** — `fix(ui)`: H1 (ROTO). `.safe-top` pisaba el
  `padding-top` de `SubHeader` → «Nueva» y el ‹ atrás a 0px del borde en
  cualquier dispositivo sin inset (Android, escritorio, iPhone en pestaña).
  `SubHeader` gana `min-h-[62px]` + `items-center` (como `ScreenHeader`) **sin
  padding vertical propio** (el primer intento con `py-2` seguía asimétrico:
  medido `box('Nueva').y = 3.5px`, bajo el mínimo 6px). NO se tocó `.safe-top`
  ni `TabBar` (afectaría a toda la app).
- **`1a60c71`** — `fix(calendario)`: H2 (dos píldoras Editar/Borrar de 46px a
  ancho completo, ~1/3 de la fila) + H6 (píldora de tipo saltaba de línea).
  Ahora iconos compactos (`aria-label`, 44×44, sin `shadow-neu`) a la derecha
  de la cabecera de fila, y la píldora de tipo en línea propia bajo el título.
- **`0de3991`** — `fix(calendario)`: H3 (la fuente del decreto se repetía bajo
  cada uno de los 14 festivos/año, con «consultado AAAA-MM-DD» de trazabilidad
  visible al vecino). Ahora una nota al pie de «Próximos», una vez por año y
  por fuente distinta, sin «consultado» (ese campo sigue completo en la BD y
  en la hoja de edición). `specs/21` § Fila / § Hoja modal actualizadas.
- **`9186474`** — `test(e2e)`: H8a (`locale: 'es-ES'` + `timezoneId:
  'Europe/Madrid'` en `playwright.config.ts`, capturas fieles). Aserciones de
  geometría nuevas que habrían pillado H1 (`y >= 6`, centroY a ≤2px del centro
  de la cabecera, para «Nueva» y ‹ atrás) y H2 (acciones ≥44×44, fila de
  festivo con permiso ≤120px alto en móvil). Capturas nuevas:
  `calendario-vecino-movil.png`, `calendario-editar-movil.png`.

**Deuda registrada, NO tocada en este cierre** (primitivos compartidos por
toda la app; entran por `impact-analyst`): H4 (`Card`/`Button` con
`shadow-neu*` contradicen el diseño plano de `specs/18`), H5 (dos «Nueva»
distintos entre Sugerencias y Calendario), H7 (`safe-bottom` en la hoja modal
+ `HojaModal` compartida). Pendiente del orquestador registrarlas en
`DEBT.md`.

**Hueco sin cerrar**: `calendario-pasados-movil.png` no se capturó — el mock
no tiene ningún evento pasado del año en curso; no se inventan datos (§7.17).

**Limitación del entorno de test (no del código)**: el widget nativo `<input
type="date">` sigue mostrando `mm/dd/yyyy` en este sandbox pese al `locale`
del contexto de Playwright — falta la locale `es_ES` a nivel de sistema
operativo (`locale -a` no la lista) y `--lang=es` en `launchOptions` tampoco lo
cambió. El resto de fechas de la app (`Intl.DateTimeFormat('es-ES', …)` en
`CalendarioPage.tsx`, `HomePage.tsx`, etc.) ya salían y siguen saliendo en
español; en un dispositivo real (con locale del SO correcta) el date picker
nativo también se verá en `dd/mm/aaaa`.

Verificación final de este cierre: `npx tsc --noEmit` limpio, `npx vitest run`
77/77, `npx vite build` sin `.map`, `npx playwright test` → **21 passed, 3
skipped** (2 intencionados por proyecto — capturas solo-móvil — + el scroll de
Servicios que solo aplica en móvil).

Pendiente del orquestador: relanzar `design-reviewer` sobre las capturas
regeneradas, decidir `passes:true` vía `scripts/feature_list.py`, `npm audit` +
revisión OWASP del bloque si no se hizo ya, y el resto del cierre de bloque
(aplicar migración en producción si procede, PWA/lighthouse, `checkpoint.md`).

## Pasada de uso · Calendario: purga automática de festivos pasados (rama `feat/calendario-purga`) — v1.49.1

Petición del usuario (2026-09-06, en producción): *"No quiero fechas antiguas.
Quiero que si ya pasó el festivo lo borres directamente. Si es de la comunidad
sí se pueden quedar las fechas."* El usuario ya había borrado a mano en
producción los 8 festivos de 2026 ya pasados (ene-ago); quedan 6 futuros + 1
evento de comunidad («Cierre de la piscina», 13-09-2026).

**Commit 1** (`dec66db`): `supabase/migrations/0057_purgar_festivos_pasados.sql`
— función `purgar_festivos_pasados()` (mismo patrón que `purgar_cesiones`/0030:
SQL `security definer set search_path=public`, `revoke execute` de
público/anon/authenticated) que borra `tipo='festivo'` con
`coalesce(fecha_fin, fecha) < (now() at time zone 'Europe/Madrid')::date`; job
de `pg_cron` diario a las 03:25, reprogramable sin duplicar. Aplicada en LOCAL
por psql y registrada en `schema_migrations`. Probada a mano **dentro de una
transacción con `rollback`** (para no invalidar el seed de 14 festivos que
asume `rls_test.sql`): antes 14 festivo/2 comunidad → la función borra 8 →
después 6 festivo/2 comunidad; comunidad intacta. **Pendiente aplicarla en
PRODUCCIÓN** (la aplica el orquestador).

**Commit 2** (`ce17fc4`): `src/features/home/gadgetsHome.ts` —
`particionarEventos(eventos, hoy)` reparte en `{ proximos, pasados }`
descartando SIEMPRE los festivos pasados (defensa de cliente para que el
efecto se note antes de que corra el cron). `src/features/calendario/
CalendarioPage.tsx` usa esta partición: «Pasados (este año)» solo lista
comunidad y no se pinta si queda vacía. `recordatorioCalendario()` no se tocó:
ya solo consideraba festivos con `fecha = hoy`.

**Commit 3** (siguiente): `tests/calendario.test.ts` (+6 tests
`particionarEventos`, C27/C28 y casos de borde), `tests/rls/rls_test.sql`
(bloque CAL, punto 9: purga en transacción propia con `rollback`, fixtures
`__cal viejo__`/`__cal viejo com__`), `specs/21-modulo-calendario.md` (tabla de
costuras + § Pantalla `/calendario` + C27/C28 + código previsto), `CHANGELOG.md`
+ `package.json` → **1.49.1**.

### Verificado en esta pasada

```bash
cd /mnt/c/personal/tool-rioja-parking
npx tsc --noEmit                    # limpio
npx vitest run                      # todo verde (calendario 45 tests)
bash scripts/run-rls-tests.sh       # TODOS LOS TESTS DE RLS PASARON (repetido 3 veces: idempotente)
npx vite build                      # sin .map en dist/
CAPTURAS_DIR=<ruta> npx playwright test   # ver resultado abajo
```

### Pendiente (cierre de bloque, lo hace el orquestador)

- Aplicar `0057_purgar_festivos_pasados.sql` en **PRODUCCIÓN** (Management API
  / SQL Editor, ver nota de memoria "Supabase CLI sin privilegios").
- `npm audit` + revisión OWASP de la superficie nueva (mínima: una función
  `security definer` sin grant a clientes + un cron job).
- `design-reviewer` sobre capturas de `/calendario` con la sección «Pasados»
  cambiada (solo comunidad).
- Marcar `passes:true` vía `scripts/feature_list.py`, actualizar
  `checkpoint.md` / journal del harness, PWA válida (lighthouse).
