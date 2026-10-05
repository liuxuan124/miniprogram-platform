/**
 * 小程序 wxml 静态结构校验（纯 Node，不依赖 automator / IDE）
 *
 * 覆盖三类问题：
 *   ① 标签未闭合 / 交叉嵌套
 *   ② wx:for 缺 wx:key
 *   ③ usingComponents 引用的组件路径不存在
 *
 * ⚠️ 本脚本**不查 wx:else 合法性**（原因见代码内注释），`wx:else` 跨 </block>
 *    只有 `cli preview` 能可靠判定 —— 改完 wxml 必须跑 CLI，那是唯一门禁。
 *
 * 用法：node scripts/qa/check-wxml-structure.js [文件...]
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const MINIAPP = path.join(ROOT, 'miniapp')

// 小程序内置标签，不参与配对检查
const BUILTIN = new Set(['block', 'import', 'include', 'wxs', 'template', 'slot'])

const VOID_OK = new Set(['image', 'input', 'icon', 'progress', 'switch', 'slider', 'audio', 'video', 'canvas', 'camera', 'live-player', 'live-pusher', 'open-data', 'web-view', 'ad', 'official-account', 'functional-page-navigator', 'navigator', 'map', 'textarea'])

function checkFile(rel) {
  const abs = path.join(MINIAPP, rel)
  const src = fs.readFileSync(abs, 'utf8')
  const problems = []

  // 去掉注释，避免注释里的标签被误判
  const cleaned = src.replace(/<!--[\s\S]*?-->/g, '')

  // ---------- ① 标签配对 ----------
  const stack = []
  const tagRe = /<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  let m
  while ((m = tagRe.exec(cleaned))) {
    const raw = m[0]
    const name = m[1]
    const selfClose = m[3] === '/'
    const closing = raw.startsWith('</')
    if (BUILTIN.has(name) || VOID_OK.has(name)) continue
    if (selfClose) continue
    if (closing) {
      const top = stack.pop()
      if (!top) {
        problems.push(`多余的 </${name}>（第 ${lineOf(cleaned, m.index)} 行）`)
      } else if (top !== name) {
        problems.push(`标签交叉：<${top}> 被 </${name}> 关闭（应先闭合 ${top}，第 ${lineOf(cleaned, m.index)} 行）`)
        // 尝试恢复：把栈里从头找同名
        const at = stack.lastIndexOf(name)
        if (at >= 0) stack.length = at
      }
    } else {
      stack.push(name)
    }
  }
  stack.forEach((n) => problems.push(`<${n}> 未闭合`))

  // ---------- ② wx:for 上必须有 wx:key ----------
  // 逐个匹配 <view wx:for=...> 开标签
  const forRe = /<[a-zA-Z][\w-]*\b((?:"[^"]*"|'[^']*'|[^>"'])*?)\/?>/g
  while ((m = forRe.exec(cleaned))) {
    const attrs = m[1] || ''
    if (/\bwx:for\b/.test(attrs) && !/\bwx:key\b/.test(attrs)) {
      problems.push(`有 wx:for 但缺 wx:key（第 ${lineOf(cleaned, m.index)} 行）：${m[0].slice(0, 80)}`)
    }
  }

  // ---------- ②b wx:else / wx:elif 合法性 —— 本脚本不查，交给微信编译器 ----------
  // ⚠️ 这里**刻意不做** wx:else 的静态检查。原因：block 是内置无标签容器，
  //    去掉它后 <block wx:if>…</block><view wx:else> 在纯文本层面与
  //    「wx:if 和 wx:else 是兄弟」无法可靠区分。写了两版规则都存在漏报或误报，
  //    一个会漏报真错误的校验器比没有更危险 —— 它给人虚假的安全感。
  //    `wx:else` 跨 </block> 会报 `Bad attr wx:else: wx:if not found`，
  //    **只有 cli preview 能可靠判定**，改完 wxml 必须跑它。

  // ---------- ③ usingComponents 路径存在性 ----------
  const jsonPath = abs.replace(/\.wxml$/, '.json')
  if (fs.existsSync(jsonPath)) {
    let cfg = {}
    try {
      cfg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    } catch (e) {
      problems.push(`json 解析失败：${e.message}`)
    }
    const using = (cfg && cfg.usingComponents) || {}
    Object.keys(using).forEach((tag) => {
      const p = using[tag]
      if (typeof p !== 'string' || !p.startsWith('/')) return
      // /components/x/y → miniapp/components/x/y.{json,wxml}
      const base = path.join(MINIAPP, p)
      const has = ['.wxml', '.json'].some((ext) => fs.existsSync(base + ext))
        || fs.existsSync(path.join(base, 'index.wxml'))
      if (!has) problems.push(`usingComponents「${tag}」指向 ${p}，但该组件不存在`)
    })
  }

  return problems
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length
}

// ================= 执行 =================
const args = process.argv.slice(2)
const targets = args.length
  ? args
  : [
    'components/planet-switch-sheet/planet-switch-sheet.wxml',
    'pkg-content/planet-list/planet-list.wxml',
    'pkg-content/planet-feed/planet-feed.wxml',
    'components/dsl-planet-hero/dsl-planet-hero.wxml',
    'components/dsl-warm-block/dsl-warm-block.wxml',
    'pages/planet/planet.wxml',
    'pages/index/index.wxml',
  ]

let bad = 0
targets.forEach((rel) => {
  const abs = path.join(MINIAPP, rel)
  if (!fs.existsSync(abs)) {
    console.log(`❌ ${rel} —— 文件不存在`)
    bad++
    return
  }
  const problems = checkFile(rel)
  if (problems.length) {
    bad++
    console.log(`\n❌ ${rel}`)
    problems.forEach((p) => console.log('   ' + p))
  } else {
    console.log(`✓ ${rel}`)
  }
})

console.log(bad ? `\n${bad} 个文件有问题` : `\n全部 ${targets.length} 个 wxml 结构通过 ✅`)
process.exit(bad ? 1 : 0)
