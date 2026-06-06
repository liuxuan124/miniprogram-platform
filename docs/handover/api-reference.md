# API接口文档

## 基础信息

- 管理端基础路径: `/api/admin`
- 小程序端基础路径: `/api/mp`
- 认证方式: Bearer Token (Authorization: Bearer \<jwt\>)
- 响应格式: `R<T>` — `{ code: 200, message: "success", data: T }`
- 分页格式: `PageResult<T>` — `{ list: T[], total: number, page: number, pageSize: number }`

---

## 1. 认证模块 (Auth)

### 管理端

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/admin/auth/login | 管理员登录 | 否 |
| GET | /api/admin/auth/info | 获取当前用户信息 | 是 |
| POST | /api/admin/auth/logout | 退出登录 | 是 |

### 小程序端

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/mp/auth/login | 微信登录(code换token) | 否 |
| GET | /api/mp/auth/info | 获取用户信息 | 是 |
| POST | /api/mp/auth/phone | 绑定手机号 | 是 |

---

## 2. 页面搭建模块 (Page Builder)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/page/list | 页面列表(分页) | 是 |
| POST | /api/admin/page | 创建页面 | 是 |
| PUT | /api/admin/page/{id} | 更新页面 | 是 |
| DELETE | /api/admin/page/{id} | 删除页面 | 是 |
| POST | /api/admin/page/{id}/publish | 发布页面 | 是 |
| GET | /api/admin/page/{id}/versions | 版本列表 | 是 |
| POST | /api/admin/page/{id}/rollback | 回滚版本 | 是 |
| GET | /api/admin/page/template/list | 模板列表 | 是 |
| POST | /api/admin/page/template | 创建模板 | 是 |
| GET | /api/mp/page/{id} | 小程序获取页面DSL | 否 |
| GET | /api/mp/page/home | 小程序首页DSL | 否 |

---

## 3. 内容管理模块 (Content)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/content/article/list | 文章列表 | 是 |
| POST | /api/admin/content/article | 创建文章 | 是 |
| PUT | /api/admin/content/article/{id} | 更新文章 | 是 |
| DELETE | /api/admin/content/article/{id} | 删除文章 | 是 |
| GET | /api/admin/content/category/list | 分类列表 | 是 |
| POST | /api/admin/content/category | 创建分类 | 是 |
| PUT | /api/admin/content/category/{id} | 更新分类 | 是 |
| DELETE | /api/admin/content/category/{id} | 删除分类 | 是 |
| GET | /api/mp/content/article/list | 小程序文章列表 | 否 |
| GET | /api/mp/content/article/{id} | 小程序文章详情 | 否 |
| GET | /api/mp/content/category/list | 小程序分类列表 | 否 |

---

## 4. 商品订单模块 (Product & Order)

### 商品

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/product/list | 商品列表 | 是 |
| POST | /api/admin/product | 创建商品 | 是 |
| PUT | /api/admin/product/{id} | 更新商品 | 是 |
| DELETE | /api/admin/product/{id} | 删除商品 | 是 |
| GET | /api/admin/product/category/list | 商品分类列表 | 是 |
| POST | /api/admin/product/category | 创建商品分类 | 是 |
| GET | /api/mp/product/list | 小程序商品列表 | 否 |
| GET | /api/mp/product/{id} | 小程序商品详情 | 否 |

### 购物车

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/mp/cart/list | 购物车列表 | 是 |
| POST | /api/mp/cart/add | 加入购物车 | 是 |
| PUT | /api/mp/cart/{id} | 更新数量 | 是 |
| DELETE | /api/mp/cart/{id} | 删除购物车项 | 是 |

### 订单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/order/list | 订单列表 | 是 |
| GET | /api/admin/order/{id} | 订单详情 | 是 |
| PUT | /api/admin/order/{id}/status | 更新订单状态 | 是 |
| POST | /api/mp/order/create | 创建订单 | 是 |
| GET | /api/mp/order/list | 我的订单 | 是 |
| GET | /api/mp/order/{id} | 订单详情 | 是 |
| POST | /api/mp/order/{id}/cancel | 取消订单 | 是 |
| POST | /api/mp/order/{id}/pay | 发起支付 | 是 |
| POST | /api/mp/order/pay/callback | 支付回调 | 否 |

---

## 5. 会员营销模块 (Member & Marketing)

### 会员

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/member/list | 会员列表 | 是 |
| GET | /api/admin/member/{id} | 会员详情 | 是 |
| PUT | /api/admin/member/{id} | 更新会员 | 是 |
| GET | /api/admin/member/level/list | 等级列表 | 是 |
| POST | /api/admin/member/level | 创建等级 | 是 |
| GET | /api/mp/member/info | 我的会员信息 | 是 |
| POST | /api/mp/member/sign-in | 签到 | 是 |
| GET | /api/mp/member/points-log | 积分明细 | 是 |

### 优惠券

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/coupon/list | 优惠券列表 | 是 |
| POST | /api/admin/coupon | 创建优惠券 | 是 |
| PUT | /api/admin/coupon/{id} | 更新优惠券 | 是 |
| DELETE | /api/admin/coupon/{id} | 删除优惠券 | 是 |
| GET | /api/mp/coupon/list | 可领优惠券 | 是 |
| POST | /api/mp/coupon/{id}/claim | 领取优惠券 | 是 |
| GET | /api/mp/coupon/my | 我的优惠券 | 是 |

---

## 6. 表单预约模块 (Form & Appointment)

### 表单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/form/template/list | 表单模板列表 | 是 |
| POST | /api/admin/form/template | 创建模板 | 是 |
| PUT | /api/admin/form/template/{id} | 更新模板 | 是 |
| GET | /api/admin/form/submission/list | 提交记录列表 | 是 |
| GET | /api/admin/form/submission/{id} | 提交详情 | 是 |
| POST | /api/mp/form/{id}/submit | 小程序提交表单 | 是 |

### 预约

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/appointment/service/list | 预约服务列表 | 是 |
| POST | /api/admin/appointment/service | 创建服务 | 是 |
| GET | /api/admin/appointment/slot/list | 时段列表 | 是 |
| POST | /api/admin/appointment/slot | 创建时段 | 是 |
| GET | /api/admin/appointment/list | 预约列表 | 是 |
| PUT | /api/admin/appointment/{id}/status | 更新预约状态 | 是 |
| GET | /api/mp/appointment/service/list | 可预约服务 | 是 |
| GET | /api/mp/appointment/slot/list | 可用时段 | 是 |
| POST | /api/mp/appointment/book | 创建预约 | 是 |
| GET | /api/mp/appointment/my | 我的预约 | 是 |
| POST | /api/mp/appointment/{id}/cancel | 取消预约 | 是 |

---

## 7. AI模块

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/ai/conversation/list | 对话记录列表 | 是 |
| GET | /api/admin/ai/conversation/{id} | 对话详情 | 是 |
| GET | /api/admin/ai/recommendation/list | 推荐日志列表 | 是 |
| GET | /api/admin/ai/stats | AI统计概览 | 是 |
| POST | /api/mp/ai/chat | AI对话 | 是 |
| GET | /api/mp/ai/recommendation | 获取推荐 | 是 |

---

## 8. 统计模块

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/statistics/dashboard | 仪表盘数据 | 是 |
| GET | /api/admin/statistics/sales-trend | 销售趋势 | 是 |
| GET | /api/admin/statistics/product-ranking | 商品排行 | 是 |
| GET | /api/admin/statistics/user-growth | 用户增长 | 是 |
| POST | /api/mp/statistics/page-access | 页面访问上报 | 否 |

---

## 9. 系统设置模块

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/system/config | 获取系统配置 | 是 |
| PUT | /api/admin/system/config | 更新系统配置 | 是 |
| GET | /api/admin/system/operation-log | 操作日志列表 | 是 |
| GET | /api/mp/system/config | 小程序获取配置 | 否 |
