# BUG-ASSET-001

- 编号：`BUG-ASSET-001`
- 类型：展示错误
- 关联功能点 ID：EXP-ASSET-LIST
- 严重度：P2
- 所属模块与页面：素材库 / 素材列表
- 指派 Agent：admin-agent
- 指派依据：列表卡片类型与侧栏计数不一致，接口 type 已是 image
- 状态：回归通过
- 复现概率：当前种子素材必现

## 从登录开始的完整复现路径

1. 登录 admin / admin123，关闭改密弹窗
2. 进入「素材库」`/asset/list`
3. 观察顶部类型计数与卡片标签
4. 点「图片」筛选

## 实际现象

- 共 2 个素材：首页活动 Banner、品牌礼盒主图，卡片均标「图片」
- 顶部计数：全部=2，**图片=0**，视频/音频/图文均为 0
- 侧栏：全部素材=2，未分组=0，**首页装修素材=0**
- `GET /api/v1/admin/assets`：两条记录 `type=image`、`groupId=1`
- 点「图片」后列表仍显示这 2 条，但计数仍为 0

## 预期现象及依据

类型/分组计数应与列表及接口字段一致；`type=image` 且卡片写「图片」时，「图片」计数应为 2；`groupId=1` 对应「首页装修素材」时该分组计数应为 2。

## 影响范围

素材库筛选入口；运营无法按类型/分组核对数量。

## 证据

- `agent-team/testing/evidence/BATCH-QA-004/02-asset-list.json`
- `agent-team/testing/evidence/BATCH-QA-004/api-dump.json`
- `agent-team/testing/evidence/BATCH-QA-004/11-observations.md`
