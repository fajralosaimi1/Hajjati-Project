  create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  full_name text not null,
  email citext unique,
  phone text unique,
  country_code text not null default 'SA',
  role text not null check (role in ('pilgrim', 'owner', 'admin')),
  preferred_lang text not null default 'ar' check (preferred_lang in ('ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilgrim_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  permit_number text unique,
  national_id text unique,
  emergency_contact_name text,
  emergency_contact_phone text,
  health_notes text,
  otp_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null,
  contact_person text,
  license_number text not null unique,
  commercial_registration text not null unique,
  unified_number text unique,
  city text,
  verified boolean not null default false,
  otp_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title_ar text not null,
  title_en text not null,
  city text not null,
  meeting_point text,
  accommodation_ar text,
  accommodation_en text,
  price numeric(10,2) not null default 0 check (price >= 0),
  capacity integer not null check (capacity > 0),
  seats_left integer not null check (seats_left >= 0),
  duration_days integer not null check (duration_days > 0),
  description_ar text not null,
  description_en text not null,
  terms_ar text,
  terms_en text,
  status text not null default 'open' check (status in ('draft', 'open', 'active', 'closed', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  pilgrim_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'payment_pending', 'paid', 'rejected', 'completed')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid')),
  owner_note text,
  qr_token text unique,
  qr_used boolean not null default false,
  checked_in_at timestamptz,
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, pilgrim_id)
);

create unique index if not exists uq_active_campaign_per_pilgrim
on public.campaign_applications (pilgrim_id)
where status in ('payment_pending', 'paid', 'completed');

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  title_ar text not null,
  title_en text not null,
  body_ar text not null,
  body_en text not null,
  audience text not null default 'campaign_members' check (audience in ('all', 'campaign_members', 'owner_only')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  report_type text not null check (report_type in ('lost_person', 'medical', 'field_support')),
  location_text text,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_guide_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_message text not null,
  assistant_reply text,
  language text not null default 'ar' check (language in ('ar', 'en')),
  created_at timestamptz not null default now()
);

create table if not exists public.qr_audit (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.campaign_applications(id) on delete cascade,
  scanned_by uuid references public.profiles(id) on delete set null,
  scan_result text not null check (scan_result in ('valid', 'used', 'invalid', 'unpaid')),
  scanned_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_pilgrim_profiles_updated_at on public.pilgrim_profiles;
create trigger trg_pilgrim_profiles_updated_at before update on public.pilgrim_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_provider_profiles_updated_at on public.provider_profiles;
create trigger trg_provider_profiles_updated_at before update on public.provider_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists trg_emergency_reports_updated_at on public.emergency_reports;
create trigger trg_emergency_reports_updated_at before update on public.emergency_reports
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role text := coalesce(nullif(meta->>'role', ''), 'pilgrim');
  first_name text := coalesce(nullif(meta->>'first_name', ''), 'مستخدم');
  last_name text := coalesce(nullif(meta->>'last_name', ''), 'جديد');
  full_name text := coalesce(nullif(meta->>'full_name', ''), trim(first_name || ' ' || last_name));
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    full_name,
    email,
    phone,
    country_code,
    role,
    preferred_lang
  )
  values (
    new.id,
    first_name,
    last_name,
    full_name,
    new.email,
    nullif(meta->>'phone', ''),
    coalesce(nullif(meta->>'country_code', ''), 'SA'),
    user_role,
    coalesce(nullif(meta->>'preferred_lang', ''), 'ar')
  )
  on conflict (id) do nothing;

  if user_role = 'owner' then
    insert into public.provider_profiles (
      user_id,
      company_name,
      contact_person,
      license_number,
      commercial_registration,
      unified_number,
      city
    )
    values (
      new.id,
      coalesce(nullif(meta->>'company_name', ''), full_name),
      nullif(meta->>'contact_person', ''),
      coalesce(nullif(meta->>'license_number', ''), 'PENDING-LICENSE-' || new.id::text),
      coalesce(nullif(meta->>'commercial_registration', ''), 'PENDING-CR-' || new.id::text),
      nullif(meta->>'unified_number', ''),
      nullif(meta->>'city', '')
    )
    on conflict (user_id) do nothing;
  else
    insert into public.pilgrim_profiles (
      user_id,
      permit_number,
      national_id,
      emergency_contact_name,
      emergency_contact_phone,
      health_notes
    )
    values (
      new.id,
      nullif(meta->>'permit_number', ''),
      nullif(meta->>'national_id', ''),
      nullif(meta->>'emergency_contact_name', ''),
      nullif(meta->>'emergency_contact_phone', ''),
      nullif(meta->>'health_notes', '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
alter table public.pilgrim_profiles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_applications enable row level security;
alter table public.notifications enable row level security;
alter table public.emergency_reports enable row level security;
alter table public.smart_guide_logs enable row level security;
alter table public.qr_audit enable row level security;

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
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists pilgrim_profiles_manage_own on public.pilgrim_profiles;
create policy pilgrim_profiles_manage_own
on public.pilgrim_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists provider_profiles_manage_own on public.provider_profiles;
create policy provider_profiles_manage_own
on public.provider_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists campaigns_read_authenticated on public.campaigns;
create policy campaigns_read_authenticated
on public.campaigns for select
to authenticated
using (true);

drop policy if exists campaigns_insert_owner on public.campaigns;
create policy campaigns_insert_owner
on public.campaigns for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists campaigns_update_owner on public.campaigns;
create policy campaigns_update_owner
on public.campaigns for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists applications_select_related on public.campaign_applications;
create policy applications_select_related
on public.campaign_applications for select
using (
  pilgrim_id = auth.uid()
  or exists (
    select 1 from public.campaigns c
    where c.id = campaign_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists applications_insert_pilgrim on public.campaign_applications;
create policy applications_insert_pilgrim
on public.campaign_applications for insert
to authenticated
with check (pilgrim_id = auth.uid());

drop policy if exists applications_update_pilgrim on public.campaign_applications;
create policy applications_update_pilgrim
on public.campaign_applications for update
to authenticated
using (pilgrim_id = auth.uid())
with check (pilgrim_id = auth.uid());

drop policy if exists applications_update_owner on public.campaign_applications;
create policy applications_update_owner
on public.campaign_applications for update
to authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = campaign_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.campaigns c
    where c.id = campaign_id
      and c.owner_id = auth.uid()
  )
);

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

drop policy if exists notifications_insert_sender on public.notifications;
create policy notifications_insert_sender
on public.notifications for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists emergency_manage_own on public.emergency_reports;
create policy emergency_manage_own
on public.emergency_reports for all
using (reporter_id = auth.uid())
with check (reporter_id = auth.uid());

drop policy if exists smart_logs_manage_own on public.smart_guide_logs;
create policy smart_logs_manage_own
on public.smart_guide_logs for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists qr_audit_select_related on public.qr_audit;
create policy qr_audit_select_related
on public.qr_audit for select
using (
  exists (
    select 1
    from public.campaign_applications a
    join public.campaigns c on c.id = a.campaign_id
    where a.id = application_id
      and (a.pilgrim_id = auth.uid() or c.owner_id = auth.uid())
  )
);

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

