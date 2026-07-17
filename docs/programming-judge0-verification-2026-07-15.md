# 算法题真实代码执行与案例判题验收（2026-07-15）

## 结论

算法题的代码执行、案例输入传递和输出比较均可正常工作，结论为 `PASS_REAL`。

- 前端通过真实 FastAPI 提交源码，FastAPI 通过真实 Judge0 1.13.1 执行 C++、C 和 Python。
- 固定题矩阵 11/11 符合预期，覆盖 `AC`、`WA`、`PE`、`CE`、`RE`、`TLE` 和 `system_error`。
- mock=false 下真实 DeepSeek 生成“循环左移数组”，正确 Python 解法经公开与隐藏案例判定为 `AC`。
- 隐藏案例、隐藏输入、隐藏期望输出和参考实现均未出现在题目、提交响应、浏览器或报告中。
- 题目与提交记录当前仍保存在后端进程内存中：同一进程刷新可恢复，后端重启会丢失，持久化能力为 `PASS_PLACEHOLDER`。

本次未修改公开 API、类型、数据库结构、页面能力或 `docs/interface-contract.md`。

## 环境与判定规则

- 固定题阶段：后端 `ENABLE_MOCK=true` 只用于生成确定性的“两数求和”题；前端、FastAPI 和 Judge0 均为真实服务。
- 真题阶段：后端 `ENABLE_MOCK=false`，连接真实 PostgreSQL、DeepSeek 和 Judge0。
- Judge0：backend 容器访问 `/about` 返回版本 1.13.1、HTTP 200。
- 输出规则：先把 CRLF 归一化为 LF；完全相等为 `AC`，仅 token/空白等价为 `PE`，其他差异为 `WA`。
- 公开固定样例：输入 `3 5\n`，期望输出 `8\n`。

固定题和真实模式均通过真实 HTTP 访问 `/api/v1/programming/questions/*` 和 `/api/v1/programming/submissions`，所有成功业务响应均符合 `ApiResponse<T>`。

## 固定题真实 Judge0 矩阵

| 场景 | 语言 | 公开输入 | 期望输出 | 实际输出/证据 | 期望 | 实际 | 结果 |
|---|---|---|---|---|---|---|---|
| 正确实现 | C++ | 公开及隐藏案例 | 按题目计算 | 全部案例通过 | `AC` | `AC` | `PASS_REAL` |
| 正确实现 | C | 公开及隐藏案例 | 按题目计算 | 全部案例通过 | `AC` | `AC` | `PASS_REAL` |
| 正确实现 | Python | 公开及隐藏案例 | 按题目计算 | 全部案例通过 | `AC` | `AC` | `PASS_REAL` |
| 错误运算 | Python | `3 5\n` | `8\n` | `-2\n`，`failedSampleIndex=0` | `WA` | `WA` | `PASS_REAL` |
| 多余空白 | Python | `3 5\n` | `8\n` | `8 \n`，`failedSampleIndex=0` | `PE` | `PE` | `PASS_REAL` |
| 编译错误 | C++ | 公开样例 | 不适用 | `compileOutput` 非空 | `CE` | `CE` | `PASS_REAL` |
| 运行异常 | Python | 公开样例 | 不适用 | `stderr` 非空 | `RE` | `RE` | `PASS_REAL` |
| 无限循环 | Python | 公开样例 | 不适用 | Judge0 返回 TLE，报告时间 5.1 秒 | `TLE` | `TLE` | `PASS_REAL` |
| 只写死公开答案 | Python | 隐藏案例 | 不公开 | `failedSampleIndex` 为空，未泄露隐藏输入/期望 | `WA` | `WA` | `PASS_REAL` |
| 不存在题目 | Python | 不适用 | 不适用 | 返回明确错误文本 | `system_error` | `system_error` | `PASS_REAL` |
| 源码超过 20000 字符 | Python | 不适用 | 不适用 | 提交前拒绝并返回明确错误 | `system_error` | `system_error` | `PASS_REAL` |

额外检查：

- 固定验收用户的 11 条提交记录数量一致并按最新优先返回。
- 题目详情刷新后仍可读取。
- WA/PE/CE/RE/TLE 响应中的时间、内存和错误字段按契约可选返回；没有伪造缺失数据。
- 原始脱敏矩阵保存在 `output/playwright/programming-judge0-2026-07-15/fixed-api-verdict-matrix.json`。

## mock=false 真实出题与判题

- 真实节点：`node_docs_chapter_array_and_linkedlist_array_md_ddee4c9f1f0c`（数组）。
- 请求：`difficulty=easy`、`count=1`，只执行一次实际 DeepSeek 调用。
- 生成题目：`programming_question_001`，“循环左移数组”。
- 公开样例：输入 `5\n1 2 3 4 5`，期望输出 `2 3 4 5 1\n`。
- 正确解法按 `n` 截取数组并输出 `arr[1:] + arr[:1]`；公开样例本地输出一致。
- API 提交 `programming_submission_001` 使用 Python，经真实 Judge0 返回 `AC`。
- 浏览器再次输入等价 Python 解法并返回 `AC`，刷新后题目仍可读取。

第一次命令行预检因 Windows PowerShell 向 curl 传递内联 JSON 时丢失引号，在 FastAPI JSON 解析阶段返回 422；后端日志确认未进入 DeepSeek。改用临时 JSON 请求文件后仅执行上述一次真实生成，没有通过重复付费调用掩盖问题。

结论：DeepSeek 出题 `PASS_REAL`，Judge0 判题 `PASS_REAL`，进程内题目/提交存储 `PASS_PLACEHOLDER`。

## 浏览器验收

使用 Playwright CLI，未引入 `@playwright/test`。

| 验收项 | 结果 |
|---|---|
| 固定题默认 C++ 代码 | 页面显示 `AC` 和“全部公开与隐藏测试用例通过” |
| 固定题非法 C++ | 页面显示 `CE`、编译器错误和公开样例 1 |
| 固定题页面刷新 | 题目仍可读取，代码模板恢复 |
| mock=false 真题 Python | 页面显示“循环左移数组”和 `AC` |
| mock=false 页面刷新 | 真题仍可读取 |
| 网络 | 浏览器业务请求全部 HTTP 200，无意外 4xx/5xx |
| 控制台 | 0 error；3 条既有 Element Plus radio `label` 弃用 warning |

证据目录：`output/playwright/programming-judge0-2026-07-15/`。

- `fixed-browser-ac.png`：固定题 C++ AC。
- `fixed-browser-ce.png`：固定题 C++ CE 和编译信息。
- `real-browser-ac.png`：mock=false 真题 Python AC。
- `browser-trace.trace`、`browser-network.network`：完整 trace 和网络记录。
- `browser-console.log`、`browser-requests.log`：控制台和请求清单。
- `real-generated-response.json`、`real-submission-response.json`：不含隐藏案例的真实出题与提交响应。

## 回归与清理

| 检查 | 结果 |
|---|---|
| 编程服务/API/Judge0 契约专项 | `8 passed in 1.72s` |
| 后端完整测试 | `189 passed, 2 skipped in 3.37s` |
| 前端生产构建 | 通过 |
| `git diff --check` | 通过，仅有既有 Windows CRLF 提示 |

容器内专项运行曾出现 7 通过、1 个环境失败：契约测试需要读取仓库根目录的 `docs/interface-contract.md`，后端镜像只包含 `/app`，因此 `/docs` 不存在。按仓库约定在宿主机 `backend` 目录复跑后 8 项全部通过；这不是 Judge0 行为缺陷。

验收结束后关闭 Playwright 和 Docker compose，不删除数据卷；临时 Compose override 和临时请求文件一并删除。已有用户文件和生成资源不删除。
