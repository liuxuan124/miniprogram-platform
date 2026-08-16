# BUG-UI-002

- 编号：`BUG-UI-002`
- 类型：功能缺陷
- 关联功能点 ID：FP-UI-185 / EXP-LINE1-*
- 严重度：P1
- 所属模块与页面：页面管理 / 装修器发布
- 指派 Agent：admin-agent / backend-agent
- 指派依据：后台生成的生效路径无法在真实小程序包打开；后台配置与端上不一致
- 状态：回归通过
- 复现概率：修复前必现

## 从登录开始的完整复现路径

1. 登录 → 页面管理 → 新建页面（默认类型「首页」，默认名「首页」）
2. 用 50 字名称创建并进入装修器（得到页面 id=4）
3. 添加「标题栏」（标题改为「QA主线标题」）和「公告栏」
4. 保存草稿（`POST /api/v1/admin/pages/4/draft` => 200）
5. 预览弹窗可见「QA主线标题」与公告文案
6. 发布页面 → 发布前检查通过 → 立即发布（`POST /api/v1/admin/pages/4/publish` => 200）
7. 成功弹窗给出「小程序端生效路径：/pages/index/index-2」
8. 用微信开发者工具 CLI `open` 打开 `miniapp` 项目（CLI 返回 ✔ open）

## 实际现象（修复前）

- 系统里同时存在两个类型为「首页」的页面：原「出海笔记首页」路径 `pages/index/index`，新页路径 `/pages/index/index-2`
- 发布成功弹窗明确写出生效路径 `/pages/index/index-2`，并提示还要去「搭建小程序」绑导航
- 后台预览能看到刚配的标题/公告；真实小程序端未能打开该路径完成对照

## 预期现象及依据

发布后用户应能在真实小程序打开与后台配置一致的页面。新建「首页」不应静默生成小程序包内不存在的路径，或生成前必须阻断并说明。

## 修复说明（BATCH-QA-018）

- 后端 `PageServiceImpl`：`validatePathRules` / `assertPathPublishable` 拒绝 `/pages/index/index-\d+`；首页类型路径必须为 `/pages/index/index`
- 前端页面管理：首页占用时禁用「首页」选项并提示；路径校验拒绝 index-2；新建默认自定义页
- 历史脏数据 page id=4 已改为 `/pages/custom/qa-batch001`

## 回归证据

- `POST /pages` path=`/pages/index/index-2` → `300204`
- `PUT /pages/4` path=`/pages/index/index-2` → `300204`
- UI：`agent-team/testing/evidence/BATCH-QA-018/02-create-page-home-disabled.png`、`results-round3.json`
- 摘要：`agent-team/testing/evidence/BATCH-QA-018/00-summary.md`

## 影响范围

所有通过「新建页面」默认首页类型发布的页面；本批测试页 id=4（已清理）。
