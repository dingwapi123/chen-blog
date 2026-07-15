-- Public article metadata must remain immutable until the article is moved back
-- to draft. Restrictive policies compose with the existing owner policies, so
-- role checks stay centralized while these policies enforce publication state.

revoke update on table public.post_tags from authenticated;
drop policy if exists "owner updates post tags" on public.post_tags;

create policy "post tags require an editable post for insert"
on public.post_tags
as restrictive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.posts
    where posts.id = post_tags.post_id
      and posts.status = 'draft'
      and posts.deleted_at is null
  )
);

create policy "post tags require an editable post for delete"
on public.post_tags
as restrictive
for delete
to authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.id = post_tags.post_id
      and posts.status = 'draft'
      and posts.deleted_at is null
  )
);

create policy "published category metadata is immutable"
on public.categories
as restrictive
for update
to authenticated
using (
  not exists (
    select 1
    from public.posts
    where posts.category_id = categories.id
      and posts.status = 'published'
  )
)
with check (
  not exists (
    select 1
    from public.posts
    where posts.category_id = categories.id
      and posts.status = 'published'
  )
);

create policy "referenced categories cannot be deleted"
on public.categories
as restrictive
for delete
to authenticated
using (
  not exists (
    select 1
    from public.posts
    where posts.category_id = categories.id
  )
);

create policy "published tag metadata is immutable"
on public.tags
as restrictive
for update
to authenticated
using (
  not exists (
    select 1
    from public.post_tags
    join public.posts on posts.id = post_tags.post_id
    where post_tags.tag_id = tags.id
      and posts.status = 'published'
  )
)
with check (
  not exists (
    select 1
    from public.post_tags
    join public.posts on posts.id = post_tags.post_id
    where post_tags.tag_id = tags.id
      and posts.status = 'published'
  )
);

create policy "referenced tags cannot be deleted"
on public.tags
as restrictive
for delete
to authenticated
using (
  not exists (
    select 1
    from public.post_tags
    where post_tags.tag_id = tags.id
  )
);

create policy "published cover metadata is immutable"
on public.media
as restrictive
for update
to authenticated
using (
  not exists (
    select 1
    from public.posts
    where posts.cover_media_id = media.id
      and posts.status = 'published'
  )
)
with check (
  not exists (
    select 1
    from public.posts
    where posts.cover_media_id = media.id
      and posts.status = 'published'
  )
);

-- Referential actions execute with the table owner's privileges and can bypass
-- child-table RLS. RESTRICT keeps a taxonomy delete from silently changing an
-- article through ON DELETE SET NULL or ON DELETE CASCADE.
alter table public.posts
  drop constraint posts_category_id_fkey,
  add constraint posts_category_id_fkey
    foreign key (category_id)
    references public.categories(id)
    on delete restrict;

alter table public.post_tags
  drop constraint post_tags_tag_id_fkey,
  add constraint post_tags_tag_id_fkey
    foreign key (tag_id)
    references public.tags(id)
    on delete restrict;

-- The existing public-listing index is partial. FK checks also need draft and
-- archived rows, so keep a full supporting index for category references.
create index posts_category_id_idx on public.posts (category_id);
