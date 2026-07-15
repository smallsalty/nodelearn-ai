# 个性化知识点视频真实链验收记录

验收日期：2026-07-13。

## 运行对象

- 课程：数据结构 `course_ds_001`
- Hello Algo 节点：`node_docs_chapter_hashing_hash_map_md_f99bbe2ebac4`
- 题目：为什么哈希表不需要逐项查找？
- Provider：DeepSeek、豆包 V3 HTTP Chunked、Remotion 4.0.470、FFmpeg/ffprobe
- 主题/画幅/质量：`warm_academic`、`16:9`、`high`
- 命令：`$env:RUN_REAL_VIDEO_TESTS='true'; python -m pytest app/tests/services/test_real_video_generation.py -q -s`
- 结果：`1 passed in 139.83s`

## 任务与资源

- 任务：`resource_task_81437f4da76d`，最终 `success/done`
- 视频脚本资源：`resource_video_script_7b0433a24d53`，`success/passed`
- 动画脚本资源：`resource_animation_script_0d10f53f553d`，`success/passed`
- 发布路径：`backend/storage/generated_resources/resource_task_81437f4da76d/lesson.mp4`
- 公开 URL：`http://localhost:8000/storage/generated_resources/resource_task_81437f4da76d/lesson.mp4`
- 逐场景音频：同目录 `audio/scene_01.mp3` 至 `scene_06.mp3`

## 媒体验证

- 文件大小：5,802,112 bytes
- 容器时长：63.296 秒
- resolved timeline：1897 帧 / 63.233333 秒视频时间轴
- 视频：H.264 High、1920×1080、SAR 1:1、DAR 16:9、30/1 fps、1897 帧
- 音频：AAC LC、48kHz、双声道
- 容器包含 1 条视频流和 1 条音频流
- MP4 与 resolved timeline 的时长误差小于 `max(0.75 秒, 1%)`
- 完整最终 ffprobe JSON：`output/video-debug/resource_task_81437f4da76d/media-probe-final.json`

## 调试与关键帧

非静态开发产物目录：`output/video-debug/resource_task_81437f4da76d/`，包含 context、strategy、narrative、raw/validated storyboard、scene plans、scene durations、resolved timeline、render manifest 和 media probe。

关键抽帧目录：`output/real-video-verification/resource_task_81437f4da76d/`。

| 文件 | 人工结论 |
|---|---|
| `scene-01.png` | 100 个位置、扫描光标和检查计数可辨识，静音时能看出逐项扫描问题 |
| `scene-02.png` | 12836、`% 100` 与结果 36 同时可见，key 到 hash function 的映射明确 |
| `scene-03.png` | 镜头只保留 #34–#37，#36 高亮且 key 正在落桶 |
| `scene-04.png` | Linear Search 与 Hash Lookup 并行竞速，检查次数和平均 O(1) 条件明确 |
| `scene-05.png` | 16750/20950 同到 #50，链 `16750 → 20950` 与“冲突 ≠ 覆盖”可见 |
| `scene-06.png` | `Key → Hash → Bucket → Local handling` 完整显示，无右侧裁切 |
| `contact-sheet.png` | 六种构图区分清楚，字幕位于安全区且无白色字幕卡片 |

fixture 音轨自动 E2E 另外验证每个场景早/晚帧 SHA-256 不同，最终回归结果为 `1 passed in 15.61s`。关闭旁白后，扫描、计算、定位、竞速、碰撞和链地址处理仍可通过画面理解。

## 已处理的运行问题

首次预审请求受宿主机 HTTP 代理影响返回 502，实际没有到达本机 audit 路由。`SafetyAuditSkill` 的审核客户端已设置 `trust_env=False`，后续预审和终审均真实到达 `/api/v1/audit/check` 并通过。成片在字幕行长与总结末项布局修正后使用原豆包音频无额外付费重渲染，并再次通过完整 `MediaValidator`。
