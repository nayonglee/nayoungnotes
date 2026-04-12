create extension if not exists pgcrypto;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  title text not null default '',
  mood text,
  theme_config jsonb not null default '{}'::jsonb,
  search_text text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, entry_date)
);

create table if not exists public.entry_items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  item_type text not null,
  order_index integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  style_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.entry_items
drop constraint if exists entry_items_item_type_check;

alter table public.entry_items
add constraint entry_items_item_type_check
check (item_type in ('text', 'todo', 'planner', 'photo', 'drawing', 'sticker', 'baseball', 'teaching'));

create index if not exists entries_user_date_idx on public.entries (user_id, entry_date desc);
create index if not exists entry_items_entry_order_idx on public.entry_items (entry_id, order_index asc);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists entries_updated_at on public.entries;
create trigger entries_updated_at
before update on public.entries
for each row
execute function public.handle_updated_at();

drop trigger if exists entry_items_updated_at on public.entry_items;
create trigger entry_items_updated_at
before update on public.entry_items
for each row
execute function public.handle_updated_at();

alter table public.entries enable row level security;
alter table public.entry_items enable row level security;

create policy "Users can read their own entries"
on public.entries
for select
using (auth.uid() = user_id);

create policy "Users can insert their own entries"
on public.entries
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own entries"
on public.entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own entries"
on public.entries
for delete
using (auth.uid() = user_id);

create policy "Users can read their own entry items"
on public.entry_items
for select
using (
  exists (
    select 1 from public.entries
    where entries.id = entry_items.entry_id
      and entries.user_id = auth.uid()
  )
);

create policy "Users can write their own entry items"
on public.entry_items
for all
using (
  exists (
    select 1 from public.entries
    where entries.id = entry_items.entry_id
      and entries.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.entries
    where entries.id = entry_items.entry_id
      and entries.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('diary-photos', 'diary-photos', false)
on conflict (id) do nothing;

create policy "Users can read their own diary photos"
on storage.objects
for select
using (
  bucket_id = 'diary-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload their own diary photos"
on storage.objects
for insert
with check (
  bucket_id = 'diary-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own diary photos"
on storage.objects
for update
using (
  bucket_id = 'diary-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'diary-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own diary photos"
on storage.objects
for delete
using (
  bucket_id = 'diary-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create or replace function public.save_diary_entry(
  p_entry_id uuid default null,
  p_entry_date date default null,
  p_title text default '',
  p_mood text default null,
  p_theme_config jsonb default '{}'::jsonb,
  p_search_text text default '',
  p_items jsonb default '[]'::jsonb
)
returns public.entries
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_entry public.entries;
  v_item jsonb;
  v_item_id_text text;
  v_item_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.entries (id, user_id, entry_date, title, mood, theme_config, search_text)
  values (
    coalesce(p_entry_id, gen_random_uuid()),
    v_user,
    p_entry_date,
    coalesce(p_title, ''),
    nullif(p_mood, ''),
    coalesce(p_theme_config, '{}'::jsonb),
    coalesce(p_search_text, '')
  )
  on conflict (user_id, entry_date)
  do update
    set title = excluded.title,
        mood = excluded.mood,
        theme_config = excluded.theme_config,
        search_text = excluded.search_text
  returning * into v_entry;

  delete from public.entry_items where entry_id = v_entry.id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_item_id_text := v_item ->> 'id';
    v_item_id :=
      case
        when v_item_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then v_item_id_text::uuid
        else gen_random_uuid()
      end;

    insert into public.entry_items (
      id,
      entry_id,
      item_type,
      order_index,
      payload,
      style_config
    )
    values (
      v_item_id,
      v_entry.id,
      coalesce(v_item ->> 'item_type', 'text'),
      coalesce((v_item ->> 'order_index')::integer, 0),
      coalesce(v_item -> 'payload', '{}'::jsonb),
      coalesce(v_item -> 'style_config', '{}'::jsonb)
    );
  end loop;

  return v_entry;
end;
$$;

create or replace function public.delete_diary_entry(
  p_entry_id uuid default null,
  p_entry_date date default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.entries
  where user_id = v_user
    and (
      (p_entry_id is not null and id = p_entry_id)
      or (p_entry_id is null and p_entry_date is not null and entry_date = p_entry_date)
    );
end;
$$;
