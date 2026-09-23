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

## 第三阶段（2026-09-23 · 已做）

- Flyway **V79**：`mp_page.is_test`、`entry_expire_at`
- 测试页标记 + 发布前检查（导航/绑定页 **blocking**；暖阁首页仅壳 **warning**）
- 活动页「设置入口」+ 到期时间（发布前拦截，无定时自动下线任务）
- 装修器：暖阁首页「展开为可编辑区块」（`warmHomeExpand`）
- 概览：草稿/线上**左右对比**预览；**近 7 日访问** Top 路径（`page-access` 上报，无数据空态说明）

## 待做（后续）

- 页面/模块级转化漏斗、更细运营指标
- 小程序运营专用权限与操作日志（当前与全局 admin 权限一致，不含财务模块）
- 活动到期自动下线/换绑（定时任务）
