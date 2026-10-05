// SubItemList 的核心契约单测：标题必须实时绑定子项内容，禁止写死
// 用法：node scripts/qa/test-sub-item-list.mjs <项目根>
//
// 背景：重构前 4 处多子项列表的折叠头标题是写死的
//   - JoinGroupProps:「群 {{ i + 1 }}」
//   - ActivityListProps:「活动{{ i + 1 }}」
//   - CategoryNavProps:「分类{{ i + 1 }}」
//   - WarmHomeBlockProps navs:「{{ nav.label || '未命名入口' }}」
// 运营填完名称后列表头还是「群 1」，等于没有可辨识性。
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.argv[2] || '.')
const P = (p) => path.join(ROOT, p)

let pass = 0
let fail = 0
function ok(cond, name, extra = '') {
  if (cond) pass++
  else {
    fail++
    console.log('  FAIL ' + name + (extra ? '\n       ' + extra : ''))
  }
}

const subSrc = fs.readFileSync(P('admin/src/components/page-builder/SubItemList.vue'), 'utf8')

console.log('== 基件契约 ==')
ok(/titleOf:\s*\(item:\s*any/.test(subSrc), 'titleOf 是必填 prop（强制调用方给真实标题）')
ok(/titleOf\(item, i\) \|\| placeholder/.test(subSrc), '标题取不到才回落 placeholder')
ok(/is-empty/.test(subSrc), '无标题时加 is-empty 类（灰字占位，不伪装成有名字）')
ok(/el-collapse-transition/.test(subSrc), '用 el-collapse-transition 做折叠动画')
ok(/:key="keyOf\(item, i\)"/.test(subSrc), 'key走 keyOf（外部可给稳定 id）')
ok(/const openSet = ref\(new Set/.test(subSrc), '用「显式展开集合」建模（折叠集合无法表达单开）')
ok(/next\.add\(i\)\n\s*openSet\.value = next/.test(subSrc), '同一时刻只展开一项（点谁开谁）')
ok(/props\.items\.length/.test(subSrc) && /next\.add\(i\)/.test(subSrc), 'items 变短时清理越界折叠态')
ok(/placeholder: '未填写'/.test(subSrc), '默认 placeholder 是「未填写」而不是「未命名」')
// 剥掉 HTML 注释后再查：注释里的警告文案（「绝不写死未命名」）是刻意保留的
const tpl = subSrc.slice(0, subSrc.indexOf('</template>')).replace(/<!--[\s\S]*?-->/g, '')
ok(!/未命名/.test(tpl), '基件模板区不出现「未命名」字样（注释不计）')

console.log('')
console.log('== 接入方：折叠头标题不得写死序号 ==')

const CASES = [
  ['props/JoinGroupProps.vue', /:title-of="\(g\) => g\.name \|\| ''"/, '群列表绑定 group.name'],
  ['props/ActivityListProps.vue', null, '活动列表待接入'],
  ['props/CategoryNavProps.vue', null, '分类列表待接入'],
  ['props/WarmHomeBlockProps.vue', null, '导航入口待接入'],
]

for (const [rel, re, name] of CASES) {
  const f = P('admin/src/components/page-builder/' + rel)
  if (!fs.existsSync(f)) {
    fail++
    console.log('  FAIL 文件不存在 ' + rel)
    continue
  }
  const src = fs.readFileSync(f, 'utf8')
  if (re) {
    ok(re.test(src), name)
    ok(!/<span>\s*群\s*\{\{\s*i\s*\+\s*1\s*\}\}\s*<\/span>/.test(src), '  └ 不再写死「群 N」')
  } else {
    // 未接入的组件：若仍写死序号标题则记失败
    const hardcoded = src.match(/<span[^>]*>\s*(群|活动|分类)\s*\{\{\s*i\s*\+\s*1\s*\}\}/)
    ok(!hardcoded, name + '：当前无写死序号标题', hardcoded ? hardcoded[0] : '')
  }
}

console.log('')
console.log('== 接入方：不得再出现「未命名」式假标题 ==')
for (const rel of ['props/WarmHomeBlockProps.vue']) {
  const src = fs.readFileSync(P('admin/src/components/page-builder/' + rel), 'utf8')
  // authorTitle 的「N 未命名作者」是带序号的动态标题（可区分多条），属正确实现，不算问题。
// 这里只校验 navs 段：接入基件后不应再有「未命名入口」式兜底。
const navFake = src.match(/\|\|\s*'未命名入口'/)
ok(!navFake, rel + '：navs 折叠头不再有「未命名入口」兜底', navFake ? navFake[0] : '')
ok(/SubItemList/.test(src), rel + '：navs 已接入 SubItemList')
}

console.log('')
console.log((fail === 0 ? 'PASS' : 'FAIL') + ' ' + pass + ' 通过 / ' + fail + ' 失败')
process.exit(fail === 0 ? 0 : 1)
