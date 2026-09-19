# Agent 入口（先读这份）

给后续 Agent 的短入口。细节去链接，不要凭记忆扫全库。

## 现在以什么为准

| 主题 | 真相源 | 注意 |
|------|--------|------|
| 库表 / 迁移 | `backend/src/main/resources/db/migration/` | 当前最高 **V69**。`docs/handover/database-schema.md` 只写到 V10，已过期 |
| 跨端契约 | `agent-team/contracts/` | 改接口/表结构/DSL/订单状态前先读冻结日志 |
| 测试续跑 | `agent-team/testing/status-ledger.md` | 禁止凭记忆重头测 |
| 上线人工项 | `docs/handover/pending-items.md` | 资质 / 备案 / 支付商户 |
| 近期产品变更 | `docs/CHANGELOG.md` | **有实质改动就记一行**；季度只做压缩，不当唯一真相 |
| 总控状态 | `agent-team/status/project-status.yaml` | 文件日期可能旧，以 CHANGELOG + git 为准 |

`docs/handover/` 是架构/部署/运维的底稿，不当「本周功能清单」。

## 仓库结构（干活用）

- `backend/` Spring Boot
- `admin/` Vue3 管理后台
- `miniapp/` 微信小程序（含 `pkg-user` 等分包）
- `agent-team/` 多 Agent 协作、契约、QA 台账
- `.cursor/rules/` 工作区规则（术语说明、QA 角色等）

## 写代码前

1. 读 `docs/CHANGELOG.md` 顶部（本季 + 未入库工作）。
2. 动库表只新增 Flyway（编号续 V69 之后），不要改已执行过的脚本语义。
3. 跨模块改动对照 `agent-team/contracts/`；冲突先停，不要猜哪份为准。
4. QA / 上线任务走 `agent-team/agents/qa-release-agent.md`，先标明 QA 或 RELEASE。

## 改完后维护（强制、短）

在 `docs/CHANGELOG.md` **本季区块顶部**加一行：`YYYY-MM-DD` + 一句话（做了什么、影响哪端、迁移号如有）。

不要：把测试台账抄进来、写长周报、只写进 Cursor Agent Store（换会话读不到）。
