# P2 真 SaaS 落地说明（2026-09-14）

## 8. tenant_id 隔离（配置 / 页面 / 内容 / 商品 / 用户）

| 产物 | 说明 |
|------|------|
| `V55__tenant.sql` | `mp_tenant` + 核心表 `tenant_id`；配置唯一键 `(tenant_id, config_key)` |
| `TenantContext` + JWT | Header `X-Tenant-Id` / 用户表绑定；请求结束清理 |
| `MpTenantLineHandler` | **白名单**行级隔离：content/category/tag、product、page、system_config、file_item、order |
| 实体字段 | `User`/`AdminUser`/`MiniProgramUser`/`Content`/`Product`/`Page`/`FileItem`/`Order`/`SystemConfig`/`ContentCategory`/`ContentTag` |
| 登录表 | `mp_admin_user`/`mp_user` 不自动拼条件；列表接口手动 `eq(tenantId)` |
| API | `GET /api/v1/admin/tenants/current` |

`BaseEntity` **不含** `tenantId`（避免未迁移表 ORM 炸列）。

## 9. 模板市场业态扩展

- 枚举：`knowledge_pay` / `local_life` / `content_ip`（`education` 已有）
- Admin：`IndustryLabels` / `IndustryColors` + template-center 组合
- 种子：`V56__industry_template_packs.sql`

## 10. 组件与 Agent 按业态包裁剪

- `admin/src/constants/industry-profiles.ts`：四业态包 + 零售 fallback
- Store 写回 plugins / glossary / theme / tabbar / planet
- 系统设置 → 功能模块 →「应用业态包」
- `ComponentPanel` ← `componentAllowlist`；Agent 列表 ← `agentRoles`
- 侧栏标题 ← glossary；菜单可见性 ← plugins（feature-modules）

## 部署

后端启动 Flyway V55→V56。后台「系统设置 → 功能模块」选业态并「应用业态包」。
