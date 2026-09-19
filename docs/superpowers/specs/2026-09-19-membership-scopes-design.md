# 平台会员 + 各星球可配会员（方案 B）设计规格

日期：2026-09-19  
状态：已批准（方案 B），待实现  
范围：一期 = 数据模型 + 后台可配 + 门禁（正式放行前必须过的验收标准）按 scope 拆分；小程序购买/展示仅最小适配

## 1. Goal

把「付费权益」从全局单轨（`mp_user.level_id` + `member_expire_at`）拆成两套可并存的订购：

| 范围 `scope` | 含义 | 门禁覆盖 |
|--------------|------|----------|
| `platform` | 平台会员 | 文章 `member_only`、商城会员价/免费、资料库会员档 |
| `planet` | 指定星球会员 | 仅该 `planet_id` 下的星球内容（动态/提问/星球内资料等） |

核心原则：

1. **各自购买、互不顶替**：买平台不自动通开全部星球；买某星球不顶替平台到期时间。
2. **平台可配「赠送星球天数」**：开通平台档位时可向**某一个**（或配置列表内的）星球写入赠送订购；**不默认**通开全部星球。
3. **积分银/金/钻仅成长展示**：积分升降级不再充当付费权益真源；禁止积分链路把「权益档」写进付费判定字段。

## 2. 非目标（一期不做）

- 不做：多星球打包 SKU、跨星球统一通行证、自动续费/签约代扣。
- 不做：小程序会员中心大改版、复杂对比购买页、运营活动叠加（首购折扣叠加规则之外的营销编排）。
- 不做：把成长等级表 `mp_member_level`（积分门槛银金钻）与付费档位表物理合并或重命名大迁移（一期语义拆开即可，列名可暂留）。
- 不做：优惠券 `claim_level_ids` 改绑付费档位（一期仍可读成长等级；付费权益券二期再议）。
- 不做：历史订单商品字段强制回填；仅保证新支付开通写订购记录，旧用户靠迁移脚本落平台订购。
- 不做：租户（多商户隔离）维度的会员体系分叉（沿用现有单租户/现网模型）。

## 3. 现状债（必须改造的根因）

| 债项 | 现状 | 问题 |
|------|------|------|
| 付费门禁全局 | `MembershipAccessServiceImpl.hasActivePaidMembership` 看 `level_id != null` 且 `member_expire_at` 未过期（`null` 当终身） | 文章/商城/资料库/星球共用一把钥匙 |
| 星球仅展示 | `planet_config.communities[]` + `listCommunities` | 无每星球订购；`joined` 多为配置态 |
| 积分回写权益 | `MemberPointsServiceImpl` 签到/`changePoints` 按 `min_points` `resolveLevel` 后 `user.setLevelId` | 积分达标即可被当成「有 level → 付费有效（若 expire 为空则终身）」 |
| 会员商品全局 | `product_type=membership` + `membership_level_id` / `membership_days`；`grantMembership` 只改用户全局字段 | 无法区分平台/星球 SKU；`gift_planet_days` 直接叠进同一 `member_expire_at` |
| 后台入口混淆 | `admin/.../member/level.vue`、`planet.vue`「会员等级」Tab 跳转全局等级 | 星球页无法嵌套配置本星球付费档 |

## 4. 数据模型

### 4.1 付费档位 `mp_membership_plan`

付费体系独立表（与积分成长 `mp_member_level` 分离）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT PK | |
| `scope` | VARCHAR(16) NOT NULL | `platform` \| `planet` |
| `planet_id` | VARCHAR(64) NULL | `scope=planet` 时必填，对齐 `communities[].id`（如 `warm-main`）；`platform` 必须为 NULL |
| `name` | VARCHAR(80) NOT NULL | 展示名，如「平台年卡」「暖阁星球季卡」 |
| `icon` | VARCHAR(500) NULL | |
| `description` | VARCHAR(500) NULL | |
| `rights` | JSON NULL | 权益码列表（沿用现有 `MemberBenefitCodes` 可读子集；星球档一期可只作展示） |
| `discount_rate` | DECIMAL(3,2) NULL | 仅平台档用于商城折扣；星球档忽略 |
| `gift_planet_id` | VARCHAR(64) NULL | 仅平台档：赠送目标星球；空 = 本档不赠送 |
| `gift_planet_days` | INT NOT NULL DEFAULT 0 | 仅平台档：赠送天数；0 = 不赠送。`days>0` 时 `gift_planet_id` 必填 |
| `sort_order` | INT DEFAULT 0 | |
| `status` | TINYINT DEFAULT 1 | 1 启用 / 0 禁用 |
| `created_at` / `updated_at` | DATETIME | |

约束：

- CHECK 或应用层：`(scope='platform' AND planet_id IS NULL) OR (scope='planet' AND planet_id IS NOT NULL)`
- 索引：`(scope, planet_id, status, sort_order)`

### 4.2 订购记录 `mp_member_subscription`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT PK | |
| `user_id` | BIGINT NOT NULL | |
| `scope` | VARCHAR(16) NOT NULL | `platform` \| `planet` |
| `planet_id` | VARCHAR(64) NULL | 同 plan 规则 |
| `plan_id` | BIGINT NULL | 开通时档位；迁移数据可空 |
| `order_id` | BIGINT NULL | 支付订单；赠送/迁移可空 |
| `source` | VARCHAR(16) NOT NULL | `purchase` \| `gift` \| `migrate` \| `admin` |
| `start_at` | DATETIME NOT NULL | |
| `expire_at` | DATETIME NULL | NULL = 终身有效 |
| `status` | VARCHAR(16) NOT NULL | `active` \| `expired` \| `cancelled`；鉴权以时间+status 为准 |
| `created_at` / `updated_at` | DATETIME | |

有效判定（鉴权真源）：

```text
status = 'active'
AND (expire_at IS NULL OR expire_at > now)
AND scope / planet_id 匹配资源要求
```

同一用户同一 `(scope, planet_id)` 允许历史多行；**开通续期**时延长当前有效行的 `expire_at`（从 `max(now, 当前 expire_at)` 起加天数），不删除历史行亦可（一期推荐：找最新 active 行更新；若无则 insert）。

索引建议：

- `(user_id, scope, planet_id, status)`
- `(expire_at)`

### 4.3 商品字段扩展 `mp_product`

| 字段 | 说明 |
|------|------|
| 现有 `product_type` / `product_types` 含 `membership` | 保留 |
| 现有 `membership_days` | 保留，开通天数仍以商品为准 |
| 现有 `membership_level_id` | **兼容只读**：旧数据；新配置写 `membership_plan_id` |
| **新增** `membership_plan_id` | BIGINT NULL，指向 `mp_membership_plan.id` |

支付开通：优先 `membership_plan_id`；若为空则回退旧 `membership_level_id` 映射规则（见 §7），避免上线瞬间断购。

### 4.4 成长等级与用户字段语义

| 对象 | 一期语义 |
|------|----------|
| `mp_member_level` | **仅成长展示**（银/金/钻，`min_points`） |
| `mp_user.level_id` | 仅指向成长等级；**不再**作为付费门禁条件 |
| `mp_user.member_expire_at` | **废弃为兼容镜像**：迁移后可由平台订购回填；新开通以 subscription 为准，可双写平台 `expire_at` 便于旧接口展示，但鉴权不读此字段 |

积分服务：可继续按积分更新 `level_id`（成长展示），但 **不得** 因积分变更改写任何 `mp_member_subscription`，也不得把付费 `plan_id` 写入 `level_id`。

### 4.5 表关系（逻辑）

```text
mp_membership_plan (scope, planet_id?)
        ^
        | plan_id
mp_member_subscription (user_id, scope, planet_id?, expire_at)
        ^
        | 支付 grant / 赠送 / 迁移

mp_product.membership_plan_id → plan
mp_member_level ← mp_user.level_id（成长，旁路）
```

## 5. 后台配置面

### 5.1 平台会员页

路径沿用并扩展：

- 页面：`admin/src/views/member/index.vue` 或独立「平台会员」Tab / 子页（推荐在 `index.vue` 增加「付费档位」与「成长等级」分区，避免运营找不到）
- API：`AdminMemberLevelController` 旁新增 `AdminMembershipPlanController`（`/api/v1/admin/membership-plans`），按 `scope=platform` 过滤
- 能力：CRUD 平台档；配置 `discount_rate`、`rights`、`gift_planet_id` + `gift_planet_days`；关联可售商品列表（只读链到商品编辑的 `membership_plan_id`）

成长等级（原积分档）UI 保留在 `level.vue` / `index.vue`，文案改为「成长等级（展示）」，去掉「开通后写入」误导说明。

### 5.2 星球页嵌套

路径：`admin/src/views/member/planet.vue`

- 在现有「星球展示 / 动态运营 / 社区列表」旁，按 `communities[]` 每项展开 **「本星球会员档」** 子表
- API：同一 `membership-plans` 资源，`scope=planet&planetId=xxx`
- 「会员等级」Tab 不再跳转全局成长等级充当星球权益；改为嵌套 CRUD 或深链到带 `planetId` 的档位编辑
- 未付费可见（`unpaidViewMode` / `previewCount`）仍属星球展示配置，与订购鉴权配合：无本星球订购时走未付费策略

### 5.3 商品编辑

路径：`admin/src/views/product/edit.vue`

- 会员商品必选 `membership_plan_id`（下拉按 scope 分组：平台 / 各星球）
- 保存时校验：plan 的 scope 与运营意图一致（星球商品必须绑 `scope=planet` 的 plan）

## 6. 门禁矩阵

| 资源 | 判定服务方法（目标） | 通过条件 | 失败表现（沿用现网交互） |
|------|----------------------|----------|--------------------------|
| 文章列表/详情 `visibility=member_only` | `hasPlatformMembership(userId)` | 平台订购有效 | 门禁卡 / 列表过滤（现 `ContentServiceImpl`） |
| 商城会员价、`member_free`、会员折扣权益 | `hasPlatformMembership` + 平台档 `rights`/`discount_rate` | 同上 | 原价 |
| 资料库会员可读/可下 | `FileEntitlementServiceImpl` 改调平台 | 平台订购有效 | 无权限 |
| 星球首页套餐/到期文案 | 返回平台 + **当前 planetId** 订购态 | 分别展示 | 引导购买对应 scope |
| 星球动态/提问等星球内容 | `hasPlanetMembership(userId, planetId)` | **该**星球订购有效 | `unpaidViewMode` |
| 平台赠送的星球天数 | 写入 `scope=planet` 订购 `source=gift` | 仅赠送目标星球 | 其他星球仍锁 |

兼容期：`hasActivePaidMembership` 标记 `@Deprecated`，实现改为委托 `hasPlatformMembership`，避免漏改调用点导致星球误用平台钥匙——**星球链路必须显式改调** `hasPlanetMembership`，禁止继续用旧方法挡星球内容。

调用点一期必改清单：

- 平台：`ContentServiceImpl`、`FileEntitlementServiceImpl`、`MembershipAccessServiceImpl.applyShopPrice` / `hasBenefit`、`MineOverviewServiceImpl`（「我的」平台会员态）
- 星球：`MembershipAccessServiceImpl.getPublicPlanetHome`、星球 Feed/内容相关 Service（凡今日用 `hasActivePaidMembership` 控制星球可见的路径）

## 7. 支付开通与赠送

入口：`PaymentServiceImpl.grantMembershipIfNeeded` → 改为调用新 API，例如：

```text
membershipAccessService.grantSubscription(userId, planId, membershipDays, orderId)
```

行为：

1. 读 `mp_membership_plan`；按 `scope` 写入/续期对应 `mp_member_subscription`（`source=purchase`）。
2. 若平台档 `gift_planet_days > 0` 且配置了 `gift_planet_id`：再写入/续期该星球订购（`source=gift`，天数=赠送天数；**不**把赠送天数加进平台 `expire_at`）。
3. 可选双写：`mp_user.member_expire_at` = 平台订购 `expire_at`（仅镜像）。
4. **禁止**再把付费 `plan_id` 写入 `mp_user.level_id`。

回退映射（无 `membership_plan_id` 的旧商品）：

- 若仅有 `membership_level_id`：视为 **platform** 开通；`plan_id` 可空或指向迁移期「影子平台档」；`gift_planet_days` 若仍挂在旧 `mp_member_level` 上，按旧字段赠送逻辑迁到「指定默认主星球」或要求运营补全 `membership_plan_id`（上线检查清单要求：在售 membership 商品必须绑 plan）。

## 8. 积分与权益解耦

| 动作 | 允许 | 禁止 |
|------|------|------|
| 签到/消费积分更新 `points` | ✓ | |
| 按 `min_points` 更新成长 `level_id` | ✓（展示） | 用该写入结果做付费鉴权 |
| 生日礼包按成长等级权益 | ✓（一期保持） | 与平台订购绑死 |
| 积分变更改 `member_expire_at` / subscription | | ✓ 禁止 |
| `grantSubscription` 写成长 `level_id` | | ✓ 禁止 |

止血可先于完整门禁上线：先合并「去掉积分路径对付费语义的污染」（见实现计划 Task 2）。

## 9. 迁移与兼容

### 9.1 老用户 `member_expire_at`

对 `mp_user`：

1. **可信付费信号**（满足任一）才迁移为平台订购：
   - `member_expire_at IS NOT NULL`（含已过期：落 `status=expired` 或 active 且 expire 在过去，鉴权自然失败），或
   - 存在已支付且商品为 membership 的订单履约记录。
2. `member_expire_at IS NULL` 且仅有 `level_id`、无 membership 订单：视为 **积分成长误伤**，**不**建平台订购；保留/重算成长 `level_id`。
3. 迁移行：`scope=platform`，`source=migrate`，`expire_at=member_expire_at`（原 NULL 且有订单终身证据 → `expire_at` NULL），`plan_id` 尽量按订单商品反查，否则空。

### 9.2 兼容读

- 旧接口若仍返回 `memberExpireAt` / `memberActive`：改为由平台订购计算。
- 星球包列表：`listPackages` 按当前 `planetId` 过滤 `scope=planet` 的商品；平台购买入口另给平台商品（一期小程序可「最小」：星球页只列本星球包 + 文案链到平台会员若需要）。

### 9.3 双写窗口

一期允许 `member_expire_at` 双写平台到期，便于报表/旧 SQL；**下线条件**（二期）：全站鉴权与展示不再读该列后，停止双写并文档标记废弃。

## 10. 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| 积分曾写 `level_id` 导致「伪终身会员」 | 迁移误开通平台 | 迁移只用 expire/订单信号；先止血积分回写权益语义 |
| 调用点漏改，星球仍走平台钥匙 | 买平台通开全星球（违背方案 B） | 门禁矩阵清单 + 单测按 scope；Code review 禁止星球路径调用 `hasActivePaidMembership` |
| 赠送天数叠错到平台到期 | 与现网 `grantMembership` 旧 bug 同类 | 赠送只写 planet subscription |
| 在售商品未绑 `membership_plan_id` | 支付开通落到回退逻辑不一致 | 上线前后台巡检；回退仅 platform 且打 warn 日志 |
| 社区 `planet_id` 与内容 `planet_id` 不一致 | 订购对不上内容 | 以 `communities[].id` 与 `V67` 内容星球字段为同一套 ID 约定 |
| 双写 `member_expire_at` 与订购漂移 | 运维看错到期 | 鉴权只信 subscription；镜像仅 grant/迁移时写 |

## 11. 一期验收标准

1. 库表 `mp_membership_plan` / `mp_member_subscription` 存在；Flyway 可重复执行环境可升级。
2. 后台可配置平台档与某星球档；商品可绑 plan。
3. 平台有效、星球无效：文章/商城/资料库可过，目标星球内容不可过。
4. 仅星球有效：该星球可过，平台文章门禁不过。
5. 平台档赠送星球天数：只增加目标星球订购，平台到期不等于全星球通开。
6. 积分增减不再导致「无订购却通过付费门禁」。
7. 小程序能展示平台/当前星球到期或未开通，并跳转对应购买入口（最小即可）。
8. 迁移后：原有真实付费用户平台权益不丢；纯积分用户不获平台权益。

## 12. 规格自审记录

- 无 TBD 占位；一期边界与非目标已切开。
- 平台 vs 星球购买互不顶替，与赠送「单星球天数」无矛盾。
- 鉴权真源唯一：`mp_member_subscription`；`level_id` / `member_expire_at` 降级为成长/镜像。
- 与现码锚点一致：`MembershipAccessService*`、`MemberPointsServiceImpl`、`PaymentServiceImpl.grantMembershipIfNeeded`、`admin/.../member/planet.vue`、`ContentServiceImpl` / `FileEntitlementServiceImpl`。
