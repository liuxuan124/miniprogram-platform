# BATCH-QA-026 探索附录回归

## 环境
- API: http://127.0.0.1:8080/api/v1
- Admin: http://127.0.0.1:3000
- 账号: admin / admin123

## API 探测

| 项 | 结果 |
|---|---|
| GET /admin/miniapp-releases/latest | semver=1.7.0, status=1 |
| GET /admin/page-templates (11套) | 4 套 DSL 含 appointment_service |
| GET /admin/content-categories | 11 个启用分类 |
| GET /admin/system/configs/basic | HTTP 200, 13 项 |
| GET /admin/system/configs/storage | HTTP 200, 9 项 |
| GET /admin/system/operation-logs | 操作人 username=admin（修复后） |
| GET /admin/refunds | total=0 |
| GET /admin/forms/*/submissions | total=0 |
| GET /admin/admin-users | admin/qa_staff/qa_temp 角色可读 |

## 代码回归

- EXP-BUILDER-NAME-EMPTY: index.vue formRules trigger blur+change + @input clearValidate
- EXP-MP-SEARCH: search.js `_plainText()` 剥离 HTML（BUG-UI-008 回归）
- EXP-TEMPLATE-CENTER: template-center.vue `templateHasBooking()` 预约筛选（BUG-TPL-001 回归）
- EXP-ACTIVITY-SIGNUP: 未登录弹登录半层为预期交互

## 后端修复

- JwtAuthenticationFilter: authentication.setDetails(username)
- OperationLogAspect / OperationLogServiceImpl: 操作日志操作人显示 admin 而非数字 ID

## 仍 PARTIAL / BLOCKED

- EXP-LINE1-MP / EXP-LINE3-MP-SUBMIT: 需微信开发者工具端上
- EXP-ORDER-REFUND / EXP-FORM-SUBMISSIONS / EXP-AI-CONVERSATION: 种子数据 0 条
- EXP-MP-CONTENT-DETAIL: 评论发表需登录，未本批端上复测
- EXP-ROLE-MATRIX: 3 账号可读，未逐角色验菜单 → PARTIAL
- EXP-MP-LOGIN: BLOCKED（手机号快捷登录无法自动化）
- FP-API-076/078: 正式台账仍 BLOCKED（单租户/无法稳定触发 500）
