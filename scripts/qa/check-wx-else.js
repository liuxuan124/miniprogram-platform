/**
 * check-wx-else.js —— 校验 wxml 里每个 wx:else / wx:elif 的前一个兄弟节点带 wx:if / wx:elif。
 *
 * 为什么需要它：微信小程序编译期错误 `Bad attr wx:else: wx:if not found`
 * 只有 `cli upload` 能抓，node --check 与标签配对检查都发现不了。
 * 本项目 2026-10-05 踩过一次（planet-list.wxml:67），当时只靠 CLI 才发现。
 *
 * 判据：对每个带 wx:else / wx:elif 的开标签，看它**所在父层级里上一个已闭合的兄弟**
 *      是否带 wx:if / wx:elif（顶层则看文档级）。
 *
 * 用法：node scripts/qa/check-wx-else.js <file.wxml> [more...]
 * 退出码：有问题的文件 > 0 时为 1，可直接进 CI。
 */
'use strict';

const fs = require('fs');

const VOID = new Set(['br', 'hr', 'img', 'input', 'image', 'icon', 'meta',
  'link', 'source', 'track', 'area', 'base', 'col', 'embed', 'param', 'wbr']);

const TAG = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/gs;

/** wx:if/wx:elif 带值（wx:if="{{x}}"）；wx:else 是**无值属性**，必须单独按裸属性匹配 */
const hasAttr = (attrs, name) => {
  const re = new RegExp('(^|\\s)' + name + '(\\s|=|/|>|$)', 'm');
  return re.test(attrs);
};
const isCond = (attrs) => hasAttr(attrs, 'wx:if') || hasAttr(attrs, 'wx:elif');
const isElse = (attrs) => hasAttr(attrs, 'wx:else') || hasAttr(attrs, 'wx:elif');

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

function check(file) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const problems = [];
  const lineAt = (i) => src.slice(0, i).split('\n').length;

  // ── 第一遍：标签配对 ──
  const pairStack = [];
  for (const m of src.matchAll(TAG)) {
    const [, close, tag, , selfClose] = m;
    if (VOID.has(tag) || selfClose === '/') continue;
    if (close !== '/') {
      pairStack.push({ tag, at: m.index });
    } else if (!pairStack.length) {
      problems.push('多余闭合 </' + tag + '> @' + m.index);
    } else if (pairStack[pairStack.length - 1].tag !== tag) {
      problems.push('不匹配：期望 </' + pairStack[pairStack.length - 1].tag +
        '>（开于 ' + pairStack[pairStack.length - 1].at + '）得到 </' + tag +
        '>  第 ' + lineAt(m.index) + ' 行');
      for (let i = pairStack.length - 1; i >= 0; i--) {
        if (pairStack[i].tag === tag) { pairStack.splice(i); break; }
      }
    } else {
      pairStack.pop();
    }
  }
  if (pairStack.length) {
    problems.push('未闭合: ' + pairStack.map((s) => s.tag).join(','));
  }

  // ── 第二遍：wx:else / wx:elif 前驱校验 ──
  // frames[i].lastClosed = 该父层级里上一个已闭合的兄弟是否带条件
  // ⚠️ 自闭合标签（<video ... />）也算「已闭合的兄弟」，且通常无条件，
  //    必须更新 lastClosed=false，否则会把合法的 wx:else 误报。
  const frames = [{ lastClosed: false }];
  const settle = (own) => {
    const parent = frames[frames.length - 1];
    if (parent) parent.lastClosed = !!own;
  };
  for (const m of src.matchAll(TAG)) {
    const [, close, tag, attrs, selfClose] = m;
    // ⚠️ VOID 标签（<image/> <input/> …）若带 wx:if，也是合法前驱，必须 settle。
    //    只 continue 会让紧随其后的 wx:else 被误报。
    if (VOID.has(tag)) {
      if (!close && !selfClose) continue;
      settle(isCond(attrs));
      continue;
    }
    if (selfClose === '/') {
      settle(isCond(attrs));
      continue;
    }
    if (close !== '/') {
      const parent = frames[frames.length - 1];
      if (isElse(attrs) && !parent.lastClosed) {
        problems.push('<' + tag + '> 的 wx:else/wx:elif 前一个兄弟无 wx:if/elif  第 ' +
          lineAt(m.index) + ' 行');
      }
      frames.push({ own: isCond(attrs), tag });
    } else {
      const top = frames.pop();
      if (top) settle(top.own);
    }
  }

  return problems;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('用法: node check-wx-else.js <file.wxml> [...]');
  process.exit(2);
}

// 第三方库（wxml 压成一行 +大量 <template>/<wxs>，本检查器不支持）→ 跳过
const THIRD_PARTY = /(components|miniprogram_npm)\/mp-html\//;

let bad = 0;
let skipped = 0;
for (const f of files) {
  if (THIRD_PARTY.test(f)) {
    skipped++;
    continue;
  }
  const probs = check(f);
  if (probs.length) {
    bad++;
    console.log('❌ ' + f);
    probs.slice(0, 6).forEach((p) => console.log('    ' + p));
    if (probs.length > 6) console.log('    ... 另有 ' + (probs.length - 6) + ' 处');
  } else {
    console.log('✓ ' + f);
  }
}
console.log('');
console.log('检查 ' + (files.length - skipped) + ' 个文件（跳过第三方库 ' + skipped +
  ' 个），' + bad + ' 个有问题');
process.exit(bad ? 1 : 0);