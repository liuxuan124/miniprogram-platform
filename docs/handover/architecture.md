# 系统架构文档

## 1. 整体架构

```
┌─────────────────────────────────────────────────┐
│                   用户端                          │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  微信小程序   │  │    管理后台(Vue3)         │  │
│  │  (原生+DSL)  │  │  Element Plus + Vite      │  │
│  └──────┬───────┘  └──────────┬───────────────┘  │
└─────────┼─────────────────────┼──────────────────┘
          │ HTTPS               │ HTTPS
          ▼                     ▼
┌─────────────────────────────────────────────────┐
│              Nginx 反向代理                       │
│  /api/mp/** → 后端    / → 管理后台静态文件        │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│           Spring Boot 后端 (Java 17)             │
│  ┌────────────────────────────────────────────┐  │
│  │  Security 认证层 (JWT + Spring Security)    │  │
│  ├────────────────────────────────────────────┤  │
│  │  Controller 层                             │  │
│  │  ├ admin/  管理端API                       │  │
│  │  └ miniapp/ 小程序端API                    │  │
│  ├────────────────────────────────────────────┤  │
│  │  Service 层 (业务逻辑)                     │  │
│  ├────────────────────────────────────────────┤  │
│  │  Mapper 层 (MyBatis-Plus)                  │  │
│  └────────────────────────────────────────────┘  │
└──────────┬──────────────────────┬───────────────┘
           │                      │
     ┌─────▼─────┐         ┌─────▼─────┐
     │  MySQL 8  │         │  Redis 7  │
     │  主数据库  │         │ 缓存/会话  │
     └───────────┘         └───────────┘
           │
     ┌─────▼──────────────────────┐
     │  第三方服务                  │
     │  ├ 微信开放平台(登录/支付)   │
     │  ├ 讯飞星火(AI对话/推荐)     │
     │  └ 对象存储(文件上传)        │
     └────────────────────────────┘
```

## 2. 后端架构

### 2.1 分层结构

| 层级 | 包路径 | 职责 |
|------|--------|------|
| Controller | `controller.admin` / `controller.miniapp` | 接收请求、参数校验、返回响应 |
| Service | `service` / `service.impl` | 业务逻辑、事务管理 |
| Mapper | `mapper` | 数据访问(MyBatis-Plus) |
| Entity | `entity` | 数据库实体映射 |
| DTO/VO | `dto.*` | 请求参数DTO、响应视图VO |
| Common | `common` | 通用工具、异常、配置 |

### 2.2 安全认证

- **管理端**: JWT Token + Spring Security，登录获取Token，后续请求携带Authorization头
- **小程序端**: 微信登录获取openId，JWT Token绑定用户身份
- **SecurityConfig**: Lambda DSL配置，`/api/mp/**`部分接口permitAll，`/api/admin/**`需认证

### 2.3 统一响应

- `R<T>`: 统一响应包装类，包含code/message/data
- `PageResult<T>`: 分页结果类，包含list/total/page/pageSize
- `BusinessException`: 业务异常，关联ErrorCode枚举
- `GlobalExceptionHandler`: 全局异常处理，统一错误响应格式

### 2.4 错误码规范

6位编码格式：前3-4位标识业务域，末尾01/02/03标识具体错误

| 前缀 | 业务域 |
|------|--------|
| 10xxxx | 通用错误 |
| 20xxxx | 认证相关 |
| 30xxxx | 页面搭建 |
| 40xxxx | 内容管理 |
| 50xxxx | 商品订单 |
| 60xxxx | 会员营销 |
| 70xxxx | 表单预约 |
| 80xxxx | AI服务 |
| 90xxxx | 统计系统 |

## 3. 前端架构(管理后台)

### 3.1 技术选型

- Vue3 + Composition API
- Element Plus UI组件库
- Vite 构建工具
- TypeScript 类型安全
- Pinia 状态管理
- Vue Router 动态路由

### 3.2 路由设计

- `constantRoutes`: 公共路由(登录页、404等)
- `asyncRoutes`: 动态权限路由(根据角色动态加载)
- Layout布局: 侧边栏 + 顶部导航 + 内容区

### 3.3 模块划分

| 模块 | 路径 | 说明 |
|------|------|------|
| 页面搭建 | `/page-builder/*` | 编辑器、模板、版本管理 |
| 内容管理 | `/content/*` | 文章、分类 |
| 商品订单 | `/commerce/*` | 商品、订单 |
| 会员营销 | `/member/*`, `/marketing/*` | 会员、积分、优惠券 |
| 表单预约 | `/form/*`, `/appointment/*` | 模板、提交、服务、时段 |
| AI管理 | `/ai/*` | 对话记录、推荐统计 |
| 数据统计 | `/statistics/*` | 仪表盘、趋势、排行 |
| 系统配置 | `/system/*` | 基础配置、微信、存储、日志 |

## 4. 小程序架构

### 4.1 DSL渲染引擎

核心组件：`components/dsl-renderer/`
- 支持13种组件类型：text/image/button/list/grid/swiper/form/input/video/audio/map/tabs/card
- 支持4种数据源：static/api/redis/computed
- 支持6种事件类型：navigate/request/share/copy/phone/custom

### 4.2 服务层

| 服务 | 文件 | 说明 |
|------|------|------|
| 认证 | `services/auth.js` | 微信登录、Token管理 |
| 页面 | `services/page.js` | DSL页面加载 |
| 商品 | `services/product.js` | 商品列表/详情 |
| 订单 | `services/order.js` | 订单创建/支付 |
| 会员 | `services/member.js` | 签到/积分/优惠券 |
| 表单预约 | `services/form-appointment.js` | 表单提交/预约 |
| AI | `services/ai.js` | AI对话/推荐 |

## 5. 数据库设计

10个Flyway迁移脚本：

| 版本 | 说明 | 核心表 |
|------|------|--------|
| V1 | 用户与认证 | mp_user, mp_wechat_user |
| V2 | 页面搭建 | mp_page, mp_page_version, mp_page_template |
| V3 | 内容管理 | mp_article, mp_category |
| V4 | 商品管理 | mp_product, mp_product_category, mp_product_sku |
| V5 | 订单系统 | mp_order, mp_order_item |
| V6 | 会员营销 | mp_member, mp_member_level, mp_points_log, mp_coupon, mp_user_coupon |
| V7 | 表单预约 | mp_form_template, mp_form_submission, mp_appointment_service, mp_appointment_slot, mp_appointment |
| V8 | AI模块 | mp_ai_conversation, mp_ai_message, mp_ai_recommendation_log |
| V9 | 统计模块 | mp_statistics_daily, mp_page_access_log |
| V10 | 系统设置 | mp_system_config, mp_operation_log |

## 6. 第三方集成

| 服务 | 用途 | 配置项 |
|------|------|--------|
| 微信开放平台 | 小程序登录 | wx.appid, wx.secret |
| 微信支付 | 商品支付 | wx.mch-id, wx.api-key |
| 讯飞星火 | AI对话/推荐 | xunfei.app-id, xunfei.api-key |
| 对象存储 | 文件上传 | storage.type, storage.bucket |
