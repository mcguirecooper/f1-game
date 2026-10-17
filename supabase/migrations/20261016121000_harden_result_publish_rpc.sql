-- Keep the publish endpoint callable only by signed-in users; the function
-- itself still performs the administrator check before bypassing RLS.
revoke execute on function public.admin_publish_result_import(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_publish_result_import(uuid, text) to authenticated;
