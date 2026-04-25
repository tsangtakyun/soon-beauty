create table if not exists public.product_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  logged_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, logged_date)
);

create index if not exists product_logs_user_id_idx
  on public.product_logs(user_id);

create index if not exists product_logs_logged_date_idx
  on public.product_logs(logged_date);

alter table public.product_logs enable row level security;

create policy "Users can view own product logs"
  on public.product_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own product logs"
  on public.product_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own product logs"
  on public.product_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own product logs"
  on public.product_logs for delete
  using (auth.uid() = user_id);
