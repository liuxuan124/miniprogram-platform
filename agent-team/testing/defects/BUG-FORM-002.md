# BUG-FORM-002

- 编号：`BUG-FORM-002`
- 类型：状态映射错误
- 关联功能点 ID：未分配
- 严重度：P2
- 所属模块与页面：表单管理 / 创建表单模板
- 指派 Agent：admin-agent
- 指派依据：创建弹窗状态选项含「草稿」，保存后列表显示「已停用」
- 状态：回归通过
- 复现概率：本次创建必现

## 从登录开始的完整复现路径

1. 表单管理 → 创建模板
2. 名称「QA主线表单-0813」，状态保持默认「草稿」，添加字段后确定

## 实际现象

- 创建弹窗状态为「草稿」
- 列表状态为「已停用」
- 详情接口 `status=0`，`statusDesc=停用`
- 编辑弹窗状态选项仍有「草稿 / 已启用 / 已停用」，当前值为「已停用」

## 预期现象及依据

创建时选择的「草稿」应在列表保持草稿，或界面不应提供后端不存在的第三态。

## 影响范围

表单模板状态展示与筛选。

## 证据

- `agent-team/testing/evidence/BATCH-QA-002/12-create-form-dialog.png`
- `agent-team/testing/evidence/BATCH-QA-002/13-form-created.png`
- `agent-team/testing/evidence/BATCH-QA-002/api-dump.json`
