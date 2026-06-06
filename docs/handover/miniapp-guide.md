# 小程序开发指南

## 1. 项目结构

```
miniapp/
├── app.js              # 应用入口(全局数据、登录逻辑)
├── app.json            # 全局配置(页面路由、TabBar、窗口)
├── app.wxss            # 全局样式
├── project.config.json # 项目配置(AppID等)
├── sitemap.json        # 站点地图
├── components/         # 公共组件
│   └── dsl-renderer/   # DSL渲染引擎
├── services/           # API服务层
│   ├── auth.js         # 认证服务
│   ├── page.js         # 页面服务
│   ├── product.js      # 商品服务
│   ├── order.js        # 订单服务
│   ├── member.js       # 会员服务
│   ├── form-appointment.js # 表单预约服务
│   └── ai.js           # AI服务
├── utils/              # 工具函数
│   ├── request.js      # 网络请求封装
│   └── util.js         # 通用工具
└── pages/              # 页面
    ├── index/          # 首页
    ├── category/       # 分类
    ├── cart/           # 购物车
    ├── mine/           # 我的
    ├── login/          # 登录
    ├── product-list/   # 商品列表
    ├── product-detail/ # 商品详情
    ├── order-create/   # 创建订单
    ├── order-list/     # 订单列表
    ├── order-detail/   # 订单详情
    ├── sign-in/        # 每日签到
    ├── points-log/     # 积分明细
    ├── coupon-list/    # 优惠券列表
    ├── form/           # 动态表单
    ├── appointment-list/  # 预约列表
    ├── appointment-book/  # 预约下单
    ├── my-appointments/   # 我的预约
    ├── member-center/  # 会员中心
    └── ai-chat/        # AI对话
```

## 2. DSL渲染引擎

### 2.1 概述

DSL渲染引擎是小程序的核心组件，支持通过JSON配置动态渲染页面，无需发版即可更新页面布局。

### 2.2 组件类型

| 类型 | 说明 | 属性 |
|------|------|------|
| text | 文本 | content, style |
| image | 图片 | src, mode, width, height |
| button | 按钮 | text, type, disabled |
| list | 列表 | dataSource, itemTemplate |
| grid | 网格 | columns, dataSource, itemTemplate |
| swiper | 轮播 | items, autoplay, interval |
| form | 表单 | fields, submitText |
| input | 输入框 | placeholder, type, required |
| video | 视频 | src, poster, autoplay |
| audio | 音频 | src, title, author |
| map | 地图 | latitude, longitude, markers |
| tabs | 标签页 | items, activeIndex |
| card | 卡片 | title, content, image |

### 2.3 数据源类型

| 类型 | 说明 | 示例 |
|------|------|------|
| static | 静态数据 | `{ type: "static", data: [...] }` |
| api | 接口数据 | `{ type: "api", url: "/api/mp/product/list" }` |
| redis | 缓存数据 | `{ type: "redis", key: "home_banner" }` |
| computed | 计算数据 | `{ type: "computed", expression: "..." }` |

### 2.4 事件类型

| 类型 | 说明 | 参数 |
|------|------|------|
| navigate | 页面跳转 | url, type(redirectTo/navigateTo/switchTab) |
| request | 发起请求 | url, method, params |
| share | 分享 | title, path, imageUrl |
| copy | 复制到剪贴板 | content |
| phone | 拨打电话 | number |
| custom | 自定义事件 | handler, params |

## 3. 页面路由

app.json中注册的所有页面：

| 页面路径 | 说明 | TabBar |
|----------|------|--------|
| pages/index/index | 首页(DSL渲染) | 是 |
| pages/category/category | 分类 | 是 |
| pages/cart/cart | 购物车 | 是 |
| pages/mine/mine | 我的 | 是 |
| pages/login/login | 登录 | 否 |
| pages/product-list/product-list | 商品列表 | 否 |
| pages/product-detail/product-detail | 商品详情 | 否 |
| pages/order-create/order-create | 创建订单 | 否 |
| pages/order-list/order-list | 订单列表 | 否 |
| pages/order-detail/order-detail | 订单详情 | 否 |
| pages/sign-in/sign-in | 每日签到 | 否 |
| pages/points-log/points-log | 积分明细 | 否 |
| pages/coupon-list/coupon-list | 优惠券列表 | 否 |
| pages/form/form | 动态表单 | 否 |
| pages/appointment-list/appointment-list | 预约列表 | 否 |
| pages/appointment-book/appointment-book | 预约下单 | 否 |
| pages/my-appointments/my-appointments | 我的预约 | 否 |
| pages/member-center/member-center | 会员中心 | 否 |
| pages/ai-chat/ai-chat | AI对话 | 否 |

## 4. 服务层封装

### 4.1 请求封装 (utils/request.js)

```javascript
// 统一请求封装
// - 自动携带Token
// - 统一错误处理
// - 自动刷新Token(401时)
// - 请求/响应拦截
```

### 4.2 认证流程

```
1. wx.login() 获取 code
2. POST /api/mp/auth/login { code } 获取 token + openId
3. token 存入 storage，后续请求自动携带
4. token 过期 → 自动刷新或重新登录
```

### 4.3 微信支付流程

```
1. 用户下单 → POST /api/mp/order/create
2. 发起支付 → POST /api/mp/order/{id}/pay
3. 后端调用微信支付统一下单 → 返回支付参数
4. wx.requestPayment() 唤起支付
5. 支付成功 → 后端接收微信回调 → 更新订单状态
6. 前端轮询或监听订单状态变化
```

## 5. 开发注意事项

### 5.1 必须修改的配置

- `project.config.json` 中的 `appid` → 替换为实际AppID
- `app.js` 中的 `BASE_URL` → 替换为生产环境API地址
- TabBar图标 → 替换1x1占位图为正式图标

### 5.2 已知限制

- `wx.getUserProfile` 在部分基础库版本已废弃，需关注微信官方公告
- 讯飞AI对话使用WebSocket，需确保服务器支持
- 图片上传依赖对象存储服务，需提前配置CORS

### 5.3 调试

1. 微信开发者工具打开项目
2. 确保AppID正确(或使用测试号)
3. 不校验合法域名(开发阶段)
4. Console查看日志
