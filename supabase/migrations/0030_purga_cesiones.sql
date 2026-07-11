-- 0030 · Purga automática de cesiones de parking (histórico corto)
-- Las cesiones canceladas/reasignadas o ya pasadas se quedan como HISTÓRICO,
-- pero se borran automáticamente a los 10 días para no acumular ruido.
create extension if not exists pg_cron;

create or replace function purgar_cesiones() returns integer
  language sql security definer set search_path = public as $$
  with del as (
    delete from parking_cesiones
    where (estado in ('cancelada', 'reasignada') and created_at < now() - interval '10 days')
       or (hasta < current_date - 10)
    returning 1
  )
  select count(*)::int from del;
$$;

-- Solo la tarea programada la ejecuta (no el cliente).
revoke execute on function purgar_cesiones() from public, anon, authenticated;

-- Job diario (03:15). Reprogramable sin duplicar.
do $$
begin
  perform cron.unschedule('purgar_cesiones');
exception when others then null;
end $$;

select cron.schedule('purgar_cesiones', '15 3 * * *', 'select purgar_cesiones();');
