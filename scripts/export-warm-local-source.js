#!/usr/bin/env node
/**
 * 将 miniapp/data/warm-*.js 导出为可灌库的 JSON 快照。
 * 用法：node scripts/export-warm-local-source.js
 * 输出：docs/warm-local-source-export-YYYYMMDD.json
 *
 * 灌库步骤见 docs/warm-local-source-sync.md
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const warmHome = require(path.join(root, 'miniapp/data/warm-home.js'))
const warmDiscover = require(path.join(root, 'miniapp/data/warm-discover.js'))
const warmPlanet = require(path.join(root, 'miniapp/data/warm-planet.js'))
const warmShop = require(path.join(root, 'miniapp/data/warm-shop.js'))
const warmDemo = require(path.join(root, 'miniapp/data/warm-demo.js'))
const { WARM_THEME_CONFIG, SEARCH_HOT } = require(path.join(root, 'miniapp/data/warm-source.js'))

const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const outPath = path.join(root, `docs/warm-local-source-export-${stamp}.json`)

const payload = {
  meta: {
    brand: '暖阁',
    exportedAt: new Date().toISOString(),
    source: 'miniapp/data/warm-*.js',
    note: '灌库后将 USE_LOCAL_SOURCE 改为 false',
  },
  system: {
    theme: WARM_THEME_CONFIG,
    searchHot: SEARCH_HOT,
    tabs: [
      { text: '首页', path: '/pages/index/index' },
      { text: '发现', path: '/pages/discover/discover' },
      { text: '星球', path: '/pages/planet/planet' },
      { text: '商城', path: '/pages/shop/shop' },
      { text: '我的', path: '/pages/mine/mine' },
    ],
  },
  home: {
    authors: warmHome.AUTHORS,
    navs: warmHome.NAVS,
    feature: warmHome.FEATURE,
    columns: warmHome.COLUMNS,
    planet: warmHome.PLANET,
    feed: warmHome.FEED,
  },
  discover: {
    tabs: warmDiscover.TABS,
    notes: warmDiscover.listForTab ? warmDiscover.listForTab('note') : [],
    articles: warmDiscover.listForTab ? warmDiscover.listForTab('article') : [],
    goods: warmDiscover.listForTab ? warmDiscover.listForTab('goods') : [],
  },
  planet: {
    home: warmPlanet.HOME,
    feed: warmPlanet.FEED,
    topics: warmPlanet.TOPICS,
    kpis: warmPlanet.KPIS,
    expireText: warmPlanet.EXPIRE_TEXT,
  },
  shop: {
    vip: warmShop.VIP_BAR,
    cats: warmShop.CATS,
    flash: warmShop.FLASH,
    feat: warmShop.FEAT,
    products: warmShop.PRODUCTS,
  },
  content: {
    list: warmDemo.DEMO_LIST,
    article: warmDemo.DEMO_ARTICLE,
    note: warmDemo.DEMO_NOTE,
    resources: warmDemo.DEMO_RESOURCES,
    join: warmDemo.DEMO_JOIN,
    column: warmDemo.DEMO_COLUMN,
    goods: warmDemo.DEMO_GOODS,
    planetPost: warmDemo.DEMO_PLANET_POST,
  },
}

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
console.log('exported:', outPath)
console.log('sections:', Object.keys(payload).join(', '))
