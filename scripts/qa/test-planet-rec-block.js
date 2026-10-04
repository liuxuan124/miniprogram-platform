/**
 * 星球推荐块：props 归一化 + 后端数据降级 的纯 Node 单测
 *
 * 不依赖小程序运行时：从源文件正则抽函数体，用 new Function 造出来跑。
 * 覆盖 2026-10-04 多星球改造的关键口径，尤其是「后端未升级时不能白屏」。
 *
 * 用法：node scripts/qa/test-planet-rec-block.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')

/**
 * 从源文件里抽出函数体并变成可调用函数。
 * 兼容两种写法：`function NAME(...) {}` 与对象方法 `NAME(...) {}`（小程序 Component methods）。
 *
 * 注意：new Function(body) 里的 function 声明只是「声明」，不会成为返回值，
 * 必须显式 `return NAME`，否则拿到的是 undefined。
 */
function extractFunction(file, name) {
  const src = fs.readFileSync(file, 'utf8')
  const patterns = [
    `function ${name}(`,
    `\n    ${name}(`, // Component methods 缩进风格
    `\n  ${name}(`,
  ]
  let start = -1
  let decl = ''
  for (const p of patterns) {
    const idx = src.indexOf(p)
    if (idx >= 0) { start = idx; decl = p.trim(); break }
  }
  if (start < 0) throw new Error(`未找到函数 ${name}`)
  const head = start + (decl.startsWith('function') ? 0 : decl.indexOf(name))
  const braceAt = src.indexOf('{', head)
  let depth = 0
  for (let j = braceAt; j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') {
      depth--
      if (depth === 0) {
        let body = src.slice(head, j + 1)
        // 对象方法简写（`NAME() {}`）不是合法函数声明，补上 function 关键字
        if (!body.startsWith('function ')) body = `function ${body.trim()}`
        return new Function(`${body}\nreturn ${name}`)()
      }
    }
  }
  throw new Error(`函数 ${name} 花括号不匹配`)
}

let pass = 0
let fail = 0
function eq(label, got, want) {
  const g = JSON.stringify(got)
  const w = JSON.stringify(want)
  if (g === w) { pass++; console.log(`  ✓ ${label} → ${g}`) }
  else { fail++; console.log(`  ✗ ${label}\n      实际 ${g}\n      期望 ${w}`) }
}

// ---- 1. normalizeWarmPlanetRecProps（纯函数，直接 require） ----
const templateMod = require(path.join(ROOT, 'miniapp/utils/warm-home-template.js'))
const normalize = templateMod.normalizeWarmPlanetRecProps

console.log('\n[1] normalizeWarmPlanetRecProps —— props 归一化')
eq('空 props 补默认值', normalize({}), {
  more_url: '/pkg-content/planet-list/planet-list',
  more_tab: false,
  more_text: '进入 ›',
  feed_url: '/pkg-content/planet-feed/planet-feed?planetId=warm-main',
  planet_mode: 'multi',
  planet_action: 'auto',
  planet_ids: [],
  planet_limit: 0,
})
eq('旧 more_url 指向星球 Tab → 改星球列表',
  normalize({ more_url: '/pages/planet/planet' }).more_url,
  '/pkg-content/planet-list/planet-list')
eq('非法 planet_action → auto',
  normalize({ planet_action: 'nonsense' }).planet_action, 'auto')
eq('合法 planet_action 保留',
  normalize({ planet_action: 'always_feed' }).planet_action, 'always_feed')
eq('planet_ids 去空去重前先清空白',
  normalize({ planet_ids: [' a ', '', null, 'b'] }).planet_ids, ['a', 'b'])
eq('planet_limit 超 12 截断',
  normalize({ planet_limit: 99 }).planet_limit, 12)
eq('planet_limit 负数 → 0（不限制）',
  normalize({ planet_limit: -3 }).planet_limit, 0)
eq('single 模式保留',
  normalize({ planet_mode: 'single' }).planet_mode, 'single')
eq('非数组 planet_ids → []',
  normalize({ planet_ids: 'warm-main' }).planet_ids, [])

// ---- 2. mapPlanet + buildWarmView 里的 planets 降级 ----
console.log('\n[2] mapPlanet —— 后端数据降级（关键：后端未升级不白屏）')
const runtimeSrc = fs.readFileSync(path.join(ROOT, 'miniapp/utils/warm-home-runtime.js'), 'utf8')
const mapPlanet = extractFunction(path.join(ROOT, 'miniapp/utils/warm-home-runtime.js'), 'mapPlanet')

eq('新版完整字段原样保留', mapPlanet({
  planetId: 'warm-read', title: '共读小站', members: '12 位球友', cta: '今日 3 条新动态 · 去看看',
  items: [{ tag: '热议', text: 'x' }], emoji: '📖', joined: true, primary: true,
}), {
  planetId: 'warm-read', title: '共读小站', members: '12 位球友', cta: '今日 3 条新动态 · 去看看',
  items: [{ tag: '热议', text: 'x' }], emoji: '📖', cover: '', subtitle: '',
  joined: true, primary: true,
  introUrl: '/pkg-content/planet-intro/planet-intro?planetId=warm-read',
  feedUrl: '/pkg-content/planet-feed/planet-feed?planetId=warm-read',
})

// 旧后端：planet 里没有 planetId —— 这是分步上线期最容易白屏的地方
const legacyPlanet = { title: '暖阁星球', members: '1 位球友', cta: '今日 2 条新动态 · 去看看', items: [] }
eq('旧后端无 planetId → 兜底 warm-main 而不是丢掉',
  mapPlanet(legacyPlanet).planetId, 'warm-main')
eq('旧后端无 planetId → 仍生成可用的介绍页路径',
  mapPlanet(legacyPlanet).introUrl,
  '/pkg-content/planet-intro/planet-intro?planetId=warm-main')
eq('旧后端无 planetId → emoji 有默认',
  mapPlanet(legacyPlanet).emoji, '🪐')
eq('旧后端 joined 缺省 false', mapPlanet(legacyPlanet).joined, false)

// 完全空对象也不该是 null（否则整块空白）
eq('空对象也不返回 null', mapPlanet({}) && typeof mapPlanet({}), 'object')
eq('null 输入仍返回 null', mapPlanet(null), null)

// buildWarmView 里的降级表达式
console.log('\n[3] buildWarmView.planets 降级链')
const degrade = (apiData) => {
  const legacy = apiData && apiData.planet ? mapPlanet(apiData.planet) : null
  return Array.isArray(apiData && apiData.planets) && apiData.planets.length
    ? apiData.planets.map(mapPlanet).filter(Boolean)
    : (legacy ? [legacy] : [mapPlanet({ planetId: 'warm-main' })])
}
eq('新版多星球直传', degrade({ planets: [{ planetId: 'a' }, { planetId: 'b' }] }).map((x) => x.planetId), ['a', 'b'])
eq('旧后端单卡 → 包成 1 张', degrade({ planet: legacyPlanet }).length, 1)
eq('旧后端单卡 → id 兜底 warm-main', degrade({ planet: legacyPlanet })[0].planetId, 'warm-main')
eq('接口全空 → 仍给 1 张空卡（不白屏）', degrade({}).length, 1)
eq('接口全空 → 卡有可用 id 可点', degrade({})[0].planetId, 'warm-main')
eq('planets 为空数组 → 退回 planet', degrade({ planets: [], planet: legacyPlanet }).length, 1)

// ---- 4. 组件 _syncPlanetUi 的多卡/单卡判定（与后台预览同规则） ----
console.log('\n[4] _syncPlanetUi 判定（组件与后台预览必须同规则）')
// 组件里读的是 this.data.type/config/warm，harness 必须同构
const syncPlanetUi = extractFunction(
  path.join(ROOT, 'miniapp/components/dsl-warm-block/dsl-warm-block.js'), '_syncPlanetUi',
)
function runSync(config, warm) {
  const self = {
    data: { type: 'warm_planet_rec', config: config || {}, warm: warm || {}, planetCards: [], mainPlanet: {}, showSetMain: false },
    setData(p) { Object.assign(this.data, p) },
  }
  syncPlanetUi.call(self)
  return self.data
}
const W = (planets, extra) => Object.assign({ planets, primaryPlanetId: planets[0] && planets[0].planetId, primaryOnly: false }, extra)

const multi = runSync({}, W([{ planetId: 'a' }, { planetId: 'b' }, { planetId: 'c' }]))
eq('3 张卡且未设主星球 → 横滑多卡', { n: multi.planetCards.length, main: !!multi.mainPlanet.planetId }, { n: 3, main: false })

const one = runSync({}, W([{ planetId: 'a' }]))
eq('只有 1 张 → 收成单卡', { n: one.planetCards.length, main: one.mainPlanet.planetId }, { n: 0, main: 'a' })

const setMain = runSync({}, W([{ planetId: 'a' }, { planetId: 'b' }], { primaryOnly: true }))
eq('用户已设主星球 → 只展示主星球', { n: setMain.planetCards.length, main: setMain.mainPlanet.planetId }, { n: 0, main: 'a' })

const singleMode = runSync({ planet_mode: 'single' }, W([{ planetId: 'a' }, { planetId: 'b' }]))
eq('配置为 single → 收成单卡', singleMode.planetCards.length, 0)

// 勾到只剩 1 张时本来就该走单卡，所以用 3→2 张来验证过滤本身
const picked = runSync({ planet_ids: ['b', 'c'] }, W([{ planetId: 'a' }, { planetId: 'b' }, { planetId: 'c' }]))
eq('勾选 planet_ids 只展示勾选的', picked.planetCards.map((x) => x.planetId), ['b', 'c'])
const pickedOne = runSync({ planet_ids: ['b'] }, W([{ planetId: 'a' }, { planetId: 'b' }]))
eq('只勾 1 张 → 自动走单卡（不是横滑一张）', { n: pickedOne.planetCards.length, main: pickedOne.mainPlanet.planetId }, { n: 0, main: 'b' })

const limited = runSync({ planet_limit: 2 }, W([{ planetId: 'a' }, { planetId: 'b' }, { planetId: 'c' }]))
eq('planet_limit 截断', limited.planetCards.map((x) => x.planetId), ['a', 'b'])

const showSetMain = runSync({}, W([{ planetId: 'a' }]))
eq('单卡且非primary → 给「设为主星球」入口', showSetMain.showSetMain, true)
const noSetMain = runSync({}, W([{ planetId: 'a' }], { primaryOnly: true }))
eq('已设主星球 → 不再给入口', noSetMain.showSetMain, false)

const oldBackend = runSync({}, { planets: [{ planetId: 'warm-main', title: '暖阁星球', items: [] }] })
eq('旧后端（无 primaryPlanetId）也不白屏', oldBackend.mainPlanet.planetId, 'warm-main')

// ---- 5. 点击判定 ----
console.log('\n[5] onPlanetTap 跳转判定')
const onPlanetTap = extractFunction(path.join(ROOT, 'miniapp/components/dsl-warm-block/dsl-warm-block.js'), 'onPlanetTap')
function runTap(config, card) {
  const emitted = []
  const self = {
    data: { type: 'warm_planet_rec', config: config || {}, planetCards: [], mainPlanet: card },
    triggerEvent(n, d) { emitted.push([n, d]) },
  }
  onPlanetTap.call(self, { currentTarget: { dataset: { index: 0 } } })
  return emitted
}
const cardNot = { planetId: 'a', joined: false, introUrl: 'I', feedUrl: 'F' }
const cardYes = { planetId: 'a', joined: true, introUrl: 'I', feedUrl: 'F' }
eq('未加入 + auto → 介绍页', runTap({}, cardNot)[0][1].url, 'I')
eq('已加入 + auto → 动态流', runTap({}, cardYes)[0][1].url, 'F')
eq('未加入 + 显式 intro → 介绍页', runTap({ planet_action: 'intro' }, cardNot)[0][1].url, 'I')
eq('已加入 + 显式 intro → 仍介绍页', runTap({ planet_action: 'intro' }, cardYes)[0][1].url, 'I')
eq('未加入 + 显式 feed → 动态流', runTap({ planet_action: 'feed' }, cardNot)[0][1].url, 'F')
eq('已加入 + always_feed → 动态流', runTap({ planet_action: 'always_feed' }, cardYes)[0][1].url, 'F')

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
if (fail) process.exit(1)
