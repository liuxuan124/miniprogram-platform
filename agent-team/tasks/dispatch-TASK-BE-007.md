# 任务派发: TASK-BE-007 — 实现页面搭建核心引擎

## 你的角色

# 架构与后端 Agent

## Agent 名称

架构与后端 Agent

## 职责范围

- 负责整体技术架构、后端服务设计、数据库模型、接口契约、权限模型和系统配置。
- 负责页面 DSL 后端存储与发布接口。
- 负责内容、商品、订单、支付、退款、会员、营销、表单、活动、预约等后端能力。
- 负责微信支付 API v3、支付回调、退款回调、幂等处理和交易日志。
- 负责后端操作日志、数据字典、文件上传、素材接口和基础安全能力。

## 允许修改范围

- 后端服务代码。
- 数据库迁移或数据库设计文档。
- API 契约相关文档。
- 页面 DSL、订单状态机、AI 推荐数据接口等契约文件。
- 后端测试、接口测试和后端配置示例。

## 禁止修改范围

- 不直接修改管理后台 UI 页面实现。
- 不直接修改小程序页面实现。
- 不直接修改 AI 前端交互、Prompt 展示样式或对话页面。
- 不私自改变已冻结契约；如需调整，必须在回执中标记为契约变更请求。

## 输入物

- PRD。
- 实施计划。
- 项目树形拆解。
- 任务队列中的后端任务。
- `agent-team/contracts/` 下的已冻结契约。

## 输出物

- 数据库模型或迁移说明。
- API 接口实现与接口说明。
- 页面 DSL 存储与发布能力。
- 订单、支付、退款、营销等业务规则实现。
- 后端自测结果。
- 结构化任务回执。

## 必须读取的契约

- `agent-team/contracts/api-contract.md`
- `agent-team/contracts/database-model.md`
- `agent-team/contracts/page-dsl-schema.md`
- `agent-team/contracts/order-state-machine.md`
- `agent-team/contracts/ai-recommendation-contract.md`

## 必须提交的回执

完成任何任务后，在 `agent-team/receipts/` 下按回执模板提交结构化回执。

## 验收标准

- 接口字段、状态、错误码和权限规则与契约一致。
- 后台、小程序、AI Agent 可按契约调用。
- 关键业务接口具备自测结果。
- 不产生跨模块字段私改或状态私改。


## 任务详情

- **任务编号**: TASK-BE-007
- **任务标题**: 实现页面搭建核心引擎
- **所属阶段**: 03-foundation-development
- **优先级**: P0
- **依赖任务**: ['TASK-BE-005', 'TASK-BE-003']

## 验收标准

- 页面可创建、编辑、发布
- DSL 可正确存储和读取

## 预期输出

- 页面 CRUD
- 组件配置存储
- DSL 发布与版本管理

## 输入契约


--- 契约: agent-team/contracts/page-dsl-schema.md ---
# 页面 DSL / JSON Schema 初稿

> 任务编号：TASK-BE-003
> 所属阶段：02-foundation-contracts
> 输出状态：初稿，待总控冻结

---

## 1. 设计原则

1. 页面 DSL 是管理后台页面装修器与小程序动态渲染器之间的核心契约。
2. 管理后台产出 DSL，小程序端按 DSL 渲染，双方不得各自定义不同结构。
3. DSL 采用 JSON 格式，结构清晰、可扩展、可校验。
4. 组件类型、属性、数据源和跳转行为均在本文件中统一定义。
5. 新增组件类型或属性必须通过契约变更请求。

---

## 2. 页面 DSL 顶层结构

```json
{
  "schema_version": "1.0",
  "page": {
    "id": "page_001",
    "name": "首页",
    "type": "home",
    "path": "pages/index/index",
    "share_title": "欢迎访问",
    "share_image": "https://cdn.example.com/share.jpg",
    "background_color": "#f5f5f5"
  },
  "components": [
    {
      "id": "comp_001",
      "type": "banner",
      "props": { ... },
      "data_source": { ... },
      "actions": { ... },
      "style": { ... }
    }
  ],
  "global_config": {
    "pull_refresh": true,
    "reach_bottom_load": false
  }
}
```

### 2.1 顶层字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| schema_version | String | 是 | DSL 版本号，当前 "1.0" |
| page | Object | 是 | 页面元信息 |
| components | Array | 是 | 组件列表，按渲染顺序排列 |
| global_config | Object | 否 | 页面全局配置 |

### 2.2 page 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 页面 ID |
| name | String | 是 | 页面名称 |
| type | String | 是 | 页面类型：home / topic / custom |
| path | String | 是 | 小程序路径 |
| share_title | String | 否 | 分享标题 |
| share_image | String | 否 | 分享封面图 URL |
| background_color | String | 否 | 页面背景色，如 "#f5f5f5" |

---

## 3. 组件通用结构

每个组件包含以下字段：

```json
{
  "id": "comp_001",
  "type": "banner",
  "props": {},
  "data_source": null,
  "actions": null,
  "style": {}
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | String | 是 | 组件实例 ID，页面内唯一 |
| type | String | 是 | 组件类型（见第 4 节） |
| props | Object | 是 | 组件属性（各类型不同） |
| data_source | Object/null | 否 | 数据源绑定（见第 5 节） |
| actions | Object/null | 否 | 跳转行为（见第 6 节） |
| style | Object/null | 否 | 样式覆盖（见第 7 节） |

---

## 4. 组件类型定义

### 4.1 banner — 轮播组件

```json
{
  "type": "banner",
  "props": {
    "autoplay": true,
    "interval": 3000,
    "indicator_dots": true,
    "indicator_color": "rgba(255,255,255,0.5)",
    "indicator_active_color": "#ffffff",
    "circular": true,
    "height": 360,
    "border_radius": 0,
    "items": [
      {
        "image_url": "https://cdn.example.com/banner1.jpg",
        "title": "活动标题",
        "actions": {
          "type": "page",
          "target": "/pages/activity/detail?id=act_001"
        }
      }
    ]
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| autoplay | Boolean | 否 | true | 自动播放 |
| interval | Integer | 否 | 3000 | 切换间隔（毫秒） |
| indicator_dots | Boolean | 否 | true | 显示指示点 |
| indicator_color | String | 否 | "rgba(255,255,255,0.5)" | 指示点颜色 |
| indicator_active_color | String | 否 | "#ffffff" | 当前指示点颜色 |
| circular | Boolean | 否 | true | 循环播放 |
| height | Integer | 否 | 360 | 高度（rpx） |
| border_radius | Integer | 否 | 0 | 圆角（rpx） |
| items | Array | 是 | — | 轮播项列表 |

**banner item 结构**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| image_url | String | 是 | 图片地址 |
| title | String | 否 | 标题（无障碍） |
| actions | Object | 否 | 点击行为（见第 6 节） |

### 4.2 nav — 快捷导航组件

```json
{
  "type": "nav",
  "props": {
    "columns": 4,
    "rows": 2,
    "icon_size": 48,
    "font_size": 24,
    "items": [
      {
        "icon_url": "https://cdn.example.com/icon1.png",
        "label": "商品",
        "actions": {
          "type": "page",
          "target": "/pages/product/list"
        }
      }
    ]
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| columns | Integer | 否 | 4 | 每行列数 |
| rows | Integer | 否 | 2 | 显示行数 |
| icon_size | Integer | 否 | 48 | 图标大小（rpx） |
| font_size | Integer | 否 | 24 | 文字大小（rpx） |
| items | Array | 是 | — | 导航项列表 |

**nav item 结构**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| icon_url | String | 是 | 图标地址 |
| label | String | 是 | 文字标签 |
| actions | Object | 否 | 点击行为 |

### 4.3 product_list — 商品列表组件

```json
{
  "type": "product_list",
  "props": {
    "layout": "grid",
    "columns": 2,
    "show_price": true,
    "show_original_price": true,
    "show_sales": true,
    "show_tag": true,
    "tag_text": "热卖",
    "item_border_radius": 12,
    "image_ratio": "1:1"
  },
  "data_source": {
    "type": "product",
    "query": {
      "category_id": null,
      "status": "on_sale",
      "sort_by": "sales",
      "sort_order": "desc",
      "limit": 6
    }
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| layout | String | 否 | "grid" | 布局：grid / list / waterfall |
| columns | Integer | 否 | 2 | 列数（grid 布局） |
| show_price | Boolean | 否 | true | 显示售价 |
| show_original_price | Boolean | 否 | true | 显示原价 |
| show_sales | Boolean | 否 | true | 显示销量 |
| show_tag | Boolean | 否 | false | 显示角标 |
| tag_text | String | 否 | "" | 角标文字 |
| item_border_radius | Integer | 否 | 12 | 卡片圆角（rpx） |
| image_ratio | String | 否 | "1:1" | 图片比例：1:1 / 3:4 / 16:9 |

### 4.4 article_list — 文章列表组件

```json
{
  "type": "article_list",
  "props": {
    "layout": "card",
    "show_cover": true,
    "show_summary": true,
    "show_date": true,
    "show_view_count": false,
    "image_position": "left",
    "limit": 5
  },
  "data_source": {
    "type": "content",
    "query": {
      "category_id": null,
      "is_recommended": true,
      "sort_by": "published_at",
      "sort_order": "desc",
      "limit": 5
    }
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| layout | String | 否 | "card" | 布局：card / list / compact |
| show_cover | Boolean | 否 | true | 显示封面 |
| show_summary | Boolean | 否 | true | 显示摘要 |
| show_date | Boolean | 否 | true | 显示日期 |
| show_view_count | Boolean | 否 | false | 显示阅读量 |
| image_position | String | 否 | "left" | 图片位置：left / right / top |
| limit | Integer | 否 | 5 | 显示数量 |

### 4.5 activity_entry — 活动入口组件

```json
{
  "type": "activity_entry",
  "props": {
    "layout": "card",
    "show_countdown": true,
    "show_quota": true,
    "show_location": true,
    "limit": 3
  },
  "data_source": {
    "type": "activity",
    "query": {
      "status": "registering",
      "is_recommended": true,
      "sort_by": "start_time",
      "sort_order": "asc",
      "limit": 3
    }
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| layout | String | 否 | "card" | 布局：card / banner / list |
| show_countdown | Boolean | 否 | true | 显示倒计时 |
| show_quota | Boolean | 否 | true | 显示名额 |
| show_location | Boolean | 否 | true | 显示地点 |
| limit | Integer | 否 | 3 | 显示数量 |

### 4.6 member_card — 会员卡组件

```json
{
  "type": "member_card",
  "props": {
    "theme": "gradient",
    "primary_color": "#667eea",
    "secondary_color": "#764ba2",
    "show_level": true,
    "show_points": true,
    "show_growth": true,
    "show_coupon_count": true,
    "login_prompt": true
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| theme | String | 否 | "gradient" | 主题：gradient / solid / image |
| primary_color | String | 否 | "#667eea" | 主色 |
| secondary_color | String | 否 | "#764ba2" | 副色（渐变时使用） |
| show_level | Boolean | 否 | true | 显示等级 |
| show_points | Boolean | 否 | true | 显示积分 |
| show_growth | Boolean | 否 | true | 显示成长值 |
| show_coupon_count | Boolean | 否 | true | 显示优惠券数量 |
| login_prompt | Boolean | 否 | true | 未登录时显示登录引导 |

### 4.7 coupon — 优惠券组件

```json
{
  "type": "coupon",
  "props": {
    "layout": "horizontal",
    "show_claim_button": true,
    "show_rule": true,
    "limit": 4
  },
  "data_source": {
    "type": "coupon",
    "query": {
      "status": "active",
      "sort_by": "created_at",
      "sort_order": "desc",
      "limit": 4
    }
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| layout | String | 否 | "horizontal" | 布局：horizontal / vertical / stack |
| show_claim_button | Boolean | 否 | true | 显示领取按钮 |
| show_rule | Boolean | 否 | true | 显示使用规则 |
| limit | Integer | 否 | 4 | 显示数量 |

### 4.8 video — 视频组件

```json
{
  "type": "video",
  "props": {
    "video_url": "https://cdn.example.com/video.mp4",
    "poster_url": "https://cdn.example.com/poster.jpg",
    "autoplay": false,
    "loop": false,
    "muted": false,
    "controls": true,
    "object_fit": "contain",
    "height": 420
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| video_url | String | 是 | — | 视频地址 |
| poster_url | String | 否 | — | 封面图 |
| autoplay | Boolean | 否 | false | 自动播放 |
| loop | Boolean | 否 | false | 循环播放 |
| muted | Boolean | 否 | false | 静音 |
| controls | Boolean | 否 | true | 显示控制栏 |
| object_fit | String | 否 | "contain" | 填充模式：contain / cover / fill |
| height | Integer | 否 | 420 | 高度（rpx） |

### 4.9 countdown — 倒计时组件

```json
{
  "type": "countdown",
  "props": {
    "target_time": "2026-06-01T10:00:00+08:00",
    "label": "距活动开始",
    "format": "dhms",
    "theme": "card",
    "primary_color": "#ff4d4f",
    "ended_text": "活动已开始"
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| target_time | String | 是 | — | 目标时间（ISO 8601） |
| label | String | 否 | "" | 标题文字 |
| format | String | 否 | "dhms" | 格式：d / dh / dhm / dhms |
| theme | String | 否 | "card" | 主题：card / text / flip |
| primary_color | String | 否 | "#ff4d4f" | 主色 |
| ended_text | String | 否 | "已结束" | 结束后显示文字 |

### 4.10 float_button — 悬浮按钮组件

```json
{
  "type": "float_button",
  "props": {
    "icon_url": "https://cdn.example.com/kefu.png",
    "position": "right_bottom",
    "offset_x": 24,
    "offset_y": 120,
    "size": 96,
    "opacity": 1.0,
    "actions": {
      "type": "page",
      "target": "/pages/ai/chat"
    }
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| icon_url | String | 是 | — | 图标地址 |
| position | String | 否 | "right_bottom" | 位置：right_bottom / left_bottom / right_top / left_top |
| offset_x | Integer | 否 | 24 | X 偏移（rpx） |
| offset_y | Integer | 否 | 120 | Y 偏移（rpx） |
| size | Integer | 否 | 96 | 大小（rpx） |
| opacity | Number | 否 | 1.0 | 透明度 0~1 |
| actions | Object | 否 | — | 点击行为 |

### 4.11 rich_text — 富文本组件

```json
{
  "type": "rich_text",
  "props": {
    "content": "<p>这是富文本内容</p>",
    "padding_x": 24,
    "padding_y": 16
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| content | String | 是 | — | HTML 内容 |
| padding_x | Integer | 否 | 24 | 水平内边距（rpx） |
| padding_y | Integer | 否 | 16 | 垂直内边距（rpx） |

### 4.12 divider — 分割线组件

```json
{
  "type": "divider",
  "props": {
    "height": 1,
    "color": "#e8e8e8",
    "margin_y": 16,
    "style": "solid"
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| height | Integer | 否 | 1 | 线高（rpx） |
| color | String | 否 | "#e8e8e8" | 颜色 |
| margin_y | Integer | 否 | 16 | 上下间距（rpx） |
| style | String | 否 | "solid" | 样式：solid / dashed / dotted |

### 4.13 spacer — 间距组件

```json
{
  "type": "spacer",
  "props": {
    "height": 20,
    "background_color": "transparent"
  }
}
```

| 属性 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| height | Integer | 否 | 20 | 高度（rpx） |
| background_color | String | 否 | "transparent" | 背景色 |

---

## 5. 数据源绑定

数据源定义组件从哪里获取动态数据。

### 5.1 数据源结构

```json
{
  "data_source": {
    "type": "product",
    "query": {
      "category_id": null,
      "status": "on_sale",
      "sort_by": "sales",
      "sort_order": "desc",
      "limit": 6
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| type | String | 是 | 数据源类型 |
| query | Object | 是 | 查询参数 |

### 5.2 数据源类型

| type | 适用组件 | 说明 |
| --- | --- | --- |
| product | product_list | 商品数据 |
| content | article_list | 内容数据 |
| activity | activity_entry | 活动数据 |
| coupon | coupon | 优惠券数据 |
| static | banner, nav, video, rich_text 等 | 静态数据（无 data_source，数据在 props 中） |

### 5.3 各数据源查询参数

**product 查询参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| category_id | String/null | 分类筛选 |
| product_type | String/null | 商品类型：physical / digital / service |
| status | String | "on_sale" |
| sort_by | String | sales / price / created_at |
| sort_order | String | asc / desc |
| limit | Integer | 数量限制 |

**content 查询参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| category_id | String/null | 分类筛选 |
| type | String/null | 内容类型：article / image_text / video |
| is_recommended | Boolean/null | 是否推荐 |
| status | String | "published" |
| sort_by | String | published_at / view_count / created_at |
| sort_order | String | asc / desc |
| limit | Integer | 数量限制 |

**activity 查询参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| type | String/null | 活动类型 |
| status | String | "registering" |
| is_recommended | Boolean/null | 是否推荐 |
| sort_by | String | start_time / created_at |
| sort_order | String | asc / desc |
| limit | Integer | 数量限制 |

**coupon 查询参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| type | String/null | 优惠券类型 |
| status | String | "active" |
| sort_by | String | created_at |
| sort_order | String | asc / desc |
| limit | Integer | 数量限制 |

---

## 6. 跳转行为

### 6.1 actions 结构

```json
{
  "actions": {
    "type": "page",
    "target": "/pages/product/detail?id=prod_001",
    "params": {}
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| type | String | 是 | 跳转类型 |
| target | String | 是 | 跳转目标 |
| params | Object | 否 | 附加参数 |

### 6.2 跳转类型

| type | 说明 | target 格式 | 示例 |
| --- | --- | --- | --- |
| page | 小程序内部页面 | 小程序路径 | /pages/product/detail?id=123 |
| webview | 网页 | URL | https://example.com/article |
| miniapp | 其他小程序 | AppID + 路径 | appid=wx1234567&path=/pages/index |
| phone | 拨打电话 | 电话号码 | 400-123-4567 |
| none | 无跳转 | — | — |

---

## 7. 样式覆盖

组件支持通过 style 字段进行样式覆盖：

```json
{
  "style": {
    "margin_top": 0,
    "margin_bottom": 16,
    "margin_left": 24,
    "margin_right": 24,
    "padding_top": 0,
    "padding_bottom": 0,
    "padding_left": 0,
    "padding_right": 0,
    "background_color": "#ffffff",
    "border_radius": 0,
    "visible": true
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| margin_top | Integer | 0 | 上外边距（rpx） |
| margin_bottom | Integer | 0 | 下外边距（rpx） |
| margin_left | Integer | 0 | 左外边距（rpx） |
| margin_right | Integer | 0 | 右外边距（rpx） |
| padding_top | Integer | 0 | 上内边距（rpx） |
| padding_bottom | Integer | 0 | 下内边距（rpx） |
| padding_left | Integer | 0 | 左内边距（rpx） |
| padding_right | Integer | 0 | 右内边距（rpx） |
| background_color | String | "transparent" | 背景色 |
| border_radius | Integer | 0 | 圆角（rpx） |
| visible | Boolean | true | 是否可见（支持条件展示） |

---

## 8. 完整页面 DSL 示例

```json
{
  "schema_version": "1.0",
  "page": {
    "id": "page_home",
    "name": "首页",
    "type": "home",
    "path": "pages/index/index",
    "share_title": "欢迎光临",
    "share_image": "https://cdn.example.com/share.jpg",
    "background_color": "#f5f5f5"
  },
  "components": [
    {
      "id": "comp_banner_01",
      "type": "banner",
      "props": {
        "autoplay": true,
        "interval": 4000,
        "circular": true,
        "height": 360,
        "items": [
          {
            "image_url": "https://cdn.example.com/banner1.jpg",
            "title": "新品上市",
            "actions": { "type": "page", "target": "/pages/product/list?tag=new" }
          },
          {
            "image_url": "https://cdn.example.com/banner2.jpg",
            "title": "限时活动",
            "actions": { "type": "page", "target": "/pages/activity/detail?id=act_001" }
          }
        ]
      },
      "data_source": null,
      "actions": null,
      "style": { "margin_left": 24, "margin_right": 24, "border_radius": 16 }
    },
    {
      "id": "comp_nav_01",
      "type": "nav",
      "props": {
        "columns": 4,
        "items": [
          { "icon_url": "https://cdn.example.com/icon_product.png", "label": "商品", "actions": { "type": "page", "target": "/pages/product/list" } },
          { "icon_url": "https://cdn.example.com/icon_article.png", "label": "内容", "actions": { "type": "page", "target": "/pages/content/list" } },
          { "icon_url": "https://cdn.example.com/icon_activity.png", "label": "活动", "actions": { "type": "page", "target": "/pages/activity/list" } },
          { "icon_url": "https://cdn.example.com/icon_ai.png", "label": "AI助手", "actions": { "type": "page", "target": "/pages/ai/chat" } }
        ]
      },
      "data_source": null,
      "actions": null,
      "style": { "margin_top": 16, "background_color": "#ffffff", "border_radius": 16, "padding_top": 20, "padding_bottom": 20, "margin_left": 24, "margin_right": 24 }
    },
    {
      "id": "comp_member_01",
      "type": "member_card",
      "props": {
        "theme": "gradient",
        "primary_color": "#667eea",
        "secondary_color": "#764ba2",
        "show_level": true,
        "show_points": true,
        "show_growth": true,
        "show_coupon_count": true,
        "login_prompt": true
      },
      "data_source": null,
      "actions": null,
      "style": { "margin_top": 16, "margin_left": 24, "margin_right": 24 }
    },
    {
      "id": "comp_product_01",
      "type": "product_list",
      "props": {
        "layout": "grid",
        "columns": 2,
        "show_price": true,
        "show_original_price": true,
        "show_sales": true,
        "item_border_radius": 12
      },
      "data_source": {
        "type": "product",
        "query": { "status": "on_sale", "sort_by": "sales", "sort_order": "desc", "limit": 6 }
      },
      "actions": null,
      "style": { "margin_top": 16, "margin_left": 24, "margin_right": 24 }
    },
    {
      "id": "comp_article_01",
      "type": "article_list",
      "props": {
        "layout": "card",
        "show_cover": true,
        "show_summary": true,
        "show_date": true,
        "limit": 4
      },
      "data_source": {
        "type": "content",
        "query": { "is_recommended": true, "sort_by": "published_at", "sort_order": "desc", "limit": 4 }
      },
      "actions": null,
      "style": { "margin_top": 16, "margin_left": 24, "margin_right": 24 }
    },
    {
      "id": "comp_float_01",
      "type": "float_button",
      "props": {
        "icon_url": "https://cdn.example.com/kefu.png",
        "position": "right_bottom",
        "size": 96,
        "actions": { "type": "page", "target": "/pages/ai/chat" }
      },
      "data_source": null,
      "actions": null,
      "style": { "offset_y": 120 }
    }
  ],
  "global_config": {
    "pull_refresh": true,
    "reach_bottom_load": false
  }
}
```

---

## 9. 组件类型汇总

| type | 组件名称 | 数据源 | 说明 |
| --- | --- | --- | --- |
| banner | 轮播组件 | static | 支持多图轮播，每项可配跳转 |
| nav | 快捷导航 | static | 宫格导航，可配行列数 |
| product_list | 商品列表 | product | 支持网格/列表/瀑布流布局 |
| article_list | 文章列表 | content | 支持卡片/列表/紧凑布局 |
| activity_entry | 活动入口 | activity | 支持倒计时和名额展示 |
| member_card | 会员卡 | static | 展示会员信息和权益 |
| coupon | 优惠券 | coupon | 支持领取和展示 |
| video | 视频播放 | static | 支持自动播放和封面 |
| countdown | 倒计时 | static | 支持多种格式和主题 |
| float_button | 悬浮按钮 | static | 固定位置浮动按钮 |
| rich_text | 富文本 | static | HTML 内容展示 |
| divider | 分割线 | static | 视觉分隔 |
| spacer | 间距 | static | 空白间距 |

---

## 10. 小程序渲染规则

1. 小程序按 components 数组顺序依次渲染组件。
2. 遇到 `data_source` 非空的组件，调用对应 API 获取数据后渲染。
3. 遇到 `data_source` 为 null 的组件，直接使用 `props` 中的静态数据渲染。
4. 组件 `style.visible` 为 false 时不渲染该组件。
5. 遇到未知 `type` 的组件，跳过渲染并记录警告日志。
6. 图片加载失败时显示占位图。
7. API 请求失败时，数据源组件显示空状态或兜底内容。
8. 跳转行为按 actions.type 处理：page 使用 wx.navigateTo，webview 使用 wx.navigateTo 到 webview 页面，miniapp 使用 wx.navigateToMiniProgram，phone 使用 wx.makePhoneCall。

---

## 11. 版本管理规则

1. 每次保存草稿生成一个新版本，版本号自增。
2. 发布操作将当前草稿版本标记为已发布，同时更新页面的 current_version。
3. 回滚操作将指定历史版本恢复为当前草稿，生成新版本号。
4. 小程序端始终拉取当前已发布版本的 DSL。
5. DSL schema_version 用于标识 DSL 格式版本，后续格式升级时递增。


--- 契约: agent-team/contracts/api-contract.md ---
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



## 派发备注

无

## 执行要求

1. **严格遵循契约**: 所有接口字段、状态码、数据结构必须与契约一致，不得私自修改已冻结契约。
2. **实际编写代码**: 你必须实际创建项目文件和代码，不能只输出方案文档。这是开发任务，需要产出可运行的代码。
3. **项目目录**: 代码放在项目根目录下的对应子目录中。
4. **自测验证**: 完成后进行基本自测（如项目可启动、接口可访问等）。
5. **提交回执**: 完成后在 `agent-team/receipts/` 下创建回执文件 `receipt-TASK-BE-007.yaml`，格式如下:

```yaml
task_id: TASK-BE-007
agent: backend-agent
status: 已提交回执
completed_work:
  - 完成的工作项1
  - 完成的工作项2
changed_files:
  - 修改/创建的文件路径
added_apis: []
added_tables: []
dependencies: ['TASK-BE-005', 'TASK-BE-003']
blockers: []
self_test:
  result: 通过
  details: "自测详情"
downstream_suggestions: []
risks: []
next_step: "下一步建议"
notes: ""
```

6. **契约变更请求**: 如发现契约需要调整，在回执的 notes 中标记 `[契约变更请求]`，说明原因和建议修改。

现在开始执行任务。
