# BUG-SET-001

- 编号：`BUG-SET-001`
- 类型：展示错误
- 关联功能点 ID：EXP-ADMIN-USER
- 严重度：P2
- 所属模块与页面：系统设置 / 管理员账号
- 指派 Agent：admin-agent
- 指派依据：角色列乱码，属前端展示/解码问题
- 状态：回归通过
- 复现概率：当前唯一管理员账号必现

## 从登录开始的完整复现路径

1. 登录 admin / admin123，关闭改密弹窗
2. 进入「系统设置」→ 管理员账号 `/settings/admin-user`

## 实际现象

表格共 1 条：登录账号 `admin`，真实姓名「超级管理员」，状态启用。
**角色列显示 `è¶…çº§ç®¡ç†å‘˜`**（「超级管理员」的 UTF-8 被当成 Latin-1 展示）。

同页「权限角色」页签中角色名称「超级管理员」显示正常。

## 预期现象及依据

角色列应显示可读的角色名，与真实姓名/权限矩阵中的「超级管理员」一致。

## 影响范围

管理员账号列表角色列；无法从列表直接辨认角色。

## 证据

- `agent-team/testing/evidence/BATCH-QA-004/10-admin-user.json`
- `agent-team/testing/evidence/BATCH-QA-004/11-observations.md`
