# iOS 虚拟支付方案对比（跨境墨太白）

**官方资料查阅日期：2026-09-24**

## 官方结论摘要

微信小程序内**虚拟商品**（会员、解锁内容、订阅、虚拟礼物等）须接入**小程序虚拟支付**，不可长期使用普通 `wx.requestPayment` 在 iOS 上售虚拟商品。

| 文档名称 | URL |
|----------|-----|
| 《虚拟支付：企业、个体户》 | https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html |
| 《wx.requestVirtualPayment》 | https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html |
| iOS 能力说明（已迁移至上一文档 iOS 章节） | https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/ios.html |

要点（以中文文档为准）：

- Android / 鸿蒙 / Windows → 虚拟支付走微信支付子商户；**iOS → Apple 支付**（微信 8.0.68+、iOS 15+、最低 1 元、大陆 App Store 账户）。
- 开通 iOS Apple 支付需：已开虚拟支付 + **配置小程序简称**（MP 后台 · 虚拟支付 · 基础配置）。
- 客户端 API：`wx.requestVirtualPayment`（基础库 ≥ 2.19.2）；iOS **无沙箱**，仅现网 `env=0`。
- 发货/权益以平台通知（如 `xpay_goods_deliver_notify`）及查单接口为准；iOS 退款由用户在 App Store 发起，开发者通过退款问询接口应答。

## 方案对比

| 方案 | 描述 | 合规性 | 成本/复杂度 | 适用阶段 |
|------|------|--------|-------------|----------|
| **A. 接入官方虚拟支付** | 后端米大师签单 + 小程序 `requestVirtualPayment`；iOS/Android 分账规则按平台 | **符合**平台对虚拟商品的要求 | 高：新商户号、商品 ID、双签名、发货通知、iOS 退款问询 | 正式商业化、iOS 也要付费 |
| **B. iOS 阻断普通支付 + 引导 Android/客服**（当前增强版） | iOS 不对虚拟品调起 `requestPayment`；展示替代文案 | **过渡方案**：避免 iOS 违规支付；**不能**替代 A 的长期 iOS 收款 | 低：配置 + 服务端门禁 | **默认推荐直至运营确认 A** |
| **C. H5/外部收银** | 复制链接到浏览器/App 外支付 | **待确认**：需 ICP、商户资质、是否构成规避小程序规则 | 中高 | 一般不优先 |
| **D. 仅赠送/兑换码/线下开通** | iOS 只浏览，权益由 Android 购买或后台开通同步 | 合规取决于是否仍在小程序内**售卖**虚拟品 | 低 | 可配合 B |

## 产品默认策略（实现侧）

> **待用户确认**：是否在约 4–8 周内立项方案 A。

在未确认前，系统默认：

- `iosStrategy = block_wx_pay`（iOS + 虚拟商品 → 禁止创建可支付订单 / 禁止统一下单）
- 管理端可改文案；改 `virtual_payment` 策略**不会**自动接通米大师（仅占位，防止误开）
- 实物商品在 iOS 仍可走普通微信支付（若业务有实物）

## 与代码映射

- 虚拟品判定：`ProductTypes.isVirtual` / 会员类型
- 配置键：`commerce_ios_virtual_pay`（交易设置）
- 审计：`mp_compliance_audit_event`（阻断记录可查询）

## 需用户办理（若选方案 A）

1. 微信公众平台开通**虚拟支付**并完成基础配置（offerId、AppKey、简称）。
2. 确认小程序**类目**是否覆盖知识付费/在线课程等（见《类目与资质清单》）。
3. 苹果侧用户条件与费率（文档写 2026 年腾讯技术服务费减免政策，**以 MP 后台最新公示为准**）。
