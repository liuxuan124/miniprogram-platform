# QA 交付门禁快照

- 工作模式：QA
- 产出时间：2026-08-15
- 产出 Agent：qa-release-agent
- 性质：**门禁快照，不是测试完成报告**

## 契约版本声明（阶段 0）

| 契约 | 版本 / 最后修改 |
| --- | --- |
| api-contract.md | 2026-07-22（冻结初稿，CONTRACT-FREEZE-LOG 2026-05-11） |
| database-model.md | 2026-07-22 |
| page-dsl-schema.md | 2026-07-22 |
| order-state-machine.md | 2026-07-22 |
| ai-recommendation-contract.md | 2026-07-22 |

## 正式分母覆盖率（页面装修器，总控已确认）

| 指标 | 值 |
| --- | --- |
| 总功能点数（分母） | 268 |
| 执行率 | 268/268 |
| 通过率 | 191/268 |
| PASS | 191 |
| FAIL | 34 |
| PARTIAL | 41 |
| BLOCKED | 2 |
| NOT_RUN | 0 |

> 更新说明：BATCH-QA-017 权限与 forms/members 修复回归后，通过率升至 191/268；P0 已关闭。仍有 FAIL/PARTIAL/BLOCKED 与开放 P1 → **禁止输出「测试完成」**。

## 本轮已关闭（回归通过）摘要

- BUG-AUTH-001、BUG-DB-001、BUG-DB-002
- BUG-API-001、003、004、005、006、007、008

## 本轮仍失败的关键项

- BUG-API-002（未登录 403/无业务码）、BUG-API-009/010
- BUG-UI-002（发布路径不在包内）、BUG-UI-014（跳转缺字段）
- BUG-MKT-001（0.9折）；`GET /admin/forms`、`GET /admin/members` HTTP 500
- 开放 P1 其余条目多数仍为「新建」

## 全系统扩展清单（B 轨，已确认）

- 文件：`agent-team/testing/feature-inventory-system-extension.md`
- 扩展点数：**314**（API 171 / UI 38 / ORDER 40 / DB 22 / AI 20 / PAY 23）
- 与装修器合计：**582**
- 总控确认：2026-08-15（用户「批准和允许」）
- 账号矩阵：已创建 `qa_staff` / `qa_temp`（见 `credentials-qa-accounts.md`）


## 项目级验收 8 条对照

| # | 要求 | 当前结论 |
| --- | --- | --- |
| 1 | 功能点清单已产出并经总控确认 | 仅页面装修器 268 已确认；全系统扩展清单待确认 |
| 2 | 执行率 100% 且 BLOCKED 有书面原因 | 装修器执行率 100%；12 个 BLOCKED 已登记 blockers |
| 3 | P0/P1 全部关闭并回归通过 | **不满足**：开放 P1 共 12 条（均为「新建」） |
| 4 | 状态机合法+非法迁移均有证据 | **不满足**：ORDER 未进正式分母 |
| 5 | 支付/退款/回调异常场景实测 | **不满足**：缺商户沙箱（BLK-REL-004） |
| 6 | 真机 iOS+Android 机型与微信版本 | **不满足** |
| 7 | 上线检查清单勾选与证据 | RELEASE 未启动 |
| 8 | 试运行/培训/移交 | RELEASE 未启动 |

## 开放缺陷（按严重度）

### P0

无（BUG-API-011 / BUG-UI-015 已于 BATCH-QA-017 回归通过）。

### P1（开放「新建」；AUTH-001 已回归通过）

| 编号 | 指派 | 摘要 |
| --- | --- | --- |
| BUG-UI-002 | admin-agent | 发布路径不在小程序包内 |
| BUG-UI-003 | admin-agent | 删除/离开未保存缺少确认 |
| BUG-FORM-001 | admin-agent | 表单状态映射错误（本轮另见 /admin/forms 500） |
| BUG-FORM-004 | 总控裁决 | 小程序表单提交链路异常 |
| BUG-MEMBER-001 | backend-agent | 会员消费与订单对不上（本轮 /admin/members 500） |
| BUG-MKT-001 | admin-agent | 优惠券折扣展示错误 |
| BUG-MP-001 | miniapp-agent | 订单空态/登录半层异常 |
| BUG-PROD-001 | backend-agent | 商品分类展示未分类 |
| BUG-PROD-003 | admin-agent | 真实数据预览销量/下架不符 |

> 原清单中 BUG-AUTH-001 / BUG-DB-001 / BUG-DB-002 本轮已标「回归通过」。


### P2 / P3

- P2 新建约 27 条（含 BUG-API-001～006/009/010、BUG-UI-014 等）；已回归通过 4 条（BUG-UI-009/010/012/013）
- P3 新建约 8 条

## BLOCKED 与所需支持（已写入 blockers.yaml）

| 阻塞 ID | 卡住 FP | 所需支持 |
| --- | --- | --- |
| BLK-QA-ACCOUNT-MATRIX-001 | FP-API-020/030/036/043/049/055/065，FP-UI-005/029 | 批准创建低于 content_ops 的第二账号 |
| BLK-QA-DISABLE-USER-001 | FP-API-074 | 可禁用非超管账号 |
| BLK-QA-TENANT-SCOPE-001 | FP-API-076 | 租户隔离契约裁决 |
| BLK-REL-004 | 支付真机 | 微信支付商户/沙箱资料 |
| BLK-REL-001 / BLK-REL-002 | 真机与域名 | 小程序主体与服务器资料 |

另：FP-API-078（强制 500）环境无法构造，维持 BLOCKED。

## 探索附录风险（不计入 268）

BATCH-QA-001～009 覆盖订单/商品/表单/会员/财务/小程序等，多项 FAIL/PARTIAL，**未纳入正式分母**。交付前若仅看 268 会严重低估全系统风险。

## 本阶段计划动作（不改变门禁结论措辞）

1. A 轨：BATCH-QA-014 复测装修器 API/DB FAIL
2. C 轨：BATCH-QA-015 对开放 P1 主路径有证据回归
3. B 轨：扩展全系统 feature-inventory，**待总控确认后**才设计/执行新用例

## 明确声明

当前 **不满足** 向客户交付的项目级质量门禁。本文件仅作决策输入，不含上线时间建议。
