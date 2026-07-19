begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(72);

-- Structural security invariants ------------------------------------------------

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'public.profiles'::regclass,
      'public.posts'::regclass,
      'public.categories'::regclass,
      'public.tags'::regclass,
      'public.post_tags'::regclass,
      'public.media'::regclass
    )
      and relrowsecurity
  ),
  6,
  'all exposed business tables enable RLS'
);

select is(
  (
    with expected(grantee, table_name, privilege_type) as (
      values
        ('anon', 'posts', 'SELECT'),
        ('anon', 'categories', 'SELECT'),
        ('anon', 'tags', 'SELECT'),
        ('anon', 'post_tags', 'SELECT'),
        ('anon', 'media', 'SELECT'),
        ('authenticated', 'profiles', 'SELECT'),
        ('authenticated', 'posts', 'SELECT'),
        ('authenticated', 'posts', 'INSERT'),
        ('authenticated', 'posts', 'UPDATE'),
        ('authenticated', 'categories', 'SELECT'),
        ('authenticated', 'categories', 'INSERT'),
        ('authenticated', 'categories', 'UPDATE'),
        ('authenticated', 'categories', 'DELETE'),
        ('authenticated', 'tags', 'SELECT'),
        ('authenticated', 'tags', 'INSERT'),
        ('authenticated', 'tags', 'UPDATE'),
        ('authenticated', 'tags', 'DELETE'),
        ('authenticated', 'post_tags', 'SELECT'),
        ('authenticated', 'post_tags', 'INSERT'),
        ('authenticated', 'post_tags', 'DELETE'),
        ('authenticated', 'media', 'SELECT'),
        ('authenticated', 'media', 'INSERT'),
        ('authenticated', 'media', 'UPDATE'),
        ('service_role', 'posts', 'SELECT'),
        ('service_role', 'posts', 'UPDATE')
    ),
    actual as (
      select grantee, table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('profiles', 'posts', 'categories', 'tags', 'post_tags', 'media')
        and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
    ),
    differences as (
      (select * from actual except select * from expected)
      union all
      (select * from expected except select * from actual)
    )
    select count(*)::integer from differences
  ),
  0,
  'business tables expose exactly the V1 grants'
);

select is(
  (
    select count(*)::integer
    from pg_default_acl as defaults
    join pg_namespace as namespace on namespace.oid = defaults.defaclnamespace
    cross join lateral aclexplode(defaults.defaclacl) as acl
    where defaults.defaclrole = 'postgres'::regrole
      and namespace.nspname = 'public'
      and (
        acl.grantee = 0
        or acl.grantee in ('anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole)
      )
  ),
  0,
  'postgres no longer auto-exposes future public objects'
);

select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'post-images'
      and public
      and file_size_limit = 5242880
      and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      and cardinality(allowed_mime_types) = 4
  ),
  'post-images is a constrained public image bucket'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'owner uploads post images'
      and cmd = 'INSERT'
      and roles = array['authenticated']::name[]
  ),
  1,
  'Storage exposes the owner upload policy to authenticated sessions'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('UPDATE', 'DELETE')
  ),
  0,
  'Storage has no object update or delete policy'
);

select is(
  (
    select count(*)::integer
    from (
      select tablename
      from pg_policies
      where schemaname = 'public'
        and cmd = 'SELECT'
        and 'authenticated' = any (roles)
      group by tablename
      having count(*) > 1
    ) as policy_overlaps
  ),
  0,
  'authenticated sessions have no overlapping permissive SELECT policies'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'media'
      and is_nullable = 'NO'
      and (
        (column_name = 'mime_type' and data_type = 'text')
        or (column_name = 'size_bytes' and data_type = 'bigint')
      )
  ),
  2,
  'media requires MIME type and byte size metadata'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'slug'
  ),
  0,
  'posts use their UUID primary key as the only public identifier'
);

select is(
  (
    select count(*)::integer
    from pg_constraint
    where conname in ('posts_category_id_fkey', 'post_tags_tag_id_fkey')
      and confdeltype = 'r'
  ),
  2,
  'taxonomy foreign keys restrict deletes instead of changing related articles'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'posts'
      and indexname = 'posts_category_id_idx'
  ),
  'category references have a full supporting index'
);

-- Test fixtures are administrative setup and are always rolled back. -------------

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '99999999-9999-4999-8999-999999999991',
    'authenticated',
    'authenticated',
    'rls-owner@example.invalid',
    'not-used',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '99999999-9999-4999-8999-999999999992',
    'authenticated',
    'authenticated',
    'rls-reader@example.invalid',
    'not-used',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, display_name, role)
values ('99999999-9999-4999-8999-999999999991', 'RLS Owner', 'owner');

insert into public.categories (id, name, slug)
values
  ('99999999-9999-4999-8999-999999999901', 'Public category', 'rls-public-category'),
  ('99999999-9999-4999-8999-999999999902', 'Draft category', 'rls-draft-category');

insert into public.tags (id, name, slug)
values
  ('99999999-9999-4999-8999-999999999911', 'Public tag', 'rls-public-tag'),
  ('99999999-9999-4999-8999-999999999912', 'Draft tag', 'rls-draft-tag');

insert into public.media (id, object_path, alt_text, mime_type, size_bytes)
values
  (
    '99999999-9999-4999-8999-999999999921',
    'rls/public-cover.webp',
    'Public cover',
    'image/webp',
    1024
  ),
  (
    '99999999-9999-4999-8999-999999999922',
    'rls/draft-cover.webp',
    'Draft cover',
    'image/webp',
    2048
  );

insert into public.posts (
  id,
  title,
  content,
  cover_media_id,
  category_id,
  status,
  deleted_at
)
values
  (
    '99999999-9999-4999-8999-999999999931',
    'Public post',
    'Published content',
    '99999999-9999-4999-8999-999999999921',
    '99999999-9999-4999-8999-999999999901',
    'published',
    null
  ),
  (
    '99999999-9999-4999-8999-999999999932',
    'Draft post',
    'Draft content',
    '99999999-9999-4999-8999-999999999922',
    '99999999-9999-4999-8999-999999999902',
    'draft',
    null
  ),
  (
    '99999999-9999-4999-8999-999999999933',
    'Deleted post',
    'Deleted content',
    null,
    '99999999-9999-4999-8999-999999999901',
    'archived',
    now()
  ),
  (
    '99999999-9999-4999-8999-999999999934',
    'Service draft',
    'Service draft content',
    null,
    null,
    'draft',
    null
  );

insert into public.post_tags (post_id, tag_id)
values
  ('99999999-9999-4999-8999-999999999931', '99999999-9999-4999-8999-999999999911'),
  ('99999999-9999-4999-8999-999999999932', '99999999-9999-4999-8999-999999999912'),
  ('99999999-9999-4999-8999-999999999933', '99999999-9999-4999-8999-999999999911');

insert into storage.buckets (id, name, public)
values ('rls-private-images', 'rls-private-images', false);

-- Anonymous visitors -------------------------------------------------------------

set local role anon;
set local request.jwt.claim.sub = '';
set local request.jwt.claim.role = 'anon';

select is(
  (
    select count(*)::integer from public.posts
    where id = any (array[
      '99999999-9999-4999-8999-999999999931',
      '99999999-9999-4999-8999-999999999932',
      '99999999-9999-4999-8999-999999999933',
      '99999999-9999-4999-8999-999999999934'
    ]::uuid[])
  ),
  1,
  'anon reads only the public fixture post'
);
select is(
  (
    select count(*)::integer from public.categories
    where id = any (array[
      '99999999-9999-4999-8999-999999999901',
      '99999999-9999-4999-8999-999999999902'
    ]::uuid[])
  ),
  1,
  'anon reads only fixture categories used by public posts'
);
select is(
  (
    select count(*)::integer from public.tags
    where id = any (array[
      '99999999-9999-4999-8999-999999999911',
      '99999999-9999-4999-8999-999999999912'
    ]::uuid[])
  ),
  1,
  'anon reads only fixture tags used by public posts'
);
select is(
  (
    select count(*)::integer from public.post_tags
    where post_id = any (array[
      '99999999-9999-4999-8999-999999999931',
      '99999999-9999-4999-8999-999999999932',
      '99999999-9999-4999-8999-999999999933'
    ]::uuid[])
  ),
  1,
  'anon reads only public fixture post-tag relations'
);
select is(
  (
    select count(*)::integer from public.media
    where id = any (array[
      '99999999-9999-4999-8999-999999999921',
      '99999999-9999-4999-8999-999999999922'
    ]::uuid[])
  ),
  1,
  'anon reads only public fixture cover media'
);

select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  'permission denied for table profiles',
  'anon cannot read profiles'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('post-images', 'rls/anon.webp')$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'anon cannot upload post images'
);

-- Authenticated non-owner --------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999992';
set local request.jwt.claim.role = 'authenticated';

select is(
  (
    select count(*)::integer from public.posts
    where id = any (array[
      '99999999-9999-4999-8999-999999999931',
      '99999999-9999-4999-8999-999999999932',
      '99999999-9999-4999-8999-999999999933',
      '99999999-9999-4999-8999-999999999934'
    ]::uuid[])
  ),
  1,
  'a non-owner reads only the public fixture post'
);
select is(
  (
    select count(*)::integer from public.categories
    where id = any (array[
      '99999999-9999-4999-8999-999999999901',
      '99999999-9999-4999-8999-999999999902'
    ]::uuid[])
  ),
  1,
  'a non-owner reads only public fixture categories'
);
select is(
  (
    select count(*)::integer from public.tags
    where id = any (array[
      '99999999-9999-4999-8999-999999999911',
      '99999999-9999-4999-8999-999999999912'
    ]::uuid[])
  ),
  1,
  'a non-owner reads only public fixture tags'
);
select is(
  (
    select count(*)::integer from public.post_tags
    where post_id = any (array[
      '99999999-9999-4999-8999-999999999931',
      '99999999-9999-4999-8999-999999999932',
      '99999999-9999-4999-8999-999999999933'
    ]::uuid[])
  ),
  1,
  'a non-owner reads only public fixture post-tag relations'
);
select is(
  (
    select count(*)::integer from public.media
    where id = any (array[
      '99999999-9999-4999-8999-999999999921',
      '99999999-9999-4999-8999-999999999922'
    ]::uuid[])
  ),
  1,
  'a non-owner reads only public fixture cover media'
);
select is((select count(*)::integer from public.profiles), 0, 'a non-owner cannot read the owner profile');

select throws_ok(
  $$insert into public.posts (title, status) values ('Forbidden', 'draft')$$,
  '42501',
  'new row violates row-level security policy for table "posts"',
  'a non-owner cannot create drafts'
);

select throws_ok(
  $$insert into public.categories (name, slug) values ('Forbidden', 'rls-reader-category')$$,
  '42501',
  'new row violates row-level security policy for table "categories"',
  'a non-owner cannot create categories'
);

select throws_ok(
  $$insert into public.media (object_path, mime_type, size_bytes) values ('rls/reader.webp', 'image/webp', 1024)$$,
  '42501',
  'new row violates row-level security policy for table "media"',
  'a non-owner cannot create media metadata'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('post-images', 'rls/reader.webp')$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a non-owner cannot upload post images'
);

-- Owner session -----------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999991';
set local request.jwt.claim.role = 'authenticated';

select is(
  (
    select count(*)::integer from public.posts
    where id = any (array[
      '99999999-9999-4999-8999-999999999931',
      '99999999-9999-4999-8999-999999999932',
      '99999999-9999-4999-8999-999999999933',
      '99999999-9999-4999-8999-999999999934'
    ]::uuid[])
  ),
  4,
  'owner reads every fixture post'
);
select is(
  (
    select count(*)::integer from public.categories
    where id = any (array[
      '99999999-9999-4999-8999-999999999901',
      '99999999-9999-4999-8999-999999999902'
    ]::uuid[])
  ),
  2,
  'owner reads every fixture category'
);
select is(
  (
    select count(*)::integer from public.tags
    where id = any (array[
      '99999999-9999-4999-8999-999999999911',
      '99999999-9999-4999-8999-999999999912'
    ]::uuid[])
  ),
  2,
  'owner reads every fixture tag'
);
select is(
  (
    select count(*)::integer from public.post_tags
    where post_id = any (array[
      '99999999-9999-4999-8999-999999999931',
      '99999999-9999-4999-8999-999999999932',
      '99999999-9999-4999-8999-999999999933'
    ]::uuid[])
  ),
  3,
  'owner reads every fixture post-tag relation'
);
select is(
  (
    select count(*)::integer from public.media
    where id = any (array[
      '99999999-9999-4999-8999-999999999921',
      '99999999-9999-4999-8999-999999999922'
    ]::uuid[])
  ),
  2,
  'owner reads every fixture media row'
);
select is((select count(*)::integer from public.profiles), 1, 'owner reads their own profile');

select lives_ok(
  $$insert into public.posts (id, title, status)
    values ('99999999-9999-4999-8999-999999999935', 'Owner draft', 'draft')$$,
  'owner can create a draft'
);

select throws_ok(
  $$insert into public.posts (title, status) values ('Direct publish', 'published')$$,
  '42501',
  'new row violates row-level security policy for table "posts"',
  'owner cannot insert a published post directly'
);

select throws_ok(
  $$update public.posts set status = 'published' where id = '99999999-9999-4999-8999-999999999935'$$,
  '42501',
  'new row violates row-level security policy for table "posts"',
  'owner cannot publish through the authenticated Data API role'
);

select is(
  (select status::text from public.posts where id = '99999999-9999-4999-8999-999999999935'),
  'draft',
  'a rejected direct publish leaves the draft unchanged'
);

select lives_ok(
  $$update public.posts
    set status = 'archived', deleted_at = now()
    where id = '99999999-9999-4999-8999-999999999935'$$,
  'owner can soft-delete a draft'
);

select ok(
  exists (
    select 1 from public.posts
    where id = '99999999-9999-4999-8999-999999999935'
      and status = 'archived'
      and deleted_at is not null
      and published_at is null
  ),
  'soft deletion archives the post and keeps it unpublished'
);

select throws_ok(
  $$delete from public.posts where id = '99999999-9999-4999-8999-999999999935'$$,
  '42501',
  'permission denied for table posts',
  'owner cannot physically delete posts'
);

select throws_ok(
  $$delete from public.media where id = '99999999-9999-4999-8999-999999999922'$$,
  '42501',
  'permission denied for table media',
  'owner cannot physically delete media metadata'
);

select throws_ok(
  $$insert into public.post_tags (post_id, tag_id)
    values ('99999999-9999-4999-8999-999999999931', '99999999-9999-4999-8999-999999999912')$$,
  '42501',
  'new row violates row-level security policy "post tags require an editable post for insert" for table "post_tags"',
  'owner cannot add a tag relation to a published post'
);

select is_empty(
  $$delete from public.post_tags
    where post_id = '99999999-9999-4999-8999-999999999931'
      and tag_id = '99999999-9999-4999-8999-999999999911'
    returning 1$$,
  'owner cannot remove a tag relation from a published post'
);

select is_empty(
  $$update public.categories
    set name = 'Forbidden published category edit'
    where id = '99999999-9999-4999-8999-999999999901'
    returning 1$$,
  'owner cannot update a category used by a published post'
);

select is_empty(
  $$delete from public.categories
    where id = '99999999-9999-4999-8999-999999999901'
    returning 1$$,
  'owner cannot delete a referenced category'
);

select is_empty(
  $$update public.tags
    set name = 'Forbidden published tag edit'
    where id = '99999999-9999-4999-8999-999999999911'
    returning 1$$,
  'owner cannot update a tag used by a published post'
);

select is_empty(
  $$delete from public.tags
    where id = '99999999-9999-4999-8999-999999999911'
    returning 1$$,
  'owner cannot delete a referenced tag'
);

select is_empty(
  $$update public.media
    set alt_text = 'Forbidden published cover edit'
    where id = '99999999-9999-4999-8999-999999999921'
    returning 1$$,
  'owner cannot update cover metadata used by a published post'
);

select ok(
  (select name = 'Public category' from public.categories where id = '99999999-9999-4999-8999-999999999901')
  and (select name = 'Public tag' from public.tags where id = '99999999-9999-4999-8999-999999999911')
  and (select alt_text = 'Public cover' from public.media where id = '99999999-9999-4999-8999-999999999921')
  and exists (
    select 1 from public.post_tags
    where post_id = '99999999-9999-4999-8999-999999999931'
      and tag_id = '99999999-9999-4999-8999-999999999911'
  )
  and not exists (
    select 1 from public.post_tags
    where post_id = '99999999-9999-4999-8999-999999999931'
      and tag_id = '99999999-9999-4999-8999-999999999912'
  ),
  'rejected metadata writes leave the published article unchanged'
);

select lives_ok(
  $sql$
    do $block$
    begin
      update public.categories set name = 'Updated draft category'
      where id = '99999999-9999-4999-8999-999999999902';
      update public.tags set name = 'Updated draft tag'
      where id = '99999999-9999-4999-8999-999999999912';
      update public.media set alt_text = 'Updated draft cover'
      where id = '99999999-9999-4999-8999-999999999922';
    end
    $block$
  $sql$,
  'owner can update metadata referenced only by drafts'
);

select lives_ok(
  $sql$
    do $block$
    begin
      insert into public.categories (id, name, slug)
      values ('99999999-9999-4999-8999-999999999903', 'Owner category', 'rls-owner-category');
      update public.categories set name = 'Updated category'
      where id = '99999999-9999-4999-8999-999999999903';
      delete from public.categories where id = '99999999-9999-4999-8999-999999999903';
    end
    $block$
  $sql$,
  'owner can create, update and delete categories'
);

select lives_ok(
  $sql$
    do $block$
    begin
      insert into public.media (id, object_path, alt_text, mime_type, size_bytes)
      values (
        '99999999-9999-4999-8999-999999999923',
        'rls/owner.webp',
        'Owner media',
        'image/webp',
        3072
      );
      update public.media set alt_text = 'Updated owner media'
      where id = '99999999-9999-4999-8999-999999999923';
    end
    $block$
  $sql$,
  'owner can create and update media metadata'
);

select throws_ok(
  $$insert into public.media (object_path, mime_type, size_bytes) values ('rls/invalid.svg', 'image/svg+xml', 1024)$$,
  '23514',
  'new row for relation "media" violates check constraint "media_mime_type_is_supported"',
  'media rejects MIME types outside the Storage allowlist'
);

select throws_ok(
  $$insert into public.media (object_path, mime_type, size_bytes) values ('rls/oversized.webp', 'image/webp', 5242881)$$,
  '23514',
  'new row for relation "media" violates check constraint "media_size_bytes_is_valid"',
  'media rejects files larger than the Storage limit'
);

select lives_ok(
  $sql$
    do $block$
    begin
      insert into public.post_tags (post_id, tag_id)
      values ('99999999-9999-4999-8999-999999999932', '99999999-9999-4999-8999-999999999911');
      delete from public.post_tags
      where post_id = '99999999-9999-4999-8999-999999999932'
        and tag_id = '99999999-9999-4999-8999-999999999911';
    end
    $block$
  $sql$,
  'owner can create and delete post-tag relations'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('post-images', 'rls/owner.webp', '99999999-9999-4999-8999-999999999991')$$,
  'owner can upload a post image object'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('rls-private-images', 'rls/wrong-bucket.webp', '99999999-9999-4999-8999-999999999991')$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'owner cannot upload through the post-images policy to another bucket'
);

select is_empty(
  $$update storage.objects
    set name = 'rls/owner-renamed.webp'
    where bucket_id = 'post-images' and name = 'rls/owner.webp'
    returning 1$$,
  'owner cannot update Storage objects'
);

select throws_ok(
  $$delete from storage.objects
    where bucket_id = 'post-images' and name = 'rls/owner.webp'
    returning 1$$,
  '42501',
  'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'owner cannot delete Storage objects'
);

-- Service role used by the Nitro publish endpoint -------------------------------

reset role;
set local role service_role;
set local request.jwt.claim.sub = '';
set local request.jwt.claim.role = 'service_role';

select is(
  (
    select count(*)::integer from public.posts
    where id = any (array[
      '99999999-9999-4999-8999-999999999931',
      '99999999-9999-4999-8999-999999999932',
      '99999999-9999-4999-8999-999999999933',
      '99999999-9999-4999-8999-999999999934',
      '99999999-9999-4999-8999-999999999935'
    ]::uuid[])
  ),
  5,
  'service role can read fixture posts required by publishing'
);

select lives_ok(
  $$update public.posts
    set status = 'published', deleted_at = null
    where id = '99999999-9999-4999-8999-999999999934'$$,
  'service role can publish an active draft'
);

select ok(
  exists (
    select 1 from public.posts
    where id = '99999999-9999-4999-8999-999999999934'
      and status = 'published'
      and published_at is not null
      and published_at <= now()
  ),
  'the publication trigger assigns the service-published timestamp'
);

select throws_ok(
  $$insert into public.posts (title, status) values ('Forbidden', 'draft')$$,
  '42501',
  'permission denied for table posts',
  'service role cannot insert posts'
);

select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  'permission denied for table profiles',
  'service role cannot read profiles'
);

select throws_ok(
  $$update public.categories set name = name where id = '99999999-9999-4999-8999-999999999901'$$,
  '42501',
  'permission denied for table categories',
  'service role cannot update taxonomy'
);

select throws_ok(
  $$delete from public.posts where id = '99999999-9999-4999-8999-999999999934'$$,
  '42501',
  'permission denied for table posts',
  'service role cannot delete posts'
);

select throws_ok(
  $$update public.posts
    set published_at = now() - interval '1 day'
    where id = '99999999-9999-4999-8999-999999999934'$$,
  'P0001',
  'published_at cannot be edited directly',
  'service role cannot edit an existing publication timestamp directly'
);

-- Final cross-role verification -------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claim.sub = '';
set local request.jwt.claim.role = 'anon';

select is(
  (
    select count(*)::integer from public.posts
    where id = any (array[
      '99999999-9999-4999-8999-999999999931',
      '99999999-9999-4999-8999-999999999932',
      '99999999-9999-4999-8999-999999999933',
      '99999999-9999-4999-8999-999999999934',
      '99999999-9999-4999-8999-999999999935'
    ]::uuid[])
  ),
  2,
  'anon sees the newly service-published fixture post'
);
select is(
  (
    select count(*)::integer from public.posts
    where id in ('99999999-9999-4999-8999-999999999933', '99999999-9999-4999-8999-999999999935')
  ),
  0,
  'anon cannot see either archived soft-deleted post'
);

reset role;

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id in ('post-images', 'rls-private-images')
      and name in (
        'rls/anon.webp',
        'rls/reader.webp',
        'rls/owner.webp',
        'rls/owner-renamed.webp',
        'rls/wrong-bucket.webp'
      )
  ),
  1,
  'only the owner post-images upload reached Storage'
);

select is(
  (
    select count(*)::integer
    from auth.users
    where id in (
      '99999999-9999-4999-8999-999999999991',
      '99999999-9999-4999-8999-999999999992'
    )
  ),
  2,
  'test users exist only inside the active rollback transaction'
);

select * from finish();
rollback;
