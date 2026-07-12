import type { CategorySummary, PostDetail, PostPreview, TagSummary } from '@chen-blog/shared-types'
import { calculateReadingMinutes } from '@chen-blog/shared-utils'

const categories: CategorySummary[] = [
  { id: 'engineering', name: '工程实践', slug: 'engineering', description: '关于构建、维护与交付软件的记录。' },
  { id: 'notes', name: '学习笔记', slug: 'notes', description: '把值得长期复用的理解写下来。' },
  { id: 'tools', name: '工具与效率', slug: 'tools', description: '减少摩擦，让注意力回到真正重要的事情。' },
]

const tags: TagSummary[] = [
  { id: 'vue', name: 'Vue', slug: 'vue' },
  { id: 'nuxt', name: 'Nuxt', slug: 'nuxt' },
  { id: 'typescript', name: 'TypeScript', slug: 'typescript' },
  { id: 'writing', name: '写作', slug: 'writing' },
  { id: 'workflow', name: '工作流', slug: 'workflow' },
]

const contents = {
  'starting-a-personal-blog': `# 从一个空仓库开始\n\n一个个人博客最难的部分，常常不是把页面做出来，而是决定什么值得长期维护。\n\n## 先保留一条稳定的内容链路\n\n文章、分类、标签和图片都只有一个数据源。这样写作时不需要在多个系统之间同步，也能让发布过程保持可预期。\n\n> 好的约束不是限制表达，而是把注意力从重复的选择中释放出来。\n\n\`\`\`ts\nconst focus = ['写作', '阅读', '持续迭代']\n\`\`\`\n\n接下来再慢慢补充真正需要的能力。`,
  'small-verifiable-steps': `# 把复杂问题拆成可以验证的小步骤\n\n开始一个新项目时，最有价值的不是马上写很多代码，而是先找到能验证方向的最小闭环。\n\n## 每一步都要能回答一个问题\n\n例如：数据是否安全？页面是否可读？发布是否可靠？\n\n把答案写进测试和约束里，后续的选择就会更少依赖记忆。`,
  'tools-should-step-back': `# 让工具退后一步\n\n工具应该降低摩擦，而不是不断要求注意力。\n\n## 一个简单原则\n\n当一个流程需要解释太多次，它就值得被重新设计。\n\n- 保留明确的默认值\n- 删除暂时没有收益的选项\n- 为重要操作提供反馈\n\n这样才有空间做真正重要的事。`,
} as const

const previews: PostPreview[] = [
  {
    id: 'starting-a-personal-blog', title: '从一个空仓库开始：为个人博客保留足够的克制', slug: 'starting-a-personal-blog', summary: '技术栈并不决定一篇文章的质量，但会决定你是否愿意持续写下去。', publishedAt: '2026-07-08T08:00:00.000Z', updatedAt: '2026-07-08T08:00:00.000Z', category: { name: '工程实践', slug: 'engineering' }, tags: [tags[1]!, tags[2]!], readingMinutes: calculateReadingMinutes(contents['starting-a-personal-blog']),
  },
  {
    id: 'small-verifiable-steps', title: '把复杂问题拆成可以验证的小步骤', slug: 'small-verifiable-steps', summary: '当每一步都有明确输入、输出和检查方式，复杂项目会变得更容易推进。', publishedAt: '2026-07-03T08:00:00.000Z', updatedAt: '2026-07-03T08:00:00.000Z', category: { name: '学习笔记', slug: 'notes' }, tags: [tags[3]!, tags[4]!], readingMinutes: calculateReadingMinutes(contents['small-verifiable-steps']),
  },
  {
    id: 'tools-should-step-back', title: '让工具退后一步，让思考留在前面', slug: 'tools-should-step-back', summary: '工具的价值不是增加可见的复杂度，而是让工作本身更流畅。', publishedAt: '2026-06-28T08:00:00.000Z', updatedAt: '2026-06-28T08:00:00.000Z', category: { name: '工具与效率', slug: 'tools' }, tags: [tags[4]!], readingMinutes: calculateReadingMinutes(contents['tools-should-step-back']),
  },
]

export function getDemoPosts(): PostPreview[] { return previews }
export function getDemoPost(slug: string): PostDetail | null {
  const preview = previews.find((post) => post.slug === slug)
  if (!preview) return null
  return { ...preview, content: contents[slug as keyof typeof contents], cover: null }
}
export function getDemoCategories(): CategorySummary[] { return categories }
export function getDemoTags(): TagSummary[] { return tags }
