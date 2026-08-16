# BUG-UI-012

- 编号：`BUG-UI-012`
- 关联功能点 ID：FP-UI-073, FP-UI-074, FP-UI-075, FP-UI-076, FP-UI-079
- 严重度：P2
- 复现步骤：
  1. 选中画布组件 → 样式 Tab
- 预期：padding 四向、visible=false 不渲染
- 实际：回归后样式 Tab 有四向内边距与组件可见；关闭可见时画布显示「已隐藏」
- 证据：`agent-team/testing/evidence/BATCH-QA-013/03-style.png`、`04-visible-off.png`
- 影响范围：组件样式契约字段
- 指派 Agent：admin-agent
- 指派依据：page-dsl-schema 样式字段未提供编辑
- 状态：回归通过
