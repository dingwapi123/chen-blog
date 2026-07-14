---
name: blog-project-workflow
description: Implement and review the Chen Blog monorepo. Use when changing Nuxt public pages, Vue CMS features, Supabase migrations or RLS, Markdown rendering, publishing, deployment configuration, or workspace packages in this repository.
---

# Blog Project Workflow

Read the root `AGENTS.md`, the relevant app-level `AGENTS.md`, and `docs/个人技术博客-技术方案-V1.0.5.md` before changing architecture-sensitive code.

## Workflow

1. Keep public-blog code in `apps/blog-web` and CMS-only code in `apps/cms-admin`.
2. Put reusable database, Markdown, utility, and DTO code in the matching `packages/*` package; do not duplicate it across apps.
3. Create Supabase changes through migrations. Include explicit grants, RLS policies, and tests for every exposed table.
4. Keep browser clients on publishable keys. Verify token, owner role, and Origin before Nitro uses server-only credentials.
5. Run the relevant typecheck/build before handing off a change. Every architectural decision change creates a new technical-plan patch version and updates its filename and workspace references.

## V1.0.0 guardrails

- Publish only through the Nitro endpoint; direct CMS writes may not set `status` to `published`.
- Soft-delete articles; do not add physical post or media deletion.
- Treat `post-images` as public immediately on upload.
- Keep Netlify ISR at 600 seconds and do not add a second HTML cache layer.
