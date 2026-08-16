# BUG-UI-008

- 编号：`BUG-UI-008`
- 类型：文案渲染错误
- 关联功能点 ID：EXP-MP-SEARCH
- 严重度：P2
- 所属模块与页面：小程序 / 搜索结果摘要
- 指派 Agent：miniapp-agent
- 指派依据：搜索结果摘要直接展示 HTML 标签
- 状态：回归通过
- 复现概率：关键词「选品」本次必现（4 条中至少 2 条）

## 从登录开始的完整复现路径

1. 打开 `pages/search/search`
2. 关键词设为「选品」并执行搜索

## 实际现象

- 提示「找到 4 条与「选品」相关」
- 前两条摘要可见原文 HTML，例如 `<h2>为什么先做闭环</h2><p>跨境电商不是单点技巧竞争，而是...`
- 后两条带封面的结果摘要为纯文本，未露出标签

## 预期现象及依据

摘要应为可读纯文本，不应把 HTML 标签展示给用户。

## 影响范围

内容搜索结果卡片的 summary 展示。

## 证据

- `agent-team/testing/evidence/BATCH-QA-009/05-search-keyword.png`
- `agent-team/testing/evidence/BATCH-QA-009/automator-report.json`（searchKw.resultCount=4）
