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
