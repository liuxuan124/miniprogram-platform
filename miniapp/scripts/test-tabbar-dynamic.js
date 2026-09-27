#!/usr/bin/env node
/** 动态 Tab 选中下标：须按可见列表而非固定五槽位 */
const { resolveActiveTabItems } = require('../utils/tabbar-config')

const plugins = []
const threeTabs = [
  { id: 't0', text: '首页', tabRoute: '/pages/index/index', pagePath: 'pages/index/index' },
  { id: 't1', text: '内容', tabRoute: '/pages/discover/discover', pagePath: 'pages/discover/discover' },
  { id: 't2', text: '我的', tabRoute: '/pages/mine/mine', pagePath: 'pages/mine/mine' },
]
const rows = resolveActiveTabItems(plugins, threeTabs)
const visible = rows.map((r) => r.slotRoute)
if (visible.length !== 3) {
  console.error('FAIL expected 3 tabs got', visible.length)
  process.exit(1)
}
const mineIdx = visible.indexOf('/pages/mine/mine')
if (mineIdx !== 2) {
  console.error('FAIL mine index should be 2 got', mineIdx, visible)
  process.exit(1)
}
console.log('OK tabbar-dynamic', visible.join(','))
