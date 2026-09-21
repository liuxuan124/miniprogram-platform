# 产品与工程变更（给 Agent 读）

维护规则：有实质合并或本地已成型功能，**插到当季最上面**，一行够用。季度结束时把当季压成 3～8 条摘要，细节仍以 git / 迁移脚本为准。

## 2026 Q3（2026-07 ~ 2026-09）

- 2026-09-21：冲 95% 高保真——`MiniPhoneThumb` 真机缩略/三叠；概览拖拽导航；模板预览 Dialog；AI 方案 iframe；发布对比；页面复制/归档入口；区块模板可插入。
- 2026-09-21：装修器画布文案「实时数据预览」；对比线上双栏 iframe；/mini 侧栏暖棕壳；区块模板 6 卡可点加入。
- 2026-09-21：高保真全量对齐——`/mini` 四屏+AI 三方案+装修器 AI；顶栏「发布 N」与侧栏角标；`mini-wb` 暖棕工作台壳。
- 2026-09-21：规格 Top5 对齐——内容发布时间线+回滚为待发布；概览选页换绑；页面筛选/更多菜单；模板影响面板；装修器去掉保存/仅上线本页。
- 2026-09-21：小程序模块重设计一期收尾——启动幂等迁移遗留页（名称含「归档」或 path/name 以 `tpl-` → archived）；`DataInitializer` 调用 `migrateLegacyPages`。
- 2026-09-21：小程序模块重设计一期 Backend Site 聚合 API（`/api/v1/admin/mini/site|pending-changes|publish`）+ `PageStatusCalculator` + Flyway V72（`page_group`/`archived`、`live_release_no`）。
- 2026-09-21：小程序模块重设计一期 Admin——侧栏四入口 /mini（概览/页面/模板库/发布），旧 page-builder 重定向；装修器「发布」跳统一发布页。
- 2026-09-20：装修心智统一——预览默认真机所见；品牌导航保存进待上线草稿，「上线到小程序」一次推导航+脏页；Tab 绑定页统一吃已发布 DSL；小程序新增 `pkg-templates` 整店模版馆（列表/套用）。
- 2026-09-20：新增 5 套整店系统模板（warm/retail/content/lite/edu）+ 5 个页面模块种子（商城成交/内容发现/会员权益/知识资料库/轻量开店），管理端 template-center fallback 同步。
- 2026-09-20：页面管理厘清三类——固定页（我的，独立配置卡）、主站页（已绑定首页）、自定义/专题/活动装修页；去掉列表里的「系统页」虚拟行与模糊文案。
- 2026-09-20：管理后台半成品清扫 — 知识库分库/外链抓取/发布入库（V71）、Agent 全量发布与真监控、页面搭建 Agent 可用、会员标签 CRUD、社区档权益对齐、智能草稿预览采用、增长报表去 stub、到期提醒试发、优惠券侧栏对齐（保留暖阁整店模板闭环）。
- 2026-09-20：整店模板闭环——固化「暖阁整店」系统种子（V70）；套用走内容通道上线；发布中心可配置/选择微信推送目标（AppID+密钥路径）再推体验版。
- 2026-09-20：新增 `AGENTS.md` Agent 入口与本 CHANGELOG 作为近期产品变更真相源（文档，无运行时）。
- 2026-09-20：会员档 `show_badge` / `expire_remind_days`（迁移 V69）；admin 会员/审核等与小程序 `member-center` 已合入主线。

### 已在仓内（摘要，非全量）

- Flyway 已到 **V71**（handover 库表文档仍停在 V10）。
- 会员：平台/星球档位与订阅（`V68` `mp_membership_plan` / `mp_member_subscription`）。
- 内容：会员墙、发现页布局、主星球 `planet_id`（V65–V67）等。
- 租户 / 行业模板包、暖阁原型对齐与本地种子（V51–V64 一带）。
- QA：页面装修器台账 268 项曾记 PASS；暖阁长尾 `BATCH-QA-WARM-LT-001`（2026-09-19）**不计入** 268/582 分母，禁止据此声称全量重跑。见 `agent-team/testing/status-ledger.md`。
- 上线仍卡人工：小程序资质、ICP、微信支付（`docs/handover/pending-items.md`）。`agent-team/status/project-status.yaml` 的 `last_updated` 仍是 2026-05，仅作历史阶段标签。

## 更早

- 以 git 历史与 `backend/.../db/migration/V1`–`V50` 为准；不要回写本文件。
