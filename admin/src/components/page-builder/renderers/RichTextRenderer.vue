<template>
  <div class="render-rich-text" :class="{ 'is-editing': editing, 'is-empty': isEmpty }">
    <!-- 空态：虚线引导 + 最小高度，防容器塌成 0px -->
    <div v-if="isEmpty && !editing" class="rtx-blank">
      <span class="rtx-blank__text">点击此处输入富文本，或在右侧开启全屏排版</span>
    </div>

    <!-- 富文本作用域：移动端重置样式挂这里 -->
    <div
      v-else
      ref="contentRef"
      class="rich-text-content rtx-content"
      :class="{ 'is-inline-editing': editing }"
      :style="containerStyle"
      :contenteditable="editing ? 'true' : undefined"
      spellcheck="false"
      @dblclick="onDblClick"
      @blur="onBlur"
      @input="onInput"
    >
      <div v-if="editing" class="rtx-editing-tip">就地编辑中 · 点击外部保存</div>
      <!-- eslint-disable-next-line vue/no-v-html -- 富文本内容本身即为 HTML -->
      <div class="rtx-html" v-html="cfg.content"></div>
    </div>

    <!-- 编辑态：双击任意处进入就地编辑 -->
    <button
      v-if="!previewMode && !editing && !isEmpty"
      type="button"
      class="rtx-edit-tip"
      title="双击内容可就地编辑"
      @click.stop="onDblClick"
    >
      ✎ 双击编辑
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import {
  isRichTextEmpty,
  normalizeRichTextProps,
  richContainerStyle,
} from '../richText/richTextSchema'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  /** 回写 props：由 ComponentItem 转发到 store（此前无任何渲染器能改 props） */
  'patch-props': [partial: Record<string, any>]
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const editing = ref(false)
const contentRef = ref<HTMLElement | null>(null)

/** 与属性面板读同一份归一化配置 */
const cfg = computed(() => normalizeRichTextProps(props.component.props))

const isEmpty = computed(() => isRichTextEmpty(cfg.value.content))

const containerStyle = computed(() => richContainerStyle(cfg.value))

/** 就地编辑：双击进入；容器样式不参与编辑区，避免把边距当正文改 */
function onDblClick(e: MouseEvent) {
  if (props.previewMode) return
  e.stopPropagation()
  editing.value = true
  requestAnimationFrame(() => {
    contentRef.value?.focus()
  })
}

function onInput() {
  const el = contentRef.value?.querySelector('.rtx-html') as HTMLElement | null
  if (!el) return
  emit('patch-props', { content: el.innerHTML })
}

function onBlur() {
  if (!editing.value) return
  editing.value = false
  // 富文本常带浏览器自动生成的空 <p><br></p>，保存前清掉避免端上出现空行
  const el = contentRef.value?.querySelector('.rtx-html') as HTMLElement | null
  const html = (el?.innerHTML || '').trim()
  if (!isRichTextEmpty(html)) {
    emit('patch-props', { content: html })
    ElMessage.success('富文本已保存')
  }
}
</script>

<style lang="scss" scoped>
.render-rich-text {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

/* 空态：给最小高度，杜绝塌成 0px */
.rtx-blank {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  padding: 16px 12px;
  text-align: center;
  background: #fafbfd;
  border: 1px dashed #d9e0ea;
  border-radius: 8px;
}

.rtx-blank__text {
  font-size: 12px;
  color: #9aa4b2;
}

.rtx-content {
  outline: none;
}

/* 就地编辑态：给一圈提示边框，让人知道正在改 */
.rtx-content.is-inline-editing {
  border: 1px dashed var(--color-primary, #c08e6e);
  border-radius: 8px;
  cursor: text;
}

.rtx-editing-tip {
  margin-bottom: 6px;
  font-size: 11px;
  color: var(--color-primary, #c08e6e);
}

.rtx-edit-tip {
  position: absolute;
  right: 6px;
  bottom: 6px;
  z-index: 4;
  height: 20px;
  padding: 0 8px;
  font-size: 11px;
  color: #6b5b4e;
  cursor: pointer;
  background: rgb(255 255 255 / 92%);
  border: 1px solid #e3ddd3;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgb(15 23 42 / 10%);
}

@media (prefers-reduced-motion: reduce) {
  .rtx-content {
    transition: none;
  }
}
</style>
