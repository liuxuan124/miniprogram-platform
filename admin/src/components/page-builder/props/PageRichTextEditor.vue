<template>
  <div class="page-rich-text-editor">
    <div class="toolbar" @mousedown.prevent>
      <button type="button" class="tb" title="加粗" :class="{ on: isActive('bold') }" @click="cmd('bold')"><b>B</b></button>
      <button type="button" class="tb" title="斜体" :class="{ on: isActive('italic') }" @click="cmd('italic')"><i>I</i></button>
      <button type="button" class="tb" title="下划线" :class="{ on: isActive('underline') }" @click="cmd('underline')"><u>U</u></button>
      <button type="button" class="tb" title="删除线" :class="{ on: isActive('strikeThrough') }" @click="cmd('strikeThrough')"><s>S</s></button>
      <span class="sep" />
      <button type="button" class="tb" title="标题1" @click="cmd('formatBlock', 'h1')">H1</button>
      <button type="button" class="tb" title="标题2" @click="cmd('formatBlock', 'h2')">H2</button>
      <button type="button" class="tb" title="标题3" @click="cmd('formatBlock', 'h3')">H3</button>
      <button type="button" class="tb" title="引用" :class="{ on: isBlockquoteActive }" @click="cmd('formatBlock', 'blockquote')">引用</button>
      <button type="button" class="tb" title="正文" @click="cmd('formatBlock', 'p')">P</button>
      <span class="sep" />
      <label class="tb color-btn" title="文字颜色">
        A
        <input type="color" :value="foreColor" @input="onForeColor" />
      </label>
      <button type="button" class="tb eyedrop" title="吸管取文字色" :disabled="!eyedropperSupported || picking" @click="pickForeColor">
        吸管
      </button>
      <label class="tb color-btn bg" title="背景色">
        ▮
        <input type="color" :value="hiliteColor" @input="onHiliteColor" />
      </label>
      <button type="button" class="tb eyedrop" title="吸管取背景色" :disabled="!eyedropperSupported || picking" @click="pickHiliteColor">
        吸管
      </button>
      <select class="tb-select" title="字号" :value="fontSize" @change="onFontSize">
        <option value="">字号</option>
        <option v-for="s in fontSizes" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <span class="sep" />
      <button type="button" class="tb" title="左对齐" :class="{ on: isActive('justifyLeft') }" @click="cmd('justifyLeft')">左</button>
      <button type="button" class="tb" title="居中" :class="{ on: isActive('justifyCenter') }" @click="cmd('justifyCenter')">中</button>
      <button type="button" class="tb" title="右对齐" :class="{ on: isActive('justifyRight') }" @click="cmd('justifyRight')">右</button>
      <span class="sep" />
      <button type="button" class="tb" title="增加缩进" @click="cmd('indent')">缩进+</button>
      <button type="button" class="tb" title="减少缩进" @click="cmd('outdent')">缩进-</button>
      <span class="sep" />
      <button type="button" class="tb" title="无序列表" :class="{ on: isActive('insertUnorderedList') }" @click="toggleList('ul')">• 列表</button>
      <button type="button" class="tb" title="有序列表" :class="{ on: isActive('insertOrderedList') }" @click="toggleList('ol')">1. 列表</button>
      <span class="sep" />
      <button type="button" class="tb" title="插入链接" @click="openLink">链接</button>
      <label class="tb" title="插入图片">
        图片
        <input type="file" accept="image/*" hidden @change="onPickImage" />
      </label>
      <button type="button" class="tb" title="从素材库插入图片" @click="assetPickerVisible = true">素材库</button>
      <AssetPickerDialog v-model="assetPickerVisible" @select="insertAssetImage" />
      <span class="sep" />
      <button type="button" class="tb" title="插入分割线" @click="insertHr">分割线</button>
      <button type="button" class="tb card-point" title="插入要点卡片（绿线提示框）" @click="insertCard('point')">要点卡</button>
      <button type="button" class="tb card-warn" title="插入警示卡片（橙线提示框）" @click="insertCard('warn')">警示卡</button>
      <span class="sep" />
      <button type="button" class="tb smart-btn" title="把「01·」「一、」「第一节」等开头短行转成标题，并合并连续空段（Ctrl+Z 可撤销）" @click="smartFormat">智能排版</button>
      <span class="sep" />
      <button type="button" class="tb" title="清除格式" @click="cmd('removeFormat')">清除</button>
    </div>

    <div
      ref="editorRef"
      class="editor-body"
      :class="{ 'is-seamless': seamlessImages }"
      contenteditable="true"
      data-placeholder="请输入富文本内容…"
      @input="onInput"
      @keydown="onKeyDown"
      @keyup="refreshState"
      @mouseup="refreshState"
      @paste="onPaste"
      @click="onEditorClick"
      @focus="refreshState"
    />

    <div class="editor-foot">
      <span class="editor-foot__count">{{ wordCount }} 字</span>
    </div>

    <el-dialog v-model="linkVisible" title="插入链接" width="380px" append-to-body destroy-on-close>
      <el-form label-width="72px" size="small">
        <el-form-item label="文字">
          <el-input v-model="linkText" placeholder="显示文字" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="linkUrl" placeholder="https://" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="linkVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmLink">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="imgSizeVisible" title="设置图片大小" width="400px" append-to-body destroy-on-close>
      <el-form label-width="72px" size="small">
        <el-form-item label="预设">
          <el-radio-group v-model="imgWidthPreset" @change="onImgPresetChange">
            <el-radio-button value="100%">100%</el-radio-button>
            <el-radio-button value="75%">75%</el-radio-button>
            <el-radio-button value="50%">50%</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="宽度">
          <div class="img-size-row">
            <el-input-number
              v-model="imgWidthValue"
              :min="1"
              :max="imgWidthUnit === '%' ? 100 : 2000"
              :disabled="imgWidthPreset !== 'custom'"
              controls-position="right"
            />
            <el-select
              v-model="imgWidthUnit"
              style="width: 88px"
              :disabled="imgWidthPreset !== 'custom'"
            >
              <el-option label="%" value="%" />
              <el-option label="px" value="px" />
            </el-select>
          </div>
        </el-form-item>
        <div class="img-size-tip">高度自适应，宽度不超过编辑区/页面。</div>
      </el-form>
      <template #footer>
        <el-button size="small" @click="imgSizeVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmImgSize">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useImageUpload } from '../composables/useImageUpload'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'

const props = defineProps<{
  modelValue?: string
  /** 详情拼图：图片无缝衔接（无间距、无圆角） */
  seamlessImages?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLDivElement>()
const { uploadImage } = useImageUpload()

const IMG_SEAMLESS_STYLE =
  'display:block;width:100%;max-width:100%;height:auto;margin:0;padding:0;border:0;border-radius:0;vertical-align:top;outline:none;'

function imgInlineStyle(extraWidth?: string) {
  if (props.seamlessImages) {
    const width = extraWidth || '100%'
    return `display:block;width:${width};max-width:100%;height:auto;margin:0;padding:0;border:0;border-radius:0;vertical-align:top;`
  }
  const width = extraWidth || '100%'
  return `width:${width};height:auto;max-width:100%;`
}

const foreColor = ref('#333333')
const hiliteColor = ref('#ffff00')

/** 正文字数（去除标签与空白后的字符数） */
const wordCount = computed(() => {
  const text = String(props.modelValue || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s/g, '')
  return text.length
})

/** 提示卡片预设：内联样式随正文 HTML 下发，小程序端 html-blocks 渲染 blockquote 时直接生效 */
const CARD_PRESETS: Record<'point' | 'warn', { style: string; label: string; labelColor: string }> = {
  point: {
    style:
      'margin:1em 0;padding:12px 14px;background:#f7faf8;border-left:4px solid #2f9350;border-radius:0 10px 10px 0;color:#4a5568;',
    label: '要点',
    labelColor: '#2f7a42',
  },
  warn: {
    style:
      'margin:1em 0;padding:12px 14px;background:#fffaef;border-left:4px solid #d97706;border-radius:0 10px 10px 0;color:#7a5b16;',
    label: '警示',
    labelColor: '#b45309',
  },
}

function insertHr() {
  focusEditor()
  try {
    document.execCommand('insertHorizontalRule')
  } catch {
    /* ignore */
  }
  emitHtml()
  refreshState()
}

function insertCard(type: 'point' | 'warn') {
  focusEditor()
  const preset = CARD_PRESETS[type]
  const html =
    `<blockquote style="${preset.style}">` +
    `<strong style="color:${preset.labelColor};">${preset.label}｜</strong>请输入内容` +
    `</blockquote><p><br></p>`
  try {
    document.execCommand('insertHTML', false, html)
  } catch {
    /* ignore */
  }
  emitHtml()
  refreshState()
}

/**
 * 标题识别模式（独立成段、≤30字时转 H2）
 * - 01· / 01. / 01、 / 01) / 01 大促
 * - 一、 / 一. / 第一章 / 第一节
 * - Part 1 / 1.（含半角点）
 */
const TITLE_PATTERNS = [
  /^\d{1,2}\s*[·.、)]/, // 01· / 01. / 01、 / 01)
  /^\d{1,2}\s+\S/, // 01 大促（数字 + 空格 + 内容）
  /^[一二三四五六七八九十百]+\s*[、.]/, // 一、 / 一.
  /^第\s*[一二三四五六七八九十百\d]+\s*[章节条部分篇]/, // 第一章 / 第1节
  /^Part\s+\d+/i, // Part 1
]

function isLikelyTitle(text: string): boolean {
  const t = text.replace(/\u200b/g, '').trim()
  if (!t || t.length > 30) return false
  return TITLE_PATTERNS.some((re) => re.test(t))
}

/**
 * 一键智能排版：
 *   1. 把「01·」「一、」「第一章」等开头短行（≤30字、独立成段）转成 H2
 *   2. 连续空段合并为单个，首尾空段删除
 *
 * 不动图片段、引用块、列表、表格、已有标题，避免误伤。
 * 依赖浏览器原生 undo（Ctrl+Z）撤销。
 */
function smartFormat() {
  const el = editorRef.value
  if (!el) return

  // 浏览器 undo 单步：先记录一个 history 节点
  focusEditor()
  try {
    document.execCommand('selectAll')
    document.execCommand('insertHTML', false, el.innerHTML)
  } catch {
    /* 忽略 undo 锚点失败，不影响主流程 */
  }

  let titleCount = 0
  let emptyMergedCount = 0

  // 1. 遍历顶层块级，识别标题 + 标记空段
  const blocks = Array.from(el.children) as HTMLElement[]
  for (const block of blocks) {
    const tag = block.tagName
    const text = (block.textContent || '').replace(/\u200b/g, '').trim()

    // 空段（P/DIV 无文字无图片）→ 标记待合并
    const isEmpty =
      !text &&
      (tag === 'P' || tag === 'DIV') &&
      !block.querySelector('img, ul, ol, table, blockquote, hr')

    if (isEmpty) {
      block.setAttribute('data-smart-empty', '1')
      continue
    }

    // 标题识别：只作用 P/DIV，且段内无图/列表/表格/引用
    if (tag === 'P' || tag === 'DIV') {
      if (block.querySelector('img, ul, ol, table, blockquote, hr')) continue
      if (isLikelyTitle(text)) {
        const h2 = document.createElement('h2')
        h2.innerHTML = block.innerHTML
        block.replaceWith(h2)
        titleCount++
      }
    }
  }

  // 2. 连续空段合并为单个；首尾空段删除
  let lastWasEmpty = false
  for (const block of [...Array.from(el.children)] as HTMLElement[]) {
    if (block.hasAttribute('data-smart-empty')) {
      if (lastWasEmpty) {
        block.remove()
        emptyMergedCount++
      } else {
        block.removeAttribute('data-smart-empty')
        lastWasEmpty = true
      }
    } else {
      lastWasEmpty = false
    }
  }

  // 删开头空段
  let first = el.firstElementChild as HTMLElement | null
  while (
    first &&
    first.tagName === 'P' &&
    !(first.textContent || '').trim() &&
    !first.querySelector('img')
  ) {
    first.remove()
    emptyMergedCount++
    first = el.firstElementChild as HTMLElement | null
  }
  // 删结尾空段
  let last = el.lastElementChild as HTMLElement | null
  while (
    last &&
    (last.tagName === 'P' || last.tagName === 'DIV') &&
    !(last.textContent || '').trim() &&
    !last.querySelector('img')
  ) {
    last.remove()
    emptyMergedCount++
    last = el.lastElementChild as HTMLElement | null
  }

  emitHtml()

  if (titleCount > 0 || emptyMergedCount > 0) {
    ElMessage.success(
      `已识别 ${titleCount} 个标题、清理 ${emptyMergedCount} 个空段（Ctrl+Z 可撤销）`,
    )
  } else {
    ElMessage.info('未发现需要整理的内容（标题识别：01· / 一、 /第一章 等）')
  }
}
const fontSize = ref('')
const activeMap = ref<Record<string, boolean>>({})
const isBlockquoteActive = computed(() => {
  try {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || !editorRef.value) return false
    let node: Node | null = sel.anchorNode
    while (node && node !== editorRef.value) {
      if (node instanceof HTMLElement && node.tagName === 'BLOCKQUOTE') return true
      node = node.parentNode
    }
  } catch {
    /* ignore */
  }
  return false
})
const picking = ref(false)
const eyedropperSupported = computed(() => typeof window !== 'undefined' && 'EyeDropper' in window)

const linkVisible = ref(false)
const linkText = ref('')
const linkUrl = ref('')
const savedRange = ref<Range | null>(null)

const imgSizeVisible = ref(false)
const assetPickerVisible = ref(false)
const imgWidthPreset = ref<'100%' | '75%' | '50%' | 'custom'>('100%')
const imgWidthValue = ref(100)
const imgWidthUnit = ref<'%' | 'px'>('%')
const activeImgEl = ref<HTMLImageElement | null>(null)

const fontSizes = [
  { value: '1', label: '12' },
  { value: '2', label: '13' },
  { value: '3', label: '16' },
  { value: '4', label: '18' },
  { value: '5', label: '24' },
  { value: '6', label: '32' },
  { value: '7', label: '48' },
]

let syncing = false

function setHtml(html: string) {
  if (!editorRef.value) return
  const next = html || ''
  if (editorRef.value.innerHTML === next) return
  syncing = true
  editorRef.value.innerHTML = next
  syncing = false
}

function emitHtml() {
  if (!editorRef.value || syncing) return
  const clone = editorRef.value.cloneNode(true) as HTMLElement
  clone.querySelectorAll('img.is-selected').forEach((el) => el.classList.remove('is-selected'))
  clone.querySelectorAll('[class=""]').forEach((el) => el.removeAttribute('class'))
  emit('update:modelValue', clone.innerHTML)
}

function onInput() {
  emitHtml()
  refreshState()
}

/** 找到包住图片的块级节点（无缝拼图常用 p/div） */
function findImageBlock(node: Node | null): HTMLElement | null {
  let cur: Node | null = node
  while (cur && cur !== editorRef.value) {
    if (cur instanceof HTMLElement) {
      if (cur.tagName === 'IMG') {
        const parent = cur.parentElement
        if (parent && parent !== editorRef.value && (parent.tagName === 'P' || parent.tagName === 'DIV')) {
          return parent
        }
        return cur
      }
      const onlyImg =
        cur.children.length === 1 &&
        cur.children[0].tagName === 'IMG' &&
        !(cur.textContent || '').replace(/\u200b/g, '').trim()
      if (onlyImg && (cur.tagName === 'P' || cur.tagName === 'DIV')) return cur
    }
    cur = cur.parentNode
  }
  return null
}

function placeCaretIn(el: HTMLElement) {
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(el)
  range.collapse(true)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/** 在图片块后插入可编辑空行，并把光标移进去 */
function insertParagraphAfterImageBlock(block: HTMLElement) {
  const p = document.createElement('p')
  p.innerHTML = '<br>'
  block.after(p)
  placeCaretIn(p)
  emitHtml()
  refreshState()
}

/** 根据当前选区判断是否在图片旁 / 图片块内 */
function resolveImageBlockFromSelection(range: Range): HTMLElement | null {
  const fromStart = findImageBlock(range.startContainer)
  if (fromStart) return fromStart

  // 折叠光标：offset 落在某子节点之后，常见于点在图片右侧
  if (range.collapsed && range.startContainer.nodeType === Node.ELEMENT_NODE) {
    const parent = range.startContainer as HTMLElement
    const prev = parent.childNodes[range.startOffset - 1] as Node | undefined
    if (prev) {
      const block = findImageBlock(prev)
      if (block) return block
    }
  }
  return null
}

/**
 * 光标在图片旁/图片块内按回车时，默认 contenteditable 常无法换到图片下方
 *（尤其 seamless 把段落 font-size/line-height 置 0）。
 */
function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || !editorRef.value) return
  if (!editorRef.value.contains(sel.anchorNode)) return

  const range = sel.getRangeAt(0)
  const block = resolveImageBlockFromSelection(range)
  if (!block) return

  e.preventDefault()
  insertParagraphAfterImageBlock(block)
}

function focusEditor() {
  editorRef.value?.focus()
}

function cmd(command: string, value?: string) {
  focusEditor()
  try {
    document.execCommand(command, false, value)
  } catch {
    /* ignore */
  }
  emitHtml()
  refreshState()
}

function isActive(command: string) {
  return !!activeMap.value[command]
}

function refreshState() {
  const keys = [
    'bold',
    'italic',
    'underline',
    'strikeThrough',
    'justifyLeft',
    'justifyCenter',
    'justifyRight',
    'insertUnorderedList',
    'insertOrderedList',
  ]
  const next: Record<string, boolean> = {}
  for (const key of keys) {
    try {
      next[key] = document.queryCommandState(key)
    } catch {
      next[key] = false
    }
  }
  activeMap.value = next
}

function ensureEditorHasBlock() {
  const el = editorRef.value
  if (!el) return
  const text = (el.innerText || '').replace(/\u200B/g, '').trim()
  if (!text && !el.querySelector('li,p,div,h1,h2,h3')) {
    el.innerHTML = '<p><br></p>'
    const range = document.createRange()
    const sel = window.getSelection()
    const p = el.querySelector('p')
    if (p && sel) {
      range.selectNodeContents(p)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }
}

function toggleList(type: 'ul' | 'ol') {
  focusEditor()
  ensureEditorHasBlock()
  const command = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList'
  try {
    document.execCommand(command, false)
  } catch {
    /* ignore */
  }
  // 部分浏览器会生成无 list-style 的结构，补一层可见标记
  nextTick(() => {
    editorRef.value?.querySelectorAll('ul').forEach((node) => {
      const ul = node as HTMLElement
      if (!ul.style.listStyleType) ul.style.listStyleType = 'disc'
      if (!ul.style.paddingLeft) ul.style.paddingLeft = '1.6em'
    })
    editorRef.value?.querySelectorAll('ol').forEach((node) => {
      const ol = node as HTMLElement
      if (!ol.style.listStyleType) ol.style.listStyleType = 'decimal'
      if (!ol.style.paddingLeft) ol.style.paddingLeft = '1.6em'
    })
    editorRef.value?.querySelectorAll('li').forEach((node) => {
      ;(node as HTMLElement).style.display = 'list-item'
    })
    emitHtml()
    refreshState()
  })
}

function onForeColor(e: Event) {
  const color = (e.target as HTMLInputElement).value
  foreColor.value = color
  cmd('foreColor', color)
}

function onHiliteColor(e: Event) {
  const color = (e.target as HTMLInputElement).value
  hiliteColor.value = color
  // 兼容不同浏览器
  focusEditor()
  if (!document.execCommand('hiliteColor', false, color)) {
    document.execCommand('backColor', false, color)
  }
  emitHtml()
  refreshState()
}

async function pickColorFromScreen(): Promise<string | null> {
  if (!eyedropperSupported.value || picking.value) return null
  const EyeDropperCtor = (window as any).EyeDropper
  if (!EyeDropperCtor) return null
  picking.value = true
  try {
    const result = await new EyeDropperCtor().open()
    return String(result?.sRGBHex || '').trim() || null
  } catch (err: any) {
    if (err?.name !== 'AbortError') ElMessage.warning('取色失败，请重试')
    return null
  } finally {
    picking.value = false
  }
}

async function pickForeColor() {
  const color = await pickColorFromScreen()
  if (!color) return
  foreColor.value = color
  cmd('foreColor', color)
}

async function pickHiliteColor() {
  const color = await pickColorFromScreen()
  if (!color) return
  hiliteColor.value = color
  focusEditor()
  if (!document.execCommand('hiliteColor', false, color)) {
    document.execCommand('backColor', false, color)
  }
  emitHtml()
  refreshState()
}

function onFontSize(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  fontSize.value = value
  if (!value) return
  cmd('fontSize', value)
}

function saveSelection() {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    savedRange.value = sel.getRangeAt(0).cloneRange()
  }
}

function restoreSelection() {
  if (!savedRange.value) return
  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(savedRange.value)
}

function openLink() {
  focusEditor()
  saveSelection()
  const sel = window.getSelection()
  linkText.value = sel?.toString() || ''
  linkUrl.value = 'https://'
  linkVisible.value = true
}

function confirmLink() {
  const url = linkUrl.value.trim()
  if (!url) {
    ElMessage.warning('请输入链接地址')
    return
  }
  focusEditor()
  restoreSelection()
  const text = linkText.value.trim() || url
  const html = `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
  document.execCommand('insertHTML', false, html)
  linkVisible.value = false
  emitHtml()
}

function clearImgSelection() {
  editorRef.value?.querySelectorAll('img.is-selected').forEach((el) => el.classList.remove('is-selected'))
}

function parseImgWidth(img: HTMLImageElement) {
  const styleW = (img.style.width || '').trim()
  const attrW = (img.getAttribute('width') || '').trim()
  const raw = styleW || (attrW ? `${attrW}px` : '')
  if (!raw) {
    imgWidthPreset.value = '100%'
    imgWidthValue.value = 100
    imgWidthUnit.value = '%'
    return
  }
  const m = raw.match(/^([\d.]+)\s*(%|px)?$/i)
  if (!m) {
    imgWidthPreset.value = 'custom'
    imgWidthValue.value = 100
    imgWidthUnit.value = '%'
    return
  }
  const num = Math.round(Number(m[1]))
  const unit = (m[2] || 'px').toLowerCase() as '%' | 'px'
  imgWidthUnit.value = unit
  imgWidthValue.value = num
  if (unit === '%' && (num === 100 || num === 75 || num === 50)) {
    imgWidthPreset.value = `${num}%` as '100%' | '75%' | '50%'
  } else {
    imgWidthPreset.value = 'custom'
  }
}

function openImgSize(img: HTMLImageElement) {
  clearImgSelection()
  activeImgEl.value = img
  img.classList.add('is-selected')
  parseImgWidth(img)
  imgSizeVisible.value = true
}

function onImgPresetChange(val: string | number | boolean | undefined) {
  const preset = String(val)
  if (preset === 'custom') return
  const num = Number(preset.replace('%', ''))
  imgWidthValue.value = num
  imgWidthUnit.value = '%'
}

function confirmImgSize() {
  const img = activeImgEl.value
  if (!img || !editorRef.value?.contains(img)) {
    imgSizeVisible.value = false
    return
  }
  let width = ''
  if (imgWidthPreset.value === 'custom') {
    const n = Number(imgWidthValue.value)
    if (!n || n <= 0) {
      ElMessage.warning('请输入有效宽度')
      return
    }
    width = `${n}${imgWidthUnit.value}`
  } else {
    width = imgWidthPreset.value
  }
  img.style.width = width
  img.style.height = 'auto'
  img.style.maxWidth = '100%'
  if (props.seamlessImages) {
    img.style.display = 'block'
    img.style.margin = '0'
    img.style.padding = '0'
    img.style.border = '0'
    img.style.borderRadius = '0'
    img.style.verticalAlign = 'top'
    // 包住图片的段落去掉空隙，避免拼图缝
    const parent = img.parentElement
    if (parent && (parent.tagName === 'P' || parent.tagName === 'DIV')) {
      parent.style.margin = '0'
      parent.style.padding = '0'
      parent.style.lineHeight = '0'
      parent.style.fontSize = '0'
    }
  }
  img.removeAttribute('width')
  img.removeAttribute('height')
  imgSizeVisible.value = false
  clearImgSelection()
  activeImgEl.value = null
  emitHtml()
}

function onEditorClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (target?.tagName === 'IMG') {
    e.preventDefault()
    openImgSize(target as HTMLImageElement)
    return
  }
  clearImgSelection()
}

async function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  focusEditor()
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => {
      const html = props.seamlessImages
        ? `<p style="margin:0;padding:0;line-height:0;font-size:0;"><img src="${url}" style="${imgInlineStyle('100%')}" alt="" /></p><p><br></p>`
        : `<img src="${url}" style="${imgInlineStyle('100%')}" alt="" /><p><br></p>`
      document.execCommand('insertHTML', false, html)
      emitHtml()
      nextTick(() => {
        const imgs = editorRef.value?.querySelectorAll('img') || []
        const last = imgs[imgs.length - 1] as HTMLImageElement | undefined
        if (last && last.getAttribute('src') === url) openImgSize(last)
      })
    },
  })
}

/** 从素材库插入已有图片：素材本身已入库，这里只引用其 URL，不重复上传 */
function insertAssetImage(url: string) {
  if (!url) return
  focusEditor()
  const html = props.seamlessImages
    ? `<p style="margin:0;padding:0;line-height:0;font-size:0;"><img src="${url}" style="${imgInlineStyle('100%')}" alt="" /></p><p><br></p>`
    : `<img src="${url}" style="${imgInlineStyle('100%')}" alt="" /><p><br></p>`
  document.execCommand('insertHTML', false, html)
  emitHtml()
}

function onPaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || [])
  const imageItem = items.find((it) => it.type.startsWith('image/'))
  if (imageItem) {
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return
    void uploadImage(file, {
      maxSizeMB: 5,
      onSuccess: (url: string) => {
        const html = props.seamlessImages
          ? `<p style="margin:0;padding:0;line-height:0;font-size:0;"><img src="${url}" style="${imgInlineStyle('100%')}" alt="" /></p><p><br></p>`
          : `<img src="${url}" style="${imgInlineStyle('100%')}" alt="" /><p><br></p>`
        document.execCommand('insertHTML', false, html)
        emitHtml()
      },
    })
    return
  }

  // 优先粘贴纯文本，避免带入复杂样式；若有 HTML 则做轻度清理
  const html = e.clipboardData?.getData('text/html')
  const text = e.clipboardData?.getData('text/plain') || ''
  e.preventDefault()
  if (html) {
    const cleaned = sanitizePasteHtml(html)
    document.execCommand('insertHTML', false, cleaned)
  } else {
    document.execCommand('insertText', false, text)
  }
  emitHtml()
}

function sanitizePasteHtml(html: string) {
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('script,style,iframe,object,embed').forEach((el) => el.remove())
  div.querySelectorAll('*').forEach((el) => {
    const node = el as HTMLElement
    const keep = [
      'color',
      'background',
      'background-color',
      'font-size',
      'text-align',
      'font-weight',
      'font-style',
      'text-decoration',
      'line-height',
      'margin',
      'padding',
      'border-left',
      'border-radius',
    ]
    const imgKeep = ['width', 'height', 'max-width', 'max-height', 'object-fit']
    const listKeep = ['list-style', 'list-style-type', 'list-style-position', 'padding-left', 'margin', 'display']
    const style = node.getAttribute('style') || ''
    if (style) {
      const tag = node.tagName
      const allow =
        tag === 'IMG'
          ? [...keep, ...imgKeep]
          : tag === 'UL' || tag === 'OL' || tag === 'LI'
            ? [...keep, ...listKeep]
            : keep
      const kept = style
        .split(';')
        .map((s) => s.trim())
        .filter((s) => allow.some((k) => s.toLowerCase().startsWith(`${k}:`)))
        .join('; ')
      if (kept) node.setAttribute('style', kept)
      else node.removeAttribute('style')
    }
    ;['class', 'id', 'onclick', 'onerror'].forEach((attr) => node.removeAttribute(attr))
  })
  return div.innerHTML
}

watch(imgSizeVisible, (visible) => {
  if (!visible) {
    clearImgSelection()
    activeImgEl.value = null
  }
})

watch(
  () => props.modelValue,
  (val) => {
    if (!editorRef.value) return
    // 外部更新且当前未聚焦时同步，避免打断输入
    if (document.activeElement !== editorRef.value) {
      setHtml(val || '')
    }
  },
)

onMounted(() => {
  nextTick(() => setHtml(props.modelValue || ''))
})

onBeforeUnmount(() => {
  emitHtml()
})
</script>

<style lang="scss" scoped>
.page-rich-text-editor {
  width: 100%;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px;
  background: #f7f9fc;
  border-bottom: 1px solid #e3e8f0;
}

.tb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  color: #334155;
  font-size: 12px;
  line-height: 1;
  background: #fff;
  border: 1px solid #dde3ec;
  border-radius: 5px;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: var(--color-primary);
    border-color: #bcd0ff;
  }

  &.on {
    color: var(--color-primary);
    background: #eaf1ff;
    border-color: #9bb8ff;
  }

  &.eyedrop {
    min-width: auto;
    padding: 0 5px;
    font-size: 11px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  input[type='file'],
  input[type='color'] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }
}

.color-btn {
  position: relative;
  overflow: hidden;

  input[type='color'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    pointer-events: auto;
    cursor: pointer;
  }

  &.bg {
    color: #f59e0b;
  }
}

.tb-select {
  height: 26px;
  padding: 0 4px;
  color: #334155;
  font-size: 12px;
  background: #fff;
  border: 1px solid #dde3ec;
  border-radius: 5px;
}

.sep {
  width: 1px;
  height: 18px;
  margin: 4px 2px;
  background: #dbe2ec;
}

.editor-body {
  min-height: 240px;
  max-height: 620px;
  padding: 14px 16px;
  overflow-y: auto;
  color: #172033;
  font-size: 14px;
  line-height: 1.75;
  outline: none;
  word-break: break-word;

  /* 编辑态始终留左右边距，方便点选换行；无缝仅作用于图片上下拼接 */
  &.is-seamless {
    padding: 12px 16px 28px;
  }

  &:empty::before {
    content: attr(data-placeholder);
    color: #94a3b8;
  }

  :deep(h1) {
    margin: 0.7em 0 0.4em;
    font-size: 21px;
    font-weight: 800;
    color: #0f1219;
    line-height: 1.4;
  }

  /* 标题对齐长文阅读主题：金线左标，与「加粗正文」肉眼可分 */
  :deep(h2) {
    margin: 1.2em 0 0.45em;
    padding-left: 10px;
    border-left: 3px solid #c8973a;
    font-size: 18px;
    font-weight: 700;
    color: #0f1219;
    line-height: 1.4;
  }

  :deep(h3) {
    margin: 1em 0 0.4em;
    padding-left: 10px;
    border-left: 3px solid #e0c79a;
    font-size: 16px;
    font-weight: 700;
    color: #0f1219;
    line-height: 1.4;
  }

  /* 引用对齐预览主题：绿线 + 浅绿底 + 右圆角 */
  :deep(blockquote) {
    margin: 0.6em 0;
    padding: 10px 14px;
    color: #4a5568;
    border-left: 4px solid #2f9350;
    border-radius: 0 10px 10px 0;
    background: #f7faf8;
  }

  :deep(p) {
    margin: 0.5em 0;
  }

  :deep(hr) {
    margin: 1.2em 0;
    border: 0;
    border-top: 1px solid #e3e8f0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0.35em 0;
    padding-left: 1.6em !important;
    list-style-position: outside;
  }

  :deep(ul) {
    list-style-type: disc !important;
  }

  :deep(ol) {
    list-style-type: decimal !important;
  }

  :deep(li) {
    display: list-item !important;
    margin: 0.15em 0;
  }

  :deep(a) {
    color: var(--color-primary);
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    cursor: pointer;
    outline: 2px solid transparent;
    outline-offset: 2px;

    &.is-selected {
      outline-color: var(--color-primary);
    }
  }

  &.is-seamless {
    /* 图与图仍上下无缝；文字段保留可点选高度 */
    :deep(p:has(> img:only-child)),
    :deep(div:has(> img:only-child)) {
      margin: 0 !important;
      padding: 0 !important;
      line-height: 0 !important;
      font-size: 0 !important;
    }

    :deep(p:not(:has(> img:only-child))) {
      margin: 0.45em 0;
      min-height: 1.4em;
    }

    :deep(img) {
      display: block;
      width: 100%;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      vertical-align: top;
      outline-offset: 2px;
    }
  }
}

.img-size-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.editor-foot {
  display: flex;
  justify-content: flex-end;
  padding: 5px 12px;
  background: #fafbfd;
  border-top: 1px solid #f0f3f8;
}

.editor-foot__count {
  color: #94a3b8;
  font-size: 11px;
  line-height: 1;
}

.tb.card-point {
  color: #2f7a42;
  border-color: #cfe5d5;
}

.tb.card-warn {
  color: #b45309;
  border-color: #f0dcb8;
}

.tb.smart-btn {
  color: var(--color-primary);
  border-color: var(--color-primary);
  border-style: dashed;
  font-weight: 600;
}

.img-size-tip {
  margin: -4px 0 0 70px;
  color: #8a94a6;
  font-size: 12px;
  line-height: 1.4;
}
</style>
