/**
 * 交付校验：对 4 个 schema.ts 跑 TS 严格类型检查
 * 开启 strict + noUnusedLocals + noUnusedParameters，确保没有 unused import
 */
const ts = require('typescript')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../src/components/page-builder/layout')

const files = []
for (const dir of fs.readdirSync(ROOT)) {
  const f = path.join(ROOT, dir, 'schema.ts')
  if (fs.existsSync(f)) files.push(f)
}

const program = ts.createProgram(files, {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noEmit: true,
  skipLibCheck: true,
  isolatedModules: true,
  baseUrl: path.resolve(__dirname, '..'),
  paths: { '@/*': ['src/*'] },
})

const diags = ts.getPreEmitDiagnostics(program)
const fileSet = new Set(files.map((f) => path.resolve(f)))
const ours = diags.filter((d) => d.file && fileSet.has(path.resolve(d.file.fileName)))

console.log('检查文件数：' + files.length)
if (ours.length === 0) {
  console.log('schema.ts 类型检查：0 error（strict + noUnusedLocals + noUnusedParameters）')
} else {
  ours.forEach((d) => {
    const pos = d.file.getLineAndCharacterOfPosition(d.start)
    const msg = ts.flattenDiagnosticMessageText(d.messageText, ' ')
    console.log('ERROR ' + path.basename(d.file.fileName) + ':' + (pos.line + 1) + ' TS' + d.code + ' ' + msg)
  })
}
process.exit(ours.length === 0 ? 0 : 1)
