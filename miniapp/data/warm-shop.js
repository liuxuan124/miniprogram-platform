/** Shop page demo data — aligned with prototypes-warm/shop.html */
const { picsum } = require('./warm-media')

/** 会员开通条（搜索下方、分类上方） */
const VIP_BAR = {
  icon: '🎫',
  title: '开通年度会员',
  desc: '全站长文免费读 · 资料库全解锁 · 商品 8 折',
  priceLabel: '¥168/年',
  price: 168,
  unit: '年',
  productName: '暖阁星球 · 年度会员',
  productId: '',
  // 无商品 id 时回落会员中心；有 id 时商城页优先进商品详情
  url: '/pkg-user/member-center/member-center',
}

const CATS = [
  { icon: '📘', label: '电子书', url: '/pages/product-list/product-list?type=ebook' },
  { icon: '🗂', label: '资料包', url: '/pages/resources/resources' },
  { icon: '🎧', label: '专栏课', url: '/pages/product-list/product-list?type=column' },
  { icon: '🪐', label: '星球', tab: '/pages/planet/planet' },
  { icon: '🎁', label: '周边', url: '/pages/product-list/product-list?type=physical' },
]

const FLASH = [
  { uid: 'f1', id: '', isDemo: true, name: '《内容生意手册》电子书', cover: picsum('eb1', 200, 200), price: '39', origin: '79' },
  { uid: 'f2', id: '', isDemo: true, name: '选题库 Notion 模板包', cover: picsum('eb2', 200, 200), price: '29', origin: '59' },
  { uid: 'f3', id: '', isDemo: true, name: '年度长文合集 PDF', cover: picsum('eb3', 200, 200), price: '19', origin: '49' },
  { uid: 'f4', id: '', isDemo: true, name: '从 0 搭一套私域', cover: picsum('warmc2', 200, 200), price: '149', origin: '259' },
]

const FEAT = {
  uid: 'feat',
  id: '',
  isDemo: true,
  name: '内容生意手册',
  desc: '12 万字 · EPUB / PDF 双格式\n购买后在小程序内直接阅读',
  cover: picsum('eb1', 900, 460),
  price: '39',
  origin: '79',
  tag: '新书首发 · 虚拟商品',
}

const PRODUCTS = [
  {
    uid: 'g0', id: '', isDemo: true, demoKey: 'pay1', tag: '体验包', tagGold: true, format: '虚拟',
    cover: picsum('pay1', 400, 400),
    name: '暖阁体验包 · 1元',
    sub: '支付体验', price: '1', origin: '9.9', sold: '128', memberPrice: '通路体验',
  },
  {
    uid: 'g1', id: '', isDemo: true, tag: '电子书', format: 'EPUB / PDF',
    cover: picsum('eb1', 400, 400),
    name: '内容生意手册：一个人也能跑通的 12 个模型',
    sub: '12 万字 · 可试读前 2 章', price: '39', origin: '79', sold: '2,140', memberPrice: '会员价 ¥31',
  },
  {
    uid: 'g2', id: '', isDemo: true, tag: '资料包', tagGold: true, format: 'Notion / Excel',
    cover: picsum('eb2', 400, 400),
    name: '选题库模板包：3 张表管住全年选题',
    sub: '7 个文件 · 终身更新', price: '29', origin: '59', sold: '1,806', memberPrice: '会员免费',
  },
  {
    uid: 'g3', id: '', isDemo: true, tag: '电子书', format: 'PDF',
    cover: picsum('eb3', 400, 400),
    name: '暖阁年度长文合集 2026',
    sub: '32 篇精选 · 268 页', price: '19', origin: '49', sold: '3,412', memberPrice: '会员免费',
  },
  {
    uid: 'g4', id: '', isDemo: true, tag: '周边', tagGold: true, format: '实物',
    cover: picsum('eb4', 400, 400),
    name: '暖阁陶土杯垫 · 秋日限定',
    sub: '需填写收货地址', price: '68', origin: '', sold: '312', memberPrice: '会员价 ¥54',
  },
  {
    uid: 'g5', id: '', isDemo: true, tag: '专栏课', format: '音频 + 讲稿',
    cover: picsum('warmc1', 400, 400),
    name: '一个人的内容生意 · 32 讲',
    sub: '含 90 天星球会员', price: '199', origin: '399', sold: '8,214', memberPrice: '会员价 ¥159',
  },
  {
    uid: 'g6', id: '', isDemo: true, tag: '社群', tagGold: true, format: '年卡',
    cover: picsum('pl9', 400, 400),
    name: '暖阁星球 · 年度会员',
    sub: '3,241 位球友 · 资料库全解锁', price: '168', origin: '', sold: '3,241', memberPrice: '老球友续费 8 折',
  },
]

module.exports = {
  picsum,
  VIP_BAR,
  CATS,
  FLASH,
  FEAT,
  PRODUCTS,
}
