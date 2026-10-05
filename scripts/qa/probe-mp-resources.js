#!/usr/bin/env node
/**
 * 验证：小程序端「资料库」页到底能不能看到刚入库的 5 份 PDF
 *
 * 背景：2026-10-04 往生产 mp_file_item 入了 id 14-18（跨境电商五年展望 + 5/6/7/8 月刊），
 *      后台接口 total=12 正常，但运营反馈「前端小程序看不到」。
 *      本探针直接进页面读 data，区分三种情况：
 *        ① 拿不到数据（接口报错 / 请求没发出）
 *        ② 拿到数据但映射后为空（normalizeFile 过滤掉了）
 *        ③ 拿到且渲染正常（是「入口找不到」而不是「页面空」）
 *
 * 用法：node scripts/qa/probe-mp-resources.js
 */
const automator = require('miniprogram-automator')

const PAGE = 'pkg-content/resources/resources'

;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  const exceptions = []
  mp.on('exception', (e) => exceptions.push(String((e && e.message) || e)))

  console.log('=== 1. navigateTo 资料库页 ===')
  const jumped = await mp.evaluate(() => new Promise((res) => {
    wx.navigateTo({
      url: '/pkg-content/resources/resources',
      success: () => res('ok'),
      fail: (e) => res('fail: ' + JSON.stringify(e)),
    })
  }))
  console.log('navigateTo:', jumped)
  await new Promise((r) => setTimeout(r, 5000))

  const pages = await mp.evaluate(() => getCurrentPages().map((p) => p.route))
  console.log('当前页栈:', JSON.stringify(pages))

  console.log('\n=== 2. 手动打接口拿原始响应 ===')
  const raw = await mp.evaluate(() => new Promise((res) => {
    wx.request({
      url: 'https://api.zfculture.site/api/v1/mp/files',
      data: { current: 1, size: 30, status: 'published' },
      success: (r) => res({ statusCode: r.statusCode, data: r.data }),
      fail: (e) => res({ fail: String(e && e.errMsg) }),
    })
  }))
  if (raw.fail) {
    console.log('请求失败:', raw.fail)
  } else {
    console.log('HTTP', raw.statusCode)
    const d = raw.data || {}
    console.log('code=', d.code, 'msg=', d.message || d.msg)
    const recs = (d.data && (d.data.records || d.data.list)) || []
    console.log('total=', d.data && d.data.total, '本页=', recs.length)
    recs.slice(0, 8).forEach((r) => {
      console.log('  ', r.id, r.name, '| readMode=', r.readMode, '| canRead=', r.canRead)
    })
  }

  console.log('\n=== 3. 读页面 data（判断是渲染空还是接口空）===')
  const d = await mp.evaluate(() => {
    const pages = getCurrentPages()
    const p = pages[pages.length - 1]
    return { route: p.route, data: p.data }
  })
  const data = d.data || {}
  const groups = data.groups || []
  const total = groups.reduce((n, g) => n + (g.items || []).length, 0)
  console.log('route:', d.route)
  console.log('isEmpty=', data.isEmpty, '| loadError=', data.loadError, '| loading=', data.loading)
  console.log('groups=', groups.length, '| 合计 items=', total)
  console.log('footerText=', data.footerText)
  console.log('memberOk=', data.memberOk)
  groups.forEach((g) => {
    console.log('  【' + g.title + '】', (g.items || []).length, '项')
    ;(g.items || []).slice(0, 12).forEach((it) => {
      console.log('     -', it.id, it.name, '| locked=', it.locked)
    })
  })

  const NEW_IDS = [14, 15, 16, 17, 18]
  const gotIds = groups.flatMap((g) => (g.items || []).map((i) => i.id))
  const missing = NEW_IDS.filter((x) => !gotIds.includes(x))
  console.log('\n=== 4. 结论 ===')
  if (data.loadError) console.log('❌ 页面 loadError=true → 请求失败')
  else if (data.isEmpty) console.log('❌ 页面 isEmpty=true → 接口返回空或映射被过滤')
  else if (missing.length) console.log('⚠️ 页面有数据，但缺新入库的:', missing.join(','))
  else console.log('✅ 5 份新资料全部在页面里 → 问题在「入口找不到」，不在页面本身')
  if (exceptions.length) console.log('页面异常:', exceptions.join(' | '))

  await mp.disconnect()
})().catch((e) => { console.log('ERR:', e.message); process.exit(1) })
