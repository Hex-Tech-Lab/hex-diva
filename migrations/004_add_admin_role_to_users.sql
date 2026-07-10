-- Add role field to users table for admin access control
-- Handles admin, moderator, and user roles

alter table if exists public.users
add column if not exists role text default 'user' check (role in ('user', 'moderator', 'admin'));

-- Create index for role-based queries
create index if not exists idx_users_role on public.users(role);

-- Add comment for documentation
comment on column public.users.role is 'User role: user (default), moderator, or admin';
