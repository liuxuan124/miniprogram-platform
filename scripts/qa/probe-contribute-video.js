#!/usr/bin/env node
/**
 * 冒烟：投稿页（contribute）阶段二小红书式重设计 + 视频类型 UI
 *
 * 验证点：
 *  1. publishTypes 含 video（兜底列表）
 *  2. setData publishType=video 后，页面出现 比例切换（2 个选项）与视频预览框
 *  3. 无 JS 异常
 *
 * 前置：微信开发者工具已打开本项目 automator 端口：
 *   /Applications/wechatwebdevtools.app/Contents/MacOS/cli auto --project <miniapp> --auto-port 9420
 */
const path = require('path')
const automator = require(path.resolve(__dirname, '../../node_modules/miniprogram-automator'))

const PAGE = 'pkg-content/contribute/contribute'

;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  const exceptions = []
  mp.on('exception', (e) => exceptions.push(String((e && e.message) || e)))

  console.log('=== 1. 进投稿页 stage=2 ===')
  const jumped = await mp.evaluate(() => new Promise((res) => {
    wx.navigateTo({
      url: '/pkg-content/contribute/contribute?stage=2',
      success: () => res('ok'),
      fail: (e) => res('fail ' + JSON.stringify(e)),
    })
  }))
  console.log('navigateTo:', JSON.stringify(jumped))
  await new Promise((r) => setTimeout(r, 4000))

  const p = await mp.currentPage()
  console.log('当前页:', p.path, p.path === PAGE ? '✅' : '❌')
  if (p.path !== PAGE) { await mp.disconnect(); process.exit(4) }

  const d = await p.data()
  const keys = (d.publishTypes || []).map((t) => t.key)
  console.log('publishTypes:', JSON.stringify(keys), keys.includes('video') ? '✅ 含 video' : '❌ 缺 video')
  console.log('stage:', d.stage, '| editorUnlocked:', d.editorUnlocked, '(false=锁定预览态，预期)')

  console.log('=== 2. 切到视频类型 ===')
  await p.setData({ publishType: 'video', videoRatio: '3:4' })
  await new Promise((r) => setTimeout(r, 800))

  const ratioOpts = await p.$$('.ct-vratio__opt')
  const vbox = await p.$('.ct-vbox')
  const ratioLabel = await p.$('.ct-vhd__lb')
  console.log('比例切换选项数:', ratioOpts.length, ratioOpts.length === 2 ? '✅' : '❌')
  console.log('视频预览框:', vbox ? '✅ 存在' : '❌ 缺失')
  console.log('封面区块标题:', ratioLabel ? await ratioLabel.text() : '(无)')

  console.log('=== 3. 切 1:1 比例类名 ===')
  await p.setData({ videoRatio: '1:1' })
  await new Promise((r) => setTimeout(r, 400))
  const square = await p.$('.ct-vbox.is-square')
  console.log('is-square class:', square ? '✅ 已切换' : '❌ 未切换')

  console.log('=== 4. 异常 ===')
  console.log(exceptions.length ? exceptions.join('\n') : '✅ 无 exception')

  await mp.disconnect()
  const ok = keys.includes('video') && ratioOpts.length === 2 && vbox && exceptions.length === 0
  console.log(ok ? '\n=== SMOKE PASS ===' : '\n=== SMOKE FAIL ===')
  process.exit(ok ? 0 : 5)
})().catch((e) => { console.error('PROBE-ERROR', e); process.exit(9) })
