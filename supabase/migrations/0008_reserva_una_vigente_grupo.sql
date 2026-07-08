-- 0008 · "Una reserva vigente por vivienda" consciente del grupo
-- Una reserva puede abarcar varias zonas: son N filas con el mismo grupo_id
-- (0006). El trigger reserva_una_vigente (0002) contaba cada fila por separado,
-- así que la 2ª zona del MISMO evento disparaba "ya tiene una reserva vigente".
-- Ahora las filas que comparten grupo_id NO cuentan entre sí; el límite sigue
-- siendo 1 evento vigente por vivienda.
create or replace function reserva_una_vigente() returns trigger
  language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if new.estado in ('pendiente','aprobada') and new.fin >= now() then
    select count(*) into n from reservas
      where vivienda = new.vivienda
        and estado in ('pendiente','aprobada')
        and fin >= now()
        and id <> new.id
        -- Filas del mismo grupo (mismo evento multi-zona) no cuentan.
        and not (new.grupo_id is not null and grupo_id = new.grupo_id);
    if n >= 1 then
      raise exception 'La vivienda % ya tiene una reserva vigente.', new.vivienda
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end; $$;
