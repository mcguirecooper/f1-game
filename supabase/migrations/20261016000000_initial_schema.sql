-- F1 Game 2026 structural schema.
-- Deliberately contains no race, driver, constructor, or standings seed data.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now()
);

create table public.seasons (
  id bigint generated always as identity primary key,
  year integer not null unique check (year between 1950 and 2200),
  status text not null default 'draft' check (status in ('draft', 'active', 'complete', 'archived')),
  created_at timestamptz not null default now()
);

create table public.season_rules (
  season_id bigint primary key references public.seasons(id) on delete cascade,
  total_races integer not null check (total_races > 0),
  max_constructor_uses integer not null default 3 check (max_constructor_uses > 0),
  constructors_at_max integer not null default 2 check (constructors_at_max >= 0),
  points_formula text not null default '23 - finishing_position',
  updated_at timestamptz not null default now()
);

create table public.races (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons(id) on delete cascade,
  name text not null,
  round_number integer not null check (round_number > 0),
  starts_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (season_id, round_number)
);

create table public.constructors (
  id bigint generated always as identity primary key,
  name text not null unique,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create table public.drivers (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null unique check (code = upper(code)),
  created_at timestamptz not null default now()
);

-- This supports mid-season team changes without rewriting driver history.
create table public.constructor_assignments (
  race_id bigint not null references public.races(id) on delete cascade,
  driver_id bigint not null references public.drivers(id) on delete restrict,
  constructor_id bigint not null references public.constructors(id) on delete restrict,
  primary key (race_id, driver_id),
  unique (race_id, driver_id, constructor_id)
);

create table public.driver_results (
  race_id bigint not null references public.races(id) on delete cascade,
  driver_id bigint not null references public.drivers(id) on delete restrict,
  finishing_position integer check (finishing_position between 1 and 22),
  status text not null check (status in ('finished', 'dnf', 'dns', 'dsq')),
  updated_at timestamptz not null default now(),
  primary key (race_id, driver_id),
  check ((status = 'finished' and finishing_position is not null) or (status <> 'finished' and finishing_position is null))
);

create table public.picks (
  player_id uuid not null references public.profiles(id) on delete cascade,
  race_id bigint not null references public.races(id) on delete cascade,
  constructor_id bigint not null references public.constructors(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  primary key (player_id, race_id)
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_races_season on public.races(season_id, round_number);
create index idx_assignments_race on public.constructor_assignments(race_id, constructor_id);
create index idx_results_race on public.driver_results(race_id);
create index idx_picks_race on public.picks(race_id);
create index idx_audit_created on public.admin_audit_log(created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.season_rules enable row level security;
alter table public.races enable row level security;
alter table public.constructors enable row level security;
alter table public.drivers enable row level security;
alter table public.constructor_assignments enable row level security;
alter table public.driver_results enable row level security;
alter table public.picks enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "Members read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "Admins update profiles" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Members read seasons" on public.seasons for select to authenticated using (true);
create policy "Members read season rules" on public.season_rules for select to authenticated using (true);
create policy "Members read races" on public.races for select to authenticated using (true);
create policy "Members read constructors" on public.constructors for select to authenticated using (true);
create policy "Members read drivers" on public.drivers for select to authenticated using (true);
create policy "Members read assignments" on public.constructor_assignments for select to authenticated using (true);

create policy "Members read published results" on public.driver_results for select to authenticated
  using (exists (select 1 from public.races r where r.id = race_id and r.status = 'completed') or public.is_admin());

create policy "Players see visible picks" on public.picks for select to authenticated
  using (player_id = (select auth.uid()) or public.is_admin() or exists (
    select 1 from public.races r where r.id = race_id and r.starts_at <= now()
  ));

create policy "Admins read audit log" on public.admin_audit_log for select to authenticated
  using (public.is_admin());

grant select on public.profiles, public.seasons, public.season_rules, public.races, public.constructors,
  public.drivers, public.constructor_assignments, public.driver_results, public.picks to authenticated;
grant update on public.profiles to authenticated;
grant select on public.admin_audit_log to authenticated;

-- Database-authoritative scoring views.
create or replace view public.driver_points as
select
  dr.race_id,
  dr.driver_id,
  ca.constructor_id,
  dr.finishing_position,
  dr.status,
  case when dr.status = 'finished' then 23 - dr.finishing_position else 0 end as points
from public.driver_results dr
join public.constructor_assignments ca using (race_id, driver_id);

create or replace view public.constructor_race_scores as
select
  dp.race_id,
  dp.constructor_id,
  sum(dp.points)::integer as points
from public.driver_points dp
group by dp.race_id, dp.constructor_id;

create or replace view public.player_race_scores as
select
  p.player_id,
  p.race_id,
  p.constructor_id,
  coalesce(crs.points, 0)::integer as points,
  p.submitted_at
from public.picks p
left join public.constructor_race_scores crs
  on crs.race_id = p.race_id and crs.constructor_id = p.constructor_id;

create or replace view public.standings as
select
  p.id as player_id,
  p.display_name,
  coalesce(sum(prs.points), 0)::integer as points,
  count(prs.race_id)::integer as picks_submitted
from public.profiles p
left join public.player_race_scores prs on prs.player_id = p.id
group by p.id, p.display_name;

grant select on public.driver_points, public.constructor_race_scores,
  public.player_race_scores, public.standings to authenticated;

-- Atomic player pick submission. It validates the deadline and usage rule in SQL.
create or replace function public.submit_pick(p_race_id bigint, p_constructor_id bigint)
returns public.picks
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  selected_season_id bigint;
  max_uses integer;
  max_at_limit integer;
  total_races integer;
  existing_uses integer;
  maxed_constructors integer;
  result public.picks;
begin
  if current_user_id is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = current_user_id and role in ('player','admin')) then
    raise exception 'league membership required' using errcode = '42501';
  end if;

  select r.season_id, sr.max_constructor_uses, sr.constructors_at_max, sr.total_races
    into selected_season_id, max_uses, max_at_limit, total_races
  from public.races r join public.season_rules sr on sr.season_id = r.season_id
  where r.id = p_race_id;
  if selected_season_id is null then raise exception 'race or season rules not found'; end if;
  if exists (select 1 from public.races where id = p_race_id and starts_at <= now()) then
    raise exception 'picks are locked for this race';
  end if;
  if not exists (select 1 from public.constructors where id = p_constructor_id) then
    raise exception 'constructor not found';
  end if;

  select count(*) into existing_uses from public.picks
    where player_id = current_user_id and race_id in (select id from public.races where season_id = selected_season_id)
      and constructor_id = p_constructor_id and race_id <> p_race_id;
  if existing_uses >= max_uses then raise exception 'constructor usage limit reached'; end if;

  select count(*) into maxed_constructors from (
    select constructor_id from public.picks
    where player_id = current_user_id and race_id in (select id from public.races where season_id = selected_season_id)
      and race_id <> p_race_id
    group by constructor_id having count(*) >= max_uses
  ) capped;
  if existing_uses = max_uses - 1 and maxed_constructors >= max_at_limit and not exists (
    select 1 from public.picks where player_id = current_user_id and race_id = p_race_id
  ) then raise exception 'only the configured number of constructors may reach the maximum usage'; end if;

  insert into public.picks(player_id, race_id, constructor_id)
  values (current_user_id, p_race_id, p_constructor_id)
  on conflict (player_id, race_id) do update set constructor_id = excluded.constructor_id, submitted_at = now()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.submit_pick(bigint, bigint) from public;
grant execute on function public.submit_pick(bigint, bigint) to authenticated;

-- Admin-only result correction with an audit record in the same transaction.
create or replace function public.admin_update_result(
  p_race_id bigint, p_driver_id bigint, p_finishing_position integer, p_status text, p_reason text
)
returns public.driver_results
language plpgsql
security definer
set search_path = public
as $$
declare
  before_value jsonb;
  result public.driver_results;
begin
  if not public.is_admin() then raise exception 'administrator role required' using errcode = '42501'; end if;
  if p_status not in ('finished','dnf','dns','dsq') then raise exception 'invalid result status'; end if;
  if p_status = 'finished' and p_finishing_position is null then raise exception 'finished result needs a position'; end if;
  if p_status <> 'finished' and p_finishing_position is not null then raise exception 'non-finished result cannot have a position'; end if;
  select to_jsonb(dr) into before_value from public.driver_results dr where dr.race_id = p_race_id and dr.driver_id = p_driver_id;
  insert into public.driver_results(race_id, driver_id, finishing_position, status)
  values (p_race_id, p_driver_id, p_finishing_position, p_status)
  on conflict (race_id, driver_id) do update set finishing_position = excluded.finishing_position, status = excluded.status, updated_at = now()
  returning * into result;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, before_value, after_value, reason)
  values (auth.uid(), 'update', 'driver_result', p_race_id || ':' || p_driver_id, before_value, to_jsonb(result), p_reason);
  return result;
end;
$$;

revoke all on function public.admin_update_result(bigint, bigint, integer, text, text) from public;
grant execute on function public.admin_update_result(bigint, bigint, integer, text, text) to authenticated;

-- Admin-only pick correction. A reason is mandatory for every override.
create or replace function public.admin_override_pick(
  p_player_id uuid, p_race_id bigint, p_constructor_id bigint, p_reason text
)
returns public.picks
language plpgsql
security definer
set search_path = public
as $$
declare
  before_value jsonb;
  result public.picks;
begin
  if not public.is_admin() then raise exception 'administrator role required' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'override reason is required'; end if;
  if not exists (select 1 from public.profiles where id = p_player_id) then raise exception 'player not found'; end if;
  if not exists (select 1 from public.races where id = p_race_id) then raise exception 'race not found'; end if;
  if not exists (select 1 from public.constructors where id = p_constructor_id) then raise exception 'constructor not found'; end if;
  select to_jsonb(pick) into before_value from public.picks pick
    where pick.player_id = p_player_id and pick.race_id = p_race_id;
  insert into public.picks(player_id, race_id, constructor_id)
  values (p_player_id, p_race_id, p_constructor_id)
  on conflict (player_id, race_id) do update set constructor_id = excluded.constructor_id, submitted_at = now()
  returning * into result;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, before_value, after_value, reason)
  values (auth.uid(), 'override', 'pick', p_player_id || ':' || p_race_id, before_value, to_jsonb(result), p_reason);
  return result;
end;
$$;

revoke all on function public.admin_override_pick(uuid, bigint, bigint, text) from public;
grant execute on function public.admin_override_pick(uuid, bigint, bigint, text) to authenticated;
