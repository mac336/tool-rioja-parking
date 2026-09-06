# 21 · Módulo Calendario (festivos de Madrid + fechas de la comunidad)

> Estado: **implementado en v1.49.0** (2026-09-05, rama `feat/calendario`).
> Describe el comportamiento **actual**. Migración: **0056**. Origen del gate:
> `70-impact-1.md` + `11-decisiones.md` del harness (decisiones del usuario del
> 2026-09-05). **Todo es aditivo**: no cambia ningún endpoint, tabla, ruta ni
> DTO ya expuesto.

## Objetivo y alcance

Petición del usuario (resumida): **ocupar el hueco libre de Servicios** con un
**Calendario en modo lista** que muestre los **días no laborables de Madrid
capital** (los añade el harness por su cuenta, con fuente oficial) y las
**fechas importantes de la comunidad** (p. ej. cierre de la piscina, junta),
con botón **«Nueva»** visible **solo** para administradores, junta y el
developer; y en la **Home**, **solo si sobra espacio** en el bloque de gadgets
contextuales, un **recordatorio**: eventos de comunidad **desde una semana antes**
y festivos **solo el día**, diciendo qué se festeja.

Este módulo **absorbe la promesa de `specs/01`** («sección Junta: la lógica de
recordatorio puede recuperarse más adelante»): la **fecha de la Junta** es un
evento de comunidad más y su recordatorio sale en la Home. La exportación a
calendario personal (**.ics**) del portal viejo **no se implementa** ahora
(ver «Fuera de alcance»).

Sin hora: los eventos son de **día completo** (`date`, día natural
Europe/Madrid, `specs/02`), con fecha de fin opcional para los que duran varios
días.

## Quién ve / quién gestiona

| Rol | Ve `/calendario` y el recordatorio | Crea / edita / borra |
|---|---|---|
| app_admin | sí | sí (SUPERADMIN, implícito) |
| presidente, vicepresidente, administrador_finca, junta | sí | **sí por defecto** (`gestionar_calendario`) |
| conserje | sí | **no por defecto** (configurable) |
| vecino, inquilino | sí (solo lectura) | no |
| tester | sí (solo lectura) | **nunca** (`es_tester()` en RLS, aunque se le diera el permiso) |
| cuenta `suspendido` / `baja` / anon | **no** (`es_activo()`; anon sin grant) | no |

- Ver el calendario **no requiere permiso**: los festivos son de interés general
  → lo lee **cualquier cuenta activa**, sin flag `solo*` en Servicios.
- Gestionar = permiso **`gestionar_calendario`** (nuevo, mig. 0056), grupo
  **«Calendario»** de `GRUPOS_PERMISOS` → el editor **Panel → Permisos** lo
  pinta sin cambios de UI; el app_admin lo reparte sin desplegar (`specs/03`).
  Semilla SQL y `DEFAULTS` de `roles.ts` deben **coincidir** (como 0041/0044).
- **Sin vía «el autor edita lo suyo»**: quien pierde el permiso deja de editar
  también lo que creó (coherente con `mensajes`, 0040). «Ver como vecino»
  oculta el botón sin más código (la matriz se recalcula en `store.verComo`).
- Helper cliente: `puedeGestionarCalendario(rol)` =
  `!esTester(rol) && tienePermiso(rol, 'gestionar_calendario')`. Es **UX**: la
  barrera real es la RLS.

## Modelo de datos — `calendario_eventos` (mig. 0056)

Tabla **nueva, sin hijos** (`grep "references calendario_eventos"` → 0).
Tabla, constraints, índices, trigger, **grants y RLS en la misma migración**
(§7.11), permiso sembrado y festivos 2026 sembrados. Idempotente (`if not
exists`, `on conflict do nothing`, `drop policy if exists`).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| tipo | text **check** (`tipo in ('festivo','comunidad')`) | **NO enum**: `alter type … add value` + uso en la misma transacción da **55P04** y ya rompió un `db reset` (0054). `text check` se amplía sin ese riesgo |
| titulo | text | `check (char_length(titulo) between 1 and 100)` |
| nota | text null | `check (nota is null or char_length(nota) <= 500)` |
| fecha | date | día natural Madrid. `check (fecha >= date '2020-01-01')` |
| fecha_fin | date null | `check (fecha_fin is null or fecha_fin >= fecha)` y `check (fecha_fin is null or fecha_fin - fecha <= 366)` |
| fuente | text null | origen oficial (festivos): boletín, nº, fecha, fecha de consulta |
| created_by | uuid null → `profiles(id)` **on delete set null** | null en filas sembradas por migración |
| created_at | timestamptz default now() | |
| updated_at | timestamptz default now() | trigger `set_updated_at` (patrón 0042) |

**Índices:** `(fecha)`; **único parcial** `(fecha, titulo) where tipo = 'festivo'`
→ el seed es idempotente con `on conflict do nothing` y no hay festivos
duplicados. Los eventos de `comunidad` **sí** pueden repetir día y título.

**Grants explícitos** (lección 0055: «no heredes privilegios, concédelos»):
```sql
revoke all on calendario_eventos from anon, authenticated;
grant select, insert, update, delete on calendario_eventos to authenticated;
grant all on calendario_eventos to service_role;
-- nada a anon: la anon key no lee el calendario
```

**RLS** (activa y forzada; helpers de 0003/0010/0021):
```sql
cal_sel  for select using (es_activo());
cal_ins  for insert with check (es_activo() and not es_tester()
           and tiene_permiso('gestionar_calendario') and created_by = auth.uid());
cal_upd  for update using (es_activo() and not es_tester() and tiene_permiso('gestionar_calendario'))
                    with check (es_activo() and not es_tester() and tiene_permiso('gestionar_calendario'));
cal_del  for delete using (es_activo() and not es_tester() and tiene_permiso('gestionar_calendario'));
```
`created_by = auth.uid()` impide suplantar autor. No hace falta helper nombrado
(`puede_gestionar_calendario()`): `tiene_permiso` lee `role_permissions` en vivo.
Trigger de saneado (tipo 0054) **no hace falta**: quien escribe tiene el permiso.

**Permiso sembrado:** `insert into role_permissions (rol, permiso) values
('presidente','gestionar_calendario'), ('vicepresidente',…), ('administrador_finca',…),
('junta',…) on conflict do nothing`. app_admin implícito (SUPERADMIN); conserje
**no**; tester **no**.

**Contenido de la tabla:** datos públicos (festivos) y avisos de la comunidad.
**Ningún dato personal** (solo el uuid del autor, que se pierde al borrar la
cuenta). El repo es público: sembrar festivos en la migración es correcto.

## Ciclo de vida y relaciones (AGENTS.md §7.17)

**Sin columna `estado`.** Existencia = crear / editar / **borrar físico** (hard
delete, como `borrarMensaje`). «Pasado» es **derivado**: `coalesce(fecha_fin,
fecha) < hoy` con `hoy = claveDia(ahora)` en Europe/Madrid.

**Purga automática de festivos pasados** (mig. 0057, decisión del usuario
2026-09-06: *"No quiero fechas antiguas. Quiero que si ya pasó el festivo lo
borres directamente. Si es de la comunidad sí se pueden quedar las fechas."*):
`purgar_festivos_pasados()` (mismo patrón que `purgar_cesiones`/0030) borra
`from calendario_eventos where tipo='festivo' and coalesce(fecha_fin, fecha) <
(now() at time zone 'Europe/Madrid')::date`, con job de `pg_cron` diario a las
03:25. Los eventos `comunidad` **nunca** se tocan: se conservan como histórico
en «Pasados (este año)» indefinidamente. En una BD **nueva**, el seed de 0056
inserta los 14 festivos (incluidos los ya pasados según la fecha del momento)
y la purga los limpia en su primera pasada del cron — comportamiento aceptado,
no es un bug.

| Costura | Al… | Decisión | Test de la costura |
|---|---|---|---|
| `created_by → profiles(id)` | eliminar **definitivamente** la cuenta creadora (`gestionar-usuario` `eliminar`, `specs/03`) | **CONSERVAR** el evento, `on delete set null` (son hechos de la comunidad, no del autor; una FK sin acción bloquearía limpiar testers) | RLS test: como postgres, borrar `auth.users` del creador → `count` igual y `created_by is null` |
| `profiles.estado` del creador = baja/suspendido | dar de baja / suspender | **Nada que tocar**: `es_activo()` le cierra la lectura; el evento sigue visible al resto | suspendido lee 0 filas |
| `role_permissions('gestionar_calendario')` | quitar el permiso a un rol | **CONSERVAR** eventos; solo cambia quién edita (efecto inmediato) | tras borrar la fila de `junta`, junta **no** inserta |
| Recordatorio de la Home | borrar / mover de fecha | **DERIVADO, sin fila**: se calcula al render desde `listEventos()`; `cacheBust('calendario')` al escribir → la Home refetchea. **No puede quedar huérfano** | unit: `recordatorioCalendario([], hoy) === null`; evento movido a +10 días → `null` |
| Campana `listAvisos` / push `notificar` | crear evento | **NO TOCAR** (no pedido; decisión explícita) | — |
| `viviendas` | — | **Sin relación**: los eventos son de toda la comunidad | — |
| Duplicados | dos eventos el mismo día | `comunidad`: permitidos; `festivo`: únicos por `(fecha, titulo)` | reinsertar seed → 0 filas nuevas |
| Histórico | ¿se listan los pasados? | «Próximos» desde hoy + «Pasados (este año)» **solo comunidad**, plegada | filtro de cliente en `particionarEventos()`: un festivo pasado no aparece en ninguna sección |
| Festivo que pasa | `coalesce(fecha_fin, fecha) < hoy` | **Se borra solo** (borrado físico) por `purgar_festivos_pasados()`, cron diario 03:25 (mig. 0057); comunidad se conserva | RLS: insertar festivo y comunidad pasados, `select purgar_festivos_pasados()` → festivo desaparece, comunidad sigue |

**Verificador de coherencia** (al final de `tests/rls/rls_test.sql`):
```sql
select assert_igual((select count(*) from calendario_eventos e
  left join profiles p on p.id = e.created_by
  where e.created_by is not null and p.id is null), 0, 'CAL: sin created_by huérfanos');
```

## Festivos sembrados (2026) y operativa anual

**Regla:** **no se siembra nada sin fuente oficial con fecha de consulta**
(AGENTS.md §7.7). Ámbito: **Madrid capital** = nacionales + Comunidad de Madrid
+ los 2 locales del municipio. Los que ya han pasado se siembran igual
(histórico del año). `created_by = null` (origen: migración).

Fuente autonómica y nacional: **Decreto 75/2025, de 24 de septiembre**, del
Consejo de Gobierno (fiestas laborales 2026 en la Comunidad de Madrid) —
**BOCM nº 229, 25-09-2025**
(<https://www.bocm.es/boletin/CM_Orden_BOCM/2025/09/25/BOCM-20250925-16.PDF>;
resumen en <https://www.comunidad.madrid/empleo/calendario-laboral-comunidad-madrid-municipios>).
Fuente local (municipio de Madrid): **BOCM nº 296, 12-12-2025**
(<https://www.bocm.es/boletin/CM_Orden_BOCM/2025/12/12/BOCM-20251212-34.PDF>)
y «Calendario oficial laboral y de días inhábiles y festivos 2026» de
<https://www.madrid.es/>. **Consultado el 2026-09-05.**

| Fecha | Día | `titulo` (denominación) | Ámbito | `fuente` |
|---|---|---|---|---|
| 2026-01-01 | jueves | Año Nuevo | nacional | A |
| 2026-01-06 | martes | Epifanía del Señor | nacional | A |
| 2026-04-02 | jueves | Jueves Santo | Comunidad de Madrid | A |
| 2026-04-03 | viernes | Viernes Santo | nacional | A |
| 2026-05-01 | viernes | Fiesta del Trabajo | nacional | A |
| 2026-05-02 | sábado | Fiesta de la Comunidad de Madrid | Comunidad de Madrid | A |
| 2026-05-15 | viernes | San Isidro Labrador | local Madrid | L |
| 2026-08-15 | sábado | Asunción de la Virgen | nacional | A |
| 2026-10-12 | lunes | Fiesta Nacional de España | nacional | A |
| 2026-11-02 | lunes | Todos los Santos (trasladado del domingo 1) | nacional (traslado CM) | A |
| 2026-11-09 | lunes | Nuestra Señora de la Almudena | local Madrid | L |
| 2026-12-07 | lunes | Día de la Constitución (trasladado del domingo 6) | nacional (traslado CM) | A |
| 2026-12-08 | martes | Inmaculada Concepción | nacional | A |
| 2026-12-25 | viernes | Natividad del Señor | nacional | A |

Texto **exacto** de la columna `fuente`:
- **A** → `Decreto 75/2025, de 24 de septiembre (BOCM nº 229, 25-09-2025) · consultado 2026-09-05`
- **L** → `Fiestas locales del municipio de Madrid (BOCM nº 296, 12-12-2025) · consultado 2026-09-05`

Los **traslados** (2-nov, 7-dic) se siembran con el nombre de la fiesta
trasladada; el recordatorio dice «Hoy es festivo: Todos los Santos (trasladado
del domingo 1)».

**2027: NO se siembra** (decisión del usuario 2026-09-05). A esa fecha no hay
fuente oficial: la Comunidad aprueba su decreto a finales de septiembre, el BOE
publica la relación conjunta en octubre-noviembre y el Ayuntamiento fija los 2
locales en diciembre. 2027 tiene colisiones con fin de semana (1-may sáb, 2-may
dom, 15-may sáb, 15-ago dom, 25-dic sáb) que el decreto resolverá con traslados
**no deducibles**. Nada de `⚠️ SUPUESTO` en datos sembrados.

**Operativa anual (cada otoño):** cuando BOCM/BOE publiquen el año siguiente,
**o** migración `00NN_festivos_AAAA.sql` (mismo formato: `on conflict do
nothing`, `fuente` con boletín y fecha de consulta), **o** alta desde la app con
el permiso (tipo `festivo`, campo `fuente` rellenado). Las dos vías dejan filas
equivalentes; la migración es la preferida por trazabilidad en el repo.

**Aviso de pendientes en la lista:** para cada año **a la vista** — el año en
curso, el año siguiente **si hoy ≥ 1 de octubre**, y cualquier año con eventos
de comunidad ya listados — si **no hay ninguna fila `festivo`** de ese año, la
lista muestra al final de «Próximos» una nota discreta: **«Festivos de AAAA:
pendientes de publicación oficial»** *(criterio de «a la vista»: decisión
spec-writer)*.

## Pantalla `/calendario`

- **Ruta** bajo el `Shell`, **sin guard** (lo ve todo activo; la RLS ya exige
  `es_activo()`). **8ª celda de Servicios** en la Home, `short: 'Calendario'`,
  **sin flag `solo*`** (visible para todos los roles). Icono del módulo:
  **`CalendarRange`** (Reservas ya usa `CalendarDays` en la misma rejilla y en
  «Tu reserva»; decisión orquestador 2026-09-05). Color del círculo `#D06A5A`
  (terracota; fijo por módulo como los demás).
- **Cabecera:** `SubHeader` con `titulo="Calendario"` y, a la derecha, botón
  **«Nueva»** **solo** con `puedeGestionarCalendario(rol)`.
- **Carga y error:** `SkeletonList` mientras carga; `ErrorState` si falla;
  `EmptyState` «Sin eventos próximos» si no hay nada.
- **Modo lista** (sin rejilla mensual):
  - Sección **«Próximos»**: eventos con `coalesce(fecha_fin, fecha) >= hoy`,
    ordenados por `fecha` asc (a igual fecha, comunidad antes que festivo, luego
    título), **agrupados por mes** con `SectionTitle` («Septiembre 2026»). Un
    evento en curso que empezó en un mes anterior se lista bajo su mes de
    inicio *(decisión spec-writer)*.
  - Sección **«Pasados (este año)»**: **plegada** por defecto (botón que la
    despliega); **solo eventos de comunidad** del año en curso ya pasados, del
    más reciente al más antiguo *(orden: decisión spec-writer)*. Años
    anteriores no se listan. Los **festivos pasados no aparecen aquí ni en
    ninguna otra sección**: se borran solos en servidor
    (`purgar_festivos_pasados()`, mig. 0057) y el cliente los filtra de la
    vista aunque el cron no haya corrido todavía (`particionarEventos()` en
    `gadgetsHome.ts`). Si tras el filtro no queda ningún pasado, la sección
    entera **no se pinta** (nada de una sección vacía).
  - **Fila** (`Card`): a la izquierda el **día** (número grande + día de la
    semana abreviado, «lun»); título; con permiso, **acciones compactas**
    **Editar**/**Borrar** (icono `Pencil`/`Trash2`, `aria-label="Editar/Borrar
    <título>"`, área pulsable ≥ 44×44 px, sin `shadow-neu`) alineadas a la
    derecha de la cabecera de la fila (una fila de festivo con permiso ≤ 120 px
    de alto en móvil). En **línea propia bajo el título** (posición estable:
    no cambia según el largo del título) el **distintivo de tipo** (píldora,
    `specs/18`: festivo → `bg-warn-soft text-warn-ink` + `PartyPopper`;
    comunidad → `bg-info-soft text-info-ink` + `CalendarRange`). Si tiene
    `fecha_fin` > `fecha`, rango «del 1 al 15 de septiembre» (mismo estilo que
    `rangoFechas`); la `nota`, si la hay, como texto secundario. **La `fuente`
    NO se repite por fila** (14 festivos al año con la misma cita bajo cada
    uno es ruido para el vecino): se agrupa una vez por fuente distinta al pie
    de la sección, ver abajo.
  - **Pie de «Próximos»**: si hay festivos visibles, una línea por año con la
    cita agrupando las **fuentes distintas** de esos festivos: «Festivos
    AAAA: `<fuente 1>` · `<fuente 2>`…» — sin el «consultado AAAA-MM-DD» (esa
    parte es trazabilidad de datos, no información para el vecino; el resto
    de la cita —decreto, BOCM, fecha de publicación— sí se conserva). Si no
    hay festivos en «Próximos», no se muestra nada.
  - Nota «Festivos de AAAA: pendientes de publicación oficial» (arriba).
- **Hoja modal** (patrón de `SugerenciasPage.tsx`: hoja inferior con
  `.app-viewport`, `max-h-full overflow-y-auto`; `specs/10`/`18`) para **crear y
  editar**, solo alcanzable con permiso:
  - **Título** (`Field`, obligatorio, ≤ 100, contador).
  - **Fecha** (obligatoria, `<input type="date">` **nativo**; sin librerías de
    calendario → `npm audit` sin cambios).
  - **Fecha fin** (opcional, `type="date"`, `min = fecha`).
  - **Nota** (`Textarea`, opcional, ≤ 500).
  - **Tipo** (`SelectField`: **Comunidad** por defecto / **Festivo**; el
    festivo manual sirve para años futuros aún sin migración).
  - **Fuente** (`Field`, solo visible si tipo = festivo; opcional; cita
    completa, con el «consultado AAAA-MM-DD» de trazabilidad — este campo solo
    lo ve quien gestiona; en la fila de la lista NO se repite, ver § Fila).
  - Acciones: **Guardar** / **Cancelar**; en edición además **Borrar** con
    **confirmación explícita**. Al guardar o borrar: `cacheBust('calendario')`,
    cierra la hoja y la lista se refresca.
- **Validación en cliente = UX** (mismos límites que la BD; `min` en fecha fin;
  `fecha ≥ 2020-01-01`; rango ≤ 366 días). **La de verdad es la de BD**: un
  error de constraint o de RLS se muestra con `Alert` en texto claro, no se
  traga.
- Texto libre lo escribe solo gestión; React escapa; **prohibido
  `dangerouslySetInnerHTML`**.

## Recordatorio en la Home (gadget contextual)

**Bloque contextual con cupo 2** (`specs/10`): candidatos en orden de prioridad
**parking > reserva > calendario**; se pintan los 2 primeros presentes. El
recordatorio de calendario **solo entra si parking o reserva dejan hueco**;
con parking y reserva a la vez, **no sale**. El **peor caso de altura de la
Home no cambia** (hoy ya son 2 tarjetas). El hero de encuesta queda fuera del
cupo. Un **solo** recordatorio de calendario a la vez.

Implementación (refactor D1, **commit propio previo y sin cambio visual**):
`src/features/home/GadgetContextual.tsx` (markup único de la tarjeta: parking y
reserva pasan a usarla con idénticos estilos) + `src/features/home/gadgetsHome.ts`
con las funciones puras **`seleccionarGadgets(candidatos, cupo = 2)`** y
**`recordatorioCalendario(eventos, hoy)`**, ambas con test unitario. Gradiente
del gadget de calendario: `linear-gradient(150deg,#D06A5A,#6B2A22)`
(`specs/18`). Tap → `/calendario`.

**Candidato** (`hoy` = `claveDia(ahora)`, Europe/Madrid; diferencias en días
naturales calculadas sobre `'YYYY-MM-DD'`, no sobre milisegundos locales, para
no fallar en cambios de hora):
- **comunidad:** `hoy ∈ [fecha − 7 días, coalesce(fecha_fin, fecha)]` (constante `VENTANA_COMUNIDAD_DIAS = 7` en `gadgetsHome.ts`; era 3 hasta el 2026-09-06).
- **festivo:** `hoy = fecha` (solo el día; ni antes ni después).
- Entre varios candidatos gana el de **`fecha` más próxima**; a igual fecha,
  **comunidad antes que festivo**; luego título *(decisión spec-writer: lo
  propio de la comunidad antes que lo general)*.

**Textos** (`d` = días desde hoy hasta `fecha`; `fin = coalesce(fecha_fin, fecha)`;
«D de mes» con `Intl es-ES {day:'numeric', month:'long'}` → «15 de septiembre»):

| Tipo | Situación | Overline | Texto |
|---|---|---|---|
| comunidad | `2 ≤ d ≤ 7` | Calendario | **<título>** · en `d` días |
| comunidad | `d = 1` | Calendario | **<título>** · mañana |
| comunidad | `d = 0` y `fin = fecha` | Calendario | **<título>** · hoy |
| comunidad | `d = 0` y `fin > fecha` | Calendario | **<título>** · desde hoy hasta el D de mes |
| comunidad | `d < 0` y `hoy < fin` | Calendario | **<título>** · hasta el D de mes |
| comunidad | `d < 0` y `hoy = fin` | Calendario | **<título>** · termina hoy *(decisión spec-writer)* |
| comunidad | `d > 7` o `hoy > fin` | — | no es candidato |
| festivo | `d = 0` | Festivo | Hoy es festivo: **<título>** |
| festivo | `d ≠ 0` | — | no es candidato |

Icono del gadget: `CalendarRange` (comunidad) / `PartyPopper` (festivo).

**Sin push ni campana** (decisión explícita 2026-09-05, para que nadie lo
«complete» por inercia): crear un evento **no** dispara `notificar` ni añade
nada a `listAvisos`. El recordatorio de la Home es el único aviso.

**Regla nueva de la Home — máximo 8 servicios** (`specs/10`): la rejilla 4×2
queda llena para la gestión con Calendario. El 9º servicio **exige rediseño o va
a «Más»**; queda anotado también como comentario en el array `servicios`.

## Datos, caché y demo

- **Tipo** (`src/types/index.ts`):
  ```ts
  export type TipoEvento = 'festivo' | 'comunidad'
  export interface EventoCalendario {
    id: string; tipo: TipoEvento; titulo: string; nota: string | null
    fecha: string            // 'YYYY-MM-DD' (date; día natural Madrid)
    fecha_fin: string | null // 'YYYY-MM-DD' | null
    fuente: string | null; created_by: string | null
    created_at: string; updated_at: string
  }
  ```
- **Capa real** `src/lib/db/calendario.ts` (patrón `db/reservas.ts`: la RLS
  decide, las constraints se propagan): `listEventos()` (todas las filas, orden
  `fecha asc, titulo asc`; sin paginación en v1 por volumen), `crearEvento(input)`
  (fija `created_by = auth.uid()`), `editarEvento(id, patch)`, `borrarEvento(id)`.
  Las tres escrituras hacen `cacheBust('calendario')`.
- **Switch:** `api.ts` / `apiSupabase.ts` exportan las 4 funciones.
- **Caché:** `TTL.calendario = 600_000` (10 min; cambia poco, como
  contactos/zonas). Home y `/calendario` comparten
  `useAsync(listEventos, [], { key: 'calendario', ttlMs: TTL.calendario })` →
  una sola consulta.
- **Mock** (`apiMock.ts`, la demo debe seguir viva; `render.test.tsx` monta la
  Home con el mock): `db.eventos` en memoria con **3 festivos** de la tabla
  oficial (12-oct, 8-dic y 25-dic de 2026, con su `fuente`) y **1 evento de
  comunidad** «Cierre de la piscina» con `fecha = hoy + 2` y `fecha_fin = hoy + 9`
  (relativo a hoy para que la demo enseñe el recordatorio) *(decisión
  spec-writer)*. Mismas firmas; en demo el selector de rol de `MasPage` usa
  `DEFAULTS`, así que junta/presidente ven el botón. El recordatorio tolera
  `data = null` (carga) → no se pinta.
- **PWA/offline:** nada nuevo; la API sigue *network-only* (`vite.config.ts`).

## Seguridad y tests (re-auditoría §7.12 obligatoria)

Superficie: 1 tabla legible por activos / escribible por permiso, 1 permiso;
sin Edge, sin push, sin Storage, sin anon, sin dependencias nuevas.

**`tests/rls/rls_test.sql`** (fixtures existentes: vecino A, presidente P,
app_admin X, tester T, conserje K, anon; limpieza: `delete from
calendario_eventos where titulo like '\_\_cal%'`):
1. vecino A **lee** festivos sembrados (≥ 1) y **no inserta** (`assert_falla`);
2. presidente P **inserta** `__cal P__`, **edita** y **borra**;
3. tester T **no inserta** aunque se le conceda el permiso (`es_tester`);
4. anon **no lee** (`assert_falla` por falta de grant);
5. `delete from role_permissions where rol='junta' and permiso='gestionar_calendario'`
   → junta **no inserta** (efecto en vivo); se restaura al final;
6. `fecha_fin < fecha` falla; `titulo` de 101 caracteres falla; `nota` de 501
   falla; `fecha < 2020-01-01` falla; rango de 367 días falla;
7. re-ejecutar el seed → 0 filas nuevas;
8. verificador de huérfanos (arriba) = 0; y borrar el `auth.users` de un creador
   conserva el evento con `created_by null`;
9. **purga** (mig. 0057, C27/C28): insertar como postgres un festivo pasado
   `__cal viejo__` y una comunidad pasada `__cal viejo com__`, ejecutar `select
   purgar_festivos_pasados()` → el festivo desaparece, la comunidad sigue. Este
   bloque va en su **propia transacción con `rollback`**: la función alcanza a
   TODO festivo pasado de la tabla (no solo al fixture), y el test 7 de arriba
   asume los 14 festivos sembrados intactos en cada pasada del archivo.

**`tests/calendario.test.ts`** (unitario, patrón `parking.test.ts`):
`recordatorioCalendario` (tabla de textos completa, festivo mañana → null,
lista vacía → null, evento movido a +10 días → null, empate comunidad/festivo),
`seleccionarGadgets` (3 candidatos → 2; parking+reserva → sin calendario; solo
reserva → reserva+calendario; ninguno → solo calendario), `esPasado` en el
cambio de día en Madrid (23:59 → 00:00, incl. cambio de hora de octubre),
`particionarEventos` (C27/C28: festivo pasado se descarta de ambas listas,
comunidad pasado va a «pasados», festivo/en-curso de hoy va a «próximos»).

**`tests/render.test.tsx`**: fila `['Calendario', <CalendarioPage />,
'/calendario', '/calendario']`.

Re-auditoría: `revoke … from anon` presente; `created_by = auth.uid()`; el mock
no expone nada nuevo; `npm audit --omit=dev` sin cambios; build sin source maps.

## Escenarios de aceptación (fuente para los tests)

- **C1 · Alta con permiso.** WHEN el presidente pulsa «Nueva», rellena título
  «Cierre de la piscina», fecha 2026-09-15, fin 2026-09-22 y guarda → THEN la
  fila existe con `tipo='comunidad'`, `created_by` = su uuid, aparece en
  «Próximos» bajo «Septiembre 2026» con rango «del 15 al 22 de septiembre» y la
  caché `calendario` se ha invalidado.
- **C2 · Vecino solo lectura.** WHEN un vecino abre `/calendario` → THEN ve la
  lista completa y **no** ve «Nueva» ni Editar/Borrar; WHEN inserta por REST →
  THEN la RLS rechaza (`assert_falla`).
- **C3 · Tester nunca escribe.** WHEN al rol tester se le concede
  `gestionar_calendario` e intenta insertar → THEN la RLS rechaza (`es_tester()`).
- **C4 · Anon no lee.** WHEN se consulta `calendario_eventos` con la anon key sin
  sesión → THEN error de permiso (sin grant).
- **C5 · Quitar permiso en vivo.** WHEN el app_admin desactiva
  `gestionar_calendario` para junta en Panel → Permisos → THEN la junta deja de
  insertar/editar/borrar al instante, incluso lo que creó, y los eventos
  existentes se conservan.
- **C6 · Constraints.** WHEN se intenta `fecha_fin < fecha`, título de 101
  caracteres, nota de 501, `fecha < 2020-01-01` o rango > 366 días → THEN la BD
  rechaza y la hoja muestra el error en `Alert` sin cerrarse.
- **C7 · Seed idempotente.** WHEN se ejecuta 0056 dos veces → THEN 14 festivos de
  2026, 0 filas nuevas en la segunda, todos con `fuente` no nula y
  `created_by null`.
- **C8 · Lista ordenada y agrupada.** WHEN hay eventos en septiembre, octubre y
  uno de **comunidad** pasado en marzo → THEN «Próximos» muestra «Septiembre
  2026» y «Octubre 2026» en ese orden con las filas por fecha asc; el de marzo
  está en «Pasados (este año)», plegada por defecto (si en vez de comunidad
  fuera un festivo pasado, no aparecería en ninguna sección: ver C27).
- **C9 · Hoy festivo.** WHEN hoy (Madrid) = 2026-10-12 y no hay parking ni
  reserva → THEN la Home muestra el gadget overline «Festivo», texto «Hoy es
  festivo: Fiesta Nacional de España»; tap → `/calendario`.
- **C10 · Festivo mañana.** WHEN hoy = 2026-10-11 → THEN **no** hay gadget de
  festivo (solo el día).
- **C11 · Comunidad a 3 días.** WHEN hay evento el 2026-09-08 y hoy es
  2026-09-05 → THEN gadget «Calendario» / «<título> · en 3 días»; y a 7 días (12-09) → «en 7 días» (ventana de una semana desde 2026-09-06).
- **C12 · Comunidad fuera de la ventana.** WHEN el evento es el 2026-09-13 y hoy es
  2026-09-05 (d=8) → THEN **no** hay gadget de calendario; a 7 días o menos, sí.
- **C13 · Evento en curso.** WHEN el evento va del 09-15 al 09-22 y hoy es 09-18
  → THEN texto «<título> · hasta el 22 de septiembre»; hoy 09-22 → «termina hoy»;
  hoy 09-23 → nada.
- **C14 · Cupo lleno.** WHEN hay parking que toca, reserva vigente y un evento a
  2 días → THEN la Home pinta parking y reserva, **sin** gadget de calendario.
- **C15 · Cupo con hueco.** WHEN solo hay reserva vigente y un evento a 2 días →
  THEN la Home pinta reserva y calendario (en ese orden).
- **C16 · Borrar evento.** WHEN el presidente borra el evento que hoy sale en la
  Home y confirma → THEN la fila desaparece, `cacheBust('calendario')` y la Home
  deja de mostrarlo sin recargar la app.
- **C17 · Mover de fecha.** WHEN se edita un evento de hoy+2 a hoy+10 → THEN el
  recordatorio desaparece de la Home y la fila cambia de mes en la lista.
- **C18 · Medianoche Madrid.** WHEN un evento es el 2026-09-08 y son las 23:59
  del 09-04 (Madrid) → THEN no hay gadget; a las 00:00 del 09-05 → THEN «en 3
  días». La comparación usa `claveDia`, no la hora local del dispositivo.
- **C19 · Demo.** WHEN la app arranca en modo mock → THEN `/calendario` lista 3
  festivos + «Cierre de la piscina», la Home muestra el recordatorio «en 2
  días» (si el cupo lo permite) y `render.test.tsx` monta `CalendarioPage` sin
  errores.
- **C20 · Eliminar cuenta creadora.** WHEN se elimina definitivamente la cuenta
  que creó eventos → THEN los eventos siguen y `created_by` es `null`; el
  verificador de huérfanos da 0.
- **C21 · Suspendido.** WHEN una cuenta pasa a `suspendido` → THEN lee 0 filas
  de `calendario_eventos`; el resto sigue viendo sus eventos.
- **C22 · Festivos pendientes.** WHEN hoy ≥ 2026-10-01 y no hay filas `festivo`
  de 2027 → THEN la lista muestra «Festivos de 2027: pendientes de publicación
  oficial»; WHEN se da de alta un festivo de 2027 (con fuente) → THEN la nota
  desaparece.
- **C23 · Servicios.** WHEN entra un rol de gestión → THEN la rejilla tiene
  exactamente 8 celdas (2 filas) con «Calendario» la última; un vecino ve 7
  (6 + Calendario); un inquilino ve 5 (4 + Calendario); Servicios no scrollea en
  667 px.
- **C24 · Refactor sin cambio visual.** WHEN se extrae `GadgetContextual` →
  THEN parking y reserva renderizan el mismo markup y clases que antes
  (`render.test.tsx` / snapshot) y `seleccionarGadgets([parking, reserva], 2)`
  devuelve ambos en ese orden.
- **C25 · Tipo festivo manual.** WHEN alguien con permiso crea un evento tipo
  festivo con título ya existente en la misma fecha → THEN la BD rechaza por el
  índice único parcial; con otra fecha → THEN se crea y muestra su `fuente`.
- **C26 · Sin notificaciones.** WHEN se crea un evento → THEN no se invoca
  `notificar`, la campana no añade aviso y `push_subscriptions` no se toca.
- **C27 · Festivo que pasa se borra solo.** WHEN un festivo tenía fecha de ayer
  (o `fecha_fin` de ayer) → THEN ya no aparece en `/calendario` (ni en
  «Próximos» ni en «Pasados», `particionarEventos()` lo descarta en el
  cliente) y, en la siguiente pasada del cron (03:25), `purgar_festivos_pasados()`
  lo borra físicamente de la BD.
- **C28 · Comunidad pasado se conserva.** WHEN un evento de comunidad tenía
  fecha de ayer (o `fecha_fin` de ayer) → THEN sigue existiendo en la BD y
  sigue visible en «Pasados (este año)»; `purgar_festivos_pasados()` no lo
  toca (solo alcanza a `tipo='festivo'`).

## Fuera de alcance / futuro

- Exportación **.ics** / «añadir a mi calendario» (promesa del portal viejo).
- **Notificaciones** (push o campana) de eventos.
- Vista de **mes en rejilla**; solo lista.
- **Purga de eventos de comunidad** pasados: se conservan como histórico sin
  límite (solo se purgan los `festivo`, mig. 0057).
- **Festivos 2027** (operativa anual arriba).
- Generalizar los flags `solo*` de Servicios a `visible?: (rol) => boolean` (D2
  del informe: mejora opcional, no la exige este cambio).

## Código (mapa previsto)

- `supabase/migrations/0056_calendario.sql` — tabla + constraints + índices +
  trigger + grants + RLS + permiso + seed 2026.
- `supabase/migrations/0057_purgar_festivos_pasados.sql` — función
  `purgar_festivos_pasados()` + job de `pg_cron` diario (patrón 0030).
- `src/types/index.ts` (`EventoCalendario`), `src/lib/roles.ts` (`Permiso`,
  `GRUPOS_PERMISOS` grupo «Calendario», `DEFAULTS`, `puedeGestionarCalendario`),
  `src/lib/cache.ts` (`TTL.calendario`).
- `src/lib/db/calendario.ts`, `src/lib/api.ts`, `src/lib/apiSupabase.ts`,
  `src/lib/apiMock.ts`.
- `src/features/calendario/CalendarioPage.tsx`; `src/router.tsx` (`/calendario`).
- `src/features/home/GadgetContextual.tsx`, `src/features/home/gadgetsHome.ts`,
  `src/features/home/HomePage.tsx` (8ª celda + bloque contextual).
- `tests/rls/rls_test.sql`, `tests/calendario.test.ts`, `tests/render.test.tsx`.
- `CHANGELOG.md` (`**v1.49.0 · Calendario…**`) + `package.json` 1.49.0.

## Pendientes → RESUELTOS por el orquestador (2026-09-05; se confirman en la captura móvil del cierre)

1. **Icono de «Calendario»**: `CalendarRange` en Servicios, en el distintivo de tipo
   comunidad y en el gadget; Reservas conserva `CalendarDays`. `PartyPopper` para festivo.
2. **Color/gradiente**: `#D06A5A` (Servicios) y `linear-gradient(150deg,#D06A5A,#6B2A22)` (gadget).
3. **Textos de borde** («desde hoy hasta el D de mes», «termina hoy») y desempate
   comunidad > festivo: se mantienen tal cual la tabla.
