<template>
  <div class="render-appointment-service split-text-typography">
    <div class="section-title" :style="sectionTitleStyle">{{ component.props.title || '预约服务' }}</div>
    <div v-if="!visibleItems.length" class="empty">暂无服务，请在右侧添加</div>
    <div
      v-for="(item, idx) in visibleItems"
      :key="`service-${idx}`"
      class="service-item"
      :class="{ clickable: previewMode }"
      @click="onItemClick(item)"
    >
      <div class="body">
        <div class="service-name" :style="itemTitleStyle">{{ item.name || '服务名称' }}</div>
        <div class="service-desc" :style="itemMetaStyle">{{ item.desc || '服务说明' }}</div>
      </div>
      <button type="button" class="service-btn" @click.stop="onItemClick(item)">
        {{ item.button_text || '立即预约' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

type ServiceItem = {
  name?: string
  desc?: string
  button_text?: string
  link_url?: string
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const sectionTitleStyle = computed(() => titleFontStyle(props.component.props?.section_title_font_size, 15))
const itemTitleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 12))
const itemMetaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))

const fallbackItems: ServiceItem[] = [
  { name: '专家咨询', desc: '一对一咨询服务', button_text: '立即预约', link_url: '' },
  { name: '到店体验', desc: '门店体验预约', button_text: '立即预约', link_url: '' },
]

const visibleItems = computed<ServiceItem[]>(() => {
  const raw = props.component.props?.services
  if (Array.isArray(raw) && raw.length) {
    return raw.map((item: any) => ({
      name: item.name || '服务名称',
      desc: item.desc || item.description || '',
      button_text: item.button_text || '立即预约',
      link_url: item.link_url || '',
    }))
  }
  return props.previewMode ? [] : fallbackItems
})

function onItemClick(item: ServiceItem) {
  if (!props.previewMode) return
  emit('preview-action', {
    tab: 'appointment',
    message: item.link_url ? `预约跳转：${item.link_url}` : '打开预约服务',
    detailType: 'appointment',
    detailTitle: item.name || '预约服务',
    detailDesc: item.desc || '',
  })
}
</script>

<style lang="scss" scoped>
.render-appointment-service {
  padding: 10px;
  background: #fff;
  border: 1px solid #e6edf6;
  border-radius: var(--card-radius, 10px);

  .section-title {
    margin-bottom: 8px;
    color: #172033;
    font-size: 15px;
    font-weight: 700;
  }

  .empty {
    padding: 20px 8px;
    color: #94a3b8;
    font-size: 12px;
    text-align: center;
    background: #f8faff;
    border-radius: 0;
  }

  .service-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 8px;
    background: #f8faff;
    border-radius: 0;

    &.clickable {
      cursor: pointer;
    }

    .body {
      flex: 1;
      min-width: 0;
    }
  }

  .service-name {
    color: #1e293b;
    font-size: 12px;
    font-weight: 600;
  }

  .service-desc {
    margin-top: 2px;
    color: #64748b;
    font-size: 11px;
  }

  .service-btn {
    flex-shrink: 0;
    height: 28px;
    padding: 0 12px;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    background: var(--theme-primary, #1769ff);
    border: 0;
    border-radius: 999px;
    cursor: pointer;
  }
}
</style>
