#!/usr/bin/env node
/**
 * Generate page-builder test cases + dimension matrix from feature-inventory.md
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../../..')
const INV = path.join(ROOT, 'agent-team/testing/feature-inventory.md')
const OUT = path.join(ROOT, 'agent-team/testing/cases/page-builder')

const DIMS = ['正常路径', '边界值', '异常输入', '权限越权', '幂等与重复', '并发', '时序', '数据一致性']

function parseFps(md) {
  const fps = []
  const re = /^\| (FP-(API|UI|DB)-\d{3}) \| (\w+) \| ([^|]+) \| ([^|]+) \| (否|是) \|$/gm
  let m
  while ((m = re.exec(md))) {
    fps.push({
      id: m[1],
      module: m[2],
      source: m[4].trim(),
      desc: m[5].trim(),
      excluded: m[6].trim() === '是',
    })
  }
  return fps.filter((f) => !f.excluded)
}

function primaryDim(fp) {
  const d = fp.desc
  if (/未登录|角色不足|无权限|越权|110101|110102|110103|200301|禁用/.test(d)) return '权限越权'
  if (/幂等|重复/.test(d)) return '幂等与重复'
  if (/冲突|并发/.test(d)) return '并发'
  if (/超|超过|最长|达上限|page_size|从 1|空列表|空数据|空 content|空 canvas|缺 |缺少|非法|类型错误|JSON 非法/.test(d)) {
    if (/缺 |缺少|非法|类型错误|JSON 非法|参数非法/.test(d)) return '异常输入'
    return '边界值'
  }
  if (/落库|current_version|唯一|级联|JSON/.test(d) && fp.module === 'DB') return '数据一致性'
  return '正常路径'
}

function dimMatrix(fp) {
  const primary = primaryDim(fp)
  const write = /POST|PUT|DELETE|保存|发布|下架|删除|回滚|创建|导入|启用/.test(fp.desc)
  const read = /GET|列表|渲染|展示|预览|公开/.test(fp.desc)
  const auth = /未登录|角色不足|无权限|越权|1101|200301|禁用/.test(fp.desc)
  const bound = /超|空|缺 |非法|page_size|从 1|上限|必填/.test(fp.desc)
  const notes = {}
  notes['正常路径'] = primary === '正常路径'
    ? '适用'
    : (auth || bound ? '不适用，本 FP 已拆出异常/权限分支' : '适用')
  notes['边界值'] = /超|空列表|空数据|空 content|page_size|从 1|上限|limit|interval/.test(fp.desc)
    ? '适用'
    : (primary === '边界值' ? '适用' : '不适用，边界已拆为独立 FP')
  notes['异常输入'] = /缺 |缺少|非法|类型错误|JSON|参数非法/.test(fp.desc)
    ? '适用'
    : '不适用，异常输入已拆为独立 FP 或本操作为只读展示'
  notes['权限越权'] = auth
    ? '适用'
    : (fp.id.startsWith('FP-API-073') ? '不适用，契约规定公开无需登录' : '不适用，鉴权已拆为独立 FP')
  notes['幂等与重复'] = /幂等|重复/.test(fp.desc)
    ? '适用'
    : (write && primary === '正常路径' ? '不适用，幂等已拆为独立 FP' : '不适用，非重复提交场景')
  notes['并发'] = /冲突|并发|uk_page_version/.test(fp.desc)
    ? '适用'
    : (write && /draft|保存/.test(fp.desc) ? '适用，两人同时保存草稿' : '不适用，无共享写冲突')
  notes['时序'] = /回滚|发布|下架|先.*后|版本/.test(fp.desc)
    ? '适用'
    : '不适用，无步骤依赖'
  notes['数据一致性'] = write || fp.module === 'DB' || /列表|current_version|已发布 DSL|GET \/admin\/pages|GET \/mp\/pages/.test(fp.desc)
    ? '适用'
    : '不适用，纯展示无写库'
  if (fp.id === 'FP-API-073') notes['权限越权'] = '不适用，公开接口无需登录'
  return { primary, notes }
}

function layer(fp) {
  if (fp.module === 'API') return '接口'
  if (fp.module === 'DB') return '后台'
  if (/小程序|wx\.|跳转 type|已发布 DSL|只拉已发布/.test(fp.desc)) return '端到端'
  return '后台'
}

function steps(fp) {
  const d = fp.desc
  if (fp.module === 'API') {
    return [
      '使用超管账号登录获取 token（权限类用例改用无 token / 过期 token / 低权限账号）',
      `按功能点调用：${d}`,
      '记录 HTTP 状态码、业务 code、message、data',
      '查询数据库对照 mp_page / mp_page_version',
    ]
  }
  if (fp.module === 'DB') {
    return [
      '准备两条会触发该约束的写入（合法一条、冲突/级联一条）',
      `执行：${d}`,
      '直接查库确认约束是否生效，不以接口文案为准',
    ]
  }
  return [
    '超管登录后台，打开页面管理 / 装修器（或小程序预览，按层级）',
    `执行：${d}`,
    '观察页面反馈，必要时抓接口与查库',
  ]
}

function expected(fp) {
  const d = fp.desc
  if (/110101/.test(d)) {
    return { api: 'HTTP 401，code=110101，message 含未登录', ui: '后台跳转登录或提示未登录', db: '无写库' }
  }
  if (/110102/.test(d)) {
    return { api: 'HTTP 401，code=110102', ui: '提示登录过期', db: '无写库' }
  }
  if (/110103/.test(d)) {
    return { api: 'HTTP 401/403，code=110103', ui: '无法继续操作', db: '无写库' }
  }
  if (/200301/.test(d)) {
    return { api: 'HTTP 403，code=200301', ui: '无权限提示', db: '无写库' }
  }
  if (/300201/.test(d)) {
    return { api: 'HTTP 422，code=300201', ui: '提示需先下架', db: '页面记录仍在' }
  }
  if (/404/.test(d)) {
    return { api: 'HTTP 404', ui: '资源不存在提示', db: '无误删' }
  }
  if (/缺少|缺 |非法|100101|100102/.test(d)) {
    return { api: 'HTTP 400，code=100101 或 100102', ui: '校验错误可见', db: '无脏数据' }
  }
  if (/幂等|重复/.test(d)) {
    return { api: '第二次不产生额外副作用（或明确拒绝）', ui: '无重复创建/重复版本', db: '记录数不增加或版本不连跳异常' }
  }
  if (fp.module === 'DB') {
    return { api: '冲突返回 409/422', ui: '如从后台触发则有错误提示', db: d }
  }
  return {
    api: 'HTTP 200/201，code=0 或 200，data 符合契约',
    ui: d,
    db: writeLike(fp)
      ? 'mp_page / mp_page_version 与操作一致'
      : (/GET|列表/.test(d) ? '与 mp_page 查询结果一致，无写库' : '无写库或仅读'),
  }
}

function writeLike(fp) {
  return /POST|PUT|DELETE|保存|发布|下架|删除|回滚|创建|导入/.test(fp.desc)
}

function renderCase(fp, idx) {
  const { primary } = dimMatrix(fp)
  const exp = expected(fp)
  const st = steps(fp)
  const tcId = `TC-${fp.module}-${String(idx).padStart(3, '0')}`
  return [
    `# ${tcId}`,
    '',
    `- 用例 ID：\`${tcId}\``,
    `- 关联功能点 ID：\`${fp.id}\``,
    `- 测试层级：${layer(fp)}`,
    `- 覆盖维度：${primary}`,
    `- 前置条件：后台 \`http://127.0.0.1:3000\`；接口 \`http://127.0.0.1:8080\`；超管 admin/admin123；低权限账号若环境无则本条记 BLOCKED`,
    `- 执行步骤：`,
    ...st.map((s, i) => `  ${i + 1}. ${s}`),
    `- 预期结果：`,
    `  - 接口响应：${exp.api}`,
    `  - 页面表现：${exp.ui}`,
    `  - 数据库落库：${exp.db}`,
    `- 实际结果：`,
    `- 证据：`,
    `- 结论：\`NOT_RUN\``,
    '',
  ].join('\n')
}

function renderMatrix(fps) {
  const rows = fps.map((fp) => {
    const { notes } = dimMatrix(fp)
    return `| ${fp.id} | ${DIMS.map((d) => notes[d]).join(' | ')} |`
  })
  return [
    '# 页面装修器 · 验证维度矩阵',
    '',
    '> 每个功能点 8 维均已标注适用/不适用。只测通正常路径不得记 PASS。',
    `> 生成时间：2026-08-13。用例结论一律 NOT_RUN，未执行。`,
    '',
    `| FP 编号 | ${DIMS.join(' | ')} |`,
    `| --- | ${DIMS.map(() => '---').join(' | ')} |`,
    ...rows,
    '',
  ].join('\n')
}

function renderIndex(fps, files) {
  const byMod = { API: 0, UI: 0, DB: 0 }
  fps.forEach((f) => { byMod[f.module] += 1 })
  return [
    '# 页面装修器用例索引',
    '',
    '> 总控已确认功能点清单。本目录为用例设计产物，**全部 NOT_RUN**。',
    '> 执行建议：每批 ≤30 条。官方分母以 `feature-inventory.md` 的 268 为准。',
    '',
    '## 数量',
    '',
    `| 项 | 值 |`,
    `| --- | --- |`,
    `| 功能点 | ${fps.length} |`,
    `| 用例（1 FP = 1 主维度用例） | ${fps.length} |`,
    `| API / UI / DB | ${byMod.API} / ${byMod.UI} / ${byMod.DB} |`,
    '',
    '## 文件',
    '',
    ...files.map((f) => `- \`${f}\``),
    '',
    '## 首批执行建议（30 条）',
    '',
    'TC-API-001 ~ TC-API-030（列表/创建/详情/更新的成功、空、分页、鉴权、缺参）。',
    '',
  ].join('\n')
}

function chunkWrite(fps, startId, filename, title) {
  const slice = fps.filter((f) => f.id.startsWith(startId) || (startId === 'FP-UI-091' && /^FP-UI-1/.test(f.id) || (startId === 'FP-UI-091' && f.id >= 'FP-UI-091')))
  return slice
}

const md = fs.readFileSync(INV, 'utf8')
const fps = parseFps(md)
if (fps.length !== 268) {
  console.error('FP count', fps.length, 'expected 268')
}

const api = fps.filter((f) => f.module === 'API')
const uiShell = fps.filter((f) => f.module === 'UI' && Number(f.id.slice(-3)) <= 90)
const uiComp = fps.filter((f) => f.module === 'UI' && Number(f.id.slice(-3)) > 90)
const db = fps.filter((f) => f.module === 'DB')

function fileFor(list, name, title) {
  let n = 1
  const body = list.map((fp) => {
    const block = renderCase(fp, Number(fp.id.slice(-3)))
    return block
  }).join('\n---\n\n')
  const text = `# ${title}\n\n> 结论一律 NOT_RUN。无证据不得记 PASS。\n\n` + body
  fs.writeFileSync(path.join(OUT, name), text)
  return name
}

const files = [
  fileFor(api, 'TC-API.md', '页面装修器 · 接口用例 TC-API-001~078'),
  fileFor(uiShell, 'TC-UI-shell.md', '页面装修器 · 壳层用例 TC-UI-001~090'),
  fileFor(uiComp, 'TC-UI-components.md', '页面装修器 · 组件/数据源/跳转用例 TC-UI-091~185'),
  fileFor(db, 'TC-DB.md', '页面装修器 · 数据库用例 TC-DB-001~005'),
]

fs.writeFileSync(path.join(OUT, 'dimension-matrix.md'), renderMatrix(fps))
files.unshift('dimension-matrix.md')
files.unshift('README.md')
fs.writeFileSync(path.join(OUT, 'README.md'), renderIndex(fps, files))

const ledgerRows = fps.map((f) => `| ${f.id} | NOT_RUN |  |  |  | 用例已设计，未执行 |`).join('\n')
fs.writeFileSync(path.join(OUT, '_ledger-rows.md'), ledgerRows)

console.log(JSON.stringify({ fps: fps.length, api: api.length, uiShell: uiShell.length, uiComp: uiComp.length, db: db.length }))
