# Chen Blog Design System — The Engineering Editorial

> **版本**：V1.0.0
> **适用范围**：公开博客与 CMS 管理后台
> **设计北极星**：Digital Curator（数字策展人）

## 1. 设计意图

Chen Blog 应像一本由工程师持续编辑的独立刊物：安静、有秩序、有技术判断，但不冷漠。它拒绝模板化博客、SaaS 仪表盘式卡片墙与“所有信息都等权”的拥挤感。

视觉品质来自 **不对称构图、留白、色调层级与编辑排版**，而不是边框、阴影或装饰数量。每个区块只承担一个阅读任务：首页建立气质，列表帮助扫读，文章支持沉浸阅读，CMS 帮助完成操作。

### 设计执行主张

- **视觉主张**：暖灰纸张、深青绿油墨、轻微网格纹理与高对比标题。
- **内容主张**：首页为“站点名 → 观点 → 行动”的单一构图；不使用 hero 卡片、数据条或 Logo 墙。
- **交互主张**：文字入场、列表 hover、主题切换三种轻量动效；任何动效都不改变信息结构。

## 2. 基础原则

### 2.1 No-Line Rule

禁止用 1px 实线作为页面区块、列表项或卡片的常规分隔手段。结构优先使用留白与 surface 色调变化表达；交互容器通过 surface 层级获得“纸叠在纸上”的深度。

仅在以下情况可用 **Ghost Border**：键盘焦点、表单控件、暗色模式中无法辨识的浮层边缘。Ghost Border 使用 `--outline-ghost`，不使用不透明描边。

### 2.2 色调分层优先于阴影

常规组件不加阴影。导航、弹层等确有漂浮语义的元素可使用 `0 4px 24px color-mix(in srgb, var(--accent) 12%, transparent)`，且必须同时有半透明 surface 与 `backdrop-filter: blur(20px)`。

### 2.3 字体的职责分离

- **阅读与主标题**：`Source Han Serif SC / Noto Serif SC / Songti SC`，传达人文与编辑感。
- **操作、导航、元信息**：`Avenir Next / PingFang SC / Microsoft YaHei`，传达工程精度。
- **代码**：`JetBrains Mono / Fira Code / ui-monospace`。

公开端不额外引入第三种正文字体。CMS 以 UI 字体为主，仅 Markdown 预览沿用阅读字体。

## 3. Token 系统

组件只能使用语义 token；十六进制值只能定义在全局主题样式中。

### 3.1 Surface、文本与强调色

| Token | Light | Dark | 语义 |
| --- | --- | --- | --- |
| `--surface` | `#F7F5F0` | `#171B1E` | 页面画布 |
| `--surface-low` | `#EEECE6` | `#1E2528` | 次级区块、引用、hover |
| `--surface-container` | `#F3F0E9` | `#21282B` | 导航与轻容器 |
| `--surface-high` | `#E8E5DD` | `#2A3235` | toggle、表单与高交互容器 |
| `--surface-highest` | `#DED9CF` | `#343D40` | 代码浅色表层、强交互背景 |
| `--surface-elevated` | `#FFFDF9` | `#252D30` | 弹层与纸张抬升层 |
| `--on-surface` | `#1F1F1D` | `#ECE9E2` | 主文字 |
| `--on-surface-muted` | `#61615D` | `#B1AEA8` | 辅助文字 |
| `--on-surface-faint` | `#8B8881` | `#7D8586` | 弱提示 |
| `--accent` | `#0F8A5F` | `#45C597` | 唯一品牌强调色 |
| `--accent-container` | `#0C7752` | `#58D5AA` | CTA 渐变终点与 hover |
| `--accent-soft` | `#D8F2E7` | `#103B2E` | 选中态、标签、轻提示 |
| `--code-surface` | `#232826` | `#0E1314` | 高对比代码块 |
| `--outline-ghost` | `color-mix(in srgb, #1F1F1D 15%, transparent)` | `color-mix(in srgb, #ECE9E2 15%, transparent)` | 仅无障碍/浮层兜底 |

兼容别名：旧实现中的 `--bg`、`--bg-soft`、`--bg-elevated`、`--text`、`--text-muted`、`--text-faint`、`--border`、`--border-strong`、`--code-bg` 必须分别映射到上述语义 token，不再作为组件设计依据。

### 3.2 主题行为

- 初始主题跟随系统；公开端用 cookie + 首屏脚本，CMS 用首屏 `localStorage` 脚本，避免错误主题闪烁。
- 用户切换后持久化明确的 light/dark 选择。
- 主题切换只过渡 `background-color`、`color`、`fill` 与 `border-color`，时长 `200ms cubic-bezier(0.4, 0, 0.2, 1)`。
- `prefers-reduced-motion: reduce` 下关闭所有过渡与入场动画。

## 4. 排版与空间

### 4.1 字阶

| Token | 字体 | 规格 | 使用位置 |
| --- | --- | --- | --- |
| `display-lg` | 阅读字体 | `clamp(3.5rem, 9vw, 7.25rem) / 0.96 / -0.04em` | 首页主观点 |
| `display-md` | 阅读字体 | `clamp(2.5rem, 6vw, 4.75rem) / 1.02 / -0.04em` | 文章标题 |
| `headline-lg` | 阅读字体 | `clamp(1.9rem, 3vw, 2.75rem) / 1.1` | 区块标题 |
| `title-md` | UI 字体 | `1.2rem / 1.25 / -0.03em` | 列表标题、CMS 标题 |
| `body-lg` | 阅读字体 | `1.125rem / 1.9` | 文章正文 |
| `body-md` | UI 字体 | `1rem / 1.78` | 首页与 CMS 正文 |
| `label-md` | UI 字体 | `0.82rem / 1.4 / 0.05em` | 元信息、导航 |
| `label-sm` | UI 字体 | `0.73rem / 1.35 / 0.12em` | 代码语言、eyebrow |

### 4.2 间距与宽度

`--space-2xs: .35rem`、`--space-xs: .55rem`、`--space-sm: .8rem`、`--space-md: 1.15rem`、`--space-lg: 1.8rem`、`--space-xl: 2.8rem`、`--space-2xl: clamp(3.2rem, 7vw, 5.2rem)`、`--space-3xl: clamp(4.2rem, 9vw, 7rem)`。

- 区块与页脚之间使用 `2xl / 3xl`，不靠分割线制造层级。
- 文章正文最大 `44rem`；公开页最大 `72rem`；全宽视觉可突破容器，但文字不得突破可读宽度。
- 移动端最小页面边距 `1.25rem`，可点击目标不小于 `2.5rem`。

## 5. 组件规范

### 导航与主题切换

站点名固定在左侧，导航链接聚于右侧。导航悬浮时使用 `--surface-container` 的 80% 透明度和 20px 模糊，不加底部分割线。主题切换是 `--surface-high` 中的 Sun/Moon 控件，激活状态使用柔和的 `--accent-soft` 光晕。

### 按钮

- **Primary**：`linear-gradient(135deg, var(--accent), var(--accent-container))`，反差文字，无边框，圆角 `0.375rem`。
- **Tertiary**：透明背景、`--accent` 文字；hover 仅切换到 `--surface-high`。
- 禁止在公开端使用次级实线描边按钮作为默认样式；需要低优先级行动时使用文字按钮。

### 列表与容器

文章列表不使用 `border-bottom` 或独立卡片。每项以 `lg / xl` 垂直间距区分；hover 仅出现 `--surface-low` 背景和标题/箭头位移。CMS 的可操作表格、表单组可使用 `--outline-ghost`，但不使用厚重边框与阴影。

### Markdown 与代码

- Markdown 使用共享的禁用原始 HTML、允许协议白名单与 Shiki 渲染规则。
- 代码块为 `--code-surface`，无边框，横向可滚动；与后续正文之间保持至少 `xl` 间距。
- 代码语言标签放在右上角，使用 `label-sm`，文本大写；正文行内代码只使用轻微 surface 变化。
- 图片默认可突破文章正文宽度至公开页容器；图片与标题可在后续有真实素材时采用轻微负 margin 叠压，不为占位内容制造伪封面。

### CMS

CMS 是操作工作台，不使用首页式大标题。侧栏、编辑器辅助栏与表单用 surface 层级组织；状态优先使用文字和 accent，危险操作仅使用克制的红色文本。空状态简洁描述下一步操作。

## 6. 页面配方

### 首页

全宽首屏采用“站点名 → 主观点 → 简介 → 两个行动入口”的不对称排版。CSS 网格/弧线纹理只能作为低对比度底层，不可与文字争夺注意力。后续的最新文章、主题与作者介绍各自只承担一个信息任务。

### 列表与分类页

使用编辑式行列表：元信息、标题、摘要、标签。标题是视觉主角；封面图不是列表的默认内容。分类/标签页仅改变标题和筛选结果，不另建装饰结构。

### 文章页

使用窄阅读列与大标题。文章头部包含分类、日期、阅读时长、摘要和更新时间；正文优先保持长时间阅读舒适度。页尾标签、上一篇/下一篇与返回列表使用留白组织。

## 7. 无障碍与验收

- 每个图标按钮必须有 `aria-label`；焦点使用高对比 outline。
- 正文、元信息、代码与 accent 在两种主题下均达到可读对比度。
- 键盘可访问导航、主题切换、CMS 表单与移动端菜单。
- 检查 320px、768px、1440px 三档布局；检查长标题、长标签、横向代码和空数据状态。

## 8. 明确禁止

- 重阴影、白底营销卡片、彩色标签体系、第二强调色。
- 以不透明实线大量分隔区块/列表，或用 `<hr>` 代替留白。
- 过度圆角、胶囊按钮堆叠、自动循环动画、复杂视差。
- 在组件内写固定颜色或绕过语义 token。

## 9. 实施检查表

1. 新组件先选定 surface 层级与排版 token，再写布局。
2. 公开端优先删除无意义边框，再用空间或 surface 变化建立结构。
3. 深色模式、键盘焦点和 reduced-motion 是功能验收项，不是后续美化项。
4. 视觉修改完成后，至少检查首页、文章页、CMS 列表与 CMS 编辑器四个关键场景。
