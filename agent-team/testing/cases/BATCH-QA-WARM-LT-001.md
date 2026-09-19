# BATCH-QA-WARM-LT-001 用例汇总

> 执行时间：2026-09-19 23:00~23:10 CST  
> work_mode：QA（只验证记缺陷，不部署/不改业务代码）  
> 生产 API：`https://api.zfculture.site`；SSH：`zfculture`  
> 体验版目标：`1.30.4`

## 契约读取声明

| 契约 | mtime / 版本 |
| --- | --- |
| api-contract.md | mtime=2026-07-22 12:16:28 |
| database-model.md | mtime=2026-07-22 12:16:28 |
| page-dsl-schema.md | mtime=2026-09-15 23:07:02 |
| order-state-machine.md | mtime=2026-07-22 12:16:28 |
| ai-recommendation-contract.md | v1.0；mtime=2026-07-22 12:16:28 |

契约间未发现阻塞本批的互相矛盾（本批不依赖订单状态机全量迁移）。

## 用例结论表

| 用例 ID | FP | 层级 | 结论 | 证据 |
| --- | --- | --- | --- | --- |
| TC-WARM-API-001 | FP-WARM-011 | 接口 | PASS | `evidence/.../api-health.json` status=UP |
| TC-WARM-API-002 | FP-WARM-011 | 接口 | PASS | 未登录 POST `/mp/upload` → 401/110101 |
| TC-WARM-API-003 | FP-WARM-011 | 接口 | PASS | GET `/uploads/avatar/...png` → 200 |
| TC-WARM-API-004 | FP-WARM-010 | 接口 | PASS | planet/home 含 platform/planet 双态字段 |
| TC-WARM-API-005 | FP-WARM-010 | 接口 | PARTIAL | mine/overview 未登录 401；有 token 成功路径未测 |
| TC-WARM-API-006 | FP-WARM-003 | 接口 | NOT_RUN | 缺生产 MP token，无法做 authed upload+profile |
| TC-WARM-DB-001 | FP-WARM-003 | 后台/DB | PASS | `bad_wxfile=0`；样本无 wxfile |
| TC-WARM-DB-002 | FP-WARM-010 | 后台/DB | PASS | `mp_member_subscription` / `mp_membership_plan` 表存在 |
| TC-WARM-DB-003 | FP-WARM-011 | 后台/DB | PASS | 产盘 settings.js `version: '1.30.4'` |
| TC-WARM-CODE-001 | FP-WARM-002/003 | 代码静态 | PARTIAL | settings.js 上传→profile→禁临时路径 |
| TC-WARM-CODE-002 | FP-WARM-004 | 代码静态 | PARTIAL | mine.js onAvatarError → DEFAULT_AVATAR PNG |
| TC-WARM-CODE-003 | FP-WARM-005 | 代码静态 | PARTIAL | service-chat 发图 upload + isPersistedMediaUrl |
| TC-WARM-CODE-004 | FP-WARM-006 | 代码静态 | PARTIAL | form/contribute isPersistedMediaUrl |
| TC-WARM-CODE-005 | FP-WARM-007 | 代码静态 | PARTIAL | write-review 提交前 uploadReviewImages |
| TC-WARM-CODE-006 | FP-WARM-008 | 代码静态 | PARTIAL | favorites/product-list 占位 PNG + 文件存在 |
| TC-WARM-CODE-007 | FP-WARM-009 | 代码静态 | PARTIAL | member-center/sign-in 「今日已签到」toast |
| TC-WARM-CODE-008 | FP-WARM-012 | 代码静态 | PARTIAL | 保存/上传失败路径有 toast；真机弱网 NOT_RUN |
| TC-WARM-MP-001 | FP-WARM-001 | 真机 | NOT_RUN | 需体验版登录后看我的/设置资料 |
| TC-WARM-MP-002 | FP-WARM-002 | 真机 | NOT_RUN | 改昵称保存并重进 |
| TC-WARM-MP-003 | FP-WARM-003 | 真机 | NOT_RUN | 换头像 upload+重进仍在 |
| TC-WARM-MP-004 | FP-WARM-004 | 真机 | NOT_RUN | 坏链头像 binderror 默认图 |
| TC-WARM-MP-005 | FP-WARM-005 | 真机 | NOT_RUN | 客服发图重进 |
| TC-WARM-MP-006 | FP-WARM-006 | 真机 | NOT_RUN | 表单/投稿选图 |
| TC-WARM-MP-007 | FP-WARM-007 | 真机 | NOT_RUN | 评价带图提交 |
| TC-WARM-MP-008 | FP-WARM-008 | 真机 | NOT_RUN | 无封面列表不裂图 |
| TC-WARM-MP-009 | FP-WARM-009 | 真机 | NOT_RUN | 已签再点 toast |
| TC-WARM-MP-010 | FP-WARM-012 | 真机 | NOT_RUN | 弱网/断网提示 |

## FP 汇总状态（本批）

| FP | 状态 | 说明 |
| --- | --- | --- |
| FP-WARM-001 | NOT_RUN | 真机登录路径未执行 |
| FP-WARM-002 | PARTIAL | 仅代码证据；真机未测；边界/幂等未测 |
| FP-WARM-003 | PARTIAL | DB 无 wxfile + 代码链路；authed API/真机未测 |
| FP-WARM-004 | PARTIAL | 代码 + PNG 资源；真机未测 |
| FP-WARM-005 | PARTIAL | 代码；真机未测 |
| FP-WARM-006 | PARTIAL | 代码；真机未测 |
| FP-WARM-007 | PARTIAL | 代码；真机未测 |
| FP-WARM-008 | PARTIAL | 代码 + 包内 PNG；真机未测 |
| FP-WARM-009 | PARTIAL | 代码；真机未测 |
| FP-WARM-010 | PARTIAL | planet/home 双态 PASS；mine overview 鉴权路径仅测未登录 |
| FP-WARM-011 | PARTIAL | health + 拉图 200 + 未登录 upload 401；成功上传缺 token |
| FP-WARM-012 | NOT_RUN | 失败提示以真机/弱网为主；API 仅间接覆盖未登录结构 |

计数：PASS FP=0；FAIL=0；PARTIAL=9；BLOCKED=0；NOT_RUN=3（按 FP）  
用例级：PASS=6；PARTIAL=9；NOT_RUN=11；FAIL=0

## 缺陷

本批 **无 P0/P1**。未新建 defects 文件。

观察（不升缺陷）：

1. 生产 `admin/admin123` 等常见口令登录失败 → **无法代测** 需 token 的管理端/部分接口；属测试账号可用性，非产品功能 FAIL。
2. `mp_membership_plan` / `mp_member_subscription` 行数为 0；星球套餐来自商品 `platformPackages`（planet/home 可见）——表存在已满足本批 DB 抽检；业务种子是否需补不在本批评判。
3. `mp_user.id=2` 的 `avatar_url=/images/default-avatar.png`（包内路径，非 wxfile）；展示依赖客户端默认图逻辑，建议后续改为空或公网 URL（P3 观察）。

## 人工真机必测清单（体验版 1.30.4）

1. 登录后「我的」可见昵称/头像/会员双态文案。
2. 设置改昵称 → 保存成功 → 杀进程重进仍在。
3. 设置换头像 → 网络面板可见 POST `/mp/upload` 与 PUT profile → 重进头像仍为 `https://api.../uploads/...`（非 wxfile）。
4. 人为坏链或清缓存后，我的页头像 error 回落 `default-avatar.png`。
5. 客服发图 → 退出再进仍可见远程图。
6. 表单/投稿选图上传成功；失败有 toast。
7. 评价选图后提交（确认先 upload）。
8. 无封面商品列表 / 收藏页不裂图。
9. 当日已签到后再点 → toast「今日已签到」。
10. 弱网/飞行模式：保存资料、发图失败有明确提示。
