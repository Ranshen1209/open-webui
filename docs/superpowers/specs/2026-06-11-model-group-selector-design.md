# 设计：模型选择器的 Sakrylle 分组选择

- 日期：2026-06-11
- 分支：theme/sakrylle
- 状态：待评审
- 范围：Sakrylle Web（open-webui fork）后端 2 处小改 + 前端模型选择器

## 1. 背景与目标

Sakrylle API 把模型组织成「分组」（如 `Claude-Kiro-Special`、`GPT-Pro-Special`、`GPT-Plus`），
每个分组绑定平台与费率倍数（rate_multiplier）。同一个底层模型（如 `claude-opus-4-6`）可能出现在
多个分组下，按不同倍率计费。

目标：在 Sakrylle Web 的模型选择器里，让用户**看到并按分组选择模型**，且对话请求**按所选分组计费/路由**。

非目标（本期不做）：
- 不在 Web 后端复刻 per-group OAuth token 的铸造/缓存（方法 A，已否决）。
- 不做分组级别的访问控制 UI（沿用 open-webui 既有的 Workspace→Models + 用户组机制）。
- 不处理「基于分组模型创建自定义模型预设」的 base_model 解析边界（见 §7 已知限制）。

## 2. 已确定的 Sakrylle API 契约（方法 B）

Web 侧零/极小改动，依赖以下已实现的 API 契约：

1. **`GET /v1/models?groups=all`**（仅对 sk_oauth_ token 生效）：返回该 token `allowed_groups` 快照内
   所有可选（激活、非订阅/余额）分组的模型并集。每个 model 对象：
   - `id = "<group_id>:<model>"`（带分组前缀，可原样回传）
   - `display_name`：干净模型名（无前缀）
   - `group: { id, name, rate_multiplier }`
   - 不带 `?groups=all` 时行为完全不变（单组、id 无前缀、无 group 字段），向后兼容；manual key 忽略该参数。

   示例：
   ```json
   { "id": "12:claude-opus-4-6", "owned_by": "anthropic",
     "display_name": "claude-opus-4-6",
     "group": { "id": 12, "name": "Claude-Max", "rate_multiplier": 2.0 } }
   ```

2. **model 前缀选组**：`POST /v1/chat/completions`（及 `/responses`、`/messages`、`/embedding`）请求体
   `"model": "12:claude-opus-4-6"`。网关解析 `^<digits>:` 前缀 → 校验组 ∈ 本 token allowed_groups 快照
   →按该组路由+计费 →剥前缀转上游。无前缀 = 走绑定组（原行为）。

3. **计费**：按所选组的 `rate_multiplier`。

4. **分组列表来源**：`/v1/me` 的 `allowed_groups`（我们已有 `account:read` scope）。本设计中 `?groups=all`
   已随每个模型返回 `group`，因此**前端无需单独调 `/v1/me` 列分组**；`/v1/me` 仅作可选兜底/展示。

错误（OAuth 错误外壳）：`403 GROUP_NOT_ALLOWED`、`400 GROUP_OVERRIDE_UNSUPPORTED`（订阅组）。
网关保留 `^<digits>:` 作为选择器语法（现网模型名均无此前缀，无歧义）。

## 3. 架构与数据流

```
浏览器(选择器)            Web 后端(open-webui)                 Sakrylle API
   |  GET /api/models  ->  get_all_models() 逐连接拉取
   |                       GET https://api.sakrylle.com/v1/models?groups=all  (system_oauth: 用户 OAuth token)
   |                   <-  [{id:"12:claude-opus-4-6", display_name, group:{...}}, ...]
   |  <- 透传(含 group/display_name)
   |  按 group 分组展示 + 分组下拉过滤；显示 display_name
   |  选中 -> value = "12:claude-opus-4-6"
   |  POST /api/chat/completions {model:"12:claude-opus-4-6"} -> 后端 system_oauth 原样转发 model id
   |                                                          -> 网关按 "12:" 路由+计费 -> 剥前缀转上游
```

要点：**分组是编码在 model id 里的**。前端"分组选择器"本质是对聚合模型列表的**过滤器**；真正的"用哪个组"
由用户最终选中的那个带前缀 model id 决定。对话链路因此对 Web 后端零改动。

## 4. 后端改动（2 处小改，作用域限定到 Sakrylle 连接）

### 4.1 模型列表追加 `?groups=all`
- 文件：`backend/open_webui/routers/openai.py`
- 位置：`get_models_request()`（约 :117-126），它在 `get_all_models()`(:402) 被以 `config=api_config` 调用。
- 改法：新增对 `config` 中 `model_list_query`（dict）的支持——若存在，则 urlencode 后追加到 `f'{url}/models'`。
  ```python
  models_url = f'{url}/models'
  if config and config.get('model_list_query'):
      models_url = f"{models_url}?{urllib.parse.urlencode(config['model_list_query'])}"
  return await send_get_request(request, models_url, key, user=user, config=config)
  ```
- 作用域：仅当连接的 `OPENAI_API_CONFIGS` 配了 `model_list_query` 才追加 → 不影响其它 OpenAI 连接。
- 通用性：用通用的 `model_list_query` 而非硬编码 `groups=all`，便于将来其它连接复用。

### 4.2 `display_name -> name` 映射
- 文件：`backend/open_webui/routers/openai.py` `get_all_models()` 的逐模型处理段（约 :442-457，已加 tags/provider 处）。
- 改法：当模型带 `display_name` 时，把它作为展示名：`model['name'] = model.get('display_name') or model.get('name') or model['id']`。
  - `id` 保持带前缀（路由所需，且唯一）。
  - 这样选择器显示干净名字而非 `12:claude-opus-4-6`。
- 边界：同一底层模型在不同组下 `name` 相同（如两个 "claude-opus-4-6"），靠分组标题/分组过滤区分，`id` 仍唯一。

### 4.3 `group` 字段透传（无需改动，验证项）
- `get_all_models()` 在上游模型 dict 上原地加字段，`group` 会自动保留到返回给前端的对象。spec 验证即可。

### 4.4 配置（.env，本地）
- `OPENAI_API_CONFIGS` 增加 `model_list_query`：
  ```
  OPENAI_API_CONFIGS={"0":{"auth_type":"system_oauth","model_list_query":{"groups":"all"}}}
  ```

## 5. 前端改动（模型选择器）

- 主文件：`src/lib/components/chat/ModelSelector/Selector.svelte`（必要时 `ModelItem.svelte`）。
- 现状：选择器已有一行 tags 过滤（:391-397 收集、:597-609 渲染），但 tags 是连接级、与本需求无关。

### 5.1 分组数据
- 从 `items[].model.group`（`{id,name,rate_multiplier}`）收集去重的分组列表（按 name 排序）。
- 仅当存在带 `group` 的模型时才渲染分组 UI；否则保持现有平铺行为（向后兼容非 Sakrylle 连接 / 未开 `?groups=all`）。

### 5.2 分组选择器 UI
- 在搜索框下、模型列表上方加一个**分组下拉/分段选择**（复用现有 tags 过滤行的视觉风格，保持一致）。
- 选中某分组 → 模型列表只显示该组模型（按 `model.group.id` 过滤）。
- **默认选中策略**（按优先级）：
  1. localStorage 存过且该组仍在可用列表 → 用存的（"记住用户手选"）。
  2. 否则选**名为 `DEFAULT_GROUP_NAME` 的组**（本部署配为 `"GPT-Pro"`，精确名匹配）。
  3. 否则退回可用列表的第一个组。
  - `DEFAULT_GROUP_NAME` 做成前端可配置常量（如 `src/lib/constants` 或选择器内常量），不把 `"GPT-Pro"`
    硬编码散落各处；将来换默认组只改一处。
- **持久化**：用户在下拉里手动改组 → 写入 localStorage（键如 `sakrylle-web.selected-model-group` = group id），
  跨会话记住。若保存的组因 allowed_groups 变化而消失 → 回退到策略 2/3。
- 单分组时：可隐藏下拉或只读展示组名（避免无意义的单项下拉）。

### 5.3 显示与选中
- 列表项显示 `model.name`（= 后端映射后的 `display_name`，干净名）。
- 选中项 `value` 仍为完整带前缀 id（如 `12:claude-opus-4-6`）→ 走既有 chat 流程原样发送。
- 验证：确认前端从选中到 `POST /api/chat/completions` 不会剥掉 `id` 前缀（标准流程是原样带 `model`）。

### 5.4 展示倍率（本期纳入）
- 分组下拉每一项展示该组 `rate_multiplier`，如 `GPT-Pro ·2.0x` / `Claude-Max ·2.0x`，帮助用户感知计费差异。
- 数据来源：`model.group.rate_multiplier`（已随 `?groups=all` 返回）。
- 展示格式：`{name} ·{rate_multiplier}x`；`rate_multiplier` 缺失时只显示组名（容错）。

## 6. 边界与错误

- **`:` 前缀在 Web 后端安全**：唯一按 `:` 切 model id 的 `utils/models.py:137` 仅对 `owned_by=='ollama'` 生效；
  Sakrylle 模型 `owned_by` 为 openai/anthropic，不触发。约束：Sakrylle 勿对这些模型返回 `owned_by:"ollama"`。
- **非 Sakrylle 连接 / 未开聚合**：模型无 `group` 字段 → 前端平铺、后端不追加 query，一切照旧。
- **网关错误**：`403 GROUP_NOT_ALLOWED` / `400 GROUP_OVERRIDE_UNSUPPORTED` 透传为对话错误提示（沿用现有上游错误展示）。
- **单分组用户**：聚合返回也可能只有一个组 → UI 退化为单组展示。

## 7. 已知限制（本期不解）

- 基于带前缀模型创建的**自定义模型预设**（Workspace→Models）：`utils/models.py:178` 的 `base_model_id.split(':')[0]`
  兜底解析在精确匹配失败时会取到 `<group_id>`，可能错配。本期不支持「在分组模型之上建预设」；如需，另开任务。
- 同名跨组模型在某些列表（非选择器）场景可能视觉重复；本期只保证选择器内分组清晰。

## 8. 测试

- 后端：
  - 单元/手测 `get_models_request` 在有/无 `model_list_query` 时的 URL（含 `?groups=all` 追加正确、urlencode）。
  - `display_name -> name` 映射在有/无 `display_name` 时的回退。
  - 回归：未配 `model_list_query` 的连接请求 URL 不变。
- 前端：
  - 有 `group` → 渲染分组下拉、过滤正确、显示 `display_name`、选中 value 带前缀。
  - 无 `group` → 平铺，无回归。
  - 单分组退化。
- 端到端（本地，登录 SSO 后）：选不同组的同名模型 → 发一条消息 → 确认请求体 `model` 带对应前缀（可看后端日志/网络面板）。

## 9. 待确认

- 契约 4 原汇报末句被截断（"组内模型清 ⋯"）；本设计不依赖它（`?groups=all` 已够），但请 API 侧补全确认。
- 验证 4.2 中 `name` 是否为选择器实际展示字段（`Selector.svelte` 用 `item.model?.name`，已确认）。
