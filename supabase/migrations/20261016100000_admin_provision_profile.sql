-- Link an existing Supabase Auth user to a fantasy league profile.
create or replace function public.admin_provision_profile(
  p_user_id uuid, p_display_name text, p_role text, p_reason text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  before_value jsonb;
  result public.profiles;
begin
  if not public.is_admin() then raise exception 'administrator role required' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'auth user not found; invite the user first'; end if;
  if nullif(trim(p_display_name), '') is null then raise exception 'display name is required'; end if;
  if p_role not in ('player', 'admin') then raise exception 'invalid profile role'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'provisioning reason is required'; end if;
  select to_jsonb(profile) into before_value from public.profiles profile where profile.id = p_user_id;
  insert into public.profiles(id, display_name, role)
  values (p_user_id, trim(p_display_name), p_role)
  on conflict (id) do update set display_name = excluded.display_name, role = excluded.role
  returning * into result;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, before_value, after_value, reason)
  values (auth.uid(), 'provision', 'profile', p_user_id::text, before_value, to_jsonb(result), p_reason);
  return result;
end;
$$;

revoke all on function public.admin_provision_profile(uuid, text, text, text) from public;
grant execute on function public.admin_provision_profile(uuid, text, text, text) to authenticated;
