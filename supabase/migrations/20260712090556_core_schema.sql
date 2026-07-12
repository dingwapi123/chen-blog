create schema if not exists private;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create function private.enforce_post_publication_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at := now();
    elsif new.published_at is distinct from old.published_at then
      raise exception 'published_at cannot be edited directly';
    end if;
  else
    new.published_at := null;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_post_publication_fields() from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name varchar(100) not null default '',
  role varchar(20) not null check (role = 'owner'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null,
  slug varchar(100) not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null,
  slug varchar(100) not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'post-images' check (bucket_id = 'post-images'),
  object_path text not null unique,
  alt_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null,
  slug varchar(200) not null unique,
  summary text not null default '',
  content text not null default '',
  cover_media_id uuid references public.media(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  status varchar(20) not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint published_posts_have_timestamp
    check (status <> 'published' or published_at is not null),
  constraint deleted_posts_are_archived
    check (deleted_at is null or status = 'archived')
);

create table public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tag_id)
);

create index posts_public_listing_idx
  on public.posts (published_at desc)
  where status = 'published' and deleted_at is null;

create index posts_category_public_listing_idx
  on public.posts (category_id, published_at desc)
  where status = 'published' and deleted_at is null;

create index post_tags_tag_id_idx on public.post_tags (tag_id, post_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger tags_set_updated_at
before update on public.tags
for each row execute function private.set_updated_at();

create trigger media_set_updated_at
before update on public.media
for each row execute function private.set_updated_at();

create trigger posts_set_updated_at
before update on public.posts
for each row execute function private.set_updated_at();

create trigger posts_enforce_publication_fields
before insert or update on public.posts
for each row execute function private.enforce_post_publication_fields();
