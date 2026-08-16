# BUG-TPL-001

- 编号：`BUG-TPL-001`
- 类型：筛选结果不符
- 关联功能点 ID：EXP-TEMPLATE-CENTER
- 严重度：P3
- 所属模块与页面：页面模板 / 模板中心
- 指派 Agent：admin-agent
- 指派依据：分类 Tab 与模板标签对不上
- 状态：回归通过
- 复现概率：当前模板集必现

## 从登录开始的完整复现路径

1. 登录后打开「页面模板」
2. 点分类 Tab「预约」

## 实际现象

- 筛选项含分类「预约」、场景「预约服务」
- 点「预约」后文案「暂无匹配模板 / 共 0 套模板」
- 全部 10 套中，「活动裂变专题模板」含预约服务组件，「家居日用/教育培训」文案也含预约，但都不落在「预约」分类

## 预期现象及依据

分类 Tab 应能筛到带预约能力的模板，或不要提供永远为空的「预约」分类。

## 影响范围

模板中心分类筛选；找预约场景模板会得到空列表。

## 证据

- `agent-team/testing/evidence/BATCH-QA-005/17-template-preview.json`
- `agent-team/testing/evidence/BATCH-QA-005/19-observations.md`
