# BUG-FORM-004

- 编号：`BUG-FORM-004`
- 类型：数据加载失败 / 空表单
- 关联功能点 ID：EXP-LINE3-MP-SUBMIT
- 严重度：P1
- 所属模块与页面：小程序 / 表单填写 `pkg-extra/form/form`
- 指派 Agent：miniapp-agent
- 状态：回归通过
- 复现概率：修复前模拟器必现（叠加线上 BASE_URL / field_key）

## 实际现象（修复前）

- 打开表单后 fields 长度 0；接口 `fields` 为 JSON 字符串或端上未识别 `field_key`

## 修复说明（BATCH-QA-019）

- 开发版默认 `BASE_URL=http://127.0.0.1:8080`
- 后端 VO `@JsonRawValue` 已输出数组
- `form.js` 归一：`field_key → key`，空字段 toast，标题用 `name`

## 回归证据

- `GET /api/v1/mp/form-templates/1` fields 为数组，含「姓名」
- 代码：`miniapp/pkg-extra/form/form.js`
- 备注：未登录提交仍会进登录半层（属鉴权，不阻塞字段展示）
