# BATCH-QA-013 装修器属性修复回归

工作模式：QA。未发布首页 id=1。使用新建自定义页 id=12。

## 本批功能点

缺陷关联 + 同模块关联：FP-UI-014 / 019 / 054 / 073–076 / 079 / 108 / 115 / 122 / 123 / 141 / 152 / 153 / 158 / 160 / 164 / 167 / 168 / 171–176。

## 结论摘要

- 执行 26，PASS 24，FAIL 2
- 仍 FAIL：FP-UI-175、FP-UI-176（跳转缺 type / 缺 target 无保存或发布校验）→ BUG-UI-014 未关

## 加测（不计入 268 分母）

- 分类导航新建即有默认分类项：是（`11-category-nav.png`）
- 资质证书新建即有默认证书项：是（`12-certificate.png`）
- 悬浮按钮默认打开客服时仍显示页面路径/电话号码：是（`13-float-button.png`）
- `visible=false` 画布出现「已隐藏」：是（`04-visible-off.png`）；小程序端不渲染本批未真机复测

## 截图

| 文件 | 内容 |
| --- | --- |
| 01-create-dialog.png | 新建弹窗 maxlength=128、分享封面 |
| 02-page-props.png | 页面属性分享封面 |
| 03-style.png | 内边距 + 组件可见 |
| 04-visible-off.png | 关闭可见后画布角标 |
| 05-banner.png | 轮播标题/跳转类型 |
| 06-product-list.png | 宫格/列表/瀑布流与分类筛选 |
| 07-article-list.png | 紧凑布局与内容筛选 |
| 08-activity-entry.png | 倒计时/名额/报名中 |
| 09-coupon.png | 券类型/仅可领 |
| 10-countdown.png | 格式 d/dh/dhm/dhms |
| 11-category-nav.png | 默认分类项 |
| 12-certificate.png | 默认证书项 |
| 13-float-button.png | 路径与电话始终可见 |
