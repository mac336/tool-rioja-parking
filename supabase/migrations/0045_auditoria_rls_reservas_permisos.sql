-- 0045 · Auditoría: endurecer RLS de reservas y role_permissions
-- ---------------------------------------------------------------------------
-- A1 (regresión): al reescribir res_ins en 0039 se perdió el filtro es_piso que
--    tenía 0023 → una vivienda "especial" (Conserje/Administrador/Tester) podía
--    reservar como si fuera un piso. Se restaura sobre la vivienda de la FILA
--    (cubre también "reservar para otra vivienda").
-- C1: res_sel no exigía es_activo() en la rama "mi vivienda" → un suspendido/baja
--    con sesión aún válida podía leer las reservas de su vivienda. Se añade.
-- C2: role_permissions era legible con la anon key (grant a anon + policy true).
--    No hay PII, pero es exposición innecesaria: solo la leen usuarios
--    autenticados (store.refreshAuth/verComo). Se retira el acceso anónimo.

-- A1 — insertar reserva: la vivienda destino debe ser un PISO real.
drop policy if exists res_ins on reservas;
create policy res_ins on reservas for insert
  with check (
    es_activo()
    and tiene_permiso('realizar_reservas')
    and solicitada_por = auth.uid()
    and (vivienda = mi_vivienda() or puede_reservar_otras())
    and exists (select 1 from viviendas v where v.codigo = vivienda and v.es_piso)
  );

-- C1 — leer reservas: solo usuarios activos (además de las condiciones de 0044).
drop policy if exists res_sel on reservas;
create policy res_sel on reservas for select using (
  es_activo() and (
    vivienda = mi_vivienda() or es_gestion() or tiene_permiso('ver_agenda_reservas')
  )
);

-- C2 — role_permissions: quitar lectura anónima (la leen solo autenticados).
revoke select on role_permissions from anon;
