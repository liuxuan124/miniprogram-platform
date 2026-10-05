/**
 * 来源标签解析契约测试（端上）
 * 跑法：node /Users/lx/项目文件/liuxuan/小程序搭建运营系统/scripts/qa/test-dsl-source-tag.js
 */
const T = require('/Users/lx/项目文件/liuxuan/小程序搭建运营系统/miniapp/utils/dsl-source-tag.js')

let pass = 0
let fail = 0
function L(name, got, want) {
  const a = JSON.stringify(got)
  const b = JSON.stringify(want)
  if (a === b) { pass++; console.log('  ok  ' + name) }
  else { fail++; console.log('  XX  ' + name + '  期望 ' + b + '  实际 ' + a) }
}

console.log('--- 显隐（修复点：关了开关必须不显示）---')
L('show_source_tag=false → text 空', T.resolveSourceTag({ source: '公众号' }, { show_source_tag: false }).text, '')
L('字段缺失 → text 空', T.resolveSourceTag({ source: '公众号' }, {}).text, '')
L('show_source_tag=true → 有文案', T.resolveSourceTag({ source: '公众号' }, { show_source_tag: true }).text, '公众号')
L('关闭时即使有配色也不显示', T.resolveSourceTag({ source: '公众号' }, { show_source_tag: false, source_tag_map: [{ key: 'wechat_mp', label: '公众号', color: 'green' }] }).text, '')

console.log('--- 文案优先级：map > 扁平字典 > 默认 > 原始名 ---')
L('map 优先', T.resolveSourceTag({ source: '公众号' }, { show_source_tag: true, source_tag_map: [{ key: 'wechat_mp', label: '订阅号' }] }).text, '订阅号')
L('回落扁平字典', T.resolveSourceTag({ source: '公众号' }, { show_source_tag: true, source_labels: { wechat_mp: '大V号' } }).text, '大V号')
L('回落固定默认', T.resolveSourceTag({ source: '小红书' }, { show_source_tag: true }).text, '小红书')
L('无法归类 → 原始来源名', T.resolveSourceTag({ source: '线下活动' }, { show_source_tag: true }).text, '线下活动')

console.log('--- key 匹配（修复点：必须按 key 匹配而非取第一行）---')
const map = [
  { key: 'xiaohongshu', label: '小红书', color: 'pink' },
  { key: 'wechat_mp', label: '订阅号', color: 'green' },
]
const kw = T.resolveSourceTag({ source: '公众号' }, { show_source_tag: true, source_tag_map: map })
L('公众号文章命中 wechat_mp 行（不是第一行）', kw.key, 'wechat_mp')
L('公众号文章文案', kw.text, '订阅号')
L('公众号文章配色 = green 的色', kw.bg, '#e7f7ed')
const kx = T.resolveSourceTag({ source: '小红书' }, { show_source_tag: true, source_tag_map: map })
L('小红书文章命中 pink 的色', kx.bg, '#fdecef')

console.log('--- 配色 ---')
L('配了色 → colored=true', T.resolveSourceTag({ source: '公众号' }, { show_source_tag: true, source_tag_map: [{ key: 'wechat_mp', label: '公众号', color: 'green' }] }).colored, true)
L('没配色 → colored=false', T.resolveSourceTag({ source: '公众号' }, { show_source_tag: true, source_tag_map: [{ key: 'wechat_mp', label: '公众号' }] }).colored, false)
L('非法色值 → colored=false 且不崩', T.resolveSourceTag({ source: '公众号' }, { show_source_tag: true, source_tag_map: [{ key: 'wechat_mp', label: '公众号', color: '不存在' }] }).colored, false)
L('配色前后景成对', [T.resolveSourceTag({ source: '公众号' }, { show_source_tag: true, source_tag_map: [{ key: 'wechat_mp', label: 'x', color: 'blue' }] }).fg], ['#1a56db'])
L('6 套预设齐全', Object.keys(T.COLOR_PRESETS).length, 6)

console.log('--- 兼容性 ---')
L('旧字段 resolveSourceLabel 仍在', T.resolveSourceLabel({ source: '公众号' }, { wechat_mp: '老文案' }), '老文案')
L('旧字段默认值', T.resolveSourceLabel({ source: '原创' }, {}), '原创')
L('filterBySourceKeys 未变', T.filterBySourceKeys([{ source: '公众号' }, { source: '小红书' }], ['wechat_mp']).length, 1)
L('item 为 null 不崩', T.resolveSourceTag(null, { show_source_tag: true }).text, '')
L('categoryName 兜底', T.resolveSourceTag({ categoryName: '专栏' }, { show_source_tag: true }).text, '专栏')

console.log('\n通过 ' + pass + ' / 失败 ' + fail)
process.exit(fail ? 1 : 0)