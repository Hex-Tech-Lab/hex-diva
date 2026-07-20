-- Migration 020: Add SIDEUP as a fulfillment provider
--
-- SIDEUP is the first live fulfillment provider -- a merchant account
-- already exists (confirmed by the user), which itself empirically
-- confirms individual eligibility: SIDEUP's own T&Cs require "Company
-- register, Maroof, or Freelancing document" (not zero-paperwork like
-- Bosta), and a working account means that bar was already cleared.
-- Set to priority 1, ahead of Bosta (verified eligible but not yet
-- actually signed up).

alter table public.fulfillment_providers drop constraint if exists fulfillment_providers_provider_id_check;

alter table public.fulfillment_providers add constraint fulfillment_providers_provider_id_check
  check (provider_id in ('sideup', 'bosta', 'turuq', 'flextock', 'khazenly', 'presto', 'fincart', 'oto'));

update public.fulfillment_providers set priority = 2 where provider_id = 'bosta';

insert into public.fulfillment_providers (provider_id, provider_type, provider_name, priority, eligibility_status, eligibility_notes, eligibility_confirmed_at, is_enabled)
values (
  'sideup',
  'aggregator',
  'SIDEUP',
  1,
  'individual_confirmed',
  'Merchant account already created -- empirically confirms individual eligibility, though SIDEUP''s own T&Cs require a Freelancing document (lighter than Bosta''s National-ID-only bar, but real paperwork was involved, not zero). Multi-courier aggregator with per-area courier lookup (GET /merchants/courier/{area_id}) -- real cascading built into their own platform.',
  now(),
  false
)
on conflict (provider_id) do update set
  priority = excluded.priority,
  eligibility_status = excluded.eligibility_status,
  eligibility_notes = excluded.eligibility_notes,
  eligibility_confirmed_at = excluded.eligibility_confirmed_at;
