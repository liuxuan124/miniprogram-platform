const { execFileSync } = require('child_process')
const automator = require('miniprogram-automator')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PROJECT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/miniapp'
const CLI = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/.workbuddy/tmp/qa/'

async function main() {
  // 1) 先标记隐私协议已同意，避免重启后又弹 modal 挡住截图
  const mp0 = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const keys = await mp0.evaluate(() => {
    const app = getApp()
    const legal = (app && app.globalData && app.globalData.legalAgreementVersions) || {}
    const out = []
    Object.keys(legal).forEach((k) => {
      const key = 'privacy_agreed_' + legal[k]
      wx.setStorageSync(key, Date.now())
      out.push(key)
    })
    wx.setStorageSync('privacy_agreed_draft', Date.now())
    out.push('privacy_agreed_draft')
    return out
  }).catch((e) => ['err:' + String(e.message || e).slice(0, 60)])
  console.log('consent keys =', JSON.stringify(keys))
  try { await mp0.disconnect() } catch (e) {}

  // 2) 重启小程序（清掉已弹出的 modal）
  try { execFileSync(CLI, ['close', '--project', PROJECT, '--quiet'], { timeout: 20000 }) } catch (e) {}
  await sleep(3500)
  const mp = await automator.launch({ projectPath: PROJECT })
  console.log('relaunched')
  await mp.evaluate(() => new Promise((r) => wx.switchTab({ url: '/pages/index/index', complete: () => r(1) })))
  await sleep(3500)

  // 3) 摆出修复前首发态（dslMode=false + dslPending=true → 旧 wxml 落 wx:else 渲染原生暖阁块）
  await mp.evaluate(() => {
    const p = getCurrentPages().pop()
    p.setData({ dslMode: false, dslPending: true, loading: false })
  })
  for (const t of [0, 300, 800]) {
    if (t) await sleep(300)
    // eslint-disable-next-line no-await-in-loop
    await mp.screenshot({ path: `${OUT}oldboot2-${t}.png` }).catch(() => {})
    console.log('shot', t)
  }
  // 4) 新态（dslPending=true 走骨架分支）
  await mp.evaluate(() => {
    const p = getCurrentPages().pop()
    p.setData({ dslMode: false, dslPending: true, loading: false })
  })
  await sleep(600)
  await mp.screenshot({ path: `${OUT}newboot-state.png` }).catch(() => {})
  console.log('new boot state shot')
  try { await mp.disconnect() } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e && (e.message || e)); process.exit(1) })
