# Sakrylle 品牌化收尾 — 设计文档

- 日期：2026-06-10
- 分支：`theme/sakrylle`
- 范围：去除 Sakrylle Web 中仍残留的用户可见 "Open WebUI" 痕迹（配置补全 + 文案改写）。
- 前置：名称、图标/manifest、Monet Purple 主题色均已完成；社区分享已由 `deploy/env.example` 的 `ENABLE_COMMUNITY_SHARING=False` 关闭，About 归属块已由 `WEBUI_NAME != 'Open WebUI'` 守卫自动隐藏。

## 1. 背景与现状

审计结论：
- `ENABLE_COMMUNITY_SHARING` 默认 `True`（config.py:2994-2997），但 `deploy/env.example:67` 已设 `False` → 部署后约 19 处 "Open WebUI Community" 文案（分享按钮、"Made by…"、跳转 toast）自动消失。
- `About.svelte:117` 有 `{#if !$WEBUI_NAME.includes('Open WebUI')}`，`WEBUI_NAME` 默认 `'Sakrylle Web'`（env.py:771）→ Discord/Twitter/GitHub 徽章与 "Open WebUI Inc." 版权已隐藏。
- **真正"始终显示、不随开关消失"的残留只有 4 条字符串**，分布于 2 个组件，且都走 `$i18n.t(...)`。
- `ENABLE_VERSION_UPDATE_CHECK` 默认 `true`（env.py:979），外联检查更新，`deploy/env.example` 未设。
- 遥测类 env（ANONYMIZED_TELEMETRY / SCARF_NO_ANALYTICS / DO_NOT_TRACK）在本 fork 的 `env.py` 中**不存在**，不纳入。

## 2. 设计决策（已确认）

| 决策点 | 选择 |
|---|---|
| 收尾范围 | 补全 env.example 关闭项 + 改写 2 处残留文案 + 同步 i18n 源串 |
| 改写风格 | 产品自指 → `$WEBUI_NAME` 动态插值；"Open WebUI Community" 外部专有名词 → 中性化 |
| 不做 | 翻转 config.py/env.py 代码默认（保持上游可合并） |

## 3. 配置补全

`deploy/env.example`：在功能开关区新增一行
```
ENABLE_VERSION_UPDATE_CHECK=False
```
（`ENABLE_COMMUNITY_SHARING=False` 已在 line 67，保持。）不增加任何本 fork 未实现的开关。

## 4. 残留文案改写 + i18n 插值

每处都改 **组件 `$i18n.t()` 调用** + **`src/lib/i18n/locales/en-US/translation.json` 键**。组件按需 `import { WEBUI_NAME } from '$lib/stores';`。

| # | 文件 | 现 key | 新 key | 插值 |
|---|---|---|---|---|
| 1 | `src/lib/components/chat/Settings/SyncStatsModal.svelte:373` | `Do you want to sync your usage stats with Open WebUI Community?` | `Do you want to sync your usage stats with the community?` | 无（中性化） |
| 2 | `SyncStatsModal.svelte:378` | `Participate in community leaderboards and evaluations! Syncing aggregated usage stats helps drive research and improvements to Open WebUI. Your privacy is paramount: no message content is ever shared.` | 同串，仅 `improvements to Open WebUI` → `improvements to {{name}}` | `{ name: $WEBUI_NAME }` |
| 3 | `SyncStatsModal.svelte:387` | `Open WebUI version` | `{{name}} version` | `{ name: $WEBUI_NAME }` |
| 4 | `src/lib/components/workspace/common/ManifestModal.svelte:47` | `Your entire contribution will go directly to the plugin developer; Open WebUI does not take any percentage. However, the chosen funding platform might have its own fees.` | 同串，仅 `Open WebUI does not take any percentage` → `{{name}} does not take any percentage` | `{ name: $WEBUI_NAME }` |

en-US `translation.json`：
- 为 #1/#2/#3/#4 的**新键**加入条目（值与新 key 文本一致；含 `{{name}}` 的保留占位符）。
- 旧键（如 `"Open WebUI version"`、`"Made by Open WebUI Community"` 等社区串）可由 `npm run i18n:parse` 清理孤儿键；运行该命令对齐键表。
- 其他语种对这 3-4 条新键缺失，i18next 回退英文 key 文本（含已插值的 `{{name}}`），可接受。

## 5. 验证

- `grep -rn "Open WebUI" src/lib/components/chat/Settings/SyncStatsModal.svelte src/lib/components/workspace/common/ManifestModal.svelte` → 无输出（两组件已无 "Open WebUI"）。
- `grep -n "ENABLE_VERSION_UPDATE_CHECK" deploy/env.example` → 命中 `False`。
- 残留的、由功能开关或 WEBUI_NAME 守卫的 "Open WebUI" 仍可存在于源码（部署/默认名下不显示），不在本次清除目标内。
- `npm run check` 通过；`npm run i18n:parse` 运行无误；`npm run build` 绿。
- 手动：开 SyncStatsModal 与 ManifestModal（插件资助）确认文案显示为 `Sakrylle Web`/中性措辞、`{{name}}` 正确插值。

## 6. 范围之外（Out of Scope）

- SyncStatsModal 的同步动作**仍指向 openwebui.com**；去除该外联属于功能改动，单独处理。
- 由 `ENABLE_COMMUNITY_SHARING`/WEBUI_NAME 守卫的源码内 "Open WebUI" 字符串（部署即隐藏）不逐一删除，保持上游可合并。
- 其他语种 translation.json 的逐条翻译（回退英文即可）。
- 文档/README/贡献指南中的 "Open WebUI" 引用（非应用 UI）。
- 翻转代码默认（config.py/env.py）。

## 7. 影响文件清单

| 文件 | 改动 |
|---|---|
| `deploy/env.example` | +1 行 `ENABLE_VERSION_UPDATE_CHECK=False` |
| `src/lib/components/chat/Settings/SyncStatsModal.svelte` | 3 处 `$i18n.t` 改键 + 插值；按需引入 `WEBUI_NAME` |
| `src/lib/components/workspace/common/ManifestModal.svelte` | 1 处 `$i18n.t` 改键 + 插值；按需引入 `WEBUI_NAME` |
| `src/lib/i18n/locales/en-US/translation.json` | 新键加入；`i18n:parse` 对齐 |

## 8. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 改 i18n 键导致其他语种缺失 | i18next 回退英文 key 文本（含插值），仅影响这 3-4 条罕见串 |
| `i18n:parse` 误删/重排大量键 | 改动前后 `git diff` 审查 translation.json，仅接受预期键变化 |
| 插值占位符 `{{name}}` 写错导致显示字面量 | 目检 SyncStatsModal/ManifestModal 实际渲染 |
| WEBUI_NAME store 未在组件作用域 | 改前确认/补 `import { WEBUI_NAME } from '$lib/stores'` |
