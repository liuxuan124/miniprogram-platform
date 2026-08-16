# 页面装修器 · 数据库用例 TC-DB-001~005

> 本文件已执行。结论以各条 `结论` 字段为准。无证据不得记 PASS。

# TC-DB-001

- 用例 ID：`TC-DB-001`
- 关联功能点 ID：`FP-DB-001`
- 测试层级：后台
- 覆盖维度：并发
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 准备两条会触发该约束的写入（合法一条、冲突/级联一条）
  2. 执行：`uk_page_version(page_id, version)` 冲突写入被拒绝
  3. 直接查库确认约束是否生效，不以接口文案为准
- 预期结果：
  - 接口响应：冲突返回 409/422
  - 页面表现：如从后台触发则有错误提示
  - 数据库落库：`uk_page_version(page_id, version)` 冲突写入被拒绝
- 实际结果：MYSQL_ERR mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 1062 (23000) at line 1: Duplicate entry '5-1-0' for key 'mp_page_version.uk_page_version'

- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-DB-002

- 用例 ID：`TC-DB-002`
- 关联功能点 ID：`FP-DB-002`
- 测试层级：后台
- 覆盖维度：数据一致性
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 准备两条会触发该约束的写入（合法一条、冲突/级联一条）
  2. 执行：删除页面对版本记录的外键/级联
  3. 直接查库确认约束是否生效，不以接口文案为准
- 预期结果：
  - 接口响应：冲突返回 409/422
  - 页面表现：如从后台触发则有错误提示
  - 数据库落库：删除页面对版本记录的外键/级联
- 实际结果：no FK
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`

---

# TC-DB-003

- 用例 ID：`TC-DB-003`
- 关联功能点 ID：`FP-DB-003`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 准备两条会触发该约束的写入（合法一条、冲突/级联一条）
  2. 执行：`mp_page.path` 索引查询
  3. 直接查库确认约束是否生效，不以接口文案为准
- 预期结果：
  - 接口响应：冲突返回 409/422
  - 页面表现：如从后台触发则有错误提示
  - 数据库落库：`mp_page.path` 索引查询
- 实际结果：mp_page	0	uk_path	1	path	A	6	NULL	NULL		BTREE			YES	NULL
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-DB-004

- 用例 ID：`TC-DB-004`
- 关联功能点 ID：`FP-DB-004`
- 测试层级：后台
- 覆盖维度：数据一致性
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 准备两条会触发该约束的写入（合法一条、冲突/级联一条）
  2. 执行：`dsl_content` 必须为合法 JSON
  3. 直接查库确认约束是否生效，不以接口文案为准
- 预期结果：
  - 接口响应：冲突返回 409/422
  - 页面表现：如从后台触发则有错误提示
  - 数据库落库：`dsl_content` 必须为合法 JSON
- 实际结果：MYSQL_ERR mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 3140 (22032) at line 1: Invalid JSON text: "Invalid value." at position 1 in value for column 'mp_page_
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`PASS`

---

# TC-DB-005

- 用例 ID：`TC-DB-005`
- 关联功能点 ID：`FP-DB-005`
- 测试层级：后台
- 覆盖维度：数据一致性
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 准备两条会触发该约束的写入（合法一条、冲突/级联一条）
  2. 执行：`current_version` 与已发布版本一致
  3. 直接查库确认约束是否生效，不以接口文案为准
- 预期结果：
  - 接口响应：冲突返回 409/422
  - 页面表现：如从后台触发则有错误提示
  - 数据库落库：`current_version` 与已发布版本一致
- 实际结果：current=5 publishedMax=3
- 证据：agent-team/testing/evidence/BATCH-QA-010/api-db-results.json
- 结论：`FAIL`
