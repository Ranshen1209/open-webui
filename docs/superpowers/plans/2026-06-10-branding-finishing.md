# Sakrylle 品牌化收尾 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 去除 Sakrylle Web 中仍始终可见的 "Open WebUI" 痕迹——补全一项外联关闭配置，并把 2 个组件里 4 处残留 `$i18n.t` 文案改写为 `$WEBUI_NAME` 动态/中性措辞。

**Architecture:** 纯配置 + 文案改动。产品自指用 i18next 插值 `{{name}}` + `{ name: $WEBUI_NAME }`；"Open WebUI Community" 外部专有名词改中性。i18next 配置为 `returnEmptyString: false`（src/lib/i18n/index.ts:68）+ 启用插值，故空值/缺失键会回退到 key 文本并对 `{{name}}` 插值——源调用点的改动即生效，`translation.json` 同步为键表整洁（hygiene）。

**Tech Stack:** SvelteKit、i18next（`$i18n.t`，键即英文源串）、Svelte store `WEBUI_NAME`（`$lib/stores`）。

**关键事实：**
- `WEBUI_NAME` 由 `$lib/stores` 导出（index.ts:13）；两个目标组件**均未**引入它。
- 两组件都用 `const i18n = getContext('i18n')` → `$i18n.t(...)`。
- 4 处目标键在 en-US `translation.json` 中值为 `""`（628 / 1546 / 1577 / 2353 行）。
- 无单元测试可加；验证靠 grep 守卫 + `npm run check` + `npm run build` +（i18n）`npm run i18n:parse` 的 diff 审查。

---

## File Structure

| 文件 | 职责 | 改动 |
|---|---|---|
| `deploy/env.example` | 部署配置模板 | +1 行关闭外联更新检查 |
| `src/lib/components/chat/Settings/SyncStatsModal.svelte` | 同步统计弹窗 | 引入 `WEBUI_NAME` + 改写 3 处 `$i18n.t` |
| `src/lib/components/workspace/common/ManifestModal.svelte` | 插件资助弹窗 | 引入 `WEBUI_NAME` + 改写 1 处 `$i18n.t` |
| `src/lib/i18n/locales/en-US/translation.json`（及各语种） | i18n 键表 | `npm run i18n:parse` 对齐（新增 4 键、移除 4 旧键） |

---

## Task 1: 补全 deploy/env.example 外联关闭项

**Files:**
- Modify: `deploy/env.example`（Misc 段，`ENABLE_COMMUNITY_SHARING=False` 之后，约 67 行）

- [ ] **Step 1: 在 `ENABLE_COMMUNITY_SHARING=False` 行下方新增一行**

当前（约 64-67 行）：
```
####################################
# Misc
####################################
ENABLE_COMMUNITY_SHARING=False
```
改为：
```
####################################
# Misc
####################################
ENABLE_COMMUNITY_SHARING=False
ENABLE_VERSION_UPDATE_CHECK=False
```

- [ ] **Step 2: 验证**

Run: `grep -n "ENABLE_VERSION_UPDATE_CHECK" deploy/env.example`
Expected: 命中 `ENABLE_VERSION_UPDATE_CHECK=False`。

- [ ] **Step 3: Commit**

```bash
git add deploy/env.example
git commit -m "chore(deploy): disable external version-update check in env.example"
```

---

## Task 2: SyncStatsModal 文案改写

**Files:**
- Modify: `src/lib/components/chat/Settings/SyncStatsModal.svelte`（import 区第 7 行后；文案约 373 / 377-379 / 387 行）

- [ ] **Step 1: 引入 WEBUI_NAME store**

在第 7 行 `import { getVersion } from '$lib/apis';` 之后新增一行：
```javascript
	import { WEBUI_NAME } from '$lib/stores';
```

- [ ] **Step 2: 改写 "Open WebUI Community" → 中性（约 373 行）**

```svelte
{$i18n.t('Do you want to sync your usage stats with Open WebUI Community?')}
```
→
```svelte
{$i18n.t('Do you want to sync your usage stats with the community?')}
```

- [ ] **Step 3: 产品自指插值（约 377-379 行的多行 t 调用）**

当前：
```svelte
					{$i18n.t(
						'Participate in community leaderboards and evaluations! Syncing aggregated usage stats helps drive research and improvements to Open WebUI. Your privacy is paramount: no message content is ever shared.'
					)}
```
改为：
```svelte
					{$i18n.t(
						'Participate in community leaderboards and evaluations! Syncing aggregated usage stats helps drive research and improvements to {{name}}. Your privacy is paramount: no message content is ever shared.',
						{ name: $WEBUI_NAME }
					)}
```

- [ ] **Step 4: 产品自指插值（约 387 行）**

```svelte
<li>{$i18n.t('Open WebUI version')}</li>
```
→
```svelte
<li>{$i18n.t('{{name}} version', { name: $WEBUI_NAME })}</li>
```

- [ ] **Step 5: grep 守卫 + 类型检查**

Run: `grep -n "Open WebUI" src/lib/components/chat/Settings/SyncStatsModal.svelte`
Expected: 无输出。

Run: `npm run check`
Expected: 0 errors（警告均为既有）。

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/chat/Settings/SyncStatsModal.svelte
git commit -m "feat(branding): rewrite SyncStatsModal Open WebUI references to dynamic name/neutral"
```

---

## Task 3: ManifestModal 文案改写

**Files:**
- Modify: `src/lib/components/workspace/common/ManifestModal.svelte`（import 区第 7 行后；文案约 46-48 行）

- [ ] **Step 1: 引入 WEBUI_NAME store**

在第 7 行 `import XMark from '$lib/components/icons/XMark.svelte';` 之后新增一行：
```javascript
	import { WEBUI_NAME } from '$lib/stores';
```

- [ ] **Step 2: 产品自指插值（约 46-48 行）**

当前：
```svelte
							{$i18n.t(
								'Your entire contribution will go directly to the plugin developer; Open WebUI does not take any percentage. However, the chosen funding platform might have its own fees.'
							)}
```
改为：
```svelte
							{$i18n.t(
								'Your entire contribution will go directly to the plugin developer; {{name}} does not take any percentage. However, the chosen funding platform might have its own fees.',
								{ name: $WEBUI_NAME }
							)}
```

- [ ] **Step 3: grep 守卫 + 类型检查**

Run: `grep -n "Open WebUI" src/lib/components/workspace/common/ManifestModal.svelte`
Expected: 无输出。

Run: `npm run check`
Expected: 0 errors。

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/workspace/common/ManifestModal.svelte
git commit -m "feat(branding): rewrite ManifestModal Open WebUI reference to dynamic name"
```

---

## Task 4: 对齐 i18n 键表 + 整体验证

**Files:**
- Modify: `src/lib/i18n/locales/**/translation.json`（由 `npm run i18n:parse` 生成）

- [ ] **Step 1: 重新解析 i18n 键**

Run: `npm run i18n:parse`
Expected: 命令成功结束。该命令扫描源码 `$i18n.t` 调用，向各语种 `translation.json` 写入新键、移除不再引用的旧键。

- [ ] **Step 2: 审查 translation.json diff（关键）**

Run: `git diff --stat src/lib/i18n/locales`
然后 `git diff src/lib/i18n/locales/en-US/translation.json`

Expected（机械、可预期的变化）：
- 移除旧键：`"Do you want to sync your usage stats with Open WebUI Community?"`、`"Open WebUI version"`、`"Participate in community leaderboards ... improvements to Open WebUI. ..."`、`"Your entire contribution ... Open WebUI does not take any percentage. ..."`
- 新增键：`"Do you want to sync your usage stats with the community?"`、`"{{name}} version"`、`"Participate in community leaderboards ... improvements to {{name}}. ..."`、`"Your entire contribution ... {{name}} does not take any percentage. ..."`（en-US 值为 `""`）
- 其他语种文件可能同步增删这 4 键（纯机械）。
- 若出现与这 4 键无关的大范围重排，停止并报告（可能是 parser 版本/格式差异）——不要盲目提交无关 churn。

- [ ] **Step 3: 全局守卫——这两个组件的 "Open WebUI" 已清除；新键已落位**

Run:
```bash
grep -rn "Open WebUI" src/lib/components/chat/Settings/SyncStatsModal.svelte src/lib/components/workspace/common/ManifestModal.svelte
grep -rn "{{name}} version\|improvements to {{name}}\|{{name}} does not take" src/lib/i18n/locales/en-US/translation.json
```
Expected: 第一条无输出；第二条命中 3 个新键。

- [ ] **Step 4: 构建 + 类型检查**

Run: `npm run check && npm run build`
Expected: check 0 errors；build 成功（~50s；pyodide 环境性失败可报告，不算代码失败）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/locales
git commit -m "chore(i18n): sync translation keys after branding rewrites"
```

---

## Self-Review（已执行）

**Spec coverage：**
- §3 配置补全（`ENABLE_VERSION_UPDATE_CHECK=False`）→ Task 1 ✓
- §4 文案改写 #1（中性化）→ Task 2 Step 2 ✓
- §4 文案改写 #2/#3（SyncStatsModal 插值）→ Task 2 Step 3/4 ✓
- §4 文案改写 #4（ManifestModal 插值）→ Task 3 ✓
- §4 i18n 键表对齐（i18n:parse + diff 审查）→ Task 4 ✓
- §5 验证（grep 守卫 / check / build）→ 各任务 + Task 4 汇总 ✓

**Placeholder scan：** 无 TBD/TODO；每处 before→after 给出完整代码；Task 4 Step 2 对"非预期大范围 churn"给出明确停-报路径（非占位）。

**Type/命名一致：** 全程 `import { WEBUI_NAME } from '$lib/stores'`、`$i18n.t('... {{name}} ...', { name: $WEBUI_NAME })`、键文本前后一致；新键文本在 Task 2/3（源调用）与 Task 4（守卫）中逐字一致。

**行号偏差风险：** 行号为快照；每处给出唯一英文 key 串作锚点，实现期以 grep 定位为准。
