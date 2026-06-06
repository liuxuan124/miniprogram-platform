# 数据库核心模型初稿

> 任务编号：TASK-BE-001
> 所属阶段：02-foundation-contracts
> 输出状态：初稿，待总控冻结

---

## 1. 设计原则

1. 所有表使用统一前缀 `mp_`（mini-program），避免与其他系统冲突。
2. 所有表包含 `id`（BIGINT 自增主键）、`created_at`、`updated_at`、`deleted_at`（软删除）四个基础字段。
3. 状态字段统一使用 TINYINT 枚举，并在本文件中登记枚举值含义。
4. 金额字段统一使用 DECIMAL(10,2)，单位为元。
5. 跨模块共享数据通过外键关联，不冗余存储；如需冗余则标注"快照字段"。
6. 所有数据库变更必须说明影响范围、迁移方式和回滚方式。

---

## 2. 基础字段约定

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT UNSIGNED AUTO_INCREMENT | 主键 |
| created_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |
| deleted_at | DATETIME NULL | 软删除时间，非 NULL 表示已删除 |

以下各表定义中省略基础字段，仅列出业务字段。

---

## 3. 用户与权限域

### 3.1 mp_admin_user — 后台管理员

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| username | VARCHAR(64) NOT NULL UNIQUE | 登录账号 |
| password_hash | VARCHAR(255) NOT NULL | 密码哈希 |
| real_name | VARCHAR(64) | 真实姓名 |
| phone | VARCHAR(20) | 手机号 |
| avatar_url | VARCHAR(512) | 头像地址 |
| role_id | BIGINT UNSIGNED NOT NULL | 关联角色 |
| status | TINYINT NOT NULL DEFAULT 1 | 1=启用 0=禁用 |
| last_login_at | DATETIME | 最后登录时间 |

索引：idx_role_id(role_id), idx_phone(phone)

### 3.2 mp_role — 角色

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | VARCHAR(64) NOT NULL UNIQUE | 角色编码 |
| name | VARCHAR(64) NOT NULL | 角色名称 |
| description | VARCHAR(255) | 角色描述 |
| status | TINYINT NOT NULL DEFAULT 1 | 1=启用 0=禁用 |

预设角色编码：`super_admin`、`content_ops`、`biz_ops`、`service_staff`

### 3.3 mp_permission — 权限点

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| code | VARCHAR(128) NOT NULL UNIQUE | 权限编码，如 `page:publish` |
| name | VARCHAR(64) NOT NULL | 权限名称 |
| module | VARCHAR(64) NOT NULL | 所属模块 |
| type | TINYINT NOT NULL | 1=菜单 2=按钮 3=接口 |
| parent_id | BIGINT UNSIGNED DEFAULT 0 | 父权限 ID |
| sort_order | INT DEFAULT 0 | 排序 |

索引：idx_module(module), idx_parent_id(parent_id)

### 3.4 mp_role_permission — 角色权限关联

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| role_id | BIGINT UNSIGNED NOT NULL | 角色 ID |
| permission_id | BIGINT UNSIGNED NOT NULL | 权限 ID |

唯一索引：uk_role_perm(role_id, permission_id)

### 3.5 mp_user — 小程序用户

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| openid | VARCHAR(128) NOT NULL UNIQUE | 微信 OpenID |
| union_id | VARCHAR(128) | 微信 UnionID |
| nickname | VARCHAR(128) | 昵称 |
| avatar_url | VARCHAR(512) | 头像 |
| phone | VARCHAR(20) | 手机号（授权后获取） |
| gender | TINYINT DEFAULT 0 | 0=未知 1=男 2=女 |
| source_channel | VARCHAR(64) | 来源渠道 |
| last_visit_at | DATETIME | 最近访问时间 |
| member_id | BIGINT UNSIGNED | 关联会员 ID（可为空，首次消费后自动创建） |

索引：idx_union_id(union_id), idx_phone(phone), idx_member_id(member_id)

---

## 4. 会员与营销域

### 4.1 mp_member — 会员

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | BIGINT UNSIGNED NOT NULL UNIQUE | 关联小程序用户 |
| level | TINYINT NOT NULL DEFAULT 1 | 会员等级 |
| points | INT NOT NULL DEFAULT 0 | 可用积分 |
| growth_value | INT NOT NULL DEFAULT 0 | 成长值 |
| total_consume | DECIMAL(10,2) DEFAULT 0.00 | 累计消费金额 |
| order_count | INT DEFAULT 0 | 订单数 |
| tags | JSON | 会员标签数组，如 ["高价值","活跃"] |

索引：idx_level(level), idx_points(points)

### 4.2 mp_member_level_rule — 会员等级规则

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| level | TINYINT NOT NULL UNIQUE | 等级 |
| name | VARCHAR(64) NOT NULL | 等级名称 |
| min_growth | INT NOT NULL | 所需最低成长值 |
| discount_rate | DECIMAL(3,2) DEFAULT 1.00 | 折扣率，1.00=无折扣 |
| benefits_desc | TEXT | 权益描述 |

### 4.3 mp_coupon — 优惠券模板

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(128) NOT NULL | 优惠券名称 |
| type | TINYINT NOT NULL | 1=满减券 2=折扣券 3=新人券 4=会员专属券 |
| value | DECIMAL(10,2) NOT NULL | 面额/折扣率（满减为金额，折扣为 0~1 之间） |
| min_amount | DECIMAL(10,2) DEFAULT 0.00 | 最低使用金额 |
| total_count | INT NOT NULL | 发行总量 |
| used_count | INT DEFAULT 0 | 已使用数量 |
| issued_count | INT DEFAULT 0 | 已领取数量 |
| start_time | DATETIME NOT NULL | 生效开始时间 |
| end_time | DATETIME NOT NULL | 生效结束时间 |
| status | TINYINT NOT NULL DEFAULT 1 | 1=启用 0=禁用 |
| applicable_scope | TINYINT DEFAULT 1 | 1=全场 2=指定分类 3=指定商品 |
| scope_ids | JSON | 适用范围 ID 列表 |

索引：idx_type(type), idx_status(status), idx_time_range(start_time, end_time)

### 4.4 mp_user_coupon — 用户优惠券

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | BIGINT UNSIGNED NOT NULL | 用户 ID |
| coupon_id | BIGINT UNSIGNED NOT NULL | 优惠券模板 ID |
| status | TINYINT NOT NULL DEFAULT 0 | 0=未使用 1=已使用 2=已过期 |
| used_at | DATETIME | 使用时间 |
| order_id | BIGINT UNSIGNED | 使用的订单 ID |
| source | TINYINT NOT NULL | 1=主动领取 2=系统发放 3=邀请奖励 |

索引：idx_user_status(user_id, status), idx_coupon_id(coupon_id)

### 4.5 mp_points_log — 积分流水

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | BIGINT UNSIGNED NOT NULL | 用户 ID |
| change_amount | INT NOT NULL | 变动量（正为增加，负为扣减） |
| balance_after | INT NOT NULL | 变动后余额 |
| type | TINYINT NOT NULL | 1=消费获得 2=签到 3=兑换扣减 4=管理员调整 5=退款返还 |
| ref_id | VARCHAR(64) | 关联业务 ID（订单号/活动 ID 等） |
| remark | VARCHAR(255) | 备注 |

索引：idx_user_id(user_id), idx_type(type)

---

## 5. 页面搭建域

### 5.1 mp_page — 页面

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(128) NOT NULL | 页面名称 |
| type | TINYINT NOT NULL | 1=首页 2=专题页 3=自定义页 |
| path | VARCHAR(255) NOT NULL | 小程序访问路径，如 pages/index/index |
| share_title | VARCHAR(128) | 分享标题 |
| share_image | VARCHAR(512) | 分享封面图 |
| status | TINYINT NOT NULL DEFAULT 0 | 0=草稿 1=已发布 2=已下架 |
| current_version | INT DEFAULT 0 | 当前发布版本号 |
| description | VARCHAR(512) | 页面描述 |

索引：idx_status(status), idx_type(type), idx_path(path)

### 5.2 mp_page_version — 页面版本

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| page_id | BIGINT UNSIGNED NOT NULL | 页面 ID |
| version | INT NOT NULL | 版本号 |
| dsl_content | JSON NOT NULL | 页面 DSL 内容（符合 page-dsl-schema 契约） |
| status | TINYINT NOT NULL | 0=草稿 1=已发布 2=已回滚 |
| published_at | DATETIME | 发布时间 |
| publisher_id | BIGINT UNSIGNED | 发布人 ID |

唯一索引：uk_page_version(page_id, version)
索引：idx_status(status)

### 5.3 mp_page_template — 页面模板

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(128) NOT NULL | 模板名称 |
| thumbnail | VARCHAR(512) | 模板缩略图 |
| dsl_content | JSON NOT NULL | 模板 DSL 内容 |
| category | VARCHAR(64) | 模板分类 |
| sort_order | INT DEFAULT 0 | 排序 |

---

## 6. 内容域

### 6.1 mp_content_category — 内容分类

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(64) NOT NULL | 分类名称 |
| parent_id | BIGINT UNSIGNED DEFAULT 0 | 父分类 ID |
| sort_order | INT DEFAULT 0 | 排序 |
| icon | VARCHAR(512) | 分类图标 |

索引：idx_parent_id(parent_id)

### 6.2 mp_content — 内容（文章/图文/视频）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| title | VARCHAR(255) NOT NULL | 标题 |
| type | TINYINT NOT NULL | 1=文章 2=图文 3=视频 |
| category_id | BIGINT UNSIGNED | 分类 ID |
| cover_image | VARCHAR(512) | 封面图 |
| content | LONGTEXT | 正文（富文本 HTML） |
| video_url | VARCHAR(512) | 视频地址（视频类型） |
| summary | VARCHAR(512) | 摘要 |
| status | TINYINT NOT NULL DEFAULT 0 | 0=草稿 1=已发布 2=已下架 |
| is_recommended | TINYINT DEFAULT 0 | 0=否 1=是 |
| view_count | INT DEFAULT 0 | 阅读量 |
| like_count | INT DEFAULT 0 | 点赞数 |
| share_count | INT DEFAULT 0 | 分享数 |
| published_at | DATETIME | 发布时间 |

索引：idx_type_status(type, status), idx_category(category_id), idx_recommended(is_recommended), idx_published(published_at)

---

## 7. 商品与订单域

### 7.1 mp_product_category — 商品分类

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(64) NOT NULL | 分类名称 |
| parent_id | BIGINT UNSIGNED DEFAULT 0 | 父分类 ID |
| icon | VARCHAR(512) | 分类图标 |
| sort_order | INT DEFAULT 0 | 排序 |

### 7.2 mp_product — 商品

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(255) NOT NULL | 商品名称 |
| category_id | BIGINT UNSIGNED | 分类 ID |
| product_type | TINYINT NOT NULL | 1=实物商品 2=数字商品 3=服务商品 |
| main_image | VARCHAR(512) | 主图 |
| images | JSON | 图片列表 |
| description | LONGTEXT | 商品详情（富文本） |
| price | DECIMAL(10,2) NOT NULL | 售价 |
| original_price | DECIMAL(10,2) | 原价 |
| cost_price | DECIMAL(10,2) | 成本价 |
| total_stock | INT NOT NULL DEFAULT 0 | 总库存 |
| sold_count | INT DEFAULT 0 | 销量 |
| status | TINYINT NOT NULL DEFAULT 0 | 0=下架 1=上架 |
| sort_order | INT DEFAULT 0 | 排序 |
| service_duration | INT | 服务时长（分钟，服务商品） |
| booking_rule | JSON | 预约规则（服务商品） |
| digital_benefit | JSON | 数字权益说明（数字商品） |
| shipping_info | JSON | 发货信息模板（实物商品） |

索引：idx_category(category_id), idx_type_status(product_type, status), idx_price(price)

### 7.3 mp_product_sku — 商品 SKU

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| product_id | BIGINT UNSIGNED NOT NULL | 商品 ID |
| sku_code | VARCHAR(64) NOT NULL | SKU 编码 |
| specs | JSON NOT NULL | 规格属性，如 {"颜色":"红色","尺码":"XL"} |
| price | DECIMAL(10,2) NOT NULL | SKU 售价 |
| stock | INT NOT NULL DEFAULT 0 | 库存 |
| image | VARCHAR(512) | SKU 图片 |

索引：idx_product_id(product_id), uk_sku_code(sku_code)

### 7.4 mp_cart_item — 购物车

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | BIGINT UNSIGNED NOT NULL | 用户 ID |
| product_id | BIGINT UNSIGNED NOT NULL | 商品 ID |
| sku_id | BIGINT UNSIGNED NOT NULL | SKU ID |
| quantity | INT NOT NULL DEFAULT 1 | 数量 |
| selected | TINYINT DEFAULT 1 | 1=选中 0=未选中 |

唯一索引：uk_user_sku(user_id, sku_id)

### 7.5 mp_order — 订单

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| order_no | VARCHAR(64) NOT NULL UNIQUE | 订单编号 |
| user_id | BIGINT UNSIGNED NOT NULL | 用户 ID |
| total_amount | DECIMAL(10,2) NOT NULL | 订单总金额 |
| discount_amount | DECIMAL(10,2) DEFAULT 0.00 | 优惠金额 |
| pay_amount | DECIMAL(10,2) NOT NULL | 实付金额 |
| status | TINYINT NOT NULL DEFAULT 0 | 订单状态（见订单状态机契约） |
| product_type | TINYINT NOT NULL | 1=实物 2=数字 3=服务 |
| pay_time | DATETIME | 支付时间 |
| pay_transaction_id | VARCHAR(64) | 微信支付交易号 |
| cancel_time | DATETIME | 取消时间 |
| cancel_reason | VARCHAR(255) | 取消原因 |
| finish_time | DATETIME | 完成时间 |
| remark | VARCHAR(512) | 买家备注 |
| admin_remark | VARCHAR(512) | 管理员备注 |

索引：idx_user_id(user_id), idx_status(status), idx_pay_time(pay_time), idx_create_time(created_at)

**订单状态枚举**（与订单状态机契约对齐）：

| 值 | 含义 |
| --- | --- |
| 0 | 待支付 |
| 10 | 待发货（实物） |
| 11 | 待核销（数字） |
| 12 | 待确认（服务） |
| 20 | 已发货 |
| 30 | 已完成 |
| 40 | 已取消 |
| 50 | 退款中 |
| 51 | 退款待审核 |
| 52 | 退款已通过 |
| 53 | 退款已拒绝 |
| 54 | 已退款 |

### 7.6 mp_order_item — 订单明细

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| order_id | BIGINT UNSIGNED NOT NULL | 订单 ID |
| product_id | BIGINT UNSIGNED NOT NULL | 商品 ID |
| sku_id | BIGINT UNSIGNED | SKU ID |
| product_name | VARCHAR(255) NOT NULL | 商品名称（快照） |
| sku_specs | JSON | 规格快照 |
| price | DECIMAL(10,2) NOT NULL | 单价快照 |
| quantity | INT NOT NULL | 数量 |
| subtotal | DECIMAL(10,2) NOT NULL | 小计 |
| product_type | TINYINT NOT NULL | 商品类型快照 |
| cover_image | VARCHAR(512) | 商品主图快照 |

索引：idx_order_id(order_id)

### 7.7 mp_order_coupon — 订单优惠券关联

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| order_id | BIGINT UNSIGNED NOT NULL | 订单 ID |
| user_coupon_id | BIGINT UNSIGNED NOT NULL | 用户优惠券 ID |
| discount_amount | DECIMAL(10,2) NOT NULL | 优惠金额 |

### 7.8 mp_shipping — 物流信息

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| order_id | BIGINT UNSIGNED NOT NULL UNIQUE | 订单 ID |
| shipping_company | VARCHAR(64) NOT NULL | 物流公司 |
| shipping_no | VARCHAR(64) NOT NULL | 物流单号 |
| shipped_at | DATETIME | 发货时间 |
| received_at | DATETIME | 签收时间 |

### 7.9 mp_refund — 退款记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| order_id | BIGINT UNSIGNED NOT NULL | 订单 ID |
| refund_no | VARCHAR(64) NOT NULL UNIQUE | 退款单号 |
| amount | DECIMAL(10,2) NOT NULL | 退款金额 |
| reason | VARCHAR(512) NOT NULL | 退款原因 |
| status | TINYINT NOT NULL DEFAULT 0 | 0=待审核 1=审核通过 2=审核拒绝 3=退款中 4=已退款 5=退款失败 |
| admin_id | BIGINT UNSIGNED | 审核人 ID |
| audit_remark | VARCHAR(512) | 审核备注 |
| audit_at | DATETIME | 审核时间 |
| refund_transaction_id | VARCHAR(64) | 微信退款单号 |
| refund_at | DATETIME | 退款成功时间 |

索引：idx_order_id(order_id), idx_status(status)

---

## 8. 表单域

### 8.1 mp_form — 表单

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(128) NOT NULL | 表单名称 |
| type | TINYINT NOT NULL | 1=报名 2=咨询 3=问卷 4=线索 |
| fields | JSON NOT NULL | 字段配置（见下方字段结构） |
| status | TINYINT NOT NULL DEFAULT 1 | 1=启用 0=关闭 |
| submit_count | INT DEFAULT 0 | 提交数量 |

索引：idx_type_status(type, status)

**fields JSON 结构**：

```json
[
  {
    "key": "name",
    "label": "姓名",
    "type": "text",
    "required": true,
    "placeholder": "请输入姓名"
  },
  {
    "key": "phone",
    "label": "手机号",
    "type": "phone",
    "required": true,
    "placeholder": "请输入手机号"
  }
]
```

字段类型枚举：text、phone、email、textarea、radio、checkbox、select、date、datetime、image_upload、number

### 8.2 mp_form_submission — 表单提交记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| form_id | BIGINT UNSIGNED NOT NULL | 表单 ID |
| user_id | BIGINT UNSIGNED | 提交用户 ID |
| data | JSON NOT NULL | 提交数据 |
| audit_status | TINYINT NOT NULL DEFAULT 0 | 0=待审核 1=已通过 2=已拒绝 |
| audit_admin_id | BIGINT UNSIGNED | 审核人 ID |
| audit_remark | VARCHAR(512) | 审核备注 |
| audit_at | DATETIME | 审核时间 |

索引：idx_form_id(form_id), idx_audit_status(audit_status), idx_user_id(user_id)

---

## 9. 活动域

### 9.1 mp_activity — 活动

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(255) NOT NULL | 活动名称 |
| type | TINYINT NOT NULL | 1=沙龙 2=课程 3=展会 4=其他 |
| cover_image | VARCHAR(512) | 封面图 |
| description | LONGTEXT | 活动详情（富文本） |
| location | VARCHAR(255) | 活动地点 |
| start_time | DATETIME NOT NULL | 活动开始时间 |
| end_time | DATETIME NOT NULL | 活动结束时间 |
| quota | INT NOT NULL | 名额 |
| registered_count | INT DEFAULT 0 | 已报名人数 |
| form_id | BIGINT UNSIGNED | 关联报名表单 ID |
| status | TINYINT NOT NULL DEFAULT 1 | 1=报名中 2=已结束 3=已取消 |
| is_recommended | TINYINT DEFAULT 0 | 0=否 1=是 |

索引：idx_type(type), idx_status(status), idx_time_range(start_time, end_time)

### 9.2 mp_activity_registration — 活动报名

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| activity_id | BIGINT UNSIGNED NOT NULL | 活动 ID |
| user_id | BIGINT UNSIGNED NOT NULL | 用户 ID |
| form_submission_id | BIGINT UNSIGNED | 关联表单提交 ID |
| status | TINYINT NOT NULL DEFAULT 0 | 0=待审核 1=已通过 2=已拒绝 3=已核销 |
| checkin_code | VARCHAR(64) | 核销码 |
| checkin_at | DATETIME | 核销时间 |
| checkin_admin_id | BIGINT UNSIGNED | 核销人 ID |

唯一索引：uk_activity_user(activity_id, user_id)
索引：idx_status(status)

---

## 10. 预约域

### 10.1 mp_service_item — 服务项目

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(128) NOT NULL | 服务名称 |
| description | TEXT | 服务描述 |
| duration | INT NOT NULL | 服务时长（分钟） |
| image | VARCHAR(512) | 服务图片 |
| status | TINYINT NOT NULL DEFAULT 1 | 1=启用 0=禁用 |
| sort_order | INT DEFAULT 0 | 排序 |

### 10.2 mp_booking_slot — 预约时间段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| service_item_id | BIGINT UNSIGNED NOT NULL | 服务项目 ID |
| date | DATE NOT NULL | 可预约日期 |
| start_time | TIME NOT NULL | 开始时间 |
| end_time | TIME NOT NULL | 结束时间 |
| capacity | INT NOT NULL DEFAULT 1 | 容量 |
| booked_count | INT DEFAULT 0 | 已预约数量 |

唯一索引：uk_slot(service_item_id, date, start_time)
索引：idx_date(date)

### 10.3 mp_booking — 预约记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | BIGINT UNSIGNED NOT NULL | 用户 ID |
| service_item_id | BIGINT UNSIGNED NOT NULL | 服务项目 ID |
| slot_id | BIGINT UNSIGNED NOT NULL | 时间段 ID |
| date | DATE NOT NULL | 预约日期 |
| time_range | VARCHAR(32) NOT NULL | 时间段描述，如 "09:00-10:00" |
| status | TINYINT NOT NULL DEFAULT 0 | 0=待确认 1=已确认 2=已完成 3=已取消 |
| confirm_admin_id | BIGINT UNSIGNED | 确认人 ID |
| confirm_at | DATETIME | 确认时间 |
| cancel_reason | VARCHAR(255) | 取消原因 |
| remark | VARCHAR(512) | 备注 |

索引：idx_user_id(user_id), idx_service_item(service_item_id), idx_status(status), idx_date(date)

---

## 11. AI Agent 域

### 11.1 mp_ai_agent — AI Agent 配置

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(128) NOT NULL | Agent 名称 |
| model_provider | VARCHAR(64) NOT NULL | 模型供应商：openai / anthropic / aliyun |
| model_name | VARCHAR(128) NOT NULL | 模型版本 |
| api_key_encrypted | VARCHAR(512) NOT NULL | 加密存储的 API Key |
| temperature | DECIMAL(3,2) DEFAULT 0.70 | 温度参数 |
| max_tokens | INT DEFAULT 2048 | 最大回复 Token |
| environment | TINYINT DEFAULT 0 | 0=测试 1=生产 |
| current_version | INT DEFAULT 0 | 当前运行版本号 |
| status | TINYINT NOT NULL DEFAULT 0 | 0=未发布 1=运行中 2=已下线 |

### 11.2 mp_ai_agent_version — AI Agent 版本

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| agent_id | BIGINT UNSIGNED NOT NULL | Agent ID |
| version | INT NOT NULL | 版本号 |
| system_prompt | TEXT NOT NULL | System Prompt |
| welcome_message | VARCHAR(512) | 欢迎语 |
| fallback_strategy | TINYINT DEFAULT 0 | 无法回答策略：0=转人工 1=默认回复 2=拒绝回答 |
| product_recommend_enabled | TINYINT DEFAULT 1 | 商品推荐开关 |
| article_recommend_enabled | TINYINT DEFAULT 1 | 文章推荐开关 |
| activity_recommend_enabled | TINYINT DEFAULT 1 | 活动推荐开关 |
| memory_enabled | TINYINT DEFAULT 1 | 对话记忆开关 |
| publish_type | TINYINT | 1=全量 2=灰度 3=定时 |
| publish_config | JSON | 发布配置（灰度比例/定时时间） |
| status | TINYINT NOT NULL | 0=草稿 1=待发布 2=灰度中 3=运行中 4=已回滚 5=已下线 |
| published_at | DATETIME | 发布时间 |

唯一索引：uk_agent_version(agent_id, version)

### 11.3 mp_ai_knowledge_base — AI 知识库

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| agent_id | BIGINT UNSIGNED NOT NULL | Agent ID |
| name | VARCHAR(128) NOT NULL | 知识库名称 |
| file_name | VARCHAR(255) | 原始文件名 |
| file_url | VARCHAR(512) | 文件存储地址 |
| file_type | VARCHAR(32) | 文件类型：pdf/txt/docx/md |
| chunk_count | INT DEFAULT 0 | 分块数量 |
| vector_status | TINYINT DEFAULT 0 | 0=未开始 1=向量化中 2=已完成 3=失败 |
| recall_weight | DECIMAL(3,2) DEFAULT 0.70 | 召回权重 |

索引：idx_agent_id(agent_id), idx_vector_status(vector_status)

### 11.4 mp_ai_conversation — AI 对话记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| user_id | BIGINT UNSIGNED NOT NULL | 用户 ID |
| agent_id | BIGINT UNSIGNED NOT NULL | Agent ID |
| session_id | VARCHAR(64) NOT NULL | 会话 ID |
| role | TINYINT NOT NULL | 1=用户 2=AI 3=系统 |
| content | TEXT NOT NULL | 消息内容 |
| intent | VARCHAR(64) | 意图分类 |
| recommendations | JSON | 推荐结果（商品/文章/活动 ID 列表） |
| is_transferred | TINYINT DEFAULT 0 | 是否转人工 |
| satisfaction_score | TINYINT | 满意度评分 1~5 |
| token_count | INT | 消耗 Token 数 |

索引：idx_session_id(session_id), idx_user_id(user_id), idx_agent_id(agent_id), idx_intent(intent)

---

## 12. 素材域

### 12.1 mp_asset — 素材

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | VARCHAR(255) NOT NULL | 素材名称 |
| type | TINYINT NOT NULL | 1=图片 2=视频 3=文档 |
| mime_type | VARCHAR(64) | MIME 类型 |
| url | VARCHAR(512) NOT NULL | 文件地址 |
| thumbnail_url | VARCHAR(512) | 缩略图地址 |
| file_size | BIGINT | 文件大小（字节） |
| width | INT | 图片宽度 |
| height | INT | 图片高度 |
| category | VARCHAR(64) | 分类：logo/cover/content/product/other |
| uploader_id | BIGINT UNSIGNED | 上传人 ID |

索引：idx_type(type), idx_category(category)

---

## 13. 系统配置域

### 13.1 mp_system_config — 系统配置

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| config_key | VARCHAR(128) NOT NULL UNIQUE | 配置键 |
| config_value | TEXT NOT NULL | 配置值 |
| group_name | VARCHAR(64) NOT NULL | 配置分组：miniapp/payment/logistics/notification/navigation/plugin |
| description | VARCHAR(255) | 配置说明 |
| is_encrypted | TINYINT DEFAULT 0 | 1=加密存储 0=明文 |

索引：idx_group(group_name)

预设配置键示例：
- `miniapp.app_id`、`miniapp.app_secret`、`miniapp.name`、`miniapp.logo`
- `payment.mch_id`、`payment.api_v3_key`、`payment.serial_no`、`payment.cert_path`、`payment.callback_url`、`payment.env`
- `logistics.default_company`、`logistics.default_address`
- `notification.template_ids`（JSON）
- `navigation.tabbar`（JSON）
- `plugin.enabled_modules`（JSON）

### 13.2 mp_operation_log — 操作日志

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| admin_id | BIGINT UNSIGNED NOT NULL | 操作人 ID |
| module | VARCHAR(64) NOT NULL | 模块 |
| action | VARCHAR(64) NOT NULL | 操作 |
| target_type | VARCHAR(64) | 目标类型 |
| target_id | VARCHAR(64) | 目标 ID |
| detail | JSON | 操作详情 |
| ip | VARCHAR(64) | IP 地址 |
| user_agent | VARCHAR(512) | User-Agent |

索引：idx_admin_id(admin_id), idx_module_action(module, action), idx_created_at(created_at)

### 13.3 mp_data_dict — 数据字典

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| group_code | VARCHAR(64) NOT NULL | 字典组编码 |
| item_code | VARCHAR(64) NOT NULL | 字典项编码 |
| item_value | VARCHAR(255) NOT NULL | 字典项值 |
| label | VARCHAR(128) NOT NULL | 显示标签 |
| sort_order | INT DEFAULT 0 | 排序 |
| status | TINYINT DEFAULT 1 | 1=启用 0=禁用 |

唯一索引：uk_dict_item(group_code, item_code)

---

## 14. 支付与交易日志域

### 14.1 mp_payment_log — 支付流水

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| order_id | BIGINT UNSIGNED NOT NULL | 订单 ID |
| transaction_id | VARCHAR(64) | 微信支付交易号 |
| out_trade_no | VARCHAR(64) NOT NULL | 商户订单号 |
| pay_amount | DECIMAL(10,2) NOT NULL | 支付金额 |
| status | TINYINT NOT NULL | 0=待支付 1=支付成功 2=支付失败 3=已关闭 |
| pay_time | DATETIME | 支付时间 |
| callback_data | JSON | 支付回调原始数据 |
| idempotency_key | VARCHAR(64) NOT NULL UNIQUE | 幂等键 |

索引：idx_order_id(order_id), idx_transaction_id(transaction_id), idx_out_trade_no(out_trade_no)

### 14.2 mp_refund_log — 退款流水

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| refund_id | BIGINT UNSIGNED NOT NULL | 退款记录 ID |
| out_refund_no | VARCHAR(64) NOT NULL | 商户退款单号 |
| refund_transaction_id | VARCHAR(64) | 微信退款单号 |
| amount | DECIMAL(10,2) NOT NULL | 退款金额 |
| status | TINYINT NOT NULL | 0=退款中 1=退款成功 2=退款失败 |
| callback_data | JSON | 退款回调原始数据 |
| idempotency_key | VARCHAR(64) NOT NULL UNIQUE | 幂等键 |

索引：idx_refund_id(refund_id), idx_out_refund_no(out_refund_no)

---

## 15. 跨模块共享数据说明

| 共享数据 | 涉及模块 | 说明 |
| --- | --- | --- |
| mp_user | 会员、订单、表单、活动、预约、AI 对话 | 小程序用户为全局共享实体 |
| mp_member | 会员、营销、订单 | 会员等级影响折扣与权益 |
| mp_coupon / mp_user_coupon | 营销、订单 | 下单时核销优惠券 |
| mp_form | 表单、活动 | 活动报名复用表单能力 |
| mp_form_submission | 表单、活动 | 活动报名关联表单提交记录 |
| mp_asset | 页面搭建、内容、商品、系统设置 | 素材全局复用 |
| mp_content | 内容、AI 推荐 | AI 可推荐已发布内容 |
| mp_product | 商品、AI 推荐 | AI 可推荐上架商品 |
| mp_activity | 活动、AI 推荐 | AI 可推荐进行中活动 |

---

## 16. 迁移风险标记

| 风险项 | 说明 | 建议 |
| --- | --- | --- |
| 金额精度 | DECIMAL(10,2) 可满足当前需求，若后续涉及分币种或大额交易需评估 | 预留升级路径 |
| 订单状态扩展 | 订单状态机可能因售后场景扩展 | 状态值预留间隔，避免重排 |
| JSON 字段查询 | fields/dsl_content/recommendations 等使用 JSON 类型 | MySQL 5.7+ 支持，需评估查询性能；高频查询字段考虑提取为独立列 |
| 软删除与关联 | 软删除后关联数据需考虑展示一致性 | 列表查询默认排除已删除，详情页按需处理 |
| AI 对话数据量 | 对话记录增长快 | 建议按月分表或归档策略 |
| 支付证书存储 | 微信支付证书文件不宜存数据库 | 建议存文件系统/对象存储，数据库仅存路径 |

---

## 17. 表清单汇总

| 序号 | 表名 | 所属域 | 说明 |
| --- | --- | --- | --- |
| 1 | mp_admin_user | 用户与权限 | 后台管理员 |
| 2 | mp_role | 用户与权限 | 角色 |
| 3 | mp_permission | 用户与权限 | 权限点 |
| 4 | mp_role_permission | 用户与权限 | 角色权限关联 |
| 5 | mp_user | 用户与权限 | 小程序用户 |
| 6 | mp_member | 会员与营销 | 会员 |
| 7 | mp_member_level_rule | 会员与营销 | 会员等级规则 |
| 8 | mp_coupon | 会员与营销 | 优惠券模板 |
| 9 | mp_user_coupon | 会员与营销 | 用户优惠券 |
| 10 | mp_points_log | 会员与营销 | 积分流水 |
| 11 | mp_page | 页面搭建 | 页面 |
| 12 | mp_page_version | 页面搭建 | 页面版本 |
| 13 | mp_page_template | 页面搭建 | 页面模板 |
| 14 | mp_content_category | 内容 | 内容分类 |
| 15 | mp_content | 内容 | 内容 |
| 16 | mp_product_category | 商品与订单 | 商品分类 |
| 17 | mp_product | 商品与订单 | 商品 |
| 18 | mp_product_sku | 商品与订单 | 商品 SKU |
| 19 | mp_cart_item | 商品与订单 | 购物车 |
| 20 | mp_order | 商品与订单 | 订单 |
| 21 | mp_order_item | 商品与订单 | 订单明细 |
| 22 | mp_order_coupon | 商品与订单 | 订单优惠券关联 |
| 23 | mp_shipping | 商品与订单 | 物流信息 |
| 24 | mp_refund | 商品与订单 | 退款记录 |
| 25 | mp_form | 表单 | 表单 |
| 26 | mp_form_submission | 表单 | 表单提交记录 |
| 27 | mp_activity | 活动 | 活动 |
| 28 | mp_activity_registration | 活动 | 活动报名 |
| 29 | mp_service_item | 预约 | 服务项目 |
| 30 | mp_booking_slot | 预约 | 预约时间段 |
| 31 | mp_booking | 预约 | 预约记录 |
| 32 | mp_ai_agent | AI Agent | AI Agent 配置 |
| 33 | mp_ai_agent_version | AI Agent | AI Agent 版本 |
| 34 | mp_ai_knowledge_base | AI Agent | AI 知识库 |
| 35 | mp_ai_conversation | AI Agent | AI 对话记录 |
| 36 | mp_asset | 素材 | 素材 |
| 37 | mp_system_config | 系统配置 | 系统配置 |
| 38 | mp_operation_log | 系统配置 | 操作日志 |
| 39 | mp_data_dict | 系统配置 | 数据字典 |
| 40 | mp_payment_log | 支付与交易 | 支付流水 |
| 41 | mp_refund_log | 支付与交易 | 退款流水 |
