# 数据库设计文档

## 迁移脚本概览

| 版本 | 文件 | 说明 |
|------|------|------|
| V1 | V1__init_user_tables.sql | 用户与认证 |
| V2 | V2__page_builder_tables.sql | 页面搭建 |
| V3 | V3__content_tables.sql | 内容管理 |
| V4 | V4__product_tables.sql | 商品管理 |
| V5 | V5__order_tables.sql | 订单系统 |
| V6 | V6__member_marketing_tables.sql | 会员营销 |
| V7 | V7__form_appointment_tables.sql | 表单预约 |
| V8 | V8__ai_tables.sql | AI模块 |
| V9 | V9__statistics_tables.sql | 统计模块 |
| V10 | V10__system_tables.sql | 系统设置 |

---

## V1: 用户与认证

### mp_user — 系统用户

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| username | VARCHAR(50) | 用户名 |
| password | VARCHAR(100) | 密码(BCrypt) |
| nickname | VARCHAR(50) | 昵称 |
| avatar | VARCHAR(255) | 头像URL |
| phone | VARCHAR(20) | 手机号 |
| email | VARCHAR(100) | 邮箱 |
| role | VARCHAR(20) | 角色(ADMIN/EDITOR) |
| status | TINYINT | 状态(0禁用/1启用) |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### mp_wechat_user — 微信用户

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| open_id | VARCHAR(64) | 微信openId |
| union_id | VARCHAR(64) | 微信unionId |
| nickname | VARCHAR(50) | 昵称 |
| avatar_url | VARCHAR(255) | 头像 |
| phone | VARCHAR(20) | 手机号 |
| gender | TINYINT | 性别 |
| session_key | VARCHAR(100) | 会话密钥 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## V2: 页面搭建

### mp_page — 页面

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| title | VARCHAR(100) | 页面标题 |
| page_key | VARCHAR(50) | 页面唯一标识 |
| status | TINYINT | 状态(0草稿/1已发布) |
| published_version | INT | 已发布版本号 |
| created_by | BIGINT | 创建人 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### mp_page_version — 页面版本

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| page_id | BIGINT FK | 页面ID |
| version | INT | 版本号 |
| dsl_content | JSON | DSL内容 |
| remark | VARCHAR(200) | 版本备注 |
| created_at | DATETIME | 创建时间 |

### mp_page_template — 页面模板

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(100) | 模板名称 |
| category | VARCHAR(50) | 模板分类 |
| thumbnail | VARCHAR(255) | 缩略图 |
| dsl_content | JSON | DSL内容 |
| is_official | TINYINT | 是否官方 |
| use_count | INT | 使用次数 |
| created_at | DATETIME | 创建时间 |

---

## V3: 内容管理

### mp_category — 分类

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(50) | 分类名称 |
| parent_id | BIGINT | 父分类ID |
| sort_order | INT | 排序 |
| icon | VARCHAR(255) | 图标 |
| status | TINYINT | 状态 |
| created_at | DATETIME | 创建时间 |

### mp_article — 文章

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| title | VARCHAR(200) | 标题 |
| summary | VARCHAR(500) | 摘要 |
| content | TEXT | 内容(富文本) |
| cover_image | VARCHAR(255) | 封面图 |
| category_id | BIGINT FK | 分类ID |
| author | VARCHAR(50) | 作者 |
| status | TINYINT | 状态(0草稿/1已发布) |
| view_count | INT | 浏览量 |
| published_at | DATETIME | 发布时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## V4: 商品管理

### mp_product_category — 商品分类

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(50) | 分类名称 |
| parent_id | BIGINT | 父分类 |
| icon | VARCHAR(255) | 图标 |
| sort_order | INT | 排序 |
| status | TINYINT | 状态 |

### mp_product — 商品

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(200) | 商品名称 |
| description | TEXT | 描述 |
| main_image | VARCHAR(255) | 主图 |
| images | JSON | 图片列表 |
| category_id | BIGINT FK | 分类ID |
| price | DECIMAL(10,2) | 价格 |
| original_price | DECIMAL(10,2) | 原价 |
| stock | INT | 库存 |
| sales | INT | 销量 |
| status | TINYINT | 状态(0下架/1上架) |
| sort_order | INT | 排序 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### mp_product_sku — 商品SKU

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| product_id | BIGINT FK | 商品ID |
| sku_name | VARCHAR(100) | SKU名称 |
| attributes | JSON | 属性键值对 |
| price | DECIMAL(10,2) | 价格 |
| stock | INT | 库存 |
| sku_code | VARCHAR(50) | SKU编码 |

---

## V5: 订单系统

### mp_order — 订单

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| order_no | VARCHAR(32) | 订单号 |
| user_id | BIGINT FK | 用户ID |
| total_amount | DECIMAL(10,2) | 总金额 |
| pay_amount | DECIMAL(10,2) | 实付金额 |
| discount_amount | DECIMAL(10,2) | 优惠金额 |
| status | TINYINT | 状态(0待付/1已付/2已发/3完成/4取消/5退款) |
| pay_time | DATETIME | 支付时间 |
| pay_transaction_id | VARCHAR(64) | 微信支付流水号 |
| receiver_name | VARCHAR(50) | 收货人 |
| receiver_phone | VARCHAR(20) | 收货电话 |
| receiver_address | VARCHAR(255) | 收货地址 |
| remark | VARCHAR(200) | 订单备注 |
| cancel_reason | VARCHAR(200) | 取消原因 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### mp_order_item — 订单项

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| order_id | BIGINT FK | 订单ID |
| product_id | BIGINT FK | 商品ID |
| sku_id | BIGINT | SKU ID |
| product_name | VARCHAR(200) | 商品名称 |
| product_image | VARCHAR(255) | 商品图片 |
| sku_name | VARCHAR(100) | SKU名称 |
| price | DECIMAL(10,2) | 单价 |
| quantity | INT | 数量 |
| subtotal | DECIMAL(10,2) | 小计 |

---

## V6: 会员营销

### mp_member — 会员

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| user_id | BIGINT FK | 关联用户 |
| level_id | BIGINT FK | 等级ID |
| points | INT | 当前积分 |
| total_points | INT | 累计积分 |
| sign_in_days | INT | 连续签到天数 |
| last_sign_in | DATE | 最后签到日期 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### mp_member_level — 会员等级

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(50) | 等级名称 |
| min_points | INT | 所需最低积分 |
| discount | DECIMAL(3,2) | 折扣率 |
| icon | VARCHAR(255) | 等级图标 |
| benefits | JSON | 权益说明 |
| sort_order | INT | 排序 |

### mp_points_log — 积分记录

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| member_id | BIGINT FK | 会员ID |
| type | TINYINT | 类型(1获取/2消耗) |
| points | INT | 积分变动 |
| balance | INT | 变动后余额 |
| source | VARCHAR(50) | 来源(SIGN_IN/ORDER/COUPON等) |
| description | VARCHAR(200) | 说明 |
| created_at | DATETIME | 创建时间 |

### mp_coupon — 优惠券

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(100) | 优惠券名称 |
| type | TINYINT | 类型(1满减/2折扣/3固定) |
| value | DECIMAL(10,2) | 面值/折扣 |
| min_amount | DECIMAL(10,2) | 最低消费 |
| total_count | INT | 发放总量 |
| remain_count | INT | 剩余数量 |
| per_limit | INT | 每人限领 |
| start_time | DATETIME | 开始时间 |
| end_time | DATETIME | 结束时间 |
| status | TINYINT | 状态 |
| created_at | DATETIME | 创建时间 |

### mp_user_coupon — 用户优惠券

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| user_id | BIGINT FK | 用户ID |
| coupon_id | BIGINT FK | 优惠券ID |
| status | TINYINT | 状态(0未用/1已用/2过期) |
| used_at | DATETIME | 使用时间 |
| order_id | BIGINT | 关联订单 |
| created_at | DATETIME | 领取时间 |

---

## V7: 表单预约

### mp_form_template — 表单模板

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(100) | 模板名称 |
| description | VARCHAR(500) | 说明 |
| fields | JSON | 字段定义 |
| status | TINYINT | 状态 |
| submit_count | INT | 提交次数 |
| created_at | DATETIME | 创建时间 |

### mp_form_submission — 表单提交

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| template_id | BIGINT FK | 模板ID |
| user_id | BIGINT FK | 用户ID |
| data | JSON | 提交数据 |
| created_at | DATETIME | 提交时间 |

### mp_appointment_service — 预约服务

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| name | VARCHAR(100) | 服务名称 |
| description | TEXT | 说明 |
| duration | INT | 时长(分钟) |
| price | DECIMAL(10,2) | 价格 |
| image | VARCHAR(255) | 图片 |
| status | TINYINT | 状态 |
| sort_order | INT | 排序 |

### mp_appointment_slot — 预约时段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| service_id | BIGINT FK | 服务ID |
| date | DATE | 日期 |
| start_time | TIME | 开始时间 |
| end_time | TIME | 结束时间 |
| max_capacity | INT | 最大容量 |
| booked_count | INT | 已预约数 |
| status | TINYINT | 状态 |

### mp_appointment — 预约记录

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| user_id | BIGINT FK | 用户ID |
| service_id | BIGINT FK | 服务ID |
| slot_id | BIGINT FK | 时段ID |
| status | TINYINT | 状态(0待确认/1已确认/2已完成/3已取消) |
| contact_name | VARCHAR(50) | 联系人 |
| contact_phone | VARCHAR(20) | 联系电话 |
| remark | VARCHAR(200) | 备注 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

## V8: AI模块

### mp_ai_conversation — AI对话

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| user_id | BIGINT FK | 用户ID |
| title | VARCHAR(200) | 对话标题 |
| status | TINYINT | 状态(0进行中/1已结束) |
| message_count | INT | 消息数 |
| total_tokens | INT | 消耗tokens |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### mp_ai_message — AI消息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| conversation_id | BIGINT FK | 对话ID |
| role | VARCHAR(20) | 角色(user/assistant) |
| content | TEXT | 消息内容 |
| tokens | INT | 消耗tokens |
| created_at | DATETIME | 创建时间 |

### mp_ai_recommendation_log — 推荐日志

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| user_id | BIGINT FK | 用户ID |
| type | VARCHAR(50) | 推荐类型 |
| input | TEXT | 输入 |
| result | TEXT | 推荐结果 |
| is_adopted | TINYINT | 是否采纳 |
| tokens | INT | 消耗tokens |
| created_at | DATETIME | 创建时间 |

---

## V9: 统计模块

### mp_statistics_daily — 日统计

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| stat_date | DATE | 统计日期 |
| new_users | INT | 新增用户 |
| active_users | INT | 活跃用户 |
| total_users | INT | 累计用户 |
| new_orders | INT | 新增订单 |
| order_amount | DECIMAL(12,2) | 订单金额 |
| page_views | INT | 页面浏览量 |
| unique_visitors | INT | 独立访客 |
| created_at | DATETIME | 创建时间 |

### mp_page_access_log — 页面访问日志

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| user_id | BIGINT | 用户ID |
| page_key | VARCHAR(50) | 页面标识 |
| page_name | VARCHAR(100) | 页面名称 |
| access_time | DATETIME | 访问时间 |
| duration | INT | 停留时长(秒) |
| source | VARCHAR(50) | 来源 |
| user_agent | VARCHAR(255) | 用户代理 |
| ip | VARCHAR(50) | IP地址 |

---

## V10: 系统设置

### mp_system_config — 系统配置

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| config_key | VARCHAR(100) | 配置键 |
| config_value | TEXT | 配置值 |
| config_group | VARCHAR(50) | 配置组(basic/wx/storage) |
| description | VARCHAR(200) | 说明 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### mp_operation_log — 操作日志

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| user_id | BIGINT | 操作人ID |
| username | VARCHAR(50) | 操作人用户名 |
| operation | VARCHAR(50) | 操作类型 |
| method | VARCHAR(200) | 请求方法 |
| params | TEXT | 请求参数 |
| ip | VARCHAR(50) | IP地址 |
| duration | BIGINT | 耗时(ms) |
| status | TINYINT | 状态(0成功/1失败) |
| error_msg | TEXT | 错误信息 |
| created_at | DATETIME | 创建时间 |

---

## 核心关系

```
mp_user ──1:N── mp_wechat_user
  │
  ├──1:1── mp_member ──N:1── mp_member_level
  │           │
  │           ├──1:N── mp_points_log
  │           └──1:N── mp_user_coupon ──N:1── mp_coupon
  │
  ├──1:N── mp_order ──1:N── mp_order_item ──N:1── mp_product
  │
  ├──1:N── mp_form_submission ──N:1── mp_form_template
  │
  ├──1:N── mp_appointment ──N:1── mp_appointment_service
  │                         └──N:1── mp_appointment_slot
  │
  ├──1:N── mp_ai_conversation ──1:N── mp_ai_message
  │
  └──1:N── mp_ai_recommendation_log

mp_page ──1:N── mp_page_version
mp_page_template (独立)
mp_category ──1:N── mp_article
mp_product_category ──1:N── mp_product ──1:N── mp_product_sku
mp_system_config (独立)
mp_operation_log (独立)
mp_statistics_daily (独立)
mp_page_access_log (独立)
```
