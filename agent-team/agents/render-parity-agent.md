# 渲染一致性 Agent（RENDER-PARITY）

> 任务：消除「后台装修器画布」与「小程序真机」渲染不一致的问题。
> 本文自包含，执行前**只需**再读 `AGENTS.md` 与 `docs/CHANGELOG.md` 顶部。

---

## 0. 为什么有这个任务

本项目是**小程序搭建与运营平台**，装修器是核心卖点。运营在后台拖组件、看到的画布，必须等于用户在小程序里看到的页面。

现状不是这样：**同一份 DSL，存在两套互相独立的渲染实现**。

| 端 | 渲染入口 | 组件实现 |
|----|----------|----------|
| 小程序 | `miniapp/utils/render.js` 的 `COMPONENT_TYPES` + `miniapp/components/dsl-renderer/` | `miniapp/components/dsl-*`（WXML） |
| 后台预览 | 路由 `/h5/miniapp-preview` → `admin/src/views/page-builder/miniapp-full-preview.vue` | `admin/src/components/page-builder/`、`admin/src/components/miniapp-builder/`（Vue） |

两套实现由不同时期、不同人写成，**没有任何机制保证它们一致**，也没有报错——只能靠人眼截图比对。2026-09-26 一个下午就是这样排查掉 7 类问题的（见 `docs/CHANGELOG.md` 当日记录）。

**本任务的目标不是"把当前差异抹平"**（抹平后没有守护机制，一定会再漂），而是：

1. 止血：让后台预览不再冒充真机
2. 修掉唯一会造成**空白区域**的真 bug
3. **建立自动比对**，把"发现漂移"从人工变成 CI
4. 依据比对清单一次性修掉存量差异
5. 按清单补契约文档

---

## 1. 硬约束（务必遵守）

### 1.1 禁止直接改库绕过变更检测

迁移脚本 `V95__builder_home_nav_and_empty_warm.sql` 直接 `UPDATE` 了 `mp_system_config` 的 `site_builder_draft`，结果：

- 该键实际值是 `{}`，真正生效的是**扁平键** `tabbarItems` / `miniappHomePageId`，V95 写进了没人读的地方
- 直接改库不被变更检测识别 → `siteDraftChanged=false` → 「禁空发」拒绝发布 → 死锁

**改配置一律走后台 API**（`PUT /api/v1/admin/mini/site`、`PUT /api/v1/admin/system/configs`），不要写迁移脚本改配置数据。

### 1.2 不要动「我的」页的定位

`pages/mine/mine` 是**系统页（固定模板）**，承载登录、订单、优惠券等系统能力。产品决定：**后台只能改文案与开关，不开放菜单自由编排**。

- Tab 绑定规则见 `admin/src/views/mini/appearance.vue` 的 `SYSTEM_PAGES` / `persistTabBar`
- 选系统页时**只写 `pagePath`、不写 `pageId`**（写了会被当装修页去拉 DSL）
- `MinePagePreview.vue` 已按 `mine.wxml` 的版式重画过，**改 `mine.wxml` 必须同步它**

### 1.3 三个 Tab 已是纯 DSL 宿主薄壳

`pages/discover`、`pages/planet`、`pages/shop` 的原生业务代码已于 2026-09-26 移除，只剩 DSL 宿主（各约 1.5KB）。**不要往回加原生分支**——同一 Tab 两条渲染路径正是历史问题的根源。

### 1.4 CHANGELOG

按 `AGENTS.md`：有实质改动就在 `docs/CHANGELOG.md` **本季区块顶部**加一行（日期 + 做了什么 + 影响哪端 + 迁移号如有）。不要写长周报。

---

## 2. 本地环境（已配置好，直接用）

```bash
PROJECT="/Users/lx/项目文件/liuxuan/小程序搭建运营系统"
```

| 事项 | 命令 / 说明 |
|------|-------------|
| 后端 | `cd $PROJECT/deploy && docker compose build backend && docker compose up -d backend` |
| 后台前端 | `cd $PROJECT/admin && ADMIN_BUILD_SKIP_TSC=1 npx vite build && docker cp dist/. miniapp-admin:/usr/share/nginx/html/` |
| 后台地址 | `http://localhost` |
| 后端 API | `http://127.0.0.1:8080` |
| 小程序 | 微信开发者工具打开 `$PROJECT/miniapp`，普通编译；改完**清缓存（含 Storage）→ 重新编译** |

已就绪的本地配置（`deploy/.env`）：

- `APP_CONTENT_AUTO_SYNC=true` —— 后台保存外观/页面即自动写线上配置并递增 `live_release_no`
- `PREVIEW_TOKEN_SECRET=...` —— 未设时 `?view=draft` 一律 404

**小程序在开发者工具里没有预览令牌，必然请求 `view=online`**，即已发布快照。验证改动是否生效：

```bash
curl -s "http://127.0.0.1:8080/api/v1/mp/config/public?view=online" | grep -o '"live_release_no":[^,]*'
```

---

## 3. 已知事实（不要重复排查）

- **外链图片不可达**：种子数据大量使用 `https://picsum.photos/...`，本机网络**访问不了**（实测连接失败）。内容封面、`banner` 图都受影响。**这不是代码 bug**，但两端对"图片加载失败"的兜底行为不一致，是本任务要解决的。
- **首页当前 DSL**（`pages/index/index`，pageId=1，11 个组件）：
  `brand_intro → search → nav → banner → section_title → nav → section_title → article_list → section_title → product_list → float_button`
- **已确认的三处首页差异**（作为契约与比对的第一批样本）：

| 组件 | 后台 | 小程序 | 性质 |
|------|------|--------|------|
| `banner` | 图挂了显示蓝底 + title 文字兜底 | **整块空白** | 兜底行为不一致（唯一造成空白，优先修） |
| `brand_intro` | 有首字母方块、把 subtitle 里的「已认证」拆成徽标、圆角卡片 | 无方块、subtitle 平铺、深色通栏 | 两套实现的样式分歧；DSL 只有 `title/subtitle/description/kpi` 四字段，**后台属于自行加料** |
| `float_button` | **不渲染** | 渲染（右下角圆钮） | 后台缺实现 |

- **组件清单**：`miniapp/capabilities.json` 列了 58 个 `supported_component_types`，但**只有名字，没有渲染规格**——今天的差异全掉在这个盲区里。
- **现有契约**：`agent-team/contracts/mp-client-component-support.md` 只写"支持 / 部分支持 / 降级"，同样不涉及"该长什么样"。
- **遗留待办（不属于本任务，别顺手删）**：商品表 id 21–25 是 UTF-8/latin1 双编码的重复记录，均在售且各有正常孪生，需人工下架或删除。

---

## 4. 任务清单

### 任务 1 · 止血：后台预览标题据实标注

**改**：`admin/src/components/mini/DevicePreview.vue` 的标题「配置预览」

**为**：`配置预览（非真机效果，以扫码为准）`，或等效表述。

**理由**：该预览长得像真机，运营会拿它当标准。历史上它画着「收货地址」「我的资产」这类小程序**从来没有过**的菜单，直接误导排查方向数小时。

**验收**：后台外观页、概览页的预览卡标题均已更新。任务 6 完成后可由人决定是否去掉这行标注。

---

### 任务 2 · 修 `banner` 图片兜底

**目标**：两端对"图片加载失败"的表现一致。

**规定**（写入契约）：`banner` 图片加载失败时，两端都显示 **title 文字占位**（背景用主题色，不留白）。

- 小程序：`miniapp/components/dsl-banner/`，参考 `miniapp/utils/image-fallback.js` 现有机制
- 后台：`admin/src/components/page-builder/` 下对应 banner 组件，确认其兜底与上述规定一致

**验收**：把 `banner` 的 `items[].image` 指向一个必然 404 的地址，两端均显示 title 文字占位，**都不留白**。

---

### 任务 3 · 黄金 DSL 测试页

**产出**：`agent-team/testing/golden-dsl.json`

一份覆盖 `capabilities.json` 全部 58 个 `supported_component_types` 的页面 DSL，每个组件给一组**固定的、不依赖网络**的 props：

- 不使用外链图片（picsum 本机不可达）；用本地 `/images/**` 或纯色占位
- 数据源类组件（`article_list` / `product_list` / `note_feed` 等）优先用 `props.items` 内联静态数据，避免接口波动影响比对
- 每个组件 `id` 用 `golden-<type>`，便于定位

**验收**：该 DSL 能被 `miniapp/utils/render.js` 的 `parseDSL` 正常解析，且不含任何外部网络依赖。

---

### 任务 4 · 自动比对脚本

**产出**：`scripts/compare-render-parity.js` + `docs/render-parity-report.md`（生成物）

**做法**（二选一，优先 A）：

- **A. 结构比对（推荐先做）**：分别提取两端渲染后的"要素清单"——每个组件渲染出的文本节点、图片数量、按钮数量、是否渲染——做结构 diff。稳定、不受字体/抗锯齿干扰。
  - 后台侧：用 Playwright 打开 `http://localhost/h5/miniapp-preview?view=config&source=draft&embed=1`，注入黄金 DSL，抓 DOM
  - 小程序侧：用 `miniprogram-automator` 驱动微信开发者工具渲染同一份 DSL，抓 WXML 节点树
  - 仓库已有 `scripts/smoke-devtools-pass.js`、`verify-miniapp-*.js` 等 automator 用法可参考
- **B. 像素比对**：两端截图做感知哈希/像素 diff。更直观但噪声大，建议 A 跑通后再加。

**输出格式**：每个组件一行——`type | 后台要素 | 小程序要素 | 判定(一致/差异/仅单端渲染)`，差异项附具体字段。

**验收**：脚本可重复执行，输出确定性报告；对已知的三处差异（任务 0 表格）**必须能检出**。

---

### 任务 5 · 跑出存量差异清单

执行任务 4 的脚本，产出完整报告，**先交给项目负责人过目再动手修**。

报告需回答：一共多少个组件存在差异、其中多少是"仅单端渲染"（属于缺实现）、多少是样式分歧。

**验收**：`docs/render-parity-report.md` 已生成并包含上述统计。

---

### 任务 6 · 照清单修掉存量差异

按任务 5 的报告逐项修。判定原则（有争议时按此裁决）：

1. **DSL 字段是唯一依据**：DSL 里没有的东西，任一端都不许自行加。
   （例：`brand_intro` 只有 `title/subtitle/description/kpi`，后台把 subtitle 里的「已认证」拆成徽标、额外画首字母方块，属于越界，应去掉——除非在 DSL 里正式加字段并两端同时实现。）
2. **以小程序为准**：小程序是用户真正看到的东西。后台画布向小程序对齐，不是反过来。
3. **缺实现的一端补齐**：如 `float_button` 后台未渲染，应补上。
4. **兜底行为必须成对定义**：图片失败、空数据、超长文本三种情况，两端表现一致。

**验收**：任务 4 的脚本跑出全绿（或剩余差异均已在报告中标注为"有意为之"并写明理由）。

---

### 任务 7 · 补渲染契约文档

**产出**：`agent-team/contracts/mp-component-render-contract.md`

**只写任务 5 报告里出现过差异的组件**，不要一次写 58 个（写了也没人维护）。每条包含：

```
<type>
  必现元素：…
  可选元素：…（及其触发条件）
  禁止：…（任一端不得自行添加的东西）
  兜底：图片失败 / 空数据 / 超长文本分别如何表现
```

同时在 `agent-team/contracts/mp-client-component-support.md` 顶部加一行指向本文件。

**验收**：三处已知差异（`banner` / `brand_intro` / `float_button`）均有条目。

---

## 5. 交付物汇总

| 路径 | 内容 |
|------|------|
| `agent-team/testing/golden-dsl.json` | 黄金 DSL |
| `scripts/compare-render-parity.js` | 比对脚本 |
| `docs/render-parity-report.md` | 差异报告（生成物） |
| `agent-team/contracts/mp-component-render-contract.md` | 渲染契约 |
| `docs/CHANGELOG.md` | 每完成一个任务加一行 |

**CI 接入**：比对脚本应能在 `.github/` 下的流程中运行；若本地环境依赖过重（需开发者工具），至少做成一条可手动触发的检查，并在契约文档里写明执行方式。

---

## 6. 明确不在本任务范围

- **逐个手工对齐 58 个组件**：没有任务 4 的守护机制，对齐完还会漂回去。必须先有检测，再照清单修。
- **跨端框架迁移**：见附录，属于下一阶段，需先做技术验证。
- **商品表乱码重复记录清理**：需人工决策，见 §3。
- **删除 `pages/mine`**：它是系统页，承载登录/订单能力。

---

## 附录 · 下一阶段：渲染层同构（技术验证）

装修器是核心卖点，长期正解是**渲染只有一套实现**。但**不要直接开始迁移**，先做一次 1–2 天的技术验证：

**范围**：只同构 DSL 渲染层（`miniapp/components/dsl-*` 与后台对应 Vue 组件），**不动** miniapp 的登录、订单、支付、会员、星球等业务页面。

**验证内容**：拿**一个**最简单的组件（建议 `banner`）走通全流程——写一次，编译出①小程序自定义组件 ②H5 组件；分别嵌入原生小程序项目和后台预览，确认都能正常渲染与交互。

**候选方案**：

- **kbone**：微信官方，小程序/Web 同构
- **Taro 3**：社区更大，Vue3 支持好；与**原生**小程序项目混合接入是主要风险点，必须实测

**结论要求**：验证报告需明确回答"能否在不重写 miniapp 业务代码的前提下，把 DSL 渲染层做成单一实现"。能，则排期分批迁移（按组件使用频率：`banner`/`nav`/`article_list`/`product_list`/`section_title` 优先）；不能，则长期依赖本任务建立的契约 + 自动比对。
