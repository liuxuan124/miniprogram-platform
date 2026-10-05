// scripts/warm-kit-compile-check.js — 用微信开发者工具做真实编译校验（只编译，绝不 upload）
//
// 用 miniprogram-automator.launch 自己拉起 IDE 并打开项目，
// 项目编译（WXML/WXSS/JS）错误会直接抛出来。
// ⚠️ 严禁调用 cli upload / preview，避免占用线上版本号。
const automator = require('miniprogram-automator')
const PROJECT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/miniapp'

const TIMER = setTimeout(() => {
  console.error('✗ 编译校验超时（180s），未能拿到 IDE 回应')
  process.exit(3)
}, 180000)

;(async () => {
  let miniApp
  try {
    miniApp = await automator.launch({
      projectPath: PROJECT,
      port: 9422,
      timeout: 150000,
    })
  } catch (e) {
    clearTimeout(TIMER)
    console.error('✗ automator.launch 失败：' + (e && e.message))
    console.error('  常见原因：开发者工具未登录 / 项目 appid 无权限 / 端口被占')
    process.exit(2)
  }

  const errors = []
  miniApp.on('console', (msg) => {
    const type = String((msg && msg.type) || '').toLowerCase()
    const text = JSON.stringify((msg && (msg.args || msg.message)) || msg)
    if (type === 'error') errors.push('[console] ' + text)
  })

  try {
    const page = await miniApp.reLaunch('/pages/index/index')
    await page.waitFor(3000)
    console.log('✓ 项目编译并打开成功：/pages/index/index（当前路由 ' + page.path + '）')

    const probe = await page.evaluate(() => {
      const out = { warmNodes: 0, unknownNodes: 0, sample: [] }
      const all = document.querySelectorAll('view[class*="wk-"], scroll-view[class*="wk-"]')
      out.warmNodes = all.length
      out.unknownNodes = document.querySelectorAll('.dsl-renderer__unknown').length
      for (let i = 0; i < Math.min(all.length, 10); i++) {
        out.sample.push(all[i].getAttribute('class'))
      }
      return out
    }).catch((e) => ({ probeError: e.message }))

    console.log('页面探针：' + JSON.stringify(probe))
    if (probe.unknownNodes > 0) {
      errors.push(`页面上有 ${probe.unknownNodes} 个「未知组件」兜底节点，可能是新 type 没命中分支`)
    }
  } catch (e) {
    errors.push('[compile] ' + e.message)
  }

  try { await miniApp.close() } catch (e) { /* ignore */ }
  clearTimeout(TIMER)

  if (errors.length) {
    console.error('\n✗ 编译/运行报错 ' + errors.length + ' 条：')
    errors.slice(0, 20).forEach((e) => console.error('  ' + e))
    process.exit(1)
  }
  console.log('\n✓ 微信开发者工具编译通过，无 WXML/WXSS 编译错误（未执行 upload）')
  process.exit(0)
})()
