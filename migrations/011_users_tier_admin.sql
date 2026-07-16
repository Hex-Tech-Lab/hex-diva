-- Migration 011: Extend users.tier CHECK to include 'admin'
-- Prod's tier column pre-existed with CHECK (b2c, b2b) — mig 010's ADD COLUMN IF NOT EXISTS
-- skipped it, leaving admin RLS policies (migs 006 + 010) unsatisfiable.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_tier_check;
ALTER TABLE public.users ADD CONSTRAINT users_tier_check CHECK (tier IN ('b2c', 'b2b', 'admin'));
