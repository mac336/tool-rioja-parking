-- 0014 · Fecha de expiración opcional para mensajes (sobre todo avisos)
-- La usa el filtro de "Actividad reciente" de Inicio: un aviso aparece ahí solo
-- si tiene fecha de expiración y aún no ha pasado.
alter table mensajes add column if not exists expira_at timestamptz;
