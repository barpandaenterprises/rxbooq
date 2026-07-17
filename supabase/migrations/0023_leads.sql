-- =============================================================================
-- 0023_leads.sql
-- Marketing lead capture — the "List your clinic in 5 minutes" form on the apex
-- home page. Anonymous visitors submit name / phone / email; the server action
-- (service-role) enriches the row with request-time attribution:
--   submission time, landing page URL, IP address, referrer, and every UTM /
--   click-tracking parameter present on the landing URL.
--
-- Scalability note: the fixed identity columns (name/phone/email) are promoted
-- for indexing + display; ALL attribution/marketing params live in the `utm`
-- jsonb and any future structured data in `meta`. New tracking fields therefore
-- require ZERO schema changes — the capture action just writes another key.
-- =============================================================================

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),

  -- Visitor-supplied identity (the three form fields).
  name              text not null,
  phone             text not null,
  email             text,

  -- Request-time attribution captured server-side.
  landing_page_url  text,
  referrer          text,
  ip_address        text,

  -- All UTM + click-id + campaign params, e.g.
  --   { "utm_source": "...", "utm_medium": "...", "utm_campaign": "...",
  --     "utm_term": "...", "utm_content": "...", "campaign_id": "...",
  --     "gclid": "...", "fbclid": "..." }
  -- Kept as a bag so new params never need a migration.
  utm               jsonb not null default '{}'::jsonb,

  -- Future-proofing for any additional structured data (page section, A/B
  -- bucket, device hints, …) without altering the table.
  meta              jsonb not null default '{}'::jsonb,

  -- Simple lifecycle so the sales team can work the list from the console.
  status            text  not null default 'new'
                      check (status in ('new','contacted','qualified','converted','archived')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Newest-first listing is the default view.
create index if not exists leads_created_at_idx on public.leads (created_at desc);
-- De-dupe / lookup by contact.
create index if not exists leads_email_idx on public.leads (lower(email)) where email is not null;
create index if not exists leads_phone_idx on public.leads (phone);
create index if not exists leads_status_idx on public.leads (status);
-- Filter/search inside the attribution bag (e.g. by utm_source / campaign).
create index if not exists leads_utm_gin_idx on public.leads using gin (utm);

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- RLS
--
-- Reads + management are superadmin-only (this is platform CRM data, never
-- exposed to tenant staff). Inserts happen exclusively through the public
-- capture server action using the service-role client, which bypasses RLS —
-- so there is intentionally NO anon insert policy. That keeps the table from
-- being writable via the public anon key (spam / scraping surface), while the
-- trusted server path still works.
-- =============================================================================

alter table public.leads enable row level security;

drop policy if exists leads_superadmin_all on public.leads;
create policy leads_superadmin_all on public.leads
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

comment on table public.leads is
  'Marketing leads from the apex home-page capture form. Identity fields are promoted columns; all UTM/click attribution lives in the utm jsonb so new params need no migration. Inserted service-role only; read/managed by superadmins.';
comment on column public.leads.utm is
  'Bag of all UTM + click-tracking params from the landing URL (utm_source/medium/campaign/term/content, campaign_id, gclid, fbclid, …). Add new keys freely — no schema change needed.';
comment on column public.leads.meta is
  'Reserved for future structured attribution (A/B bucket, device hints, …) without altering the table.';
