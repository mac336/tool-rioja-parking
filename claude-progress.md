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

## Pasada de uso · Tablón: sugerencias a 30 días + invitación cuando está vacío (rama `feat/tablon-sugerencias`) — v1.50.0

Dos peticiones del usuario (2026-09-06, front puro, sin BD/migraciones):
1. *"Quiero que para las sugerencias, una vez que pase más de 1 mes, las
   ocultes del tablón principal y que solo sean visibles desde el menú de
   Servicios → Sugerencias, donde los vecinos pueden seguir votando por
   ellas."*
2. *"Cuando no haya nada en el tablón, pon esta invitación a sugerir algo"*
   (maqueta: tarjeta lila con icono, titular, texto, botón y enlace).

**Commit 1** (`5f5b7ff`): extrae el filtro inline de `HomePage.tsx` a
`src/features/mensajes/actividadTablon.ts` (`esActividadDeTablon`,
`fechaActividad`, `DIAS_SUGERENCIA_EN_TABLON = 30`) e implementa la regla
nueva: sugerencia visible en el tablón de Inicio solo ≤30 días naturales desde
su fecha de actividad (created_at o, si es más tarde, updated_at — al editar
"resucita"). Incidencia/aviso/anuncio sin cambio de comportamiento. 14 tests
unitarios. Comprobado: `SugerenciasPage.tsx` (Servicios → Sugerencias) ya
tenía su propio filtro por tipo, sin límite de antigüedad — no compartía
código con este filtro, no hizo falta separar nada.

**Commit 2** (`f78c087`): `TablonGadget.tsx` sustituye el "No hay novedades…"
por `InvitacionSugerir` (fondo `#F1ECFB`, borde discontinuo `#B79BEA`, sin
`shadow-neu*`): icono `Lightbulb`, titular, texto, botón píldora "Escribir una
sugerencia" (≥44px, solo si `!esTester(rol)` — ver nota de diseño en
`specs/16` sobre por qué NO se usa `publicar_sugerencia`/`tiposQuePublica`) y
enlace "Ver sugerencias de vecinos ›". El botón navega a
`/buzon?publicar=sugerencia`; `PublicarPanel.tsx` ahora lee ese query param
(`useSearchParams`) para abrir el formulario ya en tipo Sugerencia y lo limpia
tras abrir. e2e: `tests/e2e/sugerencias-invitacion.spec.ts` (8 casos; vacía el
tablón borrando los 3 mensajes sembrados del mock desde Servicios → Mensajes
como `app_admin` — acción real de la app, no datos falsos) + captura
`home-tablon-vacio-movil.png` revisada a mano (se parece a la maqueta, cabe en
390×844 sin cortar "Servicios").

**Commit 3** (release): `specs/16-modulo-mensajes-y-tablon.md` (regla de 30
días + sección "Tablón vacío: invitación a sugerir") y `specs/10` (referencia
al estado vacío actualizada), `CHANGELOG.md` + `package.json` → **1.50.0**,
este fichero.

### Verificado en esta pasada

```bash
cd /mnt/c/personal/tool-rioja-parking
npx tsc --noEmit                          # limpio
npx vitest run                            # 114 tests, todo verde (14 nuevos)
npx vite build                            # sin .map en dist/
CAPTURAS_DIR=<ruta> npx playwright test   # 29 pasan / 3 skip (por diseño, ajenos a esta pasada)
```

Sin migraciones ni cambios de servidor: esta pasada es **solo front**.

### Pendiente (cierre de bloque, lo hace el orquestador)

- `npm audit` + revisión OWASP de la superficie nueva (mínima: un query param
  de solo lectura en cliente, sin dato sensible ni escritura nueva en BD).
- `design-reviewer` sobre la captura `home-tablon-vacio-movil.png` (y
  home-movil.png de regresión, sin cambios).
- Hueco anotado en `40-tests.md` (harness): el selector "DEMO · ver como rol"
  no incluye `tester`, así que no hay e2e que confirme que el tester NO ve el
  botón "Escribir una sugerencia" (solo el enlace). Verificación manual o
  ampliar el selector demo en un incremento posterior.
- Marcar `passes:true` vía `scripts/feature_list.py`, actualizar
  `checkpoint.md` / journal del harness, PWA válida (lighthouse).

## Evolutivo 2 · Suspender la cesión de plaza de parking (rama `feat/parking-suspender-cesiones`, specs/08 Parte 2) — v1.51.0

Petición del usuario (2026-09-06): *"el ceder plaza no está funcionando, vamos
a desaparecerlo un tiempo"*. Gate resuelto en `70-impact-2.md` (harness):
salida **A · encaje limpio** — apagar la Parte 2 **entera** de `specs/08`
(cedo mi plaza / no la necesito / necesito plaza + panel de demanda +
reasignación por gestión), con constante de código `CESIONES_ACTIVAS = false`
(vía b) **+** bloqueo en servidor (`revoke insert, update` a `authenticated`).
La Parte 1 (rotación) no se toca ni una línea. Diagnóstico completo de por qué
la función nunca llegó a usarse (0 filas en producción, 0 filas en
`audit_log`, el circuito nunca cerró: quien recibe una plaza reasignada no lo
ve en ninguna pantalla ni recibe aviso) en `70-impact-2.md §9` — **no se
arregla ahora**, queda registrado como deuda de diseño para cuando se
reactive.

**Commit 1** (`809dd99`): `export const CESIONES_ACTIVAS = false` en
`src/features/parking/ParkingPage.tsx` (no en `src/lib/parking.ts`: ese
módulo es cálculo puro de rotación, sin BD ni UI, y solo lo consume
ParkingPage — el interruptor vive donde se consume). Las 4 secciones de la
Parte 2 (¿Cedes o necesitas plaza?, Demanda actual, Mis avisos de plaza,
Reasignar huecos) quedan envueltas en un único `{CESIONES_ACTIVAS && (...)}`,
sin huecos ni separadores sueltos; dejan de lanzarse las 3 consultas
asociadas (`demandaParking`, `misCesiones`, `cesionesActivas`). Código
conservado y marcado `SUSPENDIDO 2026-09-06` en `ParkingPage.tsx`,
`src/lib/db/parking.ts` (6 funciones) y `apiMock.ts` — nada se borra.
`roles.ts`: nota en el comentario del tester. Test negativo en
`tests/render.test.tsx` (confirmado a mano: rompe si se pone
`CESIONES_ACTIVAS = true`, verde de vuelta a `false`).

**Commit 2** (`427b34f`): migración `0059_suspender_cesiones.sql`
(`revoke insert, update on parking_cesiones from authenticated`, idempotente,
cabecera con el `grant` exacto de reactivación), aplicada en LOCAL y
registrada en `schema_migrations`. Se conservan `select`/`delete`, todas las
policies `ces_*`, el trigger de auditoría y el cron `purgar_cesiones`.
Bloque 17 de `tests/rls/rls_test.sql` (antes MEDIO 2) reescrito: un vecino no
inserta ni actualiza, la gestión tampoco (el revoke es sobre el rol de BD
`authenticated`), `select` sigue permitido, `anon` sigue sin nada.

**Hallazgo aparte, sin relación con este evolutivo** (`3863389`): al correr
`run-rls-tests.sh` para verificar, la suite ya fallaba en el bloque CAL
(calendario) en `main` sin tocar nada de parking — el literal "14 festivos
sembrados" quedó roto desde que se fusionó la mig. 0058 (festivos nacionales
de 2027, +9 filas permanentes: 14+9=23). Corregido el literal en 2 puntos,
commit propio, sin tocar nada de calendario/festivos en sí.

**Commit 3** (release): specs/08 (Parte 2 marcada **SUSPENDIDA 2026-09-06**,
con motivo, alcance y cómo reactivar — no se borra), specs/04 (nota en
`parking_cesiones`), specs/15 (§Parking–cesiones suspendida), specs/01,
specs/12 y specs/README (coletilla "(suspendido 2026-09-06)"), `CLAUDE.md`
del repo (§Estado y decisiones vigentes), `CHANGELOG.md` + `package.json` →
**v1.51.0**, este fichero. Nuevo e2e `tests/e2e/parking-suspendido.spec.ts`
(vecino: rotación visible + Parte 2 ausente + captura `parking-movil.png`;
gestión/presidente: regresión de que tampoco ve "Reasignar huecos").

### Verificado en esta pasada

```bash
cd /mnt/c/personal/tool-rioja-parking
npx tsc --noEmit                          # limpio
npx vitest run                            # 102 pasan / 8 skip (incluye los 12 de rotación intactos)
bash scripts/run-rls-tests.sh             # ✅ TODOS LOS TESTS DE RLS PASARON
npx vite build                            # sin .map en dist/
CAPTURAS_DIR=<ruta> npx playwright test   # 33 pasan / 3 skip (por diseño, ajenos a esta pasada)
```

Captura `parking-movil.png` revisada a mano: sin huecos, títulos vacíos ni
separadores sueltos; la pantalla queda solo con la rotación (hero de la
quincena actual, "Mis próximos turnos" y la tabla de 6 plazas).

### Pendiente (cierre de bloque, lo hace el orquestador)

- Aplicar la migración 0059 en **PRODUCCIÓN** (revoke; `parking_cesiones`
  tiene 0 filas, sin riesgo de datos).
- `npm audit` + revisión OWASP de la superficie (esta pasada **reduce**
  superficie: menos endpoints escribibles, menos JS en el bundle).
- `design-reviewer` sobre `parking-movil.png` (y regresión de Home/Calendario,
  sin cambios).
- Marcar `passes:true` de las features afectadas vía `scripts/feature_list.py`,
  actualizar `checkpoint.md` / journal del harness, PWA válida (lighthouse).
- Deuda de diseño registrada en `70-impact-2.md §9` (H1–H5): si algún día se
  reactiva la cesión, revisar ese diagnóstico ANTES — no es solo un
  interruptor.
