/**
 * Migration 006: Webhook Event Logging & Monitoring
 * - Create webhook_events table for complete event traceability
 * - Support idempotency tracking and duplicate detection
 * - Enable webhook replay and forensic analysis
 * - Implement latency and performance metrics
 */

-- Create webhook_events table
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  webhook_id text not null,
  provider text not null check (provider in ('shopify', 'uppromote', 'orders', 'process-order', 'stripe')),
  event_type text not null,

  -- Processing metrics
  status text not null check (status in ('success', 'failed', 'duplicate', 'skipped')) default 'success',
  latency_ms integer,

  -- Idempotency tracking
  is_idempotent boolean default false,
  original_event_id uuid references public.webhook_events(id) on delete set null,

  -- Error information
  error_message text,
  error_code text,

  -- Payload tracking for replay
  payload_hash text not null,
  payload_size integer,

  -- Request context
  request_headers jsonb,
  request_metadata jsonb,

  -- Processing context
  processing_duration_ms integer,
  signature_verification_ms integer,
  persistence_ms integer,

  -- Lifecycle
  received_at timestamp with time zone default now(),
  processed_at timestamp with time zone,
  created_at timestamp with time zone default now(),

  -- Retry tracking
  retry_count integer default 0,
  max_retries integer default 3,
  next_retry_at timestamp with time zone
);

-- Create indexes for common queries
create index idx_webhook_events_webhook_id on public.webhook_events(webhook_id);
create index idx_webhook_events_provider on public.webhook_events(provider);
create index idx_webhook_events_status on public.webhook_events(status);
create index idx_webhook_events_event_type on public.webhook_events(event_type);
create index idx_webhook_events_created_at on public.webhook_events(created_at desc);
create index idx_webhook_events_received_at on public.webhook_events(received_at desc);
create index idx_webhook_events_payload_hash on public.webhook_events(payload_hash);

-- Composite indexes for common query patterns
create index idx_webhook_events_provider_created on public.webhook_events(provider, created_at desc);
create index idx_webhook_events_provider_status on public.webhook_events(provider, status);
create index idx_webhook_events_original_event on public.webhook_events(original_event_id);

-- Partial indexes for performance queries
create index idx_webhook_events_failed on public.webhook_events(created_at desc)
  where status = 'failed';
create index idx_webhook_events_duplicates on public.webhook_events(created_at desc)
  where status = 'duplicate';

-- Enable RLS
alter table public.webhook_events enable row level security;

-- RLS Policy: Admins can read all webhook events
create policy "Admins can read all webhook events"
  on public.webhook_events
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and tier = 'admin'
    )
  );

-- RLS Policy: Service role can insert/update webhook events
create policy "Service role can manage webhook events"
  on public.webhook_events
  for all
  using (auth.role() = 'service_role');

-- Add comments for documentation
comment on table public.webhook_events is 'Comprehensive webhook event tracking for idempotency, monitoring, and compliance';
comment on column public.webhook_events.webhook_id is 'Provider-specific webhook ID for deduplication';
comment on column public.webhook_events.provider is 'Webhook source provider (shopify, uppromote, orders, etc)';
comment on column public.webhook_events.event_type is 'Specific event type (e.g., product/update, order.attributed)';
comment on column public.webhook_events.status is 'Processing result status: success, failed, duplicate, skipped';
comment on column public.webhook_events.is_idempotent is 'True if this is a duplicate detection';
comment on column public.webhook_events.original_event_id is 'References the original event if this is a duplicate';
comment on column public.webhook_events.payload_hash is 'SHA256 hash of webhook body for replay detection';
comment on column public.webhook_events.latency_ms is 'Total end-to-end latency from receipt to persistence';
comment on column public.webhook_events.processing_duration_ms is 'Time spent in business logic processing';
comment on column public.webhook_events.signature_verification_ms is 'Time spent verifying webhook signature';
comment on column public.webhook_events.persistence_ms is 'Time spent writing to database';
comment on column public.webhook_events.retry_count is 'Number of retry attempts for failed events';

-- Create webhook_event_metrics table for aggregated analytics
create table if not exists public.webhook_event_metrics (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,

  -- Time window (hourly aggregation)
  hour_bucket timestamp with time zone not null,

  -- Counts
  total_events integer default 0,
  successful_events integer default 0,
  failed_events integer default 0,
  duplicate_events integer default 0,

  -- Performance metrics
  avg_latency_ms numeric(10, 2),
  p50_latency_ms integer,
  p95_latency_ms integer,
  p99_latency_ms integer,
  max_latency_ms integer,

  -- Success rate
  success_rate numeric(5, 2),

  -- Errors
  top_errors jsonb,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique(provider, event_type, hour_bucket)
);

-- Create indexes for metrics queries
create index idx_webhook_metrics_provider on public.webhook_event_metrics(provider);
create index idx_webhook_metrics_hour_bucket on public.webhook_event_metrics(hour_bucket desc);
create index idx_webhook_metrics_provider_bucket on public.webhook_event_metrics(provider, hour_bucket desc);

-- Enable RLS on metrics
alter table public.webhook_event_metrics enable row level security;

-- RLS Policy: Admins can read metrics
create policy "Admins can read webhook metrics"
  on public.webhook_event_metrics
  for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and tier = 'admin'
    )
  );

-- Create webhook_replays table for tracking event replays
create table if not exists public.webhook_replays (
  id uuid primary key default gen_random_uuid(),
  original_event_id uuid not null references public.webhook_events(id) on delete cascade,

  -- Replay info
  initiated_by uuid references public.users(id) on delete set null,
  reason text,

  -- Replay result
  status text default 'pending' check (status in ('pending', 'processing', 'success', 'failed')),
  result_event_id uuid references public.webhook_events(id) on delete set null,
  error_message text,

  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- Create indexes for replays
create index idx_webhook_replays_original_event on public.webhook_replays(original_event_id);
create index idx_webhook_replays_initiated_by on public.webhook_replays(initiated_by);
create index idx_webhook_replays_status on public.webhook_replays(status);

-- Enable RLS on replays
alter table public.webhook_replays enable row level security;

-- RLS Policy: Admins can manage replays
create policy "Admins can manage webhook replays"
  on public.webhook_replays
  for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and tier = 'admin'
    )
  );

-- Create function to log webhook event
create or replace function log_webhook_event(
  p_webhook_id text,
  p_provider text,
  p_event_type text,
  p_status text,
  p_payload_hash text,
  p_latency_ms integer default null,
  p_error_message text default null,
  p_original_event_id uuid default null,
  p_is_idempotent boolean default false,
  p_request_headers jsonb default null,
  p_request_metadata jsonb default null,
  p_processing_duration_ms integer default null,
  p_signature_verification_ms integer default null,
  p_persistence_ms integer default null,
  p_payload_size integer default null
)
returns uuid as $$
declare
  v_event_id uuid;
begin
  insert into public.webhook_events (
    webhook_id,
    provider,
    event_type,
    status,
    payload_hash,
    latency_ms,
    error_message,
    original_event_id,
    is_idempotent,
    request_headers,
    request_metadata,
    processing_duration_ms,
    signature_verification_ms,
    persistence_ms,
    payload_size,
    processed_at
  ) values (
    p_webhook_id,
    p_provider,
    p_event_type,
    p_status,
    p_payload_hash,
    p_latency_ms,
    p_error_message,
    p_original_event_id,
    p_is_idempotent,
    p_request_headers,
    p_request_metadata,
    p_processing_duration_ms,
    p_signature_verification_ms,
    p_persistence_ms,
    p_payload_size,
    now()
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$ language plpgsql security definer;

-- Create function to update webhook event metrics (called on event insertion)
create or replace function update_webhook_metrics()
returns trigger as $$
declare
  v_hour_bucket timestamp with time zone;
  v_latencies integer[];
  v_p50 integer;
  v_p95 integer;
  v_p99 integer;
begin
  v_hour_bucket := date_trunc('hour', NEW.created_at);

  -- Update or insert metrics for this provider/event_type/hour
  insert into public.webhook_event_metrics (
    provider,
    event_type,
    hour_bucket,
    total_events,
    successful_events,
    failed_events,
    duplicate_events
  ) values (
    NEW.provider,
    NEW.event_type,
    v_hour_bucket,
    1,
    case when NEW.status = 'success' then 1 else 0 end,
    case when NEW.status = 'failed' then 1 else 0 end,
    case when NEW.status = 'duplicate' then 1 else 0 end
  )
  on conflict (provider, event_type, hour_bucket)
  do update set
    total_events = webhook_event_metrics.total_events + 1,
    successful_events = webhook_event_metrics.successful_events + (case when NEW.status = 'success' then 1 else 0 end),
    failed_events = webhook_event_metrics.failed_events + (case when NEW.status = 'failed' then 1 else 0 end),
    duplicate_events = webhook_event_metrics.duplicate_events + (case when NEW.status = 'duplicate' then 1 else 0 end),
    updated_at = now();

  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger to update metrics on event insertion
create trigger trigger_update_webhook_metrics
  after insert on public.webhook_events
  for each row
  execute function update_webhook_metrics();
