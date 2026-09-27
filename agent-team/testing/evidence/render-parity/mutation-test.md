# RENDER-PARITY 变异测试证据（第 2 轮）

## 0. 对照：假绿灯 vs 真抽取

| 阶段 | `mini-dom.json` | `dom-diff.json` |
|------|-----------------|-----------------|
| 降级 API 替身（已删除） | `relaxed: true`，块内普遍 `t1/i0/b0` | 曾误报「一致」 |
| automator 真实渲染（本轮） | `relaxed: false`，`uniqueTextLen: 24`，`source: automator-real-dom` | `unverified: 0`，`compared: 58` |

## 1. 小程序：去掉 banner fallback

**操作**：临时删除 `miniapp/components/dsl-banner/dsl-banner.wxml` 中 `wx:else` fallback 分支（已还原）。

**判定**：比对脚本已增加 `text` 阈值（`|ΔtextLen|>8` → `notes: text admin/mini`）。黄金 banner 无图时，后台有 title 占位文案、小程序无 fallback 时 `textLen` 为 0。

**还原前基线（有 fallback，但 SelectorQuery 对 swiper 内文案仍偏短）**：

```text
banner: admin t24/i0/b0/显  mini t0/i0/b0/显  → 要素数差异  notes: text 24/0
```

**去掉 fallback 后**：mini 仍为 `t0/i0/b0`，`verdict` 保持 `要素数差异`（`text 24/0`）；`node scripts/compare-render-parity.js` **退出码 1**（存在 softWarn / hardFail，且 `unverified===0` 时不再假绿）。

## 2. 后台：BannerRenderer 多一个 `<button>`

**操作**（已还原）：在 `BannerRenderer.vue` 根节点临时增加隐藏 `<button>parity-mutation</button>` → `admin` build → `docker cp` 至 `miniapp-admin` → `node scripts/render-parity-playwright.js`。

**变异后 `dom-diff.json` 片段**：

```json
{
  "type": "banner",
  "admin": "t40/i0/b1/显",
  "mini": "t0/i0/b0/显",
  "verdict": "要素数差异",
  "notes": "text 40/0; btn 1/0"
}
```

**还原后**：已 rebuild + docker cp + 重跑 Playwright；admin banner 回到 `t24/i0/b0/显`。

## 3. 门禁

- `node scripts/render-parity-dom-compare.js`：`unverified > 0` → 退出 1。
- `node scripts/compare-render-parity.js`：DOM 未验证 / 硬失败 → 退出 1。
- 本轮真实链路下 **`unverified: 0`**；因真实跨端差异 **`ok: false`、退出码 1** 为预期，非假绿灯。
