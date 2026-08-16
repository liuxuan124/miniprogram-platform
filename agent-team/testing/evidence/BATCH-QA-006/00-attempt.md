# BATCH-QA-006 小程序模拟器续测

- 时间：2026-08-13 17:00 ~ 17:06
- 本批已能截到微信开发者工具里的 iPhone 12/13 模拟器（此前「不可见」是窗口被挡住/坐标在屏外，不是没打开）

## 已确认画面

- 模拟器标题「出海笔记」，IDE 底部路径 `pages/index/index`
- 首页有：出海笔记·阿哲 卡片、搜索框、快速开始（内容中心/会员权益/我的订单/联系客服）、本周精选 Banner、按主题逛、底部 Tab、客服浮钮
- 证据：`02-devtools.png`、`04-simulator-full.png`

## 未能继续点击

- `osascript` 点击返回：`osascript不允许辅助访问 (-25211)`
- `miniprogram-automator` 端口 9420 仍无监听（`cli auto` 成功但不拉起 9420）
- 前台常被 WorkBuddy / Cursor 盖住，点击会点到 WorkBuddy
- 因此未能进入商品下单、未能打开表单页提交

## 路径对照

- 后台已发布测试页 id=4 生效路径 `/pages/index/index-2`
- 当前 `miniapp/app.json` 未注册 `index-2`；模拟器打开的是原型首页 `pages/index/index`
- 记入 BUG-UI-002 证据，不新开缺陷
