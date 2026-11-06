-- Add the Haas mid-season substitutions required by the 2026 result candidate.
-- HIR drove Mexico; CAM replaces OCO from Brazil through Abu Dhabi.
begin;

insert into public.drivers(name, code)
values
  ('Ryo Hirakawa', 'HIR'),
  ('Rafael Câmara', 'CAM')
on conflict (code) do update set name = excluded.name;

do $$
declare
  v_season_id bigint;
  v_haas_id bigint;
  v_hir_id bigint;
  v_cam_id bigint;
  v_mexico_id bigint;
begin
  select id into v_season_id from public.seasons where year = 2026;
  select id into v_haas_id from public.constructors where name = 'Haas F1 Team';
  select id into v_hir_id from public.drivers where code = 'HIR';
  select id into v_cam_id from public.drivers where code = 'CAM';
  select r.id into v_mexico_id
  from public.races r
  where r.season_id = v_season_id and r.round_number = 19;

  if v_season_id is null or v_haas_id is null or v_hir_id is null or v_cam_id is null or v_mexico_id is null then
    raise exception '2026 season, Haas, Mexico, HIR, and CAM must exist before applying substitutions';
  end if;

  -- OCO's Haas seat is occupied by HIR in Mexico and CAM thereafter.
  delete from public.constructor_assignments ca
  using public.races r, public.drivers d
  where ca.race_id = r.id
    and ca.driver_id = d.id
    and r.season_id = v_season_id
    and r.round_number between 19 and 23
    and d.code = 'OCO';

  insert into public.constructor_assignments(race_id, driver_id, constructor_id)
  values (v_mexico_id, v_hir_id, v_haas_id)
  on conflict (race_id, driver_id) do update set constructor_id = excluded.constructor_id;

  insert into public.constructor_assignments(race_id, driver_id, constructor_id)
  select r.id, v_cam_id, v_haas_id
  from public.races r
  where r.season_id = v_season_id
    and r.round_number between 20 and 23
  on conflict (race_id, driver_id) do update set constructor_id = excluded.constructor_id;
end;
$$;

commit;
