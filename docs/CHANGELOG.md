# 产品与工程变更（给 Agent 读）

维护规则：有实质合并或本地已成型功能，**插到当季最上面**，一行够用。季度结束时把当季压成 3～8 条摘要，细节仍以 git / 迁移脚本为准。

## 2026 Q3（2026-07 ~ 2026-09）

- 2026-09-20：管理后台半成品清扫 — 知识库分库/外链抓取/发布入库（V71）、Agent 全量发布与真监控、页面搭建 Agent 可用、会员标签 CRUD、社区档权益对齐、智能草稿预览采用、增长报表去 stub、到期提醒试发、优惠券侧栏对齐（保留暖阁整店模板闭环）。
- 2026-09-20：整店模板闭环——固化「暖阁整店」系统种子（V70）；套用走内容通道上线；发布中心可配置/选择微信推送目标（AppID+密钥路径）再推体验版。
- 2026-09-20：新增 `AGENTS.md` Agent 入口与本 CHANGELOG 作为近期产品变更真相源（文档，无运行时）。
- 2026-09-20：会员档 `show_badge` / `expire_remind_days`（迁移 V69）；admin 会员/审核等与小程序 `member-center` 已合入主线。

### 已在仓内（摘要，非全量）

- Flyway 已到 **V70**（handover 库表文档仍停在 V10）。
- 会员：平台/星球档位与订阅（`V68` `mp_membership_plan` / `mp_member_subscription`）。
- 内容：会员墙、发现页布局、主星球 `planet_id`（V65–V67）等。
- 租户 / 行业模板包、暖阁原型对齐与本地种子（V51–V64 一带）。
- QA：页面装修器台账 268 项曾记 PASS；暖阁长尾 `BATCH-QA-WARM-LT-001`（2026-09-19）**不计入** 268/582 分母，禁止据此声称全量重跑。见 `agent-team/testing/status-ledger.md`。
- 上线仍卡人工：小程序资质、ICP、微信支付（`docs/handover/pending-items.md`）。`agent-team/status/project-status.yaml` 的 `last_updated` 仍是 2026-05，仅作历史阶段标签。

## 更早

- 以 git 历史与 `backend/.../db/migration/V1`–`V50` 为准；不要回写本文件。
