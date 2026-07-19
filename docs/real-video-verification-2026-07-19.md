# 哈希表知识讲解视频真实生成验收

验收日期：2026-07-19。目标节点为 `node_docs_chapter_hashing_hash_map_md_f99bbe2ebac4`，请求规格为 `warm_academic`、目标 120 秒、1920×1080、中文字幕、DeepSeek、豆包 `seed-tts-2.0 / zh_female_vv_uranus_bigtts`、Remotion H.264/AAC、无 BGM。

## 最终结论

本次验收结论为 **FAIL_DURATION**，不是成功交付。两次正式请求都完成了真实 DeepSeek、豆包 TTS、Remotion 与审核，但实际成片约 62.7 秒，与 120 秒目标的误差约 47.7%，超过允许的 15%。两条资源均已改为 `status=failed`、`fileUrl=null`，公开 storage 目录已撤下，且在修复后端中不会进入推荐或推送。

| 尝试 | 任务 ID | 资源 ID | 媒体时长 | 目标误差 | 结果 |
|---|---|---|---:|---:|---|
| 首次 | `multimodal_video_task_dd5f16985bc6` | `resource_knowledge_video_0701b10a846d` | 62.762667 秒 | 47.70% | 失败，目标时长未进入 Scene DSL 规划和发布门禁 |
| 修复后重试 | `multimodal_video_task_d799df50c594` | `resource_knowledge_video_09ac0adb7d67` | 62.677333 秒 | 47.77% | 失败；旧 8011 Uvicorn 子进程仍占用端口，新代码未实际加载 |

修复后重试消耗了用户授权的最后一次完整付费重试，因此未发起第三次请求。要得到最终合格新视频，需要用户重新授权一次真实 DeepSeek 与豆包 TTS 运行。

## 缺陷与修复

- 根因一：`targetDurationSeconds` 只写入公开 v2 投影，未传入内部 storyboard 规划；哈希主题始终固定六场景，理论上无法覆盖 120 秒。
- 根因二：媒体校验只验证输出与 resolved timeline 一致，没有验证 resolved timeline 与用户目标时长的差距，因此 62 秒视频仍会被发布成功。
- 已在线路的 TTS 前预估时间轴和真实音频时间轴后分别增加目标时长 ±15% 门禁；不合格内容会在渲染、审核和发布前失败。
- 120 秒哈希 storyboard 扩展为十场景，增加桶内 key 核对、平均 O(1) 条件、装载/扩容、冲突链逐节点查找，非付费估算为 118.07 秒。
- 指定冲突、链式地址、负载因子或扩容时，在目标节点来源之外补充真实 Hello Algo“哈希冲突”阅读材料及链式地址实现，避免扩展事实只引用基础哈希表材料。
- 两条误发布资源已撤回公开状态；原始媒体和调试材料移至 `output/real-video-verification/` 保留。

## 内容、来源与媒体检查

- 两次输出均为 `schemaVersion="2.0"`、`theme="warm_academic"`，包含 `hook → definition → mechanism → comparison → example → summary`；事实 beat 的 `sourceIds` 都能解析到内容中的真实来源。
- 旧流水线实际只带入“哈希表”、Python Array Hash Map 和 Java Array Hash Map 三份来源，没有带入“哈希冲突”章节，因此冲突链引用的语义支撑不足；补充检索已通过定向测试覆盖。
- 两次 MP4 均为 H.264、AAC、1920×1080、30fps；文件大小分别为 5,782,180 和 5,806,398 字节。
- 第二次视频六个场景的前后帧 SHA-256 均不同，不是静态卡片。抽帧确认暖白学院色调、字幕安全区、哈希函数、桶定位、复杂度对比和冲突示例可读，场景之间使用扫描、映射、聚焦、双栏竞速、冲突和总结流程等不同构图；无常驻页脚或进度条。

代表性联系表：`output/real-video-verification/retry-20260719/contact-sheet.png`。完整 `ffprobe`、逐场景音频、v2 JSON、事件、关键帧和哈希记录位于两次验收目录中。

## 推荐与页面验证

- 生成完成时旧进程曾为两条短视频各创建 1 条推荐和 1 条推送；撤回资源并重启修复后端后，两条失败资源的推荐和推送均为 0。
- Playwright 登录后打开失败资源深链，视频页面保持 `action=knowledge_video` 和正确哈希节点，但不会打开失败资源；页面选择了该节点下既有的合格历史视频。
- 播放器对合格历史视频返回 `readyState=4`、1920×1080、120.512 秒。页面访问期间只有 GET 和登录请求，没有 `POST /multimodal/videos/generate`。
- 375px 视口 `scrollWidth=clientWidth=375`，播放器宽 305px，无横向溢出；控制台错误和警告均为 0。

## 非付费回归

- 视频流水线、视频服务、补充来源和契约定向测试：`50 passed`。
- `video-renderer` TypeScript 检查通过；15 种 Scene Renderer 烟测通过。
- 本地 Remotion 哈希 fixture 渲染通过；修复前定向集合为 `47 passed`。
- 完整后端、前端生产构建和最终 `git diff --check` 结果见 `docs/project-status.md`。

