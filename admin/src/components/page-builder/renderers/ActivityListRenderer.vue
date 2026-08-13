<template>
  <div class="render-activity-list split-text-typography">
    <div class="section-title" :style="sectionTitleStyle">{{ component.props.title || '热门活动' }}</div>
    <div v-if="!visibleItems.length" class="empty">暂无活动，请在右侧添加</div>
    <div
      v-for="(item, idx) in visibleItems"
      :key="`act-${idx}`"
      class="activity-list-item"
      :class="{ clickable: previewMode }"
      @click="onItemClick(item)"
    >
      <div v-if="item.cover" class="cover">
        <img :src="item.cover" alt="" />
      </div>
      <div class="body">
        <div class="name" :style="itemTitleStyle">{{ item.title || '活动名称' }}</div>
        <div class="meta" :style="itemMetaStyle">
          <span v-if="item.date">{{ item.date }}</span>
          <span v-if="item.date && item.location"> · </span>
          <span v-if="item.location">{{ item.location }}</span>
          <span v-if="!item.date && !item.location">待定</span>
        </div>
      </div>
      <button
        v-if="showButton"
        type="button"
        @click.stop="onItemClick(item)"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

type ActivityItem = {
  title?: string
  date?: string
  location?: string
  cover?: string
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
const itemMetaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 10))
const showButton = computed(() => props.component.props?.show_button !== false)
const buttonText = computed(() => props.component.props?.button_text || '报名')

const fallbackItems: ActivityItem[] = [
  { title: '品牌开放日沙龙', date: '2026-05-20 10:00', location: '品牌中心', cover: '' },
  { title: '药食同源研学活动', date: '2026-05-24 14:00', location: '展会中心', cover: '' },
]

const visibleItems = computed<ActivityItem[]>(() => {
  const raw = props.component.props?.items
  const limit = Math.max(Number(props.component.props?.limit) || 4, 1)
  const source = Array.isArray(raw) && raw.length
    ? raw
    : (props.previewMode ? [] : fallbackItems)

  return source.slice(0, limit).map((item: any) => ({
    title: item.title || item.name || '活动名称',
    date: item.date || '',
    location: item.location || '',
    cover: normalizeUploadUrl(String(item.cover || item.image || '')),
    link_url: item.link_url || '',
  }))
})

function onItemClick(item: ActivityItem) {
  if (!props.previewMode) return
  emit('preview-action', {
    tab: 'activity',
    message: item.link_url ? `活动跳转：${item.link_url}` : '打开活动详情',
    detailType: 'activity',
    detailTitle: item.title || '活动',
    detailDesc: [item.date, item.location].filter(Boolean).join(' · '),
  })
}
</script>

<style lang="scss" scoped>
.render-activity-list {
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

  .activity-list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    padding: 8px;
    background: #f8faff;
    border-radius: 0;

    &.clickable {
      cursor: pointer;
    }

    .cover {
      flex-shrink: 0;
      width: 52px;
      height: 40px;
      border-radius: 6px;
      overflow: hidden;
      background: #eef2f7;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }

    .body {
      flex: 1;
      min-width: 0;
    }

    .name {
      color: #1e293b;
      font-size: 12px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      margin-top: 2px;
      color: #64748b;
      font-size: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    button {
      flex-shrink: 0;
      padding: 4px 10px;
      color: #fff;
      font-size: 11px;
      background: var(--theme-primary, #1769ff);
      border: 0;
      border-radius: 999px;
      cursor: pointer;
    }
  }
}
</style>
