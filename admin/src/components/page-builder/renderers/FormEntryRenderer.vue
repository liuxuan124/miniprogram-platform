<template>
  <div
    class="render-form-entry split-text-typography"
    :class="[`style-${styleType}`, { clickable: previewMode }]"
    @click="onClick"
  >
    <div class="form-entry-icon">📋</div>
    <div class="form-entry-info">
      <div class="form-entry-title" :style="titleStyle">{{ component.props.title || '填写信息' }}</div>
      <div v-if="subtitleText" class="form-entry-sub" :style="subtitleStyle">{{ subtitleText }}</div>
    </div>
    <div class="form-entry-btn">{{ buttonText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const styleType = computed(() => {
  const raw = String(props.component.props?.style || 'card')
  return ['card', 'list', 'minimal'].includes(raw) ? raw : 'card'
})

const buttonText = computed(() =>
  props.component.props?.button_text || props.component.props?.buttonText || '立即填写',
)

const formId = computed(() =>
  String(props.component.props?.formId || props.component.props?.formTemplateId || ''),
)

const subtitleText = computed(() => {
  const sub = String(props.component.props?.subtitle || '').trim()
  if (sub) return sub
  const name = String(props.component.props?.form_name || '').trim()
  if (name) return name
  if (!formId.value) return '请先关联表单'
  return ''
})

const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 14))
const subtitleStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))

function onClick() {
  if (!props.previewMode) return
  const link = formId.value ? `/pages/form/form?id=${formId.value}` : ''
  emit('preview-action', {
    tab: 'home',
    message: link ? `打开表单：${link}` : '尚未关联表单',
    detailType: 'form',
    detailTitle: props.component.props?.title || '表单入口',
    detailDesc: subtitleText.value || (link ? `表单 ID ${formId.value}` : '请先在属性里选择表单'),
  })
}
</script>

<style lang="scss" scoped>
.render-form-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e6edf6;
  border-radius: var(--card-radius, 10px);

  &.clickable {
    cursor: pointer;
  }

  &.style-card {
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }

  &.style-list {
    border: none;
    border-bottom: 1px solid #e6edf6;
    border-radius: 0;
    box-shadow: none;
  }

  &.style-minimal {
    border: none;
    padding: 8px 0;
    background: transparent;
    box-shadow: none;
  }

  .form-entry-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    font-size: 18px;
    background: #eaf1ff;
    border-radius: 10px;
  }

  .form-entry-info {
    flex: 1;
    min-width: 0;
  }

  .form-entry-title {
    color: #172033;
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .form-entry-sub {
    margin-top: 2px;
    color: #94a3b8;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .form-entry-btn {
    flex-shrink: 0;
    padding: 6px 14px;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    background: var(--theme-primary, #1769ff);
    border-radius: 999px;
  }
}
</style>
