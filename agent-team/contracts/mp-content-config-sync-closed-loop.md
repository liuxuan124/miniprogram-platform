# 内容配置发布 ↔ 小程序动态同步（闭环）

## 真源

| 层 | 规则 |
|----|------|
| 草稿 | `site_builder_draft`（外观保存）+ 页面 `draft` DSL |
| 线上 | 第 N 次 **内容发布** 快照 + `live_release_no` |
| 预览 | `view=draft` 仅在有 **预览令牌 pt** 时；正式版忽略 pt |

## 小程序（无需重传包）

- `custom-tab-bar`：读 `GET /api/v1/mp/system/config?view=online|draft`，2~5 项。
- Tab 壳页预置在 `app.json`；`tabRoute` + `pagePath` 决定壳与绑定装修页。
- `live_release_no` 变化 → 清 system/DSL 缓存 → 刷新 TabBar + Tab 页 DSL（`content-release-sync.js`）。
- 跳转：`link_type` + `link_url` → `render.resolveLinkAction`（与装修器 LinkPicker 一致）。

## 后台预览

- 外观 iframe = **H5 配置预览**（非微信运行时）；扫码入口 = 体验版 + pt。
- 「改动后」=`source=draft`；「线上」= 当前 live 发布快照。

## 小程序端（Phase 2）

- 正式版 `release`：**强制** `view=online`，清除 pt，不读草稿。
- 体验/开发 + 有效 pt：`view=draft` + 请求头 `X-Mp-Preview-Token`。
- DSL 缓存键含 `{view}` 与 `live_release_no`，预览模式切换时清空 DSL 缓存。
- 更新时机：`onLaunch`/`onShow` 检测发布号（45s 节流）；Tab `onShow`；**下拉刷新**强制检测。
- 网络失败：系统配置回退**上一次有效缓存**；DSL 回退同 view 的最近缓存；无缓存时用内置默认 Tab（非演示业务数据）。
- 「已同步」= 服务端线上配置已更新；**不**表示所有用户设备已刷新。

## 校验

- 发布预检：导航 2~5、绑定页、归档/测试页（已有 `MiniappReleaseServiceImpl.buildPreflight`）。
- 保存导航：`normalizeTabBarItems`（admin）+ `TabBarItemsNormalizer`（backend）。
