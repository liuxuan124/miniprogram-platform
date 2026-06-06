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
