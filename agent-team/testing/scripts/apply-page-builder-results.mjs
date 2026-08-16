#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

const root = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统'
const api = JSON.parse(readFileSync(`${root}/agent-team/testing/evidence/BATCH-QA-010/api-db-results.json`, 'utf8'))
const ui = JSON.parse(readFileSync(`${root}/agent-team/testing/evidence/BATCH-QA-011/ui-results.json`, 'utf8'))

const map = new Map()
for (const r of [...api.results, ...ui.results]) map.set(r.id, r)

// Honest recategorization with evidence already in dumps
function set(id, status, note, bugs) {
  const cur = map.get(id) || { id }
  map.set(id, { ...cur, status, note, bugs: bugs || cur.bugs || '' })
}

set('FP-API-016', 'FAIL', 'name 129 返回 HTTP 500/code 500，不是参数校验', 'BUG-API-004')
set('FP-API-026', 'PASS', 'PUT 返回 name=QA接口页-改名；mysql 客户端中文乱码不影响', '')
set('FP-API-044', 'FAIL', '冲突文案在，但 HTTP 404 code=300409，契约要 409', 'BUG-API-009')
set('FP-API-071', 'FAIL', '路径不存在 HTTP 200 + code 404，契约要 HTTP 404', 'BUG-API-010')
set('FP-API-072', 'FAIL', '仅草稿未发布 HTTP 200 + code 404，契约要 HTTP 404', 'BUG-API-010')
set('FP-UI-025', 'PASS', '列表「更多」为 details/summary，删除入口存在', '')

const bugOf = {
  'FP-API-003': 'BUG-API-001', 'FP-API-004': 'BUG-API-001', 'FP-API-005': 'BUG-API-001',
  'FP-API-009': 'BUG-API-002', 'FP-API-010': 'BUG-API-002', 'FP-API-019': 'BUG-API-002',
  'FP-API-025': 'BUG-API-002', 'FP-API-029': 'BUG-API-002', 'FP-API-035': 'BUG-API-002',
  'FP-API-042': 'BUG-API-002', 'FP-API-048': 'BUG-API-002', 'FP-API-054': 'BUG-API-002',
  'FP-API-060': 'BUG-API-002', 'FP-API-064': 'BUG-API-002', 'FP-API-069': 'BUG-API-002',
  'FP-API-011': 'BUG-API-003', 'FP-API-013': 'BUG-API-003', 'FP-API-014': 'BUG-API-003',
  'FP-API-015': 'BUG-API-003', 'FP-API-018': 'BUG-API-003', 'FP-API-024': 'BUG-API-003',
  'FP-API-017': 'BUG-API-005',
  'FP-API-028': 'BUG-API-003',
  'FP-API-059': 'BUG-API-006',
  'FP-API-075': 'BUG-API-007',
  'FP-API-077': 'BUG-API-008',
  'FP-DB-002': 'BUG-DB-001',
  'FP-DB-005': 'BUG-DB-002',
  'FP-UI-014': 'BUG-UI-009',
  'FP-UI-019': 'BUG-UI-010', 'FP-UI-054': 'BUG-UI-010',
  'FP-UI-047': 'BUG-UI-011', 'FP-UI-048': 'BUG-UI-011',
  'FP-UI-073': 'BUG-UI-012', 'FP-UI-074': 'BUG-UI-012', 'FP-UI-075': 'BUG-UI-012', 'FP-UI-076': 'BUG-UI-012', 'FP-UI-079': 'BUG-UI-012',
  'FP-UI-108': 'BUG-UI-013',
  'FP-UI-173': 'BUG-UI-014', 'FP-UI-174': 'BUG-UI-014', 'FP-UI-175': 'BUG-UI-014', 'FP-UI-176': 'BUG-UI-014',
}

for (const [id, bug] of Object.entries(bugOf)) {
  const r = map.get(id)
  if (r) r.bugs = bug
}

function patchCases(file, prefix) {
  let md = readFileSync(file, 'utf8')
  md = md.replace(/# (TC-(?:API|UI|DB)-\d+)\n\n([\s\S]*?)- 结论：`NOT_RUN`/g, (m, tc) => {
    const num = tc.split('-').pop()
    const mod = tc.startsWith('TC-API') ? 'API' : tc.startsWith('TC-DB') ? 'DB' : 'UI'
    const fp = `FP-${mod}-${num}`
    const r = map.get(fp)
    if (!r) return m
    const ev = mod === 'UI'
      ? 'agent-team/testing/evidence/BATCH-QA-011/'
      : 'agent-team/testing/evidence/BATCH-QA-010/api-db-results.json'
    return m.replace('- 实际结果：\n- 证据：\n- 结论：`NOT_RUN`',
      `- 实际结果：${r.note || r.status}\n- 证据：${ev}\n- 结论：\`${r.status}\``)
  })
  writeFileSync(file, md)
}

patchCases(`${root}/agent-team/testing/cases/page-builder/TC-API.md`, 'API')
patchCases(`${root}/agent-team/testing/cases/page-builder/TC-UI-shell.md`, 'UI')
patchCases(`${root}/agent-team/testing/cases/page-builder/TC-UI-components.md`, 'UI')
patchCases(`${root}/agent-team/testing/cases/page-builder/TC-DB.md`, 'DB')

let ledger = readFileSync(`${root}/agent-team/testing/status-ledger.md`, 'utf8')
const counts = { PASS: 0, FAIL: 0, PARTIAL: 0, BLOCKED: 0, NOT_RUN: 0 }
for (const [id, r] of map) {
  if (!/^FP-(API|UI|DB)-/.test(id)) continue
  counts[r.status] = (counts[r.status] || 0) + 1
  const batch = id.startsWith('FP-UI') ? 'BATCH-QA-011' : 'BATCH-QA-010'
  const row = `| ${id} | ${r.status} | 2026-08-13 18:10 | ${r.bugs || ''} | ${batch} | ${String(r.note || '').replace(/\|/g, '/')} |`
  ledger = ledger.replace(new RegExp(`\\| ${id} \\| NOT_RUN \\|  \\|  \\|  \\| 用例已设计，未执行 \\|`), row)
}
const executed = counts.PASS + counts.FAIL + counts.PARTIAL + counts.BLOCKED
ledger = ledger.replace(
  /- 已执行：0\/268（全部 `NOT_RUN`）\n- 通过：0\/268/,
  `- 已执行：${executed}/268\n- 通过：${counts.PASS}/268\n- FAIL：${counts.FAIL}；PARTIAL：${counts.PARTIAL}；BLOCKED：${counts.BLOCKED}`,
)
writeFileSync(`${root}/agent-team/testing/status-ledger.md`, ledger)

const all = [...map.values()].filter((r) => /^FP-(API|UI|DB)-/.test(r.id))
writeFileSync(`${root}/agent-team/testing/evidence/BATCH-QA-010/final-verdicts.json`, JSON.stringify({
  counts,
  executed,
  passRate: `${counts.PASS}/268`,
  execRate: `${executed}/268`,
  rows: all.sort((a, b) => a.id.localeCompare(b.id)),
}, null, 2))
console.log(counts, 'executed', executed)
