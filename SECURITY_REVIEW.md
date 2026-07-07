# Revisión de seguridad — App Rioja 25

> Fecha: 2026-07-07. Revisión: Fable. **Implementación de los fixes: Opus (2026-07-07).**
>
> ## ✅ ESTADO: TODOS LOS FINDINGS CORREGIDOS Y VERIFICADOS
> Los 5 findings (1 crítico, 2 medios, 1 bajo, 1 funcional) están resueltos en
> `supabase/migrations/0002_functions_triggers.sql` y `0003_rls.sql`. Se añadió
> un test de regresión por cada uno en `tests/rls/rls_test.sql` (**24 tests RLS
> en verde**). Verificación extra: el ataque original (insertar un anuncio ya
> `publicado` en el tablón principal) ahora deja el anuncio en `pendiente` con
> `nivel` nulo. Para revalidar: `npx supabase db reset && bash scripts/run-rls-tests.sh`.
>
> | # | Finding | Severidad | Estado |
> |---|---------|-----------|--------|
> | 1 | Anuncios auto-publicados (INSERT) | 🔴 Crítico | ✅ Corregido (trigger fuerza estado/nivel) |
> | 2 | Auto-reasignar parking | 🟠 Medio | ✅ Corregido (WITH CHECK restringido) |
> | 3 | Autor cambia estado/moderación de incidencia | 🟠 Medio | ✅ Corregido (trigger guard + RLS) |
> | 4 | Integridad de votos | 🟡 Bajo | ✅ Corregido (validación opción↔encuesta + no borrar tras cierre) |
> | 5 | Gestión no podía bloquear anuncios | 🟡 Funcional | ✅ Corregido (grant de columna + `puede_bloquear_anuncios()`) |
>
> ---
> _Documento original de la revisión (previo a la corrección) a continuación._

## Contexto
Foco: que un vecino no pueda hacer cosas de gestión/admin (meter o aprobar
anuncios sin permiso, etc.).
>
> Método: auditoría de las políticas RLS (`supabase/migrations/0003_rls.sql`) +
> **ataques reales ejecutados contra la BD local** simulando un `vecino` con JWT
> válido llamando a la API directamente (no a la interfaz). El frontend puede
> ocultar botones, pero un atacante llama a la API igualmente: lo único que
> protege de verdad es la RLS.

---

## ✅ Lo que YA está bien securizado (verificado con ataques)
- **Auto-ascenso de rol**: un vecino NO puede cambiar su `rol`/`estado`/`vivienda`
  (el `grant update (nombre, normas_aceptadas_at)` a nivel de columna lo impide).
  Ataque probado → siguió siendo `vecino`. ✔
- **Aprobar/moderar anuncios ajenos**: bloqueado (`anun_upd` exige gestión o ser
  autor de un pendiente). ✔
- **Auto-aprobar la propia reserva**: bloqueado (`res_upd_own` limita el estado a
  pendiente/cancelada). ✔
- **Anónimos**: solo pueden leer el catálogo de `viviendas`; nada más. ✔
- **Sin XSS** en el frontend (no hay `dangerouslySetInnerHTML`/`eval`) y **sin
  secretos** hardcodeados (todo por `Deno.env.get`). ✔

---

## 🔴 CRÍTICO 1 — Un vecino puede PUBLICAR anuncios sin aprobación (INSERT)
**Ataque confirmado en vivo.** Un `vecino` hace `INSERT` en `anuncios` con
`estado='publicado'` y `nivel='principal'` y el anuncio aparece en el tablón
principal **sin pasar por moderación**.

- **Causa**: la política `anun_ins` (0003_rls.sql, línea ~168) solo comprueba
  `es_activo()` y `puede_publicar_anuncios`; **no fuerza** `estado` ni `nivel`. Y
  el trigger `anuncio_before_insert` (0002) tampoco los resetea. El cliente
  controla `estado`, `nivel`, `publicado_at`, `aprobado_por`, `motivo_rechazo`,
  `revision_larga`.
- **Fix (recomendado, en `0002_functions_triggers.sql`)**: extender
  `anuncio_before_insert()` para forzar los campos controlados por el servidor:
  ```sql
  new.estado := 'pendiente';
  new.nivel := null;            -- lo fija la gestión al aprobar
  new.publicado_at := null;
  new.aprobado_por := null;
  new.motivo_rechazo := null;
  -- (mantener el cálculo existente de autor_id, vivienda y revision_larga)
  ```
  Así, aunque el cliente mande `estado='publicado'`, se ignora. La única vía de
  publicar sigue siendo `anun_upd` (solo gestión).
- **Test de regresión**: añadir a `tests/rls/rls_test.sql` un `assert_falla`/
  comprobación de que un vecino que inserta con `estado='publicado'` acaba con el
  anuncio en `pendiente` (no visible para otros).

## 🟠 MEDIO 2 — Un vecino puede AUTO-REASIGNAR su plaza de parking
**Ataque confirmado en vivo.** El dueño de una cesión hace `UPDATE` poniendo
`estado='reasignada'` y `reasignada_a='<vivienda cualquiera>'`, saltándose a la
gestión y las reglas de prioridad (specs/08).

- **Causa**: `ces_upd_own` (línea ~153) permite al dueño actualizar su fila sin
  restringir qué columnas/valores. La reasignación debe ser exclusiva de gestión
  (`ces_upd_gestion`).
- **Fix (en `0003_rls.sql`)**: restringir el `with check` del dueño a solo
  cancelar, sin tocar campos de gestión:
  ```sql
  create policy ces_upd_own on parking_cesiones for update
    using (vivienda = mi_vivienda() and estado = 'activa')
    with check (vivienda = mi_vivienda()
                and estado in ('activa','cancelada')
                and reasignada_a is null
                and gestionada_por is null);
  ```
- **Test**: vecino intenta `estado='reasignada'` en su cesión → debe fallar.

## 🟠 MEDIO 3 — El autor de una incidencia puede cambiar su estado/moderación
El autor puede, mientras la incidencia está `abierta`, hacer `UPDATE` de `estado`
(p. ej. marcarla `resuelta`/`cerrada`), `prioridad` o `comentarios_bloqueados` —
acciones que las specs reservan a gestión.

- **Causa**: `inc_upd_autor` (línea ~89) tiene `with check (autor_id = auth.uid())`
  y **no** restringe el `estado` resultante ni las columnas de moderación.
- **Fix (en `0003_rls.sql`)**: forzar que el autor no cambie el estado ni la
  moderación:
  ```sql
  create policy inc_upd_autor on incidencias for update
    using (autor_id = auth.uid() and estado = 'abierta')
    with check (autor_id = auth.uid() and estado = 'abierta');
  ```
  Y, para blindar `prioridad`/`comentarios_bloqueados`, añadir un trigger
  `BEFORE UPDATE` que, si `not es_gestion()`, restaure esos campos a su valor
  anterior. (El cambio de estado/cierre queda solo en `inc_upd_gestion`.)
- **Test**: autor intenta `estado='cerrada'` en su incidencia → debe fallar.

## 🟡 BAJO 4 — Integridad de votos de encuestas
- Un voto puede referenciar una `opcion_id` que **no pertenece** a su
  `encuesta_id` (la FK solo garantiza que la opción existe). Podría distorsionar
  recuentos.
- `voto_del` permite a la vivienda borrar su voto **incluso tras el cierre**.
- **Fix (en `0002`, dentro de `voto_before_insert`)**: validar pertenencia:
  ```sql
  if not exists (select 1 from encuesta_opciones
                 where id = new.opcion_id and encuesta_id = new.encuesta_id) then
    raise exception 'La opción no pertenece a la encuesta.';
  end if;
  ```
  Y añadir un `BEFORE DELETE` que impida borrar si la encuesta ya está cerrada.

## 🟡 FUNCIONAL 5 — La gestión (presidente/junta) NO puede bloquear anuncios de una vivienda
Las specs (13/15) dicen que la gestión puede poner `puede_publicar_anuncios=false`
a una vivienda. Pero `viviendas_upd` solo permite `es_app_admin()`. Hoy el
presidente/junta **no** pueden bloquear a un vecino abusón. No es un agujero de
seguridad, es una función que falta.

- **Fix (decisión de diseño + RLS)**: permitir a la gestión cambiar SOLO ese flag:
  ```sql
  revoke update on viviendas from authenticated;
  grant update (puede_publicar_anuncios) on viviendas to authenticated;
  -- + política que permita es_gestion() actualizar (además de app_admin para el resto)
  ```
  Alternativamente, mantenerlo solo-app_admin si así lo prefieres (entonces
  actualizar specs). Confírmalo antes de implementar.

## 🟢 INFO / decisiones a confirmar (no urgentes)
- **`viviendas` es legible por anónimos** (`viviendas_sel using(true)`). Es
  intencional (el formulario público necesita el selector de vivienda) y no es
  dato personal, pero conviene dejarlo escrito como decisión consciente.
- **INSERT de incidencias** también deja al cliente fijar `estado` (por defecto
  `abierta`); conviene que el trigger `incidencia_before_insert` fuerce
  `estado='abierta'` por coherencia con el fix 1.
- **Storage de adjuntos**: el bucket privado de fotos de incidencias/anuncios aún
  no está creado ni con políticas; hay que crearlo (privado + URLs firmadas)
  cuando se conecte la subida real.

---

## Contexto importante para quien implemente (Opus)
- El frontend hoy usa una **capa mock** (`src/lib/api.ts`) y un **login de demo**;
  la RLS aún no es la barrera efectiva en la app real hasta que se conecte a
  Supabase. **Estos fixes de RLS deben estar antes de conectar datos reales y
  antes de abrir a vecinos.**
- Todos los fixes son en `supabase/migrations/0002_*.sql` y `0003_rls.sql`. Tras
  cambiarlos: `npx supabase db reset` y `bash scripts/run-rls-tests.sh`.
- **Añadir a `tests/rls/rls_test.sql`** un caso por cada finding (1, 2, 3, 4) para
  que quede como test de regresión permanente. Hoy la suite (17 tests) cubre
  doble voto, solapamiento, reserva vigente, auto-aprobación de reserva,
  auto-ascenso y aislamiento entre viviendas — pero NO cubría el INSERT de
  anuncio publicado (finding 1), que es el más grave.

## Prioridad de implementación
1. **CRÍTICO 1** (anuncios auto-publicados) — imprescindible.
2. **MEDIO 2** (auto-reasignar parking) y **MEDIO 3** (autor cambia estado incidencia).
3. **BAJO 4** (integridad de votos) y **FUNCIONAL 5** (bloqueo por gestión).
4. INFO / decisiones a confirmar.
