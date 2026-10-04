/**
 * 区块解包引擎单测（纯 Node，无 vue/pinia 依赖）
 * 运行：node scripts/qa/test-block-unpack.js
 *
 * 做法：用 esbuild 把 blockTemplates.ts 真正转译成 CJS，再 stub 掉两个
 * componentRegistry 依赖（getDefaultProps / getDefaultStyle）与 ComponentType 枚举。
 * 不用正则剥 TS 注解——那招对多行签名/泛型极易漏切（2026-10-05 实测踩坑）。
 */

const path = require('path')
const fs = require('fs')
const os = require('os')
const assert = require('assert')

const ROOT = path.resolve(__dirname, '../..')
const ADMIN_SRC = path.join(ROOT, 'admin/src')
const esbuild = require(path.join(ROOT, 'admin/node_modules/esbuild'))

/* ---------- 桩：替代 componentRegistry 的两个纯函数 ---------- */
const DEFAULT_PROPS = { keep: 'base', nested: { a: 1, b: 2 }, list: [1, 2] }

/* ---------- 编译 + 加载 ---------- */
async function loadBlockTemplates() {
  const file = path.join(ADMIN_SRC, 'components/page-builder/blockTemplates.ts')
  const registryStub = path.join(os.tmpdir(), `bt-registry-stub.${process.pid}.cjs`)
  const typesStub = path.join(os.tmpdir(), `bt-types-stub.${process.pid}.cjs`)
  const out = path.join(os.tmpdir(), `bt-out.${process.pid}.cjs`)

  fs.writeFileSync(registryStub, `
const DEFAULT_PROPS = ${JSON.stringify(DEFAULT_PROPS)}
exports.getDefaultProps = (type) => ({ kind: type, ...JSON.parse(JSON.stringify(DEFAULT_PROPS)) })
exports.getDefaultStyle = () => ({ margin_top: 0, margin_bottom: 8, nested: { x: 1 } })
`)
  // Proxy：blockTemplates.ts 里有 `const T = ComponentType`，随后 T.Banner 立即求值
  fs.writeFileSync(typesStub, 'exports.ComponentType = new Proxy({}, { get: (_t, k) => String(k) })\n')

  // ⚠️ 必须用 onResolve 插件替换真实模块：bundle:true 会把 componentRegistry.ts
  // 整个 inline 进来，Module._load 拦截压根不会触发（2026-10-05 实测踩坑）。
  // ⚠️ esbuild 的 plugins 不支持 buildSync，必须走异步 build()。
  await esbuild.build({
    entryPoints: [file],
    bundle: true,
    outfile: out,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
    plugins: [
      {
        name: 'stub-deps',
        setup(build) {
          build.onResolve({ filter: /componentRegistry$/ }, () => ({ path: registryStub }))
          build.onResolve({ filter: /types\/page$/ }, (args) => {
            // 只拦本项目的 types/page，别误伤第三方同名包
            return args.importer.includes(ADMIN_SRC) ? { path: typesStub } : null
          })
        },
      },
    ],
  })

  try {
    return require(out)
  } finally {
    for (const f of [out, registryStub, typesStub]) {
      try { fs.unlinkSync(f) } catch { /* 清理失败不影响结论 */ }
    }
  }
}

async function main() {
const api = await loadBlockTemplates()
const {
  uid, deepMerge, countSchemaNodes, countInstanceNodes,
  unpackSchema, remapIds, collectIds, unpackBlock,
  BUILTIN_BLOCKS, builtinBlockByKey, builtinBlocksByCategory,
  pageTemplateBlocks, filterAvailableBlocks, BLOCK_CATEGORIES,
} = api

let passed = 0
let failed = 0
function ok(name, fn) {
  try {
    fn()
    passed++
    console.log('  ✓', name)
  } catch (e) {
    failed++
    console.error('  ✗', name, '\n     ', e.message)
  }
}

console.log('\n[blockTemplates] 区块解包引擎单测\n')

/* ---------- 1. uid 唯一性 ---------- */
ok('uid 连续调用 2 万次不撞号（含同毫秒）', () => {
  const ids = new Set()
  for (let i = 0; i < 20000; i++) ids.add(uid('banner'))
  assert.strictEqual(ids.size, 20000, `期望 20000 个唯一 id，实际 ${ids.size}`)
})

/* ---------- 2. deepMerge ---------- */
ok('deepMerge 递归合并嵌套对象', () => {
  assert.deepStrictEqual(deepMerge({ a: { x: 1, y: 2 }, z: 3 }, { a: { y: 9 } }), { a: { x: 1, y: 9 }, z: 3 })
})
ok('deepMerge 数组整体替换而非按索引合并', () => {
  assert.deepStrictEqual(deepMerge({ list: [1, 2, 3] }, { list: [9] }).list, [9])
})
ok('deepMerge 覆盖值为 undefined 时不污染入参', () => {
  assert.deepStrictEqual(deepMerge({ a: 1 }, undefined), { a: 1 })
})
ok('deepMerge 无副作用（不改入参）', () => {
  const base = { a: { x: 1 } }
  deepMerge(base, { a: { x: 5 } })
  assert.deepStrictEqual(base, { a: { x: 1 } }, 'base 被就地修改')
})

/* ---------- 3. 计数 ---------- */
ok('countSchemaNodes 递归统计含根', () => {
  assert.strictEqual(countSchemaNodes([
    { type: 'a', children: [{ type: 'b', children: [{ type: 'c' }] }] },
    { type: 'd' },
  ]), 4)
})
ok('countSchemaNodes 空数组为 0', () => assert.strictEqual(countSchemaNodes([]), 0))
ok('countInstanceNodes 递归统计', () => {
  assert.strictEqual(countInstanceNodes([{ id: '1', children: [{ id: '2' }] }]), 2)
})

/* ---------- 4. unpackSchema ---------- */
ok('unpackSchema 两次解包 id 零冲突', () => {
  const schema = [{ type: 'Banner', children: [{ type: 'CategoryNav' }] }]
  const ids = [...collectIds(unpackSchema(schema)), ...collectIds(unpackSchema(schema))]
  assert.strictEqual(new Set(ids).size, ids.length, '出现 id 冲突')
})
ok('unpackSchema 保留 children 层级结构', () => {
  const r = unpackSchema([{ type: 'Container', children: [{ type: 'Banner', children: [{ type: 'Nav' }] }] }])
  assert.strictEqual(r[0].type, 'Container')
  assert.strictEqual(r[0].children[0].type, 'Banner')
  assert.strictEqual(r[0].children[0].children[0].type, 'Nav')
  assert.strictEqual(r[0].children[0].children[0].children, undefined)
})
ok('unpackSchema props 走默认值 + 局部深覆盖', () => {
  const p = unpackSchema([{ type: 'Banner', props: { nested: { b: 99 } } }])[0].props
  assert.strictEqual(p.kind, 'Banner', '默认值 kind 丢失')
  assert.deepStrictEqual(p.nested, { a: 1, b: 99 }, '嵌套未深合并')
})
ok('unpackSchema style 走默认值 + 局部覆盖', () => {
  const s = unpackSchema([{ type: 'Banner', style: { margin_top: 12 } }])[0].style
  assert.strictEqual(s.margin_top, 12)
  assert.strictEqual(s.margin_bottom, 8, '默认 margin_bottom 被冲掉')
})
ok('unpackSchema 无子节点时不产生空 children 键', () => {
  assert.ok(!('children' in unpackSchema([{ type: 'Banner' }])[0]))
})

/* ---------- 5. remapIds（我的区块路径） ---------- */
ok('remapIds 递归刷新所有层级 id', () => {
  const saved = [{ id: 'old1', type: 'Container', props: { a: 1 }, children: [
    { id: 'old2', type: 'Banner', props: { b: 2 }, children: [{ id: 'old3', type: 'Nav', props: {} }] },
  ] }]
  const ids = collectIds(remapIds(saved))
  assert.strictEqual(new Set(ids).size, 3)
  assert.ok(ids.every((i) => !i.startsWith('old')), '旧 id 未被全部替换：' + ids.join(','))
})
ok('remapIds 深拷贝：改新实例不污染源', () => {
  const saved = [{ id: 'x', type: 'Banner', props: { nested: { a: 1 } }, style: { margin_top: 0 } }]
  const r = remapIds(saved)
  r[0].props.nested.a = 999
  r[0].style.margin_top = 50
  assert.strictEqual(saved[0].props.nested.a, 1, 'props 共享引用被污染')
  assert.strictEqual(saved[0].style.margin_top, 0, 'style 共享引用被污染')
})
ok('remapIds 保留 data_source / actions', () => {
  const saved = [{ id: 'x', type: 'Banner', props: {}, data_source: { type: 'content', params: { a: 1 } }, actions: [{ type: 'click' }] }]
  const r = remapIds(saved)
  assert.deepStrictEqual(r[0].data_source, { type: 'content', params: { a: 1 } })
  assert.deepStrictEqual(r[0].actions, [{ type: 'click' }])
})
ok('unpackBlock 走 nodes 分支（我的区块）也能重映射', () => {
  const r = unpackBlock({ nodes: [{ id: 'saved_1', type: 'Banner', props: {} }] })
  assert.ok(r[0].id !== 'saved_1', 'nodes 分支未重映射 id')
})
ok('同一区块重复拖入 3 次：总 id 零冲突', () => {
  // 5 个节点：SectionBg > Container > (Banner, CategoryNav)，外加顶层 NoticeBar
  const schema = [
    { type: 'SectionBg', children: [{ type: 'Container', children: [{ type: 'Banner' }, { type: 'CategoryNav' }] }] },
    { type: 'NoticeBar' },
  ]
  const all = []
  for (let i = 0; i < 3; i++) all.push(...collectIds(unpackSchema(schema)))
  assert.strictEqual(all.length, 15, `期望 15 个 id，实际 ${all.length}`)
  assert.strictEqual(new Set(all).size, all.length, '出现 id 冲突')
})

/* ---------- 6. 内置区块注册表 ---------- */
ok('内置区块 key 全局唯一', () => {
  const keys = BUILTIN_BLOCKS.map((b) => b.key)
  assert.strictEqual(new Set(keys).size, keys.length, '重复 key：' + keys.join(','))
})
ok('每个内置区块都有非空 schema 与文案', () => {
  for (const b of BUILTIN_BLOCKS) {
    assert.ok(Array.isArray(b.schema) && b.schema.length > 0, `${b.key} schema 为空`)
    assert.ok(b.name && b.description, `${b.key} 缺 name/description`)
  }
})
ok('需求点名的 4 个关键区块均已落地', () => {
  for (const k of ['hero-banner-nav', 'editorial-column-feed', 'community-onboarding', 'trust-metrics-strip']) {
    assert.ok(builtinBlockByKey(k), `缺少内置区块 ${k}`)
  }
})
ok('5 大分类元数据齐全（含 custom）', () => {
  const vals = BLOCK_CATEGORIES.map((c) => c.value)
  for (const v of ['hero', 'editorial', 'community', 'trust', 'custom']) {
    assert.ok(vals.includes(v), `缺少分类 ${v}`)
  }
})
ok('4 个预置分类各有可用区块，custom 无内置区块', () => {
  for (const c of ['hero', 'editorial', 'community', 'trust']) {
    assert.ok(builtinBlocksByCategory(c).length > 0, `分类 ${c} 无区块`)
  }
  assert.strictEqual(builtinBlocksByCategory('custom').length, 0)
})
ok('整页模板独立于普通区块', () => {
  const pages = pageTemplateBlocks()
  assert.strictEqual(pages.length, 2)
  for (const b of pages) {
    assert.ok(!builtinBlocksByCategory(b.category).includes(b), `${b.key} 同时出现在两处`)
  }
})
ok('filterAvailableBlocks 全类型可用时保留该区块', () => {
  const allowed = new Set(['Banner', 'CategoryNav', 'NoticeBar'])
  const r = filterAvailableBlocks(BUILTIN_BLOCKS, (t) => allowed.has(t))
  assert.ok(r.find((b) => b.key === 'hero-banner-nav'), '全部组件可用时不该被剔除')
})
ok('filterAvailableBlocks 剔除含不可用组件的区块', () => {
  // 少给一个 NoticeBar → hero-banner-nav 整块不可用
  const allowed = new Set(['Banner', 'CategoryNav'])
  const r = filterAvailableBlocks(BUILTIN_BLOCKS, (t) => allowed.has(t))
  assert.ok(!r.find((b) => b.key === 'hero-banner-nav'), '含不可用组件的区块未被剔除')
})
ok('filterAvailableBlocks 递归检查 children（子不可用则整块剔除）', () => {
  const fake = [{ key: 'k', name: 'n', category: 'hero', description: 'd',
    schema: [{ type: 'Container', children: [{ type: 'Blocked' }] }] }]
  assert.strictEqual(filterAvailableBlocks(fake, (t) => t !== 'Blocked').length, 0)
})

console.log(`\n通过 ${passed} 项${failed ? `，失败 ${failed} 项` : ''}\n`)
if (failed) process.exitCode = 1
}

main().catch((e) => { console.error(e); process.exitCode = 1 })
