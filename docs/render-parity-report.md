# 渲染一致性比对报告

生成时间：2026-09-27T15:10:08.388Z

## 统计

- 黄金 DSL 组件数：**58**（parseDSL 灌库后 **57**，差异来自 plugins 门禁过滤）
- 结构登记差异 / 行为差异项：**0**（含已知三组件行为行）
- 仅单端有 Renderer：**0**
- Automator 冒烟：**通过 · Tab 5 · 首页 flow 10 · DSL 模式 是**
- 黄金页 DOM 要素：**通过 · 比对 58 · 硬失败 0 · 软警告 38**

## 说明

- **结构登记**：ComponentItem / dsl-renderer 是否含该 type + 已知三组件行为探针。
- **黄金页 DOM**：Playwright `/h5/golden-parity`（全量 58 组件）；小程序 `render-parity-automator-mini-dom.js` 分批打开 `golden-parity-1…6` 真实抽指纹。
- `mini-dom.json` 必须 `relaxed: false`；任一类型标「未验证」或未跑 DOM 比对，门禁退出 1。

## 明细

| type | 后台 | 小程序 | 判定 |
|------|------|--------|------|
| activity_entry | 有 Renderer | 有分支 | 一致 |
| activity_list | 有 Renderer | 有分支 | 一致 |
| ai_entry | 有 Renderer | 有分支 | 一致 |
| appointment_service | 有 Renderer | 有分支 | 一致 |
| article_feed | 有 Renderer | 有分支 | 一致 |
| article_list | 有 Renderer | 有分支 | 一致 |
| banner | 有 Renderer | 有分支 | 一致 |
| brand_header | 有 Renderer | 有分支 | 一致 |
| brand_intro | 有 Renderer | 有分支 | 一致 |
| category_nav | 有 Renderer | 有分支 | 一致 |
| certificate | 有 Renderer | 有分支 | 一致 |
| contact_info | 有 Renderer | 有分支 | 一致 |
| container | 有 Renderer | 有分支 | 一致 |
| content_paywall | 有 Renderer | 有分支 | 一致 |
| content_tabs | 有 Renderer | 有分支 | 一致 |
| countdown | 有 Renderer | 有分支 | 一致 |
| coupon | 有 Renderer | 有分支 | 一致 |
| divider | 有 Renderer | 有分支 | 一致 |
| feature_cards | 有 Renderer | 有分支 | 一致 |
| flash_sale | 有 Renderer | 有分支 | 一致 |
| float_button | 有 Renderer | 有分支 | 一致 |
| form_entry | 有 Renderer | 有分支 | 一致 |
| hot_news | 有 Renderer | 有分支 | 一致 |
| image | 有 Renderer | 有分支 | 一致 |
| image_cube | 有 Renderer | 有分支 | 一致 |
| image_hotspot | 有 Renderer | 有分支 | 一致 |
| image_text | 有 Renderer | 有分支 | 一致 |
| join_group | 有 Renderer | 有分支 | 一致 |
| material_list | 有 Renderer | 有分支 | 一致 |
| member_card | 有 Renderer | 有分支 | 一致 |
| member_plan | 有 Renderer | 有分支 | 一致 |
| moments_feed | 有 Renderer | 有分支 | 一致 |
| nav | 有 Renderer | 有分支 | 一致 |
| note_feed | 有 Renderer | 有分支 | 一致 |
| notice_bar | 有 Renderer | 有分支 | 一致 |
| planet_feed | 有 Renderer | 有分支 | 一致 |
| planet_hero | 有 Renderer | 有分支 | 一致 |
| planet_topics | 有 Renderer | 有分支 | 一致 |
| product_list | 有 Renderer | 有分支 | 一致 |
| promo_banner | 有 Renderer | 有分支 | 一致 |
| qa_list | 有 Renderer | 有分支 | 一致 |
| rich_text | 有 Renderer | 有分支 | 一致 |
| search | 有 Renderer | 有分支 | 一致 |
| section_bg | 有 Renderer | 有分支 | 一致 |
| section_title | 有 Renderer | 有分支 | 一致 |
| spacer | 有 Renderer | 有分支 | 一致 |
| video | 有 Renderer | 有分支 | 一致 |
| warm_authors | 有 Renderer | 有分支 | 一致 |
| warm_columns | 有 Renderer | 有分支 | 一致 |
| warm_discover | 有 Renderer | 有分支 | 一致 |
| warm_feature | 有 Renderer | 有分支 | 一致 |
| warm_feed | 有 Renderer | 有分支 | 一致 |
| warm_greet | 有 Renderer | 有分支 | 一致 |
| warm_home | 有 Renderer | 有分支 | 一致 |
| warm_mine | 有 Renderer | 有分支 | 一致 |
| warm_planet | 有 Renderer | 有分支 | 一致 |
| warm_planet_rec | 有 Renderer | 有分支 | 一致 |
| warm_shop | 有 Renderer | 有分支 | 一致 |
| banner（行为） | title 文字占位 + 主题渐变（BannerRenderer fallback） | title 文字占位 + 渐变（dsl-banner fallback）；支持 items/images；binderror | 一致 |
| brand_intro（行为） | split 布局；preview 不再默认 hero（仅 variant=hero） | dsl-brand：title/subtitle/description/kpi | 一致 |
| float_button（行为） | H5 预览 #fab 槽渲染 | dsl-float-button | 一致 |

## 黄金页 DOM 差异（仅非一致项）

| type | 后台 | 小程序 | 判定 | 备注 |
|------|------|--------|------|------|
| activity_entry | t59/i0/b1/显 | t57/i0/b0/显 | 要素数差异 | btn 1/0 |
| activity_list | t32/i0/b0/显 | t85/i0/b0/显 | 要素数差异 | text 32/85 |
| appointment_service | t38/i0/b0/显 | t55/i0/b0/显 | 要素数差异 | text 38/55 |
| article_feed | t31/i0/b0/显 | t4/i0/b0/显 | 要素数差异 | text 31/4 |
| article_list | t13/i0/b0/显 | t65/i0/b0/显 | 要素数差异 | text 13/65 |
| banner | t24/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 24/0 |
| brand_intro | t38/i0/b0/显 | t54/i0/b0/显 | 要素数差异 | text 38/54 |
| certificate | t38/i0/b0/显 | t18/i0/b0/显 | 要素数差异 | text 38/18 |
| container | t35/i0/b0/显 | t16/i0/b0/显 | 要素数差异 | text 35/16 |
| content_paywall | t40/i0/b3/显 | t44/i0/b0/显 | 要素数差异 | btn 3/0 |
| coupon | t53/i0/b0/显 | t32/i0/b0/显 | 要素数差异 | text 53/32 |
| flash_sale | t95/i0/b0/显 | t81/i0/b0/显 | 要素数差异 | text 95/81 |
| form_entry | t32/i0/b0/显 | — | 一致（插件门禁） |  |
| hot_news | t41/i0/b1/显 | t32/i0/b0/显 | 要素数差异 | text 41/32; btn 1/0 |
| image_cube | t15/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 15/0 |
| join_group | t25/i0/b1/显 | t23/i0/b0/显 | 要素数差异 | btn 1/0 |
| material_list | t195/i0/b0/显 | t4/i0/b0/显 | 要素数差异 | text 195/4 |
| member_card | t62/i0/b1/显 | t46/i0/b0/显 | 要素数差异 | text 62/46; btn 1/0 |
| member_plan | t62/i0/b1/显 | t0/i0/b0/显 | 要素数差异 | text 62/0; btn 1/0 |
| note_feed | t42/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 42/0 |
| notice_bar | t34/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 34/0 |
| planet_feed | t577/i4/b0/显 | t0/i0/b0/显 | 要素数差异 | text 577/0; img 4/0 |
| planet_hero | t102/i0/b2/显 | t0/i0/b0/显 | 要素数差异 | text 102/0; btn 2/0 |
| planet_topics | t61/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 61/0 |
| product_list | t24/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 24/0 |
| promo_banner | t26/i0/b1/显 | t0/i0/b0/显 | 要素数差异 | text 26/0; btn 1/0 |
| qa_list | t129/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 129/0 |
| rich_text | t16/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 16/0 |
| search | t5/i0/b1/显 | t0/i0/b0/显 | 要素数差异 | btn 1/0 |
| section_bg | t34/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 34/0 |
| section_title | t23/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 23/0 |
| warm_authors | t31/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 31/0 |
| warm_columns | t29/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 29/0 |
| warm_discover | t130/i0/b0/显 | t0/i0/b0/显 | 要素数差异 | text 130/0 |
| warm_greet | t102/i0/b0/显 | t36/i0/b0/显 | 要素数差异 | text 102/36 |
| warm_home | t118/i0/b0/显 | t35/i0/b0/显 | 要素数差异 | text 118/35 |
| warm_mine | t62/i0/b0/显 | t35/i0/b0/显 | 要素数差异 | text 62/35 |
| warm_planet | t64/i0/b0/显 | t35/i0/b0/显 | 要素数差异 | text 64/35 |
| warm_shop | t62/i0/b0/显 | t35/i0/b0/显 | 要素数差异 | text 62/35 |

## 执行方式

```bash
bash scripts/render-parity-full.sh
```
