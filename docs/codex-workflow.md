# Codex 工作流

1. 阅读 `docs/context-index.md`。
2. 阅读对应的 `docs/modules/*.md`。
3. 在 `docs/interface-contract.md` 中核对准确的路径、字段、枚举值、请求体和响应数据。
4. 先更新前端类型，再更新 API 封装。
5. 先更新后端结构定义，再更新路由逻辑。
6. 路由处理保持轻量，业务逻辑放入 services。
7. 功能需要新增接口、字段、枚举、环境变量或数据库表时，先同步登记到 `docs/interface-contract.md`，再更新前后端实现。
8. 模拟数据只能使用契约字段和契约枚举值；需要新字段时先补契约。
9. 路由或类型变更后运行契约测试。
