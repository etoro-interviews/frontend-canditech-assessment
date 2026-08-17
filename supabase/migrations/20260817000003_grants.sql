-- Explicit Data API grants
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;
