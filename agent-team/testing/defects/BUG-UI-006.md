# BUG-UI-006

- 编号：`BUG-UI-006`
- 类型：体验问题
- 关联功能点 ID：EXP-BUILDER-OFFLINE-SAVE
- 严重度：P3
- 所属模块与页面：页面装修器 / 保存草稿
- 指派 Agent：admin-agent
- 指派依据：错误 toast 在网络已恢复且草稿已保存后仍覆盖操作区
- 状态：回归通过
- 复现概率：本批断网保存后必现

## 从登录开始的完整复现路径

1. 登录 → 打开页面 id=2「五一活动专题」装修器
2. 修改「分享标题」为「QA离线保存探测」，顶部出现「未保存」
3. 浏览器设为 offline，点「保存草稿」
4. 出现「网络异常，请检查网络连接」，顶部「未保存 / 自动保存失败」
5. 恢复 online，等待自动保存变为「已自动保存」v3
6. 再点「保存草稿」

## 实际现象

网络恢复且草稿已自动保存成功后，红色 toast「网络异常，请检查网络连接」仍停留在页面中央，拦截后续点击（Playwright 报该 alert 挡住按钮）。

## 预期现象及依据

错误提示应在网络恢复或保存成功后消失，且不应挡住工具栏按钮。

## 影响范围

装修器保存失败提示；恢复网络后的继续操作。

## 证据

- `agent-team/testing/evidence/BATCH-QA-004/11-observations.md`
- 控制台：`Failed to load resource: net::ERR_INTERNET_DISCONNECTED @ /api/v1/admin/pages/2/draft`
