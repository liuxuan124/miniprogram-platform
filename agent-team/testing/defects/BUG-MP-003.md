# BUG-MP-003

- 编号：`BUG-MP-003`
- 类型：空态/加载态错误
- 关联功能点 ID：EXP-MP-CART
- 严重度：P2
- 所属模块与页面：小程序 / 购物车 `pages/cart/cart`
- 指派 Agent：miniapp-agent
- 指派依据：未登录进入购物车后加载态不结束，空态不出现
- 状态：回归通过
- 复现概率：未登录必现

## 从登录开始的完整复现路径

1. 微信开发者工具 `miniapp`，automator 连接 `ws://127.0.0.1:9420`，当前无登录 token
2. `reLaunch('/pages/cart/cart')`
3. 等待约 2 秒后截图并读取页面 data

## 实际现象

- `loading=true`，`isEmpty=false`，`cartList` 长度 0
- 页面中间一直「加载中...」
- 同时出现凑单条「再买一点可用「满 100 减 20」券」、底部「全选 / 合计 / 结算」
- 未出现「购物车空空如也」

## 预期现象及依据

未登录或购物车无商品时应结束加载并给出空态或登录引导，不应长期停在加载中还展示结算栏。

## 影响范围

未登录用户的购物车页。

## 证据

- `agent-team/testing/evidence/BATCH-QA-008/01-cart.png`
- `agent-team/testing/evidence/BATCH-QA-008/automator-report.json`（cart.rawHint）
