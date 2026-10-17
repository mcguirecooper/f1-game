-- Safe results-import queue. Importers may create reviewable candidates;
-- only an authenticated admin can publish one into scoring tables.
create table public.result_import_runs (
  id uuid primary key default gen_random_uuid(),
  season_id bigint not null references public.seasons(id) on delete cascade,
  provider text not null,
  retrieved_at timestamptz not null,
  candidate_hash text not null,
  payload jsonb not null,
  status text not null default 'review_required'
    check (status in ('review_required', 'published', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  unique (season_id, candidate_hash)
);

create index idx_result_import_runs_review on public.result_import_runs(status, created_at desc);
alter table public.result_import_runs enable row level security;
create policy "Admins read result import runs" on public.result_import_runs
  for select to authenticated using (public.is_admin());
grant select on public.result_import_runs to authenticated;

-- Publish the complete candidate atomically. Scores and standings update through
-- the existing views as soon as driver_results and race status commit.
create or replace function public.admin_publish_result_import(p_import_id uuid, p_reason text)
returns public.result_import_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  run public.result_import_runs;
  item jsonb;
  race_item jsonb;
  v_race_id bigint;
  v_driver_id bigint;
  before_value jsonb;
  v_result_count integer;
  v_assignment_count integer;
begin
  if not public.is_admin() then raise exception 'administrator role required' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'publication reason is required'; end if;

  select * into run from public.result_import_runs where id = p_import_id for update;
  if run.id is null then raise exception 'result import not found'; end if;
  if run.status <> 'review_required' then raise exception 'result import is already reviewed'; end if;

  for item in select value from jsonb_array_elements(run.payload->'results') loop
    select value into race_item
    from jsonb_array_elements(run.payload->'races')
    where value->>'key' = item->>'raceKey';
    if race_item is null then raise exception 'candidate references an unknown race'; end if;

    select r.id into v_race_id from public.races r
    where r.season_id = run.season_id
      and r.round_number = (race_item->>'roundNumber')::integer;
    select d.id into v_driver_id from public.drivers d where d.code = item->>'driverCode';
    if v_race_id is null or v_driver_id is null then raise exception 'candidate references unknown race or driver'; end if;

    insert into public.driver_results(race_id, driver_id, finishing_position, status)
    values (v_race_id, v_driver_id, nullif(item->>'finishingPosition', '')::integer, item->>'status')
    on conflict (race_id, driver_id) do update set
      finishing_position = excluded.finishing_position,
      status = excluded.status,
      updated_at = now();

    select count(*) into v_result_count from public.driver_results where driver_results.race_id = v_race_id;
    select count(*) into v_assignment_count from public.constructor_assignments where constructor_assignments.race_id = v_race_id;
    if v_result_count = v_assignment_count and v_result_count > 0 then
      update public.races set status = 'completed' where id = v_race_id;
    end if;
  end loop;

  before_value := to_jsonb(run);
  update public.result_import_runs
  set status = 'published', reviewed_by = auth.uid(), reviewed_at = now(), review_reason = trim(p_reason)
  where id = p_import_id
  returning * into run;

  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, before_value, after_value, reason)
  values (auth.uid(), 'publish', 'result_import', p_import_id::text, before_value, to_jsonb(run), p_reason);
  return run;
end;
$$;

revoke all on function public.admin_publish_result_import(uuid, text) from public;
grant execute on function public.admin_publish_result_import(uuid, text) to authenticated;
