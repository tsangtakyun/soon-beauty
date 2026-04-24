create table public.recent_makeup_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  notes text,
  selfie_url text,
  used_product_ids uuid[] default '{}'::uuid[] not null,
  created_at timestamptz default now()
);

create index recent_makeup_logs_user_id_idx on public.recent_makeup_logs(user_id);
create index recent_makeup_logs_created_at_idx on public.recent_makeup_logs(created_at desc);

alter table public.recent_makeup_logs enable row level security;

create policy "Users can view own makeup logs"
  on public.recent_makeup_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own makeup logs"
  on public.recent_makeup_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own makeup logs"
  on public.recent_makeup_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own makeup logs"
  on public.recent_makeup_logs for delete
  using (auth.uid() = user_id);
