<template>
  <div class="rt-toolbar" @mousedown.prevent>
    <!-- ① 文字属性组 -->
    <div class="rt-group" role="group" aria-label="文字属性">
      <button v-for="b in TEXT_BUTTONS" :key="b.cmd" type="button" class="rt-btn" :title="b.title + shortcut(b.cmd)" :class="{ on: isActive(b.cmd) }" @click="emitCommand(b.cmd)">
        <component :is="b.icon" class="rt-ico" />
      </button>
      <RichTextColorPicker model-value="foreColor" label="文字色" title="文字颜色" @update:model-value="emitCommand('foreColor', $event)" />
      <RichTextColorPicker model-value="hiliteColor" label="高亮" title="文本高亮背景" @update:model-value="emitHilite" />
    </div>

    <!-- ② 段落层级组 -->
    <div class="rt-group" role="group" aria-label="段落层级">
      <button
        v-for="b in BLOCK_BUTTONS"
        :key="b.tag"
        type="button"
        class="rt-btn rt-btn--wide"
        :class="{ on: b.tag === 'blockquote' && blockquoteActive }"
        :title="b.title"
        @click="emitBlock(b.tag)"
      >
        {{ b.label }}
      </button>
    </div>

    <!-- ③ 对齐与列表 -->
    <div class="rt-group" role="group" aria-label="对齐与列表">
      <button v-for="b in ALIGN_BUTTONS" :key="b.cmd" type="button" class="rt-btn rt-btn--wide" :class="{ on: isActive(b.cmd) }" :title="b.title" @click="emitCommand(b.cmd)">
        {{ b.label }}
      </button>
      <button type="button" class="rt-btn rt-btn--wide" :class="{ on: isActive('insertUnorderedList') }" title="无序列表" @click="emitToggleList('ul')">• 列表</button>
      <button type="button" class="rt-btn rt-btn--wide" :class="{ on: isActive('insertOrderedList') }" title="有序列表" @click="emitToggleList('ol')">1. 列表</button>
    </div>

    <!-- ④ 富媒体与卡片 -->
    <div class="rt-group" role="group" aria-label="富媒体与卡片">
      <button type="button" class="rt-btn rt-btn--wide" title="插入链接" @click="emit('link')">链接</button>
      <label class="rt-btn rt-btn--wide" title="插入本地图片">
        图片
        <input type="file" accept="image/*" hidden @change="emitFile('image', $event)" />
      </label>
      <button type="button" class="rt-btn rt-btn--wide" title="从素材库选择图片" @click="emit('asset')">素材库</button>
      <button type="button" class="rt-btn rt-btn--wide" title="插入分割线" @click="emit('hr')">分割线</button>

      <!-- 提示卡：4 种风格 -->
      <el-dropdown trigger="click" @command="(c: string) => emit('callout', c)">
        <button type="button" class="rt-btn rt-btn--wide rt-btn--accent" title="插入提示卡片">提示卡 ▾</button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="o in CALLOUT_OPTIONS" :key="o.value" :command="o.value">
              <span class="rt-callout-opt">
                <b>{{ o.label }}</b>
                <em>{{ o.desc }}</em>
              </span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- ⑤ 排版动作组 -->
    <div class="rt-group" role="group" aria-label="排版动作">
      <!-- AI 收归为工具栏动作，不在输入框内放悬浮图标（原先与右侧边缘重叠） -->
      <el-dropdown trigger="click" @command="(c: string) => emit('ai', c)">
        <button type="button" class="rt-btn rt-btn--wide rt-btn--ai" title="AI 润色与排版">✨ AI ▾</button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="format">一键排版</el-dropdown-item>
            <el-dropdown-item command="polish">润色</el-dropdown-item>
            <el-dropdown-item command="shorten">精简摘要</el-dropdown-item>
            <el-dropdown-item command="expand">扩写</el-dropdown-item>
            <el-dropdown-item command="typo">修复错别字</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <button type="button" class="rt-btn rt-btn--wide" title="智能清除格式（纯文本化）" @click="emit('strip')">清除样式</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import RichTextColorPicker from './RichTextColorPicker.vue'
import { CALLOUT_OPTIONS } from './richTextSchema'

/**
 * 分组式工具条。
 * 🔴 为什么要分组：原来 30+ 个按钮平铺成 4 层，运营根本分不清
 * 「哪些是排版、哪些是插内容、哪些是动作」。现按语义分 5 组，组间有分隔线。
 */

const props = defineProps<{
  foreColor: string
  hiliteColor: string
  blockquoteActive?: boolean
  activeMap?: Record<string, boolean>
}>()

const emit = defineEmits<{
  command: [command: string, value?: string]
  block: [tag: string]
  toggleList: [type: 'ul' | 'ol']
  hilite: [color: string]
  link: []
  asset: []
  hr: []
  callout: [style: string]
  ai: [action: string]
  strip: []
  file: [kind: 'image', event: Event]
}>()

/** 用纯元素渲染图标，避免引入图标库 */
function icon(tag: string, cls: string, text: string) {
  return () => h(tag, { class: cls }, text)
}

const TEXT_BUTTONS = [
  { cmd: 'bold', title: '加粗', icon: icon('b', 'rt-ico', 'B') },
  { cmd: 'italic', title: '斜体', icon: icon('i', 'rt-ico', 'I') },
  { cmd: 'underline', title: '下划线', icon: icon('u', 'rt-ico', 'U') },
  { cmd: 'strikeThrough', title: '删除线', icon: icon('s', 'rt-ico', 'S') },
]
const BLOCK_BUTTONS = [
  { tag: 'p', label: '正文', title: '正文段落' },
  { tag: 'h1', label: 'H1', title: '一级标题' },
  { tag: 'h2', label: 'H2', title: '二级标题' },
  { tag: 'h3', label: 'H3', title: '三级标题' },
  { tag: 'blockquote', label: '引用', title: '引用块' },
]

const ALIGN_BUTTONS = [
  { cmd: 'justifyLeft', label: '左', title: '左对齐' },
  { cmd: 'justifyCenter', label: '中', title: '居中对齐' },
  { cmd: 'justifyRight', label: '右', title: '右对齐' },
]

/** 快捷键提示（平台差异用 ⌘ / Ctrl 双标） */
function shortcut(cmd: string): string {
  const map: Record<string, string> = {
    bold: '（⌘/Ctrl+B）',
    italic: '（⌘/Ctrl+I）',
    underline: '（⌘/Ctrl+U）',
  }
  return map[cmd] || ''
}

function isActive(cmd: string): boolean {
  return !!props.activeMap?.[cmd]
}

function emitCommand(cmd: string, value?: string) {
  emit('command', cmd, value)
}
function emitBlock(tag: string) {
  emit('block', tag)
}
function emitToggleList(type: 'ul' | 'ol') {
  emit('toggleList', type)
}
function emitHilite(color: string) {
  emit('hilite', color)
}
function emitFile(kind: 'image', event: Event) {
  emit('file', kind, event)
}
</script>

<style scoped lang="scss">
.rt-toolbar {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px;
  background: #f7f9fc;
  border-bottom: 1px solid #e3e8f0;
}

.rt-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding-bottom: 5px;
  border-bottom: 1px dashed #e3e8f0;

  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
}

.rt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  color: #334155;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  background: #fff;
  border: 1px solid #dde3ec;
  border-radius: 5px;

  &:hover {
    color: var(--color-primary);
    border-color: #bcd0ff;
  }

  &.on {
    color: var(--color-primary);
    background: #eaf1ff;
    border-color: #9bb8ff;
  }

  &--wide {
    min-width: 34px;
  }

  &--accent {
    color: #b45309;
    border-color: #f0dcb8;
  }

  &--ai {
    color: #6b46c1;
    border-color: #ddd0f2;
  }
}

.rt-ico {
  font-size: 12px;
}

.rt-callout-opt {
  display: flex;
  flex-direction: column;

  em {
    font-size: 11px;
    font-style: normal;
    opacity: 0.6;
  }
}
</style>
