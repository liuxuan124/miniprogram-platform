/* 真机验证 v2：笔记瀑布流（大 Tab 页签 + 新查询参数不崩、旧配置兼容） */
const automator = require('miniprogram-automator')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9421' })
  const results = []
  const ok = (name, cond, extra) => {
    results.push(`${cond ? '✓' : '✗'} ${name}${extra ? ' | ' + extra : ''}`)
    if (!cond) process.exitCode = 1
  }

  // ---- 1. 运行时回归（页面栈正常）----
  const home = await mp.evaluate(() => {
    const pages = getCurrentPages()
    return { count: pages.length, route: pages.length ? pages[pages.length - 1].route : '' }
  })
  ok('运行时页面栈正常', home.count > 0, `route=${home.route}`)

  // ---- 2. 内容页（type_tabs 大 Tab，线上真实 DSL）----
  await mp.evaluate(() => wx.navigateTo({ url: '/pages/custom/custom?path=pages/custom/motai-content' }))
  await sleep(6000)
  const content = await mp.evaluate(() => {
    const pages = getCurrentPages()
    const p = pages[pages.length - 1]
    const route = p && p.route ? String(p.route) : ''
    if (route.indexOf('pages/custom/custom') < 0) return { found: false, route }
    const d = p.data || {}
    return {
      found: true,
      loading: Boolean(d.loading),
      error: String(d.error || ''),
      flowCount: (d.flowComponents || []).length,
    }
  })
  ok('内容页打开且无错误', content.found && !content.error && content.flowCount > 0,
    `flow=${content.flowCount} err=${content.error || '无'}`)

  // ---- 3. 新查询参数在小程序环境可用 ----
  const api = await mp.evaluate(() => new Promise((resolve) => {
    wx.request({
      url: 'https://api.zfculture.site/api/v1/mp/contents?status=published&contentTypes=note,article&size=5&sort_by=hot',
      success: (r) => resolve({
        status: r.statusCode,
        total: r.data && r.data.data ? r.data.data.total : -1,
        types: ((r.data && r.data.data && r.data.data.records) || []).map((x) => x.contentType).join(','),
      }),
      fail: () => resolve({ status: 0, total: -1, types: '' }),
    })
  }))
  ok('contentTypes 多形态接口', api.status === 200 && api.total > 0, `total=${api.total} types=${api.types}`)

  const api2 = await mp.evaluate(() => new Promise((resolve) => {
    wx.request({
      url: 'https://api.zfculture.site/api/v1/mp/contents?status=published&categoryIds=11,12&size=5',
      success: (r) => resolve({ status: r.statusCode, total: r.data && r.data.data ? r.data.data.total : -1 }),
      fail: () => resolve({ status: 0, total: -1 }),
    })
  }))
  ok('categoryIds 多类别接口', api2.status === 200 && api2.total > 0, `total=${api2.total}`)

  console.log(results.join('\n'))
  await mp.disconnect()
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
