-- Create users table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  avatar_url text,
  tier text default 'b2c' check (tier in ('b2c', 'b2b')),
  referral_code text unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create profiles table for additional user data
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  phone text,
  bio text,
  preferences jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create addresses table
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  street text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null,
  is_default boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index idx_users_email on public.users(email);
create index idx_users_referral_code on public.users(referral_code);
create index idx_user_profiles_user_id on public.user_profiles(user_id);
create index idx_addresses_user_id on public.addresses(user_id);

-- Enable RLS
alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.addresses enable row level security;

-- Create RLS policies
create policy "Users can read their own data"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can update their own data"
  on public.users
  for update
  using (auth.uid() = id);
