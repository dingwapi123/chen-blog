# Chen Blog

个人技术博客与独立 CMS 的 pnpm monorepo。架构与安全约束见 [V1.0.1 技术方案](docs/个人技术博客-技术方案-V1.0.1.md)。

## 开发

```bash
pnpm install
pnpm dev:blog
pnpm dev:cms
```

复制 `.env.example` 为本地环境文件后，再填入远程 Supabase 项目的 URL 与 publishable key。`NUXT_SUPABASE_SERVICE_ROLE_KEY` 仅允许存在于 Nuxt 服务端运行时配置中；本项目不依赖本地 Supabase/Docker。

## 验证

```bash
pnpm typecheck
pnpm build
```
