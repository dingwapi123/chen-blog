# Chen Blog

个人技术博客与独立 CMS 的 pnpm monorepo。架构与安全约束见 [V1.0.14 技术方案](docs/个人技术博客-技术方案-V1.0.14.md)。

公开端使用 Nuxt 4、Nuxt UI、Tailwind CSS v4、Comark 与 Nuxt Image；CMS 使用 Vue 3、Element Plus、CodeMirror 和自研内容工作台。工作台借鉴成熟 Vue 3 后台的信息架构，但不导入其权限、请求、主题或图表体系。两端统一使用 `@lucide/vue` 图标并支持系统/手动浅色与暗色主题。CMS V1 只编辑 Markdown/Comark 源码，不提供草稿最终预览，也不引入 Tailwind、ECharts、`vue-echarts` 或 Yjs。

公开博客通过同源 Nitro DTO 接口读取 Supabase，CMS 普通管理仍由 JWT 与 RLS 保护并直接访问 Supabase。公开日期统一按 `Asia/Shanghai` 展示；RSS 只分发经过 XML 转义的文章摘要；Netlify 页面与公开接口经单层 CDN 严格缓存 600 秒，到期必须重验证，并按 `chen-blog-theme` Cookie 隔离缓存。在线数据只来自专用远程 Supabase，本项目不启动本地 Supabase 或 Docker。

## 开发

```bash
pnpm install
cp apps/blog-web/.env.example apps/blog-web/.env
cp apps/cms-admin/.env.example apps/cms-admin/.env
pnpm dev:blog
pnpm dev:cms
```

分别填写两个应用目录中的环境文件。`NUXT_SUPABASE_PUBLISHABLE_KEY` 仅供 Nitro 的 RLS 公开查询使用；`NUXT_SUPABASE_SERVICE_ROLE_KEY` 只允许出现在 `blog-web` 的服务端运行时配置中，不得复制到 CMS 或任何 `VITE_` / `NUXT_PUBLIC_` 变量。本项目只连接专用远程 Supabase，不启动本地 Supabase 或 Docker。

数据库维护需要 Supabase CLI `2.109.1` 或更高版本。首次在新机器上先执行 `pnpm db:link`；随后使用 `pnpm db:push` 应用 migration、`pnpm db:types` 生成类型。`pnpm db:test` 通过 Management API 的 `db query --linked` 直接测试这个专用远程项目，不启动 Docker；测试文件使用事务回滚，禁止连接生产共享数据库。

`pnpm db:seed` 可重复把中文占位文章写入远程数据库，仅用于开发或演示；它不会创建 owner，也不是应用的运行时 mock。正式内容准备完成后可以在 CMS 中替换这些占位内容。博客在任何环境都必须配置远程 Supabase，缺少配置时不会回退到代码内置文章。

## 首次上线

1. 在 Supabase Auth 中关闭公开注册，通过 Dashboard 创建唯一的邮箱密码用户，再为其 UID 写入 `profiles(role = 'owner')`；Auth Site URL 指向生产 CMS。
2. 为 Netlify 建立两个独立站点，package directory 分别设置为 `apps/blog-web` 与 `apps/cms-admin`，base directory 保持仓库根目录。
3. 博客站点配置 `NUXT_PUBLIC_SITE_URL`、`NUXT_PUBLIC_SUPABASE_URL`、`NUXT_SUPABASE_PUBLISHABLE_KEY`、`NUXT_SUPABASE_SERVICE_ROLE_KEY`、`NUXT_CMS_ORIGIN`。公开页面只请求同源 Nitro API，publishable key 仅由 Nitro 用于受 RLS 保护的公开查询。
4. CMS 站点只配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`、`VITE_BLOG_URL`。
5. 部署后检查登录、图片上传、草稿保存、发布接口的 CORS、公开文章、RSS、Sitemap、CMS 禁止索引与 CDN 严格 600 秒缓存头；现代 keys 工作正常后禁用 legacy JWT API keys。

## 验证

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm verify:production
```
