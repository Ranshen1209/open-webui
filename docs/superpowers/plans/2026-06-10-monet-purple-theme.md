# Monet Purple 全站主题色改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Sakrylle Web 前端的品牌/交互强调色从 Open WebUI 默认 Tailwind 蓝迁移为 Monet Purple `#9181bd` 主色 + 樱花粉 `#ec6a9c` accent，并把中性灰微调为暖紫调，语义色（info/success/warning/@提及/alert/彩蛋）保持不变。

**Architecture:** 方案 A——在 `src/tailwind.css` 的 `@theme` 块建立 `primary-*` / `accent-*` 语义 token（单一真源），把散落的品牌/交互 `blue-*` 调用点定向迁移到语义类；中性 `gray-*` 在 `@theme` 重染暖紫并同步运行时 dark 覆盖；非类名硬编码 hex 收口为 `var(--color-*)`。

**Tech Stack:** SvelteKit、Tailwind CSS v4（`@theme` 生成工具类）、oklch 颜色。

**关键事实 / 与 spec 的精化：**
- Tailwind v4 颜色真源在 `src/tailwind.css` 的 `@theme`；`tailwind.config.js` 无自定义颜色。
- `app.html` 内联脚本只含 **OLED** 灰度覆盖（保持近黑不变）；**dark（非 oled）** 灰度覆盖只在 `General.svelte:145-148`。故 dark 暖紫覆盖为单文件改动，无跨文件不一致风险。
- `meta theme-color` 的 `#1a1a2e`（品牌暗背景）保持不变。
- 本计划无单元测试可加（纯主题）。每个迁移任务用 **grep 守卫（改前看到 / 改后归零）+ `npm run build` + 多主题目检** 验证。

**保留语义色（任何任务都不得改动）：**
- `src/lib/components/common/Banner.svelte:28`（`info:`）
- `src/lib/components/common/Badge.svelte:6`（`info:`）
- `src/lib/components/admin/Settings/Interface/Banners.svelte:29`（`info:`）
- `src/lib/components/ChangelogModal.svelte:75`（info 变体）
- 任何 `sky-` / `indigo-` / alert purple / 彩蛋 `#983724`

---

## File Structure

| 文件 | 职责 | 改动 |
|---|---|---|
| `src/tailwind.css` | 颜色真源（`@theme`） | 新增 `primary-*`/`accent-*` 色阶；重染 `gray-*` |
| `src/lib/components/chat/Settings/General.svelte` | 运行时主题应用 + 设置项 | dark 灰度覆盖改暖紫；焦点环 → primary |
| `src/lib/theme/colors.ts` | JS 字面量色值常量（新建） | 导出 `PRIMARY_500` 等供 JS 上下文复用 |
| 约 20 个 `.svelte` 组件 | 各自 UI | 品牌/交互 `blue-*` → `primary-*`；CTA/链接 → `accent-*` |

---

## Task 1: 在 `@theme` 定义 primary + accent 色阶

**Files:**
- Modify: `src/tailwind.css:5-18`（`@theme` 块）

- [ ] **Step 1: 在 `@theme` 块内、`--color-gray-950` 之后插入 primary 与 accent 色阶**

把 `src/tailwind.css` 的 `@theme { ... }` 改为（在现有 gray 变量后追加，gray 本身本任务不动）：

```css
@theme {
	--color-gray-50: oklch(0.98 0 0);
	--color-gray-100: oklch(0.94 0 0);
	--color-gray-200: oklch(0.92 0 0);
	--color-gray-300: oklch(0.85 0 0);
	--color-gray-400: oklch(0.77 0 0);
	--color-gray-500: oklch(0.69 0 0);
	--color-gray-600: oklch(0.51 0 0);
	--color-gray-700: oklch(0.42 0 0);
	--color-gray-800: oklch(0.32 0 0);
	--color-gray-850: oklch(0.27 0 0);
	--color-gray-900: oklch(0.2 0 0);
	--color-gray-950: oklch(0.16 0 0);

	/* Sakrylle Monet Purple — primary brand/interactive color */
	--color-primary-50: #f8f6fc;
	--color-primary-100: #f0ecf8;
	--color-primary-200: #e2daf2;
	--color-primary-300: #cfc2e8;
	--color-primary-400: #b5a3d9;
	--color-primary-500: #9181bd;
	--color-primary-600: #7b6aab;
	--color-primary-700: #6b5b95;
	--color-primary-800: #584b7a;
	--color-primary-900: #4a3f66;
	--color-primary-950: #2d2640;

	/* Sakrylle Sakura — accent color (CTA / highlights only) */
	--color-accent-50: #fdeef4;
	--color-accent-100: #fbd9e7;
	--color-accent-200: #f7b3cf;
	--color-accent-300: #f28cb6;
	--color-accent-400: #ef7aa9;
	--color-accent-500: #ec6a9c;
	--color-accent-600: #d94e85;
	--color-accent-700: #b83d6e;
	--color-accent-800: #93324f;
	--color-accent-900: #6e2a3d;
	--color-accent-950: #421826;
}
```

- [ ] **Step 2: 构建验证 token 生成生效**

Run: `npm run build`
Expected: 构建成功，无 Tailwind/CSS 报错。

- [ ] **Step 3: 抽查工具类已生成**

Run: `grep -rn "primary-500\|accent-500" build/ 2>/dev/null | head -3`
Expected: 在构建产物里能看到 `.bg-primary-500` / `.text-primary-500` 之类（或至少 CSS 变量），证明 `@theme` token 被编译为工具类。若 `build/` 不便检索，改跑 `npm run dev` 手动确认无报错亦可。

- [ ] **Step 4: Commit**

```bash
git add src/tailwind.css
git commit -m "feat(theme): add primary (Monet Purple) and accent (Sakura) color scales"
```

---

## Task 2: 重染中性 `gray-*` 为暖紫调

**Files:**
- Modify: `src/tailwind.css:6-17`

- [ ] **Step 1: 把 `@theme` 中 12 个 `--color-gray-*` 替换为暖紫调（保持 oklch 亮度 L 不变，色相锁 300，注入微量色度）**

将 `src/tailwind.css` 的 gray 变量逐行替换为：

```css
	--color-gray-50: oklch(0.98 0.006 300);
	--color-gray-100: oklch(0.94 0.008 300);
	--color-gray-200: oklch(0.92 0.008 300);
	--color-gray-300: oklch(0.85 0.01 300);
	--color-gray-400: oklch(0.77 0.012 300);
	--color-gray-500: oklch(0.69 0.014 300);
	--color-gray-600: oklch(0.51 0.016 300);
	--color-gray-700: oklch(0.42 0.018 300);
	--color-gray-800: oklch(0.32 0.02 300);
	--color-gray-850: oklch(0.27 0.02 300);
	--color-gray-900: oklch(0.2 0.02 300);
	--color-gray-950: oklch(0.16 0.018 300);
```

> 说明：亮度 L 与原值逐一相同（对比度不回归），仅把色度从 0 提到 0.006–0.02、色相固定 300（紫）。这些是起步值，实现期可在此单点微调。

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 3: 目检暖紫中性 + 对比度**

Run: `npm run dev`
手动：打开页面，切到 light 与 dark，确认背景/边框/次要文字呈极淡暖紫调、文字可读性无下降。

- [ ] **Step 4: Commit**

```bash
git add src/tailwind.css
git commit -m "feat(theme): retint neutral gray scale to warm purple"
```

---

## Task 3: 同步运行时 dark 灰度覆盖为暖紫

**Files:**
- Modify: `src/lib/components/chat/Settings/General.svelte:144-148`

- [ ] **Step 1: 改前确认当前 dark 覆盖块存在**

Run: `grep -n "setProperty('--color-gray-900', '#171717')" src/lib/components/chat/Settings/General.svelte`
Expected: 命中第 147 行附近。

- [ ] **Step 2: 把 dark（非 oled）灰度覆盖替换为暖紫深色**

在 `src/lib/components/chat/Settings/General.svelte` 中，把这一块：

```javascript
		if (themeToApply === 'dark' && !_theme.includes('oled')) {
			document.documentElement.style.setProperty('--color-gray-800', '#333');
			document.documentElement.style.setProperty('--color-gray-850', '#262626');
			document.documentElement.style.setProperty('--color-gray-900', '#171717');
			document.documentElement.style.setProperty('--color-gray-950', '#0d0d0d');
		}
```

替换为：

```javascript
		if (themeToApply === 'dark' && !_theme.includes('oled')) {
			document.documentElement.style.setProperty('--color-gray-800', '#2a2533');
			document.documentElement.style.setProperty('--color-gray-850', '#221d2b');
			document.documentElement.style.setProperty('--color-gray-900', '#1a1622');
			document.documentElement.style.setProperty('--color-gray-950', '#120f18');
		}
```

> 这四个值在视觉上与 Task 2 的 `@theme` 暗阶（首屏 `app.html` 用的就是 `@theme` 默认值）对齐，避免首屏与切换后闪色差。OLED 覆盖（同文件 191-194、`app.html` 57-60）保持近黑不动。

- [ ] **Step 3: 目检暗色首屏一致性**

Run: `npm run dev`
手动：localStorage 设 `theme=dark` 刷新（首屏走 `app.html`→`@theme`），再进设置切 dark（走本块），确认暗色表面一致、无跳变。

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/chat/Settings/General.svelte
git commit -m "feat(theme): warm-purple dark surface overrides to match retinted neutrals"
```

---

## Task 4: 焦点环与表单控件迁移到 `primary-*`

**Files:**
- Modify: `src/lib/components/chat/Settings/General.svelte:305`
- Modify: `src/lib/components/admin/Settings/Audio.svelte:437`
- Modify: `src/lib/components/chat/FileNav/PortPreview.svelte:205`
- Modify: `src/lib/components/calendar/CalendarEventModal.svelte:204`
- Modify: `src/lib/components/chat/FileNav.svelte:1334,1353`
- Modify: `src/lib/components/chat/FileNav/FileEntryRow.svelte:265`
- Modify: `src/lib/components/chat/PyodideFileNav.svelte:468,487`

- [ ] **Step 1: 逐处把焦点环/表单控件的 `blue-*` 改为 `primary-*`**

按下列 before→after 精确替换（每处只动颜色类，其余不变）：

`General.svelte:305`：`focus:ring-blue-500 focus:border-blue-500` → `focus:ring-primary-500 focus:border-primary-500`

`Audio.svelte:437`：`peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800` → `peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800`；同串内 `peer-checked:bg-blue-600` → `peer-checked:bg-primary-600`

`PortPreview.svelte:205`：`focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-400/20` → `focus:border-primary-400 dark:focus:border-primary-500 focus:ring-1 focus:ring-primary-400/20`

`CalendarEventModal.svelte:204`：`class="accent-blue-500"` → `class="accent-primary-500"`

`FileNav.svelte:1334` 与 `:1353`（两处同串）：`focus:border-blue-400 dark:focus:border-blue-500` → `focus:border-primary-400 dark:focus:border-primary-500`

`FileEntryRow.svelte:265`：`focus:border-blue-400 dark:focus:border-blue-500` → `focus:border-primary-400 dark:focus:border-primary-500`

`PyodideFileNav.svelte:468` 与 `:487`（两处同串）：`focus:border-blue-400 dark:focus:border-blue-500` → `focus:border-primary-400 dark:focus:border-primary-500`

- [ ] **Step 2: grep 守卫——这些文件里上述焦点/控件蓝归零**

Run:
```bash
grep -n "ring-blue\|focus:border-blue\|accent-blue\|peer-checked:bg-blue" \
  src/lib/components/chat/Settings/General.svelte \
  src/lib/components/admin/Settings/Audio.svelte \
  src/lib/components/chat/FileNav/PortPreview.svelte \
  src/lib/components/calendar/CalendarEventModal.svelte \
  src/lib/components/chat/FileNav.svelte \
  src/lib/components/chat/FileNav/FileEntryRow.svelte \
  src/lib/components/chat/PyodideFileNav.svelte
```
Expected: 无输出。

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/chat/Settings/General.svelte src/lib/components/admin/Settings/Audio.svelte src/lib/components/chat/FileNav/PortPreview.svelte src/lib/components/calendar/CalendarEventModal.svelte src/lib/components/chat/FileNav.svelte src/lib/components/chat/FileNav/FileEntryRow.svelte src/lib/components/chat/PyodideFileNav.svelte
git commit -m "feat(theme): migrate focus rings and form controls to primary"
```

---

## Task 5: 选中/激活态迁移到 `primary-*`

**Files:**
- Modify: `src/lib/components/chat/FileNav/FileEntryRow.svelte:138,140,223`
- Modify: `src/lib/components/chat/FileNav/FileNavToolbar.svelte:112`
- Modify: `src/lib/components/chat/FileNav/PortPreview.svelte:256`
- Modify: `src/lib/components/channel/Messages/Message.svelte:185,580`

- [ ] **Step 1: 逐处替换选中/激活态颜色类**

`FileEntryRow.svelte:138`：`bg-blue-50 dark:bg-blue-900/20` → `bg-primary-50 dark:bg-primary-900/20`

`FileEntryRow.svelte:140`：`bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400 dark:ring-blue-500 ring-inset` → `bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-400 dark:ring-primary-500 ring-inset`

`FileEntryRow.svelte:223`：`bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 text-white` → `bg-primary-500 dark:bg-primary-600 border-primary-500 dark:border-primary-600 text-white`

`FileNavToolbar.svelte:112`：`bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400 dark:ring-blue-500` → `bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-400 dark:ring-primary-500`

`PortPreview.svelte:256`：`bg-blue-500 animate-loading-bar` → `bg-primary-500 animate-loading-bar`

`channel/Messages/Message.svelte:185`：`border-l-4 border-blue-500 bg-blue-100/10 dark:bg-blue-100/5 pl-4` → `border-l-4 border-primary-500 bg-primary-100/10 dark:bg-primary-100/5 pl-4`

`channel/Messages/Message.svelte:580`：`bg-blue-300/10 outline outline-blue-500/50 outline-1` → `bg-primary-300/10 outline outline-primary-500/50 outline-1`

- [ ] **Step 2: grep 守卫**

Run:
```bash
grep -n "blue-" \
  src/lib/components/chat/FileNav/FileNavToolbar.svelte \
  src/lib/components/channel/Messages/Message.svelte
grep -n "bg-blue\|ring-blue\|border-blue" src/lib/components/chat/FileNav/FileEntryRow.svelte
```
Expected: 第一组无输出；第二组只可能剩 `text-blue-400`（Folder 图标，Task 7 处理），不应再有 `bg-blue/ring-blue/border-blue`。

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/chat/FileNav/FileEntryRow.svelte src/lib/components/chat/FileNav/FileNavToolbar.svelte src/lib/components/chat/FileNav/PortPreview.svelte src/lib/components/channel/Messages/Message.svelte
git commit -m "feat(theme): migrate selection and active states to primary"
```

---

## Task 6: 日历"今天/事件"色 + 硬编码 `#3b82f6` 收口为 primary token

**Files:**
- Create: `src/lib/theme/colors.ts`
- Modify: `src/lib/components/calendar/CalendarSidebar.svelte:161,208`
- Modify: `src/lib/components/calendar/CalendarView.svelte:175,228`
- Modify: `src/lib/components/calendar/CalendarEventChip.svelte:21`
- Modify: `src/lib/components/calendar/CreateCalendarModal.svelte:17,21,33`
- Modify: `src/lib/components/admin/Analytics/Dashboard.svelte:265`

- [ ] **Step 1: 新建 JS 色值常量真源**

Create `src/lib/theme/colors.ts`:

```typescript
// Sakrylle brand color literals for non-CSS (JS/inline-style) contexts.
// CSS contexts should prefer Tailwind classes (primary-*/accent-*) or var(--color-*).
export const PRIMARY_500 = '#9181bd';
export const ACCENT_500 = '#ec6a9c';
```

- [ ] **Step 2: 日历"今天"Tailwind 类 → primary**

`CalendarSidebar.svelte:161`：`bg-blue-500 text-white` → `bg-primary-500 text-white`

`CalendarView.svelte:175`：`bg-blue-500 text-white` → `bg-primary-500 text-white`（同行 `text-gray-500 dark:text-gray-400` 不动）

`CalendarView.svelte:228`：`bg-blue-500 text-white` → `bg-primary-500 text-white`

- [ ] **Step 3: 日历默认事件色硬编码 `#3b82f6` → primary token**

`CalendarEventChip.svelte:21`（内联 style，CSS 上下文，用 CSS 变量）：
`style="background-color: {event.color || calendarColor || '#3b82f6'};"`
→ `style="background-color: {event.color || calendarColor || 'var(--color-primary-500)'};"`

`CalendarSidebar.svelte:208`（内联 style，CSS 上下文）：
`{cal.color || '#3b82f6'}` → `{cal.color || 'var(--color-primary-500)'}`

`CreateCalendarModal.svelte`（JS 字面量上下文，导入常量）：在 `<script>` 顶部加 `import { PRIMARY_500 } from '$lib/theme/colors';`，然后
- 第 17 行 `let color = '#3b82f6';` → `let color = PRIMARY_500;`
- 第 21 行调色板数组里的 `'#3b82f6', // blue` → `PRIMARY_500, // primary`
- 第 33 行 `color = '#3b82f6';` → `color = PRIMARY_500;`

`Dashboard.svelte:265`（图表色数组，JS 字面量）：在 `<script>` 顶部加 `import { PRIMARY_500 } from '$lib/theme/colors';`，把第 265 行的 `'#3b82f6',` → `PRIMARY_500,`

- [ ] **Step 4: grep 守卫——日历蓝与 `#3b82f6` 归零**

Run:
```bash
grep -rn "3b82f6" src/
grep -rn "bg-blue" src/lib/components/calendar/
```
Expected: 两条均无输出。

- [ ] **Step 5: 构建**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 6: Commit**

```bash
git add src/lib/theme/colors.ts src/lib/components/calendar/ src/lib/components/admin/Analytics/Dashboard.svelte
git commit -m "feat(theme): migrate calendar today/event colors to primary token"
```

---

## Task 7: 零散品牌强调（图标/计量数字/标签文字）迁移到 `primary-*`

**Files:**
- Modify: `src/lib/components/chat/FileNav.svelte:1330`
- Modify: `src/lib/components/chat/FileNav/FileEntryRow.svelte:243`
- Modify: `src/lib/components/chat/PyodideFileNav.svelte:464`
- Modify: `src/lib/components/chat/FileNav/PortList.svelte:117`
- Modify: `src/lib/components/automations/AutomationEditor.svelte:432`
- Modify: `src/lib/components/admin/Analytics/ModelUsage.svelte:159`
- Modify: `src/lib/components/admin/Analytics/UserUsage.svelte:146`
- Modify: `src/lib/components/common/Tags/TagInput.svelte:38,42,61`

- [ ] **Step 1: 逐处替换零散 `text-blue-*` 品牌强调为 primary**

文件夹图标（三处同串 `text-blue-400 dark:text-blue-300`）：
- `FileNav.svelte:1330` → `text-primary-400 dark:text-primary-300`
- `FileEntryRow.svelte:243` → `text-primary-400 dark:text-primary-300`
- `PyodideFileNav.svelte:464` → `text-primary-400 dark:text-primary-300`

`PortList.svelte:117`：`text-blue-500 dark:text-blue-400` → `text-primary-500 dark:text-primary-400`

`AutomationEditor.svelte:432`：`text-blue-500` → `text-primary-500`

`ModelUsage.svelte:159`：`text-blue-500` → `text-primary-500`

`UserUsage.svelte:146`：`text-blue-500` → `text-primary-500`

`TagInput.svelte`（dark 下的蓝文字，三处）：
- 第 38 行 `dark:text-blue-400` → `dark:text-primary-400`
- 第 42 行 `dark:text-blue-400 ... dark:placeholder:text-blue-400/50` → `dark:text-primary-400 ... dark:placeholder:text-primary-400/50`
- 第 61 行 `dark:text-blue-400` → `dark:text-primary-400`

- [ ] **Step 2: grep 守卫**

Run:
```bash
grep -n "text-blue" \
  src/lib/components/chat/FileNav.svelte \
  src/lib/components/chat/FileNav/FileEntryRow.svelte \
  src/lib/components/chat/PyodideFileNav.svelte \
  src/lib/components/chat/FileNav/PortList.svelte \
  src/lib/components/automations/AutomationEditor.svelte \
  src/lib/components/admin/Analytics/ModelUsage.svelte \
  src/lib/components/admin/Analytics/UserUsage.svelte \
  src/lib/components/common/Tags/TagInput.svelte
```
Expected: 无输出。

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/chat/FileNav.svelte src/lib/components/chat/FileNav/FileEntryRow.svelte src/lib/components/chat/PyodideFileNav.svelte src/lib/components/chat/FileNav/PortList.svelte src/lib/components/automations/AutomationEditor.svelte src/lib/components/admin/Analytics/ModelUsage.svelte src/lib/components/admin/Analytics/UserUsage.svelte src/lib/components/common/Tags/TagInput.svelte
git commit -m "feat(theme): migrate incidental brand accents (icons, metrics, tags) to primary"
```

---

## Task 8: accent（樱花粉）接入——SSO CTA + 链接

**Files:**
- Modify: `src/routes/auth/+page.svelte:537`（OIDC SSO 按钮 class）
- Modify: `src/lib/components/workspace/common/ManifestModal.svelte:57`
- Modify: `src/lib/components/layout/UpdateInfoToast.svelte:31`

- [ ] **Step 1: 把认证页 OIDC SSO 主按钮改为樱花粉填充 CTA**

在 `src/routes/auth/+page.svelte` 的 `{#if $config?.oauth?.providers?.oidc}` 按钮（约 537 行）上，把：

```
class="flex justify-center items-center bg-gray-700/5 hover:bg-gray-700/10 dark:bg-gray-100/5 dark:hover:bg-gray-100/10 dark:text-gray-300 dark:hover:text-white transition w-full rounded-full font-medium text-sm py-2.5"
```

替换为：

```
class="flex justify-center items-center bg-accent-500 hover:bg-accent-600 text-white transition w-full rounded-full font-medium text-sm py-2.5"
```

> 仅改 OIDC（Sakrylle SSO）这一个按钮；google/microsoft/github/feishu/email/LDAP 按钮保持原中性样式。

- [ ] **Step 2: 链接 hover/强调改 accent**

`ManifestModal.svelte:57`：`underline text-blue-400 hover:text-blue-300` → `underline text-accent-500 hover:text-accent-600`

`UpdateInfoToast.svelte:31`：`hover:text-blue-900 dark:hover:text-blue-300` → `hover:text-accent-600 dark:hover:text-accent-400`

- [ ] **Step 3: grep 守卫——这三处不再有 blue，且 accent 已落位**

Run:
```bash
grep -n "blue-" src/routes/auth/+page.svelte src/lib/components/workspace/common/ManifestModal.svelte src/lib/components/layout/UpdateInfoToast.svelte
grep -n "accent-500\|accent-600" src/routes/auth/+page.svelte
```
Expected: 第一条无输出；第二条命中 SSO 按钮。

- [ ] **Step 4: 构建**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add src/routes/auth/+page.svelte src/lib/components/workspace/common/ManifestModal.svelte src/lib/components/layout/UpdateInfoToast.svelte
git commit -m "feat(theme): wire sakura accent into SSO CTA and links"
```

---

## Task 9: 收尾——非类名 hex 清理 + 全局守卫 + 多主题目检

**Files:**
- Modify: `src/lib/components/chat/FileNav/FilePreview.svelte:585`

- [ ] **Step 1: `FilePreview` 暗背景硬编码收口**

`src/lib/components/chat/FileNav/FilePreview.svelte:585`：`background: #1a1a2e;` → `background: var(--color-gray-950);`

> 该处是文件预览的暗底；改用中性最深阶，随主题（含暖紫）联动。若实现期目检觉得需要更深的品牌暗，可改回固定 `#1a1a2e`——二选一即可，但不要留裸 hex 之外的歧义。

- [ ] **Step 2: 全局守卫——品牌/交互蓝全部清除，语义色完好**

Run（品牌蓝应归零，下面命令应无输出）：
```bash
grep -rn -E "bg-blue|ring-blue|border-blue|focus:border-blue|peer-checked:bg-blue|accent-blue|text-blue-(400|500)|3b82f6" src --include="*.svelte" \
  | grep -vE "Banner\.svelte|Badge\.svelte|Banners\.svelte|ChangelogModal\.svelte"
```
Expected: 无输出（info 变体文件被排除，是保留项）。

Run（语义色必须仍在，下面命令应有输出）：
```bash
grep -rn "info: 'bg-blue-500/20" src/lib/components/common/Banner.svelte src/lib/components/common/Badge.svelte src/lib/components/admin/Settings/Interface/Banners.svelte
grep -rn -E "sky-|indigo-|983724" src --include="*.svelte" | head
```
Expected: 第一条命中 3 个 info 变体；第二条仍能看到 sky/indigo/彩蛋色（证明没误伤）。

- [ ] **Step 3: 构建 + 类型检查**

Run: `npm run build && npm run check`
Expected: 均通过。

- [ ] **Step 4: 多主题人工目检（逐一过 `system / dark / light / oled-dark / her`）**

Run: `npm run dev`，逐项确认：

| 屏幕 | 期望 |
|---|---|
| 认证页 | OIDC SSO 主按钮 = 樱花粉；funding/更新链接 hover = 粉 |
| 聊天/输入 | 焦点环、选中态 = Monet 紫 |
| 文件（FileNav） | 选中行/工具栏 ring、文件夹图标 = 紫 |
| 设置 | 音频开关、文本框焦点环 = 紫 |
| 日历 | "今天"、事件默认色 = 紫 |
| 频道 | 激活/选中消息高亮 = 紫 |
| Analytics | 计量数字 = 紫 |
| info 横幅/徽章 | 仍是蓝（语义未动） |
| 全局背景/文字 | 中性呈暖紫调；明暗对比度无回归；暗色首屏与切换后一致 |

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/chat/FileNav/FilePreview.svelte
git commit -m "feat(theme): finalize non-class hex cleanup for Monet Purple migration"
```

---

## Self-Review（已执行）

**Spec coverage：**
- §3.1 primary 色阶 → Task 1 ✓
- §3.2 accent 色阶 → Task 1 ✓
- §3.3 中性暖紫 → Task 2 ✓
- §3.4 暗色动态覆盖同步 → Task 3（精化：dark 单文件，OLED 保持，理由见 plan 头）✓
- §4.1 品牌/交互 → primary → Task 4/5/6/7 ✓
- §4.2 accent 接入 → Task 8 ✓
- §4.3 保留语义色 → Task 9 守卫显式校验 ✓
- §5 非类名 hex 收口 → Task 6（#3b82f6）+ Task 9（#1a1a2e）+ `colors.ts` ✓
- §6 三层验证 → 每任务 grep+build，Task 9 汇总守卫 + 多主题目检 ✓

**Placeholder scan：** 无 TBD/TODO；每处 before→after 给出具体类串；accent 中间阶/gray 微调标注为单一真源可微调，不阻塞实现。

**Type/命名一致：** 全程 token 命名 `primary-*` / `accent-*`、常量 `PRIMARY_500`/`ACCENT_500`、CSS 变量 `var(--color-primary-500)`/`var(--color-gray-*)`，前后一致。

**与原审计行号偏差风险：** 行号为审计快照，每个迁移步均给出唯一 class 串作为锚点，实现期以 grep 定位为准。
