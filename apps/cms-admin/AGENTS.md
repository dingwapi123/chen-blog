# CMS admin rules

- 此应用是独立 Vue SPA；不得嵌入或依赖 Nuxt 服务端密钥。
- 只提供登录、登出、修改当前密码和 V1.0.0 内容管理能力，不提供注册或用户管理。
- 草稿、分类、标签和媒体操作通过 Supabase RLS 执行；发布只能调用 Nuxt Nitro 发布接口。
- 不将 `published_at` 作为可编辑字段，也不提供图片物理删除。
