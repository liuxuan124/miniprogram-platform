<template>
  <div class="render-certificate split-text-typography">
    <div class="section-title" :style="titleStyle">{{ component.props.title || '资质证书' }}</div>
    <div class="certificate-grid" :class="`cols-${columns}`">
      <div v-for="(item, idx) in certificateItems" :key="`cert-${idx}`" class="certificate-item">
        <div class="img">
          <img v-if="item.image" :src="item.image" alt="" class="img-real" />
          <span v-else>📜</span>
        </div>
        <div class="name" :style="nameStyle">{{ item.name || '证书名称' }}</div>
        <div v-if="item.desc" class="desc">{{ item.desc }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

type CertItem = { name?: string; desc?: string; image?: string }

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const columns = computed(() => (Number(props.component.props?.columns) === 3 ? 3 : 2))
const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 15))
const nameStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))

const certificateItems = computed<CertItem[]>(() => {
  const items = props.component.props?.items
  if (Array.isArray(items) && items.length) {
    return items.map((item: any) => ({
      name: item.name || '证书名称',
      desc: item.desc || '',
      image: normalizeUploadUrl(String(item.image || item.cover || '')),
    }))
  }
  return [
    { name: '有机产品认证', desc: '', image: '' },
    { name: '质量检测报告', desc: '', image: '' },
  ]
})
</script>

<style lang="scss" scoped>
.render-certificate {
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

  .certificate-grid {
    display: grid;
    gap: 8px;

    &.cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    &.cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .certificate-item {
    padding: 8px;
    text-align: center;
    background: #f8faff;
    border-radius: var(--card-radius, 8px);

    .img {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 72px;
      font-size: 22px;
      background: #eef2f7;
      border-radius: 6px;
      overflow: hidden;
    }

    .img-real {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .name {
      margin-top: 6px;
      color: #475569;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .desc {
      margin-top: 2px;
      color: #94a3b8;
      font-size: 10px;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
}
</style>
