# BATCH-QA-022 API 回归证据

时间：2026-08-16 13:05  
环境：`http://127.0.0.1:8080/api/v1`（backend Docker rebuild 后 healthy）

## 鉴权（BUG-API-002）

| 检查 | 结果 |
| --- | --- |
| 无 Token `GET /admin/pages` | HTTP **401** code=110101 |
| 有 Token `GET /admin/pages` | HTTP **200** |
| 有 Token `GET /admin/members` | HTTP **200** |
| 有 Token `GET /admin/orders` | HTTP **200** |
| 有 Token `GET /admin/products` | HTTP **200** |
| 有 Token `GET /admin/coupons` | HTTP **200** |
| 有 Token `GET /admin/activities` | HTTP **200** |
| 有 Token `GET /admin/assets?type=image` | HTTP **200** total=**2** |

## 草稿版本冲突（BUG-API-009）

`POST /admin/pages/2/draft` body: `{ dslContent, expectedVersion }`

| 场景 | 结果 |
| --- | --- |
| expectedVersion 匹配 | HTTP **200** |
| expectedVersion 过期 | HTTP **409** code=**300409** |

## 小程序页面 404（BUG-API-010）

| path | 结果 |
| --- | --- |
| `?path=missing-page-xyz` | HTTP **404** code=300401 |
| `?path=pages/custom/qa-perm-probe`（仅草稿） | HTTP **404** code=300401 |

## 其它探索项

| 检查 | 结果 |
| --- | --- |
| `GET /admin/agent/meta/active` | HTTP **200**（data 可为 null） |
| 活动 id=1 | status=**3**（已结束，ACT-001） |
| `GET /admin/admin-users` | roleName 字段可读（SET-001） |

## 部署

```bash
cd deploy && docker compose build backend && docker compose up -d backend
```

ActivityServiceImpl 过期自动结束逻辑已随新镜像部署。
