# 小程序运营升级（实施跟踪）

目标：运营不懂技术也能**改、看、发**。

## 概念（已落地文案）

- 单一线上版本 + 草稿区：`MiniOpsConceptBanner`、`docs/constants/miniOpsConcept.ts`
- 页面三态展示：未发布 / 已发布 / 有修改待发布（`PageStatusTag`）
- 内容即时 vs 页面需发布：页面/发布/外观 Banner 说明

## 菜单（第二阶段 · 已做）

| 菜单 | 路由 |
|------|------|
| 概览 | `/mini/overview`（只看状态 + 快捷入口） |
| 外观 | `/mini/appearance`（导航 + 配色） |
| 页面 | `/mini/pages` |
| 模板 | `/mini/templates` |
| 发布与分发 | `/mini/publish` |

## 待做（按原方案）

- 概览：近 7 日访问/转化（需埋点接口）
- 发布前检查：断链、空组件、测试页被导航引用（扩展 preflight）
- 活动页「设置入口」+ 到期下线
- 首页区块自由组合（暖阁 fixed → composable）
- 测试页仅体验版（字段 + 发布过滤）
- 草稿/线上预览左右对比
- 页面/模块 7 日数据、权限与操作日志
