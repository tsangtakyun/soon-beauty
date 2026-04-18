-- SOON-Beauty Database Schema
-- Run this in Supabase SQL Editor, or via: supabase db push

-- ============================================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  locale text default 'zh-HK',
  tier text default 'free' check (tier in ('free', 'pro', 'pro_plus')),
  item_limit int default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- CATEGORIES TABLE
-- Each user has their own categories with custom colors
-- ============================================================================
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  -- Hex color code, e.g. '#FFB5C5'
  color text not null default '#FFB5C5',
  -- Icon name from lucide-react, e.g. 'sparkles', 'droplet'
  icon text default 'sparkles',
  -- Display order
  sort_order int default 0,
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- Seed default categories for new users
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.categories (user_id, name, color, icon, sort_order, is_default) values
    (new.id, '潔面', '#FFE5E5', 'droplets', 1, true),
    (new.id, 'Toner', '#E5F3FF', 'droplet', 2, true),
    (new.id, '精華', '#FFF3E5', 'sparkles', 3, true),
    (new.id, '面霜', '#F3E5FF', 'circle', 4, true),
    (new.id, '防曬', '#FFFAE5', 'sun', 5, true),
    (new.id, '面膜', '#E5FFEF', 'square', 6, true),
    (new.id, '彩妝', '#FFE5F3', 'palette', 7, true),
    (new.id, '其他', '#EEEEEE', 'package', 99, true);
  return new;
end;
$$;

create trigger on_profile_created_seed_categories
  after insert on public.profiles
  for each row execute function public.seed_default_categories();

-- ============================================================================
-- PRODUCTS TABLE (core table)
-- ============================================================================
create table public.products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,

  -- Product identity
  name text not null,
  brand text,
  barcode text,

  -- Dates
  -- Production date (from batch code, if known)
  production_date date,
  -- Expiry date (unopened shelf life, if known)
  expiry_date date,
  -- Date user opened the product (null = not opened yet)
  opened_date date,
  -- PAO in months (e.g. 6, 12, 24) - from the jar-open icon
  pao_months int,

  -- Status
  -- 'unopened', 'in_use', 'finished', 'discarded'
  status text default 'unopened' check (status in ('unopened', 'in_use', 'finished', 'discarded')),

  -- Optional product photo in Supabase Storage
  photo_url text,

  -- User notes
  notes text,

  -- Where user stores it (e.g. '梳妝台', '浴室', '旅行包')
  location text,

  -- Price for analytics (optional)
  price numeric(10, 2),
  currency text default 'HKD',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index products_user_id_idx on public.products(user_id);
create index products_category_id_idx on public.products(category_id);
create index products_status_idx on public.products(status);
create index products_opened_date_idx on public.products(opened_date);

alter table public.products enable row level security;

create policy "Users can view own products"
  on public.products for select
  using (auth.uid() = user_id);

create policy "Users can insert own products"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "Users can update own products"
  on public.products for update
  using (auth.uid() = user_id);

create policy "Users can delete own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- COMPUTED VIEW: products with effective expiry date
-- Effective expiry = min(expiry_date, opened_date + pao_months)
-- ============================================================================
create or replace view public.products_with_expiry as
select
  p.*,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  -- Calculate effective expiry date
  case
    when p.opened_date is not null and p.pao_months is not null then
      least(
        coalesce(p.expiry_date, '9999-12-31'::date),
        (p.opened_date + (p.pao_months || ' months')::interval)::date
      )
    else p.expiry_date
  end as effective_expiry_date,
  -- Days until expiry (negative = already expired)
  case
    when p.opened_date is not null and p.pao_months is not null then
      (least(
        coalesce(p.expiry_date, '9999-12-31'::date),
        (p.opened_date + (p.pao_months || ' months')::interval)::date
      ) - current_date)
    when p.expiry_date is not null then
      (p.expiry_date - current_date)
    else null
  end as days_until_expiry
from public.products p
left join public.categories c on p.category_id = c.id;

-- ============================================================================
-- USAGE STATS HELPER (for future analytics)
-- ============================================================================
create or replace function public.user_product_stats(target_user_id uuid)
returns table (
  total_count bigint,
  unopened_count bigint,
  in_use_count bigint,
  finished_count bigint,
  expiring_soon_count bigint,
  expired_count bigint
)
language sql
security definer
as $$
  select
    count(*) as total_count,
    count(*) filter (where status = 'unopened') as unopened_count,
    count(*) filter (where status = 'in_use') as in_use_count,
    count(*) filter (where status = 'finished') as finished_count,
    count(*) filter (where
      status in ('unopened', 'in_use')
      and effective_expiry_date is not null
      and effective_expiry_date - current_date between 0 and 30
    ) as expiring_soon_count,
    count(*) filter (where
      status in ('unopened', 'in_use')
      and effective_expiry_date is not null
      and effective_expiry_date < current_date
    ) as expired_count
  from public.products_with_expiry
  where user_id = target_user_id;
$$;
