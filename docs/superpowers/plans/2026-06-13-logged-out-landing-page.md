# Logged-out Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 登出访客访问根路径 `/` 时就地展示 sakura 风格展示页(带醒目登录按钮、URL 不变),已登录用户照常直接进聊天。

**Architecture:** 在根布局 `src/routes/+layout.svelte` 拦截「登出 + 根路径」分支,改渲染复用后的 `OnBoarding` splash 而非 `<slot/>`(从而 `(app)` 布局不挂载、不再自动跳 `/auth`)。`OnBoarding.svelte` 增加 `prominent` prop 复用为展示页,Marquee 文案迁到 i18n。

**Tech Stack:** SvelteKit(adapter-static SPA)、Tailwind、i18next。纯前端,无后端 / `.env` / 镜像改动。

**Testing note:** 仓库没有 Svelte 组件测试框架(仅 `src/lib/utils/modelGroups.test.ts` 这类 util 单测,无 `@testing-library/svelte` 渲染环境)。本改动是路由/UI 行为,验证门为 `npm run check`、`npm run lint:frontend` 与 `npm run dev` 手动核验(与仓库现有模式一致)。不为此虚构自动化测试。

参考 spec:`docs/superpowers/specs/2026-06-13-logged-out-landing-page-design.md`

---

## Task 1: `OnBoarding.svelte` — 增加 `prominent` prop + Marquee 文案迁 i18n

**Files:**
- Modify: `src/lib/components/OnBoarding.svelte`

`ArrowRightCircle` 与 `Marquee` 已在文件顶部 import,无需新增 import。

- [ ] **Step 1: 新增 `prominent` prop**

在现有 `export let show = true;` 与 `export let getStartedHandler = () => {};`(约 17–18 行)之后追加:

```svelte
	export let show = true;
	export let getStartedHandler = () => {};
	// prominent=true: 渲染醒目登录大按钮(展示页);false: 现有小箭头(首次安装引导)
	export let prominent = false;
```

- [ ] **Step 2: Marquee 文案改走 i18n**

将当前(约 73–79 行)的:

```svelte
				<Marquee
					duration={6000}
					words={[
						'在樱花轻落的时光里，与你的每一次对话都像春风写下的情书',
						'让灵感悄然绽放，让思绪温柔相遇'
					]}
				/>
```

替换为:

```svelte
				<Marquee
					duration={6000}
					words={[
						$i18n.t(
							'In the season of drifting cherry blossoms, every conversation with you reads like a love letter written by the spring breeze'
						),
						$i18n.t('Let inspiration quietly bloom, and let thoughts gently meet')
					]}
				/>
```

- [ ] **Step 3: 按钮区按 `prominent` 分支**

将当前(约 82–97 行)的按钮容器:

```svelte
				<div class="flex justify-center mt-8">
					<div class="flex flex-col justify-center items-center">
						<button
							aria-label={$i18n.t('Get started')}
							class="relative z-20 flex p-1 rounded-full bg-white/5 hover:bg-white/10 transition font-medium text-sm"
							on:click={() => {
								getStartedHandler();
							}}
						>
							<ArrowRightCircle className="size-6" aria-hidden="true" />
						</button>
						<div class="mt-1.5 font-primary text-base font-medium" aria-hidden="true">
							{$i18n.t(`Get started`)}
						</div>
					</div>
				</div>
```

替换为:

```svelte
				<div class="flex justify-center mt-8">
					{#if prominent}
						<button
							aria-label={$i18n.t('Get started')}
							class="relative z-20 flex items-center justify-center gap-2 w-full max-w-xs sm:w-auto sm:max-w-none px-8 py-3 rounded-full bg-accent-500 hover:bg-accent-400 text-accent-950 transition font-medium text-base shadow-lg"
							on:click={() => {
								getStartedHandler();
							}}
						>
							<span class="font-primary">{$i18n.t(`Get started`)}</span>
							<ArrowRightCircle className="size-5" aria-hidden="true" />
						</button>
					{:else}
						<div class="flex flex-col justify-center items-center">
							<button
								aria-label={$i18n.t('Get started')}
								class="relative z-20 flex p-1 rounded-full bg-white/5 hover:bg-white/10 transition font-medium text-sm"
								on:click={() => {
									getStartedHandler();
								}}
							>
								<ArrowRightCircle className="size-6" aria-hidden="true" />
							</button>
							<div class="mt-1.5 font-primary text-base font-medium" aria-hidden="true">
								{$i18n.t(`Get started`)}
							</div>
						</div>
					{/if}
				</div>
```

- [ ] **Step 4: 类型检查通过**

Run: `npm run check`
Expected: 无新增 error(`OnBoarding.svelte` 不报错)。

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/OnBoarding.svelte
git commit -m "refactor(onboarding): add prominent prop and i18n marquee copy"
```

---

## Task 2: i18n locale — 新增/调整翻译

**Files:**
- Modify: `src/lib/i18n/locales/zh-CN/translation.json`
- Modify (自动生成): 各 `src/lib/i18n/locales/*/translation.json`(由 `i18n:parse` 写入新 key)

- [ ] **Step 1: 提取新 i18n key**

Run: `npm run i18n:parse`
Expected: 命令成功;Task 1 新增的两句英文 key 被写入所有 `translation.json`(默认空字符串值,回退到英文 key 文本)。

- [ ] **Step 2: 设置 zh-CN 的 Marquee 翻译**

在 `src/lib/i18n/locales/zh-CN/translation.json` 中,将 `i18n:parse` 写入的这两条空值 key 填上中文(保留原文案,含全角逗号「，」):

```json
	"In the season of drifting cherry blossoms, every conversation with you reads like a love letter written by the spring breeze": "在樱花轻落的时光里，与你的每一次对话都像春风写下的情书",
	"Let inspiration quietly bloom, and let thoughts gently meet": "让灵感悄然绽放，让思绪温柔相遇",
```

- [ ] **Step 3: 调整 zh-CN 「Get started」文案**

在 `src/lib/i18n/locales/zh-CN/translation.json`(约 1060 行)把:

```json
	"Get started": "开始使用",
```

改为:

```json
	"Get started": "开始体验",
```

- [ ] **Step 4: JSON 合法性 + 类型检查**

Run: `npx prettier --check "src/lib/i18n/locales/zh-CN/translation.json"` 然后 `npm run check`
Expected: prettier 通过(如失败则先 `npx prettier --write` 同一文件再继续);`npm run check` 无新增 error。

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/locales
git commit -m "i18n: add landing marquee copy, set zh-CN Get started to 开始体验"
```

---

## Task 3: 根布局 `+layout.svelte` — 根路径就地渲染展示页

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: import `OnBoarding`**

在组件 import 区(`import AppSidebar ...` 约 70 行之后)新增:

```js
	import OnBoarding from '$lib/components/OnBoarding.svelte';
```

- [ ] **Step 2: 新增 `showLanding` 状态**

在 `let loaded = false;`(约 103 行)之后新增:

```js
	let loaded = false;
	let showLanding = false;
```

- [ ] **Step 3: 重定向块加根路径分支**

将当前(约 1094–1100 行)的:

```js
				} else {
					// Don't redirect if we're already on the auth page
					// Needed because we pass in tokens from OAuth logins via URL fragments
					if ($page.url.pathname !== '/auth') {
						await goto(`/auth?redirect=${encodedUrl}`);
					}
				}
```

替换为:

```js
				} else {
					// Don't redirect if we're already on the auth page
					// Needed because we pass in tokens from OAuth logins via URL fragments
					if ($page.url.pathname === '/') {
						// 登出访客访问根路径:就地展示 landing,保持 URL 为 '/'
						showLanding = true;
					} else if ($page.url.pathname !== '/auth') {
						await goto(`/auth?redirect=${encodedUrl}`);
					}
				}
```

- [ ] **Step 4: 渲染块加 landing 分支**

将当前(约 1184–1196 行)的:

```svelte
{#if loaded}
	{#if $isApp}
		<div class="flex flex-row h-screen">
			<AppSidebar />

			<div class="w-full flex-1 max-w-[calc(100%-4.5rem)]">
				<slot />
			</div>
		</div>
	{:else}
		<slot />
	{/if}
{/if}
```

替换为:

```svelte
{#if loaded}
	{#if showLanding}
		<OnBoarding
			show={true}
			prominent={true}
			getStartedHandler={() => goto('/auth?redirect=%2F')}
		/>
	{:else if $isApp}
		<div class="flex flex-row h-screen">
			<AppSidebar />

			<div class="w-full flex-1 max-w-[calc(100%-4.5rem)]">
				<slot />
			</div>
		</div>
	{:else}
		<slot />
	{/if}
{/if}
```

- [ ] **Step 5: 类型检查 + lint**

Run: `npm run check && npm run lint:frontend`
Expected: 均通过,无新增 error。

- [ ] **Step 6: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat(landing): show showcase page at root for logged-out visitors"
```

---

## Task 4: 手动核验(`npm run dev`)

**Files:** 无(仅运行核验)

- [ ] **Step 1: 启动 dev server**

Run: `npm run dev`
Expected: Vite 在 `localhost:5173` 启动。

- [ ] **Step 2: 登出态访问根路径**

清掉 `localStorage.token`(浏览器 DevTools → Application → Local Storage 删除 `token`,或用无痕窗口),访问 `http://localhost:5173/`。
Expected: 看到 sakura 展示页(背景 + Marquee 中文滚动 + 醒目 accent 登录按钮);地址栏仍是 `/`,**未跳到 `/auth`**。

- [ ] **Step 3: 点击登录按钮**

点醒目按钮。
Expected: 跳到 `/auth?redirect=%2F`,出现登录卡。

- [ ] **Step 4: 已登录态访问根路径**

`localStorage` 存在有效 `token` 时访问 `/`。
Expected: 直接进入聊天界面,**不出现展示页**。
（本地若无后端,可只确认登出/深链分支;已登录分支在接有后端的环境核验。）

- [ ] **Step 5: 深链回归**

登出态访问深链(如 `http://localhost:5173/c/anything`)。
Expected: 跳到 `/auth?redirect=/c/anything`(深链行为不变)。

- [ ] **Step 6: 移动端视口**

DevTools 切窄屏(如 375px)看展示页。
Expected: Marquee 文案与醒目按钮排版正常,按钮 `max-w-xs` 不溢出、未铺满全屏宽。

- [ ] **Step 7: 收尾**

无新增改动则无需 commit;若核验中发现样式微调,改完 `npm run check && npm run lint:frontend` 通过后再 commit。
