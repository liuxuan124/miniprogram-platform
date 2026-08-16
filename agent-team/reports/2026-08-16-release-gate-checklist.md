# 上线前检查清单（RELEASE 模式）

- 工作模式：**RELEASE**
- 产出时间：2026-08-16
- 产出 Agent：qa-release-agent
- 前提：QA 正式台账 **268/268 PASS**（BATCH-QA-028）

## 契约版本（只读声明）

| 契约 | 版本 |
| --- | --- |
| api-contract.md | 2026-07-22 |
| database-model.md | 2026-07-22 |
| page-dsl-schema.md | 2026-07-22 |
| order-state-machine.md | 2026-07-22 |
| ai-recommendation-contract.md | 2026-07-22 |

## 阶段 7 检查项

| # | 检查项 | 本地/dev | 生产 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 后端健康检查 | ✅ UP | 待部署 | RELEASE-001/run-results.md |
| 2 | 管理后台可访问 | ✅ :3000 | 待部署 | 同上 |
| 3 | 页面 API / 发布版本 | ✅ 1.7.0 | 待部署 | API 200 |
| 4 | Docker 全栈 | ✅ 5 容器 | 待部署 | compose ps |
| 5 | GlobalExceptionHandler 单测 | ✅ mvn exit 0 | CI 待接入 | backend test |
| 6 | Admin vite 产物构建 | ✅ | 待流水线 | vite build 7.13s |
| 7 | Admin vue-tsc 严格构建 | ❌ | 待修复 | 多模块 TS 错误 |
| 8 | 微信合法域名白名单 | — | ⏸ BLK-REL-001 | blockers.yaml |
| 9 | HTTPS / 备案域名 | — | ⏸ BLK-REL-002 | blockers.yaml |
| 10 | 微信支付商户配置 | — | ⏸ BLK-REL-004 | blockers.yaml |
| 11 | 体验版 / 提审材料 | — | ⏸ 未执行 | 需 AppID |
| 12 | 真机 iOS/Android | — | ⏸ 未执行 | 手机号登录留手动 |

## 项目级 8 条（装修器范围）

| # | 要求 | 结论 |
| --- | --- | --- |
| 1 | 功能点清单总控确认 | ✅ 268 |
| 2 | 执行率 100% | ✅ 268/268 PASS |
| 3 | P0/P1 关闭 | ✅ 缺陷均回归通过 |
| 4 | 订单状态机证据 | ⏸ 未进正式分母 |
| 5 | 支付/退款实网 | ⏸ BLK-REL-004 |
| 6 | 真机双端 | ⏸ 未执行 |
| 7 | 上线检查清单 | ✅ 本地项已勾选；生产项待资源 |
| 8 | 试运行移交 | ⏸ BLK-REL-006 |

## 结论

- **本地/dev 环境：可继续联调与体验版准备**
- **生产上线：BLOCKED**（BLK-REL-001/002/004 + admin vue-tsc）
- **页面装修器 QA：268/268 PASS，可标「装修器测试完成」**；全系统 582 点与 RELEASE 8 条未全闭

证据目录：`agent-team/testing/evidence/RELEASE-001/`
