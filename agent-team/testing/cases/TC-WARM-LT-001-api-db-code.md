# TC-WARM-API-001 ~ TC-WARM-API-006 / TC-WARM-DB-* / TC-WARM-CODE-*（接口·DB·代码）

本文件收录本批可在服务器/仓库执行的用例明细。真机用例见同批汇总 md 的 TC-WARM-MP-*（一律 NOT_RUN）。

---

## TC-WARM-API-001

- 用例 ID：`TC-WARM-API-001`
- 关联功能点 ID：`FP-WARM-011`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：生产 API 可达
- 执行步骤：
  1. `GET https://api.zfculture.site/api/health`
- 预期结果：
  - 接口响应：HTTP 200，`data.status=UP`
- 实际结果：`{"code":200,...,"status":"UP",...}`
- 证据：`agent-team/testing/evidence/BATCH-QA-WARM-LT-001/api-health.json`
- 结论：`PASS`

---

## TC-WARM-API-002

- 用例 ID：`TC-WARM-API-002`
- 关联功能点 ID：`FP-WARM-011`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：无 MP token
- 执行步骤：
  1. `POST /api/v1/mp/upload` 附带图片，无 Authorization
- 预期结果：HTTP 401 / code=110101
- 实际结果：`{"code":110101,"message":"未登录"}` HTTP 401
- 证据：`evidence/BATCH-QA-WARM-LT-001/upload-unauth.json`
- 结论：`PASS`

---

## TC-WARM-API-003

- 用例 ID：`TC-WARM-API-003`
- 关联功能点 ID：`FP-WARM-011`
- 测试层级：接口
- 覆盖维度：正常路径 / 数据一致性
- 前置条件：生产磁盘存在 avatar 文件
- 执行步骤：
  1. SSH 取样本 `/opt/miniprogram-platform/backend/uploads/avatar/2026-09-19/*.png`
  2. `GET https://api.zfculture.site/uploads/avatar/2026-09-19/<file>`
  3. 另测用户 1 头像 URL（DB）
- 预期结果：HTTP 200
- 实际结果：两样本均为 HTTP 200
- 证据：`evidence/BATCH-QA-WARM-LT-001/uploads-200.txt`
- 结论：`PASS`

---

## TC-WARM-API-004

- 用例 ID：`TC-WARM-API-004`
- 关联功能点 ID：`FP-WARM-010`
- 测试层级：接口
- 覆盖维度：正常路径 / 边界值
- 前置条件：无
- 执行步骤：
  1. `GET /api/v1/mp/planet/home`
- 预期结果：含 `platformMemberActive`、`planetMemberActive`（及兼容 `memberActive`）
- 实际结果：三字段均存在且为 false；另有 platformPackages
- 证据：`evidence/BATCH-QA-WARM-LT-001/planet-home.json`、`planet-dual-fields.json`
- 结论：`PASS`

---

## TC-WARM-API-005

- 用例 ID：`TC-WARM-API-005`
- 关联功能点 ID：`FP-WARM-010`
- 测试层级：接口
- 覆盖维度：权限越权（正常登录路径未测）
- 前置条件：无 MP token
- 执行步骤：
  1. `GET /api/v1/mp/mine/overview` 无 token
- 预期结果：未登录 401；登录后应返回双态字段（本步未测）
- 实际结果：401/110101；登录成功路径因无 token **未测**
- 证据：`evidence/BATCH-QA-WARM-LT-001/mine-overview-unauth.json`
- 结论：`PARTIAL`

---

## TC-WARM-API-006

- 用例 ID：`TC-WARM-API-006`
- 关联功能点 ID：`FP-WARM-003`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：有效 MP JWT
- 执行步骤：
  1. POST `/mp/upload` subDir=avatar
  2. PUT `/mp/auth/profile` avatarUrl=公网 URL
- 预期结果：200 且 DB 为 https/uploads
- 实际结果：无生产 MP token，未执行
- 证据：—
- 结论：`NOT_RUN`

---

## TC-WARM-DB-001

- 用例 ID：`TC-WARM-DB-001`
- 关联功能点 ID：`FP-WARM-003`
- 测试层级：后台
- 覆盖维度：数据一致性 / 异常输入（禁临时路径）
- 前置条件：SSH + `miniprogram_prod`
- 执行步骤：
  1. 统计 `avatar_url` 含 `wxfile:` / `http://tmp/` / `file://` 数量
  2. 列出非空 avatar 样本
- 预期结果：bad=0；样本为 https 或空/合法展示路径
- 实际结果：`bad_wxfile=0`；id=1 为 `https://api.zfculture.site/uploads/...`；id=2 为 `/images/default-avatar.png`（非 wxfile）
- 证据：`evidence/BATCH-QA-WARM-LT-001/db-snapshot.txt`
- 结论：`PASS`

---

## TC-WARM-DB-002

- 用例 ID：`TC-WARM-DB-002`
- 关联功能点 ID：`FP-WARM-010`
- 测试层级：后台
- 覆盖维度：数据一致性
- 执行步骤：`SHOW TABLES` 确认 subscription/membership 相关表
- 实际结果：`mp_member_subscription`、`mp_membership_plan` 存在（当前行数均为 0）
- 证据：`db-snapshot.txt`
- 结论：`PASS`

---

## TC-WARM-DB-003

- 用例 ID：`TC-WARM-DB-003`
- 关联功能点 ID：`FP-WARM-011`（版本对齐冒烟）
- 测试层级：后台
- 覆盖维度：正常路径
- 执行步骤：读产盘 `miniapp/pkg-user/settings/settings.js` 的 `version`；对照本地 `SWEEP-LONGTAIL-2026-09-19/upload.json`
- 实际结果：产盘 `version: '1.30.4'`；upload.json `version":"1.30.4"`
- 证据：`db-snapshot.txt`；`evidence/SWEEP-LONGTAIL-2026-09-19/upload.json`
- 结论：`PASS`

---

## TC-WARM-CODE-001（设置昵称/头像）

- 关联：`FP-WARM-002` `FP-WARM-003`
- 层级：代码静态（**非真机**）
- 逻辑证据：
  - `miniapp/pkg-user/settings/settings.js`：`_avatarPicking` 防 onShow 冲掉 pending；`_pendingAvatarLocal` 同步字段；`_uploadAvatarIfNeeded` → `POST /api/v1/mp/upload` subDir=avatar；失败 toast「头像上传失败」；`AuthService.updateProfile`；`isPersistedMediaUrl` / `isTempLocalAvatar` 拒绝临时路径
  - `miniapp/utils/image-fallback.js`：`isPersistedMediaUrl` 排除 wxfile/tmp/file
  - `miniapp/utils/auth.js`：`rememberLoginProfile` 拒绝临时 avatar 入库缓存
- 结论：`PARTIAL`（代码证据；真机见 TC-WARM-MP-002/003）

## TC-WARM-CODE-002

- 关联：`FP-WARM-004`
- 证据：`miniapp/pages/mine/mine.js` `onAvatarError` → `DEFAULT_AVATAR`；`mine.wxml` `binderror="onAvatarError"`；`miniapp/images/default-avatar.png` 存在（858B）
- 结论：`PARTIAL`

## TC-WARM-CODE-003

- 关联：`FP-WARM-005`
- 证据：`miniapp/pkg-user/service-chat/service-chat.js` `onPickImage` → upload → `isPersistedMediaUrl` 校验后入消息
- 结论：`PARTIAL`

## TC-WARM-CODE-004

- 关联：`FP-WARM-006`
- 证据：`miniapp/pages/form/form.js`、`miniapp/pkg-extra/form/form.js`、`miniapp/pages/contribute/contribute.js` 均 `isPersistedMediaUrl` + upload
- 结论：`PARTIAL`

## TC-WARM-CODE-005

- 关联：`FP-WARM-007`
- 证据：`miniapp/pkg-trade/write-review/write-review.js` `uploadReviewImages` 在提交前强制远程 URL
- 结论：`PARTIAL`

## TC-WARM-CODE-006

- 关联：`FP-WARM-008`
- 证据：`favorites.wxml` / `product-list.wxml` 回落 `/images/default-product.png`；`appointment-*.wxml` 回落 `default-service.png`；包内 PNG 均存在
- 结论：`PARTIAL`

## TC-WARM-CODE-007

- 关联：`FP-WARM-009`
- 证据：`member-center.js` / `sign-in.js`：`todaySigned` 时 `wx.showToast({ title: '今日已签到' })`
- 结论：`PARTIAL`

## TC-WARM-CODE-008

- 关联：`FP-WARM-012`
- 证据：settings 保存 catch toast；service-chat/upload 失败 throw+toast；**弱网真机未测**
- 结论：`PARTIAL`（失败文案代码侧）；对应真机 TC `NOT_RUN`
