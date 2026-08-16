# 页面装修器 · 接口用例 TC-API-001~078

> 本文件已执行。结论以各条 `结论` 字段为准。无证据不得记 PASS。

# TC-API-001

- 用例 ID：`TC-API-001`
- 关联功能点 ID：`FP-API-001`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` 成功返回分页列表
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages` 成功返回分页列表
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：total=4
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-002

- 用例 ID：`TC-API-002`
- 关联功能点 ID：`FP-API-002`
- 测试层级：接口
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` 空列表
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages` 空列表
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：total=0 (filtered empty; env not globally empty)
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-003

- 用例 ID：`TC-API-003`
- 关联功能点 ID：`FP-API-003`
- 测试层级：接口
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` 分页 `page` 从 1
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages` 分页 `page` 从 1
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：current=1 pageField=undefined (contract page, impl current)
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-004

- 用例 ID：`TC-API-004`
- 关联功能点 ID：`FP-API-004`
- 测试层级：接口
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` `page_size` 默认 20
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages` `page_size` 默认 20
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：default size=10 expected 20
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-005

- 用例 ID：`TC-API-005`
- 关联功能点 ID：`FP-API-005`
- 测试层级：接口
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` `page_size` 超过 100 被拒绝
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages` `page_size` 超过 100 被拒绝
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：page_size=101 size=10; size=101 size=101
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-006

- 用例 ID：`TC-API-006`
- 关联功能点 ID：`FP-API-006`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` 按 type 筛选
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages` 按 type 筛选
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：n=2 types=1
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-007

- 用例 ID：`TC-API-007`
- 关联功能点 ID：`FP-API-007`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` 按 status 筛选
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages` 按 status 筛选
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：n=3 statuses=1
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-008

- 用例 ID：`TC-API-008`
- 关联功能点 ID：`FP-API-008`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` 关键词搜索
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages` 关键词搜索
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：total=2
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-009

- 用例 ID：`TC-API-009`
- 关联功能点 ID：`FP-API-009`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-010

- 用例 ID：`TC-API-010`
- 关联功能点 ID：`FP-API-010`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` Token 过期 110102
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110102
  - 页面表现：提示登录过期
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-011

- 用例 ID：`TC-API-011`
- 关联功能点 ID：`FP-API-011`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages` 参数非法 100101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：http=400 code=400 msg=Failed to convert property value of type 'java.lang.String' to required type 'java.lang.Long' for property 'current'; For input string: "abc"
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-012

- 用例 ID：`TC-API-012`
- 关联功能点 ID：`FP-API-012`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` 创建成功（201/200）
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`POST /admin/pages` 创建成功（201/200）
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：http=200 id=5
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-013

- 用例 ID：`TC-API-013`
- 关联功能点 ID：`FP-API-013`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` 缺少 name
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：http=400 code=400
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-014

- 用例 ID：`TC-API-014`
- 关联功能点 ID：`FP-API-014`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` 缺少 type
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：http=400 code=400
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-015

- 用例 ID：`TC-API-015`
- 关联功能点 ID：`FP-API-015`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` 缺少 path
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：http=400 code=400
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-016

- 用例 ID：`TC-API-016`
- 关联功能点 ID：`FP-API-016`
- 测试层级：接口
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` name 超 128
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`POST /admin/pages` name 超 128
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：name 129 返回 HTTP 500/code 500，不是参数校验
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-017

- 用例 ID：`TC-API-017`
- 关联功能点 ID：`FP-API-017`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` type 非法
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：http=200 code=200 created=true
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-018

- 用例 ID：`TC-API-018`
- 关联功能点 ID：`FP-API-018`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` JSON 非法 100102
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：http=400 code=400
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-019

- 用例 ID：`TC-API-019`
- 关联功能点 ID：`FP-API-019`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-020

- 用例 ID：`TC-API-020`
- 关联功能点 ID：`FP-API-020`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` 角色不足 200301（低于 content_ops）
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 403，code=200301
  - 页面表现：无权限提示
  - 数据库落库：无写库
- 实际结果：环境仅超管 admin，未创建低权限账号（总控禁止额外开账号）
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-021

- 用例 ID：`TC-API-021`
- 关联功能点 ID：`FP-API-021`
- 测试层级：接口
- 覆盖维度：幂等与重复
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages` 重复提交/幂等
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：第二次不产生额外副作用（或明确拒绝）
  - 页面表现：无重复创建/重复版本
  - 数据库落库：记录数不增加或版本不连跳异常
- 实际结果：second create http=422 code=300203
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-022

- 用例 ID：`TC-API-022`
- 关联功能点 ID：`FP-API-022`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages/{id}` 成功
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages/{id}` 成功
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：id=5
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-023

- 用例 ID：`TC-API-023`
- 关联功能点 ID：`FP-API-023`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages/{id}` 不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=404 code=300401
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-024

- 用例 ID：`TC-API-024`
- 关联功能点 ID：`FP-API-024`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages/{id}` id 类型错误
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages/{id}` id 类型错误
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：http=400 code=400
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-025

- 用例 ID：`TC-API-025`
- 关联功能点 ID：`FP-API-025`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages/{id}` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-026

- 用例 ID：`TC-API-026`
- 关联功能点 ID：`FP-API-026`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`PUT /admin/pages/{id}` 更新成功
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`PUT /admin/pages/{id}` 更新成功
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：PUT 返回 name=QA接口页-改名；mysql 客户端中文乱码不影响
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-027

- 用例 ID：`TC-API-027`
- 关联功能点 ID：`FP-API-027`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`PUT /admin/pages/{id}` 不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=404 code=300401
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-028

- 用例 ID：`TC-API-028`
- 关联功能点 ID：`FP-API-028`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`PUT /admin/pages/{id}` 缺少必填
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：empty PUT http=200 code=200 (UpdateDTO fields optional — may not 400)
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-029

- 用例 ID：`TC-API-029`
- 关联功能点 ID：`FP-API-029`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`PUT /admin/pages/{id}` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-030

- 用例 ID：`TC-API-030`
- 关联功能点 ID：`FP-API-030`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`PUT /admin/pages/{id}` 角色不足 200301
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 403，code=200301
  - 页面表现：无权限提示
  - 数据库落库：无写库
- 实际结果：无低于 content_ops 的第二账号
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-031

- 用例 ID：`TC-API-031`
- 关联功能点 ID：`FP-API-031`
- 测试层级：接口
- 覆盖维度：幂等与重复
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`PUT /admin/pages/{id}` 重复提交/幂等
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：第二次不产生额外副作用（或明确拒绝）
  - 页面表现：无重复创建/重复版本
  - 数据库落库：记录数不增加或版本不连跳异常
- 实际结果：repeat PUT codes 200/200
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-032

- 用例 ID：`TC-API-032`
- 关联功能点 ID：`FP-API-032`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`DELETE /admin/pages/{id}` 草稿删除成功
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`DELETE /admin/pages/{id}` 草稿删除成功
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：http=200 db=7	1
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-033

- 用例 ID：`TC-API-033`
- 关联功能点 ID：`FP-API-033`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`DELETE /admin/pages/{id}` 已发布不可删 300201
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 422，code=300201
  - 页面表现：提示需先下架
  - 数据库落库：页面记录仍在
- 实际结果：DELETE id=1 http=422 code=300201 msg=页面已发布，不可删除
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-034

- 用例 ID：`TC-API-034`
- 关联功能点 ID：`FP-API-034`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`DELETE /admin/pages/{id}` 不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=404 code=300401
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-035

- 用例 ID：`TC-API-035`
- 关联功能点 ID：`FP-API-035`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`DELETE /admin/pages/{id}` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-036

- 用例 ID：`TC-API-036`
- 关联功能点 ID：`FP-API-036`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`DELETE /admin/pages/{id}` 角色不足 200301
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 403，code=200301
  - 页面表现：无权限提示
  - 数据库落库：无写库
- 实际结果：无低于 content_ops 的第二账号
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-037

- 用例 ID：`TC-API-037`
- 关联功能点 ID：`FP-API-037`
- 测试层级：接口
- 覆盖维度：幂等与重复
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`DELETE /admin/pages/{id}` 重复删除/幂等
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：第二次不产生额外副作用（或明确拒绝）
  - 页面表现：无重复创建/重复版本
  - 数据库落库：记录数不增加或版本不连跳异常
- 实际结果：repeat DELETE http=404 code=300401
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-038

- 用例 ID：`TC-API-038`
- 关联功能点 ID：`FP-API-038`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/draft` 保存成功并升版本
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`POST /admin/pages/{id}/draft` 保存成功并升版本
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：code=200 versions=1	0
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-039

- 用例 ID：`TC-API-039`
- 关联功能点 ID：`FP-API-039`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/draft` 缺少 DSL
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：http=400 code=400
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-040

- 用例 ID：`TC-API-040`
- 关联功能点 ID：`FP-API-040`
- 测试层级：接口
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/draft` DSL JSON 非法
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：http=422 code=300202
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-041

- 用例 ID：`TC-API-041`
- 关联功能点 ID：`FP-API-041`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/draft` 页面不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=404 code=300401
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-042

- 用例 ID：`TC-API-042`
- 关联功能点 ID：`FP-API-042`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/draft` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-043

- 用例 ID：`TC-API-043`
- 关联功能点 ID：`FP-API-043`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/draft` 角色不足 200301
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 403，code=200301
  - 页面表现：无权限提示
  - 数据库落库：无写库
- 实际结果：无低于 content_ops 的第二账号
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-044

- 用例 ID：`TC-API-044`
- 关联功能点 ID：`FP-API-044`
- 测试层级：接口
- 覆盖维度：并发
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/draft` 版本冲突 409
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`POST /admin/pages/{id}/draft` 版本冲突 409
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：冲突文案在，但 HTTP 404 code=300409，契约要 409
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-045

- 用例 ID：`TC-API-045`
- 关联功能点 ID：`FP-API-045`
- 测试层级：接口
- 覆盖维度：幂等与重复
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/draft` 重复提交/幂等
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：第二次不产生额外副作用（或明确拒绝）
  - 页面表现：无重复创建/重复版本
  - 数据库落库：记录数不增加或版本不连跳异常
- 实际结果：first=200 second=300409
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PARTIAL`

---

# TC-API-046

- 用例 ID：`TC-API-046`
- 关联功能点 ID：`FP-API-046`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/publish` 发布成功
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`POST /admin/pages/{id}/publish` 发布成功
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：db=1	2 code=200
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-047

- 用例 ID：`TC-API-047`
- 关联功能点 ID：`FP-API-047`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/publish` 页面不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=404 code=300401
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-048

- 用例 ID：`TC-API-048`
- 关联功能点 ID：`FP-API-048`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/publish` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-049

- 用例 ID：`TC-API-049`
- 关联功能点 ID：`FP-API-049`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/publish` 角色不足 200301
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 403，code=200301
  - 页面表现：无权限提示
  - 数据库落库：无写库
- 实际结果：无低于 content_ops 的第二账号
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-050

- 用例 ID：`TC-API-050`
- 关联功能点 ID：`FP-API-050`
- 测试层级：接口
- 覆盖维度：幂等与重复
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/publish` 重复发布/幂等
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：第二次不产生额外副作用（或明确拒绝）
  - 页面表现：无重复创建/重复版本
  - 数据库落库：记录数不增加或版本不连跳异常
- 实际结果：repeat publish 2->2 http=200 code=200
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PARTIAL`

---

# TC-API-051

- 用例 ID：`TC-API-051`
- 关联功能点 ID：`FP-API-051`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/unpublish` 下架成功
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`POST /admin/pages/{id}/unpublish` 下架成功
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：db status=2 code=200
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-052

- 用例 ID：`TC-API-052`
- 关联功能点 ID：`FP-API-052`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/unpublish` 非已发布状态 422
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`POST /admin/pages/{id}/unpublish` 非已发布状态 422
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：second unpublish http=422 code=300201
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-053

- 用例 ID：`TC-API-053`
- 关联功能点 ID：`FP-API-053`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/unpublish` 不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=404 code=300401
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-054

- 用例 ID：`TC-API-054`
- 关联功能点 ID：`FP-API-054`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/unpublish` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-055

- 用例 ID：`TC-API-055`
- 关联功能点 ID：`FP-API-055`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/unpublish` 角色不足 200301
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 403，code=200301
  - 页面表现：无权限提示
  - 数据库落库：无写库
- 实际结果：无低于 content_ops 的第二账号
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-056

- 用例 ID：`TC-API-056`
- 关联功能点 ID：`FP-API-056`
- 测试层级：接口
- 覆盖维度：幂等与重复
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST /admin/pages/{id}/unpublish` 重复下架/幂等
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：第二次不产生额外副作用（或明确拒绝）
  - 页面表现：无重复创建/重复版本
  - 数据库落库：记录数不增加或版本不连跳异常
- 实际结果：repeat unpublish http=422 code=300201
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-057

- 用例 ID：`TC-API-057`
- 关联功能点 ID：`FP-API-057`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages/{id}/versions` 成功
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages/{id}/versions` 成功
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：type=object n=2
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-058

- 用例 ID：`TC-API-058`
- 关联功能点 ID：`FP-API-058`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages/{id}/versions` 空版本列表
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/pages/{id}/versions` 空版本列表
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：n=0 (create may auto-insert v1)
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-059

- 用例 ID：`TC-API-059`
- 关联功能点 ID：`FP-API-059`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages/{id}/versions` 页面不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=200 code=200
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-060

- 用例 ID：`TC-API-060`
- 关联功能点 ID：`FP-API-060`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/pages/{id}/versions` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-061

- 用例 ID：`TC-API-061`
- 关联功能点 ID：`FP-API-061`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST .../versions/{version}/rollback` 回滚成功并生成新版本
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`POST .../versions/{version}/rollback` 回滚成功并生成新版本
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：3->4 http=200 code=200
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-062

- 用例 ID：`TC-API-062`
- 关联功能点 ID：`FP-API-062`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST .../rollback` 页面不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=404 code=300401
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-063

- 用例 ID：`TC-API-063`
- 关联功能点 ID：`FP-API-063`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST .../rollback` 版本不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：http=404 code=300402
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-064

- 用例 ID：`TC-API-064`
- 关联功能点 ID：`FP-API-064`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST .../rollback` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-065

- 用例 ID：`TC-API-065`
- 关联功能点 ID：`FP-API-065`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST .../rollback` 角色不足 200301
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 403，code=200301
  - 页面表现：无权限提示
  - 数据库落库：无写库
- 实际结果：无低于 content_ops 的第二账号
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-066

- 用例 ID：`TC-API-066`
- 关联功能点 ID：`FP-API-066`
- 测试层级：接口
- 覆盖维度：幂等与重复
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`POST .../rollback` 重复回滚/幂等
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：第二次不产生额外副作用（或明确拒绝）
  - 页面表现：无重复创建/重复版本
  - 数据库落库：记录数不增加或版本不连跳异常
- 实际结果：repeat rollback 4->5
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-067

- 用例 ID：`TC-API-067`
- 关联功能点 ID：`FP-API-067`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/page-templates` 成功
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/page-templates` 成功
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：http=200 total=11
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-068

- 用例 ID：`TC-API-068`
- 关联功能点 ID：`FP-API-068`
- 测试层级：接口
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/page-templates` 空列表
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /admin/page-templates` 空列表
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：n=0
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-069

- 用例 ID：`TC-API-069`
- 关联功能点 ID：`FP-API-069`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /admin/page-templates` 未登录 110101
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401，code=110101，message 含未登录
  - 页面表现：后台跳转登录或提示未登录
  - 数据库落库：无写库
- 实际结果：http=403 code=undefined
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-070

- 用例 ID：`TC-API-070`
- 关联功能点 ID：`FP-API-070`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /mp/pages/{path}` 成功返回已发布 DSL
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /mp/pages/{path}` 成功返回已发布 DSL
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：path=pages/index/index http=200 code=200
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-071

- 用例 ID：`TC-API-071`
- 关联功能点 ID：`FP-API-071`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /mp/pages/{path}` 路径不存在 404
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 404
  - 页面表现：资源不存在提示
  - 数据库落库：无误删
- 实际结果：路径不存在 HTTP 200 + code 404，契约要 HTTP 404
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-072

- 用例 ID：`TC-API-072`
- 关联功能点 ID：`FP-API-072`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /mp/pages/{path}` 仅有草稿未发布时不返回发布 DSL
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /mp/pages/{path}` 仅有草稿未发布时不返回发布 DSL
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：仅草稿未发布 HTTP 200 + code 404，契约要 HTTP 404
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-073

- 用例 ID：`TC-API-073`
- 关联功能点 ID：`FP-API-073`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：`GET /mp/pages/{path}` 公开访问无需登录
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：`GET /mp/pages/{path}` 公开访问无需登录
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：no token http=200 code=200
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-API-074

- 用例 ID：`TC-API-074`
- 关联功能点 ID：`FP-API-074`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：账号已禁用 110103 访问页面接口
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 401/403，code=110103
  - 页面表现：无法继续操作
  - 数据库落库：无写库
- 实际结果：禁止禁用超管账号；环境无其它可禁用账号
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-075

- 用例 ID：`TC-API-075`
- 关联功能点 ID：`FP-API-075`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：限流 100201
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：限流 100201
  - 数据库落库：无写库或仅读
- 实际结果：80 concurrent, 100201/429 count=0
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-076

- 用例 ID：`TC-API-076`
- 关联功能点 ID：`FP-API-076`
- 测试层级：接口
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：越权访问他人租户/他人页面数据（若多租户）
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：越权访问他人租户/他人页面数据（若多租户）
  - 数据库落库：无写库或仅读
- 实际结果：mp_page 无租户字段，无法测越权
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`

---

# TC-API-077

- 用例 ID：`TC-API-077`
- 关联功能点 ID：`FP-API-077`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：写接口 ID 以字符串传输避免精度丢失
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：写接口 ID 以字符串传输避免精度丢失
  - 数据库落库：无写库或仅读
- 实际结果：create id typeof number value=5
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-API-078

- 用例 ID：`TC-API-078`
- 关联功能点 ID：`FP-API-078`
- 测试层级：接口
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）
  2. 按功能点调用：服务端 500 时页面接口统一错误结构
  3. 记录 HTTP 状态码、业务 code、message、data
  4. 查询数据库对照 mp_page / mp_page_version
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：服务端 500 时页面接口统一错误结构
  - 数据库落库：无写库或仅读
- 实际结果：could not force 500; sample http=400 structured=null
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`BLOCKED`
