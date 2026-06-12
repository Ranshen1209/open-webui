# 模型选择器 Sakrylle 分组选择 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Sakrylle Web 的模型选择器按 Sakrylle 分组展示/筛选模型，下拉显示费率倍数，默认选 GPT-Pro 组并记住用户手选；对话请求按所选组（前缀 model id）计费。

**Architecture:** 后端在拉取该连接的 `/v1/models` 时追加 `?groups=all`（Sakrylle 聚合返回带 `group`+`display_name` 前缀 id 的模型），并把 `display_name` 映射到展示用的 `name`；前端按 `model.group` 派生分组、加分组下拉过滤、选中项用带前缀的完整 id 发起对话（后端原样转发，网关按前缀路由计费）。纯逻辑抽成可单测的小模块。

**Tech Stack:** FastAPI / Python（后端，pytest 8.4.2 在 `.venv`）、SvelteKit / TypeScript（前端，vitest）。

参考 spec：`docs/superpowers/specs/2026-06-11-model-group-selector-design.md`

---

## File Structure

- **新建** `backend/open_webui/utils/model_groups.py` — 两个纯函数：`append_query_params(url, params)`、`apply_display_name(model)`。无重依赖，便于单测。
- **新建** `backend/open_webui/test/test_model_groups.py` — 上述纯函数的 pytest。
- **改** `backend/open_webui/routers/openai.py` — `get_models_request` 用 `append_query_params` 追加配置的 query；`get_all_models` 逐模型调用 `apply_display_name`。
- **新建** `src/lib/utils/modelGroups.ts` — 纯函数 `deriveGroups`、`resolveSelectedGroupId`、`formatGroupLabel` + 常量 `DEFAULT_MODEL_GROUP_NAME` + localStorage 薄封装 `getSavedGroupId`/`saveGroupId`。
- **新建** `src/lib/utils/modelGroups.test.ts` — 纯函数 vitest。
- **改** `src/lib/components/chat/ModelSelector/Selector.svelte` — 接线：状态、分组过滤、分组下拉。
- **改** `.env`（本地，gitignored）— `OPENAI_API_CONFIGS` 加 `model_list_query`。

---

## Task 1: 后端纯函数模块 + 单测

**Files:**
- Create: `backend/open_webui/utils/model_groups.py`
- Test: `backend/open_webui/test/test_model_groups.py`

- [ ] **Step 1: 写失败测试**

Create `backend/open_webui/test/test_model_groups.py`:

```python
from open_webui.utils.model_groups import append_query_params, apply_display_name


def test_append_query_params_basic():
    assert (
        append_query_params('https://api.sakrylle.com/v1/models', {'groups': 'all'})
        == 'https://api.sakrylle.com/v1/models?groups=all'
    )


def test_append_query_params_empty_returns_unchanged():
    url = 'https://api.sakrylle.com/v1/models'
    assert append_query_params(url, {}) == url
    assert append_query_params(url, None) == url


def test_append_query_params_preserves_existing():
    out = append_query_params('https://api.sakrylle.com/v1/models?foo=bar', {'groups': 'all'})
    assert 'foo=bar' in out
    assert 'groups=all' in out


def test_apply_display_name_sets_name_keeps_prefixed_id():
    model = {'id': '12:claude-opus-4-6', 'display_name': 'claude-opus-4-6'}
    apply_display_name(model)
    assert model['name'] == 'claude-opus-4-6'
    assert model['id'] == '12:claude-opus-4-6'


def test_apply_display_name_noop_without_display_name():
    model = {'id': 'gpt-4o'}
    apply_display_name(model)
    assert 'name' not in model
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && ../.venv/bin/python -m pytest open_webui/test/test_model_groups.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'open_webui.utils.model_groups'`

- [ ] **Step 3: 写实现**

Create `backend/open_webui/utils/model_groups.py`:

```python
"""Pure helpers for Sakrylle model-group support (no app/db deps; unit-testable)."""

from urllib.parse import urlparse, urlunparse, urlencode, parse_qsl


def append_query_params(url: str, params: dict | None) -> str:
    """Append query params to a URL, preserving any existing ones.

    Returns the URL unchanged when params is falsy.
    """
    if not params:
        return url
    parts = urlparse(url)
    merged = dict(parse_qsl(parts.query))
    merged.update({str(k): str(v) for k, v in params.items()})
    return urlunparse(parts._replace(query=urlencode(merged)))


def apply_display_name(model: dict) -> None:
    """Use the upstream clean `display_name` as the UI `name` when present.

    The `id` is left untouched so any `<group_id>:` routing prefix is preserved.
    """
    if model.get('display_name'):
        model['name'] = model['display_name']
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd backend && ../.venv/bin/python -m pytest open_webui/test/test_model_groups.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: 提交**

```bash
git add backend/open_webui/utils/model_groups.py backend/open_webui/test/test_model_groups.py
git commit -m "feat(models): pure helpers for Sakrylle group query + display_name"
```

---

## Task 2: 接线到 openai.py

**Files:**
- Modify: `backend/open_webui/routers/openai.py`（`get_models_request` ~:117-126；`get_all_models` 逐模型段 ~:442-457；import 段顶部）

- [ ] **Step 1: 加 import**

在 `backend/open_webui/routers/openai.py` 现有 import 区加一行（紧跟其它 `from open_webui.utils...` import 之后）：

```python
from open_webui.utils.model_groups import append_query_params, apply_display_name
```

- [ ] **Step 2: 改 `get_models_request` 追加配置 query**

把现有函数体（约 :124-126）：

```python
    if is_anthropic_url(url):
        return await get_anthropic_models(url, key, user=user)
    return await send_get_request(request, f'{url}/models', key, user=user, config=config)
```

改为：

```python
    if is_anthropic_url(url):
        return await get_anthropic_models(url, key, user=user)
    models_url = f'{url}/models'
    if config and config.get('model_list_query'):
        models_url = append_query_params(models_url, config.get('model_list_query'))
    return await send_get_request(request, models_url, key, user=user, config=config)
```

- [ ] **Step 3: 改 `get_all_models` 逐模型映射 display_name**

在 `get_all_models()` 的逐模型 `for model in model_list:` 循环里，紧接现有的 `if provider: model['provider'] = provider` 之后（约 :457）加：

```python
                apply_display_name(model)
```

（缩进与同循环内其它 `if ...:` 语句对齐，3 级 tab。）

- [ ] **Step 4: 编译/导入自检**

Run: `cd backend && ../.venv/bin/python -c "import open_webui.routers.openai as m; print('import ok')"`
Expected: 打印 `import ok`，无 ImportError / SyntaxError。

- [ ] **Step 5: 提交**

```bash
git add backend/open_webui/routers/openai.py
git commit -m "feat(models): apply model_list_query + display_name in openai model fetch"
```

---

## Task 3: 本地 .env 开启聚合，重启验证

**Files:**
- Modify: `.env`（repo 根，gitignored）

- [ ] **Step 1: 改 OPENAI_API_CONFIGS**

把 `.env` 里这行：

```
OPENAI_API_CONFIGS={"0":{"auth_type":"system_oauth"}}
```

改为：

```
OPENAI_API_CONFIGS={"0":{"auth_type":"system_oauth","model_list_query":{"groups":"all"}}}
```

- [ ] **Step 2: 重启后端**

提示用户在其运行后端的终端重启（`.env` 在 import 时加载，`--reload` 不会重载它）：
`cd backend && ../.venv/bin/uvicorn open_webui.main:app --host 127.0.0.1 --port 8080`

- [ ] **Step 3: 验证聚合返回带前缀 id + group**

用户登录态浏览器控制台运行（或等 Task 6 一并测）：

```js
fetch('/api/models', { headers: { authorization: 'Bearer ' + localStorage.token } })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d.data.filter(m => m.group).slice(0,3), null, 2)));
```

Expected: 至少部分模型对象出现 `id` 形如 `"<digits>:<model>"`、含 `group:{id,name,rate_multiplier}`、`name` 为干净名。
若没有 `group` 字段：说明后端没带上 `?groups=all` 或未重启——回查 Task 2/3。

- [ ] **Step 4: 提交（.env 不入库，无需提交；仅记录）**

`.env` 已 gitignore，不提交。本任务无 commit。

---

## Task 4: 前端纯函数模块 + 单测

**Files:**
- Create: `src/lib/utils/modelGroups.ts`
- Test: `src/lib/utils/modelGroups.test.ts`

- [ ] **Step 1: 写失败测试**

Create `src/lib/utils/modelGroups.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveGroups, resolveSelectedGroupId, formatGroupLabel } from './modelGroups';

const item = (groupId?: number, name?: string, rate?: number) => ({
  model: groupId == null ? {} : { group: { id: groupId, name, rate_multiplier: rate } }
});

describe('deriveGroups', () => {
  it('dedupes by id, ignores models without group, sorts by name', () => {
    const groups = deriveGroups([
      item(12, 'GPT-Pro', 2),
      item(12, 'GPT-Pro', 2),
      item(3, 'Claude-Max', 1),
      item()
    ]);
    expect(groups.map((g) => g.name)).toEqual(['Claude-Max', 'GPT-Pro']);
    expect(groups.find((g) => g.id === 12)?.rate_multiplier).toBe(2);
  });

  it('returns [] when no model has a group', () => {
    expect(deriveGroups([item(), item()])).toEqual([]);
  });
});

describe('resolveSelectedGroupId', () => {
  const groups = [
    { id: 3, name: 'Claude-Max' },
    { id: 12, name: 'GPT-Pro' }
  ];

  it('uses saved id when still available', () => {
    expect(resolveSelectedGroupId(groups, 3, 'GPT-Pro')).toBe(3);
  });

  it('falls back to default-named group when saved is gone', () => {
    expect(resolveSelectedGroupId(groups, 999, 'GPT-Pro')).toBe(12);
  });

  it('falls back to first group when default name absent', () => {
    expect(resolveSelectedGroupId(groups, null, 'Nope')).toBe(3);
  });

  it('returns undefined for empty groups', () => {
    expect(resolveSelectedGroupId([], 1, 'GPT-Pro')).toBeUndefined();
  });
});

describe('formatGroupLabel', () => {
  it('appends multiplier when present', () => {
    expect(formatGroupLabel({ id: 1, name: 'GPT-Pro', rate_multiplier: 2 })).toBe('GPT-Pro ·2x');
  });
  it('shows only name when multiplier missing', () => {
    expect(formatGroupLabel({ id: 1, name: 'GPT-Pro' })).toBe('GPT-Pro');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/utils/modelGroups.test.ts`
Expected: FAIL — 无法解析 `./modelGroups`（模块不存在）。

- [ ] **Step 3: 写实现**

Create `src/lib/utils/modelGroups.ts`:

```ts
// Sakrylle 模型分组的纯逻辑 + localStorage 薄封装。
// 分组数据来自 /v1/models?groups=all 返回的每个模型 model.group:{id,name,rate_multiplier}。

export interface ModelGroup {
	id: number;
	name: string;
	rate_multiplier?: number;
}

/** 本部署的默认分组名（精确名匹配）。换默认组只改这里。 */
export const DEFAULT_MODEL_GROUP_NAME = 'GPT-Pro';

const STORAGE_KEY = 'sakrylle-web.selected-model-group';

/** 从选择器 items 派生去重分组，按 name 升序。无 group 的模型忽略。 */
export function deriveGroups(items: Array<{ model?: any }>): ModelGroup[] {
	const map = new Map<number, ModelGroup>();
	for (const item of items ?? []) {
		const g = item?.model?.group;
		if (!g || typeof g.id !== 'number') continue;
		if (!map.has(g.id)) {
			map.set(g.id, {
				id: g.id,
				name: typeof g.name === 'string' && g.name ? g.name : `Group ${g.id}`,
				rate_multiplier: typeof g.rate_multiplier === 'number' ? g.rate_multiplier : undefined
			});
		}
	}
	return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** 选中组优先级：已保存(仍可用) > 默认名组 > 第一个组。 */
export function resolveSelectedGroupId(
	groups: ModelGroup[],
	savedId: number | null,
	defaultName: string
): number | undefined {
	if (!groups.length) return undefined;
	if (savedId != null && groups.some((g) => g.id === savedId)) return savedId;
	const byName = groups.find((g) => g.name === defaultName);
	if (byName) return byName.id;
	return groups[0].id;
}

/** 下拉项文案：有倍率显示 "Name ·2x"，否则只显示名字。 */
export function formatGroupLabel(group: ModelGroup): string {
	return group.rate_multiplier != null ? `${group.name} ·${group.rate_multiplier}x` : group.name;
}

export function getSavedGroupId(): number | null {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v == null) return null;
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	} catch {
		return null;
	}
}

export function saveGroupId(id: number): void {
	try {
		localStorage.setItem(STORAGE_KEY, String(id));
	} catch {
		// ignore storage errors
	}
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/utils/modelGroups.test.ts`
Expected: PASS（全部用例通过）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/utils/modelGroups.ts src/lib/utils/modelGroups.test.ts
git commit -m "feat(model-selector): pure helpers for group derive/select/label"
```

---

## Task 5: 接线到 Selector.svelte

**Files:**
- Modify: `src/lib/components/chat/ModelSelector/Selector.svelte`（script: import + 状态 + 派生 + 过滤函数；markup: `<div class="px-2">` 内分组下拉）

- [ ] **Step 1: 加 import**

在 `<script>` 顶部其它 `$lib` import 旁加：

```ts
	import {
		deriveGroups,
		resolveSelectedGroupId,
		formatGroupLabel,
		getSavedGroupId,
		saveGroupId,
		DEFAULT_MODEL_GROUP_NAME
	} from '$lib/utils/modelGroups';
```

- [ ] **Step 2: 加状态 + 派生 + 默认选中**

在已有 `let selectedTag = '';`、`let selectedConnectionType = '';` 附近加：

```ts
	let selectedGroupId = undefined;
	let modelGroups = [];

	$: modelGroups = deriveGroups(items);
	$: if (modelGroups.length && selectedGroupId === undefined) {
		selectedGroupId = resolveSelectedGroupId(modelGroups, getSavedGroupId(), DEFAULT_MODEL_GROUP_NAME);
	}

	const matchesGroup = (item) =>
		modelGroups.length === 0 ||
		selectedGroupId === undefined ||
		item.model?.group?.id === selectedGroupId;
```

- [ ] **Step 3: 在 filteredItems 两个分支加分组过滤**

在 `$: filteredItems = (...)` 内，search 分支的 fuse 链末尾、以及非 search 分支(`: items.filter(...)`)链末尾，各追加一个 `.filter(matchesGroup)`。

search 分支：在该分支最后一个 `.filter((item) => { ...selectedConnectionType... })` 之后追加：
```ts
					.filter(matchesGroup)
```
非 search 分支（`else` 的 `items.filter(...).filter(...)`）末尾同样追加：
```ts
					.filter(matchesGroup)
```
（两处都加；`matchesGroup` 引用了 `selectedGroupId`/`modelGroups`，Svelte 会把它们纳入该响应式依赖。）

- [ ] **Step 4: 加分组下拉 markup**

在 markup 的 `<div class="px-2">`（约 :596，tags 行 `{#if tags && ...}` 之前）插入：

```svelte
					{#if modelGroups.length > 0}
						<div class="flex items-center gap-2 px-2.5 pt-1 pb-1">
							<span class="text-xs text-gray-500 dark:text-gray-400 shrink-0"
								>{$i18n.t('Group')}</span
							>
							<select
								id="model-group-select"
								class="w-full text-sm bg-transparent outline-hidden rounded-lg py-1 cursor-pointer"
								bind:value={selectedGroupId}
								on:change={() => {
									if (selectedGroupId != null) saveGroupId(selectedGroupId);
								}}
							>
								{#each modelGroups as group (group.id)}
									<option value={group.id}>{formatGroupLabel(group)}</option>
								{/each}
							</select>
						</div>
					{/if}
```

- [ ] **Step 5: 编译自检**

Run:
```bash
node -e 'const fs=require("fs");const {compile}=require("svelte/compiler");compile(fs.readFileSync("src/lib/components/chat/ModelSelector/Selector.svelte","utf8"),{filename:"Selector.svelte"});console.log("OK")'
```
Expected: 打印 `OK`，无编译错误。

- [ ] **Step 6: 运行前端单测回归**

Run: `npx vitest run src/lib/utils/modelGroups.test.ts`
Expected: PASS（确保未破坏）。

- [ ] **Step 7: 提交**

```bash
git add src/lib/components/chat/ModelSelector/Selector.svelte
git commit -m "feat(model-selector): group dropdown filter with rate multiplier"
```

---

## Task 6: 构建 + 端到端人工验证

**Files:** 无（验证）

- [ ] **Step 1: 构建前端**

Run: `npm run build`
Expected: `✓ built`，无错误（adapter-static `✔ done`）。

- [ ] **Step 2: 确认后端已带 .env(Task 3) 重启**

若未重启，提示用户重启后端（见 Task 3 Step 2）。

- [ ] **Step 3: 人工验证清单（8080，登录 SSO 后，硬刷新）**

- [ ] 模型选择器顶部出现「分组」下拉，选项形如 `GPT-Pro ·2.0x`、`Claude-Kiro-Special ·0.6x` 等。
- [ ] 默认选中 `GPT-Pro`（若该组在 allowed_groups 内）；否则第一个组。
- [ ] 切换分组 → 模型列表刷新为该组模型；模型名为干净名（无 `12:` 前缀）。
- [ ] 手动切到另一组 → 刷新页面后仍记住该组（localStorage 生效）。
- [ ] 选一个模型发消息成功；浏览器网络面板看 `POST /api/chat/completions` 的 body `model` 为带前缀 id（如 `12:claude-opus-4-6`）。
- [ ] 单分组用户：下拉只有一项（可接受）。

- [ ] **Step 4: 完成提交（如有未提交的构建产物按项目惯例处理）**

`build/` 是否入库依项目惯例；本计划不强制提交构建产物。

---

## Self-Review 备注

- **Spec 覆盖**：契约1(聚合 query)→Task2/3；契约2(前缀 id 透传)→无需改动，Task6 验证；契约3(计费)→网关侧，Task6 验证；display_name 映射→Task1/2；分组下拉+倍率→Task4/5；默认选中+持久化→Task4/5；`:` 安全→spec §6 已述（owned_by≠ollama），无需代码。
- **占位符**：无 TBD/TODO，代码均完整。
- **类型一致**：`ModelGroup{id,name,rate_multiplier}`、`selectedGroupId:number|undefined`、helper 名称在 Task4 定义、Task5 使用，一致。
- **已知限制**（spec §7）：基于带前缀模型的自定义预设 base_model 解析，本期不做。
