begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(57);

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
        ('authenticated', 'post_tags', 'UPDATE'),
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

insert into public.media (id, object_path, alt_text)
values
  ('99999999-9999-4999-8999-999999999921', 'rls/public-cover.webp', 'Public cover'),
  ('99999999-9999-4999-8999-999999999922', 'rls/draft-cover.webp', 'Draft cover');

insert into public.posts (
  id,
  title,
  slug,
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
    'rls-public-post',
    'Published content',
    '99999999-9999-4999-8999-999999999921',
    '99999999-9999-4999-8999-999999999901',
    'published',
    null
  ),
  (
    '99999999-9999-4999-8999-999999999932',
    'Draft post',
    'rls-draft-post',
    'Draft content',
    '99999999-9999-4999-8999-999999999922',
    '99999999-9999-4999-8999-999999999902',
    'draft',
    null
  ),
  (
    '99999999-9999-4999-8999-999999999933',
    'Deleted post',
    'rls-deleted-post',
    'Deleted content',
    null,
    '99999999-9999-4999-8999-999999999901',
    'archived',
    now()
  ),
  (
    '99999999-9999-4999-8999-999999999934',
    'Service draft',
    'rls-service-draft',
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

select is((select count(*)::integer from public.posts), 1, 'anon reads only the public post');
select is((select count(*)::integer from public.categories), 1, 'anon reads only categories used by public posts');
select is((select count(*)::integer from public.tags), 1, 'anon reads only tags used by public posts');
select is((select count(*)::integer from public.post_tags), 1, 'anon reads only public post-tag relations');
select is((select count(*)::integer from public.media), 1, 'anon reads only public cover media');

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

select is((select count(*)::integer from public.posts), 1, 'a non-owner reads only the public post');
select is((select count(*)::integer from public.categories), 1, 'a non-owner reads only public categories');
select is((select count(*)::integer from public.tags), 1, 'a non-owner reads only public tags');
select is((select count(*)::integer from public.post_tags), 1, 'a non-owner reads only public post-tag relations');
select is((select count(*)::integer from public.media), 1, 'a non-owner reads only public cover media');
select is((select count(*)::integer from public.profiles), 0, 'a non-owner cannot read the owner profile');

select throws_ok(
  $$insert into public.posts (title, slug, status) values ('Forbidden', 'rls-reader-post', 'draft')$$,
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
  $$insert into public.media (object_path) values ('rls/reader.webp')$$,
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

select is((select count(*)::integer from public.posts), 4, 'owner reads every post');
select is((select count(*)::integer from public.categories), 2, 'owner reads every category');
select is((select count(*)::integer from public.tags), 2, 'owner reads every tag');
select is((select count(*)::integer from public.post_tags), 3, 'owner reads every post-tag relation');
select is((select count(*)::integer from public.media), 2, 'owner reads every media row');
select is((select count(*)::integer from public.profiles), 1, 'owner reads their own profile');

select lives_ok(
  $$insert into public.posts (id, title, slug, status)
    values ('99999999-9999-4999-8999-999999999935', 'Owner draft', 'rls-owner-draft', 'draft')$$,
  'owner can create a draft'
);

select throws_ok(
  $$insert into public.posts (title, slug, status) values ('Direct publish', 'rls-direct-publish', 'published')$$,
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
      insert into public.media (id, object_path, alt_text)
      values ('99999999-9999-4999-8999-999999999923', 'rls/owner.webp', 'Owner media');
      update public.media set alt_text = 'Updated owner media'
      where id = '99999999-9999-4999-8999-999999999923';
    end
    $block$
  $sql$,
  'owner can create and update media metadata'
);

select lives_ok(
  $sql$
    do $block$
    begin
      insert into public.post_tags (post_id, tag_id)
      values ('99999999-9999-4999-8999-999999999935', '99999999-9999-4999-8999-999999999911');
      delete from public.post_tags
      where post_id = '99999999-9999-4999-8999-999999999935'
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

select is((select count(*)::integer from public.posts), 5, 'service role can read posts required by publishing');

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
  $$insert into public.posts (title, slug, status) values ('Forbidden', 'rls-service-insert', 'draft')$$,
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

select is((select count(*)::integer from public.posts), 2, 'anon sees the newly service-published post');
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
