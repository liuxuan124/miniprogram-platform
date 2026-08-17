# 编辑器草稿手机扫码预览设计

日期：2026-08-17  
状态：已确认  
范围：页面装修器「预览」弹窗内生成临时二维码，手机扫码查看**当前编辑草稿（含未保存）**

## 1. 目标

- 在管理端预览弹窗中提供「手机扫码预览」。
- 手机打开的是**当前画布草稿 DSL 快照**，不是线上已发布页。
- **关闭预览弹窗即作废**该临时链接；下次需重新生成。
- 公网/服务器场景可直接扫；本机 localhost 场景提示需同网或公网可访问。

## 2. 已确认决策

| 项 | 结论 |
|----|------|
| 内容 | 当前编辑草稿（含未保存改动） |
| 过期 | 关闭预览弹窗立即作废并**删除快照占用**；下次预览重新生成二维码 |
| 清理 | 退出预览 = DELETE 临时数据（内存/Redis），不落库、不占空间；兜底最长 2 小时自动清 |
| 同步策略 | 生成时快照；编辑中不实时推送到手机 |
| 访问 | 优先公网可用；本机加访问提示 |
| 不做（本期） | 微信小程序码；多人协同实时预览；持久分享链接 |

## 3. 流程

```text
运营在装修器点「预览」→ MiniPreviewDialog 打开
  → 点「手机扫码预览」
  → POST 当前 DSL 快照到后端（需后台登录）
  → 返回 token + 过期时间
  → 弹层展示二维码（URL = {origin}/h5/draft-preview?token=xxx）+ 复制链接
  → 若 hostname 为 localhost/127.0.0.1，提示局域网 IP / 公网访问要求

手机扫码 → GET 公开接口取 DSL → H5 只读渲染（PreviewPhone）

关闭 MiniPreviewDialog（或浏览器关页）
  → DELETE/作废 token
  → 手机再刷新提示「预览已失效」
```

## 4. API

### 4.1 创建临时预览（需 Admin 登录）

`POST /api/v1/admin/preview-drafts`

请求体：

```json
{
  "dsl": { "page": {}, "components": [] },
  "pageTitle": "可选",
  "pageId": "可选，便于排查"
}
```

响应：

```json
{
  "token": "url-safe-random",
  "expiresAt": "ISO-8601",
  "previewPath": "/h5/draft-preview?token=..."
}
```

约束：单用户同时最多保留少量有效草稿（如 3 个）；新建时可作废同 pageId 的旧 token。

### 4.2 读取临时预览（公开，免登录）

`GET /api/v1/mp/preview-drafts/{token}`

- 有效：返回 DSL（及 pageTitle 等元数据）
- 无效/过期：404 或业务码「预览已失效」

须在 `SecurityConfig` 对该 GET **permitAll**。

### 4.3 作废（需 Admin 登录）

`DELETE /api/v1/admin/preview-drafts/{token}`

- 关弹窗、重新生成前调用；幂等（已删也成功）

## 5. 存储

优先 **内存 ConcurrentHashMap** 或现有 Redis（若项目已用 Redis 则用 Redis）：

| 字段 | 说明 |
|------|------|
| token | 主键，≥32 字符随机 |
| dslJson | 快照 |
| userId | 创建者 |
| pageId | 可选 |
| createdAt / expiresAt | 创建与过期 |

定时或读时清理过期项。不落业务表亦可（进程重启则全失效，可接受）。

## 6. 前端

### 6.1 MiniPreviewDialog

- 增加「手机扫码预览」按钮。
- 点击：取当前预览用 DSL → 调创建接口 → 展示二维码弹层（可用轻量 `qrcode` 库或后端返回 dataURL；推荐前端库）。
- `before-close` / `onUnmounted`：若有活跃 token 则 DELETE。
- `visibilitychange` / `beforeunload`：尽力作废（不保证；依赖 TTL）。

### 6.2 新路由 `/h5/draft-preview`

- 加入路由白名单（与 `/h5/preview` 同级）。
- 用 token 拉 DSL，复用 `PreviewPhone` + `ComponentItem` + `hydratePreviewDsl`。
- 失效态：明确文案「预览已关闭或过期，请回电脑端重新生成」。

### 6.3 链接与提示

- 二维码内容：`window.location.origin + previewPath`。
- hostname 为本机时：Alert 提示「手机需能访问该地址（同 WiFi 局域网 IP，或部署到公网）」。

## 7. 安全

- 创建/删除需后台 JWT。
- token 不可猜测；GET 仅返回该快照，无写操作。
- DSL 可能含运营未发布文案：链接短时有效 + 关窗作废降低泄露面。
- 限制 DSL 体积（如 ≤ 1～2MB）防滥用。

## 8. 验收

1. 未保存改动出现在手机 H5 预览中。
2. 关预览弹窗后，手机刷新失效。
3. 再次打开预览并点扫码，生成新码可用。
4. 本机打开时有访问提示；公网 origin 扫码可打开。
5. 超过 2 小时未关窗，链接亦失效。

## 9. 非目标

- 不替代微信开发者工具真机调试。
- 不做编辑中 WebSocket 实时同步。
- 不生成小程序码（仅 H5）。
