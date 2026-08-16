# QA 测试账号（仅测试环境）

> 总控批准时间：2026-08-15（用户「批准和允许」）  
> 用途：权限不足、无权限态、账号禁用场景。勿用于生产。

| 账号 | 密码 | 角色 | 用途 |
| --- | --- | --- | --- |
| `admin` | `admin123` | super_admin | 超管（原有） |
| `qa_staff` | `QaStaff123` | service_staff（客服，低于 content_ops） | 测「角色不足」；登录/页面管理无权限态 |
| `qa_temp` | `QaTemp123` | service_staff | 可禁用账号，测 110103 / FP-API-074 |

## 创建证据

- `POST /api/v1/admin/admin-users` 成功：`qa_staff` id=2，`qa_temp` id=3
- 时间：2026-08-15

## 初测观察（待正式批次记入台账）

- `qa_staff` 登录成功
- `qa_staff` 调用 `POST /api/v1/admin/pages` **未被拒绝**（创建了 id=16「权限探测」）  
  → 契约要求 content_ops+，疑似权限校验缺失，后续批次按 FAIL 记缺陷，不得当作通过
