# 编程题模块

来源：`docs/interface-contract.md` 编程题接口节。

- 页面：`frontend/src/pages/PracticePage.vue` 的“编程题”Tab；`/programming` 仅作为兼容入口重定向到 `/practice?tab=coding`，并保留 `nodeId`。
- 编辑与判题组件：`frontend/src/components/practice/ProgrammingPracticePanel.vue`
- API：`frontend/src/api/modules/programming.ts`
- 类型：`frontend/src/types/programming.ts`
- 后端：`backend/app/api/v1/programming.py`、`backend/app/services/programming_service.py`
- 远程执行：`backend/app/services/judge0_service.py`，仅通过 Judge0 兼容 API 执行用户代码。
- Docker：`docker/docker-compose.yml` 使用官方 `judge0/judge0:1.13.1` 镜像启动 server、worker、PostgreSQL 和 Redis；后端经 `http://judge0-server:2358` 调用，不需要云端 API Token。

公开样例用于展示，隐藏用例仅由后端保存和判定。Judge0 服务未启动时必须返回 `system_error`，不得伪造判题结果。

编程题与单选题、简答题共用工作台当前 `courseId + nodeId`。从知识图谱或节点正文进入练习后，直接显示当前节点的历史题目，不要求再次选择节点。
