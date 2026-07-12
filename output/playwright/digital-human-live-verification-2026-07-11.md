# 讯飞实时数字人对话脱敏验收记录

最后更新：2026-07-12

## 协议与授权资源

- 接口服务大模型入口：`wss://apigateway.xfyousheng.com/nlp/v1/interact_nlp`，使用 WebSocket GET HMAC-SHA256 鉴权，同一接口服务的 APPID/APIKey/APISecret 和 service ID。
- 在线虚拟人入口：`wss://avatar.cn-huadong-1.xf-yun.com/v1/interact`，签名请求行为为 `GET /v1/interact HTTP/1.1`。
- start 使用 `header.ctrl=start`、`scene_id`、avatar `201165002`、voice `x4_lingxiaoxuan_oral` 和 RTMP；每次 `text_driver` 同样使用 `x4_lingxiaoxuan_oral`，文本为明文 `payload.text.content`，`interactive_mode=0`。
- 同一业务 session 复用一条 WebSocket；应用层每 5 秒 ping。实时聊天链路不回退旧 `vms2d_*`、Spark Lite、DeepSeek 或 mock。

## 自动化验证

- 授权音色及协议/provider/直播针对性测试：`37 passed`。
- 完整后端测试：`146 passed, 1 skipped`。
- Python `compileall`：通过。
- 前端 `vue-tsc --noEmit` 与 Vite production build：通过。
- 公共数字人 chat/live/stop HTTP 路径、返回类型、单一前端播放器和本地 HLS URL 未改变。

## 真实门禁与两轮播放

1. 已授权 voice 切换为 `x4_lingxiaoxuan_oral` 后，独立新协议 start/stop smoke 成功：start 返回非空直播流和内部会话，随后在 `finally` 发送 stop 并关闭 WebSocket。该 smoke 未调用模型、未启动 FFmpeg、未发送 `text_driver`。
2. 隔离环境使用 PostgreSQL 5432、后端 8011、前端 5176，并显式设置两个 mock 开关为 false。健康检查确认接口服务模型与在线虚拟人配置可用。
3. 第一轮围绕“数组为何支持 O(1) 随机访问”发起真实问答，返回非空接口服务模型回答和课程 RAG 引用；随后完成一次 avatar start、一次 `text_driver`，浏览器持续拉取 HLS manifest 和分片。
4. 第二轮围绕“数组插入为何移动后续元素”追问，返回第二条非空真实回答和课程引用；继续复用同一个业务 session、虚拟人 WebSocket、HLS URL、startedAt 和 FFmpeg，仅追加第二次 `text_driver`。
5. 5 秒间隔检查中 live `updatedAt` 前进，证明至少一次应用层 ping 成功；检查时已连续生成 310 个 HLS 分片。
6. `ffprobe` 确认 HLS 包含 H.264 视频和 AAC 音频。浏览器播放器未静音且自动播放成功，画面和两轮对话截图已保存。
7. 页面“结束会话”成功将状态改为 `cancelled`，WebSocket 关闭且 FFmpeg 数量归零；重复 stop 仍返回 `cancelled`，保持幂等。

## 验收产物

- `output/playwright/digital-human-live-round1-2026-07-12.png`
- `output/playwright/digital-human-live-two-rounds-2026-07-12.png`
- `output/playwright/digital-human-live-verification-2026-07-11.md`

## 清理与安全

- 浏览器、8011、5176、PostgreSQL 隔离容器和 FFmpeg 均已停止；没有残留监听端口或直播子进程。
- 未尝试其他 voice、avatar、模型、协议或 mock。
- 本记录和截图不包含 APIKey、APISecret、authorization、签名 URL、原始 RTMP、内部 handle、provider session 或完整 sid。
