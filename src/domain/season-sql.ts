import type { SeasonImport } from './season-import';

function sql(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildSeasonSql(input: SeasonImport): string {
  const constructorValues = input.constructors.map((item) => `(${sql(item.name)}, ${sql(item.color)})`).join(',\n  ');
  const constructorMappingValues = input.constructors.map((item) => `(${sql(item.key)}, ${sql(item.name)}, ${sql(item.color)})`).join(',\n  ');
  const raceValues = input.races.map((item) => `(${sql(item.key)}, ${item.roundNumber}, ${sql(item.name)}, ${sql(item.startsAt)}, ${sql(item.status)})`).join(',\n  ');
  const assignmentValues = input.assignments.map((item) => `(${sql(item.raceKey)}, ${sql(item.driverCode)}, ${sql(item.constructorKey)})`).join(',\n  ');
  const resultValues = input.results.map((item) => `(${sql(item.raceKey)}, ${sql(item.driverCode)}, ${item.finishingPosition === null ? 'null' : item.finishingPosition}, ${sql(item.status)})`).join(',\n  ');

  return `-- Generated from a validated SeasonImport file.
-- This seed contains season metadata, roster, schedule, and assignments only.
-- It intentionally contains no results, picks, users, or fantasy points.
begin;

create temporary table _f1_import_constructors (
  import_key text primary key,
  constructor_id bigint not null
) on commit drop;
create temporary table _f1_import_drivers (
  driver_code text primary key,
  driver_id bigint not null
) on commit drop;
create temporary table _f1_import_races (
  import_key text primary key,
  race_id bigint not null
) on commit drop;

insert into public.seasons(year, status)
values (${input.season.year}, ${sql(input.season.status)})
on conflict (year) do update set status = excluded.status;

insert into public.season_rules(season_id, total_races, max_constructor_uses, constructors_at_max, points_formula)
select id, ${input.season.rules.totalRaces}, ${input.season.rules.maxConstructorUses}, ${input.season.rules.constructorsAtMax}, ${sql(input.season.rules.pointsFormula)}
from public.seasons
where year = ${input.season.year}
on conflict (season_id) do update set
  total_races = excluded.total_races,
  max_constructor_uses = excluded.max_constructor_uses,
  constructors_at_max = excluded.constructors_at_max,
  points_formula = excluded.points_formula,
  updated_at = now();

insert into public.constructors(name, color)
values
  ${constructorValues}
on conflict (name) do update set color = excluded.color;

insert into public.drivers(name, code)
values
  ${input.drivers.map((item) => `(${sql(item.name)}, ${sql(item.code)})`).join(',\n  ')}
on conflict (code) do update set name = excluded.name;

insert into public.races(season_id, name, round_number, starts_at, status)
select s.id, source.name, source.round_number, source.starts_at::timestamptz, source.status
from public.seasons s
cross join (values
  ${raceValues}
) as source(import_key, round_number, name, starts_at, status)
where s.year = ${input.season.year}
on conflict (season_id, round_number) do update set
  name = excluded.name,
  starts_at = excluded.starts_at,
  status = excluded.status;

insert into _f1_import_constructors(import_key, constructor_id)
select source.import_key, c.id
from (values
  ${constructorMappingValues}
) as source(import_key, name, color)
join public.constructors c on c.name = source.name;

insert into _f1_import_drivers(driver_code, driver_id)
select d.code, d.id
from public.drivers d;

insert into _f1_import_races(import_key, race_id)
select source.import_key, r.id
from (values
  ${raceValues}
) as source(import_key, round_number, name, starts_at, status)
join public.races r on r.round_number = source.round_number
join public.seasons s on s.id = r.season_id and s.year = ${input.season.year};

-- Reconcile race-specific assignments so a roster correction removes obsolete
-- assignments from an earlier seed before inserting the current source snapshot.
delete from public.constructor_assignments
where race_id in (select race_id from _f1_import_races);

insert into public.constructor_assignments(race_id, driver_id, constructor_id)
select r.race_id, d.driver_id, c.constructor_id
from (values
  ${assignmentValues}
) as source(race_key, driver_code, constructor_key)
join _f1_import_races r on r.import_key = source.race_key
join _f1_import_drivers d on d.driver_code = source.driver_code
join _f1_import_constructors c on c.import_key = source.constructor_key
on conflict (race_id, driver_id) do update set constructor_id = excluded.constructor_id;

${input.results.length > 0 ? `insert into public.driver_results(race_id, driver_id, finishing_position, status)
select r.race_id, d.driver_id, source.finishing_position, source.status
from (values
  ${resultValues}
) as source(race_key, driver_code, finishing_position, status)
join _f1_import_races r on r.import_key = source.race_key
join _f1_import_drivers d on d.driver_code = source.driver_code
on conflict (race_id, driver_id) do update set
  finishing_position = excluded.finishing_position,
  status = excluded.status,
  updated_at = now();

update public.races
set status = 'completed'
where season_id = (select id from public.seasons where year = ${input.season.year})
  and id in (select distinct race_id from public.driver_results where race_id in (select race_id from _f1_import_races));
` : ''}

commit;
`;
}
