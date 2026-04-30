create or replace function public.seed_lip_care_category()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  has_parent_col boolean;
  has_group_col boolean;
  face_parent_id uuid;
  existing_id uuid;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categories'
      and column_name = 'parent_id'
  ) into has_parent_col;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categories'
      and column_name = 'group_name'
  ) into has_group_col;

  execute 'select id from public.categories where user_id = $1 and name = ''唇部護理'' limit 1'
    into existing_id
    using new.id;

  if existing_id is not null then
    return new;
  end if;

  if has_parent_col then
    execute 'select id from public.categories where user_id = $1 and name = ''面部護理'' limit 1'
      into face_parent_id
      using new.id;

    if has_group_col then
      execute '
        insert into public.categories
          (user_id, name, color, icon, sort_order, is_default, parent_id, group_name)
        values
          ($1, ''唇部護理'', ''#FFE8D9'', ''heart'', 9, true, $2, null)
      '
        using new.id, face_parent_id;
    else
      execute '
        insert into public.categories
          (user_id, name, color, icon, sort_order, is_default, parent_id)
        values
          ($1, ''唇部護理'', ''#FFE8D9'', ''heart'', 9, true, $2)
      '
        using new.id, face_parent_id;
    end if;
  else
    insert into public.categories (user_id, name, color, icon, sort_order, is_default)
    values (new.id, '唇部護理', '#FFE8D9', 'heart', 9, true);
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_created_seed_lip_care on public.profiles;

create trigger on_profile_created_seed_lip_care
  after insert on public.profiles
  for each row execute function public.seed_lip_care_category();

do $$
declare
  has_parent_col boolean;
  has_group_col boolean;
  profile_row record;
  face_parent_id uuid;
  existing_id uuid;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categories'
      and column_name = 'parent_id'
  ) into has_parent_col;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categories'
      and column_name = 'group_name'
  ) into has_group_col;

  for profile_row in select id from public.profiles loop
    execute 'select id from public.categories where user_id = $1 and name = ''唇部護理'' limit 1'
      into existing_id
      using profile_row.id;

    if existing_id is not null then
      continue;
    end if;

    if has_parent_col then
      execute 'select id from public.categories where user_id = $1 and name = ''面部護理'' limit 1'
        into face_parent_id
        using profile_row.id;

      if has_group_col then
        execute '
          insert into public.categories
            (user_id, name, color, icon, sort_order, is_default, parent_id, group_name)
          values
            ($1, ''唇部護理'', ''#FFE8D9'', ''heart'', 9, true, $2, null)
        '
          using profile_row.id, face_parent_id;
      else
        execute '
          insert into public.categories
            (user_id, name, color, icon, sort_order, is_default, parent_id)
          values
            ($1, ''唇部護理'', ''#FFE8D9'', ''heart'', 9, true, $2)
        '
          using profile_row.id, face_parent_id;
      end if;
    else
      insert into public.categories (user_id, name, color, icon, sort_order, is_default)
      values (profile_row.id, '唇部護理', '#FFE8D9', 'heart', 9, true);
    end if;
  end loop;
end;
$$;
