# Chen Blog

个人技术博客与独立 CMS 的 pnpm monorepo。架构与安全约束见 [V1.0.2 技术方案](docs/个人技术博客-技术方案-V1.0.2.md)。

## 开发

```bash
pnpm install
pnpm dev:blog
pnpm dev:cms
```

复制 `.env.example` 为本地环境文件后，再填入远程 Supabase 项目的 URL 与 publishable key。`NUXT_SUPABASE_SERVICE_ROLE_KEY` 仅允许存在于 Nuxt 服务端运行时配置中；本项目不依赖本地 Supabase/Docker。

首次在新机器上维护数据库时，先执行 `pnpm db:link` 连接远程项目；随后使用 `pnpm db:push` 应用 migration、`pnpm db:types` 生成类型。`pnpm db:test` 在这个专用远程项目中运行并回滚测试事务，禁止连接生产共享数据库。

## 验证

```bash
pnpm typecheck
pnpm build
```
