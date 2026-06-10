# Monet Purple 全站主题色改造 — 设计文档

- 日期：2026-06-10
- 分支：`theme/sakrylle`
- 范围：Sakrylle Web 前端（SvelteKit + Tailwind CSS v4）
- 目标：把品牌化改造里唯一剩下的代码缺口——主强调色——从 Open WebUI 默认 Tailwind 蓝迁移为 Sakrylle 的 **Monet Purple `#9181bd`** 主色 + **樱花粉 `#ec6a9c`** accent，并把中性灰微调为暖紫调。
- 关联：中心品牌文档 `Sakrylle API/sakrylle-docs/40-brand-system/design.md`；调研项 P0-5（本设计即其结论）。

## 1. 背景与现状

经主题系统审计确认：

- 这是 **Tailwind CSS v4**，颜色靠 `src/tailwind.css` 的 `@theme` 块定义 token；`tailwind.config.js` **无自定义颜色**。
- 中性灰 `--color-gray-*` 是单一真源（`src/tailwind.css` 定义），并在 `src/app.html` 内联脚本与 `src/lib/components/chat/Settings/General.svelte` 的 `applyTheme()` 里按 dark/oled 主题动态硬覆盖。
- **主强调色 = Tailwind 默认 `blue-*`，硬编码散落在约 22 个文件、约 60–80 处**，未抽象成主题 token。
- 品牌紫 `#9181bd` 目前**只存在于 meta `theme-color` 与 manifest**，未驱动任何 UI 组件。
- 主题清单：`system / dark / light / oled-dark / her`（彩蛋）。

## 2. 设计决策（已确认）

| 决策点 | 选择 |
|---|---|
| 改色边界 | **语义保留型**：只换品牌/交互强调色；info 蓝、成功绿、警告黄、@提及 sky、语音 indigo、alert purple 保留 |
| 主色 | Monet Purple `#9181bd`，完整 50–950 色阶 |
| accent | 樱花粉 `#ec6a9c`，少量高价值位置接入 |
| 中性灰 | 重染为暖紫调（亮度不变、注入微量紫色度） |
| 日历"今天/事件"蓝 | **改紫**（并入 primary 桶，硬编码 `#3b82f6` 收口为 token） |
| 彩蛋 `her` `#983724` | 与品牌正交，保留不动 |
| 实现路径 | **方案 A：语义 token 层 + 定向迁移**（在 `@theme` 定义 `primary-*/accent-*`，组件迁移到语义类） |

**实现原则**：所有色值只在 `@theme` + 两处动态覆盖里定义；组件层只引用 `primary-*/accent-*/gray-*` 工具类，不再新增硬编码 hex。

## 3. Token 架构与色阶

全部新增/修改集中在 **`src/tailwind.css` 的 `@theme` 块**。Tailwind v4 据此自动生成 `primary-*` / `accent-*` 工具类。

### 3.1 主色 `--color-primary-*`（采用中心品牌文档既定色阶）

| 阶 | hex | 阶 | hex |
|---|---|---|---|
| 50 | `#f8f6fc` | 500 | **`#9181bd`** |
| 100 | `#f0ecf8` | 600 | `#7b6aab` |
| 200 | `#e2daf2` | 700 | `#6b5b95` |
| 300 | `#cfc2e8` | 800 | `#584b7a` |
| 400 | `#b5a3d9` | 900 | `#4a3f66` |
| | | 950 | `#2d2640` |

### 3.2 accent `--color-accent-*`（樱花粉，锚定 500，其余按色相补全）

| 阶 | hex | 阶 | hex |
|---|---|---|---|
| 50 | `#fdeef4` | 500 | **`#ec6a9c`** |
| 100 | `#fbd9e7` | 600 | `#d94e85` |
| 200 | `#f7b3cf` | 700 | `#b83d6e` |
| 300 | `#f28cb6` | 800 | `#93324f` |
| 400 | `#ef7aa9` | 900 | `#6e2a3d` |
| | | 950 | `#421826` |

> accent 中间阶为锚定 500 后按色相推导的初值；实现期允许按视觉做小幅微调（仅调 `@theme` 单一真源）。

### 3.3 中性 `--color-gray-*` 重染暖紫调

沿用现有 12 阶**亮度（oklch L 不变）**，色相锁定 ~300（紫），只注入微量色度：浅阶 C≈0.006，深阶 C 升至 ≈0.02。

现有真源（`src/tailwind.css`，纯灰 oklch C=0）：

```
50 L0.98 · 100 L0.94 · 200 L0.92 · 300 L0.85 · 400 L0.77 · 500 L0.69
600 L0.51 · 700 L0.42 · 800 L0.32 · 850 L0.27 · 900 L0.2 · 950 L0.16
```

改法示例：`--color-gray-50: oklch(0.98 0.006 300)` … `--color-gray-900: oklch(0.2 0.02 300)`。**保证对比度不变、只让灰偏暖紫。**

### 3.4 暗色/OLED 动态覆盖同步

`src/app.html` 内联脚本与 `General.svelte` `applyTheme()` 里那组 dark/oled 灰度硬覆盖，从纯灰改暖紫深色（建议初值，实现期按截图校）：

| 变量 | dark 现值 | dark 新值（建议） |
|---|---|---|
| `--color-gray-800` | `#333` | `#2a2533` |
| `--color-gray-850` | `#262626` | `#221d2b` |
| `--color-gray-900` | `#171717` | `#1a1622` |
| `--color-gray-950` | `#0d0d0d` | `#120f18` |

OLED 仍走近黑（保留或轻微紫调）。**两处必须改同一组值并保持对齐**（重复逻辑，避免首屏与切换后闪色差）。

## 4. 调用点迁移分类

组件层只改类名，不引入新 hex。行号基于审计时快照，实现期以实际为准。

### 4.1 → 迁到 `primary-*`（品牌/交互）

- 焦点环：`Settings/General.svelte`（`focus:ring/border-blue-500`）、`PortPreview.svelte`（`focus:border-blue-400`）
- 选中/激活态：`FileEntryRow.svelte`、`FileNavToolbar.svelte`、频道 `Message.svelte`（`border-blue-500 bg-blue-100/10` 高亮消息）
- 开关/复选/表单控件：`Audio.svelte`（`peer-checked:bg-blue-600 peer-focus:ring-blue-300`）、`CalendarEventModal.svelte`（`accent-blue-500`）
- 进度/动画指示：`PortPreview.svelte`（`bg-blue-500`）
- 日历"今天"/事件默认色：`CalendarView.svelte`、`CalendarSidebar.svelte`、`CreateCalendarModal.svelte`、`CalendarEventChip.svelte`、`Dashboard.svelte`（`bg-blue-500` 类 → `primary-*`；硬编码 `#3b82f6` → token）

### 4.2 → 接入 `accent-*`（樱花粉，精选小集合）

- **认证页 SSO/登录主按钮**（`src/routes/auth/` 主 CTA）——最具品牌定义性的单一入口 CTA
- 链接 hover/active 强调点

> 起步仅这两类，避免满屏粉；后续可扩展，扩展只需追加类名。

### 4.3 保留语义色（不动）

- info 横幅/徽章：`Banner.svelte`、`Badge.svelte`、admin `Banners.svelte`、`ChangelogModal.svelte`（info 变体）
- @提及 sky、语音录制 indigo、Markdown alert purple
- 彩蛋 `her` 的 `#983724`

## 5. 非类名色值收口

- JS/内联样式里的字面色值（日历默认 `#3b82f6`、`FilePreview.svelte` 的 `#1a1a2e`）改为引用 `var(--color-primary-500)` / `var(--color-gray-900)`。
- 仅在确实需要 JS 字面量处，新建极小的 `src/lib/theme/colors.ts` 导出 `PRIMARY_500` / `ACCENT_500` 常量复用。
- meta `theme-color` / `manifest.json` / `static/brand/site.webmanifest` 已是 `#9181bd` / `#1a1a2e`，**保持不动**。

## 6. 验证与测试

纯 CSS/主题改动，无有意义单元测试可加。验证靠三层：

### 6.1 构建/类型
- `npm run build` 与 `npm run check` 通过。
- 抽查一个 `primary-*` / `accent-*` 类实际渲染（确认 `@theme` token 生成生效）。

### 6.2 静态 grep 守卫（防回归）
- 被改文件里**品牌/交互 `blue-*` 归零**；`src/` 全局 `grep '#3b82f6'` 无残留。
- **语义色仍在**：info 横幅蓝、@提及 sky、语音 indigo、alert purple、彩蛋 `#983724` 一个不少。

### 6.3 多主题人工目检（逐一过 `system / dark / light / oled-dark / her`）

| 屏幕 | 期望 |
|---|---|
| 认证页 | SSO/登录主按钮 = 樱花粉 accent；链接 hover 粉 |
| 聊天/输入 | 焦点环、选中态 = Monet 紫 |
| 文件 | 选中行/工具栏 = 紫 |
| 设置 | 开关、焦点环 = 紫 |
| 日历 | "今天"/事件默认 = 紫 |
| 频道 | 激活消息高亮 = 紫 |
| info 横幅 | 仍是蓝（语义未动） |
| 全局背景/文字 | 中性呈暖紫调，明暗对比度无回归 |

**验收口径**：三层全过；暗色首屏（app.html 内联脚本）与切换后（General.svelte）暗色表面一致、无闪色差。

## 7. 影响文件清单（汇总）

| 类别 | 文件 | 改动 |
|---|---|---|
| 真源 | `src/tailwind.css` | 新增 `primary-*`/`accent-*` 色阶；重染 `gray-*` 暖紫 |
| 动态覆盖 | `src/app.html` | dark/oled 灰度覆盖改暖紫 + 内联脚本对齐 |
| 动态覆盖 | `src/lib/components/chat/Settings/General.svelte` | `applyTheme()` 灰度覆盖改暖紫；焦点环 → primary |
| 迁移 | 约 22 个 `.svelte` 文件（见 §4.1/4.2） | 品牌/交互 `blue-*` → `primary-*`；CTA → `accent-*` |
| 收口 | 日历相关组件、`FilePreview.svelte` | 硬编码 hex → `var(--color-*)` |
| 新增 | `src/lib/theme/colors.ts` | JS 字面量常量（仅按需） |

## 8. 范围之外（Out of Scope）

- OIDC 接入、生产部署、IdP 注册、端到端冒烟（另立 spec）。
- oidc-docs 文档对齐（独立收尾杂活）。
- 语义色（info/success/warning）、@提及、语音、alert、`her` 彩蛋的颜色。
- 组件结构/布局重构、排版与圆角阴影等非颜色品牌项。

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 暖紫中性在某主题下对比度下降 | 保持 oklch 亮度 L 不变，只动色度；目检覆盖全部主题 |
| 暗色双覆盖值不一致导致首屏闪色 | 两处取同一组值，列入验收口径 |
| accent 粉用过多显廉价 | 起步仅 SSO CTA + 链接 hover，最小化 |
| 误伤语义蓝 | grep 守卫显式校验语义色仍在 |
| accent 中间阶推导色不准 | 单一真源，可在 `@theme` 单点微调 |
