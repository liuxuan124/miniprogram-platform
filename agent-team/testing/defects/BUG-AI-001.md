# BUG-AI-001

- 编号：`BUG-AI-001`
- 类型：接口错误
- 关联功能点 ID：EXP-AI-AGENT
- 严重度：P2
- 所属模块与页面：智能 Agent / 模型接入
- 指派 Agent：backend-agent
- 指派依据：进入配置页即请求失败，返回 500
- 状态：回归通过
- 复现概率：当前环境必现

## 从登录开始的完整复现路径

1. 登录 admin / admin123，关闭改密弹窗
2. 打开「智能 Agent」`/ai/agent`
3. 观察控制台与 `GET /api/v1/admin/agent/active`
4. API Key 留空，点「测试连接」

## 实际现象

- 页面可打开，默认「已选用」GPT-5.4，环境为沙盒
- `GET /api/v1/admin/agent/active` → HTTP 500，`{"code":500,"message":"系统内部错误，请稍后重试"}`
- API Key 为空时点「测试连接」，页面无校验提示、无成功/失败 toast

## 预期现象及依据

当前生效 Agent 查询不应 500；空密钥测试连接应给出明确失败原因。

## 影响范围

智能 Agent 配置中心无法确认是否已有生效配置；连接测试不可用。

## 证据

- `agent-team/testing/evidence/BATCH-QA-005/api-dump.json`
- `agent-team/testing/evidence/BATCH-QA-005/18-ai-test-connection.json`
- `agent-team/testing/evidence/BATCH-QA-005/19-observations.md`
