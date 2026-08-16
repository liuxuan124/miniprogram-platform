# BUG-APPT-002

- 编号：`BUG-APPT-002`
- 类型：数据不一致
- 关联功能点 ID：EXP-APPT-SLOT
- 严重度：P2
- 所属模块与页面：预约管理 / 预约服务、预约时段
- 指派 Agent：admin-agent
- 指派依据：时段接口含 serviceId，列表未展示服务名；服务列表时段数与时段表不一致
- 状态：回归通过
- 复现概率：当前种子数据必现

## 从登录开始的完整复现路径

1. 登录后打开「预约服务」`/appointment/service`
2. 打开「预约时段」`/appointment/slot`
3. 对照 `GET /api/v1/admin/appointment-slots` 与预约记录列表

## 实际现象

- 服务列表 3 条均启用，**时段数全部为 0**
- 时段列表 3 条，**服务列全部为「-」**
- 时段 id=2：已预约 **1/3**（接口 `bookedCount=1`，`serviceId=1`）
- 预约记录列表仍为「暂无数据」（BATCH-QA-003 已记）
- 接口时段均 `serviceId=1`（品牌顾问一对一预约）

## 预期现象及依据

时段应显示所属服务名称；服务「时段数」应等于该服务下时段条数；已预约计数应能在预约记录中找到对应单据。

## 影响范围

预约排班与核销；无法从时段反查服务，也无法解释「已预约 1」。

## 证据

- `agent-team/testing/evidence/BATCH-QA-005/06-appt-service.json`
- `agent-team/testing/evidence/BATCH-QA-005/07-appt-slot.json`
- `agent-team/testing/evidence/BATCH-QA-005/api-dump.json`
- `agent-team/testing/evidence/BATCH-QA-005/19-observations.md`
