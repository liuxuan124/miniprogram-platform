# BUG-MKT-001

- 编号：`BUG-MKT-001`
- 类型：展示错误
- 关联功能点 ID：EXP-COUPON-LIST
- 严重度：P1
- 所属模块与页面：营销管理 / 优惠券
- 指派 Agent：admin-agent / miniapp-agent
- 指派依据：券名称与优惠内容列展示不一致
- 状态：回归通过
- 复现概率：修复前当前种子券必现

## 从登录开始的完整复现路径

1. 登录 admin / admin123，关闭改密弹窗
2. 进入「营销管理」优惠券列表

## 实际现象（修复前）

- 券 id=2 名称「会员九折券」，类型「折扣券」，优惠内容列显示 **「0.9折」**
- 接口 `value=0.9`，`type=percent`
- 创建表单文案为「折扣率，如 8.5 表示 8.5 折」

## 预期现象及依据

九折应显示为 9 折或 9折；「0.9折」会被读成不到一折。名称与展示口径应一致。

## 修复说明（BATCH-QA-018）

- 新增 `admin/src/utils/couponDisplay.ts`：`0 < n ≤ 1` 视为倍率并 `×10` 展示
- 后台优惠券列表、装修器 `CouponRenderer`、小程序 `dsl-coupon` / `coupon-list` 统一口径

## 回归证据

- UI：`agent-team/testing/evidence/BATCH-QA-018/01-coupon-list.png`（会员九折券 → **9折**）
- `results.json`：`has09=false`，`has9=true`

## 影响范围

优惠券列表优惠内容列；运营无法核对折扣力度（已修复）。
