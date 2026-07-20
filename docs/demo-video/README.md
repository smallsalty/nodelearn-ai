# NodeLearn AI 智能体演示视频交付包

本目录用于制作不超过 7 分钟的项目演示视频。成片目标时长为 `06:45`，采用腾讯云真实服务分段录制、后期剪辑的方式。

## 文件说明

- `recording-runbook.md`：逐镜头录制步骤、页面入口、固定输入和验收点。
- `voiceover.md`：按时间轴拆分的完整口播提词稿。
- `subtitles.srt`：可直接导入剪映、Premiere 或 DaVinci Resolve 的中文字幕。
- `edit-timeline.csv`：剪辑时间线、画面、技术标签和转场要求。
- `shot-manifest.json`：镜头与产物的机器可读清单。
- `technical-labels.ass`：右下角技术标签字幕轨。
- `preview-labels.ass`：83 秒审片样片使用的技术标签轨。
- `cards/title.svg`、`cards/summary.svg`：1920×1080 片头与总结卡，可继续编辑文字和配色。

浏览器取景产物保存在 `output/playwright/demo-video-2026-07-19/`。其中 `cloud-tunnel-check.json` 记录录制前的非敏感健康结果；截图和短片均不得包含 Token、API Key、Secret、原始 RTMP 或 provider session。

## 已生成产物

- `demo-full-draft.mp4`：完整 `06:45.033` 剪辑草案，H.264/AAC、1920×1080、30fps，已烧录口播字幕、技术标签和“真实生成过程已加速”提示；知识视频片段保留原声，其余段落等待叠加真人口播。
- `demo-preview.mp4`：83 秒、1920×1080、30fps 的视觉审片样片，含技术标签与真实知识视频声音；它不是最终 6 分 45 秒口播成片。
- `02-login-home.webm` 至 `11-summary-home.webm`：本次腾讯云真实服务分段取景；问答、思维导图和笔记镜头为本次真实写入。
- `07-knowledge-video-excerpt.mp4`：从 2026-07-12 已验收的 120.512 秒 `success/passed` 哈希教学视频截取的 15 秒代表片段，未使用 2026-07-19 两条约 62.7 秒失败视频。
- 数字人样片复用 `output/playwright/digital-human-live-recovery-2026-07-17/` 的真实 `PASS_REAL` 直播证据；本次未重复启动外部付费会话。
- Judge0 样片复用 `output/playwright/programming-judge0-2026-07-15/real-browser-ac.png` 的真实 AC 证据；腾讯云当前进程内编程题在后端重启后为空，本次未重新出题。

## 成片原则

1. 真实等待可以剪短，但必须保留“真实生成过程已加速”提示。
2. 视频生成镜头只使用 `status=success`、`auditStatus=passed` 且具有文件地址的历史资源。
3. 不将课程检索描述为真实向量库或图数据库检索；统一表述为“基于真实课程材料的检索增强生成”。
4. 不宣称学习路径、编程题记录或学习报告已经完整生产持久化。
5. 正式公网域名只有在备案拦截解除并复测通过后才进入成片；否则使用腾讯云 SSH 隧道镜头，并裁去地址栏。

## 推荐剪辑设置

- 画布：1920×1080，30fps，H.264/AAC。
- 口播：每分钟约 230–250 个汉字。
- 鼠标：开启轻量点击高亮，不使用夸张轨迹。
- 转场：以 6–10 帧溶解或直接切换为主。
- 录屏等待：压缩至 2 秒，并在右上角显示加速提示。
