-- The sample content seed intentionally has no owner account.
-- Create the Auth user through Supabase Dashboard, then insert its UID into profiles
-- using a controlled administrative SQL session.
insert into public.categories (id, name, slug, description)
values
  ('11111111-1111-4111-8111-111111111111', '工程实践', 'engineering', '关于构建、维护与交付软件的记录。'),
  ('22222222-2222-4222-8222-222222222222', '学习笔记', 'notes', '把值得长期复用的理解写下来。'),
  ('33333333-3333-4333-8333-333333333333', '工具与效率', 'tools', '减少摩擦，让注意力回到真正重要的事情。')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description;

insert into public.tags (id, name, slug)
values
  ('11111111-1111-4111-8111-aaaaaaaaaaaa', 'Vue', 'vue'),
  ('22222222-2222-4222-8222-bbbbbbbbbbbb', 'Nuxt', 'nuxt'),
  ('33333333-3333-4333-8333-cccccccccccc', 'TypeScript', 'typescript'),
  ('44444444-4444-4444-8444-dddddddddddd', '写作', 'writing'),
  ('55555555-5555-4555-8555-eeeeeeeeeeee', '工作流', 'workflow')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug;

insert into public.posts (id, title, summary, content, category_id, status)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '从一个空仓库开始：为个人博客保留足够的克制',
    '技术栈并不决定一篇文章的质量，但会决定你是否愿意持续写下去。',
    E'一个个人博客最难的部分，常常不是把页面做出来，而是决定什么值得长期维护。\n\n## 先保留一条稳定的内容链路\n\n文章、分类、标签和图片都只有一个数据源。这样写作时不需要在多个系统之间同步，也能让发布过程保持可预期。\n\n> 好的约束不是限制表达，而是把注意力从重复的选择中释放出来。\n\n```ts\nconst focus = [\"写作\", \"阅读\", \"持续迭代\"]\n```\n\n接下来再慢慢补充真正需要的能力。',
    '11111111-1111-4111-8111-111111111111',
    'published'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '把复杂问题拆成可以验证的小步骤',
    '当每一步都有明确输入、输出和检查方式，复杂项目会变得更容易推进。',
    E'开始一个新项目时，最有价值的不是马上写很多代码，而是先找到能验证方向的最小闭环。\n\n## 每一步都要能回答一个问题\n\n例如：数据是否安全？页面是否可读？发布是否可靠？\n\n把答案写进测试和约束里，后续的选择就会更少依赖记忆。',
    '22222222-2222-4222-8222-222222222222',
    'published'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '让工具退后一步，让思考留在前面',
    '工具的价值不是增加可见的复杂度，而是让工作本身更流畅。',
    E'工具应该降低摩擦，而不是不断要求注意力。\n\n## 一个简单原则\n\n当一个流程需要解释太多次，它就值得被重新设计。\n\n- 保留明确的默认值\n- 删除暂时没有收益的选项\n- 为重要操作提供反馈\n\n这样才有空间做真正重要的事。',
    '33333333-3333-4333-8333-333333333333',
    'published'
  )
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  content = excluded.content,
  category_id = excluded.category_id,
  status = excluded.status,
  deleted_at = null;

insert into public.post_tags (post_id, tag_id)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-bbbbbbbbbbbb'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-cccccccccccc'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-8444-dddddddddddd'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '55555555-5555-4555-8555-eeeeeeeeeeee'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '55555555-5555-4555-8555-eeeeeeeeeeee')
on conflict (post_id, tag_id) do nothing;
