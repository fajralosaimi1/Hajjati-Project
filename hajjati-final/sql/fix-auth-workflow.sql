-- ============================================================
-- Fix auth workflow + 403 on profiles for existing Supabase DBs
-- Safe to run multiple times
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, update on public.profiles to authenticated, service_role;
grant select, update on public.pilgrim_profiles to authenticated, service_role;
grant select, update on public.provider_profiles to authenticated, service_role;
grant select, insert, update on public.campaigns to authenticated, service_role;
grant select, insert, update on public.campaign_applications to authenticated, service_role;
grant select, insert on public.notifications to authenticated, service_role;
grant select, insert, update on public.emergency_reports to authenticated, service_role;
grant select, insert on public.smart_guide_logs to authenticated, service_role;
grant select, insert on public.qr_audit to authenticated, service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
grant usage, select on sequences to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_applications enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_self_or_related on public.profiles;
create policy profiles_select_self_or_related
on public.profiles for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.campaign_applications a
    join public.campaigns c on c.id = a.campaign_id
    where a.pilgrim_id = profiles.id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists notifications_read_auth on public.notifications;
drop policy if exists notifications_read_related on public.notifications;
create policy notifications_read_related
on public.notifications for select
to authenticated
using (
  sender_id = auth.uid()
  or audience = 'all'
  or (
    audience = 'campaign_members'
    and campaign_id is not null
    and exists (
      select 1
      from public.campaign_applications a
      where a.campaign_id = notifications.campaign_id
        and a.pilgrim_id = auth.uid()
    )
  )
  or (
    audience = 'owner_only'
    and campaign_id is not null
    and exists (
      select 1
      from public.campaigns c
      where c.id = notifications.campaign_id
        and c.owner_id = auth.uid()
    )
  )
);

do $$
begin
  raise notice 'Auth workflow fix applied successfully.';
end $$;
