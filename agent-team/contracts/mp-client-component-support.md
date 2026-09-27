# 小程序端组件支持与兼容（Phase 2）

**渲染外观与兜底**（banner / brand_intro / float_button 等）：见 [`mp-component-render-contract.md`](mp-component-render-contract.md)。

真源：`miniapp/utils/render.js` 的 `COMPONENT_TYPES` 与 `components/dsl-renderer/`。

## 已完整支持（渲染 + 数据灌库）

基础与布局：`banner` `image` `nav` `search` `notice_bar` `rich_text` `video` `divider` `spacer` `section_title` `section_bg` `container` `float_button` `brand_header` `image_text` `image_hotspot` `image_cube` `feature_cards` `content_tabs`

内容与数据：`article_list` `article_feed` `note_feed` `moments_feed` `hot_news` `product_list` `flash_sale` `material_list` `promo_banner`

业务入口：`activity_entry` `activity_list` `appointment_service` `form_entry` `coupon` `member_card` `member_plan` `join_group` `qa_list` `ai_entry` `content_paywall`

品牌与暖阁块：`warm_greet` `warm_authors` `warm_feature` `warm_columns` `warm_planet_rec` `warm_feed` 及壳类型 `warm_home` `warm_discover` `warm_planet` `warm_shop` `warm_mine`（Tab 宿主页与 `dsl-tab-page.js` 协同）

星球专项：`planet_hero` `planet_topics` `planet_feed`

## 部分支持 / 需注意

- **暖阁 Tab 壳**：绑定页 DSL 须为对应单一 `warm_*` 或走通用 DSL 流式渲染；混排时走 `loadDslPageState`。
- **商品/问答/表单**：受 `plugins` 门禁；关闭模块时组件过滤与跳转拦截（`product-module-gate` 等）。
- **iOS 虚拟支付**：`iosVirtualPay` 读公共配置，非纯前端隐藏。

## 不支持 / 降级

- **未在 `COMPONENT_TYPES` 注册的 type**：`dsl-renderer` 显示「未知组件: xxx」，不阻断整页（其余组件仍渲染）。
- **`validateDSL` 告警**：后台同步前检查应拦截；旧包遇新 type 仅降级展示。

## 需升级代码包的情况

- 新增 `COMPONENT_TYPES` 与 wxml 分支。
- 新增 `app.json` / 分包页面路径。
- 变更 Tab 壳路由（`TAB_SLOT_ROUTES`）或原生页能力。

## 配置 vs 代码

| 变更 | 仅后台同步 | 需新代码包 |
|------|------------|------------|
| 文案、配色、Tab 绑定装修页 | 是 | 否 |
| 组件 props、排序、数据源 query | 是 | 否 |
| 新组件 type | 否（旧包降级） | 完整支持需发版 |
| 新页面路径未在包内注册 | 否 | 是 |
