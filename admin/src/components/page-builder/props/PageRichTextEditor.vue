<template>
  <div class="page-rich-text-editor" :class="{ 'is-fullscreen': fullscreen, 'is-source': sourceMode }">
    <!-- 顶部快捷动作栏 -->
    <div class="rt-actions">
      <button type="button" class="rt-act" :class="{ on: fullscreen }" title="全屏专注排版（左编辑右手机预览）" @click="openFullscreen">
        🖥 {{ fullscreen ? '退出全屏' : '全屏排版' }}
      </button>
      <button type="button" class="rt-act" :class="{ on: sourceMode }" title="切换 HTML 源码模式" @click="toggleSource">
        &lt;/&gt; 源码
      </button>
      <button type="button" class="rt-act" title="清除全部样式（纯文本化）" @click="doStrip">🧹 清除样式</button>
      <button type="button" class="rt-act rt-act--size" :title="`编辑区高度 ${editorHeight}px`" @click="toggleHeight">
        ⇕ {{ editorHeight }}px
      </button>
    </div>

    <!-- 源码模式 -->
    <textarea
      v-if="sourceMode"
      ref="sourceRef"
      class="rt-source"
      :style="{ height: `${editorHeight}px` }"
      spellcheck="false"
      placeholder="在这里直接编辑 HTML 源码"
      :value="props.modelValue || ''"
      @input="onSourceInput"
    />

    <!-- 可视化编辑 -->
    <template v-else>
      <RichTextToolbar
        :fore-color="foreColor"
        :hilite-color="hiliteColor"
        :blockquote-active="isBlockquoteActive"
        :active-map="activeMap"
        @command="cmd"
        @block="onBlock"
        @toggle-list="toggleList"
        @hilite="onHilite"
        @link="openLink"
        @asset="assetPickerVisible = true"
        @hr="insertHr"
        @callout="insertCallout"
        @ai="onAi"
        @strip="doStrip"
        @file="(_kind, e) => onPickImage(e)"
      />

      <div
        ref="editorRef"
        class="editor-body"
        :class="{ 'is-seamless': seamlessImages }"
        :style="{ minHeight: `${editorHeight}px` }"
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
        <span class="editor-foot__hint">粘贴外部内容会自动清洗固定宽度与字体</span>
        <span class="editor-foot__count">{{ wordCount }} 字</span>
      </div>
    </template>

    <AssetPickerDialog v-model="assetPickerVisible" @select="insertAssetImage" />

    <!-- 插入链接 -->
    <el-dialog v-model="linkVisible" title="插入链接" width="380px" append-to-body destroy-on-close>
      <el-form label-width="72px" size="small">
        <el-form-item label="文字"><el-input v-model="linkText" placeholder="显示文字" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="linkUrl" placeholder="https://" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="linkVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmLink">确定</el-button>
      </template>
    </el-dialog>

    <!-- 图片尺寸与对齐 -->
    <el-dialog v-model="imgSizeVisible" title="设置图片" width="400px" append-to-body destroy-on-close>
      <el-form label-width="72px" size="small">
        <el-form-item label="宽度">
          <el-radio-group v-model="imgWidthPreset" @change="onImgPresetChange">
            <el-radio-button value="100%">100%</el-radio-button>
            <el-radio-button value="75%">75%</el-radio-button>
            <el-radio-button value="50%">50%</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="对齐">
          <el-radio-group v-model="imgAlign">
            <el-radio-button value="left">居左</el-radio-button>
            <el-radio-button value="center">居中</el-radio-button>
            <el-radio-button value="full">铺满</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="imgWidthPreset === 'custom'" label="自定义">
          <div class="img-size-row">
            <el-input-number v-model="imgWidthValue" :min="1" :max="imgWidthUnit === '%' ? 100 : 2000" :controls="false" />
            <el-select v-model="imgWidthUnit" style="width: 80px">
              <el-option label="%" value="%" />
              <el-option label="px" value="px" />
            </el-select>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="imgSizeVisible = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmImgSize">确定</el-button>
      </template>
    </el-dialog>

    <!-- 全屏专注排版：左编辑右 1:1 手机预览 -->
    <el-dialog
      v-model="fullscreen"
      title="全屏专注排版"
      width="92%"
      top="4vh"
      append-to-body
      destroy-on-close
      class="rt-fullscreen-dialog"
      @closed="onFullscreenClosed"
    >
      <div class="rt-fullscreen">
        <div class="rt-fullscreen__left">
          <RichTextToolbar
            :fore-color="foreColor"
            :hilite-color="hiliteColor"
            :blockquote-active="isBlockquoteActive"
            :active-map="activeMap"
            @command="cmd"
            @block="onBlock"
            @toggle-list="toggleList"
            @hilite="onHilite"
            @link="openLink"
            @asset="assetPickerVisible = true"
            @hr="insertHr"
            @callout="insertCallout"
            @ai="onAi"
            @strip="doStrip"
            @file="(_kind, e) => onPickImage(e)"
          />
          <div
            ref="fsEditorRef"
            class="editor-body rt-fullscreen__editor"
            contenteditable="true"
            data-placeholder="在此专注排版…"
            @input="onFsInput"
            @keyup="refreshState"
            @mouseup="refreshState"
            @paste="onFsPaste"
          />
        </div>
        <div class="rt-fullscreen__right">
          <p class="rt-fullscreen__label">手机实时预览（1:1）</p>
          <div class="rt-phone">
            <div class="rt-phone__notch"></div>
            <div class="rt-phone__screen rich-text-content" v-html="props.modelValue || ''"></div>
            <div class="rt-phone__capsule">···</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import RichTextToolbar from '../richText/RichTextToolbar.vue'
import { useImageUpload } from '../composables/useImageUpload'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import { sanitizeRichHtml, stripRichHtml } from '../richText/richTextSanitizer'
import {
  CALLOUT_PRESETS,
  EDITOR_HEIGHT,
  richTextPlain,
  type CalloutStyle,
  type RichImgAlign,
} from '../richText/richTextSchema'

const props = defineProps<{
  modelValue?: string
  /** 详情拼图：图片无缝衔接 */
  seamlessImages?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editorRef = ref<HTMLDivElement>()
const fsEditorRef = ref<HTMLDivElement>()
const sourceRef = ref<HTMLTextAreaElement>()
const { uploadImage } = useImageUpload()

const foreColor = ref('#333333')
const hiliteColor = ref('#ffff00')
const activeMap = ref<Record<string, boolean>>({})
const fullscreen = ref(false)
const sourceMode = ref(false)
const editorHeight = ref<number>(EDITOR_HEIGHT.fallback)

const wordCount = computed(() => richTextPlain(String(props.modelValue || '')).length)

function imgInlineStyle(extraWidth?: string) {
  const width = extraWidth || '100%'
  // 🔴 防爆规则直接进内联 —— 端上 rich-text 无法用 WXSS 覆盖，只能入库时带
  const guard = 'max-width:100%!important;height:auto!important;'
  if (props.seamlessImages) {
    return `display:block;width:${width};${guard}margin:0;padding:0;border:0;border-radius:0;vertical-align:top;`
  }
  return `width:${width};${guard}`
}

/* ---------------- HTML 同步 ---------------- */
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
  emit('update:modelValue', clone.innerHTML)
}

function emitFsHtml() {
  if (!fsEditorRef.value) return
  emit('update:modelValue', fsEditorRef.value.innerHTML)
}

function onInput() {
  emitHtml()
  refreshState()
}

function onFsInput() {
  emitFsHtml()
  refreshState()
}

/* ---------------- 源码模式 ---------------- */
function toggleSource() {
  sourceMode.value = !sourceMode.value
  if (sourceMode.value) {
    ElMessage.info('源码模式下可直接改 HTML；语法错误会导致内容不渲染')
  }
}

function onSourceInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

/* ---------------- 高度切换 ---------------- */
function toggleHeight() {
  editorHeight.value = editorHeight.value >= EDITOR_HEIGHT.max ? EDITOR_HEIGHT.min : Math.min(editorHeight.value + 80, EDITOR_HEIGHT.max)
}

/* ---------------- 全屏 ---------------- */
function openFullscreen() {
  fullscreen.value = true
  nextTick(() => {
    if (fsEditorRef.value) fsEditorRef.value.innerHTML = props.modelValue || ''
  })
}

function onFullscreenClosed() {
  // 关闭时把全屏里改的内容带回主编辑器
  if (fsEditorRef.value) {
    emit('update:modelValue', fsEditorRef.value.innerHTML)
  }
  nextTick(() => setHtml(props.modelValue || ''))
  refreshState()
}

/* ---------------- 命令 ---------------- */
function focusEditor() {
  if (fullscreen.value) fsEditorRef.value?.focus()
  else editorRef.value?.focus()
}

function cmd(command: string, value?: string) {
  focusEditor()
  try {
    document.execCommand(command, false, value)
  } catch {
    /* 浏览器不支持该命令时静默 */
  }
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
  refreshState()
}

function onBlock(tag: string) {
  focusEditor()
  try {
    document.execCommand('formatBlock', false, tag)
  } catch {
    /* ignore */
  }
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
  refreshState()
}

const isBlockquoteActive = computed(() => {
  const host = fullscreen.value ? fsEditorRef.value : editorRef.value
  try {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || !host) return false
    let node: Node | null = sel.anchorNode
    while (node && node !== host) {
      if (node instanceof HTMLElement && node.tagName === 'BLOCKQUOTE') return true
      node = node.parentNode
    }
  } catch {
    /* ignore */
  }
  return false
})

function refreshState() {
  const keys = [
    'bold', 'italic', 'underline', 'strikeThrough',
    'justifyLeft', 'justifyCenter', 'justifyRight',
    'insertUnorderedList', 'insertOrderedList',
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

function isActive(command: string) {
  return !!activeMap.value[command]
}

/* ---------------- 清除样式 ---------------- */
function doStrip() {
  const host = fullscreen.value ? fsEditorRef.value : editorRef.value
  if (!host) return
  const stripped = stripRichHtml(host.innerHTML)
  host.innerHTML = stripped
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
  ElMessage.success('已清除全部样式，仅保留结构、链接与图片')
}

/* ---------------- AI 动作 ---------------- */
const AI_LABEL: Record<string, string> = {
  format: '一键排版',
  polish: '润色',
  shorten: '精简摘要',
  expand: '扩写',
  typo: '修复错别字',
}

function onAi(action: string) {
  // 🔴 AI 能力收归工具栏动作：不在输入框内放悬浮图标（原先与右侧边缘重叠）
  const label = AI_LABEL[action] || 'AI'
  if (action === 'format') {
    focusEditor()
    const html = hostHtml()
    const cleaned = sanitizeRichHtml(html)
    applyHtml(cleaned)
    ElMessage.success(`${label}：已过滤外部脏样式并统一图片防爆规则`)
    return
  }
  ElMessage.info(`「${label}」需在内容页的 AI 助手中完成（可带上当前富文本内容）`)
}

function hostHtml(): string {
  return (fullscreen.value ? fsEditorRef.value : editorRef.value)?.innerHTML || ''
}

function applyHtml(html: string) {
  const host = fullscreen.value ? fsEditorRef.value : editorRef.value
  if (host) host.innerHTML = html
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
}

/* ---------------- 列表 ---------------- */
function toggleList(type: 'ul' | 'ol') {
  focusEditor()
  const host = fullscreen.value ? fsEditorRef.value : editorRef.value
  if (!host) return
  const command = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList'
  try {
    document.execCommand(command, false)
  } catch {
    /* ignore */
  }
  // 部分浏览器生成无 list-style 的结构，补一层可见标记（否则小程序端列表没有圆点）
  nextTick(() => {
    host.querySelectorAll('ul').forEach((node) => {
      const el = node as HTMLElement
      if (!el.style.listStyleType) el.style.listStyleType = 'disc'
      if (!el.style.paddingLeft) el.style.paddingLeft = '1.6em'
    })
    host.querySelectorAll('ol').forEach((node) => {
      const el = node as HTMLElement
      if (!el.style.listStyleType) el.style.listStyleType = 'decimal'
      if (!el.style.paddingLeft) el.style.paddingLeft = '1.6em'
    })
    host.querySelectorAll('li').forEach((node) => {
      ;(node as HTMLElement).style.display = 'list-item'
    })
    if (fullscreen.value) emitFsHtml()
    else emitHtml()
  })
  refreshState()
}

/* ---------------- 高亮 ---------------- */
function onHilite(color: string) {
  hiliteColor.value = color
  focusEditor()
  if (!document.execCommand('hiliteColor', false, color)) {
    document.execCommand('backColor', false, color)
  }
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
  refreshState()
}

/* ---------------- 链接 ---------------- */
const linkVisible = ref(false)
const linkText = ref('')
const linkUrl = ref('')

function openLink() {
  focusEditor()
  linkText.value = window.getSelection()?.toString() || ''
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
  const text = linkText.value.trim() || url
  document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener">${text}</a>`)
  linkVisible.value = false
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
}

/* ---------------- 图片 ---------------- */
const imgSizeVisible = ref(false)
const assetPickerVisible = ref(false)
const imgWidthPreset = ref<'100%' | '75%' | '50%' | 'custom'>('100%')
const imgWidthValue = ref(100)
const imgWidthUnit = ref<'%' | 'px'>('%')
const imgAlign = ref<RichImgAlign>('full')
const activeImgEl = ref<HTMLImageElement | null>(null)

function clearImgSelection() {
  const host = fullscreen.value ? fsEditorRef.value : editorRef.value
  host?.querySelectorAll('img.is-selected').forEach((el) => el.classList.remove('is-selected'))
}

function openImgSize(img: HTMLImageElement) {
  clearImgSelection()
  activeImgEl.value = img
  img.classList.add('is-selected')
  const raw = (img.style.width || '').trim()
  const m = raw.match(/^([\d.]+)\s*(%|px)?$/i)
  if (m) {
    const num = Math.round(Number(m[1]))
    const unit = (m[2] || 'px').toLowerCase() as '%' | 'px'
    imgWidthUnit.value = unit
    imgWidthValue.value = num
    imgWidthPreset.value = unit === '%' && (num === 100 || num === 75 || num === 50) ? (`${num}%` as '100%' | '75%' | '50%') : 'custom'
  } else {
    imgWidthPreset.value = '100%'
    imgWidthValue.value = 100
    imgWidthUnit.value = '%'
  }
  imgAlign.value = img.style.margin?.includes('auto') ? 'center' : (img.style.display === 'block' ? 'full' : 'left')
  imgSizeVisible.value = true
}

function onImgPresetChange(val: string | number | boolean | undefined) {
  const preset = String(val)
  if (preset === 'custom') return
  imgWidthValue.value = Number(preset.replace('%', ''))
  imgWidthUnit.value = '%'
}

function confirmImgSize() {
  const img = activeImgEl.value
  if (!img) {
    imgSizeVisible.value = false
    return
  }
  let width = '100%'
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
  if (imgAlign.value === 'center') {
    img.style.display = 'block'
    img.style.margin = '0 auto'
  } else if (imgAlign.value === 'left') {
    img.style.display = 'block'
    img.style.margin = '0'
  } else {
    img.style.display = 'block'
    img.style.width = '100%'
    img.style.margin = '0'
  }
  img.removeAttribute('width')
  img.removeAttribute('height')
  imgSizeVisible.value = false
  clearImgSelection()
  activeImgEl.value = null
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
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
      insertImageHtml(url)
    },
  })
}

function insertImageHtml(url: string) {
  const html = props.seamlessImages
    ? `<p style="margin:0;padding:0;line-height:0;font-size:0;"><img src="${url}" style="${imgInlineStyle('100%')}" alt="" /></p><p><br></p>`
    : `<img src="${url}" style="${imgInlineStyle('100%')}" alt="" /><p><br></p>`
  document.execCommand('insertHTML', false, html)
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
}

/** 从素材库插入：素材已入库，只引用 URL 不重复上传 */
function insertAssetImage(url: string) {
  if (!url) return
  focusEditor()
  insertImageHtml(url)
}

/* ---------------- 插入块级元素 ---------------- */
function insertHr() {
  focusEditor()
  try {
    document.execCommand('insertHorizontalRule')
  } catch {
    /* ignore */
  }
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
  refreshState()
}

function insertCallout(style: string) {
  const preset = CALLOUT_PRESETS[style as CalloutStyle]
  if (!preset) return
  focusEditor()
  const html =
    `<blockquote style="${preset.style}">` +
    `<strong style="color:${preset.labelColor};">${preset.icon} ${preset.label}｜</strong>请输入内容` +
    `</blockquote><p><br></p>`
  try {
    document.execCommand('insertHTML', false, html)
  } catch {
    /* ignore */
  }
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
  refreshState()
}

/* ---------------- 粘贴清洗 ---------------- */
function onPaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || [])
  const imageItem = items.find((it) => it.type.startsWith('image/'))
  if (imageItem) {
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return
    void uploadImage(file, {
      maxSizeMB: 5,
      onSuccess: (url: string) => insertImageHtml(url),
    })
    return
  }

  const html = e.clipboardData?.getData('text/html')
  const text = e.clipboardData?.getData('text/plain') || ''
  e.preventDefault()
  if (html) {
    // 🔴 公众号/飞书/Word 复制来的内容会带 width:677px 之类写死宽度，
    //    进小程序会横向撑破 —— 这里统一清洗
    document.execCommand('insertHTML', false, sanitizeRichHtml(html))
  } else {
    document.execCommand('insertText', false, text)
  }
  if (fullscreen.value) emitFsHtml()
  else emitHtml()
}

function onFsPaste(e: ClipboardEvent) {
  const html = e.clipboardData?.getData('text/html')
  if (!html) return
  e.preventDefault()
  document.execCommand('insertHTML', false, sanitizeRichHtml(html))
  emitFsHtml()
}

/* ---------------- 回车换行 ---------------- */
function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
  const sel = window.getSelection()
  const host = editorRef.value
  if (!sel || !sel.rangeCount || !host) return
  if (!host.contains(sel.anchorNode)) return
  // 图片块内回车：默认 contenteditable 常换不到图下方，手动补一段
  const node = sel.anchorNode
  const img = findImage(node, host)
  if (!img) return
  e.preventDefault()
  const p = document.createElement('p')
  p.innerHTML = '<br>'
  const block = img.closest('p,div') as HTMLElement | null
  ;(block || img).after(p)
  const range = document.createRange()
  range.selectNodeContents(p)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
  emitHtml()
}

function findImage(node: Node | null, host: HTMLElement): HTMLImageElement | null {
  let cur: Node | null = node
  while (cur && cur !== host) {
    if (cur instanceof HTMLElement) {
      if (cur.tagName === 'IMG') return cur as HTMLImageElement
      const inner = cur.querySelector('img')
      if (inner) return inner
    }
    cur = cur.parentNode
  }
  return null
}

/* ---------------- 生命周期 ---------------- */
watch(imgSizeVisible, (v) => {
  if (!v) {
    clearImgSelection()
    activeImgEl.value = null
  }
})

watch(
  () => props.modelValue,
  (val) => {
    const host = editorRef.value
    if (!host) return
    const editing = fullscreen.value
      ? document.activeElement === fsEditorRef.value
      : document.activeElement === host
    if (!editing && !sourceMode.value) setHtml(val || '')
  },
)

onMounted(() => {
  nextTick(() => setHtml(props.modelValue || ''))
})

onBeforeUnmount(() => {
  if (sourceMode.value) return
  const host = editorRef.value
  if (host && document.activeElement === host) emitHtml()
})
</script>

<style lang="scss" scoped>
.page-rich-text-editor {
  width: 100%;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
}

/* ---------- 顶部快捷动作栏 ---------- */
.rt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  padding: 6px 7px;
  background: #fbfcfe;
  border-bottom: 1px solid #eef1f6;
}

.rt-act {
  height: 24px;
  padding: 0 8px;
  color: #475569;
  font-size: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 5px;

  &:hover {
    color: var(--color-primary);
    border-color: #bcd0ff;
  }

  &.on {
    color: #fff;
    background: var(--color-primary);
    border-color: transparent;
  }

  &--size {
    margin-left: auto;
    color: #94a3b8;
  }
}

/* ---------- 源码模式 ---------- */
.rt-source {
  display: block;
  width: 100%;
  padding: 10px 12px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #d1d5db;
  background: #1f2430;
  border: 0;
  outline: none;
  resize: vertical;
}

/* ---------- 编辑区 ---------- */
.editor-body {
  max-height: 620px;
  padding: 14px 16px;
  overflow-y: auto;
  color: #172033;
  font-size: 14px;
  line-height: 1.75;
  outline: none;
  word-break: break-word;

  &.is-seamless {
    padding: 12px 16px 28px;
  }

  &:empty::before {
    color: #94a3b8;
    content: attr(data-placeholder);
  }

  :deep(h1) {
    margin: 0.7em 0 0.4em;
    font-size: 21px;
    font-weight: 800;
    line-height: 1.4;
  }

  :deep(h2) {
    margin: 1.2em 0 0.45em;
    padding-left: 10px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.4;
    border-left: 3px solid #c8973a;
  }

  :deep(h3) {
    margin: 1em 0 0.4em;
    padding-left: 10px;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.4;
    border-left: 3px solid #e0c79a;
  }

  :deep(blockquote) {
    margin: 0.6em 0;
    padding: 10px 14px;
    color: #4a5568;
    background: #f7faf8;
    border-left: 4px solid #2f9350;
    border-radius: 0 10px 10px 0;
  }

  :deep(p) { margin: 0.5em 0; }
  :deep(hr) { margin: 1.2em 0; border: 0; border-top: 1px solid #e3e8f0; }

  :deep(ul),
  :deep(ol) {
    margin: 0.35em 0;
    padding-left: 1.6em !important;
    list-style-position: outside;
  }

  :deep(ul) { list-style-type: disc !important; }
  :deep(ol) { list-style-type: decimal !important; }
  :deep(li) { display: list-item !important; margin: 0.15em 0; }
  :deep(a) { color: var(--color-primary); }

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
    :deep(img) {
      display: block;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      vertical-align: top;
    }
  }
}

.editor-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 12px;
  background: #fafbfd;
  border-top: 1px solid #f0f3f8;
}

.editor-foot__hint {
  font-size: 11px;
  color: #a1a8b3;
}

.editor-foot__count {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1;
}

.img-size-row {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

/* ---------- 全屏双栏 ---------- */
.rt-fullscreen {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
}

.rt-fullscreen__left {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rt-fullscreen__editor {
  min-height: 60vh;
  max-height: 66vh;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
}

.rt-fullscreen__right {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rt-fullscreen__label {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.rt-phone {
  position: relative;
  width: 300px;
  height: 620px;
  overflow: hidden;
  background: #fff;
  border: 8px solid #1f2430;
  border-radius: 28px;
}

.rt-phone__notch {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 2;
  width: 110px;
  height: 20px;
  background: #1f2430;
  border-radius: 0 0 12px 12px;
  transform: translateX(-50%);
}

.rt-phone__screen {
  height: 100%;
  padding: 26px 12px 12px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.75;
}

.rt-phone__capsule {
  position: absolute;
  top: 26px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 26px;
  font-size: 13px;
  color: #b6bcc6;
  background: rgb(0 0 0 / 5%);
  border-radius: 999px;
}
</style>

<style lang="scss">
/* 🔴 移动端重置（非 scoped）：作用于 v-html 注入的内容与全屏手机预览 */
.rich-text-content {
  word-break: break-word;
  overflow-wrap: anywhere;

  img {
    max-width: 100% !important;
    height: auto !important;
  }

  /* 表格横向滚动，不撑破页面 */
  table {
    display: block;
    max-width: 100% !important;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* 代码块自动换行 */
  pre,
  code {
    white-space: pre-wrap;
    word-break: break-all;
  }

  p {
    margin: 0 0 0.8em;
  }
}
</style>
