# 活动报名自动审核 + 个人签到二维码 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 已登录用户填手机+短信验证码后自动审核通过；为每人生成唯一签到码并在小程序出示二维码；后台扫码核销；替换整场共用 CHK 文字码。

**Architecture:** 报名强制登录态；Redis 存短信验证码；通过后写 `mp_activity_signup`（approved + check_in_code）并创建 `mp_activity_check_in(PENDING)`；二维码载荷 JSON `{"t":"activity_checkin","c":"<code>"}`；管理端 scan API 解析并核销。

**Tech Stack:** Flyway、Spring Boot、Redis、Vue3/Element Plus、微信小程序；短信走系统配置 `sms_*`（未配置时 `sms.mock=true` 仅开发可用）。

## Global Constraints

- 小程序用户一律已微信登录；游客报名不做
- 手机号必填 + 短信验证通过才 `approved`
- 签到码仅 `approved` 后生成/可出示；一人一场活动（`activity_id + user_id` 唯一）
- 不擅自 git commit（除非用户明确要求）
- 不做规则引擎 / 工作人员独立小程序 / 改签转让

**Spec:** `docs/superpowers/specs/2026-08-13-activity-signup-checkin-qr-design.md`

---

## File map

| 文件 | 职责 |
|------|------|
| `V34__activity_signup_checkin_code.sql` | signup 增列 + 唯一索引；check_in.code 唯一 |
| `SmsCodeService` (+ Impl) | 发码/校验/频控 |
| `MpSmsController` | `POST /api/v1/mp/sms/send` |
| `ActivitySignupService` 改造 | 登录报名、校验短信、自动通过、生成码、建 check_in |
| `ActivityCheckInService` | `scanVerify(rawOrCode, activityId?, adminId)` |
| `AdminActivityCheckInController` | `POST .../scan` |
| `SecurityConfig` | 列表/详情匿名；signup/sms/my-signup 需登录 |
| `admin/.../activity/index.vue` | 签到码→扫码核销；报名列表展示微信/签到态 |
| `miniapp/pages/activity-detail/*` | 验证码 UI + 成功后二维码 |
| `miniapp` 二维码组件/工具 | 根据 code 绘 QR |

---

### Task 1: DB 迁移 V34

**Files:**
- Create: `backend/src/main/resources/db/migration/V34__activity_signup_checkin_code.sql`

- [ ] **Step 1: 写入迁移**

```sql
-- 报名：签到码与审核时间
ALTER TABLE mp_activity_signup
  ADD COLUMN IF NOT EXISTS check_in_code VARCHAR(64) DEFAULT NULL COMMENT '个人签到码' AFTER status,
  ADD COLUMN IF NOT EXISTS approved_at DATETIME DEFAULT NULL COMMENT '审核通过时间' AFTER check_in_code,
  ADD COLUMN IF NOT EXISTS rejected_reason VARCHAR(200) DEFAULT NULL COMMENT '拒绝原因' AFTER approved_at;

-- 一人一场
CREATE UNIQUE INDEX IF NOT EXISTS uk_signup_activity_user
  ON mp_activity_signup (activity_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_signup_check_in_code
  ON mp_activity_signup (check_in_code);

-- 签到表码唯一（允许 NULL 历史行）
CREATE UNIQUE INDEX IF NOT EXISTS uk_checkin_code
  ON mp_activity_check_in (check_in_code);

-- 开发 mock 开关（空=生产勿开）
INSERT INTO mp_system_config (config_key, config_value, config_group, description)
SELECT 'sms_mock_enabled', '0', 'sms', '1=开发环境短信验证码走 mock（日志打印），生产必须为 0'
WHERE NOT EXISTS (SELECT 1 FROM mp_system_config WHERE config_key = 'sms_mock_enabled');
```

> 若目标 MySQL 不支持 `ADD COLUMN IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS`，改用与 `V33` 相同的幂等写法（information_schema 判断后再 ALTER）。

- [ ] **Step 2: 自检** — 确认仓库最新迁移号为 V33，本文件为 V34；无重复版本号。

---

### Task 2: Entity / VO 字段

**Files:**
- Modify: `backend/src/main/java/com/miniprogram/entity/ActivitySignup.java`
- Modify: `backend/src/main/java/com/miniprogram/dto/ActivitySignupVO.java`
- Modify: `backend/src/main/java/com/miniprogram/dto/ActivitySignupVO.java`（加微信展示字段可选）

- [ ] **Step 1: Entity 增加**

```java
private String checkInCode;
private LocalDateTime approvedAt;
private String rejectedReason;
```

- [ ] **Step 2: VO 增加**

```java
private String checkInCode;      // 管理端列表可脱敏；小程序 my-signup 返回完整
private LocalDateTime approvedAt;
private String rejectedReason;
private String checkInStatus;    // NONE | PENDING | VERIFIED（由 check_in 表聚合）
private String wxNickname;      // 管理端展示，可选
private String openidMask;      // 如 oXXX***，可选
```

- [ ] **Step 3: 编译** — `mvn -pl backend -DskipTests compile`（或项目惯用命令）通过。

---

### Task 3: 短信验证码服务

**Files:**
- Create: `backend/src/main/java/com/miniprogram/service/SmsCodeService.java`
- Create: `backend/src/main/java/com/miniprogram/service/impl/SmsCodeServiceImpl.java`
- Create: `backend/src/main/java/com/miniprogram/controller/MpSmsController.java`
- Create: `backend/src/test/java/com/miniprogram/service/SmsCodeServiceTest.java`（可用 Mockito + 内存 Map 若测试无 Redis，或 `@SpringBootTest`）
- Modify: `backend/src/main/java/com/miniprogram/config/SecurityConfig.java`（见 Task 5，可本任务先加 sms 路径需登录）

**Interfaces:**
- Produces:
  - `void sendCode(Long userId, String phone, String scene)` — scene 固定 `activity_signup`
  - `void verifyAndConsume(String phone, String scene, String code)` — 失败抛 `BusinessException`

- [ ] **Step 1: 写失败测试（校验错误码）**

```java
@Test
void verifyWrongCodeThrows() {
  // arrange: store code 123456 for phone
  assertThrows(BusinessException.class,
    () -> smsCodeService.verifyAndConsume("13800138000", "activity_signup", "000000"));
}
```

- [ ] **Step 2: 实现 Redis key**

- Key: `sms:{scene}:{phone}` → code，TTL 300s  
- 发送间隔 key: `sms:gap:{scene}:{phone}` TTL 60s  
- 日上限 key: `sms:day:{scene}:{phone}:{yyyyMMdd}` max 10  

逻辑：

1. 校验手机 `^1[3-9]\d{9}$`
2. 间隔/日上限
3. 生成 6 位数字
4. 若 `sms_mock_enabled=1`：只打日志，不调运营商
5. 否则读 `sms_provider/access_key/...`，未配置则抛「短信未配置」
6. `verifyAndConsume`：比对后删除 key

- [ ] **Step 3: MpSmsController**

```java
@PostMapping("/api/v1/mp/sms/send")
public R<Void> send(@RequestBody SmsSendRequest req) {
  Long userId = SecurityUtils.getRequiredCurrentUserId();
  smsCodeService.sendCode(userId, req.getPhone(), req.getScene());
  return R.ok();
}
```

`scene` 仅允许 `activity_signup`。

- [ ] **Step 4: 测试通过**（mock Redis 或 Testcontainers；至少单测 verify 路径）。

---

### Task 4: 报名自动审核 + 生成签到码

**Files:**
- Modify: `backend/src/main/java/com/miniprogram/service/ActivitySignupService.java`
- Modify: `backend/src/main/java/com/miniprogram/service/impl/ActivitySignupServiceImpl.java`
- Modify: `backend/src/main/java/com/miniprogram/controller/MpActivityController.java`
- Modify: `backend/src/main/java/com/miniprogram/service/impl/ActivityServiceImpl.java`（名额 `signed++`）
- Create: `backend/src/test/java/com/miniprogram/service/ActivitySignupServiceTest.java`

**Interfaces:**
- Consumes: `SmsCodeService.verifyAndConsume`；`SecurityUtils.getRequiredCurrentUserId()`；`ActivityCheckInService` 创建 PENDING
- Produces:
  - `ActivitySignupVO createSignup(Long activityId, Long userId, String name, String phone, String session, String smsCode)`
  - `ActivitySignupVO getMySignup(Long activityId, Long userId)`

- [ ] **Step 1: 失败测试用例清单（先写断言再实现）**

1. 无短信/错误短信 → 不落库  
2. 正确短信 → `status=approved`，`checkInCode` 非空，`approvedAt` 非空  
3. 同用户同活动再次报名 → 业务错误  
4. 名额已满 → 拒绝  

- [ ] **Step 2: createSignup 核心逻辑**

```text
1. 校验活动存在且可报名（status=1）
2. verifyAndConsume(phone, "activity_signup", smsCode)
3. 查 uk (activityId,userId) 已存在则抛错
4. quota>0 且 signed>=quota → 满员
5. 生成 checkInCode = UUID 去横线 或 32 字节 hex
6. signup: userId, name, phone, session, status=approved, checkInCode, approvedAt=now
7. activity.signed += 1
8. 插入 ActivityCheckIn: activityId, userId, checkInCode, status=PENDING
9. return VO（含 checkInCode）
```

- [ ] **Step 3: Controller**

```java
@PostMapping("/{id}/signup")
public R<ActivitySignupVO> signup(@PathVariable Long id, @RequestBody SignupRequest req) {
  Long userId = SecurityUtils.getRequiredCurrentUserId();
  return R.ok(activitySignupService.createSignup(
      id, userId, req.getName(), req.getPhone(), req.getSession(), req.getSmsCode()));
}

@GetMapping("/{id}/my-signup")
public R<ActivitySignupVO> mySignup(@PathVariable Long id) {
  Long userId = SecurityUtils.getRequiredCurrentUserId();
  return R.ok(activitySignupService.getMySignup(id, userId));
}
```

`SignupRequest` 增加 `smsCode`。

- [ ] **Step 4: 人工拒绝时**（改造已有 `approveSignup(false)`）：若曾占用名额则 `signed--`；清空或作废 check_in（status 保持/标记无效，扫码拒绝）。

- [ ] **Step 5: 测试通过。**

---

### Task 5: Security 收紧

**Files:**
- Modify: `backend/src/main/java/com/miniprogram/config/SecurityConfig.java`

- [ ] **Step 1: 拆分匿名与鉴权**

当前 `"/api/v1/mp/activities/**"` 整段 `permitAll` 会导致报名无需登录。改为：

```java
.requestMatchers(HttpMethod.GET, "/api/v1/mp/activities", "/api/v1/mp/activities/*").permitAll()
// 注意：不要用 /** 覆盖 signup / my-signup
```

确保以下需 `authenticated`：

- `POST /api/v1/mp/activities/{id}/signup`
- `GET /api/v1/mp/activities/{id}/my-signup`
- `POST /api/v1/mp/sms/send`
- `GET /api/v1/mp/check-ins/qr`（若单独路径）

- [ ] **Step 2: 手工或集成测** — 无 token 调 signup → 401；GET 列表仍 200。

---

### Task 6: 扫码核销 API

**Files:**
- Modify: `backend/src/main/java/com/miniprogram/service/ActivityCheckInService.java`
- Modify: `backend/src/main/java/com/miniprogram/service/impl/ActivityCheckInServiceImpl.java`
- Modify: `backend/src/main/java/com/miniprogram/controller/AdminActivityCheckInController.java`
- Create: DTO `CheckInScanResultVO`（activityName, signupName, phone, checkInId, status）

**Interfaces:**
- Produces: `CheckInScanResultVO scanVerify(String rawPayload, Long expectedActivityId, Long adminUserId)`

- [ ] **Step 1: 解析载荷**

```java
// raw 可为纯 code，或 JSON {"t":"activity_checkin","c":"..."}
String code = parseCheckInCode(rawPayload);
```

- [ ] **Step 2: 核销规则**

1. 按 `check_in_code` 查 check_in；无则查 signup.check_in_code 并补齐/对齐  
2. 若 `expectedActivityId != null` 且不匹配 → 抛「非本场活动签到码」  
3. 已 `VERIFIED` → 抛「已核销」（可带姓名）  
4. signup 非 approved → 拒绝  
5. 更新 VERIFIED、`check_in_time=now`、`verify_method=SCAN`、`verified_by=adminUserId`  
6. 返回结果 VO  

- [ ] **Step 3: Admin API**

```java
@PostMapping("/scan")
public R<CheckInScanResultVO> scan(@RequestBody ScanRequest req) {
  Long adminId = SecurityUtils.getRequiredCurrentUserId();
  return R.ok(activityCheckInService.scanVerify(req.getRaw(), req.getActivityId(), adminId));
}
```

- [ ] **Step 4: 单测** — 首次成功、二次失败、跨活动失败。

---

### Task 7: 管理端 UI

**Files:**
- Modify: `admin/src/api/activity.ts` — 增加 `scanCheckIn(raw, activityId?)`
- Modify: `admin/src/views/activity/index.vue`

- [ ] **Step 1: 列表操作文案** — 「签到码」改为「扫码核销」。

- [ ] **Step 2: 弹窗改造**

- 去掉 `makeCheckinCode` / 整场 CHK 展示与复制  
- 输入框：扫码枪录入或粘贴二维码原文 / 纯 code  
- 按钮「核销」→ 调 `scanCheckIn`  
- 成功 `ElMessage` 展示姓名+手机；刷新统计  
- 保留统计 descriptions  

可选：接入 `html5-qrcode` 摄像头（非必须；输入框为验收底线）。

- [ ] **Step 3: 报名管理表** — 列：微信昵称（若 VO 有）、手机、状态、签到状态；人工拒绝仍可用。

- [ ] **Step 4: 手工验收** — 用已知 code 粘贴核销成功；重复提示已核销。

---

### Task 8: 小程序报名 + 二维码

**Files:**
- Modify: `miniapp/pages/activity-detail/activity-detail.wxml|js|wxss`
- Create: `miniapp/utils/qrcode.js`（或引入轻量 weapp-qrcode；优先无新依赖：用 canvas 绘码库拷贝单文件）
- Modify: `miniapp/services/` 或 request 封装（若有）

- [ ] **Step 1: 表单增加验证码**

- 手机号旁「获取验证码」→ `POST /api/v1/mp/sms/send` `{ phone, scene: 'activity_signup' }`，60s 倒计时  
- 提交带 `smsCode`  
- `AuthUtil.requireLoginForAction` 保持  

- [ ] **Step 2: 报名成功后**

- 拉 `GET .../my-signup` 或直接用 signup 响应的 `checkInCode`  
- 展示区域：canvas/image 二维码，内容为  
  `JSON.stringify({ t: 'activity_checkin', c: checkInCode })`  
- 下方展示文字码备份  
- 若 `checkInStatus===VERIFIED` 显示已核销，不强调可再扫（码仍可显示但后台拒绝）

- [ ] **Step 3: onShow 刷新 my-signup** — 已报名用户进入详情直接看码，隐藏报名表或改为「已报名」。

- [ ] **Step 4: 真机/开发者工具** — 登录→发码（mock 看后端日志）→报名→出码。

---

### Task 9: 端到端验收对照 Spec §9

- [ ] 登录 + 正确短信 → approved，后台见 user/微信信息+手机  
- [ ] 错误短信 → 失败  
- [ ] 通过后可见个人二维码；未通过不可见  
- [ ] 后台扫码核销一次；重复扫提示已核销  
- [ ] 活动管理无共用 CHK-xxx 正式流程  

- [ ] **更新 Spec 状态** 为「已实现」：`docs/superpowers/specs/2026-08-13-activity-signup-checkin-qr-design.md`

---

## Spec coverage check

| Spec 项 | Task |
|---------|------|
| 微信登录 + 记 user | 4, 5 |
| 手机+短信自动通过 | 3, 4 |
| 每人随机签到码 + QR | 4, 8 |
| 后台扫用户码核销 | 6, 7 |
| 去掉共用 CHK | 7 |
| 人工拒绝兜底 | 4, 7 |
| 名额占用 | 4 |
| 短信频控/mock | 3 |
| Security 报名需登录 | 5 |

## Placeholder scan

无 TBD；短信真实运营商适配若配置缺失则明确报错 + mock 开关。
