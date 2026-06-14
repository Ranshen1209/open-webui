# Sidebar Sakrylle API Balance + Top-up Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the logged-in user's live Sakrylle API balance plus a "Top up" button (→ `https://sub.sakrylle.com/purchase`) pinned at the bottom of the left sidebar.

**Architecture:** A backend proxy endpoint `GET /api/v1/account/balance` reuses the existing `system_oauth` token-forwarding chain to call the gateway's `GET /v1/account/balance`, normalizes the response, and degrades to `{available:false}` on any error. The frontend fetches it into a small `AccountBalance.svelte` widget mounted in the sidebar; the widget hides entirely when balance is unavailable. The purchase URL is a backend env var exposed via `/api/config`.

**Tech Stack:** FastAPI + aiohttp (backend), SvelteKit + i18next + vitest (frontend), pytest (backend tests).

---

## File Structure

**Create:**
- `backend/open_webui/routers/account.py` — balance proxy router + pure `normalize_balance()` helper.
- `backend/open_webui/test/test_account.py` — unit tests for `normalize_balance()`.
- `src/lib/utils/balance.ts` — pure `formatBalance()` display helper.
- `src/lib/utils/balance.test.ts` — vitest tests for `formatBalance()`.
- `src/lib/components/layout/Sidebar/AccountBalance.svelte` — the widget (expanded + collapsed render).

**Modify:**
- `backend/open_webui/env.py` — add `SAKRYLLE_PURCHASE_URL`.
- `backend/open_webui/main.py` — import env var + router, register router, expose `purchase_url` in `/api/config`.
- `src/lib/apis/index.ts` — add `getAccountBalance()`.
- `src/lib/components/layout/Sidebar.svelte` — mount widget (expanded + collapsed).
- `src/lib/i18n/locales/en-US/translation.json`, `.../zh-CN/translation.json` — add `Balance`, `Top up`.
- `deploy/env.example` — add `account:balance:read` scope + `SAKRYLLE_PURCHASE_URL`.
- `oidc-docs/troubleshooting.md` — add "Balance not showing" section.

---

## Task 1: Backend env var `SAKRYLLE_PURCHASE_URL` + expose via `/api/config`

**Files:**
- Modify: `backend/open_webui/env.py:1083` (Sakrylle slim-profile flags section)
- Modify: `backend/open_webui/main.py:459` (env import block) and `:2435` (`/api/config` response)

- [ ] **Step 1: Declare the env var in env.py**

In `backend/open_webui/env.py`, the Sakrylle slim-profile flags section ends with the `SAKRYLLE_ENABLE_OLLAMA_ROUTER` block (around line 1082-1085). Add immediately after it:

```python
# External purchase / top-up page the sidebar balance widget links to.
# Defaults to the production Sakrylle billing page; override per-deployment.
SAKRYLLE_PURCHASE_URL = os.getenv('SAKRYLLE_PURCHASE_URL', 'https://sub.sakrylle.com/purchase')
```

- [ ] **Step 2: Import it in main.py**

In `backend/open_webui/main.py`, the env import block (alphabetical, around line 458-459) currently has:

```python
    SAKRYLLE_ENABLE_OLLAMA_ROUTER,
    SAKRYLLE_ENABLE_RETRIEVAL_ROUTER,
```

Add `SAKRYLLE_PURCHASE_URL,` after them:

```python
    SAKRYLLE_ENABLE_OLLAMA_ROUTER,
    SAKRYLLE_ENABLE_RETRIEVAL_ROUTER,
    SAKRYLLE_PURCHASE_URL,
```

- [ ] **Step 3: Expose it in the `/api/config` response**

In `backend/open_webui/main.py`, in `get_app_config()` (around line 2430-2435), the returned dict has:

```python
        'default_locale': str(DEFAULT_LOCALE),
        'oauth': {
```

Insert `purchase_url` between them:

```python
        'default_locale': str(DEFAULT_LOCALE),
        'purchase_url': SAKRYLLE_PURCHASE_URL,
        'oauth': {
```

- [ ] **Step 4: Verify the wiring imports cleanly**

Run: `cd backend && ../.venv/bin/python -c "import open_webui.main"`
Expected: no ImportError (exits 0). If the venv isn't set up, instead run `../.venv/bin/python -c "from open_webui.env import SAKRYLLE_PURCHASE_URL; print(SAKRYLLE_PURCHASE_URL)"` and expect `https://sub.sakrylle.com/purchase`.

- [ ] **Step 5: Commit**

```bash
git add backend/open_webui/env.py backend/open_webui/main.py
git commit -m "feat(config): add SAKRYLLE_PURCHASE_URL, expose purchase_url in /api/config"
```

---

## Task 2: Backend balance proxy endpoint

**Files:**
- Create: `backend/open_webui/routers/account.py`
- Test: `backend/open_webui/test/test_account.py`
- Modify: `backend/open_webui/main.py:483` (routers import) and `:1442` (include_router)

- [ ] **Step 1: Write the failing test for `normalize_balance()`**

Create `backend/open_webui/test/test_account.py`:

```python
from open_webui.routers.account import normalize_balance


def test_normalize_balance_success():
    out = normalize_balance(
        {
            'credit_remaining': 8.94,
            'currency_symbol': '¥',
            'currency_display': 'CNY',
            'group_name': 'GPT-Pro',
            'rate_multiplier': 1.0,
            'extra_ignored': 'x',
        }
    )
    assert out == {
        'available': True,
        'credit_remaining': 8.94,
        'currency_symbol': '¥',
        'currency_display': 'CNY',
        'group_name': 'GPT-Pro',
        'rate_multiplier': 1.0,
    }


def test_normalize_balance_missing_credit_is_unavailable():
    assert normalize_balance({'currency_symbol': '¥'}) == {'available': False}


def test_normalize_balance_none_credit_is_unavailable():
    assert normalize_balance({'credit_remaining': None}) == {'available': False}


def test_normalize_balance_non_dict_is_unavailable():
    assert normalize_balance(None) == {'available': False}
    assert normalize_balance('nope') == {'available': False}


def test_normalize_balance_optional_fields_default_none():
    out = normalize_balance({'credit_remaining': 0})
    assert out['available'] is True
    assert out['credit_remaining'] == 0
    assert out['currency_symbol'] is None
    assert out['group_name'] is None
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && ../.venv/bin/python -m pytest open_webui/test/test_account.py -v`
Expected: FAIL / collection error — `ModuleNotFoundError: No module named 'open_webui.routers.account'`.

- [ ] **Step 3: Create the router with the pure helper + endpoint**

Create `backend/open_webui/routers/account.py`:

```python
import logging

import aiohttp
from fastapi import APIRouter, Depends, Request

from open_webui.env import AIOHTTP_CLIENT_SESSION_SSL
from open_webui.routers.openai import get_headers_and_cookies
from open_webui.utils.auth import get_verified_user

log = logging.getLogger(__name__)

router = APIRouter()

# Upstream gateway connection index (idx 0 == the system_oauth Sakrylle connection).
GATEWAY_IDX = 0
BALANCE_FETCH_TIMEOUT = 10

UNAVAILABLE = {'available': False}


def normalize_balance(data) -> dict:
    """Map a gateway /v1/account/balance response to the frontend shape.

    Returns {'available': False} for anything missing a numeric credit_remaining.
    """
    if not isinstance(data, dict) or data.get('credit_remaining') is None:
        return {'available': False}
    return {
        'available': True,
        'credit_remaining': data.get('credit_remaining'),
        'currency_symbol': data.get('currency_symbol'),
        'currency_display': data.get('currency_display'),
        'group_name': data.get('group_name'),
        'rate_multiplier': data.get('rate_multiplier'),
    }


@router.get('/balance')
async def get_account_balance(request: Request, user=Depends(get_verified_user)):
    """Proxy the current user's Sakrylle gateway balance.

    Forwards the user's OAuth token (system_oauth) to the gateway. Any failure
    (missing scope, no oauth session, gateway/network error) degrades silently to
    {'available': False} so the sidebar widget simply hides.
    """
    base_urls = request.app.state.config.OPENAI_API_BASE_URLS
    if not base_urls or GATEWAY_IDX >= len(base_urls):
        return UNAVAILABLE

    url = base_urls[GATEWAY_IDX]
    keys = request.app.state.config.OPENAI_API_KEYS
    key = keys[GATEWAY_IDX] if GATEWAY_IDX < len(keys) else None
    api_config = request.app.state.config.OPENAI_API_CONFIGS.get(
        str(GATEWAY_IDX),
        request.app.state.config.OPENAI_API_CONFIGS.get(url, {}),
    )

    try:
        headers, cookies = await get_headers_and_cookies(
            request, url, key, api_config, user=user
        )
        async with aiohttp.ClientSession(
            trust_env=True,
            timeout=aiohttp.ClientTimeout(total=BALANCE_FETCH_TIMEOUT),
        ) as session:
            async with session.get(
                f'{url}/account/balance',
                headers=headers,
                cookies=cookies,
                ssl=AIOHTTP_CLIENT_SESSION_SSL,
            ) as r:
                if r.status != 200:
                    log.debug(f'Balance fetch returned HTTP {r.status}')
                    return UNAVAILABLE
                data = await r.json()
    except Exception as e:
        log.debug(f'Balance fetch failed: {e}')
        return UNAVAILABLE

    return normalize_balance(data)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && ../.venv/bin/python -m pytest open_webui/test/test_account.py -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Register the router in main.py**

In `backend/open_webui/main.py`, the routers import block starts at line 482 with `from open_webui.routers import (`. Add `account,` as the first entry (it currently begins with `analytics,`):

```python
from open_webui.routers import (
    account,
    analytics,
    audio,
```

Then, in the `include_router` section (around line 1442, just before `app.include_router(openai.router, ...)`), add:

```python
app.include_router(account.router, prefix='/api/v1/account', tags=['account'])
```

- [ ] **Step 6: Verify app still imports**

Run: `cd backend && ../.venv/bin/python -c "import open_webui.main"`
Expected: exits 0, no ImportError.

- [ ] **Step 7: Commit**

```bash
git add backend/open_webui/routers/account.py backend/open_webui/test/test_account.py backend/open_webui/main.py
git commit -m "feat(account): add GET /api/v1/account/balance gateway proxy"
```

---

## Task 3: Frontend `formatBalance()` display helper

**Files:**
- Create: `src/lib/utils/balance.ts`
- Test: `src/lib/utils/balance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/balance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatBalance } from './balance';

describe('formatBalance', () => {
	it('formats a positive amount with the symbol and 2 decimals', () => {
		expect(formatBalance(8.945, '¥')).toBe('¥8.95');
	});

	it('formats zero', () => {
		expect(formatBalance(0, '¥')).toBe('¥0.00');
	});

	it('falls back to ¥ when symbol is missing', () => {
		expect(formatBalance(3, null)).toBe('¥3.00');
		expect(formatBalance(3, undefined)).toBe('¥3.00');
		expect(formatBalance(3, '')).toBe('¥3.00');
	});

	it('returns empty string for non-numeric amount', () => {
		expect(formatBalance(null, '¥')).toBe('');
		expect(formatBalance(undefined, '¥')).toBe('');
		expect(formatBalance(NaN, '¥')).toBe('');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/utils/balance.test.ts`
Expected: FAIL — cannot resolve `./balance`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/utils/balance.ts`:

```ts
/**
 * Format a balance amount for display, e.g. formatBalance(8.94, '¥') -> '¥8.94'.
 * Returns '' when amount is not a finite number so callers can hide the widget.
 */
export const formatBalance = (
	amount: number | null | undefined,
	symbol: string | null | undefined
): string => {
	if (typeof amount !== 'number' || !Number.isFinite(amount)) {
		return '';
	}
	const sym = symbol && symbol.length > 0 ? symbol : '¥';
	return `${sym}${amount.toFixed(2)}`;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/utils/balance.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/balance.ts src/lib/utils/balance.test.ts
git commit -m "feat(utils): add formatBalance helper"
```

---

## Task 4: Frontend API client `getAccountBalance()`

**Files:**
- Modify: `src/lib/apis/index.ts` (add after the existing `getUsage` export, ~line 1442)

- [ ] **Step 1: Add the API function**

In `src/lib/apis/index.ts`, immediately after the `getUsage` export (it ends with `return res;\n};` around line 1442), add:

```ts
export const getAccountBalance = async (token: string = '') => {
	const res = await fetch(`${WEBUI_BASE_URL}/api/v1/account/balance`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			...(token && { Authorization: `Bearer ${token}` })
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			console.error(err);
			return null;
		});

	return res;
};
```

Note: unlike `getUsage`, this swallows errors and returns `null` (the widget treats `null`/`available:false` identically as "hide").

- [ ] **Step 2: Type-check**

Run: `npx svelte-check --tsconfig ./tsconfig.json --no-tsconfig 2>/dev/null || npx tsc --noEmit src/lib/apis/index.ts`
Expected: no new errors referencing `getAccountBalance`. (If the project-wide `npm run check` is too slow, a targeted `node -e "require('typescript')"` is unnecessary — just ensure the file parses.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/apis/index.ts
git commit -m "feat(apis): add getAccountBalance client"
```

---

## Task 5: `AccountBalance.svelte` widget

**Files:**
- Create: `src/lib/components/layout/Sidebar/AccountBalance.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/components/layout/Sidebar/AccountBalance.svelte`:

```svelte
<script lang="ts">
	import { onMount, onDestroy, getContext } from 'svelte';
	import { config, user } from '$lib/stores';
	import { getAccountBalance } from '$lib/apis';
	import { formatBalance } from '$lib/utils/balance';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	const i18n = getContext('i18n');

	export let collapsed = false;

	let balance: {
		available?: boolean;
		credit_remaining?: number;
		currency_symbol?: string;
	} | null = null;

	$: purchaseUrl = $config?.purchase_url ?? 'https://sub.sakrylle.com/purchase';
	$: available = balance?.available === true;
	$: amountText = available
		? formatBalance(balance?.credit_remaining, balance?.currency_symbol)
		: '';

	const token = () => localStorage.token;

	const refresh = async () => {
		if (!$user) {
			balance = null;
			return;
		}
		balance = await getAccountBalance(token());
	};

	const onFocus = () => {
		refresh();
	};

	onMount(() => {
		refresh();
		window.addEventListener('focus', onFocus);
	});

	onDestroy(() => {
		window.removeEventListener('focus', onFocus);
	});
</script>

{#if available && amountText}
	{#if collapsed}
		<Tooltip content={`${$i18n.t('Balance')} ${amountText}`} placement="right">
			<a
				href={purchaseUrl}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={$i18n.t('Top up')}
				class="flex items-center justify-center size-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
			>
				<!-- wallet icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
					/>
				</svg>
			</a>
		</Tooltip>
	{:else}
		<div
			class="flex items-center justify-between gap-2 rounded-2xl py-1.5 px-3 mb-1 text-sm"
		>
			<span class="text-gray-600 dark:text-gray-400 truncate">
				{$i18n.t('Balance')}
				<span class="font-medium text-gray-900 dark:text-gray-100">{amountText}</span>
			</span>
			<a
				href={purchaseUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="flex-shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-850 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
			>
				{$i18n.t('Top up')}
			</a>
		</div>
	{/if}
{/if}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | grep -i "AccountBalance" || echo "no AccountBalance errors"`
Expected: `no AccountBalance errors` (the component type-checks). Note: a full `svelte-check` may print unrelated pre-existing warnings; only AccountBalance-specific errors matter here.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/layout/Sidebar/AccountBalance.svelte
git commit -m "feat(sidebar): add AccountBalance widget component"
```

---

## Task 6: Mount the widget in the sidebar (expanded + collapsed)

**Files:**
- Modify: `src/lib/components/layout/Sidebar.svelte` (import + two mount points)

- [ ] **Step 1: Import the component**

In `src/lib/components/layout/Sidebar.svelte`, find the existing UserMenu import (line 57):

```js
	import UserMenu from './Sidebar/UserMenu.svelte';
```

Add directly below it:

```js
	import AccountBalance from './Sidebar/AccountBalance.svelte';
```

- [ ] **Step 2: Mount in the expanded sidebar bottom**

Find this block (around lines 1600-1602):

```svelte
				<div class="flex flex-col font-primary">
					{#if $user !== undefined && $user !== null}
						<UserMenu
							role={$user?.role}
```

Insert `<AccountBalance />` between the `{#if}` and `<UserMenu`:

```svelte
				<div class="flex flex-col font-primary">
					{#if $user !== undefined && $user !== null}
						<AccountBalance />
						<UserMenu
							role={$user?.role}
```

- [ ] **Step 3: Mount in the collapsed icon rail**

Find this block (around lines 937-940):

```svelte
			<div>
				<div>
					<div class=" py-2 flex justify-center items-center">
						{#if $user !== undefined && $user !== null}
							<UserMenu
								role={$user?.role}
```

Change it to add a stacked collapsed widget above the avatar row:

```svelte
			<div>
				<div>
					{#if $user !== undefined && $user !== null}
						<div class="pt-2 flex justify-center items-center">
							<AccountBalance collapsed />
						</div>
					{/if}
					<div class=" py-2 flex justify-center items-center">
						{#if $user !== undefined && $user !== null}
							<UserMenu
								role={$user?.role}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | grep -iE "Sidebar.svelte|AccountBalance" || echo "no sidebar/balance errors"`
Expected: `no sidebar/balance errors`.

- [ ] **Step 5: Manual visual check (dev server)**

Run: `npm run dev` and open `localhost:5173`. With the backend unavailable or balance returning `{available:false}`, confirm the sidebar renders normally with NO balance row (widget hidden, no console errors). (Live balance requires the backend + a logged-in OAuth session; verified in Task 9.)
Expected: sidebar unchanged when balance unavailable; no runtime errors in console.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/layout/Sidebar.svelte
git commit -m "feat(sidebar): mount AccountBalance widget (expanded + collapsed)"
```

---

## Task 7: i18n keys

**Files:**
- Modify: `src/lib/i18n/locales/en-US/translation.json`
- Modify: `src/lib/i18n/locales/zh-CN/translation.json`

- [ ] **Step 1: Add keys to en-US**

In `src/lib/i18n/locales/en-US/translation.json`, find:

```json
	"Banners": "",
```

Insert `"Balance"` immediately before it:

```json
	"Balance": "Balance",
	"Banners": "",
```

Then find:

```json
	"Today": "",
```

Insert `"Top up"` immediately before it:

```json
	"Top up": "Top up",
	"Today": "",
```

- [ ] **Step 2: Add keys to zh-CN**

In `src/lib/i18n/locales/zh-CN/translation.json`, find:

```json
	"Banners": "公告横幅",
```

Insert before it:

```json
	"Balance": "余额",
	"Banners": "公告横幅",
```

Then find:

```json
	"Today": "今天",
```

Insert before it:

```json
	"Top up": "充值",
	"Today": "今天",
```

- [ ] **Step 3: Verify both JSON files are valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/lib/i18n/locales/en-US/translation.json','utf8')); JSON.parse(require('fs').readFileSync('src/lib/i18n/locales/zh-CN/translation.json','utf8')); console.log('valid')"`
Expected: `valid`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/locales/en-US/translation.json src/lib/i18n/locales/zh-CN/translation.json
git commit -m "i18n: add Balance and Top up strings (en-US, zh-CN)"
```

---

## Task 8: Deploy docs (env.example + troubleshooting)

**Files:**
- Modify: `deploy/env.example:45` (OAUTH_SCOPES) and `:85` area (SAKRYLLE flags)
- Modify: `oidc-docs/troubleshooting.md` (new section before "Canonical references")

- [ ] **Step 1: Add `account:balance:read` scope to env.example**

In `deploy/env.example`, find line 45:

```
OAUTH_SCOPES=openid email profile models:read chat.completions:create responses:create messages:create usage:read offline_access
```

Add `account:balance:read` (so the sidebar balance can be read):

```
OAUTH_SCOPES=openid email profile models:read chat.completions:create responses:create messages:create usage:read account:balance:read offline_access
```

- [ ] **Step 2: Add `SAKRYLLE_PURCHASE_URL` to env.example**

In `deploy/env.example`, find line 85:

```
SAKRYLLE_ENABLE_RETRIEVAL_ROUTER=True
```

Add below it:

```
# Sidebar "Top up" button target. Default points at the production billing page.
SAKRYLLE_PURCHASE_URL=https://sub.sakrylle.com/purchase
```

- [ ] **Step 3: Add a troubleshooting section**

In `oidc-docs/troubleshooting.md`, find the final section header:

```
## Canonical references
```

Insert a new section immediately before it:

```markdown
## Balance not showing in the sidebar

The sidebar balance + 充值 widget calls `GET /api/v1/account/balance`, which proxies
the user's OAuth token to the gateway `GET /v1/account/balance`. The widget hides
itself (no error) whenever the gateway does not return a balance. Checklist:

- **Scope:** `OAUTH_SCOPES` in the server `.env` must include `account:balance:read`
  (the gateway gates `/v1/account/balance` on it — see the center doc
  `rp-integration-guide.md` §10.2/§12). After adding it, **restart the container and
  have users re-login** — old tokens lack the scope.
- **Connection:** balance is read from the `idx 0` OpenAI connection
  (`OPENAI_API_CONFIGS["0"]` with `auth_type=system_oauth`). If that connection is
  missing or misconfigured, balance is unavailable.
- **Purchase URL:** the 充值 button uses `SAKRYLLE_PURCHASE_URL` (exposed at
  `/api/config` as `purchase_url`), default `https://sub.sakrylle.com/purchase`.
- Verify the route exists: `curl -s -o /dev/null -w "%{http_code}" https://chat.sakrylle.com/api/v1/account/balance` returns `401` unauthenticated (route present), not `404`.

```

- [ ] **Step 4: Verify markdown + env files**

Run: `grep -n "account:balance:read" deploy/env.example && grep -n "SAKRYLLE_PURCHASE_URL" deploy/env.example && grep -n "Balance not showing" oidc-docs/troubleshooting.md`
Expected: each grep prints a matching line.

- [ ] **Step 5: Commit**

```bash
git add deploy/env.example oidc-docs/troubleshooting.md
git commit -m "docs(deploy): document account:balance:read scope + SAKRYLLE_PURCHASE_URL"
```

---

## Task 9: Full-stack manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the backend unit tests**

Run: `cd backend && ../.venv/bin/python -m pytest open_webui/test/test_account.py -v`
Expected: PASS (5 tests).

- [ ] **Step 2: Run the frontend unit tests**

Run: `npx vitest run src/lib/utils/balance.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Verify the endpoint shape against a stubbed gateway (optional, if backend runnable)**

If a local backend + OAuth session is available, log in and run:
`curl -s http://127.0.0.1:8080/api/v1/account/balance -H "Authorization: Bearer $TOKEN" | python3 -m json.tool`
Expected: either `{"available": true, "credit_remaining": ...}` (scope present) or `{"available": false}` (scope absent) — never a 500.

- [ ] **Step 4: Confirm `/api/config` exposes the purchase URL**

Run (against a running backend): `curl -s http://127.0.0.1:8080/api/config | python3 -c "import sys,json;print(json.load(sys.stdin).get('purchase_url'))"`
Expected: `https://sub.sakrylle.com/purchase`.

- [ ] **Step 5: Final lint/format pass**

Run: `npm run format && npm run lint:frontend`
Expected: no errors on the new/changed files. Commit any formatting changes:

```bash
git add -A && git commit -m "style: format balance widget changes" || echo "nothing to format"
```

---

## Deployment Notes (out of band — server `.env`, not code)

After this branch's CI image ships, the server operator must, in `/opt/stack/sakrylle-web/.env`:
1. Add `account:balance:read` to `OAUTH_SCOPES`.
2. (Optional) Set `SAKRYLLE_PURCHASE_URL` if overriding the default.
3. `cd /opt/stack && docker compose pull sakrylle-web && docker compose up -d sakrylle-web`.
4. Users **re-login** (old tokens lack the new scope). Until then the widget stays hidden — no errors.
