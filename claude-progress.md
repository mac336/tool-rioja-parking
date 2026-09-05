# claude-progress — Rioja 25 (tool-rioja-parking)

> Progreso de implementación por evolutivo. El estado del caso (specs, gates,
> journal) vive en `/mnt/c/personal/apps-harness/projects/tool-rioja-parking/`;
> este fichero es el resumen técnico del propio repo, para retomar en frío.

## Evolutivo 1 · Calendario (rama `feat/calendario`, specs/21)

Petición: ocupar el hueco de Servicios con un Calendario en modo lista
(festivos de Madrid + fechas de la comunidad) + un recordatorio en la Home.
Fuente de la verdad: `specs/21-modulo-calendario.md` (escenarios C1..C26).

**Pasada 1 de 2** (esta): refactor de la Home + BD + capa de datos + mock.
**Pasada 2** (pendiente): pantalla `/calendario`, celda "Calendario" real en
Servicios, y el recordatorio cableado en `HomePage.tsx`.

### Hecho (pasada 1)

- **Bloque A — refactor D1** (commit `4786e6e`, sin cambio visual):
  - `src/features/home/gadgetsHome.ts`: `seleccionarGadgets`, `diasEntre`,
    `textoDia`, `esPasado`, `recordatorioCalendario` (puro, con test).
  - `src/features/home/GadgetContextual.tsx`: markup único de la tarjeta
    contextual (antes duplicado entre parking y reserva).
  - `HomePage.tsx`: parking/reserva ahora usan `GadgetContextual`; el bloque
    contextual se calcula con `seleccionarGadgets([parking, reserva], 2)`
    (calendario se añadirá a ese mismo array en la pasada 2, prioridad 3).
  - `src/types/index.ts`: `TipoEvento`, `EventoCalendario`.
- **Bloque B — BD y datos**:
  - `supabase/migrations/0056_calendario.sql` (commit `21e884e`): tabla
    `calendario_eventos` + constraints + índices (incl. único parcial de
    festivos) + trigger `updated_at` (reutiliza `set_updated_at()` de 0002) +
    grants explícitos + RLS (`cal_sel/cal_ins/cal_upd/cal_del`) + permiso
    `gestionar_calendario` sembrado (presidente/vicepresidente/
    administrador_finca/junta) + 14 festivos de Madrid 2026 con fuente oficial.
    Aplicada en LOCAL por psql y registrada en `schema_migrations`.
    **Pendiente aplicarla en PRODUCCIÓN** (vía Management API, la aplica el
    orquestador al cierre del bloque, tras la re-auditoría §7.12).
  - `src/lib/roles.ts`: permiso `gestionar_calendario` (grupo «Calendario»),
    `DEFAULTS.gestionar_calendario = GESTION` (coincide con la semilla SQL),
    helper `puedeGestionarCalendario(rol)`.
  - `src/lib/cache.ts`: `TTL.calendario = 600_000`.
  - `src/lib/db/calendario.ts` + `api.ts`/`apiSupabase.ts`: `listEventos`,
    `crearEvento`, `editarEvento`, `borrarEvento` (created_by = auth.uid() al
    crear; `cacheBust('calendario')` en las 3 escrituras).
  - `src/lib/apiMock.ts`: `db.eventos` con 3 festivos reales de 2026 + "Cierre
    de la piscina" (comunidad, relativo a hoy) y las mismas 4 funciones.

### Falta (pasada 2)

- `src/features/calendario/CalendarioPage.tsx` + `src/router.tsx` (`/calendario`).
- Celda "Calendario" (8ª) en `servicios` de `HomePage.tsx` (icono
  `CalendarRange`, color `#D06A5A`, sin flag `solo*`).
- Cablear el candidato `calendario` (prioridad 3) en
  `seleccionarGadgets([parking, reserva, calendario], 2)` de `HomePage.tsx`,
  usando `recordatorioCalendario(eventos, hoy)`.
- `render.test.tsx` pasará a verde en cuanto exista `CalendarioPage` (hoy falla
  ahí a propósito: import inexistente, rojo esperado de TDD).
- Aplicar 0056 en producción + re-auditoría OWASP/§7.12 del bloque completo +
  capturas del cierre + `passes:true` en `31-feature-list.json`.

### Cómo verificar (mientras no exista `/calendario`)

```bash
cd /mnt/c/personal/tool-rioja-parking
npx tsc --noEmit                       # 1 error esperado: CalendarioPage inexistente
npx vitest run tests/calendario.test.ts tests/parking.test.ts   # verdes
bash scripts/run-rls-tests.sh          # TODOS LOS TESTS DE RLS PASARON (incl. bloque CAL)
```

NUNCA `supabase db reset` ni `npm run db:test` en este repo: la migración
`0007_incidencias_moderacion` no es transaccional (`alter type … add value` +
uso en la misma transacción → 55P04) y el reset deja la BD local rota. Las
migraciones se aplican por `psql` fichero a fichero (ver `CLAUDE.md` del repo).
