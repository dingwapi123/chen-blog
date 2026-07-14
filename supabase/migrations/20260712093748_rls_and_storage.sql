grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update on public.posts to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.post_tags to authenticated;
grant select on public.media to anon, authenticated;
grant insert, update on public.media to authenticated;

revoke delete on public.posts from anon, authenticated;
revoke delete on public.media from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.media enable row level security;

create policy "users read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "public reads visible posts"
on public.posts for select to anon, authenticated
using (
  status = 'published'
  and published_at <= now()
  and deleted_at is null
);

create policy "owner reads every post"
on public.posts for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner creates posts"
on public.posts for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
  and status <> 'published'
);

create policy "owner updates posts"
on public.posts for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
  and status <> 'published'
);

create policy "public reads categories with visible posts"
on public.categories for select to anon, authenticated
using (
  exists (
    select 1 from public.posts
    where posts.category_id = categories.id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
);

create policy "owner manages categories"
on public.categories for all to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "public reads tags with visible posts"
on public.tags for select to anon, authenticated
using (
  exists (
    select 1
    from public.post_tags
    join public.posts on posts.id = post_tags.post_id
    where post_tags.tag_id = tags.id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
);

create policy "owner manages tags"
on public.tags for all to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "public reads visible post tags"
on public.post_tags for select to anon, authenticated
using (
  exists (
    select 1 from public.posts
    where posts.id = post_tags.post_id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
);

create policy "owner manages post tags"
on public.post_tags for all to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "public reads media used as visible cover"
on public.media for select to anon, authenticated
using (
  exists (
    select 1 from public.posts
    where posts.cover_media_id = media.id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
);

create policy "owner reads all media"
on public.media for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner inserts media"
on public.media for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner updates media"
on public.media for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- `storage.objects` is owned by Supabase's storage role in hosted projects.
-- Its RLS is already enabled; project migrations may create policies but must not
-- alter table ownership settings or grants on this system-managed table.

create policy "owner uploads post images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);
