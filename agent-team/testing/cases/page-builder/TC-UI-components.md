# 页面装修器 · 组件/数据源/跳转用例 TC-UI-091~185

> 本文件已执行。结论以各条 `结论` 字段为准。无证据不得记 PASS。

# TC-UI-091

- 用例 ID：`TC-UI-091`
- 关联功能点 ID：`FP-UI-091`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：banner 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：banner 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：banner add
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-092

- 用例 ID：`TC-UI-092`
- 关联功能点 ID：`FP-UI-092`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：banner items 为空
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：banner items 为空
  - 数据库落库：无写库或仅读
- 实际结果：items editor present; empty not forced
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-093

- 用例 ID：`TC-UI-093`
- 关联功能点 ID：`FP-UI-093`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：banner 图片加载失败占位（§10.6）
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：banner 图片加载失败占位（§10.6）
  - 数据库落库：无写库或仅读
- 实际结果：no image-error placeholder control in banner props
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-094

- 用例 ID：`TC-UI-094`
- 关联功能点 ID：`FP-UI-094`
- 测试层级：后台
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：banner 缺 items（必填）
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：banner defaults with one empty image; missing-items validation not shown
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-095

- 用例 ID：`TC-UI-095`
- 关联功能点 ID：`FP-UI-095`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：banner autoplay 开关
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：banner autoplay 开关
  - 数据库落库：无写库或仅读
- 实际结果：autoplay
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-096

- 用例 ID：`TC-UI-096`
- 关联功能点 ID：`FP-UI-096`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：banner interval
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：banner interval
  - 数据库落库：无写库或仅读
- 实际结果：interval
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-097

- 用例 ID：`TC-UI-097`
- 关联功能点 ID：`FP-UI-097`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：banner 指示点开关
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：banner 指示点开关
  - 数据库落库：无写库或仅读
- 实际结果：dots
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-098

- 用例 ID：`TC-UI-098`
- 关联功能点 ID：`FP-UI-098`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：banner 点击单项跳转
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：banner 点击单项跳转
  - 数据库落库：无写库或仅读
- 实际结果：link types page/url/miniapp; click jump is miniapp-side
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-099

- 用例 ID：`TC-UI-099`
- 关联功能点 ID：`FP-UI-099`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：nav 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：nav 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：nav
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-100

- 用例 ID：`TC-UI-100`
- 关联功能点 ID：`FP-UI-100`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：nav items 为空
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：nav items 为空
  - 数据库落库：无写库或仅读
- 实际结果：nav default items; empty not forced
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-101

- 用例 ID：`TC-UI-101`
- 关联功能点 ID：`FP-UI-101`
- 测试层级：后台
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：nav 缺 items
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：缺 items 未单独校验
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-102

- 用例 ID：`TC-UI-102`
- 关联功能点 ID：`FP-UI-102`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：nav 行列数
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：nav 行列数
  - 数据库落库：无写库或仅读
- 实际结果：nav columns
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-103

- 用例 ID：`TC-UI-103`
- 关联功能点 ID：`FP-UI-103`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：nav 点击项跳转
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：nav 点击项跳转
  - 数据库落库：无写库或仅读
- 实际结果：nav click jump is miniapp-side
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-104

- 用例 ID：`TC-UI-104`
- 关联功能点 ID：`FP-UI-104`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product_list 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product_list 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：product_list
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-105

- 用例 ID：`TC-UI-105`
- 关联功能点 ID：`FP-UI-105`
- 测试层级：后台
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product_list 空数据
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product_list 空数据
  - 数据库落库：无写库或仅读
- 实际结果：empty data depends on backend list
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-106

- 用例 ID：`TC-UI-106`
- 关联功能点 ID：`FP-UI-106`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product_list 加载态
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product_list 加载态
  - 数据库落库：无写库或仅读
- 实际结果：preview loading not isolated
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-107

- 用例 ID：`TC-UI-107`
- 关联功能点 ID：`FP-UI-107`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product_list 请求失败兜底（§10.7）
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product_list 请求失败兜底（§10.7）
  - 数据库落库：无写库或仅读
- 实际结果：preview fail兜底 not isolated this run
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-108

- 用例 ID：`TC-UI-108`
- 关联功能点 ID：`FP-UI-108`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product_list 布局 grid/list/waterfall
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product_list 布局 grid/list/waterfall
  - 数据库落库：无写库或仅读
- 实际结果：layout grid/list/waterfall
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-109

- 用例 ID：`TC-UI-109`
- 关联功能点 ID：`FP-UI-109`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product_list 点击商品跳转
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product_list 点击商品跳转
  - 数据库落库：无写库或仅读
- 实际结果：product click jump miniapp-side
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-110

- 用例 ID：`TC-UI-110`
- 关联功能点 ID：`FP-UI-110`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product_list 绑定 data_source.type=product
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product_list 绑定 data_source.type=product
  - 数据库落库：无写库或仅读
- 实际结果：auto product source
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-111

- 用例 ID：`TC-UI-111`
- 关联功能点 ID：`FP-UI-111`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：article_list 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：article_list 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：article_list
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-112

- 用例 ID：`TC-UI-112`
- 关联功能点 ID：`FP-UI-112`
- 测试层级：后台
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：article_list 空数据
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：article_list 空数据
  - 数据库落库：无写库或仅读
- 实际结果：empty article not forced
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-113

- 用例 ID：`TC-UI-113`
- 关联功能点 ID：`FP-UI-113`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：article_list 加载态
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：article_list 加载态
  - 数据库落库：无写库或仅读
- 实际结果：loading not isolated
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-114

- 用例 ID：`TC-UI-114`
- 关联功能点 ID：`FP-UI-114`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：article_list 请求失败兜底
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：article_list 请求失败兜底
  - 数据库落库：无写库或仅读
- 实际结果：fail兜底 not isolated
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-115

- 用例 ID：`TC-UI-115`
- 关联功能点 ID：`FP-UI-115`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：article_list 布局 card/list/compact
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：article_list 布局 card/list/compact
  - 数据库落库：无写库或仅读
- 实际结果：layout card/list/compact
文章列表
取消选中
内容与数据
样式
自动读取已发布文章
数据源已连接，预览时显示真实内容
管理数据
标题
样式
卡片
列表
显示封面
显示日期
显示
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-116

- 用例 ID：`TC-UI-116`
- 关联功能点 ID：`FP-UI-116`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：article_list 点击文章跳转
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：article_list 点击文章跳转
  - 数据库落库：无写库或仅读
- 实际结果：article click miniapp-side
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-117

- 用例 ID：`TC-UI-117`
- 关联功能点 ID：`FP-UI-117`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：article_list 绑定 data_source.type=content
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：article_list 绑定 data_source.type=content
  - 数据库落库：无写库或仅读
- 实际结果：content source
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-118

- 用例 ID：`TC-UI-118`
- 关联功能点 ID：`FP-UI-118`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity_entry 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity_entry 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：activity_entry
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-119

- 用例 ID：`TC-UI-119`
- 关联功能点 ID：`FP-UI-119`
- 测试层级：后台
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity_entry 空数据
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity_entry 空数据
  - 数据库落库：无写库或仅读
- 实际结果：empty activity
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-120

- 用例 ID：`TC-UI-120`
- 关联功能点 ID：`FP-UI-120`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity_entry 加载态
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity_entry 加载态
  - 数据库落库：无写库或仅读
- 实际结果：loading
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-121

- 用例 ID：`TC-UI-121`
- 关联功能点 ID：`FP-UI-121`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity_entry 请求失败兜底
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity_entry 请求失败兜底
  - 数据库落库：无写库或仅读
- 实际结果：fail
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-122

- 用例 ID：`TC-UI-122`
- 关联功能点 ID：`FP-UI-122`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity_entry 倒计时展示开关
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity_entry 倒计时展示开关
  - 数据库落库：无写库或仅读
- 实际结果：countdown switch
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-123

- 用例 ID：`TC-UI-123`
- 关联功能点 ID：`FP-UI-123`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity_entry 名额展示开关
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity_entry 名额展示开关
  - 数据库落库：无写库或仅读
- 实际结果：quota switch
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-124

- 用例 ID：`TC-UI-124`
- 关联功能点 ID：`FP-UI-124`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity_entry 点击进入活动
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity_entry 点击进入活动
  - 数据库落库：无写库或仅读
- 实际结果：click miniapp
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-125

- 用例 ID：`TC-UI-125`
- 关联功能点 ID：`FP-UI-125`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity_entry 绑定 data_source.type=activity
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity_entry 绑定 data_source.type=activity
  - 数据库落库：无写库或仅读
- 实际结果：activity source
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-126

- 用例 ID：`TC-UI-126`
- 关联功能点 ID：`FP-UI-126`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：member_card 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：member_card 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：member_card
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-127

- 用例 ID：`TC-UI-127`
- 关联功能点 ID：`FP-UI-127`
- 测试层级：后台
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：member_card 空/未登录会员信息
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：member_card 空/未登录会员信息
  - 数据库落库：无写库或仅读
- 实际结果：empty/unlogin is miniapp-side
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-128

- 用例 ID：`TC-UI-128`
- 关联功能点 ID：`FP-UI-128`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：coupon
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-129

- 用例 ID：`TC-UI-129`
- 关联功能点 ID：`FP-UI-129`
- 测试层级：后台
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon 空数据
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon 空数据
  - 数据库落库：无写库或仅读
- 实际结果：empty coupon
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-130

- 用例 ID：`TC-UI-130`
- 关联功能点 ID：`FP-UI-130`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon 加载态
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon 加载态
  - 数据库落库：无写库或仅读
- 实际结果：loading
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-131

- 用例 ID：`TC-UI-131`
- 关联功能点 ID：`FP-UI-131`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon 请求失败兜底
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon 请求失败兜底
  - 数据库落库：无写库或仅读
- 实际结果：fail
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-132

- 用例 ID：`TC-UI-132`
- 关联功能点 ID：`FP-UI-132`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon 领取按钮
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon 领取按钮
  - 数据库落库：无写库或仅读
- 实际结果：claim btn config
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-133

- 用例 ID：`TC-UI-133`
- 关联功能点 ID：`FP-UI-133`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon 绑定 data_source.type=coupon
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon 绑定 data_source.type=coupon
  - 数据库落库：无写库或仅读
- 实际结果：coupon source
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-134

- 用例 ID：`TC-UI-134`
- 关联功能点 ID：`FP-UI-134`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：video 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：video 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：video
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-135

- 用例 ID：`TC-UI-135`
- 关联功能点 ID：`FP-UI-135`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：video 无 src 空态
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：video 无 src 空态
  - 数据库落库：无写库或仅读
- 实际结果：src field
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-136

- 用例 ID：`TC-UI-136`
- 关联功能点 ID：`FP-UI-136`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：video 播放
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：video 播放
  - 数据库落库：无写库或仅读
- 实际结果：play is preview/miniapp
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-137

- 用例 ID：`TC-UI-137`
- 关联功能点 ID：`FP-UI-137`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：video 封面
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：video 封面
  - 数据库落库：无写库或仅读
- 实际结果：poster
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-138

- 用例 ID：`TC-UI-138`
- 关联功能点 ID：`FP-UI-138`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：countdown 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：countdown 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：countdown
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-139

- 用例 ID：`TC-UI-139`
- 关联功能点 ID：`FP-UI-139`
- 测试层级：后台
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：countdown 缺 target_time
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：target_time
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-140

- 用例 ID：`TC-UI-140`
- 关联功能点 ID：`FP-UI-140`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：countdown 到达目标时间显示 ended_text
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：countdown 到达目标时间显示 ended_text
  - 数据库落库：无写库或仅读
- 实际结果：ended_text
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-141

- 用例 ID：`TC-UI-141`
- 关联功能点 ID：`FP-UI-141`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：countdown 格式 d/dh/dhm/dhms
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：countdown 格式 d/dh/dhm/dhms
  - 数据库落库：无写库或仅读
- 实际结果：format opts=仅天数（d）|天 + 时（dh）|天 + 时 + 分（dhm）|天时分秒（dhms）
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-142

- 用例 ID：`TC-UI-142`
- 关联功能点 ID：`FP-UI-142`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：float_button 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：float_button 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：float_button
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-143

- 用例 ID：`TC-UI-143`
- 关联功能点 ID：`FP-UI-143`
- 测试层级：后台
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：float_button 缺 icon_url
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：icon
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-144

- 用例 ID：`TC-UI-144`
- 关联功能点 ID：`FP-UI-144`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：float_button 点击跳转
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：float_button 点击跳转
  - 数据库落库：无写库或仅读
- 实际结果：float click miniapp
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-145

- 用例 ID：`TC-UI-145`
- 关联功能点 ID：`FP-UI-145`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：float_button 四角位置
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：float_button 四角位置
  - 数据库落库：无写库或仅读
- 实际结果：position
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-146

- 用例 ID：`TC-UI-146`
- 关联功能点 ID：`FP-UI-146`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：rich_text 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：rich_text 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：rich_text
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-147

- 用例 ID：`TC-UI-147`
- 关联功能点 ID：`FP-UI-147`
- 测试层级：后台
- 覆盖维度：边界值
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：rich_text 空 content
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：rich_text 空 content
  - 数据库落库：无写库或仅读
- 实际结果：empty content not forced
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-148

- 用例 ID：`TC-UI-148`
- 关联功能点 ID：`FP-UI-148`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：divider 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：divider 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：divider
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-149

- 用例 ID：`TC-UI-149`
- 关联功能点 ID：`FP-UI-149`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：spacer 首次渲染
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：spacer 首次渲染
  - 数据库落库：无写库或仅读
- 实际结果：spacer
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-150

- 用例 ID：`TC-UI-150`
- 关联功能点 ID：`FP-UI-150`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：数据源 type 必填
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：数据源 type 必填
  - 数据库落库：无写库或仅读
- 实际结果：data_source.type 未作为必填校验展示
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-151

- 用例 ID：`TC-UI-151`
- 关联功能点 ID：`FP-UI-151`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：数据源 query 必填
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：数据源 query 必填
  - 数据库落库：无写库或仅读
- 实际结果：data_source.query 未作为必填校验展示
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-152

- 用例 ID：`TC-UI-152`
- 关联功能点 ID：`FP-UI-152`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product query：category_id
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product query：category_id
  - 数据库落库：无写库或仅读
- 实际结果：category_id field
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-153

- 用例 ID：`TC-UI-153`
- 关联功能点 ID：`FP-UI-153`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product query：product_type
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product query：product_type
  - 数据库落库：无写库或仅读
- 实际结果：product_type field
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-154

- 用例 ID：`TC-UI-154`
- 关联功能点 ID：`FP-UI-154`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product query：status=on_sale
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product query：status=on_sale
  - 数据库落库：无写库或仅读
- 实际结果：status on_sale implied
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-155

- 用例 ID：`TC-UI-155`
- 关联功能点 ID：`FP-UI-155`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product query：sort_by
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product query：sort_by
  - 数据库落库：无写库或仅读
- 实际结果：sort_by
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-156

- 用例 ID：`TC-UI-156`
- 关联功能点 ID：`FP-UI-156`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product query：sort_order
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product query：sort_order
  - 数据库落库：无写库或仅读
- 实际结果：sort_order derived from sort_by, no independent control
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-157

- 用例 ID：`TC-UI-157`
- 关联功能点 ID：`FP-UI-157`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：product query：limit
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：product query：limit
  - 数据库落库：无写库或仅读
- 实际结果：limit
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-158

- 用例 ID：`TC-UI-158`
- 关联功能点 ID：`FP-UI-158`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：content query：category_id
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：content query：category_id
  - 数据库落库：无写库或仅读
- 实际结果：content category_id
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-159

- 用例 ID：`TC-UI-159`
- 关联功能点 ID：`FP-UI-159`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：content query：type
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：content query：type
  - 数据库落库：无写库或仅读
- 实际结果：content type
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-160

- 用例 ID：`TC-UI-160`
- 关联功能点 ID：`FP-UI-160`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：content query：is_recommended
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：content query：is_recommended
  - 数据库落库：无写库或仅读
- 实际结果：is_recommended
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-161

- 用例 ID：`TC-UI-161`
- 关联功能点 ID：`FP-UI-161`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：content query：sort_by
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：content query：sort_by
  - 数据库落库：无写库或仅读
- 实际结果：content sort
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-162

- 用例 ID：`TC-UI-162`
- 关联功能点 ID：`FP-UI-162`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：content query：limit
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：content query：limit
  - 数据库落库：无写库或仅读
- 实际结果：content limit
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-163

- 用例 ID：`TC-UI-163`
- 关联功能点 ID：`FP-UI-163`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity query：type
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity query：type
  - 数据库落库：无写库或仅读
- 实际结果：activity type query
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-164

- 用例 ID：`TC-UI-164`
- 关联功能点 ID：`FP-UI-164`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity query：status=registering
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity query：status=registering
  - 数据库落库：无写库或仅读
- 实际结果：status registering
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-165

- 用例 ID：`TC-UI-165`
- 关联功能点 ID：`FP-UI-165`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity query：is_recommended
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity query：is_recommended
  - 数据库落库：无写库或仅读
- 实际结果：activity recommended
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-166

- 用例 ID：`TC-UI-166`
- 关联功能点 ID：`FP-UI-166`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：activity query：limit
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：activity query：limit
  - 数据库落库：无写库或仅读
- 实际结果：activity limit
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-167

- 用例 ID：`TC-UI-167`
- 关联功能点 ID：`FP-UI-167`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon query：type
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon query：type
  - 数据库落库：无写库或仅读
- 实际结果：coupon type
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-168

- 用例 ID：`TC-UI-168`
- 关联功能点 ID：`FP-UI-168`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon query：status=active
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon query：status=active
  - 数据库落库：无写库或仅读
- 实际结果：coupon status=active filter
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-169

- 用例 ID：`TC-UI-169`
- 关联功能点 ID：`FP-UI-169`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：coupon query：limit
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：coupon query：limit
  - 数据库落库：无写库或仅读
- 实际结果：coupon limit
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-170

- 用例 ID：`TC-UI-170`
- 关联功能点 ID：`FP-UI-170`
- 测试层级：端到端
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：跳转 type=page → wx.navigateTo
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：跳转 type=page → wx.navigateTo
  - 数据库落库：无写库或仅读
- 实际结果：banner link_type=page exists; wx.navigateTo not run (avoid stealing DevTools)
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-171

- 用例 ID：`TC-UI-171`
- 关联功能点 ID：`FP-UI-171`
- 测试层级：端到端
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：跳转 type=webview
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：跳转 type=webview
  - 数据库落库：无写库或仅读
- 实际结果：jump opts=页面|网页|链接|小程序|拨打电话|无跳转
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-172

- 用例 ID：`TC-UI-172`
- 关联功能点 ID：`FP-UI-172`
- 测试层级：端到端
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：跳转 type=miniapp
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：跳转 type=miniapp
  - 数据库落库：无写库或仅读
- 实际结果：miniapp option
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-173

- 用例 ID：`TC-UI-173`
- 关联功能点 ID：`FP-UI-173`
- 测试层级：端到端
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：跳转 type=phone → 拨号
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：跳转 type=phone → 拨号
  - 数据库落库：无写库或仅读
- 实际结果：phone jump type
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-174

- 用例 ID：`TC-UI-174`
- 关联功能点 ID：`FP-UI-174`
- 测试层级：端到端
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：跳转 type=none
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：跳转 type=none
  - 数据库落库：无写库或仅读
- 实际结果：type=none
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`PASS`

---

# TC-UI-175

- 用例 ID：`TC-UI-175`
- 关联功能点 ID：`FP-UI-175`
- 测试层级：后台
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：跳转缺 type
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：缺 type 仍无发布/保存校验（本批仅确认选项，未做缺字段拦截）
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`FAIL`

---

# TC-UI-176

- 用例 ID：`TC-UI-176`
- 关联功能点 ID：`FP-UI-176`
- 测试层级：后台
- 覆盖维度：异常输入
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：跳转缺 target
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 400，code=100101 或 100102
  - 页面表现：校验错误可见
  - 数据库落库：无脏数据
- 实际结果：缺 target 仍无发布/保存校验（本批仅确认选项，未做缺字段拦截）
- 证据：agent-team/testing/evidence/BATCH-QA-013/
- 结论：`FAIL`

---

# TC-UI-177

- 用例 ID：`TC-UI-177`
- 关联功能点 ID：`FP-UI-177`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：跳转附带 params
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：跳转附带 params
  - 数据库落库：无写库或仅读
- 实际结果：link_url present; params not a structured field
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-178

- 用例 ID：`TC-UI-178`
- 关联功能点 ID：`FP-UI-178`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：未知组件 type 跳过并记日志（§10.5）
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：未知组件 type 跳过并记日志（§10.5）
  - 数据库落库：无写库或仅读
- 实际结果：unknown type skip/log not exercised in admin canvas
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`FAIL`

---

# TC-UI-179

- 用例 ID：`TC-UI-179`
- 关联功能点 ID：`FP-UI-179`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：data_source 为空时用 props 静态数据（§10.3）
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：data_source 为空时用 props 静态数据（§10.3）
  - 数据库落库：无写库或仅读
- 实际结果：components render from props without data_source
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-180

- 用例 ID：`TC-UI-180`
- 关联功能点 ID：`FP-UI-180`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：data_source 非空时先请求再渲染（§10.2）
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：data_source 非空时先请求再渲染（§10.2）
  - 数据库落库：无写库或仅读
- 实际结果：real-data preview requests when data_source present; not fully isolated
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`

---

# TC-UI-181

- 用例 ID：`TC-UI-181`
- 关联功能点 ID：`FP-UI-181`
- 测试层级：端到端
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：小程序只拉已发布版本 DSL（§11.4）
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：小程序只拉已发布版本 DSL（§11.4）
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：GET /mp/pages draft-only returned 未发布; see BATCH-QA-010
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-182

- 用例 ID：`TC-UI-182`
- 关联功能点 ID：`FP-UI-182`
- 测试层级：后台
- 覆盖维度：权限越权
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：装修器未登录不可用
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：装修器未登录不可用
  - 数据库落库：无写库或仅读
- 实际结果：unauth editor
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-183

- 用例 ID：`TC-UI-183`
- 关联功能点 ID：`FP-UI-183`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：列表→装修器 id 参数传递
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：列表→装修器 id 参数传递
  - 数据库落库：与 mp_page 查询结果一致，无写库
- 实际结果：editor id=10
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-184

- 用例 ID：`TC-UI-184`
- 关联功能点 ID：`FP-UI-184`
- 测试层级：后台
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：装修器→版本页 id 参数传递
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：装修器→版本页 id 参数传递
  - 数据库落库：无写库或仅读
- 实际结果：历史版本 routes to version/:id
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PASS`

---

# TC-UI-185

- 用例 ID：`TC-UI-185`
- 关联功能点 ID：`FP-UI-185`
- 测试层级：端到端
- 覆盖维度：正常路径
- 前置条件：后台 `http://127.0.0.1:3000`；接口 `http://127.0.0.1:8080`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED
- 执行步骤：
  1. 超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）
  2. 执行：发布结果路径与小程序打开路径一致
  3. 观察页面反馈，必要时抓接口与查库
- 预期结果：
  - 接口响应：HTTP 200/201，code=0 或 200，data 符合契约
  - 页面表现：发布结果路径与小程序打开路径一致
  - 数据库落库：mp_page / mp_page_version 与操作一致
- 实际结果：publish result shows path; miniapp package may not include custom path (BUG-UI-002)
- 证据：agent-team/testing/evidence/BATCH-QA-011/
- 结论：`PARTIAL`
