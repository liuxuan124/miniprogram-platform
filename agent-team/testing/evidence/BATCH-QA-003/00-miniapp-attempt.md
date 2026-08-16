# BATCH-QA-003 小程序端尝试记录

- 时间：2026-08-13 16:26 ~ 16:31
- `cli islogin --project miniapp`：`{"login":true}`
- `cli open --project miniapp`：成功
- `cli auto --trust-project`：成功，AppID `wxea3928e0978492fe`，IDE HTTP `127.0.0.1:53097`
- 本机前台窗口列表无「微信开发者工具 / wechatwebdevtools」可见窗口（仅有即时通讯 WeChat）
- `screencapture -l` 无法取得模拟器画面
- `miniprogram-automator` 未能连上（9420 无监听；npx 无 executable）
- 因此主线二下单、主线三提交仍无真实小程序证据，维持 BLOCKED
