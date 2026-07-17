# 数字人真实链接与交互验收（2026-07-17）

## 验收结论

最终复验结果为 **`PASS_REAL`**。

2026-07-17 首次执行仍保留为 **`BLOCKED`**：当时 backend 容器内置 DNS 无法转发，第一轮在连接讯飞接口服务模型前失败。随后按授权对 Docker Desktop 和全部 WSL 发行版执行冷重启，保留镜像、容器、数据卷和项目文件；Docker Engine 与容器 DNS 恢复后，从第一轮重新完成全部门禁和两轮真实交互，最终满足验收标准。

以下“首次验收记录”保持原始失败事实，后文“冷重启恢复与最终复验”记录最终通过结果。

## 首次验收记录（BLOCKED）

前后端以 `enableMock=false` 运行，数字人对话和在线虚拟人健康配置均为 `ok`，26 项讯飞协议、调用顺序、直播会话、心跳与清理定向测试通过。Playwright CLI 成功打开数字人深链接并精确选中 Hello 算法的“5.1 栈”，但第一轮真实对话在后端连接讯飞接口服务大模型前发生临时 DNS 解析失败：

```text
digital human chat failed: [Errno -3] Temporary failure in name resolution
```

按验收门禁未点击重试、未发送第二轮、未回退 mock，也未调用独立数字人讲解接口。模型回答未产生，因此 audit/safety、在线虚拟人 start、文本驱动、HLS 播放、心跳、会话复用、消息历史和幂等 stop 均未进入可验收阶段。

### 环境与门禁

| 检查 | 结果 |
|---|---|
| 前端 / 后端 | `http://localhost:5173` / `http://localhost:8000` 可访问 |
| 运行配置 | `enableMock=false`、`enableSafetyAudit=true` |
| 健康状态 | database、Redis、vector store、graph DB、LLM、数字人对话、在线虚拟人均为 `ok` |
| 独立讯飞 TTS | `error`，为既有边界，不影响本次实时数字人协议判断 |
| 定向后端测试 | `26 passed in 3.51s` |
| Playwright CLI / npx | 可用；使用全新命名会话和 1440×900 headed 浏览器 |

定向测试覆盖：

- 讯飞 provider 与实时协议结构；
- 接口服务模型 → audit/safety → 在线虚拟人的固定调用顺序；
- 同会话复用、串行文本驱动、心跳失败和空闲超时；
- WebSocket/FFmpeg 异常退出、2000 字符门禁、幂等 stop 和 HLS 延迟清理。

### 浏览器与真实调用

目标深链接：

```text
http://localhost:5173/resources?action=digital_human_chat&nodeId=node_docs_chapter_stack_and_queue_stack_md_78a160ec6689
```

初始页面验证通过：

- 顶部和资源页知识点均为“5.1 栈”；
- 数字人状态为“未连接”，播放器展示等待连接；
- 空输入时“发送”按钮禁用；
- 数字人入口未请求 `/generated-resources`，也未渲染历史资源详情；
- 浏览器控制台为 0 error、0 warning。

第一轮问题为：

```text
请结合当前课程材料，用不超过150字和一个餐盘例子解释栈的后进先出。
```

`POST /api/v1/multimodal/digital-human/chat` 的 HTTP 状态为 200，返回统一 `ApiResponse`，但业务 `code=500`，错误类型为后端域名解析失败。页面展示了可读错误和重试入口。调用没有返回 `sessionId` 或 `liveSession`，也没有产生 HLS 请求。

调用后 Windows 与 WSL 的只读 DNS 检查已能解析讯飞两个域名，说明故障具有瞬时或后端运行时 DNS 特征；本次不据此宣称恢复，仍需在后端运行环境 DNS 稳定后重新执行完整两轮真实链。

### 安全与清理

- 正式 trace 在登录完成并删除浏览器访问令牌后开始记录。
- trace/network 脱敏扫描中 `Bearer`、签名 `authorization=`、API Key/Secret、原始 RTMP、provider 域名和 provider session 均为 0。
- 浏览器只请求本地前后端；由于模型阶段失败，没有 HLS manifest 或分片请求。
- 测试前后 WSL 内 `ffmpeg_count=0`，未发现本次新增的 HLS 会话目录。
- 没有可停止的直播会话，因此不伪造 `/live`、心跳或重复 stop 结果。

### 当时的复验门禁

后端运行环境恢复对 `apigateway.xfyousheng.com` 的稳定 DNS 解析后，从第一轮重新执行；只有第一轮真实回答、RAG 引用、audit/safety 和 HLS 播放全部成功，才继续第二轮会话复用、心跳、消息历史与幂等 stop。任何阶段失败都必须停止后续付费调用且不得回退 mock。

独立数字人讲解 provider 和独立讯飞 TTS 继续保持既有阻塞边界，本次未调用。

## 冷重启恢复与最终复验（PASS_REAL）

### Docker 与 DNS 恢复

- 冷重启前确认 Clash 进程和 Windows 系统代理均正常，且没有残留 FFmpeg；
- 优雅停止 Docker Desktop 后执行 `wsl --shutdown`，未操作 Docker 数据目录；
- Docker Desktop 重启 11 秒后状态为 `running`，Docker Client/Server 均为 `29.4.2`，Engine API 可用；
- 使用现有 `docker/docker-compose.yml` 直接执行 `up -d`，PostgreSQL、Neo4j、Chroma、Judge0 等原有容器和数据卷全部保留；
- 未使用 `down -v`、Factory Reset、Clean/Purge Data、Compose `dns:`、硬编码 IP、关闭 TLS 或 mock；
- backend 容器对 `apigateway.xfyousheng.com` 和 `avatar.cn-huadong-1.xf-yun.com` 分别连续解析 20 次，结果为 `20/20 + 20/20 = 40/40`。

DNS 门禁通过后，`real_iflytek_interface_chat.py` 以模块方式运行一次，讯飞接口服务模型返回 `status=success` 和非空中文回答，且 `virtualHumanStarted=false`。随后重跑定向测试，结果为 `26 passed in 1.41s`。

### 两轮真实浏览器交互

Playwright CLI 使用新的 headed 会话访问同一“5.1 栈”深链接。登录后先删除 `accessToken` 和 `refreshToken`，再开启正式 trace。初始页面确认课程和节点上下文正确、空输入发送按钮禁用、数字人状态为“未连接”，且入口不请求或渲染历史生成资源。

第一轮问题：

```text
请结合当前课程材料，用不超过150字和一个餐盘例子解释栈的后进先出。
```

第二轮问题：

```text
请用不超过200字说明：数组栈不扩容时入栈/出栈为何通常是 O(1)，扩容时如何理解摊销复杂度？
```

两轮 `POST /api/v1/multimodal/digital-human/chat` 均为 HTTP 200、统一 `ApiResponse`、业务 `code=200`、`status=success`，回答非空且每轮返回 3 条课程引用。固定调用顺序由本次通过的调用顺序测试与运行结果共同确认：模型回答和课程检索成功、内容通过 audit/safety 后才启动或驱动在线虚拟人。

两轮复用同一应用会话 `digital_human_session_61f7965465bd`，`videoUrl` 和 `startedAt=2026-07-17T03:58:43.536719+00:00` 保持不变；直播期间只有 1 个 FFmpeg，第二轮只追加文本驱动。消息历史按 `user / assistant / user / assistant` 返回 4 条消息，4 个消息 ID 均唯一，两条 assistant 消息均保留引用材料。

### 播放、心跳与清理

- 浏览器实际请求本地 `.m3u8` 和连续 `.ts` 分片，manifest/分片均为 200；
- `<video>` 为 1280×720、`readyState=4`、`paused=false`、`muted=false`、`volume=1`，3 秒采样内 `currentTime` 持续前进；
- `ffprobe` 确认视频为 H.264 1280×720，音频为 AAC 16 kHz 单声道；
- 两次相隔至少 5 秒的 `/live` 查询中 `updatedAt` 前进，心跳成立；
- 页面首次主动 stop 返回 `cancelled`，重复 POST stop 仍返回 `cancelled`，最终 `/live` 为 `cancelled`；
- 停止后 backend 容器 FFmpeg 数量为 0；
- 浏览器控制台为 0 error、0 warning，无意外 4xx/5xx、无外部网络请求、无历史生成资源请求。

### 安全扫描

正式 trace 与 network 对 Token、`accessToken`、`refreshToken`、签名 `authorization`、API Key、Secret、原始 RTMP、讯飞域名、provider session 和原始 `sid` 的扫描结果全部为 0。浏览器证据仅包含本地前后端、应用会话 ID 和本地 HLS 地址。

## 证据

- `output/playwright/digital-human-live-2026-07-17/01-initial.png`
- `output/playwright/digital-human-live-2026-07-17/02-first-round-dns-failure.png`
- `output/playwright/digital-human-live-2026-07-17/browser-trace.trace`
- `output/playwright/digital-human-live-2026-07-17/browser-network.network`
- `output/playwright/digital-human-live-2026-07-17/browser-network-summary.log`
- `output/playwright/digital-human-live-2026-07-17/browser-console.log`
- `output/playwright/digital-human-live-2026-07-17/real-chat-summary.json`

冷重启恢复与最终复验证据：

- `output/playwright/digital-human-live-recovery-2026-07-17/01-initial.png`
- `output/playwright/digital-human-live-recovery-2026-07-17/02-round-1.png`
- `output/playwright/digital-human-live-recovery-2026-07-17/03-round-2.png`
- `output/playwright/digital-human-live-recovery-2026-07-17/04-stopped.png`
- `output/playwright/digital-human-live-recovery-2026-07-17/digital-human-live.trace`
- `output/playwright/digital-human-live-recovery-2026-07-17/digital-human-live.network`
- `output/playwright/digital-human-live-recovery-2026-07-17/network-summary.json`
- `output/playwright/digital-human-live-recovery-2026-07-17/console-summary.json`
- `output/playwright/digital-human-live-recovery-2026-07-17/result.json`

本次未修改公共 API、字段、枚举、数据库结构或业务实现，因此不修改 `docs/interface-contract.md`。
