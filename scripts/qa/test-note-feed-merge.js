/**
 * dsl-note-feed 混排合并逻辑自测（纯 Node，不依赖小程序运行时）
 * 覆盖：pickTimestamp 时间戳解析 / mergeByTimestamp 各排序方向 / 缺时间戳沉底
 * 运行：node scripts/qa/test-note-feed-merge.js
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '../../miniapp/components/dsl-note-feed/dsl-note-feed.js')
const src = fs.readFileSync(SRC, 'utf8')

// 从源文件里抽出被测函数（避免 eval 整个组件文件）
function extract(name, kind) {
  const re = new RegExp(`function ${name}\\s*\\([^)]*\\)\\s*\\{`)
  const m = src.match(re)
  if (!m) throw new Error(`未找到函数 ${name}`)
  const start = m.index
  let depth = 0
  let i = src.indexOf('{', start)
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) break
    }
  }
  const body = src.slice(start, i + 1)
  // eslint-disable-next-line no-new-func
  return new Function(`return (${body})`)()
}

const pickTimestamp = extract('pickTimestamp')
const mergeByTimestamp = extract('mergeByTimestamp')

let pass = 0
let fail = 0
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' → ' + extra : ''}`) }
}

console.log('\n[1] pickTimestamp 时间戳解析')
ok('ISO 字符串 2026-10-03T18:55:46', pickTimestamp({ publishedAt: '2026-10-03T18:55:46' }) > 0)
ok('下划线格式 published_at', pickTimestamp({ published_at: '2026-10-03 18:55:46' }) > 0)
ok('camelCase createTime', pickTimestamp({ createTime: '2026-10-03T18:55:46' }) > 0)
ok('商品 createdAt（空格格式）', pickTimestamp({ createdAt: '2026-10-04 01:14:11' }) > 0)
ok('字段优先级 publishedAt > createdAt',
  pickTimestamp({ publishedAt: '2026-10-03T00:00:00', createdAt: '2026-10-04T00:00:00' })
  < pickTimestamp({ publishedAt: '2026-10-05T00:00:00', createdAt: '2026-10-01T00:00:00' }))
ok('无时间字段返回 0', pickTimestamp({ id: 1 }) === 0)
ok('null 返回 0', pickTimestamp(null) === 0)
ok('脏数据不抛错', pickTimestamp({ publishedAt: 'not-a-date' }) === 0)

console.log('\n[2] mergeByTimestamp 排序=new（时间倒序，最新在上）')
{
  const c = [{ id: 'c1', _ts: 300 }, { id: 'c2', _ts: 100 }]
  const p = [{ id: 'p1', _ts: 200, is_product: true }]
  const r = mergeByTimestamp([c, p], 'new').map((x) => x.id)
  ok('结果 c1(300) → p1(200) → c2(100)', JSON.stringify(r) === '["c1","p1","c2"]', r.join(','))
}

console.log('\n[3] mergeByTimestamp 排序=oldest（时间正序，最早在上）')
{
  const c = [{ id: 'c1', _ts: 300 }, { id: 'c2', _ts: 100 }]
  const p = [{ id: 'p1', _ts: 200, is_product: true }]
  const r = mergeByTimestamp([c, p], 'oldest').map((x) => x.id)
  ok('结果 c2(100) → p1(200) → c1(300)', JSON.stringify(r) === '["c2","p1","c1"]', r.join(','))
}

console.log('\n[4] mergeByTimestamp 缺时间戳沉底（不因缺字段被顶到最前）')
{
  const c = [{ id: 'noTs' }, { id: 'c1', _ts: 100 }]
  const p = [{ id: 'p1', _ts: 200, is_product: true }]
  const r = mergeByTimestamp([c, p], 'new').map((x) => x.id)
  ok('new：无戳项在末尾', r[r.length - 1] === 'noTs', r.join(','))
  const r2 = mergeByTimestamp([c, p], 'oldest').map((x) => x.id)
  ok('oldest：无戳项也在末尾', r2[r2.length - 1] === 'noTs', r2.join(','))
}

console.log('\n[5] mergeByTimestamp 边界与稳定性')
{
  ok('空数组', mergeByTimestamp([], 'new').length === 0)
  ok('null lists 不抛错', mergeByTimestamp(null, 'new').length === 0)
  ok('含 null 列表项不抛错', mergeByTimestamp([null, undefined], 'new').length === 0)
  const same = [{ id: 'a', _ts: 100 }, { id: 'b', _ts: 100 }]
  const r = mergeByTimestamp([same], 'new').map((x) => x.id)
  ok('时间戳相同保持原序（稳定）', JSON.stringify(r) === '["a","b"]', r.join(','))
  const three = [{ id: 'x1', _ts: 1 }, { id: 'x2', _ts: 3 }, { id: 'x3', _ts: 2 }]
  ok('全跨列表混排正确', mergeByTimestamp([three], 'new').map((v) => v.id).join(',') === 'x2,x3,x1')
}

console.log('\n[6] hot 排序不报错（口径差异 → 仍按时间穿插，不做跨列表热度比较）')
{
  const c = [{ id: 'c1', _ts: 300 }, { id: 'c2', _ts: 100 }]
  const p = [{ id: 'p1', _ts: 200, is_product: true }]
  const r = mergeByTimestamp([c, p], 'hot').map((x) => x.id)
  ok('hot 走倒序穿插', JSON.stringify(r) === '["c1","p1","c2"]', r.join(','))
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
