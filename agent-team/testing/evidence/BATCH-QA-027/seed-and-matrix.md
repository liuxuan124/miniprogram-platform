# BATCH-QA-027 种子数据 + 角色矩阵 + MP 提交

## 种子（deploy/qa-batch-027-seed.sql）
| 表 | 结果 |
|---|---|
| mp_refund | 1 条 pending RF202608160001 |
| mp_form_data | 2 条（含 MP 实时提交 id=2） |
| mp_ai_conversation | 1 条（recommended_items 格式 type/id） |

## API 验证
- GET /admin/refunds → total=1
- GET /admin/forms/1/submissions → total=2
- GET /admin/ai/conversations → total=1
- POST /mp/form-templates/1/submit（wx_1 JWT）→ 200 id=2

## 角色矩阵
| 账号 | role | perms | create_page | refunds | list_pages |
|---|---|---|---|---|---|
| admin | super_admin | 53 | 200 | 200 | 200 |
| qa_staff | service_staff | 11 | 200301 | 200301 | 200 |

## EXP-LINE1-MP
- app.json 注册 `pages/custom/custom` 统一承载自定义路径
- GET /mp/pages?path=/pages/custom/qa-batch001 → 200
- GET /mp/pages?path=/pages/custom/page-640940 → 200

## EXP-MP-CONTENT-DETAIL（代码回归）
- 空评论 → toast「请输入评论内容」
- 发表评论 → AuthUtil.requireLoginForAction
- 点赞/收藏 → 本地 Storage，未登录可用
