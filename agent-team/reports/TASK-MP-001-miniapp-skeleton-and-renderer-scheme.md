# 小程序骨架与动态渲染方案

## 文档信息

| 项目 | 内容 |
| --- | --- |
| 任务编号 | TASK-MP-001 |
| 负责 Agent | miniapp-agent |
| 版本 | V1.0 |
| 日期 | 2026-05-11 |
| 依赖任务 | TASK-BE-003（页面 DSL 初稿）、TASK-REL-001（微信小程序资质确认） |
| 输入契约 | page-dsl-schema.md、api-contract.md |

---

## 1. 技术选型

### 1.1 框架选择：微信小程序原生开发

| 选项 | 评估 |
| --- | --- |
| 微信小程序原生 | ✅ 动态渲染能力最强，组件映射直接，无框架中间层损耗，微信开发者工具支持最佳 |
| Taro 3 | ⚠️ 跨端能力强，但动态组件渲染需额外处理，调试链路更长 |
| uni-app | ⚠️ Vue 生态友好，但动态渲染需要 renderjs 或自定义组件，复杂度较高 |

**结论**：选择微信小程序原生开发，原因：

1. 本项目核心能力是「按页面 DSL 动态渲染」，原生开发可直接使用 `Component` 构造器动态创建组件，无需绕过框架限制。
2. 微信支付、订阅消息、登录授权等原生 API 调用无兼容层损耗。
3. 真机调试和开发者工具调试链路最短。
4. 后续如需跨端，可将渲染器逻辑抽离为适配层。

### 1.2 项目结构

```
miniapp/
├── app.js                    # 小程序入口，全局生命周期
├── app.json                  # 全局配置（页面路由、TabBar、窗口、合法域名声明）
├── app.wxss                  # 全局样式
├── project.config.json       # 项目配置（AppID、编译设置）
├── sitemap.json              # 站点地图
│
├── config/
│   ├── env.js                # 环境配置（开发/测试/预发布/生产）
│   └── api.js                # API 基础路径与接口地址常量
│
├── utils/
│   ├── request.js            # 网络请求封装（鉴权、错误处理、重试）
│   ├── auth.js               # 登录授权工具（wx.login → code → token）
│   ├── storage.js            # 本地存储封装（token、用户信息、页面缓存）
│   ├── emitter.js            # 全局事件总线
│   └── helpers.js            # 通用工具函数（格式化、校验、节流防抖）
│
├── services/
│   ├── page-service.js       # 页面配置拉取服务
│   ├── content-service.js    # 内容接口服务
│   ├── product-service.js    # 商品接口服务
│   ├── order-service.js      # 订单接口服务
│   ├── member-service.js     # 会员接口服务
│   ├── activity-service.js   # 活动接口服务
│   ├── booking-service.js    # 预约接口服务
│   ├── ai-service.js         # AI 对话接口服务
│   └── upload-service.js     # 文件上传服务
│
├── renderer/
│   ├── engine.js             # 动态渲染引擎核心（解析 DSL → 渲染组件树）
│   ├── component-map.js      # 组件类型 → 组件路径映射表
│   ├── data-source-resolver.js  # 数据源解析器（拉取接口数据并注入组件）
│   ├── action-handler.js     # 跳转与交互行为处理器
│   └── fallback.js           # 异常兜底渲染策略
│
├── components/               # 通用基础组件
│   ├── loading/              # 加载状态
│   ├── empty/                # 空状态
│   ├── error/                # 错误状态
│   ├── navbar/               # 自定义导航栏
│   └── tabbar/               # 自定义 TabBar（如需动态配置）
│
├── dynamic-components/       # DSL 可映射的动态组件
│   ├── banner/               # Banner 轮播
│   ├── quick-nav/            # 快捷导航
│   ├── product-list/         # 商品列表
│   ├── article-list/         # 文章列表
│   ├── activity-entry/       # 活动入口
│   ├── member-card/          # 会员卡
│   ├── coupon-widget/        # 优惠券组件
│   ├── video-player/         # 视频组件
│   ├── countdown/            # 倒计时组件
│   └── float-button/         # 悬浮按钮
│
├── pages/                    # 页面
│   ├── index/                # 首页（动态渲染）
│   ├── content/
│   │   ├── list/             # 内容列表
│   │   └── detail/           # 内容详情
│   ├── mall/
│   │   ├── list/             # 商城列表
│   │   └── detail/           # 商品详情
│   ├── cart/                 # 购物车
│   ├── order/
│   │   ├── confirm/          # 确认订单
│   │   ├── payment/          # 支付结果
│   │   └── list/             # 订单列表
│   ├── member/
│   │   ├── center/           # 会员中心
│   │   └── benefits/         # 会员权益
│   ├── activity/
│   │   ├── detail/           # 活动详情
│   │   └── signup/           # 活动报名
│   ├── booking/
│   │   ├── service/          # 预约服务
│   │   └── confirm/          # 预约确认
│   ├── ai/
│   │   └── chat/             # AI 助手对话
│   └── my/                   # 我的
│
└── assets/
    ├── images/               # 静态图片
    └── icons/                # 图标资源
```

---

## 2. 登录授权方案

### 2.1 授权流程

```
小程序启动
  │
  ├─→ 检查本地 token（storage.js）
  │     ├─→ token 有效 → 直接进入首页
  │     └─→ token 无效/过期 → 执行静默登录
  │
  └─→ 静默登录流程
        │
        ├─→ wx.login() 获取 code
        ├─→ 调用后端 /api/auth/wx-login，传入 code
        ├─→ 后端返回 token + 用户信息
        │     ├─→ 已绑定手机号 → 存储 token，进入首页
        │     └─→ 未绑定手机号 → 弹出手机号授权
        │
        └─→ 手机号授权（按需触发）
              ├─→ 使用 <button open-type="getPhoneNumber"> 获取加密数据
              ├─→ 调用后端 /api/auth/bind-phone，传入加密数据
              └─→ 后端解密并绑定，返回更新后 token
```

### 2.2 关键实现要点

| 要点 | 说明 |
| --- | --- |
| 静默登录 | 每次启动执行 `wx.login`，不强制用户授权，无感获取 token |
| 手机号授权 | 仅在需要用户身份的操作时触发（下单、预约、领券），不提前弹窗 |
| token 管理 | 存储到本地，设置过期时间，请求拦截器自动携带和刷新 |
| 用户信息 | 昵称、头像等使用 `<button open-type="chooseAvatar">` 按需获取 |
| 多端一致性 | 同一用户在小程序和后台共享用户 ID，通过 unionid 关联 |

### 2.3 授权相关接口（预期）

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| /api/auth/wx-login | POST | 微信 code 换取 token |
| /api/auth/bind-phone | POST | 绑定手机号 |
| /api/auth/refresh | POST | 刷新 token |
| /api/user/profile | GET | 获取用户信息 |

> ⚠️ 以上接口路径为预期设计，最终以 api-contract.md 冻结版本为准。

---

## 3. 接口封装方案

### 3.1 请求封装（request.js）

```javascript
// 核心能力：
// 1. 统一 baseURL，按环境切换
// 2. 自动携带 token（header: Authorization）
// 3. 统一错误处理（网络错误、401 鉴权失败、业务错误码）
// 4. 401 自动触发静默登录重试
// 5. 请求超时控制（默认 10s，AI 对话接口 30s）
// 6. 请求/响应日志（开发环境）
```

### 3.2 错误码处理策略

| 错误码 | 处理 |
| --- | --- |
| 401 | 清除本地 token，触发静默登录，登录成功后重试原请求 |
| 403 | 提示无权限，引导返回首页 |
| 429 | 提示操作频繁，延迟重试 |
| 500 | 提示服务异常，展示错误状态组件 |
| 业务错误码 | 按 api-contract.md 定义的错误码表展示对应提示 |

### 3.3 合法域名要求

| 类型 | 域名用途 | 配置位置 |
| --- | --- | --- |
| request 合法域名 | API 接口基础路径 | 微信公众平台 → 开发管理 → 开发设置 |
| uploadFile 合法域名 | 文件上传地址 | 同上 |
| downloadFile 合法域名 | 文件下载地址 | 同上 |
| socket 合法域名 | AI 对话 WebSocket（如使用） | 同上 |

> ⚠️ 开发阶段可在微信开发者工具中勾选「不校验合法域名」，生产环境必须配置合法域名。

---

## 4. 动态渲染引擎方案

### 4.1 渲染流程

```
用户访问页面（如首页）
  │
  ├─→ 页面 onLoad 读取页面路径标识（pageKey）
  │
  ├─→ 调用 page-service.getPageConfig(pageKey)
  │     ├─→ 优先读取本地缓存（版本号比对）
  │     └─→ 缓存失效则请求后端 /api/page/config?pageKey=xxx
  │
  ├─→ 获取页面 DSL 配置
  │     {
  │       "pageKey": "home",
  │       "version": 12,
  │       "title": "首页",
  │       "components": [
  │         { "type": "banner", "props": { ... }, "dataSource": { ... } },
  │         { "type": "quick-nav", "props": { ... } },
  │         { "type": "product-list", "props": { ... }, "dataSource": { ... } }
  │       ]
  │     }
  │
  ├─→ engine.parse(dsl)
  │     ├─→ 遍历 components 数组
  │     ├─→ 通过 component-map.js 查找组件路径
  │     ├─→ 解析 dataSource 配置
  │     └─→ 返回渲染组件列表
  │
  ├─→ data-source-resolver.resolve(components)
  │     ├─→ 识别 dataSource.type（product-list / article-list / activity 等）
  │     ├─→ 调用对应 service 拉取数据
  │     └─→ 将数据注入到组件的 data 中
  │
  ├─→ 页面 setData 渲染组件树
  │
  └─→ action-handler 监听组件交互事件
        ├─→ 页面跳转（navigateTo / switchTab）
        ├─→ 商品详情跳转
        ├─→ 活动报名跳转
        └─→ 外部链接（web-view，需配置业务域名）
```

### 4.2 组件映射表（component-map.js）

| DSL type | 组件路径 | 说明 |
| --- | --- | --- |
| banner | /dynamic-components/banner | 轮播图 |
| quick-nav | /dynamic-components/quick-nav | 快捷导航宫格 |
| product-list | /dynamic-components/product-list | 商品列表（宫格/横滑） |
| article-list | /dynamic-components/article-list | 文章列表 |
| activity-entry | /dynamic-components/activity-entry | 活动入口卡片 |
| member-card | /dynamic-components/member-card | 会员卡展示 |
| coupon-widget | /dynamic-components/coupon-widget | 优惠券领取展示 |
| video-player | /dynamic-components/video-player | 视频播放 |
| countdown | /dynamic-components/countdown | 倒计时 |
| float-button | /dynamic-components/float-button | 悬浮按钮 |

> 映射表可扩展。后续新增组件只需在 component-map.js 注册，并在 dynamic-components/ 下新增对应组件目录。

### 4.3 数据源解析器（data-source-resolver.js）

| dataSource.type | 拉取方式 | 说明 |
| --- | --- | --- |
| product-list | product-service.getList(filters) | 按分类、推荐、销量等筛选商品 |
| article-list | content-service.getList(filters) | 按分类、推荐筛选文章 |
| activity-list | activity-service.getList(filters) | 拉取进行中的活动 |
| coupon-list | member-service.getAvailableCoupons() | 拉取可领取优惠券 |
| custom | 自定义接口路径 | 按 dataSource.api 和 dataSource.params 调用 |

数据源解析规则：

1. 每个组件的 `dataSource` 字段包含 `type`（数据源类型）和 `params`（筛选参数）。
2. 渲染引擎在页面初始化时统一收集所有组件的数据源需求。
3. 相同类型的数据源合并请求，避免重复调用。
4. 数据源加载失败时，该组件展示 fallback 兜底样式，不影响其他组件渲染。

### 4.4 交互行为处理器（action-handler.js）

| action.type | 行为 | 参数 |
| --- | --- | --- |
| navigate | wx.navigateTo | url, pageKey |
| switchTab | wx.switchTab | tabKey |
| product-detail | 跳转商品详情 | productId |
| article-detail | 跳转内容详情 | articleId |
| activity-detail | 跳转活动详情 | activityId |
| booking | 跳转预约服务 | serviceId |
| coupon-receive | 领取优惠券 | couponId |
| phone-call | 拨打电话 | phoneNumber |
| webview | 打开网页 | url（需配置业务域名） |
| ai-chat | 跳转 AI 对话 | 无 |

### 4.5 异常兜底策略（fallback.js）

| 异常场景 | 兜底策略 |
| --- | --- |
| 页面配置拉取失败 | 展示全局错误页，提供「重新加载」按钮 |
| 页面配置为空 | 展示空状态页面，提示「页面暂未配置」 |
| 单个组件数据源加载失败 | 该组件展示骨架屏或空状态，不影响其他组件 |
| 组件类型未注册 | 渲染为空白占位，控制台输出警告 |
| 组件渲染异常 | try-catch 包裹，降级为文字提示 |
| 网络断开 | 全局网络状态监听，断网时展示提示条 |

### 4.6 页面缓存策略

| 策略 | 说明 |
| --- | --- |
| 配置缓存 | 页面 DSL 配置缓存到本地，携带版本号，下次请求时比对版本 |
| 数据缓存 | 商品列表、文章列表等数据短时缓存（5 分钟），减少重复请求 |
| 缓存失效 | 版本号变更时自动失效；下拉刷新时强制更新 |
| 首屏优化 | 优先渲染本地缓存配置，同时异步请求最新配置，有更新时重新渲染 |

---

## 5. 页面结构方案

### 5.1 TabBar 配置

根据 PRD 要求，底部导航为：首页、内容、AI 助手、商城、我的。

| Tab | 页面路径 | 图标 | 说明 |
| --- | --- | --- | --- |
| 首页 | /pages/index/index | home | 动态渲染首页 |
| 内容 | /pages/content/list/index | content | 内容列表 |
| AI 助手 | /pages/ai/chat/index | ai | AI 对话页 |
| 商城 | /pages/mall/list/index | mall | 商品列表 |
| 我的 | /pages/my/index | my | 个人中心 |

> TabBar 配置支持后台动态修改（系统设置 → 底部导航管理），需配合自定义 TabBar 组件实现。

### 5.2 页面分类

| 分类 | 页面 | 渲染方式 |
| --- | --- | --- |
| 动态渲染页 | 首页、专题页 | 通过渲染引擎按 DSL 动态渲染 |
| 数据驱动页 | 内容列表/详情、商品列表/详情、订单列表、会员中心等 | 固定页面结构，数据来自接口 |
| 交互流程页 | 购物车、确认订单、支付结果、活动报名、预约确认 | 固定页面结构，包含表单和状态流转 |
| 对话页 | AI 助手 | 固定页面结构，对话数据来自 AI 接口 |

### 5.3 动态渲染页实现

动态渲染页（如首页）的核心 WXML 结构：

```xml
<!-- pages/index/index.wxml -->
<view class="page-container">
  <!-- 自定义导航栏 -->
  <navbar title="{{pageTitle}}" />

  <!-- 动态组件渲染区域 -->
  <block wx:for="{{renderComponents}}" wx:key="id">
    <!-- Banner 轮播 -->
    <banner wx:if="{{item.type === 'banner'}}" props="{{item.props}}" data="{{item.data}}" bind:action="onAction" />

    <!-- 快捷导航 -->
    <quick-nav wx:elif="{{item.type === 'quick-nav'}}" props="{{item.props}}" bind:action="onAction" />

    <!-- 商品列表 -->
    <product-list wx:elif="{{item.type === 'product-list'}}" props="{{item.props}}" data="{{item.data}}" bind:action="onAction" />

    <!-- 文章列表 -->
    <article-list wx:elif="{{item.type === 'article-list'}}" props="{{item.props}}" data="{{item.data}}" bind:action="onAction" />

    <!-- 活动入口 -->
    <activity-entry wx:elif="{{item.type === 'activity-entry'}}" props="{{item.props}}" data="{{item.data}}" bind:action="onAction" />

    <!-- 会员卡 -->
    <member-card wx:elif="{{item.type === 'member-card'}}" props="{{item.props}}" data="{{item.data}}" bind:action="onAction" />

    <!-- 优惠券 -->
    <coupon-widget wx:elif="{{item.type === 'coupon-widget'}}" props="{{item.props}}" data="{{item.data}}" bind:action="onAction" />

    <!-- 视频组件 -->
    <video-player wx:elif="{{item.type === 'video-player'}}" props="{{item.props}}" data="{{item.data}}" bind:action="onAction" />

    <!-- 倒计时 -->
    <countdown wx:elif="{{item.type === 'countdown'}}" props="{{item.props}}" />

    <!-- 悬浮按钮 -->
    <float-button wx:elif="{{item.type === 'float-button'}}" props="{{item.props}}" bind:action="onAction" />

    <!-- 未识别组件兜底 -->
    <view wx:else class="component-fallback">组件加载中</view>
  </block>

  <!-- 全局悬浮按钮（固定定位） -->
  <float-button wx:if="{{globalFloatButton}}" props="{{globalFloatButton}}" bind:action="onAction" />
</view>
```

> ⚠️ 微信小程序不支持真正的动态组件创建（如 Web 端的 `createElement`），因此采用 `wx:if/wx:elif` 条件渲染方式，根据 DSL 中的 `type` 字段分发到对应组件。这是微信小程序动态渲染的标准实践。

---

## 6. 微信开发者工具与调试要求

### 6.1 开发环境配置

| 配置项 | 要求 |
| --- | --- |
| 微信开发者工具版本 | 最新稳定版 |
| AppID | 使用真实 AppID（不使用测试号），确保登录授权和支付调试正常 |
| 编译模式 | 添加常用页面编译模式，支持直接调试子页面 |
| 不校验合法域名 | 开发阶段勾选，生产阶段必须取消 |
| ES6 转 ES5 | 开启 |
| 增强编译 | 开启 |
| 上传代码时自动压缩 | 开启 |
| 上传代码时样式自动补全 | 开启 |

### 6.2 调试检查清单

| 调试项 | 检查内容 |
| --- | --- |
| 登录授权 | wx.login → code 获取 → 后端换 token → token 存储 |
| 手机号授权 | getPhoneNumber 加密数据 → 后端解密 → 绑定成功 |
| 接口请求 | request 合法域名配置 → 请求携带 token → 响应正常 |
| 页面渲染 | DSL 配置拉取 → 组件正确渲染 → 数据源加载正常 |
| 图片加载 | uploadFile/downloadFile 合法域名 → 图片正常展示 |
| 支付调试 | 微信支付沙盒环境 → 下单 → 支付参数 → 支付回调 |
| 订阅消息 | 模板 ID 配置 → 用户授权 → 消息触发和送达 |
| 真机预览 | 预览码扫码 → iOS/Android 双端验证 |
| 体验版 | 上传体验版 → 内部人员扫码验收 |

### 6.3 真机调试注意事项

| 事项 | 说明 |
| --- | --- |
| 网络请求 | 真机必须配置合法域名，开发者工具的「不校验」设置不生效 |
| 登录授权 | 真机 wx.login 获取的 code 与开发者工具不同，需真实 AppID |
| 支付调试 | 真机支付需要真实商户号和沙盒环境配置 |
| 订阅消息 | 真机才能测试订阅消息授权弹窗和消息送达 |
| 性能差异 | 真机性能低于开发者工具模拟器，需关注首屏渲染时间和列表滚动流畅度 |
| 兼容性 | 需覆盖 iOS 和 Android 主流微信版本（最近 2 个大版本） |

---

## 7. 微信平台配置要求

### 7.1 合法域名配置

| 域名类型 | 用途 | 配置时机 |
| --- | --- | --- |
| request 合法域名 | API 接口调用 | 后端服务部署后 |
| uploadFile 合法域名 | 图片/视频/文件上传 | 对象存储配置后 |
| downloadFile 合法域名 | 文件下载 | 对象存储配置后 |
| socket 合法域名 | AI 对话 WebSocket（如使用） | AI 服务部署后 |
| 业务域名 | web-view 内嵌网页 | 有外部链接需求时 |

> 所有域名必须为 HTTPS，且已通过 ICP 备案。

### 7.2 隐私协议与用户信息

| 配置项 | 要求 |
| --- | --- |
| 隐私协议 | 在微信公众平台配置《用户隐私保护指引》，声明收集手机号、位置等信息的用途 |
| 用户信息接口 | 使用 wx.getUserProfile 或头像昵称填写能力，需在隐私协议中声明 |
| 手机号接口 | 使用 getPhoneNumber，需在隐私协议中声明 |
| 订阅消息 | 每个模板需在微信平台申请审核通过 |

### 7.3 小程序类目

根据业务范围，需配置以下类目：

| 类目 | 用途 |
| --- | --- |
| 电商 → 综合电商 | 商品交易 |
| 工具 → 信息查询 | 内容展示 |
| 生活服务 → 预约服务 | 预约服务 |
| 商业服务 → 商业活动 | 活动报名 |

> 具体类目以 TASK-REL-001 确认结果为准。

---

## 8. 支付与订阅消息预留

### 8.1 微信支付预留

| 预留项 | 说明 |
| --- | --- |
| 支付接口 | /api/order/create-payment → 后端统一下单 → 返回支付参数 |
| 支付调用 | wx.requestPayment，传入后端返回的支付参数 |
| 支付结果 | 支付成功后跳转支付结果页，同时轮询订单状态确认 |
| 支付回调 | 后端接收微信支付回调，更新订单状态，小程序端通过轮询或页面刷新获取最新状态 |

> ⚠️ 支付状态流转严格遵循 order-state-machine.md 契约，小程序端不自行修改支付状态。

### 8.2 订阅消息预留

| 触发场景 | 模板内容 | 模板 ID 配置 |
| --- | --- | --- |
| 订单支付成功 | 订单号、商品、金额、时间 | 后台系统设置配置 |
| 订单发货通知 | 订单号、物流公司、物流单号 | 同上 |
| 活动报名审核通过 | 活动名称、时间、地点 | 同上 |
| 预约确认通知 | 服务名称、日期、时间段 | 同上 |
| 优惠券到期提醒 | 优惠券名称、到期时间 | 同上 |

实现方式：

1. 在需要订阅消息的页面（如支付成功页、报名成功页），调用 `wx.requestSubscribeMessage` 请求用户授权。
2. 用户授权后，后端在对应业务触发点调用微信订阅消息接口发送。
3. 模板 ID 从后台系统设置接口获取，不硬编码在小程序端。

---

## 9. 首批动态组件清单

| 组件 | DSL type | 核心属性（props） | 数据源（dataSource） | 交互行为（action） |
| --- | --- | --- | --- | --- |
| Banner 轮播 | banner | images[], autoPlay, interval, indicatorDots | 无（图片列表在 props 中配置） | 点击跳转（navigate / product-detail / article-detail） |
| 快捷导航 | quick-nav | items[{icon, title, action}] | 无 | 点击执行 action |
| 商品列表 | product-list | layout(grid/swiper), count, showPrice, showSales | type: product-list, params: {categoryId, sort, limit} | 点击跳转商品详情 |
| 文章列表 | article-list | layout(list/card), count, showCover | type: article-list, params: {categoryId, recommended, limit} | 点击跳转文章详情 |
| 活动入口 | activity-entry | layout(card/banner), showCountdown | type: activity-list, params: {status, limit} | 点击跳转活动详情 |
| 会员卡 | member-card | showLevel, showPoints, showGrowthValue | type: member-info（当前用户会员信息） | 点击跳转会员中心 |
| 优惠券组件 | coupon-widget | layout(list/card), showExpire | type: coupon-list, params: {status, limit} | 点击领取/跳转使用 |
| 视频组件 | video-player | src, poster, autoplay | 无（视频地址在 props 中配置） | 点击播放/跳转 |
| 倒计时 | countdown | targetTime, format, label | 无 | 无 |
| 悬浮按钮 | float-button | icon, action, position | 无 | 点击执行 action |

---

## 10. 与页面 DSL 契约的对接说明

### 10.1 渲染引擎对 DSL 的消费方式

渲染引擎严格消费 `page-dsl-schema.md` 冻结的 DSL 结构，不做以下行为：

1. ❌ 不私自增加 DSL 中未定义的组件类型。
2. ❌ 不私自修改组件属性字段名或结构。
3. ❌ 不绕过数据源配置直接硬编码数据。
4. ✅ 遇到未识别的组件类型时，执行 fallback 兜底渲染。
5. ✅ DSL 字段缺失时使用默认值，不崩溃。

### 10.2 DSL 变更响应

当 `page-dsl-schema.md` 发生变更时：

1. 渲染引擎更新 component-map.js 中的组件映射。
2. 更新对应 dynamic-components 下的组件属性解析逻辑。
3. 更新 data-source-resolver.js 中的数据源类型处理。
4. 提交回执说明变更影响范围。

---

## 11. 与 API 契约的对接说明

### 11.1 接口调用原则

1. 所有接口调用通过 services/ 下的服务模块统一封装。
2. 接口路径、请求参数、响应结构严格遵循 `api-contract.md` 冻结版本。
3. 不私自定义未登记的接口字段。
4. 接口变更需通过回执提交契约变更请求。

### 11.2 小程序端需要的核心接口域

| 接口域 | 用途 | 依赖任务 |
| --- | --- | --- |
| 认证授权 | 登录、绑定手机号、刷新 token | TASK-BE-010 |
| 页面配置 | 获取页面 DSL、版本比对 | TASK-BE-020 |
| 内容 | 内容列表、内容详情 | TASK-BE-030 |
| 商品 | 商品列表、商品详情 | TASK-BE-040 |
| 购物车 | 购物车增删改查 | TASK-BE-040 |
| 订单 | 创建订单、订单列表、订单详情 | TASK-BE-041 |
| 支付 | 统一下单、支付参数 | TASK-BE-041 |
| 会员 | 会员信息、积分、优惠券 | TASK-BE-050 |
| 活动 | 活动列表、活动详情、报名 | TASK-BE-060 |
| 预约 | 预约服务、时间段、提交预约 | TASK-BE-060 |
| AI 对话 | 发送消息、接收推荐 | TASK-AI-021 |
| 文件上传 | 图片、视频上传 | TASK-BE-010 |

---

## 12. 依赖与风险

### 12.1 当前依赖状态

| 依赖 | 状态 | 影响 |
| --- | --- | --- |
| TASK-BE-003（页面 DSL 初稿） | 可启动，待后端 Agent 完成 | DSL 结构未冻结前，渲染引擎和组件映射为预期设计，需在 DSL 冻结后对齐 |
| TASK-REL-001（微信小程序资质确认） | 待开始，待 QA Agent 完成 | AppID 未确认前无法配置真实开发者工具，影响登录和支付调试 |
| api-contract.md | 占位文件，未填充 | 接口路径和字段为预期设计，需在契约冻结后对齐 |

### 12.2 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| DSL 结构与预期不一致 | 渲染引擎和组件需调整 | 方案设计时预留灵活映射，DSL 冻结后快速对齐 |
| 微信小程序审核类目不符 | 无法通过审核 | 提前与 QA Agent 确认类目，确保业务范围在允许类目内 |
| 动态渲染性能问题 | 首页组件过多时渲染慢 | 限制单页组件数量，使用懒加载和虚拟列表 |
| 合法域名未及时配置 | 真机无法请求接口 | 提前与运维确认域名和 HTTPS 配置时间点 |
| 微信 API 版本兼容 | 部分新 API 低版本不支持 | 使用 wx.canIUse 做兼容检查，提供降级方案 |

---

## 13. 后续任务衔接

本方案完成后，下游任务衔接关系：

| 下游任务 | 衔接内容 |
| --- | --- |
| TASK-MP-010（开发小程序基础骨架） | 基于本方案的项目结构、登录授权和接口封装进行开发 |
| TASK-MP-020（开发动态页面渲染器） | 基于本方案的渲染引擎、组件映射和数据源解析器进行开发 |
| TASK-MP-030 ~ TASK-MP-070 | 各业务页面基于本方案的页面结构和 services 层进行开发 |
