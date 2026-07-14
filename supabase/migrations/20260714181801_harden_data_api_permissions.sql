-- Opt future business objects into explicit Data API exposure. Supabase-managed
-- schemas and the supabase_admin role are intentionally left untouched.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

-- Remove inherited broad privileges from existing business tables, including
-- TRUNCATE, TRIGGER, REFERENCES and MAINTAIN, before granting the V1 minimum.
revoke all privileges on table
  public.profiles,
  public.posts,
  public.categories,
  public.tags,
  public.post_tags,
  public.media
from public, anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

grant select on table
  public.posts,
  public.categories,
  public.tags,
  public.post_tags,
  public.media
to anon;

grant select on table
  public.profiles,
  public.posts,
  public.categories,
  public.tags,
  public.post_tags,
  public.media
to authenticated;

grant insert, update on table public.posts, public.media to authenticated;
grant insert, update, delete on table
  public.categories,
  public.tags,
  public.post_tags
to authenticated;

-- Nitro uses the service role only after token, owner and Origin validation.
grant select, update on table public.posts to service_role;

-- Replace overlapping permissive SELECT policies with one policy per role.
drop policy if exists "public reads visible posts" on public.posts;
drop policy if exists "owner reads every post" on public.posts;

create policy "anonymous reads visible posts"
on public.posts for select to anon
using (
  status = 'published'
  and published_at <= now()
  and deleted_at is null
);

create policy "authenticated reads allowed posts"
on public.posts for select to authenticated
using (
  (
    status = 'published'
    and published_at <= now()
    and deleted_at is null
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

drop policy if exists "public reads categories with visible posts" on public.categories;
drop policy if exists "owner manages categories" on public.categories;

create policy "anonymous reads public categories"
on public.categories for select to anon
using (
  exists (
    select 1 from public.posts
    where posts.category_id = categories.id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
);

create policy "authenticated reads allowed categories"
on public.categories for select to authenticated
using (
  exists (
    select 1 from public.posts
    where posts.category_id = categories.id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner inserts categories"
on public.categories for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner updates categories"
on public.categories for update to authenticated
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

create policy "owner deletes categories"
on public.categories for delete to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

drop policy if exists "public reads tags with visible posts" on public.tags;
drop policy if exists "owner manages tags" on public.tags;

create policy "anonymous reads public tags"
on public.tags for select to anon
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

create policy "authenticated reads allowed tags"
on public.tags for select to authenticated
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
  or exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner inserts tags"
on public.tags for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner updates tags"
on public.tags for update to authenticated
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

create policy "owner deletes tags"
on public.tags for delete to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

drop policy if exists "public reads visible post tags" on public.post_tags;
drop policy if exists "owner manages post tags" on public.post_tags;

create policy "anonymous reads public post tags"
on public.post_tags for select to anon
using (
  exists (
    select 1 from public.posts
    where posts.id = post_tags.post_id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
);

create policy "authenticated reads allowed post tags"
on public.post_tags for select to authenticated
using (
  exists (
    select 1 from public.posts
    where posts.id = post_tags.post_id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner inserts post tags"
on public.post_tags for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create policy "owner updates post tags"
on public.post_tags for update to authenticated
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

create policy "owner deletes post tags"
on public.post_tags for delete to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

drop policy if exists "public reads media used as visible cover" on public.media;
drop policy if exists "owner reads all media" on public.media;

create policy "anonymous reads public cover media"
on public.media for select to anon
using (
  exists (
    select 1 from public.posts
    where posts.cover_media_id = media.id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
);

create policy "authenticated reads allowed media"
on public.media for select to authenticated
using (
  exists (
    select 1 from public.posts
    where posts.cover_media_id = media.id
      and posts.status = 'published'
      and posts.published_at <= now()
      and posts.deleted_at is null
  )
  or exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'owner'
  )
);

create index posts_cover_media_id_idx on public.posts (cover_media_id);
