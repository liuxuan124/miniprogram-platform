# AI 推荐返回格式与工具调用契约

## 版本

v1.0 — 由 AI 与推荐 Agent 在 TASK-AI-001 中输出初稿，等待总控冻结。

---

## 1. 设计原则

1. **真实数据追溯**：所有推荐结果必须携带真实业务数据的唯一标识（product_id / article_id / activity_id），小程序端和后台可据此回查原始记录。
2. **不虚构推荐**：AI 不得脱离商品库、文章库、活动库生成推荐内容。推荐列表由后端检索接口返回，AI 仅负责排序、筛选和解释。
3. **安全兜底**：无法回答时必须走转人工策略，不得编造答案或泄露系统 Prompt、API Key、用户隐私。
4. **格式统一**：所有推荐卡片、对话消息、转人工信号均采用统一的信封格式，小程序端可按 type 字段分发渲染。

---

## 2. 统一信封格式

所有 AI 对话响应均使用以下信封结构，小程序端按 `type` 字段决定渲染方式。

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "conversation_id": "conv_abc123",
    "turn_id": "turn_004",
    "type": "text | product_recommend | article_recommend | activity_recommend | member_benefit | order_status | transfer_human",
    "content": "这是纯文本回复内容，仅在 type=text 时使用",
    "cards": [],
    "metadata": {
      "intent": "product_inquiry",
      "confidence": 0.92,
      "model": "qwen-plus",
      "token_usage": {
        "prompt": 320,
        "completion": 150,
        "total": 470
      },
      "latency_ms": 820
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| code | int | 是 | 0=成功，非0见错误码 |
| message | string | 是 | 状态描述 |
| data.conversation_id | string | 是 | 对话会话唯一标识 |
| data.turn_id | string | 是 | 当前轮次标识 |
| data.type | string | 是 | 响应类型枚举，决定 cards 渲染方式 |
| data.content | string | 否 | 纯文本回复，type=text 时必填 |
| data.cards | array | 否 | 推荐卡片列表，各类型格式见下文 |
| data.metadata | object | 是 | 元数据，用于日志与监控 |

### type 枚举

| 值 | 说明 | cards 内容 |
| --- | --- | --- |
| text | 纯文本回复 | 无 |
| product_recommend | 商品推荐 | ProductCard[] |
| article_recommend | 文章推荐 | ArticleCard[] |
| activity_recommend | 活动推荐 | ActivityCard[] |
| member_benefit | 会员权益解释 | MemberBenefitCard |
| order_status | 订单状态查询 | OrderStatusCard |
| transfer_human | 转人工 | TransferHumanCard |

---

## 3. 商品推荐格式 (product_recommend)

### 3.1 ProductCard 结构

```json
{
  "type": "product_recommend",
  "cards": [
    {
      "product_id": "prod_10086",
      "name": "有机绿茶礼盒",
      "subtitle": "春茶上新 限时8折",
      "cover_url": "https://cdn.example.com/products/green-tea.jpg",
      "price": 128.00,
      "original_price": 160.00,
      "product_type": "physical",
      "category_name": "茶饮",
      "stock": 56,
      "sales": 320,
      "tags": ["热销", "限时折扣"],
      "miniprogram_path": "/pages/product/detail?id=prod_10086"
    }
  ]
}
```

### 3.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| product_id | string | 是 | 商品唯一标识，可追溯到商品库真实记录 |
| name | string | 是 | 商品名称，取自商品主数据 |
| subtitle | string | 否 | 推荐副标题，可由 AI 根据上下文生成 |
| cover_url | string | 是 | 商品封面图 URL |
| price | number | 是 | 当前售价（元） |
| original_price | number | 否 | 原价（元），用于展示折扣 |
| product_type | string | 是 | 商品类型：physical / digital / service |
| category_name | string | 否 | 商品分类名称 |
| stock | int | 否 | 当前库存数量 |
| sales | int | 否 | 累计销量 |
| tags | string[] | 否 | 标签列表，如"热销""新品""限时折扣" |
| miniprogram_path | string | 是 | 小程序跳转路径，用户点击卡片后跳转 |

### 3.3 约束

- `product_id` 必须对应商品库中状态为"已上架"的真实商品。
- `price`、`original_price`、`stock`、`sales` 必须取自商品主数据最新值，AI 不得自行编造。
- 推荐列表最多返回 10 条，默认 5 条。
- 库存为 0 的商品不应出现在推荐列表中（除非后端明确配置允许展示缺货商品）。

---

## 4. 文章推荐格式 (article_recommend)

### 4.1 ArticleCard 结构

```json
{
  "type": "article_recommend",
  "cards": [
    {
      "article_id": "art_20001",
      "title": "如何选择适合你的茶具",
      "summary": "从材质、工艺到使用场景，一文读懂茶具选购要点",
      "cover_url": "https://cdn.example.com/articles/teapot-guide.jpg",
      "category_name": "茶文化",
      "article_type": "article",
      "read_count": 1520,
      "is_recommended": true,
      "published_at": "2026-04-20T10:00:00+08:00",
      "miniprogram_path": "/pages/article/detail?id=art_20001"
    }
  ]
}
```

### 4.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| article_id | string | 是 | 文章唯一标识，可追溯到文章库真实记录 |
| title | string | 是 | 文章标题，取自内容主数据 |
| summary | string | 否 | 文章摘要，取自内容主数据或由 AI 生成 |
| cover_url | string | 否 | 封面图 URL |
| category_name | string | 否 | 内容分类名称 |
| article_type | string | 是 | 内容类型：article / image_text / video |
| read_count | int | 否 | 阅读量 |
| is_recommended | bool | 否 | 是否为后台标记的推荐内容 |
| published_at | string | 否 | 发布时间，ISO 8601 格式 |
| miniprogram_path | string | 是 | 小程序跳转路径 |

### 4.3 约束

- `article_id` 必须对应内容库中状态为"已发布"的真实文章。
- 推荐列表最多返回 10 条，默认 5 条。
- 优先推荐后台标记为"推荐"的内容，其次按相关度排序。

---

## 5. 活动推荐格式 (activity_recommend)

### 5.1 ActivityCard 结构

```json
{
  "type": "activity_recommend",
  "cards": [
    {
      "activity_id": "act_30001",
      "name": "春日茶会沙龙",
      "activity_type": "salon",
      "cover_url": "https://cdn.example.com/activities/spring-tea.jpg",
      "start_time": "2026-05-20T14:00:00+08:00",
      "end_time": "2026-05-20T17:00:00+08:00",
      "location": "杭州·西湖茶舍",
      "quota": 30,
      "registered_count": 22,
      "remaining_quota": 8,
      "status": "open",
      "tags": ["线下", "茶文化"],
      "miniprogram_path": "/pages/activity/detail?id=act_30001"
    }
  ]
}
```

### 5.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| activity_id | string | 是 | 活动唯一标识，可追溯到活动库真实记录 |
| name | string | 是 | 活动名称，取自活动主数据 |
| activity_type | string | 是 | 活动类型：salon / course / exhibition / other |
| cover_url | string | 否 | 活动封面图 URL |
| start_time | string | 是 | 活动开始时间，ISO 8601 格式 |
| end_time | string | 是 | 活动结束时间，ISO 8601 格式 |
| location | string | 否 | 活动地点 |
| quota | int | 否 | 名额总数 |
| registered_count | int | 否 | 已报名人数 |
| remaining_quota | int | 否 | 剩余名额 = quota - registered_count |
| status | string | 是 | 活动状态：open / full / ended / cancelled |
| tags | string[] | 否 | 标签列表 |
| miniprogram_path | string | 是 | 小程序跳转路径 |

### 5.3 约束

- `activity_id` 必须对应活动库中真实活动记录。
- `remaining_quota` 由后端实时计算，AI 不得自行推算。
- 已结束或已取消的活动不应出现在推荐列表中。
- 推荐列表最多返回 5 条，默认 3 条。

---

## 6. 会员权益解释格式 (member_benefit)

### 6.1 MemberBenefitCard 结构

```json
{
  "type": "member_benefit",
  "cards": [
    {
      "member_id": "mem_40001",
      "level_name": "银卡会员",
      "level_index": 2,
      "points": 1580,
      "growth_value": 3200,
      "next_level_name": "金卡会员",
      "next_level_gap": 1800,
      "benefits": [
        {
          "benefit_type": "discount",
          "description": "全场商品9.5折",
          "icon": "discount"
        },
        {
          "benefit_type": "coupon",
          "description": "每月1张20元优惠券",
          "icon": "coupon"
        },
        {
          "benefit_type": "points_rate",
          "description": "消费积分1.5倍",
          "icon": "points"
        }
      ],
      "available_coupons": 3,
      "miniprogram_path": "/pages/member/index"
    }
  ]
}
```

### 6.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| member_id | string | 是 | 会员唯一标识 |
| level_name | string | 是 | 当前等级名称 |
| level_index | int | 是 | 等级序号，数值越大等级越高 |
| points | int | 是 | 当前积分 |
| growth_value | int | 是 | 当前成长值 |
| next_level_name | string | 否 | 下一等级名称 |
| next_level_gap | int | 否 | 距下一等级所需成长值 |
| benefits | array | 是 | 权益列表 |
| benefits[].benefit_type | string | 是 | 权益类型：discount / coupon / points_rate / free_shipping / exclusive / other |
| benefits[].description | string | 是 | 权益描述 |
| benefits[].icon | string | 否 | 图标标识 |
| available_coupons | int | 否 | 可用优惠券数量 |
| miniprogram_path | string | 是 | 跳转路径 |

---

## 7. 订单状态查询格式 (order_status)

### 7.1 OrderStatusCard 结构

```json
{
  "type": "order_status",
  "cards": [
    {
      "order_id": "ord_50001",
      "order_no": "2026051012345678",
      "status": "shipped",
      "status_label": "已发货",
      "product_name": "有机绿茶礼盒",
      "product_cover_url": "https://cdn.example.com/products/green-tea.jpg",
      "amount": 128.00,
      "paid_at": "2026-05-10T09:30:00+08:00",
      "logistics_company": "顺丰速运",
      "logistics_no": "SF1234567890",
      "miniprogram_path": "/pages/order/detail?id=ord_50001"
    }
  ]
}
```

### 7.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| order_id | string | 是 | 订单唯一标识 |
| order_no | string | 是 | 订单号 |
| status | string | 是 | 订单状态枚举：pending_pay / pending_ship / shipped / completed / cancelled / refunding / refunded |
| status_label | string | 是 | 状态中文展示名 |
| product_name | string | 是 | 商品名称（取主商品） |
| product_cover_url | string | 否 | 商品封面图 |
| amount | number | 是 | 订单金额（元） |
| paid_at | string | 否 | 支付时间 |
| logistics_company | string | 否 | 物流公司，实物商品发货后填写 |
| logistics_no | string | 否 | 物流单号 |
| miniprogram_path | string | 是 | 跳转路径 |

### 7.3 约束

- AI 仅可查询当前用户本人的订单，不得跨用户查询。
- 订单数据取自订单主数据，AI 不得编造物流信息或支付状态。

---

## 8. 转人工格式 (transfer_human)

### 8.1 TransferHumanCard 结构

```json
{
  "type": "transfer_human",
  "cards": [
    {
      "reason": "intent_unrecognized",
      "message": "抱歉，我暂时无法回答您的问题，正在为您转接人工客服，请稍候……",
      "queue_position": 3,
      "estimated_wait_seconds": 120,
      "fallback_url": "/pages/service/contact"
    }
  ]
}
```

### 8.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| reason | string | 是 | 转人工原因枚举 |
| message | string | 是 | 转人工提示语 |
| queue_position | int | 否 | 排队位置 |
| estimated_wait_seconds | int | 否 | 预计等待时间（秒） |
| fallback_url | string | 否 | 人工客服不可用时的降级跳转路径 |

### 8.3 转人工触发原因枚举

| 值 | 说明 |
| --- | --- |
| intent_unrecognized | 意图无法识别 |
| low_confidence | 置信度低于阈值（默认 < 0.6） |
| user_request | 用户主动要求转人工 |
| sensitive_topic | 涉及敏感话题（退款纠纷、投诉等） |
| system_error | 系统异常 |
| knowledge_miss | 知识库未命中 |
| max_turns_exceeded | 对话轮次超过上限（默认 10 轮） |

### 8.4 约束

- 当 AI 无法回答或置信度低于阈值时，必须触发转人工，不得编造答案。
- 用户明确要求转人工时，必须立即响应，不得拒绝或拖延。

---

## 9. 工具调用契约

AI Agent 通过工具调用（Tool/Function Calling）与后端业务接口交互，获取真实数据后生成推荐。

### 9.1 工具列表

| 工具名称 | 说明 | 对应后端接口（待后端确认） |
| --- | --- | --- |
| search_products | 按关键词/分类/标签搜索商品 | GET /api/v1/products |
| recommend_products | 基于用户画像推荐商品 | POST /api/v1/ai/recommend/products |
| search_articles | 按关键词/分类搜索文章 | GET /api/v1/articles |
| recommend_articles | 基于用户兴趣推荐文章 | POST /api/v1/ai/recommend/articles |
| search_activities | 按关键词/类型/时间搜索活动 | GET /api/v1/activities |
| recommend_activities | 基于用户偏好推荐活动 | POST /api/v1/ai/recommend/activities |
| query_member_benefit | 查询会员权益信息 | GET /api/v1/members/{member_id}/benefit |
| query_order_status | 查询订单状态 | GET /api/v1/orders/{order_id} |
| query_user_orders | 查询用户最近订单列表 | GET /api/v1/users/{user_id}/orders |
| transfer_to_human | 触发转人工 | POST /api/v1/ai/transfer-human |
| search_knowledge | 知识库检索 | POST /api/v1/ai/knowledge/search |

### 9.2 工具调用流程

```
用户消息 → AI 意图识别 → 选择工具 → 调用后端接口 → 获取真实数据 → 格式化为卡片 → 返回统一信封
```

1. AI 识别用户意图后，决定调用哪些工具。
2. 工具调用参数由 AI 根据用户消息和上下文生成。
3. 后端接口返回真实业务数据，AI 不得修改数据内容。
4. AI 将真实数据格式化为对应卡片结构，放入统一信封返回。
5. 如果多个工具需要调用，按依赖顺序串行执行。

### 9.3 工具调用参数示例

#### search_products

```json
{
  "keyword": "绿茶",
  "category_id": null,
  "tags": [],
  "min_price": null,
  "max_price": null,
  "product_type": null,
  "page": 1,
  "page_size": 5,
  "sort_by": "relevance",
  "sort_order": "desc"
}
```

#### recommend_products

```json
{
  "user_id": "u_12345",
  "scene": "chat_recommend",
  "context_keywords": ["茶", "送礼"],
  "max_count": 5,
  "exclude_product_ids": [],
  "filter": {
    "in_stock_only": true,
    "status": "on_sale"
  }
}
```

#### search_articles

```json
{
  "keyword": "茶具选购",
  "category_id": null,
  "article_type": null,
  "page": 1,
  "page_size": 5,
  "sort_by": "relevance",
  "sort_order": "desc"
}
```

#### recommend_articles

```json
{
  "user_id": "u_12345",
  "scene": "chat_recommend",
  "context_keywords": ["茶文化"],
  "max_count": 5,
  "exclude_article_ids": [],
  "filter": {
    "status": "published"
  }
}
```

#### search_activities

```json
{
  "keyword": "茶会",
  "activity_type": null,
  "start_time_after": "2026-05-11T00:00:00+08:00",
  "status": "open",
  "page": 1,
  "page_size": 3
}
```

#### recommend_activities

```json
{
  "user_id": "u_12345",
  "scene": "chat_recommend",
  "context_keywords": ["线下活动", "茶"],
  "max_count": 3,
  "exclude_activity_ids": [],
  "filter": {
    "status": "open",
    "has_remaining_quota": true
  }
}
```

#### query_member_benefit

```json
{
  "member_id": "mem_40001"
}
```

#### query_order_status

```json
{
  "order_id": "ord_50001"
}
```

#### query_user_orders

```json
{
  "user_id": "u_12345",
  "status": null,
  "page": 1,
  "page_size": 5
}
```

#### transfer_to_human

```json
{
  "conversation_id": "conv_abc123",
  "reason": "intent_unrecognized",
  "user_id": "u_12345",
  "last_message": "我要投诉",
  "context_summary": "用户对退款流程不满，情绪激动"
}
```

#### search_knowledge

```json
{
  "query": "退货政策是什么",
  "top_k": 3,
  "similarity_threshold": 0.7
}
```

---

## 10. 对话日志字段

每次 AI 对话轮次完成后，后端需记录以下日志字段，用于运营监控和问题排查。

### 10.1 日志结构

```json
{
  "log_id": "log_20260511_001",
  "conversation_id": "conv_abc123",
  "turn_id": "turn_004",
  "user_id": "u_12345",
  "session_id": "sess_xyz789",
  "timestamp": "2026-05-11T10:30:00.000+08:00",
  "request": {
    "user_message": "有什么好喝的绿茶推荐吗",
    "context_messages": [
      {"role": "user", "content": "你好", "turn_id": "turn_001"},
      {"role": "assistant", "content": "您好！有什么可以帮您的？", "turn_id": "turn_002"}
    ],
    "user_profile": {
      "member_level": 2,
      "tags": ["茶饮爱好者", "高消费"]
    }
  },
  "response": {
    "type": "product_recommend",
    "content": "为您推荐以下绿茶产品：",
    "cards_count": 3,
    "card_ids": ["prod_10086", "prod_10092", "prod_10105"]
  },
  "tools_called": [
    {
      "tool_name": "search_products",
      "tool_params": {"keyword": "绿茶", "page_size": 5},
      "tool_result_count": 5,
      "tool_latency_ms": 120
    }
  ],
  "intent": {
    "primary": "product_inquiry",
    "secondary": "tea_category",
    "confidence": 0.92
  },
  "model_info": {
    "model": "qwen-plus",
    "prompt_tokens": 320,
    "completion_tokens": 150,
    "total_tokens": 470
  },
  "performance": {
    "total_latency_ms": 820,
    "first_token_latency_ms": 350,
    "tool_call_latency_ms": 120
  },
  "transfer": {
    "transferred": false,
    "reason": null
  },
  "satisfaction": {
    "user_feedback": null,
    "user_action": "click_card",
    "clicked_card_id": "prod_10086",
    "clicked_card_type": "product_recommend"
  },
  "safety": {
    "sensitive_detected": false,
    "sensitive_categories": [],
    "prompt_leak_detected": false,
    "pii_detected": false
  }
}
```

### 10.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| log_id | string | 是 | 日志唯一标识 |
| conversation_id | string | 是 | 对话会话 ID |
| turn_id | string | 是 | 当前轮次 ID |
| user_id | string | 是 | 用户 ID |
| session_id | string | 是 | 小程序会话 ID |
| timestamp | string | 是 | 日志时间，ISO 8601 |
| request.user_message | string | 是 | 用户消息原文 |
| request.context_messages | array | 否 | 上下文消息列表（最近 N 轮） |
| request.user_profile | object | 否 | 用户画像摘要 |
| response.type | string | 是 | 响应类型 |
| response.content | string | 否 | 文本回复内容 |
| response.cards_count | int | 否 | 推荐卡片数量 |
| response.card_ids | string[] | 否 | 推荐卡片关联的业务 ID 列表 |
| tools_called | array | 否 | 工具调用记录列表 |
| tools_called[].tool_name | string | 是 | 工具名称 |
| tools_called[].tool_params | object | 是 | 工具调用参数 |
| tools_called[].tool_result_count | int | 否 | 工具返回结果数量 |
| tools_called[].tool_latency_ms | int | 否 | 工具调用耗时（毫秒） |
| intent.primary | string | 是 | 主意图分类 |
| intent.secondary | string | 否 | 次意图分类 |
| intent.confidence | float | 是 | 意图置信度 0~1 |
| model_info.model | string | 是 | 模型标识 |
| model_info.prompt_tokens | int | 是 | Prompt Token 数 |
| model_info.completion_tokens | int | 是 | 完成 Token 数 |
| model_info.total_tokens | int | 是 | 总 Token 数 |
| performance.total_latency_ms | int | 是 | 总响应耗时（毫秒） |
| performance.first_token_latency_ms | int | 否 | 首 Token 耗时 |
| performance.tool_call_latency_ms | int | 否 | 工具调用总耗时 |
| transfer.transferred | bool | 是 | 是否转人工 |
| transfer.reason | string | 否 | 转人工原因 |
| satisfaction.user_feedback | string | 否 | 用户反馈：like / dislike / null |
| satisfaction.user_action | string | 否 | 用户后续行为：click_card / ignore / exit / re_ask / null |
| satisfaction.clicked_card_id | string | 否 | 用户点击的卡片 ID |
| satisfaction.clicked_card_type | string | 否 | 用户点击的卡片类型 |
| safety.sensitive_detected | bool | 是 | 是否检测到敏感内容 |
| safety.sensitive_categories | string[] | 否 | 命中的敏感类别 |
| safety.prompt_leak_detected | bool | 是 | 是否检测到 Prompt 泄露 |
| safety.pii_detected | bool | 是 | 是否检测到个人隐私信息 |

### 10.3 意图分类枚举

| 意图 | 说明 |
| --- | --- |
| product_inquiry | 商品咨询 |
| article_inquiry | 内容咨询 |
| activity_inquiry | 活动咨询 |
| member_benefit_inquiry | 会员权益咨询 |
| order_inquiry | 订单查询 |
| booking_inquiry | 预约咨询 |
| coupon_inquiry | 优惠券咨询 |
| general_qa | 通用问答 |
| chitchat | 闲聊 |
| complaint | 投诉 |
| transfer_request | 转人工请求 |
| unknown | 未知意图 |

---

## 11. 错误码

| 错误码 | 说明 | 处理建议 |
| --- | --- | --- |
| 0 | 成功 | - |
| 10001 | 参数错误 | 检查请求参数 |
| 10002 | 模型调用失败 | 重试或降级 |
| 10003 | 模型响应超时 | 重试或转人工 |
| 10004 | 工具调用失败 | 检查后端接口状态 |
| 10005 | 知识库检索无结果 | 降级为通用回复或转人工 |
| 10006 | 意图识别置信度过低 | 触发转人工 |
| 10007 | 敏感内容检测 | 拒绝回答并提示 |
| 10008 | Prompt 泄露检测 | 拒绝回答并记录 |
| 10009 | 用户隐私检测 | 脱敏处理或拒绝 |
| 10010 | 对话轮次超限 | 触发转人工 |
| 10011 | 商品/文章/活动不存在 | 返回空列表并提示 |
| 10012 | 用户未登录 | 引导登录 |
| 10013 | 权限不足 | 拒绝并提示 |
| 20001 | 转人工排队中 | 展示排队信息 |
| 20002 | 人工客服不可用 | 展示降级入口 |

---

## 12. 安全规则

1. **不泄露系统 Prompt**：AI 回复中不得包含 System Prompt 内容，对话日志中也不得记录完整 Prompt。
2. **不泄露 API Key**：API Key 加密存储，日志和响应中一律脱敏为 `***`。
3. **不泄露用户隐私**：对话日志中手机号、地址等 PII 字段需脱敏处理。
4. **敏感内容拦截**：涉及政治、色情、暴力等敏感内容时，返回错误码 10007。
5. **Prompt 注入防护**：检测到 Prompt 注入尝试时，返回错误码 10008 并记录。
6. **数据权限隔离**：AI 仅可查询当前用户本人的订单和会员信息，不得跨用户查询。

---

## 13. 待后端确认项

以下接口路径和参数为 AI Agent 侧的期望设计，最终以后端 Agent 在 TASK-BE-002 中输出的 API 接口规范为准：

1. 商品搜索/推荐接口路径与参数格式
2. 文章搜索/推荐接口路径与参数格式
3. 活动搜索/推荐接口路径与参数格式
4. 会员权益查询接口路径与参数格式
5. 订单查询接口路径与参数格式
6. 知识库检索接口路径与参数格式
7. 转人工接口路径与参数格式

AI Agent 将在后端 API 规范确认后，对齐工具调用参数并更新本契约。
