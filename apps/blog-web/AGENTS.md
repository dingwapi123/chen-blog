# Blog web rules

- 此应用负责公开 SSR 页面、SEO、RSS、Sitemap 与 Nitro 管理接口。
- 公开数据查询使用 publishable key 与 RLS；禁止为读取公开内容引入 service role。
- `server/api/admin/**` 必须验证 Supabase access token、owner profile 和精确 CORS Origin。
- `runtimeConfig.public` 不得包含服务端密钥。
- 文章页面只读取 `published`、发布时间已到且未软删除的内容。
