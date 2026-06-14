# Spec: 侧边栏底部 Sakrylle API 余额显示 + 充值按钮

- **Date:** 2026-06-14
- **Branch:** `theme/sakrylle`
- **Status:** Approved (design), pending implementation plan

## 1. 目标

在 Sakrylle Web 左侧 Sidebar 底部常驻显示当前登录用户的 **Sakrylle API 余额**，并提供一个 **充值** 按钮，点击在新标签页打开 `https://sub.sakrylle.com/purchase`（URL 可经环境变量配置）。

## 2. 背景与约束

- 计费/余额数据完全在网关侧（sub2api，`sub.sakrylle.com`）。Open WebUI 自身无余额数据（见 `oidc-docs/historical/research.md`：open-webui 本身无 quota 控制）。
- 网关提供 `GET /v1/account/balance`（`routes/gateway.go`），返回：
  - `credit_remaining`（float64，余额）
  - `currency_display`（`"CNY"`）、`currency_symbol`（如 `¥`）
  - `rate_multiplier`、`group_id`、`group_name`、`allow_image_generation`
- 鉴权：按中心契约文档 `Sakrylle API/sakrylle-docs/10-platform-identity/rp-integration-guide.md` §12，该端点归在 **`account:balance:read`** scope 下。
- 用户的 OAuth access token 存在 Open WebUI 后端 `oauth_session` 表（靠 `oauth_session_id` cookie 索引），**浏览器侧拿不到**。因此前端不能直连网关——必须后端代理。
- 现有 `system_oauth` 转发链已实现 per-user token 转发（`OPENAI_API_CONFIGS` idx `0`，`auth_type=system_oauth`），用于取模型清单 / chat。本方案复用同一条链。

## 3. 架构决策

**方案 A — 后端代理端点（采用）。** 前端 → Open WebUI 后端 `GET /api/v1/account/balance` → 复用 `system_oauth` token 转发 → 网关 `GET /v1/account/balance` → 透传 JSON。

被否决的备选：
- **方案 B（前端直连网关）**：OAuth token 不在浏览器侧，且不应暴露给浏览器。否决。
- **方案 C（只放充值按钮、不显示余额）**：用户要求显示实时余额，网关已提供 API。否决。

## 4. 详细设计

### 4.1 后端

**新文件 `backend/open_webui/routers/account.py`**

- `router = APIRouter()`
- `GET /balance`，依赖 `Depends(get_verified_user)`，签名含 `request: Request`。
- 逻辑：
  1. `idx = 0`；`url = request.app.state.config.OPENAI_API_BASE_URLS[idx]`；`key = request.app.state.config.OPENAI_API_KEYS[idx]`；`api_config = request.app.state.config.OPENAI_API_CONFIGS.get(str(idx), {})`。
  2. `headers, cookies = await get_headers_and_cookies(request, url, key, api_config, user=user)`（从 `routers/openai.py:151` 导入；它内部调 `oauth_manager.get_oauth_token(user.id, request.cookies.get('oauth_session_id'))`，自动刷新）。
  3. 用共享 HTTP session（`utils` 现有的 pooled session 模式，与 openai.py 一致）`GET {url}/account/balance`，超时合理（如 10s）。
  4. 成功 → 返回
     ```json
     {
       "available": true,
       "credit_remaining": <float>,
       "currency_symbol": "<str>",
       "currency_display": "<str>",
       "group_name": "<str|null>",
       "rate_multiplier": <float|null>
     }
     ```
     字段从网关响应映射；缺失字段允许为 null。
- **容错（关键）**：以下任一情况 → 返回 `{"available": false}`（HTTP 200），**不抛 500、不刷 error 日志**（用 debug/info 级记录即可）：
  - 网关返回 403 / `insufficient_scope`（token 缺 `account:balance:read`）
  - 无 oauth session（`get_oauth_token` 返回 None / 无 token）
  - 网关网络错误、超时、非 2xx、JSON 解析失败
- **注册**：`main.py` 在路由注册区（约 1440–1487 行）加 `app.include_router(account.router, prefix='/api/v1/account', tags=['account'])`。最终路径 `GET /api/v1/account/balance`。

**充值 URL 配置（`config.py` + `main.py`）**

- `config.py` 新增 `SAKRYLLE_PURCHASE_URL`（`ConfigVar`/`PersistentConfig` 按本仓现有声明方式），env 默认 `https://sub.sakrylle.com/purchase`。
- `main.py` 的 `/api/config` 响应里暴露该值（放在 Sakrylle 相关字段处，命名如 `sakrylle.purchase_url` 或顶层 `purchase_url`，遵循该文件现有结构）。无需鉴权即可读（仅一个 URL，无敏感信息）。

### 4.2 前端

**API 客户端 `src/lib/apis/index.ts`**

- 新增 `getAccountBalance(token: string)`：`GET ${WEBUI_BASE_URL}/account/balance`，`Authorization: Bearer ${token}`，沿用文件内现有 `getUsage()` 的写法（错误时 catch 并返回 null，不抛）。

**新组件 `src/lib/components/layout/Sidebar/AccountBalance.svelte`**

- props：`collapsed?: boolean`（区分展开/折叠态渲染）。
- onMount：调 `getAccountBalance($localStorage.token)`；窗口 `focus` 事件时刷新（`onMount` 注册、`onDestroy` 注销监听）。
- 状态：`balance`（响应对象或 null）。`balance?.available !== true` → **整条不渲染**（余额文字 + 充值按钮一起隐藏）。
- 展开态渲染：一行 `{$i18n.t('Balance')} {currency_symbol}{credit_remaining.toFixed(2)}` + 一个 **充值** 按钮：
  ```html
  <a href={purchaseUrl} target="_blank" rel="noopener noreferrer">{$i18n.t('Top up')}</a>
  ```
  `purchaseUrl` 取自 `$config`（4.1 暴露的字段），缺省回退到 `https://sub.sakrylle.com/purchase`。
- 折叠态（`collapsed`）渲染：仅一个钱包图标按钮（`<a>` 同样跳 `purchaseUrl`），带 Tooltip 显示余额文本；不显示余额数字行。
- 样式跟随 Sidebar 底部既有按钮（圆角、`hover:bg-*`、dark mode、`truncate`）。

**挂载点 `src/lib/components/layout/Sidebar.svelte`**

- 展开态：在底部 sticky 容器（约 `:1596`–`:1600`）的 UserMenu 触发按钮**上方**插入 `<AccountBalance />`。
- 折叠态图标栏：在用户头像区（约 `:937`–`:939`）附近插入 `<AccountBalance collapsed />`。
- 仅在 `$user` 存在时渲染（与现有 `{#if $user}` 一致）。

### 4.3 i18n

- `src/lib/i18n/locales/en-US/translation.json` 与 `src/lib/i18n/locales/zh-CN/translation.json` 各加：
  - `"Balance"` → zh-CN `"余额"`
  - `"Top up"` → zh-CN `"充值"`
- 采用 surgical 加键（避免 repo-wide `i18n:parse` prune，遵循近期 commit `519f93fe9` 的做法）。

## 5. 部署说明（重要）

- **`OAUTH_SCOPES` 需含 `account:balance:read`。** 当前服务器 `.env` 的 `OAUTH_SCOPES`（CLAUDE.md 记录含 `chat.completions:create responses:create messages:create`）未列出该 scope。未加时 `/v1/account/balance` 返回 403，组件按设计整条隐藏（不报错）。
- 上线步骤：服务器 `.env` 的 `OAUTH_SCOPES` 追加 `account:balance:read` → 重启容器 → **用户重新登录**（旧 token 无新 scope），余额自动点亮。
- `SAKRYLLE_PURCHASE_URL` 默认即指向生产购买页，通常无需在 `.env` 设置；如需改用则在 `.env` 覆盖。
- 同步更新：`deploy/env.example`（加 `SAKRYLLE_PURCHASE_URL`，并在注释提示 `OAUTH_SCOPES` 需含 `account:balance:read`）、`oidc-docs/troubleshooting.md`（加一条“余额不显示 → 检查 `account:balance:read` scope + 重新登录”的排查项）。
- 契约出处：`Sakrylle API/sakrylle-docs/10-platform-identity/rp-integration-guide.md` §10.2 / §12。不在本仓重复协议细节，仅链接中心文档（遵循 CLAUDE.md OIDC 文档治理）。
- 注：用户口头称该端点“任意已授 scope 即可通过”，与中心文档将其归于 `account:balance:read` 存在出入。代码侧按文档防御性处理（403 → 隐藏），两种契约下均能正常工作；上线时以实际网关行为为准，必要时加 scope。

## 6. 测试

- **后端**（`pytest`）：
  - 成功路径：mock 网关返回带 `credit_remaining` 的 200 → 端点返回 `available: true` 且字段映射正确。
  - 403 / insufficient_scope → `available: false`，HTTP 200。
  - 无 oauth session（`get_oauth_token` → None）→ `available: false`。
  - 网关超时 / 非 2xx / 坏 JSON → `available: false`，不抛 500。
- **前端**（`vitest`，若组件可单测）：
  - `available: true` → 渲染余额文本与充值链接；链接含 `target="_blank"` 与 `rel="noopener noreferrer"`，`href` 为 config 的 purchase URL。
  - `available: false` / null → 不渲染任何内容。
  - 折叠态 → 仅渲染图标按钮链接。
- **手测**：`npm run dev` 下 mock `/api/v1/account/balance` 两种响应，确认展开/折叠态外观与跳转。

## 7. 非目标 / YAGNI

- 不在 Open WebUI 侧做 quota 控制或扣费（计费仍全在网关）。
- 不做余额变动的实时推送/高频轮询（仅 mount + focus 刷新）。
- 不在 Settings 页或其它位置另做余额展示（仅 Sidebar 底部）。
- 不缓存余额到后端/DB（每次实时取，随 OAuth token 转发）。

## 8. 涉及文件清单

新增：
- `backend/open_webui/routers/account.py`
- `src/lib/components/layout/Sidebar/AccountBalance.svelte`
- 本 spec

修改：
- `backend/open_webui/main.py`（注册 router + `/api/config` 暴露 purchase URL）
- `backend/open_webui/config.py`（`SAKRYLLE_PURCHASE_URL`）
- `src/lib/apis/index.ts`（`getAccountBalance`）
- `src/lib/components/layout/Sidebar.svelte`（两处挂载）
- `src/lib/i18n/locales/en-US/translation.json`、`zh-CN/translation.json`
- `deploy/env.example`、`oidc-docs/troubleshooting.md`
