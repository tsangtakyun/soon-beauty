create table if not exists public.product_pan_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  month_key text not null,
  logged_date date not null default current_date,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists product_pan_logs_user_product_month_idx
  on public.product_pan_logs(user_id, product_id, month_key);

create index if not exists product_pan_logs_user_date_idx
  on public.product_pan_logs(user_id, logged_date desc);

alter table public.product_pan_logs enable row level security;

create policy "Users can view own pan logs"
  on public.product_pan_logs
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own pan logs"
  on public.product_pan_logs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pan logs"
  on public.product_pan_logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own pan logs"
  on public.product_pan_logs
  for delete
  using (auth.uid() = user_id);
