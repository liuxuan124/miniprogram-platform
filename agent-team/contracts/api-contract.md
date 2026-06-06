# API 接口规范初稿

> 任务编号：TASK-BE-002
> 所属阶段：02-foundation-contracts
> 输出状态：初稿，待总控冻结

---

## 1. 总则

### 1.1 基础约定

| 项目 | 约定 |
| --- | --- |
| 协议 | HTTPS |
| 传输格式 | JSON（application/json） |
| 字符编码 | UTF-8 |
| 时间格式 | ISO 8601：`yyyy-MM-dd'T'HH:mm:ssXXX`，如 `2026-05-11T14:30:00+08:00` |
| 金额格式 | 字符串，单位元，保留两位小数，如 `"99.00"` |
| 分页参数 | `page`（从 1 开始）、`page_size`（默认 20，最大 100） |
| ID 格式 | BIGINT，传输时使用字符串避免精度丢失 |

### 1.2 接口版本

- URL 中携带版本号：`/api/v1/...`
- 当前版本：v1
- 版本升级时保留旧版本至少一个迭代周期

---

## 2. 认证与鉴权

### 2.1 管理后台认证

| 项目 | 说明 |
| --- | --- |
| 认证方式 | JWT Bearer Token |
| 获取方式 | POST /api/v1/auth/login |
| 请求头 | `Authorization: Bearer <token>` |
| Token 有效期 | Access Token 2 小时，Refresh Token 7 天 |
| 刷新方式 | POST /api/v1/auth/refresh |

### 2.2 小程序端认证

| 项目 | 说明 |
| --- | --- |
| 认证方式 | 微信登录 + JWT |
| 获取方式 | POST /api/v1/mp/auth/login（传入 code） |
| 请求头 | `Authorization: Bearer <token>` |
| Token 有效期 | Access Token 2 小时，Refresh Token 30 天 |

### 2.3 权限校验

- 管理后台接口按角色+权限点校验
- 小程序端接口校验用户身份，部分接口需登录后访问
- 权限不足返回 `403 FORBIDDEN`

---

## 3. 请求格式

### 3.1 通用请求头

| Header | 必填 | 说明 |
| --- | --- | --- |
| Authorization | 是（需认证接口） | Bearer Token |
| Content-Type | 是 | application/json |
| X-Request-Id | 否 | 请求追踪 ID，建议客户端生成 |
| X-Idempotency-Key | 否 | 幂等键（写操作建议携带） |

### 3.2 查询参数约定

| 参数 | 说明 |
| --- | --- |
| page | 页码，从 1 开始 |
| page_size | 每页数量，默认 20，最大 100 |
| keyword | 搜索关键词 |
| status | 状态筛选 |
| sort_by | 排序字段 |
| sort_order | 排序方向：asc / desc |
| start_date / end_date | 日期范围筛选 |

---

## 4. 响应格式

### 4.1 统一响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "request_id": "req_abc123"
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | Integer | 业务状态码，0=成功 |
| message | String | 提示信息 |
| data | Object/Array/null | 业务数据 |
| request_id | String | 请求追踪 ID |

### 4.2 分页响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  },
  "request_id": "req_abc123"
}
```

### 4.3 列表项通用字段

每个列表项应包含以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | String | 记录 ID |
| created_at | String | 创建时间 |
| updated_at | String | 更新时间 |

---

## 5. 错误码规则

### 5.1 HTTP 状态码

| 状态码 | 含义 |
| --- | --- |
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无返回体） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如重复创建） |
| 422 | 业务校验失败 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

### 5.2 业务状态码

业务状态码 `code` 采用 6 位编码：`模块(2位) + 类型(2位) + 序号(2位)`

| 模块编码 | 模块 |
| --- | --- |
| 10 | 通用 |
| 11 | 认证 |
| 20 | 用户与权限 |
| 21 | 会员与营销 |
| 30 | 页面搭建 |
| 40 | 内容 |
| 50 | 商品与订单 |
| 51 | 支付与退款 |
| 60 | 表单 |
| 70 | 活动 |
| 80 | 预约 |
| 90 | AI Agent |
| 91 | 素材 |
| 92 | 系统配置 |

| 类型编码 | 类型 |
| --- | --- |
| 01 | 参数错误 |
| 02 | 状态错误 |
| 03 | 权限错误 |
| 04 | 不存在 |
| 05 | 冲突/重复 |
| 06 | 业务规则限制 |
| 07 | 外部服务错误 |

**通用错误码**：

| code | HTTP | message | 说明 |
| --- | --- | --- | --- |
| 0 | 200 | success | 成功 |
| 100101 | 400 | 参数校验失败 | 请求参数不合法 |
| 100102 | 400 | 请求格式错误 | JSON 解析失败 |
| 100201 | 429 | 请求过于频繁 | 触发限流 |
| 110101 | 401 | 未登录 | Token 缺失或无效 |
| 110102 | 401 | Token 已过期 | 需要刷新 |
| 110103 | 403 | 账号已禁用 | 账号被禁用 |
| 110201 | 401 | 微信登录失败 | code 无效或过期 |
| 200301 | 403 | 无操作权限 | 权限不足 |
| 200401 | 404 | 管理员不存在 | — |
| 200501 | 409 | 用户名已存在 | — |

**业务错误码示例**：

| code | HTTP | message | 说明 |
| --- | --- | --- | --- |
| 500201 | 422 | 订单状态不允许此操作 | 订单状态流转错误 |
| 500601 | 422 | 库存不足 | SKU 库存不够 |
| 510701 | 500 | 微信支付下单失败 | 支付接口异常 |
| 510702 | 500 | 支付回调验签失败 | 签名校验不通过 |
| 300201 | 422 | 页面已发布不可删除 | 需先下架 |
| 900701 | 500 | AI 模型调用失败 | 模型接口异常 |

---

## 6. 接口命名规则

### 6.1 URL 规则

```
/api/v1/{module}/{resource}[/{id}][/{sub-resource}]
```

| 规则 | 示例 |
| --- | --- |
| 模块前缀 | /api/v1/admin/...（后台）、/api/v1/mp/...（小程序端） |
| 资源名用复数 | /api/v1/admin/pages、/api/v1/admin/products |
| 嵌套资源 | /api/v1/admin/pages/{id}/versions |
| 操作动词 | /api/v1/admin/pages/{id}/publish、/api/v1/admin/orders/{id}/ship |

### 6.2 HTTP 方法映射

| 方法 | 用途 | 示例 |
| --- | --- | --- |
| GET | 查询 | GET /api/v1/admin/pages |
| POST | 创建 | POST /api/v1/admin/pages |
| PUT | 全量更新 | PUT /api/v1/admin/pages/{id} |
| PATCH | 部分更新 | PATCH /api/v1/admin/pages/{id} |
| DELETE | 删除 | DELETE /api/v1/admin/pages/{id} |

### 6.3 特殊操作

| 操作 | URL 模式 | 方法 |
| --- | --- | --- |
| 发布 | /{resource}/{id}/publish | POST |
| 下架 | /{resource}/{id}/unpublish | POST |
| 审核 | /{resource}/{id}/audit | POST |
| 核销 | /{resource}/{id}/checkin | POST |
| 排序 | /{resource}/sort | POST |
| 批量操作 | /{resource}/batch | POST |
| 导出 | /{resource}/export | POST |

---

## 7. 接口清单

### 7.1 认证模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | /api/v1/admin/auth/login | 管理员登录 | 公开 |
| POST | /api/v1/admin/auth/refresh | 刷新 Token | 登录 |
| POST | /api/v1/admin/auth/logout | 退出登录 | 登录 |
| GET | /api/v1/admin/auth/profile | 获取当前用户信息 | 登录 |
| PUT | /api/v1/admin/auth/password | 修改密码 | 登录 |
| POST | /api/v1/mp/auth/login | 小程序微信登录 | 公开 |
| POST | /api/v1/mp/auth/phone | 小程序获取手机号 | 登录 |

### 7.2 用户与权限模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/admin-users | 管理员列表 | super_admin |
| POST | /api/v1/admin/admin-users | 创建管理员 | super_admin |
| PUT | /api/v1/admin/admin-users/{id} | 更新管理员 | super_admin |
| DELETE | /api/v1/admin/admin-users/{id} | 删除管理员 | super_admin |
| GET | /api/v1/admin/roles | 角色列表 | super_admin |
| POST | /api/v1/admin/roles | 创建角色 | super_admin |
| PUT | /api/v1/admin/roles/{id} | 更新角色 | super_admin |
| PUT | /api/v1/admin/roles/{id}/permissions | 设置角色权限 | super_admin |
| GET | /api/v1/admin/permissions | 权限树 | super_admin |
| GET | /api/v1/admin/users | 小程序用户列表 | 登录 |
| GET | /api/v1/admin/users/{id} | 用户详情 | 登录 |
| POST | /api/v1/admin/users/export | 导出用户 | 登录 |

### 7.3 会员与营销模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/members | 会员列表 | 登录 |
| GET | /api/v1/admin/members/{id} | 会员详情 | 登录 |
| PUT | /api/v1/admin/members/{id}/tags | 更新会员标签 | 登录 |
| GET | /api/v1/admin/member-level-rules | 等级规则列表 | 登录 |
| PUT | /api/v1/admin/member-level-rules/{id} | 更新等级规则 | super_admin |
| GET | /api/v1/admin/coupons | 优惠券列表 | 登录 |
| POST | /api/v1/admin/coupons | 创建优惠券 | biz_ops+ |
| PUT | /api/v1/admin/coupons/{id} | 更新优惠券 | biz_ops+ |
| PATCH | /api/v1/admin/coupons/{id}/status | 启停优惠券 | biz_ops+ |
| GET | /api/v1/mp/members/me | 我的会员信息 | 小程序登录 |
| GET | /api/v1/mp/coupons | 可领优惠券列表 | 小程序登录 |
| POST | /api/v1/mp/coupons/{id}/claim | 领取优惠券 | 小程序登录 |
| GET | /api/v1/mp/coupons/mine | 我的优惠券 | 小程序登录 |

### 7.4 页面搭建模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/pages | 页面列表 | 登录 |
| POST | /api/v1/admin/pages | 创建页面 | content_ops+ |
| GET | /api/v1/admin/pages/{id} | 页面详情 | 登录 |
| PUT | /api/v1/admin/pages/{id} | 更新页面信息 | content_ops+ |
| DELETE | /api/v1/admin/pages/{id} | 删除页面 | content_ops+ |
| POST | /api/v1/admin/pages/{id}/draft | 保存草稿 | content_ops+ |
| POST | /api/v1/admin/pages/{id}/publish | 发布页面 | content_ops+ |
| POST | /api/v1/admin/pages/{id}/unpublish | 下架页面 | content_ops+ |
| GET | /api/v1/admin/pages/{id}/versions | 版本列表 | 登录 |
| POST | /api/v1/admin/pages/{id}/versions/{version}/rollback | 版本回滚 | content_ops+ |
| GET | /api/v1/admin/page-templates | 页面模板列表 | 登录 |
| GET | /api/v1/mp/pages/{path} | 小程序获取页面配置 | 公开 |

### 7.5 内容模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/contents | 内容列表 | 登录 |
| POST | /api/v1/admin/contents | 创建内容 | content_ops+ |
| GET | /api/v1/admin/contents/{id} | 内容详情 | 登录 |
| PUT | /api/v1/admin/contents/{id} | 更新内容 | content_ops+ |
| DELETE | /api/v1/admin/contents/{id} | 删除内容 | content_ops+ |
| PATCH | /api/v1/admin/contents/{id}/status | 上下架 | content_ops+ |
| PATCH | /api/v1/admin/contents/{id}/recommend | 设置推荐 | content_ops+ |
| GET | /api/v1/admin/content-categories | 分类列表 | 登录 |
| POST | /api/v1/admin/content-categories | 创建分类 | content_ops+ |
| PUT | /api/v1/admin/content-categories/{id} | 更新分类 | content_ops+ |
| DELETE | /api/v1/admin/content-categories/{id} | 删除分类 | content_ops+ |
| GET | /api/v1/mp/contents | 小程序内容列表 | 公开 |
| GET | /api/v1/mp/contents/{id} | 小程序内容详情 | 公开 |
| GET | /api/v1/mp/content-categories | 小程序分类列表 | 公开 |

### 7.6 商品与订单模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/products | 商品列表 | 登录 |
| POST | /api/v1/admin/products | 创建商品 | biz_ops+ |
| GET | /api/v1/admin/products/{id} | 商品详情 | 登录 |
| PUT | /api/v1/admin/products/{id} | 更新商品 | biz_ops+ |
| DELETE | /api/v1/admin/products/{id} | 删除商品 | biz_ops+ |
| PATCH | /api/v1/admin/products/{id}/status | 上下架 | biz_ops+ |
| GET | /api/v1/admin/product-categories | 商品分类列表 | 登录 |
| POST | /api/v1/admin/product-categories | 创建商品分类 | biz_ops+ |
| PUT | /api/v1/admin/product-categories/{id} | 更新商品分类 | biz_ops+ |
| GET | /api/v1/admin/orders | 订单列表 | 登录 |
| GET | /api/v1/admin/orders/{id} | 订单详情 | 登录 |
| POST | /api/v1/admin/orders/{id}/ship | 发货 | biz_ops+ |
| POST | /api/v1/admin/orders/{id}/verify | 核销 | biz_ops+ |
| POST | /api/v1/admin/orders/{id}/confirm-service | 服务确认 | service_staff+ |
| POST | /api/v1/admin/refunds/{id}/audit | 退款审核 | biz_ops+ |
| POST | /api/v1/admin/orders/export | 导出订单 | biz_ops+ |
| GET | /api/v1/mp/products | 小程序商品列表 | 公开 |
| GET | /api/v1/mp/products/{id} | 小程序商品详情 | 公开 |
| GET | /api/v1/mp/cart | 购物车 | 小程序登录 |
| POST | /api/v1/mp/cart/items | 添加购物车 | 小程序登录 |
| PUT | /api/v1/mp/cart/items/{id} | 更新购物车项 | 小程序登录 |
| DELETE | /api/v1/mp/cart/items/{id} | 删除购物车项 | 小程序登录 |
| POST | /api/v1/mp/orders | 创建订单 | 小程序登录 |
| GET | /api/v1/mp/orders | 我的订单列表 | 小程序登录 |
| GET | /api/v1/mp/orders/{id} | 订单详情 | 小程序登录 |
| POST | /api/v1/mp/orders/{id}/pay | 发起支付 | 小程序登录 |
| POST | /api/v1/mp/orders/{id}/cancel | 取消订单 | 小程序登录 |
| POST | /api/v1/mp/orders/{id}/refund | 申请退款 | 小程序登录 |

### 7.7 支付回调（内部接口）

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | /api/v1/payment/wechat/notify | 微信支付回调 | 微信签名验证 |
| POST | /api/v1/payment/wechat/refund-notify | 微信退款回调 | 微信签名验证 |

### 7.8 表单模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/forms | 表单列表 | 登录 |
| POST | /api/v1/admin/forms | 创建表单 | content_ops+ |
| GET | /api/v1/admin/forms/{id} | 表单详情 | 登录 |
| PUT | /api/v1/admin/forms/{id} | 更新表单 | content_ops+ |
| PATCH | /api/v1/admin/forms/{id}/status | 启停表单 | content_ops+ |
| GET | /api/v1/admin/forms/{id}/submissions | 提交记录列表 | 登录 |
| POST | /api/v1/admin/forms/{id}/submissions/{sid}/audit | 审核提交 | content_ops+ |
| POST | /api/v1/mp/forms/{id}/submit | 小程序提交表单 | 小程序登录 |

### 7.9 活动模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/activities | 活动列表 | 登录 |
| POST | /api/v1/admin/activities | 创建活动 | content_ops+ |
| GET | /api/v1/admin/activities/{id} | 活动详情 | 登录 |
| PUT | /api/v1/admin/activities/{id} | 更新活动 | content_ops+ |
| DELETE | /api/v1/admin/activities/{id} | 删除活动 | content_ops+ |
| GET | /api/v1/admin/activities/{id}/registrations | 报名列表 | 登录 |
| POST | /api/v1/admin/activities/{id}/registrations/{rid}/audit | 审核报名 | content_ops+ |
| POST | /api/v1/admin/activities/{id}/registrations/{rid}/checkin | 核销 | service_staff+ |
| GET | /api/v1/mp/activities | 小程序活动列表 | 公开 |
| GET | /api/v1/mp/activities/{id} | 小程序活动详情 | 公开 |
| POST | /api/v1/mp/activities/{id}/register | 小程序报名 | 小程序登录 |

### 7.10 预约模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/service-items | 服务项目列表 | 登录 |
| POST | /api/v1/admin/service-items | 创建服务项目 | service_staff+ |
| PUT | /api/v1/admin/service-items/{id} | 更新服务项目 | service_staff+ |
| GET | /api/v1/admin/booking-slots | 时间段列表 | 登录 |
| POST | /api/v1/admin/booking-slots/batch | 批量创建时间段 | service_staff+ |
| PUT | /api/v1/admin/booking-slots/{id} | 更新时间段 | service_staff+ |
| GET | /api/v1/admin/bookings | 预约记录列表 | 登录 |
| POST | /api/v1/admin/bookings/{id}/confirm | 确认预约 | service_staff+ |
| POST | /api/v1/admin/bookings/{id}/cancel | 取消预约 | service_staff+ |
| GET | /api/v1/mp/service-items | 小程序服务项目列表 | 公开 |
| GET | /api/v1/mp/service-items/{id}/slots | 小程序可用时间段 | 公开 |
| POST | /api/v1/mp/bookings | 小程序提交预约 | 小程序登录 |
| GET | /api/v1/mp/bookings | 我的预约列表 | 小程序登录 |

### 7.11 AI Agent 模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/ai/agents | Agent 列表 | 登录 |
| POST | /api/v1/admin/ai/agents | 创建 Agent | super_admin |
| GET | /api/v1/admin/ai/agents/{id} | Agent 详情 | 登录 |
| PUT | /api/v1/admin/ai/agents/{id} | 更新 Agent 配置 | super_admin |
| POST | /api/v1/admin/ai/agents/{id}/test-connection | 连接测试 | super_admin |
| GET | /api/v1/admin/ai/agents/{id}/versions | 版本列表 | 登录 |
| POST | /api/v1/admin/ai/agents/{id}/versions | 创建版本 | super_admin |
| PUT | /api/v1/admin/ai/agents/{id}/versions/{version} | 更新版本 | super_admin |
| POST | /api/v1/admin/ai/agents/{id}/versions/{version}/publish | 发布版本 | super_admin |
| POST | /api/v1/admin/ai/agents/{id}/versions/{version}/rollback | 回滚版本 | super_admin |
| POST | /api/v1/admin/ai/agents/{id}/sandbox | 沙盒测试 | 登录 |
| GET | /api/v1/admin/ai/agents/{id}/knowledge-bases | 知识库列表 | 登录 |
| POST | /api/v1/admin/ai/agents/{id}/knowledge-bases | 上传知识库 | super_admin |
| PATCH | /api/v1/admin/ai/knowledge-bases/{id}/recall-weight | 更新召回权重 | super_admin |
| POST | /api/v1/admin/ai/knowledge-bases/{id}/recall-test | 召回测试 | 登录 |
| GET | /api/v1/admin/ai/agents/{id}/monitor | 运营监控数据 | 登录 |
| GET | /api/v1/admin/ai/agents/{id}/conversations | 对话记录列表 | 登录 |
| POST | /api/v1/mp/ai/chat | 小程序 AI 对话 | 小程序登录 |
| GET | /api/v1/mp/ai/sessions | 我的对话会话列表 | 小程序登录 |
| GET | /api/v1/mp/ai/sessions/{id}/messages | 会话消息列表 | 小程序登录 |
| POST | /api/v1/mp/ai/feedback | 对话反馈 | 小程序登录 |

### 7.12 素材模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/assets | 素材列表 | 登录 |
| POST | /api/v1/admin/assets/upload | 上传素材 | 登录 |
| GET | /api/v1/admin/assets/{id} | 素材详情 | 登录 |
| DELETE | /api/v1/admin/assets/{id} | 删除素材 | 登录 |

### 7.13 系统配置模块

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/configs | 配置列表（按分组） | super_admin |
| PUT | /api/v1/admin/configs/{key} | 更新配置 | super_admin |
| POST | /api/v1/admin/configs/payment/test | 支付参数测试 | super_admin |
| GET | /api/v1/admin/configs/navigation | 导航配置 | 登录 |
| PUT | /api/v1/admin/configs/navigation | 更新导航配置 | super_admin |
| GET | /api/v1/admin/configs/plugins | 插件列表 | super_admin |
| PATCH | /api/v1/admin/configs/plugins/{code}/toggle | 插件启停 | super_admin |
| GET | /api/v1/admin/operation-logs | 操作日志列表 | super_admin |
| GET | /api/v1/admin/data-dicts | 数据字典列表 | 登录 |

### 7.14 工作台与数据看板

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | /api/v1/admin/dashboard/overview | 工作台概览指标 | 登录 |
| GET | /api/v1/admin/dashboard/trends | 访问趋势 | 登录 |
| GET | /api/v1/admin/dashboard/todos | 待办事项 | 登录 |
| GET | /api/v1/admin/dashboard/rankings | 排行榜 | 登录 |

---

## 8. 接口安全规则

| 规则 | 说明 |
| --- | --- |
| HTTPS 强制 | 所有接口必须走 HTTPS |
| Token 校验 | 需认证接口必须校验 Bearer Token |
| 权限校验 | 管理后台接口按角色+权限点校验 |
| 参数校验 | 所有入参必须服务端校验 |
| SQL 注入防护 | 使用参数化查询，禁止拼接 SQL |
| XSS 防护 | 富文本内容入库前过滤，输出时转义 |
| CSRF 防护 | 管理后台使用 SameSite Cookie + Token 双重校验 |
| 限流 | 按接口配置限流，默认 100 次/分钟/IP |
| 幂等 | 支付、退款、发布等写操作支持幂等键 |
| 敏感信息 | AppSecret、API Key、支付密钥等脱敏展示，加密存储 |
| 操作日志 | 关键操作（发布、删除、退款、权限变更）必须记录操作日志 |

---

## 9. 接口变更规则

1. 接口字段新增：向后兼容，无需变更版本号
2. 接口字段删除或修改：需通过新版本号发布，保留旧版本
3. 错误码新增：向后兼容，通知各 Agent
4. 错误码删除或修改：需通过契约变更请求
5. 任何接口变更必须通过任务回执提交契约变更请求，由总控确认后再更新
