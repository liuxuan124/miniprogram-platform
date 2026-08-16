<template>
  <div
    class="render-activity-entry split-text-typography"
    :class="[`theme-${theme}`, `style-${styleType}`, { clickable: !!component.props.link_url && previewMode }]"
    @click="onClick"
  >
    <div class="activity-card">
      <div v-if="component.props._previewDataFailed" class="activity-fail-hint">活动数据加载失败，请稍后重试</div>
      <div class="activity-image">
        <img v-if="imageUrl" :src="imageUrl" alt="" class="activity-cover" />
        <div v-if="coverText" class="activity-cover-text">{{ coverText }}</div>
        <div v-else-if="!imageUrl" class="activity-cover-text">🎪 {{ component.props.title || '活动入口' }}</div>
      </div>
      <div class="activity-info">
        <div class="activity-title" :style="titleStyle">{{ component.props.title || '热门活动' }}</div>
        <div v-if="component.props.subtitle" class="activity-subtitle" :style="metaStyle">{{ component.props.subtitle }}</div>
        <div v-if="component.props.date || component.props.location" class="activity-meta" :style="metaStyle">
          <span v-if="component.props.date">📅 {{ component.props.date }}</span>
          <span v-if="component.props.location">📍 {{ component.props.location }}</span>
        </div>
        <div v-if="showCountdown && countdownText" class="activity-countdown" :style="metaStyle">
          距开始 {{ countdownText }}
        </div>
        <div v-if="showQuota" class="activity-quota" :style="metaStyle">
          剩余名额 {{ quotaText }}
        </div>
        <button
          v-if="component.props.show_button !== false"
          class="activity-reserve-btn"
          type="button"
          @click.stop="onClick"
        >
          {{ component.props.button_text || '立即预约' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const imageUrl = computed(() => normalizeUploadUrl(String(props.component.props?.image || '')))
const coverText = computed(() => String(props.component.props?.cover_text || '').trim())
const theme = computed(() => {
  const raw = String(props.component.props?.theme || 'blue')
  return ['blue', 'purple', 'dark', 'gold'].includes(raw) ? raw : 'blue'
})
const styleType = computed(() => {
  const layout = props.component.props?.layout
  if (layout === 'banner' || props.component.props?.style_type === 'full') return 'full'
  if (layout === 'list' || props.component.props?.style_type === 'list') return 'list'
  return 'card'
})
const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 14))
const metaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))
const showCountdown = computed(() => props.component.props?.show_countdown !== false)
const showQuota = computed(() => props.component.props?.show_quota !== false)
const quotaText = computed(() => {
  const raw = props.component.props?.quota ?? props.component.props?.remain_quota ?? 20
  return String(raw)
})
const countdownText = computed(() => {
  const raw = String(props.component.props?.date || '').trim()
  if (!raw) return ''
  const ms = new Date(raw.replace('T', ' ').replace(/-/g, '/')).getTime()
  if (!Number.isFinite(ms)) return ''
  const diff = ms - Date.now()
  if (diff <= 0) return '已开始'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}天${hours}时`
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}时${minutes}分`
})

function onClick() {
  if (!props.previewMode) return
  const link = String(props.component.props?.link_url || '').trim()
  emit('preview-action', {
    tab: 'activity',
    message: link ? `活动跳转：${link}` : '打开活动详情',
    detailType: 'activity',
    detailTitle: props.component.props?.title || '活动入口',
    detailDesc: props.component.props?.subtitle || props.component.props?.location || '',
  })
}
</script>

<style lang="scss" scoped>
.render-activity-entry {
  &.style-card {
    padding: 10px;
  }

  &.style-full {
    padding: 0;
  }

  &.style-list {
    padding: 8px;
  }

  &.clickable {
    cursor: pointer;
  }

  .activity-card {
    overflow: hidden;
    background: #fff;
    border-radius: var(--card-radius, 12px);
    box-shadow: 0 8px 22px rgba(15, 31, 60, 0.08);
  }

  .activity-fail-hint {
    padding: 8px 12px;
    font-size: 12px;
    color: #b45309;
    background: #fffbeb;
    border-bottom: 1px solid #fde68a;
  }

  &.style-full .activity-card {
    border-radius: 0;
    box-shadow: none;
  }

  .activity-image {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 110px;
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--theme-primary, #1769ff), var(--theme-secondary, #20b7ff));
    overflow: hidden;
  }

  .activity-cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .activity-cover-text {
    position: relative;
    z-index: 1;
    padding: 0 12px;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  }

  .activity-info {
    padding: 10px 12px;
  }

  .activity-title {
    color: #172033;
    font-size: 14px;
    font-weight: 800;
  }

  .activity-subtitle {
    margin-top: 4px;
    color: #7b8798;
    font-size: 11px;
  }

  .activity-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 5px;
    color: #7b8798;
    font-size: 11px;
  }

  .activity-countdown,
  .activity-quota {
    margin-top: 4px;
    color: #f59e0b;
    font-size: 11px;
    font-weight: 600;
  }

  .activity-quota {
    color: #1769ff;
  }

  &.style-list .activity-card {
    display: flex;
    flex-direction: row;

    .activity-image {
      width: 96px;
      height: 96px;
      flex-shrink: 0;
    }
  }

  .activity-reserve-btn {
    margin-top: 8px;
    padding: 6px 12px;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    background: var(--theme-primary, #1769ff);
    border: 0;
    border-radius: var(--card-radius, 8px);
    cursor: pointer;
  }

  &.theme-purple .activity-image {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
  }

  &.theme-dark .activity-image {
    background: linear-gradient(135deg, #111827, #374151);
  }

  &.theme-gold .activity-image {
    background: linear-gradient(135deg, #b45309, #f59e0b);
  }

  &.theme-purple .activity-reserve-btn {
    background: #7c3aed;
  }

  &.theme-dark .activity-reserve-btn {
    background: #111827;
  }

  &.theme-gold .activity-reserve-btn {
    background: #b45309;
  }
}
</style>
