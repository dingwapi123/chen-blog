# Chen Blog workspace

- 使用 pnpm workspace；在根目录安装依赖并提交 `pnpm-lock.yaml`。
- 浏览器代码只能读取 publishable key。`NUXT_SUPABASE_SERVICE_ROLE_KEY` 只能由 Nuxt Nitro 的私有运行时配置使用，且必须先验证用户身份与 owner 角色。
- 所有 Supabase schema 变更使用 `supabase migration new` 创建 migration；为 exposed schema 表显式配置 `GRANT`、RLS 与 policy。
- V1.0.0 禁止文章物理删除；通过 `deleted_at` 与 `status = 'archived'` 软删除。
- 发布请求只允许 CMS Origin，并由 `publish.options.ts` 处理预检；不要开启全局 CORS。
- 修改前先阅读所在目录的 `AGENTS.md`；根规则适用于所有子目录。
