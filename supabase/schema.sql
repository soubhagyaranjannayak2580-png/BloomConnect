create extension if not exists pgcrypto;

create table if not exists public.office_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('employees', 'lunches', 'preferences', 'transactions', 'events', 'restaurants', 'cart-items', 'uploads')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists office_records_kind_created_idx on public.office_records (kind, created_at);

create or replace function public.set_office_record_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists office_records_updated_at on public.office_records;
create trigger office_records_updated_at before update on public.office_records
for each row execute function public.set_office_record_updated_at();

alter table public.office_records enable row level security;

-- Access is performed only by the server API using its server-only service key.
-- Do not add anon/authenticated table policies for this single-manager tool.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('office-uploads', 'office-uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;