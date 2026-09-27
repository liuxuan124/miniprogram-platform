# 小程序组件渲染契约（RENDER-PARITY）

> 视觉与兜底行为的真源：**以小程序 `dsl-renderer` / `dsl-*` 为准**。后台画布与 H5 预览向其对齐。  
> 能力清单见 [`mp-client-component-support.md`](mp-client-component-support.md)。

## banner

- **必现元素**：有 `items[]` 或 `images[]` 时，按项轮播；每项至少有可展示的 **title** 或有效图片。
- **可选元素**：指示点、圆角、高度（`height` / `border_radius`）。
- **禁止**：任一端在 DSL 仅有 title 且无图时留**整块空白**；禁止后台只读 `images` 而忽略 `items`。
- **兜底**：
  - **图片失败 / 无 URL**：两端均显示 **title 文字占位** + 主题渐变背景（小程序 `dsl-banner__fallback`，后台 `banner-fallback`）。
  - **空数据**：无 items/images 且无 title → 不渲染轮播区域（高度 0），不撑空白条。
  - **超长 title**：单行省略或多行截断均可，但 title 必须可见。

## brand_intro

- **必现元素**（DSL 字段）：`title`；可选 `subtitle`、`description`/`desc`、`kpi`。
- **可选元素**：`logo`（有 URL 时展示）。
- **禁止**：后台不得从 `subtitle` 解析「已认证」并单独画徽标；不得默认画 `avatar_text` / `eyebrow` 首字母方块，除非 DSL 增加对应字段且两端同时实现。`variant=hero` 为显式扩展，默认不用。
- **兜底**：
  - **图片失败**：logo 隐藏，文本区仍展示。
  - **空数据**：title 默认「品牌介绍」。
  - **超长文本**：按现有字号换行，不遮挡 kpi。

## float_button

- **必现元素**：配置存在时在页面**右下角（或 props.position）**展示可点浮钮；文案/图标来自 props。
- **可选元素**：多动作列表（actions）。
- **禁止**：H5 配置预览（`miniapp-full-preview`）不得 silently 丢弃 float 组件。
- **兜底**：
  - **无 icon**：仅文案圆钮。
  - **空 text**：显示默认「咨询」类短文案（与 registry 默认一致）。

## 比对与回归

```bash
bash scripts/render-parity-full.sh   # 登记 + 黄金页 DOM + 单测 + automator（需本地 admin + 微信开发者工具）
# 仅结构登记（CI 友好）：
node scripts/generate-golden-dsl.js && node scripts/compare-render-parity.js
```

- 后台黄金页（Playwright）：`/h5/golden-parity?embed=1`，静态 DSL 来自 `admin/public/golden-dsl.json`。
- 小程序黄金页（automator 分批）：`pages/custom/golden-parity-1` … `-6`，清单 `agent-team/testing/golden-dsl-batches.json`，由 `seed-golden-parity-page.js` 发布。
- 小程序指纹脚本：`node scripts/render-parity-automator-mini-dom.js` → `mini-dom.json`（`relaxed: false`，禁止常量替身）。
- DOM 指纹：`textLen` 差超过 8 记 `text admin/mini`；`button` 仅统计原生 `<button>`（小程序大量 CTA 为 `<view>`，btn 差为已知噪声，见 `activity_entry`）。
- 变异回归证据：`agent-team/testing/evidence/render-parity/mutation-test.md`（改 banner 兜底 / 后台多按钮必须报红）。

CI：默认 workflow 跑结构登记 + 单测；完整 DOM 比对需本地 `render-parity-full.sh` + 微信开发者工具。
