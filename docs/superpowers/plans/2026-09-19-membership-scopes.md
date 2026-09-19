# 平台会员 + 各星球可配会员 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地方案 B：独立 `scope=platform|planet` 付费档与订购表；后台可配；门禁按 scope 拆分；积分不再污染付费权益；支付写订购；小程序最小展示/跳转；迁移老 `member_expire_at`。

**Architecture:** 新增 `mp_membership_plan` + `mp_member_subscription` 为付费真源；`MembershipAccessService` 提供 `hasPlatformMembership` / `hasPlanetMembership` / `grantSubscription`；成长等级仍用 `mp_member_level` + `mp_user.level_id` 仅展示；商品加 `membership_plan_id`；Admin 平台页与 `planet.vue` 嵌套星球档；Flyway `V68` + 启动或 SQL 迁移任务。

**Tech Stack:** Flyway SQL, Spring Boot 3 + MyBatis-Plus, Vue3 admin (`admin/src/views/member/*`), 微信小程序 (`miniapp/`), 现有支付履约 `PaymentServiceImpl`

## Global Constraints

- 规格真源：`docs/superpowers/specs/2026-09-19-membership-scopes-design.md`
- 平台与星球订购互不顶替；赠送只写目标星球订购，不默认通开全部星球
- 鉴权只信 `mp_member_subscription`；禁止积分路径写付费权益
- 一期不做自动续费、多星球打包 SKU、小程序会员中心大改
- 不擅自 git commit（除非用户明确要求）
- 下一迁移版本号：**V68**（当前最新业务迁移为 V67）

### 文件责任地图

| 文件 | 责任 |
|------|------|
| `backend/.../db/migration/V68__membership_scopes.sql` | 建表、商品列、索引 |
| `entity/MembershipPlan.java`, `MemberSubscription.java` | 持久化模型 |
| `MembershipAccessService(.java|*Impl.java)` | scope 鉴权与开通 |
| `MemberPointsServiceImpl.java` | 止血：积分不驱动付费语义 |
| `PaymentServiceImpl.java` | 支付后 `grantSubscription` |
| `ContentServiceImpl.java`, `FileEntitlementServiceImpl.java` | 平台门禁 |
| `AdminMembershipPlanController` + Service | 后台 CRUD |
| `admin/.../member/index.vue`, `planet.vue`, `product/edit.vue` | 配置面 |
| `miniapp` 星球/我的相关页 | 到期展示与跳转 |
| 迁移 Runner 或 `V68` 尾部数据脚本 | 老用户平台订购 |

---

### Task 1: DB migration + Entity/Mapper

**Files:**
- Create: `backend/src/main/resources/db/migration/V68__membership_scopes.sql`
- Create: `backend/src/main/java/com/miniprogram/entity/MembershipPlan.java`
- Create: `backend/src/main/java/com/miniprogram/entity/MemberSubscription.java`
- Create: `backend/src/main/java/com/miniprogram/mapper/MembershipPlanMapper.java`
- Create: `backend/src/main/java/com/miniprogram/mapper/MemberSubscriptionMapper.java`
- Modify: `backend/src/main/java/com/miniprogram/entity/Product.java`（加 `membershipPlanId`）

**Interfaces:**
- Consumes: 无
- Produces: 表结构；Entity 字段与规格 §4 一致（`scope`, `planetId`, `giftPlanetId`, `giftPlanetDays`, `expireAt` 等）

- [ ] **Step 1: 编写 V68 SQL**

```sql
-- V68__membership_scopes.sql
CREATE TABLE IF NOT EXISTS mp_membership_plan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  scope VARCHAR(16) NOT NULL COMMENT 'platform|planet',
  planet_id VARCHAR(64) NULL COMMENT 'scope=planet 时必填',
  name VARCHAR(80) NOT NULL,
  icon VARCHAR(500) NULL,
  description VARCHAR(500) NULL,
  rights JSON NULL,
  discount_rate DECIMAL(3,2) NULL,
  gift_planet_id VARCHAR(64) NULL,
  gift_planet_days INT NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scope_planet_status (scope, planet_id, status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='付费会员档位(平台/星球)';

CREATE TABLE IF NOT EXISTS mp_member_subscription (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  scope VARCHAR(16) NOT NULL,
  planet_id VARCHAR(64) NULL,
  plan_id BIGINT NULL,
  order_id BIGINT NULL,
  source VARCHAR(16) NOT NULL COMMENT 'purchase|gift|migrate|admin',
  start_at DATETIME NOT NULL,
  expire_at DATETIME NULL COMMENT 'NULL=终身',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_scope_planet (user_id, scope, planet_id, status),
  INDEX idx_expire_at (expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='会员订购记录';

-- 商品绑定付费档（幂等加列，风格对齐 V57）
SET @db := DATABASE();
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@db AND TABLE_NAME='mp_product' AND COLUMN_NAME='membership_plan_id');
SET @sql := IF(@exist=0,
  'ALTER TABLE mp_product ADD COLUMN membership_plan_id BIGINT NULL COMMENT ''付费档位ID'' AFTER membership_level_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
```

- [ ] **Step 2: 本地启动或 `flyway migrate` 验证表存在**

Run: 按仓库惯例重启 backend / 执行迁移  
Expected: `mp_membership_plan`、`mp_member_subscription` 存在；`mp_product.membership_plan_id` 存在

- [ ] **Step 3: 补 Entity/Mapper**

`MembershipPlan` / `MemberSubscription` 使用 `@TableName`；`Product` 增加 `membershipPlanId` 字段映射 `membership_plan_id`。

- [ ] **Step 4: 独立验证**

- 插入一条 `scope=platform` plan、一条 `scope=planet, planet_id='warm-main'` plan，查询成功
- 插入一条 subscription，按 `(user_id, scope, planet_id)` 查出

---

### Task 2: 禁止积分回写付费语义（止血）

**Files:**
- Modify: `backend/src/main/java/com/miniprogram/service/impl/MemberPointsServiceImpl.java`（约 `signIn` 内 108-111 行、`changePoints` 内 221-224 行）
- Test: `backend/src/test/java/com/miniprogram/service/impl/MemberPointsServiceImplTest.java`（无则新建）

**Interfaces:**
- Consumes: 现有 `resolveLevel(points)` 仅用于 VO 展示
- Produces: 积分变更**可以**更新成长 `level_id`；在 Task 3 完成前，临时保证：若用户**无** `member_expire_at` 且无订购，不得因 `level_id` 被当成付费（最终以 Task 3 鉴权切换为准）。本任务最低要求：文档化并实现「积分路径不碰 `member_expire_at`」；若当前会 `setLevelId`，保留成长写入但加注释标明非权益真源，并在测试中断言不修改 `member_expire_at`

- [ ] **Step 1: 写失败测试（鉴权切换前的契约）**

```java
@Test
void changePoints_doesNotTouchMemberExpireAt() {
  // given user expireAt=null, points 变化触发 resolveLevel
  // when changePoints / signIn
  // then user.memberExpireAt 仍为 null；不插入 subscription
}
```

- [ ] **Step 2: 确认积分路径无 `setMemberExpireAt`；保留成长 `setLevelId` 时加注释**

```java
// 成长展示档：仅 min_points 展示，付费权益以 mp_member_subscription 为准
MemberLevel growth = resolveLevel(totalPoints);
if (growth != null) {
    user.setLevelId(growth.getId());
}
```

- [ ] **Step 3: 跑测试**

Run: `cd backend && mvn -q -Dtest=MemberPointsServiceImplTest test`  
Expected: PASS

- [ ] **Step 4: 独立验证**

- 手动/接口签到涨积分后：`member_expire_at` 不变；（Task 3 后）无平台订购用户打不开 `member_only` 文章

---

### Task 3: AccessService 按 scope 鉴权

**Files:**
- Modify: `backend/src/main/java/com/miniprogram/service/MembershipAccessService.java`
- Modify: `backend/src/main/java/com/miniprogram/service/impl/MembershipAccessServiceImpl.java`
- Modify: `backend/src/main/java/com/miniprogram/service/impl/ContentServiceImpl.java`（`hasActivePaidMembership` → platform）
- Modify: `backend/src/main/java/com/miniprogram/service/impl/FileEntitlementServiceImpl.java`
- Modify: 星球内容可见路径（`getPublicPlanetHome` 及 Feed 相关调用 `hasActivePaidMembership` 处 → `hasPlanetMembership(userId, planetId)`）
- Test: `backend/src/test/java/com/miniprogram/service/impl/MembershipAccessServiceImplTest.java`

**Interfaces:**
- Consumes: `MemberSubscriptionMapper`
- Produces:

```java
boolean hasPlatformMembership(Long userId);
boolean hasPlanetMembership(Long userId, String planetId);
/** @deprecated 委托 hasPlatformMembership；星球路径禁止使用 */
boolean hasActivePaidMembership(Long userId);
void grantSubscription(Long userId, Long planId, Integer membershipDays, Long orderId);
```

有效行查询伪代码：

```java
boolean active(Long userId, String scope, String planetId) {
  // status=active AND (expire_at IS NULL OR expire_at > now)
  // scope=platform → planet_id IS NULL
  // scope=planet → planet_id = :planetId
}
```

- [ ] **Step 1: 单测先红**

```java
@Test
void platformActive_planetInactive() { /* 仅平台订购 → hasPlatform true, hasPlanet(warm-main) false */ }

@Test
void planetActive_platformInactive() { /* 反例 */ }

@Test
void giftDoesNotOpenOtherPlanets() { /* gift warm-main 不对 warm-read 生效 */ }
```

- [ ] **Step 2: 实现接口与 Impl；`hasActivePaidMembership` 委托平台**

- [ ] **Step 3: 替换调用点（矩阵）**

| 调用方 | 新方法 |
|--------|--------|
| `ContentServiceImpl` | `hasPlatformMembership` |
| `FileEntitlementServiceImpl` | `hasPlatformMembership` |
| `applyShopPrice` / `hasBenefit` | 平台 |
| `getPublicPlanetHome` 会员态 | 平台展示 + 当前 `planetId` 星球订购 |
| 星球 Feed/内容门禁 | `hasPlanetMembership` |

- [ ] **Step 4: 跑测试**

Run: `mvn -q -Dtest=MembershipAccessServiceImplTest,ContentServiceImplTest,FileEntitlementServiceImplTest test`（存在的类）  
Expected: 相关 PASS

- [ ] **Step 5: 独立验证**

- DB 插平台订购 → 会员文章可读；无星球订购 → 星球内容仍锁  
- 仅插星球订购 → 反例成立

---

### Task 4: Admin API + 页面（平台体系、星球体系）

**Files:**
- Create: `backend/.../controller/AdminMembershipPlanController.java` → `/api/v1/admin/membership-plans`
- Create: `backend/.../service/MembershipPlanService.java` + `impl`
- Create: `backend/.../dto/member/MembershipPlanDTO.java`, `MembershipPlanVO.java`
- Modify: `admin/src/api/member.ts`（或新建 `membershipPlan.ts`）
- Modify: `admin/src/views/member/index.vue`（平台付费档 CRUD 分区；成长等级文案纠正）
- Modify: `admin/src/views/member/planet.vue`（按 community 嵌套本星球档）
- Modify: `admin/src/views/product/edit.vue`（`membershipPlanId` 下拉）
- Modify: `admin/src/views/member/level.vue`（文案：成长展示）

**Interfaces:**
- Consumes: Task 1 Entity
- Produces: REST

```text
GET    /api/v1/admin/membership-plans?scope=platform|planet&planetId=
POST   /api/v1/admin/membership-plans
PUT    /api/v1/admin/membership-plans/{id}
DELETE /api/v1/admin/membership-plans/{id}
```

校验：`scope=planet` 必须 `planetId`；平台档 `giftPlanetDays>0` 必须 `giftPlanetId`。

- [ ] **Step 1: 实现 Admin API + 校验**

- [ ] **Step 2: 平台页 UI 可增删改平台档**

- [ ] **Step 3: `planet.vue` 每个 community 卡片下维护 `scope=planet` 档；移除「跳转全局等级即星球权益」误导**

- [ ] **Step 4: 商品编辑绑定 `membershipPlanId`**

- [ ] **Step 5: 独立验证**

- 后台创建平台档、某星球档各一  
- 商品保存后 DB `membership_plan_id` 有值  
- 列表按 `planetId` 过滤正确

---

### Task 5: 支付开通写入订购记录

**Files:**
- Modify: `backend/src/main/java/com/miniprogram/service/impl/PaymentServiceImpl.java`（`grantMembershipIfNeeded` ~258+）
- Modify: `MembershipAccessServiceImpl.grantSubscription`（替代/废弃直接改用户全局的 `grantMembership`）
- Modify: `Product` 读取 `membershipPlanId`；回退旧 `membershipLevelId` 仅 platform + warn 日志

**Interfaces:**
- Consumes: `grantSubscription(userId, planId, days, orderId)`
- Produces: purchase 订购行；平台赠送则额外 `source=gift` 星球行；可选双写 `mp_user.member_expire_at` = 平台 expire；**不**写付费 plan 到 `level_id`

续期规则：

```text
base = max(now, currentActive.expireAt ?? now)
若 days<=0 → expireAt = null（终身）
否则 expireAt = base.plusDays(days)
赠送天数不计入平台 expireAt
```

- [ ] **Step 1: 单测支付履约（mock mapper）**

```java
@Test
void grant_platformWithGift_writesTwoSubscriptions() { ... }

@Test
void grant_doesNotSetLevelIdFromPlan() { ... }
```

- [ ] **Step 2: 实现 `grantSubscription`；`PaymentServiceImpl` 改为传 `product.getMembershipPlanId()`**

- [ ] **Step 3: 旧商品无 plan 时：打 warn，按 platform 回退或拒绝（推荐：生产配置要求绑 plan；本地回退 platform 空 plan_id）**

- [ ] **Step 4: 独立验证**

- 模拟支付 membership 商品 → `mp_member_subscription` 出现 purchase 行  
- 配置 gift → 第二行 gift 且 `planet_id` 正确  
- `level_id` 不被改成 plan id

---

### Task 6: 小程序最小适配（展示到期/跳转）

**Files:**
- Modify: `backend/.../dto/planet/PlanetConfigVO.java`（区分 `platformMemberActive` / `planetMemberActive` / 各自 expire 文案；可保留旧字段作平台镜像以免全断）
- Modify: `MembershipAccessServiceImpl.getPublicPlanetHome`
- Modify: `miniapp` 星球页 / intro / 我的概览（搜索现用 `memberActive`、`expireText` 的页面，如 `pages/planet/*`、`pkg-user` 相关）
- Modify: 若有 `MineOverviewServiceImpl` 会员态字段，改为平台订购

**Interfaces:**
- Consumes: Task 3 鉴权
- Produces: VO 至少包含

```json
{
  "platformMemberActive": true,
  "platformExpireText": "平台会员至 2027-01-01",
  "planetMemberActive": false,
  "planetExpireText": "",
  "packages": [ /* 当前 planetId 的星球包；平台包可另字段 platformPackages 一期可空或同列表按 plan.scope 过滤 */ ]
}
```

- [ ] **Step 1: 后端 VO 返回双 scope 状态**

- [ ] **Step 2: 小程序展示到期；未开通 CTA 跳转对应商品/套餐（星球页跳本星球包；平台门禁卡仍走现有 unlock 商品）**

- [ ] **Step 3: 独立验证**

- 仅平台：我的/文章侧显示已开通；星球 intro 仍示未开通本星球  
- 仅星球：星球可进，文章门禁仍在

---

### Task 7: 数据迁移（老用户 member_expire_at → 平台订购）

**Files:**
- Create: `backend/src/main/java/com/miniprogram/support/MembershipSubscriptionMigrator.java`（`ApplicationRunner` 或管理接口一次性任务，带幂等标记），**或** `V68` 追加可重复 SQL（推荐 Java 便于订单联合判断）
- 幂等：已存在 `source=migrate` 且同 user 平台行则跳过

**规则（与规格 §9.1 一致）：**

```text
IF member_expire_at IS NOT NULL
   OR exists paid membership order
THEN upsert platform subscription (source=migrate, expire_at=member_expire_at)
ELSE
   不建订购（纯积分 level_id 用户）
```

- [ ] **Step 1: 实现 Migrator + 幂等键（如 `mp_system_config` key `membership_subscription_migrated=v1`）**

- [ ] **Step 2: 预发/本地 dry-run 日志：将迁移 N 人、跳过 M 人**

- [ ] **Step 3: 执行后抽检**

- 有 `member_expire_at` 的用户 → 有平台订购且 expire 一致  
- 仅积分 `level_id`、无 expire、无会员订单 → 无平台订购，且 Task 3 后门禁为拒绝

- [ ] **Step 4: 独立验证**

- 迁移跑两次行数不翻倍  
- 回归（改完后再把相关旧功能重测一遍）：签到、买会员、文章门禁、星球未付费可见

---

## 任务依赖顺序

```text
Task1 → Task2（可与 Task1 后并行准备）→ Task3 → Task4 / Task5（Task5 依赖 Task3 的 grant API）
Task6 依赖 Task3 + Task5（展示真实开通）
Task7 建议在 Task3 后、生产放量前；可与 Task4 并行开发
```

推荐执行序：**1 → 2 → 3 → 5 → 4 → 6 → 7**（先鉴权与支付真源，再后台配置与迁移；若运营需先配档再卖，可将 4 提前到 5 之前：**1 → 2 → 3 → 4 → 5 → 6 → 7**）。

本仓库默认采用：**1 → 2 → 3 → 4 → 5 → 6 → 7**。

## Spec 覆盖自审

| 规格章节 | 任务 |
|----------|------|
| §4 数据模型 | Task 1 |
| §8 积分解耦 / 现状债积分回写 | Task 2 |
| §6 门禁矩阵 | Task 3 |
| §5 后台配置面 | Task 4 |
| §7 支付开通与赠送 | Task 5 |
| 一期小程序最小适配 | Task 6 |
| §9 迁移 | Task 7 |
| §2 非目标 | 各任务不扩展自动续费/大改版 |

占位符扫描：无 TBD /「类似 Task N」未展开项。

## 执行交接

Plan 已保存至 `docs/superpowers/plans/2026-09-19-membership-scopes.md`。

**请父 agent 先请用户过一眼设计文档** `docs/superpowers/specs/2026-09-19-membership-scopes-design.md`，确认无异议后再选执行方式：

1. **Subagent-Driven（推荐）** — 每任务新子 agent，任务间审查  
2. **Inline Execution** — 本会话按 executing-plans 批次推进  

**Which approach?**
