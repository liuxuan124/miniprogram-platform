# BUG-UI-003

- 编号：`BUG-UI-003`
- 类型：体验问题（破坏性操作）
- 关联功能点 ID：EXP-BUILDER-DELETE-CONFIRM / EXP-BUILDER-LEAVE-UNSAVED / FP-UI-033
- 严重度：P1
- 所属模块与页面：页面装修器 / 当前页面结构
- 指派 Agent：admin-agent
- 指派依据：删除组件无二次确认且可被自动保存
- 状态：回归通过
- 复现概率：修复前必现

## 从登录开始的完整复现路径

1. 登录 → 进入页面 id=4 装修器（画布上有标题栏、公告栏）
2. 点结构树「2. 公告栏」右侧 ×「删除该组件」
3. 再点「1. 标题栏」右侧 ×
4. 观察是否有确认框
5. 顶部出现「未保存」，随后变为「已自动保存 15:56」
6. 不点保存，直接点「返回」

## 实际现象（修复前）

- 两次删除都立即生效，无「确定删除吗」或后果说明
- 删除唯一/全部组件后画布出现空态
- 返回列表无未保存确认
- 已发布页草稿被自动写成空组件列表

## 预期现象及依据

破坏性操作须二次确认，确认文案说明影响范围；未保存离开应提示。已发布页不应被自动保存清空。

## 修复说明（BATCH-QA-018）

- `confirmRemoveComponent.ts`：结构树/画布删除前 `ElMessageBox.confirm`
- `editor.vue`：已发布页不做自动保存，保留 `isDirty`；空白草稿不自动保存

## 回归证据

- 删除确认：`agent-team/testing/evidence/BATCH-QA-018/03-delete-confirm.png`
- 离开确认：`agent-team/testing/evidence/BATCH-QA-018/04-leave-confirm.png`
- `results-round2.json`：`delete-confirm.confirmSeen=true`；`results.json`：`leaveConfirm=true`

## 影响范围

装修器全部组件删除；已发布页面的草稿自动保存风险（已缓解）。
