# 会员固定权益 + 券领取范围 Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** 固定 4 项会员权益；优惠券按 all/members/levels 领取；生日礼包绑券可领。

**Architecture:** 等级 `rights` 存结构化 JSON（benefits + birthdayCouponId）；`points_rate` 独立列；券表加 `claim_audience`/`claim_level_ids`；用户加 `birthday`；生日领取记录表防重。

**Tech Stack:** Flyway SQL, Spring Boot, Vue3 admin, 现有 Coupon/MemberLevel API

## Global Constraints

- 权益码仅：`member_discount` | `points_boost` | `exclusive_coupon` | `birthday_gift`
- 领取范围：`all` | `members` | `levels`
- 不擅自 git commit
- 本轮不做下单折扣/积分倍率交易链路

---

### Task 1: DB 迁移 V30

**Files:**
- Create: `backend/src/main/resources/db/migration/V30__member_benefits_coupon_claim.sql`

- [ ] 加列：`mp_member_level.points_rate`、`mp_coupon.claim_audience`、`mp_coupon.claim_level_ids`、`mp_user.birthday`
- [ ] 建表：`mp_member_birthday_claim`（user_id + claim_year 唯一）

### Task 2: 后端等级结构化

**Files:** MemberLevel* DTO/VO/Entity/ServiceImpl, admin API normalize

- [ ] Entity/DTO/VO 支持 benefits、pointsRate、birthdayCouponId
- [ ] rights JSON 读写兼容旧 string[]
- [ ] 创建/更新校验生日券

### Task 3: 后端优惠券领取范围

**Files:** Coupon entity/DTO/VO/ServiceImpl

- [ ] 字段 claimAudience、claimLevelIds
- [ ] listAvailableCoupons / claimCoupon 按用户等级过滤校验

### Task 4: 生日礼包领取 API

**Files:** MpMemberController + MemberPointsService（或独立服务）

- [ ] POST claim birthday gift
- [ ] 校验生日当天、权益、防重、发券

### Task 5: Admin 等级 UI

**Files:** `admin/src/views/member/index.vue`, `level.vue`, `api/member.ts`, `types/member.ts`

- [ ] 固定权益多选 + 倍率 + 生日券下拉

### Task 6: Admin 优惠券 UI

**Files:** `admin/src/views/marketing/coupon.vue`, `types/coupon.ts`, coupon API

- [ ] 领取范围表单与列表列

### Task 7: 小程序可领过滤（若现有领券页）

- [ ] 依赖后端 listAvailable 即可；补生日入口若有会员页
