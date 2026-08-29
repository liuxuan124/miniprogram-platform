#!/usr/bin/env node
/**
 * 本地审核就绪检查：模拟小程序启动后会拉取的接口与数据
 * 用法: node scripts/verify-audit-readiness.js [--base https://api.zfculture.site]
 */
const https = require('https')
const http = require('http')

const BAD_PATTERNS = [
  /测试啊啊/,
  /测试数据/,
  /在此输入/,
  /111111111+/,
  /^[0-9]{4,}$/,
  /发士大夫/,
  /沙雕测试/,
  /demo-/i,
]

const TRADE_COMPONENTS = ['product_list', 'product_card', 'flash_sale', 'category_nav']

function filterTradeComponents(components) {
  const list = Array.isArray(components) ? components : []
  return list.filter((c) => c && !TRADE_COMPONENTS.includes(c.type))
}

function parseArgs() {
  const args = process.argv.slice(2)
  const base = args.includes('--base')
    ? args[args.indexOf('--base') + 1]
    : 'https://api.zfculture.site'
  return { base: base.replace(/\/$/, '') }
}

function requestJson(url) {
  const lib = url.startsWith('https') ? https : http
  return new Promise((resolve, reject) => {
    lib
      .get(url, (res) => {
        let raw = ''
        res.on('data', (c) => { raw += c })
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') })
          } catch (e) {
            reject(new Error(`JSON parse failed (${url}): ${raw.slice(0, 200)}`))
          }
        })
      })
      .on('error', reject)
  })
}

function fail(msg) {
  return { ok: false, message: msg }
}

function pass(msg) {
  return { ok: true, message: msg }
}

function scanText(text, label) {
  const s = String(text || '')
  for (const re of BAD_PATTERNS) {
    if (re.test(s)) return fail(`${label} 命中禁用文案: ${re}`)
  }
  return null
}

function scanDsl(dsl, label, { clientFilter = false } = {}) {
  const components = clientFilter
    ? filterTradeComponents(dsl?.components)
    : (dsl?.components || [])
  const payload = { ...(dsl || {}), components }
  const json = JSON.stringify(payload)
  const hit = scanText(json, label)
  if (hit) return hit
  const types = components.map((c) => c.type)
  for (const t of TRADE_COMPONENTS) {
    if (types.includes(t)) return fail(`${label} 含交易组件: ${t}`)
  }
  return null
}

function pluginEnabled(plugins, key) {
  const list = Array.isArray(plugins) ? plugins : []
  const hit = list.find((p) => p && p.key === key)
  if (!hit) return true
  return hit.enabled !== false && hit.enabled !== 'false'
}

async function fetchAllPublished(base) {
  const all = []
  let page = 1
  const size = 50
  while (true) {
    const { body } = await requestJson(
      `${base}/api/v1/mp/contents?page=${page}&size=${size}&status=published`,
    )
    const records = body?.data?.records || []
    all.push(...records)
    const total = body?.data?.total || 0
    if (all.length >= total || records.length === 0) break
    page += 1
    if (page > 20) break
  }
  return all
}

async function main() {
  const { base } = parseArgs()
  const results = []

  const add = (name, r) => results.push({ name, ...r })

  // 1. 系统配置
  const cfgRes = await requestJson(`${base}/api/v1/mp/system/config`)
  const cfg = cfgRes.body?.data || {}
  if (!cfg.plugins) add('系统配置', fail('plugins 缺失'))
  else {
    if (pluginEnabled(cfg.plugins, 'product')) add('商品模块', fail('product 仍为开启'))
    else add('商品模块', pass('已关闭'))
    const tabTexts = (cfg.tabbarItems || []).filter((t) => t.enabled !== false).map((t) => t.text)
    if (tabTexts.some((t) => /商品|商城|购物/.test(String(t)))) {
      add('TabBar', fail(`含商城 Tab: ${tabTexts.join(', ')}`))
    } else add('TabBar', pass(tabTexts.join(' / ') || '默认'))
    const mine = cfg.minePageConfig || {}
    const menus = (mine.menuItems || []).filter((m) => m.enabled !== false)
    if (menus.some((m) => /订单|已购|优惠券|地址/.test(String(m.title)))) {
      add('我的页菜单', fail(menus.map((m) => m.title).join(', ')))
    } else add('我的页菜单', pass(menus.map((m) => m.title).join(', ') || '无交易入口'))
    const loginHit = scanText(`${mine.loginTitle || ''}${mine.loginSubtitle || ''}`, '我的页登录文案')
    add('我的页登录文案', loginHit || pass('无交易暗示'))
  }

  // 2. 已发布内容全量扫描
  const articles = await fetchAllPublished(base)
  let contentBad = null
  for (const a of articles) {
    contentBad =
      scanText(a.title, `文章#${a.id} title`) ||
      scanText(a.summary, `文章#${a.id} summary`) ||
      scanText(a.content, `文章#${a.id} content`)
    if (contentBad) break
  }
  add('已发布内容', contentBad || pass(`${articles.length} 篇，无测试占位`))

  // 2b. 抽样文章详情
  for (const a of articles.slice(0, 3)) {
    const { body } = await requestJson(`${base}/api/v1/mp/contents/${a.id}`)
    const detail = body?.data
    const r =
      scanText(detail?.title, `详情#${a.id} title`) ||
      scanText(detail?.summary, `详情#${a.id} summary`) ||
      scanText(detail?.content, `详情#${a.id} content`)
    add(`文章详情#${a.id}`, r || pass((detail?.title || '').slice(0, 24)))
  }

  // 3. 原拒审文章 id=4 不可访问
  const c4 = await requestJson(`${base}/api/v1/mp/contents/4`)
  const c4ok = c4.body?.code !== 200 || !c4.body?.data
  add('测试文章#4', c4ok ? pass('已不可公开访问') : fail('仍可访问'))

  // 4. 关键页面 DSL
  const pages = [
    ['首页(绑定页)', '/pages/custom/page-old-home-1'],
    ['内容Tab', '/pages/custom/page-398724'],
    ['工具页', '/pages/custom/page-751193'],
    ['商城深链(客户端过滤后)', '/pages/custom/page-989072'],
  ]
  for (const [label, path] of pages) {
    const { body } = await requestJson(`${base}/api/v1/mp/pages?path=${encodeURIComponent(path)}`)
    const dsl = body?.data
    if (!dsl) {
      if (label.includes('商城')) add(`页面DSL:${label}`, pass('无发布 DSL'))
      else add(`页面DSL:${label}`, fail('DSL 为空'))
      continue
    }
    const clientFilter = label.includes('商城')
    const r = scanDsl(dsl, label, { clientFilter })
    const comps = clientFilter
      ? filterTradeComponents(dsl.components).map((c) => c.type)
      : (dsl.components || []).map((c) => c.type)
    add(`页面DSL:${label}`, r || pass(`组件 ${comps.join(', ')}`))
  }

  // 5. 商品接口应被拦截
  const prod = await requestJson(`${base}/api/v1/mp/products?page=1&size=5`)
  const prodBlocked = prod.body?.code !== 200
  add('商品列表API', prodBlocked ? pass('已拦截') : fail('仍可访问'))

  const cart = await requestJson(`${base}/api/v1/mp/cart`)
  const cartBlocked = cart.body?.code !== 200
  add('购物车API', cartBlocked ? pass('已拦截') : fail('仍可访问'))

  // 6. 搜索「测试」不应返回占位文
  const search = await requestJson(`${base}/api/v1/mp/contents?keyword=${encodeURIComponent('测试')}&status=published`)
  const hits = search.body?.data?.records || []
  const searchBad = hits.length
    ? fail(`仍命中 ${hits.length} 条: ${hits.map((h) => h.title).join('; ')}`)
    : pass('无结果')
  add('搜索「测试」', searchBad)

  const failed = results.filter((r) => !r.ok)
  const summary = {
    base,
    ok: failed.length === 0,
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    results,
  }
  console.log(JSON.stringify(summary, null, 2))
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
