# BUG-AUTH-001

- 编号：`BUG-AUTH-001`
- 类型：功能缺陷
- 关联功能点 ID：未分配（本批为总控指定探索排查）
- 严重度：P1
- 所属模块与页面：登录 / 工作台（强制改密弹窗）
- 指派 Agent：admin-agent
- 指派依据：弹窗可关闭后仍能进入装修器，弱密码拦截未在前端落地
- 状态：回归通过
- 复现概率：本轮未再复现关闭绕过（BATCH-QA-015：强制改密阻断后续操作）

## 从登录开始的完整复现路径

1. 打开 http://127.0.0.1:3000/login
2. 用户名 `admin`，密码 `admin123`，点「登 录」
3. 进入工作台，弹出「请修改初始密码」
4. 点弹窗右上角「关闭此对话框」
5. 点工作台「进入装修器」

## 实际现象

弹窗关闭后可继续操作后台。已进入 `http://127.0.0.1:3000/page-builder/editor/1`。文案写「请先修改密码再继续操作」，关闭后未再拦截。

## 预期现象及依据

强制改密未完成前，应无法关闭或关闭后再次弹出并阻断进入装修/发布等操作。依据：弹窗文案与验收勾选清单中「默认弱口令须强制改密」。

## 影响范围

超管可带着默认弱密码完整使用后台（本批已实测进入装修器并发布页面）。

## 证据

- `agent-team/testing/evidence/BATCH-QA-001/01-dashboard-force-password.png`
- `agent-team/testing/evidence/BATCH-QA-001/02-dialog-closed-still-operable.png`
- `agent-team/testing/evidence/BATCH-QA-015/01-auth-force-password.png`
- `agent-team/testing/evidence/BATCH-QA-015/02-auth-after-dismiss.png`
- `agent-team/testing/evidence/BATCH-QA-015/p1-regression.json`


## 定位线索

无控制台 error。登录成功后前端仅展示对话框，关闭按钮可销毁对话框。
