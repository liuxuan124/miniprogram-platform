/**
 * 验证「内容编辑页作者下拉只列启用状态的作者」
 *
 * 背景：content/edit.vue 的 loadAuthors 曾误传 `listAuthors(1)`（应为 `{status:1}`），
 *      运行时 `query.status` 在数字上取不到 → 「启用状态」筛选**静默失效**，
 *      下拉里会混进已停用的作者。vue-tsc TS2559 早就报出来了，但被当噪音忽略。
 *
 * 方法：进内容编辑页 → 打开作者选择器 → 捕获 /admin/authors 请求 → 看有没有带 status=1
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/qa/probe-author-filter.js
 */
'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROD = process.env.PROD || 'https://admin.zfculture.site'
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b64u = (s) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function token() {
  const sec = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
  const n = Math.floor(Date.now() / 1000)
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const p = b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: n, exp: n + 7200 }))
  const b = h + '.' + p
  return b + '.' + b64u(crypto.createHmac('sha256', sec).update(b).digest())
}

const R = []
const ok = (n, d) => { R.push(1); console.log('  OK  ' + n + (d ? '  ' + d : '')) }
const bad = (n, d) => { R.push(0); console.log('  BAD ' + n + (d ? '  ' + d : '')) }

;(async () => {
  const b = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 180000,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1000'],
    defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 2 },
  })
  const pg = await b.newPage()

  // 抓所有 authors 请求
  const reqs = []
  pg.on('response', (r) => {
    const u = r.url()
    if (u.indexOf('/admin/authors') >= 0) reqs.push({ url: u, status: r.status() })
  })

  await pg.evaluateOnNewDocument((tk) => {
    localStorage.setItem('access_token', tk)
    localStorage.setItem('mp_active_tenant_id', '1')
  }, token())

  await pg.goto(PROD + '/dashboard', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
  await sleep(2000)

  console.log('')
  console.log('[1] 打开内容写作页 /content/write')
  await pg.goto(PROD + '/content/write', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
  await sleep(4000)
  console.log('  URL: ' + (await pg.evaluate(() => location.pathname)))

  // 触达作者相关控件
  const touched = await pg.evaluate(() => {
    const hits = Array.from(document.querySelectorAll('button,.el-select,.el-input'))
    const hit = hits.find((x) => /作者档案|联系作者|选择作者/.test(x.innerText || x.placeholder || ''))
    if (hit) { hit.click(); return (hit.innerText || hit.placeholder || '').trim() }
    const labels = Array.from(document.querySelectorAll('.el-form-item__label')).map(l => l.innerText.trim())
    const withAuthor = labels.filter(l => /作者/.test(l))
    // 点开「作者档案」那一项对应的 select
    const idx = labels.indexOf(withAuthor[0])
    if (idx >= 0) {
      const item = document.querySelectorAll('.el-form-item')[idx]
      const s = item && item.querySelector('.el-select, .el-input')
      if (s) { s.click(); return 'form-item:' + withAuthor[0] }
    }
    const s0 = document.querySelector('.el-select')
    if (s0) { s0.click(); return 'first-el-select' }
    return 'labels-with-author=' + JSON.stringify(withAuthor)
  })
  console.log('  触达: ' + (touched || '(未找到)'))
  await sleep(2500)

  console.log('')
  console.log('[2] 捕获的 authors 请求')
  if (!reqs.length) {
    bad('未捕获到 /admin/authors 请求', '作者下拉可能未渲染，或接口路径不同')
  } else {
    reqs.forEach((r) => {
      const hasStatus = r.url.indexOf('status=1') >= 0
      console.log('    ' + r.status + '  ' + r.url.replace(PROD, ''))
      if (hasStatus) ok('请求带 status=1（启用状态筛选生效）')
    })
    const anyStatus = reqs.some((r) => r.url.indexOf('status=1') >= 0)
    if (!anyStatus) bad('所有请求都没有 status=1', '作者筛选仍失效')
  }

  await pg.screenshot({ path: path.join(OUT, 'prod-author-filter.png') })
  await b.close()
  const p = R.filter(Boolean).length
  console.log('')
  console.log('== ' + p + '/' + R.length + ' ==')
  process.exit(p === R.length ? 0 : 1)
})().catch((e) => { console.error('异常: ' + String(e).slice(0, 200)); process.exit(2) })