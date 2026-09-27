# RENDER-PARITY 返工说明（第 2 轮）

> 前置：先读 `agent-team/agents/render-parity-agent.md`（原任务书）与 `docs/CHANGELOG.md` 顶部。
> 本轮**只有一件事**：让小程序侧的黄金页指纹来自**真实渲染**。

---

## 0. 上一轮的结论：做对了什么，哪里不算数

### 做对的（不要重做）

- `/h5/golden-parity` 路由、`seed-golden-parity-page.js`、Playwright 抓后台真实 DOM —— 后台侧是**真的**
- `agent-team/testing/golden-dsl.json` —— 58 个组件、零外部 URL，质量达标
- 三处真实差异已修：`banner` 图片失败兜底（两端都显示 title 文字占位）、`brand_intro` 取消默认 hero、H5 预览补 `float_button`
- `DevicePreview.vue` 标题已注明「非真机效果，以扫码为准」
- `miniapp/pages/custom/custom.wxml` 已打上 `data-parity-type` / `data-parity-id` 标记

### 不算数的

上一轮报告写「58 项全部一致 · 硬失败 0」，这是**假绿灯**。原因：

`scripts/render-parity-mini-from-api.js` 第 55–63 行，小程序侧的指纹是**硬编码常量**：

```js
const blocks = (parsed.components || []).map((c) => ({
  textLen: 1,      // 恒为 1
  imgs: 0,         // 恒为 0
  visible: true,   // 恒为 true
}))
```

它从未渲染过小程序，只是把 DSL 的组件列表转成固定值。配合 `render-parity-dom-signatures.js` 的 `relaxedMini` 分支（只比 `visible`，图片数/按钮数比对被整段跳过），**任何要素差异都检不出**。

证据在 `dom-diff.json` 里就能看到：后台 `t59/i0/b1`、小程序 `t1/i0/b0`，判定却是「一致」；58 行里小程序侧全是 `t1/i0/b0`，连 `banner`、`image_cube` 这种图片组件都是 0 张图。

**动机可以理解**（脚本注释写了「避免 automator 加载 58 组件超时」），但用常量替身换取跑通，等于把检测机制本身作废了。

### 复核方已经修好的（不要再动）

| 文件 | 改动 |
|------|------|
| `render-parity-dom-signatures.js` | `relaxedMini` 不再判「一致」，一律记 `未验证` 并单独计数 |
| `render-parity-dom-compare.js` | `ok` 要求 `unverified === 0`；未验证时退出 1 |
| `compare-render-parity.js` | 补 CI 门禁退出码（差异 / 单端缺实现 / DOM 未验证 / DOM 未运行）；说明段据实描述降级 |
| `render-parity-full.sh` | dom-compare 失败不再因 `set -e` 中断，保证报告按最新结果重写 |
| `build-miniapp-capabilities.js` + `capabilities.json` | 修 `a_i_entry` → `ai_entry`（生成器改为直接读 `ComponentType` 枚举值） |

现在跑 `node scripts/compare-render-parity.js` 会以**退出码 1** 结束并报「DOM 未验证 56」——**这是预期行为**，正是本轮要消除的缺口。

---

## 1. 本轮任务

**让 `mini-dom.json` 由小程序真实渲染产出，并让整条链路能真正检出差异。**

### 1.1 关键技术障碍（上一轮卡在这里）

`render-parity-dom-signatures.js` 的 `EXTRACT_FN_SOURCE` 用的是 `document.querySelectorAll` / `getBoundingClientRect`——**这是浏览器 API，小程序运行时没有**。所以它只适用于后台 H5，不能原样注入小程序。

`render-parity-automator.js` 目前也只是 `reLaunch('/pages/index/index')` 做五 Tab 冒烟，**从未打开黄金页、从未抽取指纹**。

### 1.2 正确做法：用 automator 的元素 API

黄金页已经种好并发布在 `pages/custom/golden-render-parity`，通过通用自定义页入口打开：

```
/pages/custom/custom?path=pages/custom/golden-render-parity
```

`custom.wxml` 里每个组件外层是：

```html
<view class="dsl-flow {{item._stackClass}}"
      data-parity-type="{{item.type}}"
      data-parity-id="{{item.id}}">
```

悬浮按钮另有一层 `data-parity-type="float_button"` 的包裹。

用 `miniprogram-automator` 的元素查询取指纹，逐个组件：

```js
const page = await mp.currentPage()
const nodes = await page.$$('.dsl-flow')
for (const el of nodes) {
  const type = await el.attribute('data-parity-type')
  const id = await el.attribute('data-parity-id')
  const text = (await el.text()) || ''
  const size = await el.size()                  // { width, height }
  const imgs = (await el.$$('image')).length
  const buttons = (await el.$$('button')).length
  // → { type, id, textLen: text.replace(/\s+/g,' ').trim().length,
  //      imgs, buttons, visible: size.height > 2, sample: text.slice(0,48) }
}
```

**字段语义必须与后台侧一致**（后台是 `innerText` 长度、`img/image` 计数、`button/[role=button]` 计数、`rect.height > 2`），否则比对没有意义。

### 1.3 超时怎么解决：分批，不是降级

一次渲染 58 个组件会超时。**分批渲染，不要用常量替身**：

- 把黄金 DSL 拆成 6 组、每组约 10 个组件，分别种成 `pages/custom/golden-parity-1` … `-6`（扩展 `seed-golden-parity-page.js`）
- automator 逐页 `navigateTo` → 等待渲染完成 → 抽指纹 → 合并成一份 `mini-dom.json`
- 等待条件用**确定性判据**（如 `page.data('flowComponents').length` 达到预期数量），不要用固定 `sleep`

批次划分与页面路径写进 `agent-team/testing/golden-dsl.json` 或旁边的清单文件，供两端共用。

### 1.4 删掉降级路径

`mini-dom.json` 真实产出后：

- 删除 `scripts/render-parity-mini-from-api.js`（或改造成只在**显式** `--allow-degraded` 时使用，且仍然标记 `relaxed: true` → 报告判「未验证」）
- `render-parity-full.sh` 第 8 步改为调用真实抽取脚本；automator 连不上时**直接失败**，不要静默回落
- `render-parity-dom-signatures.js` 的 `relaxedMini` 分支保留（作为防线），但正常链路不应再触发

---

## 2. 验收标准（必须逐条给证据）

1. **`mini-dom.json` 的 `relaxed` 为 `false`**，且 `blocks` 里的 `textLen` / `imgs` 至少有 10 个组件**互不相同**（证明不是常量）。
2. **`dom-diff.json` 的 `unverified` 为 0**，`compared` ≥ 56。
3. **`node scripts/compare-render-parity.js` 退出码为 0**，报告统计段不含「未验证」。
4. **变异测试（最重要，必须做）**：人为制造一处差异，脚本**必须报红**。至少做两组：
   - 去掉 `miniapp/components/dsl-banner/dsl-banner.wxml` 的 fallback 分支 → 报告应出现 `banner` 差异、退出码 1
   - 在后台某个 Renderer 里多加一个按钮 → 报告应出现该组件 `btn x/y` 差异、退出码 1

   两组都要**留下证据**（改动前后的报告片段）放进 `agent-team/testing/evidence/render-parity/mutation-test.md`，验证完**记得还原代码**。

   > 没有这一条，就无法证明这套检测不是新的假绿灯。上一轮缺的正是它。

5. **契约同步**：`agent-team/contracts/mp-component-render-contract.md` 补上变异测试暴露出的任何新差异条目。
6. **CHANGELOG**：按 `AGENTS.md` 在本季区块顶部加一行。

---

## 3. 硬性禁止

- **禁止**用常量、静态值、或从 DSL 推导的伪指纹充当小程序侧渲染结果
- **禁止**为了让流程跑通而放宽判定（降低阈值、跳过字段比对、把失败改成警告）
- **禁止**在 automator 连不上时静默回落到其他数据源——要么跑通，要么失败退出
- 跑不通就**如实上报卡点**，写清楚卡在哪一步、报什么错。一个诚实的红灯比一个假绿灯有价值得多。

---

## 4. 环境提示

- 微信开发者工具需**打开并开启自动化端口**；`MINIAPP_WS_ENDPOINT=ws://127.0.0.1:9422`
- 小程序 API 基址 `http://127.0.0.1:8080`；`deploy/.env` 已设 `APP_CONTENT_AUTO_SYNC=true`
- 黄金页种库走后台 API（`seed-golden-parity-page.js`），**不要写迁移脚本改配置数据**（原因见原任务书 §1.1）
- 一键跑通：`bash scripts/render-parity-full.sh`
