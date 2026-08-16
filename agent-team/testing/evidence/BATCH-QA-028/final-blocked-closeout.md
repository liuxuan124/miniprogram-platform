# BATCH-QA-028 正式台账收尾

## FP-API-076（跨租户越权）
- `SHOW COLUMNS FROM mp_page LIKE '%tenant%'` → **空**
- 功能点描述为「若多租户」→ 当前单租户架构 **不适用（N/A）**
- 结论：**PASS**（N/A 豁免）

## FP-API-078（500 统一错误结构）
- `GlobalExceptionHandler.handleException` → `@ResponseStatus(500)` + `R.fail(message)` → body 含 `code`+`message`
- 新增单元测试：`backend/src/test/java/com/miniprogram/common/GlobalExceptionHandlerTest.java`
- BATCH-027 运行时曾观测：`GET /admin/ai/conversations` 在 JSON 反序列化失败时 HTTP **500**，body `{"code":500,"message":"数据保存失败，请稍后重试"}`
- 结论：**PASS**（Handler 单测 + 运行时 500 结构化样本）

## EXP-MP-LOGIN（探索附录）
- `login.js`：协议勾选 `computeCanSubmit`；未勾选拦截 toast
- `login-flow.js`：`runOneTapLogin` wxLogin → bindPhone → completeLogin
- `onViewTerms` 跳转协议页；半层 `login-sheet` 可 hide
- 手机号 `getPhoneNumber` 需微信手势，**无法 CLI 自动化**；其余链路代码回归通过
- 结论：**PASS**（代码回归；手机号授权留手动抽检说明）
