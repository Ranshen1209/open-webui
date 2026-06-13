# 设计稿:登出访客的根路径展示页(Logged-out Landing Page)

- 日期:2026-06-13
- 分支:`theme/sakrylle`
- 范围:纯前端(SvelteKit),无后端 / `.env` / 镜像改动

## 1. 目标

未登录用户访问 `https://chat.sakrylle.com`(根路径)时,**不再直接跳转**到
`/auth?redirect=%2F`,而是就地展示一个符合当前 sakura 风格的展示页(splash),
页面上有一个醒目的登录按钮。用户点击后才跳到 `/auth?redirect=%2F`,完成 OIDC
登录后进入聊天界面。已经登录(token/session 有效)的用户访问根路径时直接进入
聊天界面,不出现展示页。

### 行为矩阵

| 状态 | 访问 | 结果 |
|---|---|---|
| 登出 | `/` | 展示页;**URL 保持 `chat.sakrylle.com`** |
| 登出 | 深链(如 `/c/<id>`) | `/auth?redirect=/c/<id>`(行为不变) |
| 已登录(token 有效) | `/` | 直接进入聊天(行为不变) |
| 在展示页点登录按钮 | — | `/auth?redirect=%2F` → 登录卡(Continue with Sakrylle)→ OIDC → 回到聊天 |

## 2. 当前实现(现状)

- 根布局 `src/routes/+layout.svelte` 的 `onMount` 中(约 1094–1100 行):无
  `localStorage.token` 且当前不在 `/auth` 时,执行
  `goto(\`/auth?redirect=${encodedUrl}\`)`。这就是登出访问 `/` 被直接送到
  `/auth?redirect=%2F` 的原因。`encodedUrl` 由当前 `pathname + search` 编码而来。
- 根布局渲染块(约 1184–1196 行):`{#if loaded}` 内 `{#if $isApp}…{:else}<slot/>{/if}`。
- `(app)/+layout.svelte` 的 `onMount`(约 196 行):无 `$user` 时 `goto('/auth')`。
  注意它是根布局的子级,**只有在 `<slot/>` 渲染时才会挂载**。
- 既有 splash 组件 `src/lib/components/OnBoarding.svelte`:已有 sakura 主题背景
  (`SlideShow`)、`Marquee` 滚动文案(两句中文,硬编码)、小箭头「Get started」
  按钮,以及 `show` / `getStartedHandler` 两个 prop。当前仅在首次安装引导
  (`config.onboarding`)时由 `src/routes/auth/+page.svelte` 渲染。

## 3. 方案(已选:方案 A — 根路径就地渲染)

唯一能保持裸根 URL、且不改变深链行为的方案:在根布局拦截「登出 + 根路径」这一
种情况,改为渲染展示页而非渲染 `<slot/>`;因为不渲染 `<slot/>`,`(app)` 布局不会
挂载,也就不会再触发它内部跳 `/auth` 的逻辑。

(已否决:方案 B 独立路由 `/welcome` 会改变 URL;方案 C 放进 `(app)` 布局仍需先改
根布局拦截,更绕。)

## 4. 详细改动

### 4.1 `src/routes/+layout.svelte` — 路由 / 渲染

**(a) 新增状态**(与其它 `let` 声明同处,约 103 行附近):

```js
let showLanding = false;
```

**(b) 重定向块**(当前约 1094–1100 行)改为:

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

说明:`$page.url.pathname` 不含 query,所以 `/?foo=bar` 仍命中 `'/'`(可接受)。
`showLanding` 仅在「无有效 session」分支里被置真;有 token 且 `getSessionUser`
成功时不会进入此分支,因此已登录用户不会看到展示页。

**(c) 渲染块**(当前约 1184–1196 行)改为:

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

**(d) 引入组件**(与其它 import 同处):

```js
import OnBoarding from '$lib/components/OnBoarding.svelte';
```

根布局已 `setContext('i18n', i18n)`(约 99 行),`OnBoarding` 用 `getContext('i18n')`
可正常取到。`loaded` 在登出分支后照常被置真(`showLanding` 路径不 return)。

### 4.2 `src/lib/components/OnBoarding.svelte` — 可复用 splash

**(a) 新增 prop**:

```js
export let prominent = false; // true: 醒目登录大按钮;false: 现有小箭头(首次引导)
```

**(b) Marquee 文案改走 i18n**(当前 75–78 行硬编码)。改为:

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

采用英文整句作为 i18n key(与仓库现有约定一致),`zh-CN` 映射为原中文两句。

**(c) 按钮区**(当前 82–97 行):按 `prominent` 分支。

- `prominent === false`:保持现状(小箭头圆钮 + 下方「Get started」标签),首次安装
  引导不变。
- `prominent === true`:渲染醒目 accent 胶囊大按钮,沿用站内既有 accent 样式
  (参考 `auth/+page.svelte` 的 `bg-accent-500 hover:bg-accent-400 text-accent-950
  rounded-full`),按钮内含「Get started」文案 + 右箭头图标
  (`ArrowRightCircle`,已 import)。响应式:窄屏 `w-full`,`sm` 以上 `w-auto`,
  `px-8 py-3 text-base`,`aria-label` 用 `$i18n.t('Get started')`。

示意(prominent 形态):

```
            在樱花轻落的时光里,与你的每一次对话…   (Marquee 滚动)

            ╭──────────────────────────╮
            │      开始体验    →         │   ← accent 大胶囊
            ╰──────────────────────────╯
                 (sm 以下 w-full / sm 以上 w-auto)
```

### 4.3 i18n locale

- `src/lib/i18n/locales/zh-CN/translation.json`:
  - 将 `"Get started"` 的值由 `"开始使用"` 改为 `"开始体验"`(该 key 仅
    `OnBoarding.svelte` 使用,首次引导与展示页共享,视觉一致,可接受)。
  - 为两句 Marquee 英文 key 新增中文翻译:
    - `"In the season of drifting cherry blossoms, every conversation with you reads like a love letter written by the spring breeze"` → `"在樱花轻落的时光里,与你的每一次对话都像春风写下的情书"`
    - `"Let inspiration quietly bloom, and let thoughts gently meet"` → `"让灵感悄然绽放,让思绪温柔相遇"`
- 运行 `npm run i18n:parse` 将新 key 同步进各 locale(缺失语言回退到英文 key 文本)。
- `en-US`:英文 key 即默认显示文本,可由 `i18n:parse` 生成空值条目(回退到 key)。

## 5. 边界情况

- **首次安装(无用户)**:登出访问 `/` 会先看到展示页,点按钮 → `/auth` 走
  管理员创建流程,功能不受影响。
- **深链登出**:`/c/<id>`、`/notes/...` 等仍走 `/auth?redirect=<原地址>`,登录后
  回到原地址,行为不变。
- **OAuth 回调**:回调落在 `/auth`(经 cookie/URL 片段),不经过根路径分支,不受影响。
- **`OAUTH_AUTO_REDIRECT`**:服务器侧已设为 `False`(见 CLAUDE.md),`/auth` 会停在
  登录卡;本改动不依赖也不改变该设置。

## 6. 验证(前端,`npm run dev`)

1. 登出访问 `/` → 看到 sakura 展示页,且地址栏仍是裸根路径(URL 不变)。
2. 点醒目按钮 → 跳到 `/auth?redirect=%2F`,出现登录卡。
3. 已登录(localStorage 有有效 token)访问 `/` → 直接进入聊天,无展示页。
4. 登出访问深链(如 `/c/xxx`)→ 跳 `/auth?redirect=/c/xxx`(回归测试,行为不变)。
5. 移动端窄视口:Marquee 文案与醒目按钮排版正常,按钮整宽不溢出。
6. `npm run check` 与 `npm run lint:frontend` 通过。

## 7. 不做的事(YAGNI)

- 不新增独立路由(不引入 `/welcome`)。
- 不新增产品介绍区块 / 特性卡片(沿用现有 splash,不做全新落地页)。
- 不改后端、`config.py`、`.env`、CI 镜像。
- 不改深链 / OAuth 回调 / 首次安装引导的既有逻辑。
