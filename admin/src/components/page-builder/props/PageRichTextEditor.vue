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
      <button type="button" class="tb" title="正文" @click="cmd('formatBlock', 'p')">P</button>
      <span class="sep" />
      <label class="tb color-btn" title="文字颜色">
        A
        <input type="color" :value="foreColor" @input="onForeColor" />
      </label>
      <label class="tb color-btn bg" title="背景色">
        ▮
        <input type="color" :value="hiliteColor" @input="onHiliteColor" />
      </label>
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
      <button type="button" class="tb" title="无序列表" @click="cmd('insertUnorderedList')">• 列表</button>
      <button type="button" class="tb" title="有序列表" @click="cmd('insertOrderedList')">1. 列表</button>
      <span class="sep" />
      <button type="button" class="tb" title="插入链接" @click="openLink">链接</button>
      <label class="tb" title="插入图片">
        图片
        <input type="file" accept="image/*" hidden @change="onPickImage" />
      </label>
      <button type="button" class="tb" title="清除格式" @click="cmd('removeFormat')">清除</button>
    </div>

    <div
      ref="editorRef"
      class="editor-body"
      contenteditable="true"
      data-placeholder="请输入富文本内容…"
      @input="onInput"
      @keyup="refreshState"
      @mouseup="refreshState"
      @paste="onPaste"
      @focus="refreshState"
    />

    <el-dialog v-model="linkVisible" title="插入链接" width="380px" append-to-body destroy-on-close>
      <el-form label-width="70px" size="small">
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
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useImageUpload } from '../composables/useImageUpload'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLDivElement>()
const { uploadImage } = useImageUpload()

const foreColor = ref('#333333')
const hiliteColor = ref('#ffff00')
const fontSize = ref('')
const activeMap = ref<Record<string, boolean>>({})

const linkVisible = ref(false)
const linkText = ref('')
const linkUrl = ref('')
const savedRange = ref<Range | null>(null)

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
  emit('update:modelValue', editorRef.value.innerHTML)
}

function onInput() {
  emitHtml()
  refreshState()
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
  const keys = ['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight']
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

async function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  focusEditor()
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => {
      document.execCommand('insertImage', false, url)
      emitHtml()
    },
  })
}

function onPaste(e: ClipboardEvent) {
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
    // 保留基础样式属性
    const keep = ['color', 'background-color', 'font-size', 'text-align', 'font-weight', 'font-style', 'text-decoration']
    const style = node.getAttribute('style') || ''
    if (style) {
      const kept = style
        .split(';')
        .map((s) => s.trim())
        .filter((s) => keep.some((k) => s.toLowerCase().startsWith(`${k}:`)))
        .join('; ')
      if (kept) node.setAttribute('style', kept)
      else node.removeAttribute('style')
    }
    ;['class', 'id', 'onclick', 'onerror'].forEach((attr) => node.removeAttribute(attr))
  })
  return div.innerHTML
}

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
    color: #1769ff;
    border-color: #bcd0ff;
  }

  &.on {
    color: #1769ff;
    background: #eaf1ff;
    border-color: #9bb8ff;
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
  min-height: 180px;
  max-height: 360px;
  padding: 10px 12px;
  overflow-y: auto;
  color: #172033;
  font-size: 13px;
  line-height: 1.7;
  outline: none;
  word-break: break-word;

  &:empty::before {
    content: attr(data-placeholder);
    color: #94a3b8;
  }

  :deep(h1) {
    margin: 0.4em 0;
    font-size: 22px;
    font-weight: 800;
  }

  :deep(h2) {
    margin: 0.4em 0;
    font-size: 18px;
    font-weight: 700;
  }

  :deep(h3) {
    margin: 0.35em 0;
    font-size: 15px;
    font-weight: 700;
  }

  :deep(p) {
    margin: 0.35em 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0.35em 0;
    padding-left: 1.4em;
  }

  :deep(a) {
    color: #1769ff;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }
}
</style>
