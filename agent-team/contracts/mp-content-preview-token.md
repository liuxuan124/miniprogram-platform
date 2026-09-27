# 小程序内容草稿预览（pt / scene）

## 管理端

- `POST /api/v1/admin/mini/preview-tokens?withWxQr=true` → JWT + `jti` + 可选 `wxQrcodeBase64`
- `DELETE /api/v1/admin/mini/preview-tokens/{jti}` → 吊销

## 小程序端

- 启动参数 `pt={jwt}` 或小程序码 `scene={jti}`（≤32）
- `GET /api/v1/mp/preview-tokens/exchange?jti=` → `{ token }`（Redis 2h，须未吊销）
- 请求头 `X-Mp-Preview-Token`；查询 `view=draft|online`（draft 须有效令牌）
- **正式版 `envVersion=release` 忽略 pt**

## 发布

- `change_id`: `site:*` | `page:{id}`
- `POST /api/v1/admin/mini/preflight` body `{ changeIds[] }`
- `POST /api/v1/admin/mini/publish` 发布前/递增序号前各跑一次 preflight
