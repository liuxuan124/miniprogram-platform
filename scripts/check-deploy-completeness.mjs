/**
 * 部署完整性核查：逐项确认「本对话做的事」是否真的在线上。
 *
 * 🔴 为什么不能只看 index.html 的 md5：
 *   md5 一致只说明**我构建时的那份产物**部署成功了，
 *   不代表「当前工作区的最新状态」已上线 —— 07:09 之后又有人改了源码，
 *   那部分不在我的产物里。
 *
 * 所以这里分两类证据：
 *   ① **字节级**：md5 比对，证明「我部署的那份」确实在线上；
 *   ② **功能级**：用中文特征串在线上 chunk 里搜，
 *      证明「某个具体修复/功能」已上线或**尚未上线**。
 *
 * ⚠️ admin-static 是解压式部署，历史 chunk 会堆积上百个，
 *    所以「搜到某特征」不能单独证明浏览器加载的是它 ——
 *    必须配合 ① 用index.html 引用的入口 chunk 交叉验证。
 */
import { execSync } from 'node:child_process'

const SSH = 'zfculture'
const REMOTE = '/opt/miniprogram-platform/admin-static'
const LOCAL = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/admin/dist-final-6'

const sh = (cmd) => execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

/** ① 字节级：index.html 与三个关键 chunk 的 md5 */
console.log('='.repeat(72))
console.log('一、字节级：本地产物 vs 线上')
console.log('='.repeat(72))

const files = ['index.html']
// 挑本对话改过的页面所对应的 chunk（文件名在两次部署间稳定）
for (const pat of ['^templates-.*\\.js$', '^appearance-hub-.*\\.js$', '^pages-hub-.*\\.js$', '^releases-hub-.*\\.js$']) {
  const out = sh(`ls ${LOCAL}/assets/ | grep -E '${pat}' | head -1`)
  if (out) files.push(`assets/${out}`)
}

let byteOk = 0
for (const f of files) {
  const local = sh(`md5 -q ${LOCAL}/${f}`)
  const remote = sh(`ssh ${SSH} 'md5sum ${REMOTE}/${f} | cut -d" " -f1'`)
  const ok = local === remote
  if (ok) byteOk += 1
  console.log(`${ok ? '✅' : '❌'} ${f.padEnd(42)} ${ok ? 'md5 一致' : `不一致 ${local} ≠ ${remote}`}`)
}

/** ② 功能级：线上有没有某个中文特征串 */
console.log('')
console.log('='.repeat(72))
console.log('二、功能级：线上 chunk 是否含本对话的每个关键改动')
console.log('='.repeat(72))

const FEATURES = [
  ['四入口·搭建工作台', '搭建工作台'],
  ['四入口·模板管理', '模板管理'],
  ['四入口·版本管理', '版本管理'],
  ['工作台·预览检查环节', '内容体检'],
  ['工作台·发布前检查', '发布前检查'],
  ['修复:页面读取失败提示', '页面清单读取失败'],
  ['修复:版本号语义兼容 c.0.33', 'c.0.33'],
  ['修复:内置页绑定不误报', '当前列表中不可见'],
  ['修复:脏状态用指纹基线', 'tabsFingerprint'],
  ['修复:列表响应统一解包', 'toRecords'],
  ['修复:真机预览二维码', '扫码预览草稿'],
]

for (const [label, needle] of FEATURES) {
  // shell 里中文要用 -F 固定串匹配，避免正则误伤
  const hit = sh(`ssh ${SSH} 'cd ${REMOTE}/assets && grep -lF "${needle}" *.js 2>/dev/null | head -1'`)
  console.log(`${hit ? '✅' : '❌'} ${label.padEnd(28)} ${hit ? `命中 ${hit}` : '线上未找到'}`)
}

console.log('')
console.log('='.repeat(72))
console.log('三、结论')
console.log('='.repeat(72))
console.log(`字节一致: ${byteOk}/${files.length}`)