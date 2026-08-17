<template>
  <div class="render-certificate split-text-typography">
    <div class="section-header style-bar">
      <div class="section-header__bars" aria-hidden="true">
        <span class="section-header__bar section-header__bar--down" />
        <span class="section-header__bar section-header__bar--up" />
      </div>
      <div class="section-header__text">
        <div class="section-header__main" :style="titleStyle">{{ component.props.title || '资质证书' }}</div>
      </div>
    </div>
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
  border-radius: 0;

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -10px -10px 10px;
    padding: 12px 14px 12px 12px;
    min-height: 48px;
    background-color: #002FA7;
    background-image:
      linear-gradient(90deg, rgba(0, 47, 167, 0.5) 0%, rgba(26, 75, 191, 0.22) 42%, rgba(42, 91, 201, 0.06) 100%),
      url('/section-bar-tech-bg.jpg'),
      linear-gradient(90deg, #002FA7 0%, #1A4BBF 52%, #2A5BC9 100%);
    background-size: cover, cover, auto;
    background-position: center, center bottom, center;
    background-repeat: no-repeat;

    &__bars {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      gap: 3px;
      width: 9px;
      flex-shrink: 0;
      height: 18px;
    }

    &__bar {
      width: 3px;
      border-radius: 1px;
      background: #B8D0FF;

      &--down {
        height: 72%;
        align-self: flex-start;
      }

      &--up {
        height: 72%;
        align-self: flex-end;
      }
    }

    &__main {
      color: #f3f7fc;
      font-size: 15px;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    }
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
    padding: 0 0 8px;
    text-align: center;
    background: #f4f6fc;
    border-radius: 0;
    overflow: hidden;

    .img {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 72px;
      font-size: 22px;
      background: #e8ecf8;
      border-radius: 0;
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
      padding: 0 8px;
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
      padding: 0 8px 4px;
      color: #94a3b8;
      font-size: 10px;
    }
  }
}
</style>
