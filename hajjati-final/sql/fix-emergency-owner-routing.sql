-- ============================================================
-- Emergency reports routing to campaign owner
-- Run in Supabase SQL Editor after supabase.sql for existing DBs
-- Safe to run multiple times
-- ============================================================

alter table public.emergency_reports
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists contact_phone text,
  add column if not exists response text,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

grant select, insert, update on public.emergency_reports to authenticated, service_role;

-- Pilgrim can create and read their own reports.
drop policy if exists emergency_insert_own on public.emergency_reports;
create policy emergency_insert_own
on public.emergency_reports for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists emergency_select_own_or_campaign_owner on public.emergency_reports;
create policy emergency_select_own_or_campaign_owner
on public.emergency_reports for select
to authenticated
using (
  reporter_id = auth.uid()
  or exists (
    select 1
    from public.campaigns c
    where c.id = emergency_reports.campaign_id
      and c.owner_id = auth.uid()
  )
);

-- Campaign owner can update/resolve reports linked to their campaigns.
drop policy if exists emergency_update_own_or_campaign_owner on public.emergency_reports;
create policy emergency_update_own_or_campaign_owner
on public.emergency_reports for update
to authenticated
using (
  reporter_id = auth.uid()
  or exists (
    select 1
    from public.campaigns c
    where c.id = emergency_reports.campaign_id
      and c.owner_id = auth.uid()
  )
)
with check (
  reporter_id = auth.uid()
  or exists (
    select 1
    from public.campaigns c
    where c.id = emergency_reports.campaign_id
      and c.owner_id = auth.uid()
  )
);
