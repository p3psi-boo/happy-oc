# Opencode Migration Plan

目标：把当前 App 改造成 opencode server 的移动端客户端。
约束：单活跃 server 实例；不鉴权；从 `project.list()` 选择 project；sessions 按 project 过滤；使用 SSE 实现实时更新；删除旧后端全部逻辑，仅保留“与 Coding Agent 的交互逻辑”（会话列表/聊天/tool 展示/权限审批/Abort/autocomplete）。

## 阶段 0：SSE/Streaming 运行时打底（必须先做）
- 引入 `@opencode-ai/sdk` 并建立最小 demo 调用链。
- 解决 SDK SSE 运行时依赖：
  - 让 `globalThis.fetch` 支持 streaming（优先使用 Expo 的 streaming fetch 实现）。
  - 提供 `TextDecoderStream`（以及 Web Streams 相关 polyfill，如需要）。
- 真机验收：iOS/Android 上 `client.event.subscribe()` 能持续收事件、能断线重连。
- 备选：若 SDK 的 SSE 在 RN 上不可用，则普通 API 继续用 SDK，SSE 用自实现 parser 连接 `/event`（仍保持协议一致）。

## 阶段 1：Server 实例管理（多保存，单活跃）
- 交互：Servers 列表（增删改、设为当前 active）。
- 存储：从单 `custom-server-url` 升级为：
  - `servers[]`：`{ id, name, baseUrl, lastProjectId? }`
  - `activeServerId`
- 校验：从“Welcome to Happy Server!” 改为 `client.global.health()`（或 GET `/global/health`）。

## 阶段 2：Project 选择（来自 `project.list()`）
- 交互：在 active server 下展示 `project.list()` 结果；选择后作为当前 project。
- 存储：
  - `activeProjectId`（每个 server 也可记住 lastProjectId）
- Client 策略（两种 client）：
  - `serverClient`：仅 baseUrl（health + project.list）
  - `projectClient`：baseUrl + `directory = project.worktree`（session/message/event/find/command）

## 阶段 3：路由 gating（替代 Auth）
- 将“是否登录”替换为：
  - 未选 server → 去 Servers
  - 已选 server 未选 project → 去 Project Picker
  - 已选 server + project → 进入主界面
- 移除 AuthProvider/AuthContext 以及相关页面与 hooks。

## 阶段 4：Sessions 列表（按 project 过滤）
- 数据源：`projectClient.session.list()`（因 directory 已设置，天然过滤）。
- 状态：`projectClient.session.status()` + SSE 事件更新（busy/idle/retry）。
- UI：保留现有 Sessions 交互（进入会话、显示 busy/idle、创建会话入口）。

## 阶段 5：聊天与消息（send/abort + SSE streaming）
- 初次进入会话：`projectClient.session.messages({ id })`。
- 发送：`projectClient.session.prompt({ id, parts:[{ type:"text", text }] })`。
- Abort：`projectClient.session.abort({ id })`。
- SSE 增量：处理 `message.part.updated(delta)` 拼接流式文本与 tool 状态。

## 阶段 6：Tool 展示 + PermissionFooter（对齐 opencode）
- 映射 opencode `ToolPart` → 现有 tool UI（先 JSON fallback，再逐步适配常见工具）。
- 权限审批：Allow once / Always allow / Reject，调用 `post /session/{id}/permissions/{permissionID}`。
- 由 SSE `permission.updated` 驱动 pending permissions 与按钮显示。

## 阶段 7：Autocomplete（/ 命令 + @ 文件）
- `/`：从 `projectClient.command.list()`（或 opencode commands API）提供建议。
- `@`：用 `projectClient.find.files()` / `find.text()` 替代旧 file cache。

## 阶段 8：删除旧后端与旧功能（全量清理）
- 删除：`/v1/*`、socket.io、加密、账号/QR、machines/artifacts/kv/push/github/services/revenuecat、旧的 restore/new/pick/machine 等。
- 清理 Settings/Dev 页对旧 auth/socket 的依赖。
- i18n：新增或改动的所有用户可见字符串必须走 `t(...)`，并补齐所有语言文件。

## 验收标准（最小可交付）
- 选择 server → 选择 project → sessions 列表展示。
- 进入 session 能看到历史消息；发送消息可流式更新；tool 事件可渲染；权限可审批；Abort 可用。
- 切换 project 会：停止旧 SSE → 切换 client directory → 拉取新列表 → 订阅新 SSE。
