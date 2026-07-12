begin;

select plan(8);

select ok((select relrowsecurity from pg_class where oid = 'public.posts'::regclass), 'posts enables RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.media'::regclass), 'media enables RLS');
select ok(has_table_privilege('anon', 'public.posts', 'select'), 'anon can select posts through RLS');
select ok(not has_table_privilege('anon', 'public.posts', 'delete'), 'anon cannot delete posts');
select ok(not has_table_privilege('authenticated', 'public.media', 'delete'), 'authenticated users cannot delete media metadata');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '99999999-9999-4999-8999-999999999999',
  'authenticated', 'authenticated', 'owner@example.com', 'not-used',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.profiles (id, display_name, role)
values ('99999999-9999-4999-8999-999999999999', 'Test Owner', 'owner');

set local role authenticated;
select set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$insert into public.posts (id, title, slug, summary, content, status)
    values ('88888888-8888-4888-8888-888888888888', 'Draft', 'rls-draft', '', '', 'draft')$$,
  'owner can create a draft'
);

select throws_ok(
  $$update public.posts set status = 'published' where id = '88888888-8888-4888-8888-888888888888'$$,
  '42501',
  'new row violates row-level security policy for table "posts"',
  'owner cannot directly publish through the Data API role'
);

select is(
  (select count(*)::integer from public.posts where id = '88888888-8888-4888-8888-888888888888' and status = 'published'),
  0,
  'direct publishing leaves no published post'
);

select * from finish();
rollback;
