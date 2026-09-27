#!/usr/bin/env node
/**
 * 合并 admin-dom.json + mini-dom.json → dom-diff.json
 */
const fs = require('fs')
const path = require('path')
const { loadGoldenTypes, compareDomSignatures } = require('./render-parity-dom-signatures')

const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'agent-team/testing/evidence/render-parity')
const ADMIN = path.join(OUT_DIR, 'admin-dom.json')
const MINI = path.join(OUT_DIR, 'mini-dom.json')
const OUT = path.join(OUT_DIR, 'dom-diff.json')

function main() {
  if (!fs.existsSync(ADMIN) || !fs.existsSync(MINI)) {
    console.error('缺少 admin-dom.json 或 mini-dom.json，请先跑 playwright + automator 黄金页')
    process.exit(1)
  }
  const admin = JSON.parse(fs.readFileSync(ADMIN, 'utf8'))
  const mini = JSON.parse(fs.readFileSync(MINI, 'utf8'))
  const types = loadGoldenTypes()
  const result = compareDomSignatures(admin.blocks || [], mini.blocks || [], types, {
    relaxedMini: !!mini.relaxed,
  })
  const unverified = result.unverified || 0
  const payload = {
    at: new Date().toISOString(),
    compared: result.compared,
    hardFail: result.hardFail,
    softWarn: result.softWarn,
    unverified,
    // 降级模式（小程序侧未真实渲染）不算通过：绿灯必须建立在真实比对之上
    ok: result.hardFail === 0 && unverified === 0,
    rows: result.rows,
  }
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ ok: payload.ok, hardFail: payload.hardFail, softWarn: payload.softWarn, unverified, out: OUT }, null, 2))
  if (unverified > 0) {
    console.error(`未验证 ${unverified} 项：小程序侧指纹为降级常量，请跑通 render-parity-automator.js 后重试`)
  }
  if (result.hardFail > 0 || unverified > 0) process.exit(1)
  if (result.softWarn > 0) {
    console.warn(`soft warnings: ${result.softWarn} (see dom-diff.json)`)
  }
}

main()
