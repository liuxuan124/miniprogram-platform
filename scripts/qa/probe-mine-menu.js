/**
 * 「我的」页菜单动态渲染探针
 * 用法：node scripts/qa/probe-mine-menu.js [case]
 *   case=default  只验证未配置时的兜底菜单（默认）
 *   case=config   额外注入一套后台配置，验证是否按配置渲染
 */
const path = require('path')
const { spawn } = require('child_process')
const automator = require('miniprogram-automator')

const PROJECT = path.resolve(__dirname, '../../miniapp')
const CLI = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const PORT = 9420
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fs = require('fs')

async function connectWithRetry() {
  for (let i = 0; i < 6; i++) {
    try {
      return await automator.connect({ wsEndpoint: `ws://127.0.0.1:${PORT}` })
    } catch (e) {
      await sleep(3000)
    }
  }
  return null
}

async function main() {
  const mode = process.argv[2] || 'default'
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

  await sleep(1200)
  const mp = await connectWithRetry()
  if (!mp) {
    console.log('FATAL: 连接开发者工具失败，请先执行 cli auto --auto-port 9420')
    process.exit(1)
  }

  const logs = []
  mp.on('console', (msg) => {
    if (msg.type === 'error') logs.push(`[error] ${msg.args.map((a) => String(a && a._value !== undefined ? a._value : a)).join(' ')}`)
  })

  await mp.reLaunch('/pages/mine/mine')
  await sleep(4500)

  const page = await mp.currentPage()
  const route = await page.path
  const data = await page.data()
  const groups = (data.menuGroups || []).map((g) => ({
    name: g.name,
    items: (g.items || []).map((i) => `${i.iconText}${i.title} → ${i.url}${i.needLogin ? ' [需登录]' : ''}`),
  }))
  console.log('当前页:', route)
  console.log('=== 兜底菜单 ===')
  console.log(JSON.stringify(groups, null, 1))
  await mp.screenshot({ path: `${OUT}/mine-menu-default.png` })
  console.log(`截图：${OUT}/mine-menu-default.png`)

  if (mode === 'config') {
    const injected = await mp.evaluate(() => {
      const pages = getCurrentPages()
      const p = pages[pages.length - 1]
      const cfg = {
        menuItems: [
          { id: 't1', icon: 'line:crown', title: '会员中心', url: '/pkg-user/member-center/member-center', needLogin: true, enabled: true, group: '会员专区' },
          { id: 't2', icon: 'line:books', title: '我的资料库', url: '/pkg-content/resources/resources', needLogin: false, enabled: true, group: '会员专区' },
          { id: 't3', icon: 'line:gift', title: '隐藏项（应不显示）', url: '/pkg-user/none/none', enabled: false, group: '会员专区' },
          { id: 't4', icon: 'emoji-test', title: '直接 emoji 图标', url: '/pkg-trade/order-list/order-list', needLogin: true, enabled: true, group: '订单' },
        ],
      }
      p.setData(p._buildMinePatch(cfg))
      return p.data.menuGroups.map((g) => ({
        name: g.name,
        items: g.items.map((i) => `${i.iconText}${i.title} → ${i.url}${i.needLogin ? ' [需登录]' : ''}`),
      }))
    })
    await sleep(1500)
    console.log('=== 注入后台配置后 ===')
    console.log(JSON.stringify(injected, null, 1))
    await mp.screenshot({ path: `${OUT}/mine-menu-config.png` })
    console.log(`截图：${OUT}/mine-menu-config.png`)
  }

  if (logs.length) console.log('\n控制台错误:\n' + logs.slice(-10).join('\n'))
  await mp.disconnect().catch(() => {})
  console.log('probe done')
  process.exit(0)
}

main().catch((e) => {
  console.log('FATAL:', e && (e.message || e))
  process.exit(1)
})
