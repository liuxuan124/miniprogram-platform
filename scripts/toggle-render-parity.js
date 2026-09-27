#!/usr/bin/env node
// 渲染一致性测试能力开关（QA 10.3-1：测试页与黄金数据不进正式包）
//   on  — 注册 pages/render-parity 并放开黄金数据打包忽略（跑 render-parity-full.sh 前）
//   off — 移出 app.json + 加入打包忽略（正式上传前/默认状态，幂等）
// render-parity-full.sh 已在入口自动 on、EXIT trap 自动 off，正常不需要手工执行。
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const APP_JSON = path.join(ROOT, 'miniapp/app.json')
const PROJ_CONF = path.join(ROOT, 'miniapp/project.config.json')
const PAGE = 'pages/render-parity/render-parity'
const IGNORES = [
  { value: 'pages/render-parity', type: 'folder' },
  { value: 'data/golden-batches', type: 'folder' },
  { value: 'data/golden-batches-all.json', type: 'file' },
  { value: 'data/golden-parity-dsl.json', type: 'file' },
]

const mode = process.argv[2]
if (!['on', 'off'].includes(mode)) {
  console.error('usage: node scripts/toggle-render-parity.js on|off')
  process.exit(1)
}

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'))
const conf = JSON.parse(fs.readFileSync(PROJ_CONF, 'utf8'))
conf.packOptions = conf.packOptions || {}
const ignore = Array.isArray(conf.packOptions.ignore) ? conf.packOptions.ignore : []

const pages = app.pages.filter((p) => p !== PAGE)
const rest = ignore.filter((i) => !IGNORES.some((g) => g.value === i.value && g.type === i.type))

if (mode === 'on') {
  pages.push(PAGE)
} else {
  rest.push(...IGNORES)
}

app.pages = pages
conf.packOptions.ignore = rest
fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2) + '\n')
fs.writeFileSync(PROJ_CONF, JSON.stringify(conf, null, 2) + '\n')
console.log(`render-parity ${mode}: app.json pages=${pages.length}, packOptions.ignore=${rest.length}`)
