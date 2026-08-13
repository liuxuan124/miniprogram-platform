<template>
  <div
    class="render-contact-info split-text-typography"
    :class="[
      `layout-${layout}`,
      `style-${styleType}`,
      `align-${align}`,
      { clickable: previewMode && phone },
    ]"
  >
    <div class="title" :style="titleStyle">{{ component.props.title || '联系我们' }}</div>
    <div class="body">
      <div
        v-for="item in visibleItems"
        :key="item.key"
        class="item"
        :class="{ 'is-phone': item.key === 'phone' }"
        @click="onItemClick(item)"
      >
        <span v-if="showIcons" class="icon">{{ item.icon }}</span>
        <span class="text" :style="metaStyle">{{ item.text }}</span>
      </div>
    </div>
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

const layout = computed(() => {
  const raw = String(props.component.props?.layout || 'list')
  return ['list', 'row', 'grid'].includes(raw) ? raw : 'list'
})

const styleType = computed(() => {
  const raw = String(props.component.props?.style || 'card')
  return ['card', 'list', 'minimal'].includes(raw) ? raw : 'card'
})

const align = computed(() => (props.component.props?.align === 'center' ? 'center' : 'left'))
const showIcons = computed(() => props.component.props?.show_icons !== false)

const phone = computed(() => String(props.component.props?.phone || '').trim())
const address = computed(() => String(props.component.props?.address || '').trim())
const serviceTime = computed(() => String(props.component.props?.service_time || '').trim())

const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 14))
const metaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 12))

const visibleItems = computed(() => {
  const p = props.component.props || {}
  const items: Array<{ key: string; icon: string; text: string }> = []
  if (p.show_phone !== false) {
    items.push({ key: 'phone', icon: '☎', text: phone.value || '未设置电话' })
  }
  if (p.show_address !== false) {
    items.push({ key: 'address', icon: '📍', text: address.value || '未设置地址' })
  }
  if (p.show_service_time !== false) {
    items.push({ key: 'time', icon: '🕘', text: serviceTime.value || '未设置时间' })
  }
  return items
})

function onItemClick(item: { key: string; text: string }) {
  if (!props.previewMode || item.key !== 'phone' || !phone.value) return
  emit('preview-action', {
    tab: 'home',
    message: `拨打电话：${phone.value}`,
    detailType: 'phone',
    detailTitle: props.component.props?.title || '联系方式',
    detailDesc: phone.value,
  })
}
</script>

<style lang="scss" scoped>
.render-contact-info {
  padding: 12px;
  background: #fff;
  border: 1px solid #e6edf6;
  border-radius: var(--card-radius, 10px);

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
    padding: 8px 0;
    border: none;
    background: transparent;
    box-shadow: none;
  }

  &.align-center {
    text-align: center;

    .body {
      justify-content: center;
    }

    .item {
      justify-content: center;
    }
  }

  .title {
    margin-bottom: 8px;
    color: #172033;
    font-size: 14px;
    font-weight: 700;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &.layout-row .body {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px 14px;
  }

  &.layout-grid .body {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  &.clickable .item.is-phone {
    cursor: pointer;
    color: #1769ff;
  }

  .item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
    color: #475569;
  }

  .icon {
    flex-shrink: 0;
    line-height: 1.4;
  }

  .text {
    min-width: 0;
    font-size: 12px;
    line-height: 1.4;
    word-break: break-word;
  }
}
</style>
