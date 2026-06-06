# TASK-ADMIN-001 管理后台框架与菜单权限方案

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 任务ID | TASK-ADMIN-001 |
| 任务名称 | 输出管理后台框架与菜单权限方案 |
| 所属Agent | admin-agent |
| 阶段 | 02-foundation-contracts |
| 依赖任务 | TASK-BE-002（API 接口规范初稿） |
| 输入契约 | api-contract.md |
| 版本 | V1.0 |
| 日期 | 2026-05-11 |

---

## 2. 后台菜单结构

菜单结构基于 PRD 第7节信息架构设计，覆盖完整增强版所有业务域。

### 2.1 一级菜单与二级菜单

| 序号 | 一级菜单 | 图标 | 二级菜单 | 说明 |
|------|---------|------|---------|------|
| 1 | 总览 | Dashboard | 工作台 | 关键指标、待办、快捷入口 |
| 2 | 页面与装修 | Layout | 页面管理 | 页面列表、新建、模板 |
| | | | 页面装修器 | 组件库、拖拽、属性、预览、发布 |
| 3 | 内容运营 | Edit | 内容管理 | 文章/图文/视频列表、分类、上下架 |
| | | | 表单管理 | 表单列表、字段配置、提交记录、审核 |
| 4 | 用户与会员 | User | 会员管理 | 会员列表、等级、积分、标签 |
| | | | 用户管理 | 小程序用户列表、来源、导出 |
| 5 | 商业变现 | Shopping | 商品管理 | 商品列表、新增、上下架 |
| | | | 订单管理 | 订单列表、发货、核销、退款审核 |
| | | | 营销管理 | 优惠券、签到、积分兑换、限时活动 |
| 6 | 活动与预约 | Calendar | 活动管理 | 活动列表、新建、报名审核、核销 |
| | | | 预约管理 | 服务项目、预约记录、确认 |
| 7 | 智能 AI | Robot | 智能 Agent | 模型、Prompt、知识库、沙盒、发布、监控 |
| 8 | 系统 | Setting | 素材库 | 图片/视频统一管理 |
| | | | 系统设置 | 小程序配置、支付、物流、通知、导航、插件、角色权限 |

### 2.2 菜单层级规则

- 一级菜单为业务域，不可删除，不可自定义。
- 二级菜单为功能页面，不可删除，后续可扩展三级页面（如订单详情、内容编辑）。
- 菜单根据当前用户角色权限动态显示：无权限的菜单项隐藏不展示。
- 菜单支持折叠/展开，默认展开当前业务域。

### 2.3 顶部导航

| 区域 | 内容 | 说明 |
|------|------|------|
| 左上 | 系统名称 + Logo | 固定展示 |
| 中部 | 模式切换 | 后台管理 / 小程序预览 |
| 右上 | 通知铃铛 | 待办提醒 |
| 右上 | 用户头像 + 下拉 | 个人信息、修改密码、退出登录 |

---

## 3. 路由结构

### 3.1 路由总表

路由前缀统一为 `/admin`，与管理后台 API 前缀 `/admin/v1/` 对应。

| 路由路径 | 页面 | 菜单对应 | 权限点 |
|---------|------|---------|--------|
| `/admin/login` | 登录页 | 无（公开页面） | 无 |
| `/admin` | 重定向到工作台 | — | — |
| `/admin/dashboard` | 工作台 | 总览 > 工作台 | `dashboard:view` |
| `/admin/pages` | 页面管理列表 | 页面与装修 > 页面管理 | `page:list` |
| `/admin/pages/create` | 新建页面 | 页面与装修 > 页面管理 | `page:create` |
| `/admin/pages/:id/edit` | 编辑页面基本信息 | 页面与装修 > 页面管理 | `page:edit` |
| `/admin/pages/:id/builder` | 页面装修器 | 页面与装修 > 页面装修器 | `page:builder` |
| `/admin/contents` | 内容管理列表 | 内容运营 > 内容管理 | `content:list` |
| `/admin/contents/create` | 新建内容 | 内容运营 > 内容管理 | `content:create` |
| `/admin/contents/:id/edit` | 编辑内容 | 内容运营 > 内容管理 | `content:edit` |
| `/admin/forms` | 表单管理列表 | 内容运营 > 表单管理 | `form:list` |
| `/admin/forms/:id` | 表单详情（字段配置 + 提交记录） | 内容运营 > 表单管理 | `form:detail` |
| `/admin/members` | 会员管理列表 | 用户与会员 > 会员管理 | `member:list` |
| `/admin/members/:id` | 会员详情 | 用户与会员 > 会员管理 | `member:detail` |
| `/admin/members/level-rules` | 会员等级规则配置 | 用户与会员 > 会员管理 | `member:config` |
| `/admin/users` | 用户管理列表 | 用户与会员 > 用户管理 | `user:list` |
| `/admin/users/:id` | 用户详情 | 用户与会员 > 用户管理 | `user:detail` |
| `/admin/products` | 商品管理列表 | 商业变现 > 商品管理 | `product:list` |
| `/admin/products/create` | 新建商品 | 商业变现 > 商品管理 | `product:create` |
| `/admin/products/:id/edit` | 编辑商品 | 商业变现 > 商品管理 | `product:edit` |
| `/admin/orders` | 订单管理列表 | 商业变现 > 订单管理 | `order:list` |
| `/admin/orders/:id` | 订单详情 | 商业变现 > 订单管理 | `order:detail` |
| `/admin/marketing/coupons` | 优惠券管理 | 商业变现 > 营销管理 | `marketing:coupon` |
| `/admin/marketing/activities` | 限时活动管理 | 商业变现 > 营销管理 | `marketing:activity` |
| `/admin/marketing/points` | 签到积分兑换 | 商业变现 > 营销管理 | `marketing:points` |
| `/admin/events` | 活动管理列表 | 活动与预约 > 活动管理 | `event:list` |
| `/admin/events/create` | 新建活动 | 活动与预约 > 活动管理 | `event:create` |
| `/admin/events/:id` | 活动详情 | 活动与预约 > 活动管理 | `event:detail` |
| `/admin/bookings` | 预约管理列表 | 活动与预约 > 预约管理 | `booking:list` |
| `/admin/bookings/services` | 服务项目配置 | 活动与预约 > 预约管理 | `booking:config` |
| `/admin/ai` | AI Agent 总览 | 智能 AI > 智能 Agent | `ai:view` |
| `/admin/ai/model` | 模型配置 | 智能 AI > 智能 Agent | `ai:model` |
| `/admin/ai/prompt` | Prompt 配置 | 智能 AI > 智能 Agent | `ai:prompt` |
| `/admin/ai/knowledge` | 知识库管理 | 智能 AI > 智能 Agent | `ai:knowledge` |
| `/admin/ai/sandbox` | 沙盒测试 | 智能 AI > 智能 Agent | `ai:sandbox` |
| `/admin/ai/publish` | 发布管理 | 智能 AI > 智能 Agent | `ai:publish` |
| `/admin/ai/monitor` | 运营监控 | 智能 AI > 智能 Agent | `ai:monitor` |
| `/admin/assets` | 素材库 | 系统 > 素材库 | `asset:list` |
| `/admin/settings/miniapp` | 小程序配置 | 系统 > 系统设置 | `setting:miniapp` |
| `/admin/settings/payment` | 支付配置 | 系统 > 系统设置 | `setting:payment` |
| `/admin/settings/logistics` | 物流配置 | 系统 > 系统设置 | `setting:logistics` |
| `/admin/settings/notification` | 订阅消息配置 | 系统 > 系统设置 | `setting:notification` |
| `/admin/settings/navigation` | 底部导航管理 | 系统 > 系统设置 | `setting:navigation` |
| `/admin/settings/plugins` | 插件模块管理 | 系统 > 系统设置 | `setting:plugins` |
| `/admin/settings/roles` | 角色权限管理 | 系统 > 系统设置 | `setting:role` |

### 3.2 路由守卫规则

| 规则 | 说明 |
|------|------|
| 登录校验 | 除 `/admin/login` 外，所有路由需验证 Token 有效性 |
| 权限校验 | 路由对应的权限点需在当前用户角色权限列表中 |
| 无权限处理 | 重定向到工作台并提示"无访问权限" |
| Token 过期处理 | 清除本地 Token，跳转登录页 |
| 404 处理 | 未匹配路由跳转工作台 |

### 3.3 路由嵌套结构

```
/admin
├── /admin/login                          # 公开页面
├── Layout (侧边栏 + 顶部导航)
│   ├── /admin/dashboard                  # 工作台
│   ├── /admin/pages                      # 页面管理
│   │   ├── /admin/pages/create
│   │   ├── /admin/pages/:id/edit
│   │   └── /admin/pages/:id/builder      # 全屏装修器（隐藏侧边栏）
│   ├── /admin/contents                   # 内容管理
│   │   ├── /admin/contents/create
│   │   └── /admin/contents/:id/edit
│   ├── /admin/forms                      # 表单管理
│   │   └── /admin/forms/:id
│   ├── /admin/members                    # 会员管理
│   │   ├── /admin/members/:id
│   │   └── /admin/members/level-rules
│   ├── /admin/users                      # 用户管理
│   │   └── /admin/users/:id
│   ├── /admin/products                   # 商品管理
│   │   ├── /admin/products/create
│   │   └── /admin/products/:id/edit
│   ├── /admin/orders                     # 订单管理
│   │   └── /admin/orders/:id
│   ├── /admin/marketing                  # 营销管理
│   │   ├── /admin/marketing/coupons
│   │   ├── /admin/marketing/activities
│   │   └── /admin/marketing/points
│   ├── /admin/events                     # 活动管理
│   │   ├── /admin/events/create
│   │   └── /admin/events/:id
│   ├── /admin/bookings                   # 预约管理
│   │   └── /admin/bookings/services
│   ├── /admin/ai                         # AI Agent
│   │   ├── /admin/ai/model
│   │   ├── /admin/ai/prompt
│   │   ├── /admin/ai/knowledge
│   │   ├── /admin/ai/sandbox
│   │   ├── /admin/ai/publish
│   │   └── /admin/ai/monitor
│   ├── /admin/assets                     # 素材库
│   └── /admin/settings                   # 系统设置
│       ├── /admin/settings/miniapp
│       ├── /admin/settings/payment
│       ├── /admin/settings/logistics
│       ├── /admin/settings/notification
│       ├── /admin/settings/navigation
│       ├── /admin/settings/plugins
│       └── /admin/settings/roles
```

**特殊布局说明：**
- 页面装修器 `/admin/pages/:id/builder` 采用全屏布局，隐藏侧边栏和顶部导航，仅保留装修器三栏界面。
- 其余页面统一使用 Layout 布局（侧边栏 + 顶部导航 + 内容区）。

---

## 4. 权限点清单

### 4.1 权限模型

权限模型采用 **RBAC（基于角色的访问控制）**，结构为：

```
用户 (admin_user) → 角色 (role) → 权限点 (permission)
```

- 一个用户可分配一个角色（本期简化，后续可扩展为多角色）。
- 权限点分为 **菜单权限**（控制菜单是否可见）和 **操作权限**（控制按钮/操作是否可用）。
- 权限点编码规则：`模块:操作`，如 `page:create`、`order:refund`。

### 4.2 完整权限点清单

#### 4.2.1 总览模块

| 权限点编码 | 权限点名称 | 类型 | 说明 |
|-----------|-----------|------|------|
| `dashboard:view` | 查看工作台 | 菜单+操作 | 查看工作台指标和待办 |

#### 4.2.2 页面与装修模块

| 权限点编码 | 权限点名称 | 类型 | 说明 |
|-----------|-----------|------|------|
| `page:list` | 查看页面列表 | 菜单 | 控制菜单可见性 |
| `page:create` | 新建页面 | 操作 | 新建页面按钮 |
| `page:edit` | 编辑页面信息 | 操作 | 编辑页面基本信息 |
| `page:delete` | 删除页面 | 操作 | 删除页面（需二次确认） |
| `page:builder` | 进入装修器 | 操作 | 打开页面装修器 |
| `page:publish` | 发布页面 | 操作 | 发布页面上线 |
| `page:preview` | 预览页面 | 操作 | 小程序预览 |

#### 4.2.3 内容运营模块

| 权限点编码 | 权限点名称 | 类型 | 说明 |
|-----------|-----------|------|------|
| `content:list` | 查看内容列表 | 菜单 | 控制菜单可见性 |
| `content:create` | 新建内容 | 操作 | 新建文章/图文/视频 |
| `content:edit` | 编辑内容 | 操作 | 编辑内容 |
| `content:publish` | 发布/上架内容 | 操作 | 内容上下架 |
| `content:delete` | 删除内容 | 操作 | 删除内容 |
| `content:recommend` | 设置推荐 | 操作 | 设置推荐内容 |
| `form:list` | 查看表单列表 | 菜单 | 控制菜单可见性 |
| `form:create` | 新建表单 | 操作 | 新建表单 |
| `form:edit` | 编辑表单字段 | 操作 | 配置表单字段 |
| `form:detail` | 查看提交记录 | 操作 | 查看表单提交记录 |
| `form:audit` | 审核表单提交 | 操作 | 审核通过/拒绝 |
| `form:close` | 关闭表单 | 操作 | 关闭表单收集 |

#### 4.2.4 用户与会员模块

| 权限点编码 | 权限点名称 | 类型 | 说明 |
|-----------|-----------|------|------|
| `member:list` | 查看会员列表 | 菜单 | 控制菜单可见性 |
| `member:detail` | 查看会员详情 | 操作 | 查看会员详细信息 |
| `member:config` | 配置会员规则 | 操作 | 配置等级规则、积分规则 |
| `member:tag` | 管理会员标签 | 操作 | 标签增删改 |
| `user:list` | 查看用户列表 | 菜单 | 控制菜单可见性 |
| `user:detail` | 查看用户详情 | 操作 | 查看用户详细信息 |
| `user:export` | 导出用户数据 | 操作 | 导出用户列表 |

#### 4.2.5 商业变现模块

| 权限点编码 | 权限点名称 | 类型 | 说明 |
|-----------|-----------|------|------|
| `product:list` | 查看商品列表 | 菜单 | 控制菜单可见性 |
| `product:create` | 新建商品 | 操作 | 新增商品 |
| `product:edit` | 编辑商品 | 操作 | 编辑商品信息 |
| `product:shelf` | 商品上下架 | 操作 | 上下架操作 |
| `product:delete` | 删除商品 | 操作 | 删除商品 |
| `order:list` | 查看订单列表 | 菜单 | 控制菜单可见性 |
| `order:detail` | 查看订单详情 | 操作 | 查看订单详细信息 |
| `order:ship` | 发货 | 操作 | 填写物流信息发货 |
| `order:verify` | 核销 | 操作 | 数字商品核销 |
| `order:confirm` | 服务确认 | 操作 | 服务商品确认 |
| `order:refund` | 退款审核 | 操作 | 批准/拒绝退款 |
| `order:export` | 导出订单 | 操作 | 导出订单报表 |
| `marketing:coupon` | 优惠券管理 | 菜单+操作 | 创建/编辑优惠券 |
| `marketing:activity` | 限时活动管理 | 菜单+操作 | 配置限时活动 |
| `marketing:points` | 签到积分兑换 | 菜单+操作 | 配置积分规则 |
| `marketing:invite` | 邀请好友 | 操作 | 配置邀请规则 |
| `marketing:auto-coupon` | 自动发券 | 操作 | 配置自动发券规则 |

#### 4.2.6 活动与预约模块

| 权限点编码 | 权限点名称 | 类型 | 说明 |
|-----------|-----------|------|------|
| `event:list` | 查看活动列表 | 菜单 | 控制菜单可见性 |
| `event:create` | 新建活动 | 操作 | 创建活动 |
| `event:detail` | 查看活动详情 | 操作 | 查看活动详情和报名 |
| `event:audit` | 审核报名 | 操作 | 审核通过/拒绝 |
| `event:verify` | 活动核销 | 操作 | 现场核销 |
| `event:delete` | 删除活动 | 操作 | 删除活动 |
| `booking:list` | 查看预约列表 | 菜单 | 控制菜单可见性 |
| `booking:config` | 配置服务项目 | 操作 | 配置服务、时间段、容量 |
| `booking:confirm` | 确认预约 | 操作 | 确认/取消预约 |

#### 4.2.7 智能 AI 模块

| 权限点编码 | 权限点名称 | 类型 | 说明 |
|-----------|-----------|------|------|
| `ai:view` | 查看 AI Agent | 菜单 | 控制菜单可见性 |
| `ai:model` | 模型配置 | 操作 | 配置模型和 API Key |
| `ai:prompt` | Prompt 配置 | 操作 | 编写和修改 Prompt |
| `ai:knowledge` | 知识库管理 | 操作 | 上传/管理知识库 |
| `ai:sandbox` | 沙盒测试 | 操作 | 进行沙盒对话测试 |
| `ai:publish` | 发布管理 | 操作 | 发布/灰度/回滚 |
| `ai:monitor` | 运营监控 | 操作 | 查看对话和转化数据 |

#### 4.2.8 系统模块

| 权限点编码 | 权限点名称 | 类型 | 说明 |
|-----------|-----------|------|------|
| `asset:list` | 查看素材库 | 菜单 | 控制菜单可见性 |
| `asset:upload` | 上传素材 | 操作 | 上传图片/视频 |
| `asset:delete` | 删除素材 | 操作 | 删除素材 |
| `setting:miniapp` | 小程序配置 | 操作 | 配置 AppID/AppSecret 等 |
| `setting:payment` | 支付配置 | 操作 | 配置支付参数（高风险） |
| `setting:logistics` | 物流配置 | 操作 | 配置物流和运费 |
| `setting:notification` | 订阅消息配置 | 操作 | 配置消息模板 |
| `setting:navigation` | 底部导航管理 | 操作 | 管理小程序底部导航 |
| `setting:plugins` | 插件模块管理 | 操作 | 启停插件模块 |
| `setting:role` | 角色权限管理 | 操作 | 管理角色和权限分配 |

---

## 5. 角色权限矩阵

基于 PRD 第11节权限需求，定义四个内置角色及其权限分配。

### 5.1 超级管理员 (super_admin)

| 模块 | 权限范围 |
|------|---------|
| 总览 | `dashboard:view` |
| 页面与装修 | 全部权限 |
| 内容运营 | 全部权限 |
| 用户与会员 | 全部权限 |
| 商业变现 | 全部权限 |
| 活动与预约 | 全部权限 |
| 智能 AI | 全部权限 |
| 系统 | 全部权限（含系统设置） |

### 5.2 内容运营 (content_operator)

| 模块 | 权限范围 |
|------|---------|
| 总览 | `dashboard:view` |
| 页面与装修 | `page:list`, `page:create`, `page:edit`, `page:builder`, `page:publish`, `page:preview` |
| 内容运营 | 全部权限 |
| 用户与会员 | `member:list`, `member:detail`, `user:list`, `user:detail` |
| 商业变现 | `product:list`, `order:list`, `order:detail`, `marketing:coupon`（查看） |
| 活动与预约 | 全部权限 |
| 智能 AI | `ai:view`, `ai:prompt`, `ai:knowledge`, `ai:sandbox` |
| 系统 | `asset:list`, `asset:upload` |

### 5.3 商务运营 (commerce_operator)

| 模块 | 权限范围 |
|------|---------|
| 总览 | `dashboard:view` |
| 页面与装修 | `page:list` |
| 内容运营 | `content:list`, `form:list`, `form:detail` |
| 用户与会员 | `member:list`, `member:detail`, `member:tag`, `user:list`, `user:detail` |
| 商业变现 | 全部权限 |
| 活动与预约 | `event:list`, `event:detail`, `booking:list` |
| 智能 AI | `ai:view`, `ai:monitor` |
| 系统 | `asset:list` |

### 5.4 客服/服务人员 (service_staff)

| 模块 | 权限范围 |
|------|---------|
| 总览 | `dashboard:view` |
| 页面与装修 | `page:list` |
| 内容运营 | `form:list`, `form:detail`, `form:audit` |
| 用户与会员 | `member:list`, `member:detail`, `user:list`, `user:detail` |
| 商业变现 | `product:list`, `order:list`, `order:detail`, `order:ship`, `order:verify`, `order:refund` |
| 活动与预约 | `event:list`, `event:detail`, `event:audit`, `event:verify`, `booking:list`, `booking:confirm` |
| 智能 AI | `ai:view`, `ai:sandbox` |
| 系统 | `asset:list` |

---

## 6. 高风险操作清单

以下操作在后台中必须进行**二次确认**，确认弹窗需明确展示操作影响：

| 操作 | 所在页面 | 确认提示 |
|------|---------|---------|
| 删除页面 | 页面管理 | "删除后页面将无法恢复，已发布页面将从小程序下线，确认删除？" |
| 发布页面 | 页面装修器 | "发布后将替换当前线上版本，小程序端将实时更新，确认发布？" |
| 删除内容 | 内容管理 | "删除后内容将无法恢复，确认删除？" |
| 删除商品 | 商品管理 | "删除后商品将无法恢复，已有订单不受影响，确认删除？" |
| 商品下架 | 商品管理 | "下架后小程序端将不再展示该商品，确认下架？" |
| 退款批准 | 订单管理 | "批准退款后资金将原路退回，确认批准退款？" |
| 退款拒绝 | 订单管理 | "拒绝退款后用户将收到通知，确认拒绝？" |
| 删除活动 | 活动管理 | "删除后活动及报名数据将无法恢复，确认删除？" |
| 切换生产支付环境 | 系统设置-支付 | "切换到生产环境后将使用真实支付，请确认已完成沙盒验证" |
| AI Agent 发布 | AI 发布管理 | "发布后小程序端 AI 助手将立即更新，确认发布？" |
| AI Agent 版本回滚 | AI 发布管理 | "回滚将恢复到上一版本，当前版本配置将失效，确认回滚？" |
| 修改角色权限 | 系统设置-角色 | "修改权限后相关用户立即生效，确认修改？" |

---

## 7. 后台模块依赖清单

### 7.1 前端技术栈建议

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | React 18+ | 组件化开发，生态成熟 |
| UI 组件库 | Ant Design 5.x | 企业级后台组件库，开箱即用 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 路由 | React Router v6 | 嵌套路由、路由守卫 |
| HTTP 请求 | Axios | 请求/响应拦截、Token 管理 |
| 构建工具 | Vite | 开发热更新快 |
| 样式 | CSS Modules + Ant Design Token | 主题定制 |
| 拖拽 | dnd-kit | 页面装修器拖拽排序 |
| 图表 | ECharts | 工作台和监控图表 |

### 7.2 后台模块依赖关系

```
登录页
└── 后台布局 (Layout)
    ├── 侧边栏菜单 (依赖: 权限接口)
    ├── 顶部导航 (依赖: 用户信息接口)
    ├── 工作台 (依赖: 统计接口)
    ├── 页面管理 (依赖: 页面CRUD接口)
    │   └── 页面装修器 (依赖: 页面DSL接口, 组件库接口, 素材库接口)
    ├── 内容管理 (依赖: 内容CRUD接口, 分类接口, 素材库接口)
    ├── 表单管理 (依赖: 表单CRUD接口, 提交记录接口)
    ├── 会员管理 (依赖: 会员接口, 等级规则接口)
    ├── 用户管理 (依赖: 用户接口, 导出接口)
    ├── 商品管理 (依赖: 商品CRUD接口, 分类接口, 素材库接口)
    ├── 订单管理 (依赖: 订单接口, 物流接口, 退款接口)
    │   └── 订单状态操作 (依赖: 订单状态机契约)
    ├── 营销管理 (依赖: 优惠券接口, 营销规则接口)
    ├── 活动管理 (依赖: 活动CRUD接口, 报名接口)
    ├── 预约管理 (依赖: 预约接口, 服务配置接口)
    ├── AI Agent (依赖: AI配置接口, 知识库接口, 发布接口, 监控接口)
    │   └── AI推荐 (依赖: AI推荐契约)
    ├── 素材库 (依赖: 文件上传接口, 文件列表接口)
    └── 系统设置 (依赖: 配置接口, 角色权限接口)
```

### 7.3 后端接口依赖清单

以下接口需由后端 Agent 提供，管理后台前端按此接口规范调用：

| 接口分类 | 需要的接口 | 对应契约 |
|---------|-----------|---------|
| 认证 | `POST /admin/v1/auth/login`, `POST /admin/v1/auth/logout`, `GET /admin/v1/auth/profile` | api-contract.md |
| 权限 | `GET /admin/v1/permissions/mine`, `GET /admin/v1/roles`, `POST /admin/v1/roles`, `PUT /admin/v1/roles/:id` | api-contract.md |
| 页面 | `GET/POST/PUT/DELETE /admin/v1/pages`, `POST /admin/v1/pages/:id/publish`, `GET /admin/v1/pages/:id/versions` | page-dsl-schema.md |
| 内容 | `GET/POST/PUT/DELETE /admin/v1/contents`, `GET /admin/v1/content-categories` | api-contract.md |
| 表单 | `GET/POST/PUT/DELETE /admin/v1/forms`, `GET /admin/v1/forms/:id/submissions`, `PUT /admin/v1/forms/:id/submissions/:sid/audit` | api-contract.md |
| 会员 | `GET /admin/v1/members`, `GET /admin/v1/members/:id`, `GET/PUT /admin/v1/member-level-rules` | api-contract.md |
| 用户 | `GET /admin/v1/users`, `GET /admin/v1/users/:id`, `POST /admin/v1/users/export` | api-contract.md |
| 商品 | `GET/POST/PUT/DELETE /admin/v1/products`, `PUT /admin/v1/products/:id/shelf` | api-contract.md |
| 订单 | `GET /admin/v1/orders`, `GET /admin/v1/orders/:id`, `POST /admin/v1/orders/:id/ship`, `POST /admin/v1/orders/:id/verify`, `POST /admin/v1/orders/:id/refund` | order-state-machine.md |
| 营销 | `GET/POST/PUT/DELETE /admin/v1/coupons`, `GET/POST/PUT/DELETE /admin/v1/marketing-activities` | api-contract.md |
| 活动 | `GET/POST/PUT/DELETE /admin/v1/events`, `PUT /admin/v1/events/:id/audit`, `POST /admin/v1/events/:id/verify` | api-contract.md |
| 预约 | `GET /admin/v1/bookings`, `PUT /admin/v1/bookings/:id/confirm`, `GET/PUT /admin/v1/booking-services` | api-contract.md |
| AI | `GET/PUT /admin/v1/ai/model`, `GET/PUT /admin/v1/ai/prompt`, `GET/POST/DELETE /admin/v1/ai/knowledge`, `POST /admin/v1/ai/sandbox/chat`, `POST /admin/v1/ai/publish`, `GET /admin/v1/ai/monitor` | ai-recommendation-contract.md |
| 素材 | `GET /admin/v1/assets`, `POST /admin/v1/assets/upload`, `DELETE /admin/v1/assets/:id` | api-contract.md |
| 系统设置 | `GET/PUT /admin/v1/settings/miniapp`, `GET/PUT /admin/v1/settings/payment`, `GET/PUT /admin/v1/settings/logistics`, `GET/PUT /admin/v1/settings/notification`, `GET/PUT /admin/v1/settings/navigation`, `GET/PUT /admin/v1/settings/plugins` | api-contract.md |

> **注意**：以上接口路径为建议格式，最终以 TASK-BE-002 输出的 API 接口规范为准。管理后台前端在实现时需严格遵循 api-contract.md 中定义的请求/响应格式、错误码和鉴权规则。

### 7.4 前端通用组件清单

| 组件 | 说明 | 使用场景 |
|------|------|---------|
| ProTable | 带搜索、筛选、分页的数据表格 | 所有列表页 |
| ProForm | 带校验的表单 | 所有新建/编辑页 |
| SearchBar | 搜索筛选栏 | 列表页顶部 |
| ConfirmModal | 二次确认弹窗 | 高风险操作 |
| StatusTag | 状态标签 | 订单状态、页面状态等 |
| ImageUploader | 图片上传（对接素材库） | 内容封面、商品图片、素材库 |
| RichTextEditor | 富文本编辑器 | 内容正文 |
| PhonePreview | 手机框预览 | 页面装修器 |
| ComponentLibrary | 组件库面板 | 页面装修器 |
| PropertyPanel | 属性配置面板 | 页面装修器 |
| DraggableList | 拖拽排序列表 | 页面装修器组件排序 |
| ChartCard | 图表卡片 | 工作台、AI 监控 |
| PermissionWrapper | 权限包裹组件 | 按钮级权限控制 |

---

## 8. 契约遵守声明

本方案严格遵守以下契约约束：

| 契约 | 遵守说明 |
|------|---------|
| api-contract.md | 后台所有接口调用遵循统一前缀 `/admin/v1/`，响应格式 `{code, data, msg}`，鉴权使用 `Authorization: Bearer <token>` |
| page-dsl-schema.md | 页面装修器产出的页面配置严格遵循 DSL Schema，组件通过 `componentId` 引用物料库 |
| order-state-machine.md | 订单管理页面中状态展示和操作按钮严格按照状态机定义，仅允许合法状态转换 |
| ai-recommendation-contract.md | AI 配置和监控页面遵循 AI 推荐契约，推荐结果展示使用契约定义的格式 |
| database-model.md | 不私自定义或修改数据库表结构，所有数据操作通过后端接口完成 |

---

## 9. 验收标准对照

| 验收标准 | 本方案覆盖 |
|---------|-----------|
| 后台模块覆盖 PRD 和项目树形拆解 | ✅ 8个一级菜单、16个二级菜单覆盖全部业务域 |
| 菜单结构完整 | ✅ 覆盖总览、页面与装修、内容运营、用户与会员、商业变现、活动与预约、智能AI、系统 |
| 路由结构完整 | ✅ 40+ 路由覆盖所有页面，含嵌套和全屏布局 |
| 权限点清单完整 | ✅ 60+ 权限点覆盖菜单权限和操作权限 |
| 角色权限矩阵与 PRD 一致 | ✅ 4个角色权限分配与 PRD 第11节完全对齐 |
| 高风险操作有确认 | ✅ 12项高风险操作需二次确认 |
| 后台页面只使用契约定义的接口 | ✅ 接口依赖清单明确标注对应契约 |
| 不私自定义接口字段 | ✅ 所有接口路径为建议格式，最终以 TASK-BE-002 为准 |
