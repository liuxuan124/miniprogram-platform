# 会员固定权益 + 优惠券领取范围设计

日期：2026-08-13  
状态：待实现  
范围：会员等级权益结构化、优惠券领取人群、生日礼包绑券（方案 1 + A1）

## 1. 目标

- 会员等级「权益」改为系统固定项，不再自由文本堆砌。
- 优惠券支持按领取人群控制：所有人 / 任意会员 / 指定会员等级。
- 生日礼包：等级可绑定生日券，用户生日当天可领。

## 2. 固定权益清单（本轮 4 项）

| 权益码 | 名称 | 行为 | 等级侧配置 |
|--------|------|------|------------|
| `member_discount` | 会员折扣 | 标识该等级享受折扣；沿用 `discountRate` | 折扣率 0~1 |
| `points_boost` | 积分加速 | 标识积分倍率；字段 `pointsRate` | 倍率 ≥1，默认 1 |
| `exclusive_coupon` | 专属优惠券 | 该等级可出现在优惠券「指定等级」选项中 | 无额外字段 |
| `birthday_gift` | 生日礼包 | 生日当天可领绑定券 | `birthdayCouponId` |

本轮不做：下单实时打折落库、积分加速写订单链路、专属客服等纯展示权益。

## 3. 数据模型

### 3.1 会员等级 `mp_member_level`

现有 `rights`（JSON）改为结构化，兼容旧纯字符串数组：

```json
{
  "benefits": ["member_discount", "points_boost", "exclusive_coupon", "birthday_gift"],
  "pointsRate": 1.2,
  "birthdayCouponId": 12
}
```

兼容读取：

- 若 `rights` 为 `string[]` 且元素为权益码 → 直接当 `benefits`
- 若为历史中文文案 → 展示为「自定义说明」，编辑时引导改为勾选固定权益
- 新增列（推荐，避免塞进 JSON）：`points_rate DECIMAL(4,2) DEFAULT 1.00`  
  若不想改表，可先仅存在 JSON 的 `pointsRate`，实现时二选一，**优先加列**便于查询。

`discount_rate` 继续用现有列。

### 3.2 优惠券 `mp_coupon`

新增：

| 字段 | 类型 | 说明 |
|------|------|------|
| `claim_audience` | varchar | `all` / `members` / `levels`，默认 `all` |
| `claim_level_ids` | json/text | 等级 ID 列表，仅 `levels` 时有效 |

含义：

- `all`：所有登录用户可领（含未达任何付费等级的「普通」用户）
- `members`：任意已启用会员等级中、按积分/等级命中的用户（即有 `levelId` 或积分达到某启用等级）
- `levels`：仅 `claim_level_ids` 内的等级可领；这些等级应勾选了 `exclusive_coupon`（后台校验提示，领取时仍以等级 ID 为准）

### 3.3 用户生日

依赖 `mp_user` 生日字段：

- 若已有 `birthday` / `birth_date` → 直接用
- 若无 → 本轮新增可空字段 `birthday DATE`，小程序个人资料可补；无生日时生日礼包不可领并提示完善资料

## 4. 后端行为

### 4.1 等级 CRUD

- DTO/VO 增加：`benefits: string[]`、`pointsRate`、`birthdayCouponId`
- 写入时校验：
  - `benefits` 仅允许上述 4 个码
  - 含 `birthday_gift` 时 `birthdayCouponId` 必填且券存在、状态可用
  - 含 `member_discount` 时 `discountRate` 建议 &lt; 1（允许 =1，仅警告不拦截）
  - 含 `points_boost` 时 `pointsRate` ≥ 1

### 4.2 优惠券 CRUD / 领取

- 创建/编辑写入 `claimAudience`、`claimLevelIds`
- `claimAudience=levels` 时 `claimLevelIds` 非空；建议校验所选等级含 `exclusive_coupon`
- `listAvailableCoupons(userId)`：按用户当前等级过滤
- `claimCoupon`：同样校验；失败返回明确文案（如「该券仅限金卡及以上领取」）

### 4.3 生日礼包领取

新接口（建议）：

`POST /api/v1/mp/member/birthday-gift/claim`

逻辑：

1. 用户有生日且今天是生日（按年周期，月日匹配）
2. 用户当前等级 `benefits` 含 `birthday_gift` 且配置了 `birthdayCouponId`
3. 当年未领过（建议表 `mp_member_birthday_claim`：user_id + year 唯一，或用户券备注/扩展字段标记）
4. 调用发券逻辑发放绑定券

## 5. 管理后台 UI

### 5.1 会员等级弹窗

- 「权益」改为多选 checkbox（固定 4 项）+ 简短说明
- 勾选「积分加速」→ 显示倍率输入
- 勾选「生日礼包」→ 下拉选择已发布优惠券
- 勾选「会员折扣」→ 强调现有折扣率字段
- 勾选「专属优惠券」→ 提示：可在优惠券里把领取范围设为该等级

### 5.2 优惠券表单 / 列表

- 新增「领取范围」：所有人 / 任意会员 / 指定会员等级
- 指定等级：多选等级列表（优先展示带 `exclusive_coupon` 的等级）
- 列表列增加「领取范围」展示

## 6. 小程序侧

- 领券中心：只展示当前用户可领券；不可领不展示或灰显+原因
- 会员中心：展示当前等级已开通的固定权益标签
- 生日礼包入口：生日当天且有权益时显示「领取生日礼」

## 7. 验收标准

1. 新建等级只能勾选固定权益，保存后列表展示权益名称而非随意文案。
2. 优惠券设为「指定等级」后，非该等级用户列表不可见且领取接口拒绝。
3. 「所有人」券，任意登录用户可领。
4. 等级勾选生日礼包并绑券后，生日当天用户可成功领到该券；非生日/无生日/重复领取被拒绝。
5. 旧等级纯文案 rights 不报错，编辑时可改成新结构。

## 8. 非目标（明确不做）

- 订单结算自动套用会员折扣 / 积分倍率的完整交易改造（可另开任务）
- 标签系统、批量打标
- 权益项超过本表 4 项以外的能力

## 9. 实现顺序建议

1. DB 迁移：`claim_audience`、`claim_level_ids`、`points_rate`（可选列）、`birthday`、生日领取记录表  
2. 后端 DTO/Service：等级结构化 + 领券校验 + 生日领取  
3. Admin：等级弹窗 + 优惠券表单/列表  
4. 小程序：可领列表过滤 + 生日入口  

## 10. 开放问题（实现时可默认）

- 「任意会员」定义：默认 = 命中任一启用等级（含最低「普通会员」若存在）；若系统无等级记录，则视为 `all` 同等。
- 生日时区：按服务器本地日（部署为 CST）。
