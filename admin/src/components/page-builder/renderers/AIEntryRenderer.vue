<template>
  <div
    class="render-ai-entry split-text-typography"
    :class="[`theme-${theme}`, { clickable: previewMode }]"
    @click="onClick"
  >
    <div class="ai-entry-avatar">
      <img v-if="avatarUrl" :src="avatarUrl" class="ai-entry-avatar-img" alt="" />
      <el-icon v-else :size="28" color="#fff"><Monitor /></el-icon>
    </div>
    <div class="ai-entry-info">
      <div class="ai-entry-title" :style="titleStyle">{{ component.props.title || 'AI智能助手' }}</div>
      <div v-if="description" class="ai-entry-desc" :style="descStyle">{{ description }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Monitor } from '@element-plus/icons-vue'
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

const THEMES = ['blue', 'green', 'purple', 'dark', 'gold'] as const

const theme = computed(() => {
  const raw = String(props.component.props?.theme || 'blue')
  return (THEMES as readonly string[]).includes(raw) ? raw : 'blue'
})

const description = computed(() => String(props.component.props?.description || '').trim())
const avatarUrl = computed(() => normalizeUploadUrl(String(props.component.props?.avatar || '')))
const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 15))
const descStyle = computed(() => titleFontStyle(props.component.props?.desc_font_size, 12))

function onClick() {
  if (!props.previewMode) return
  emit('preview-action', {
    tab: 'home',
    message: '打开 AI 助手：/pages/service-chat/service-chat',
    detailType: 'ai',
    detailTitle: props.component.props?.title || 'AI智能助手',
    detailDesc: description.value || '进入智能客服对话',
  })
}
</script>

<style lang="scss" scoped>
.render-ai-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: var(--card-radius, 10px);
  color: #fff;

  &.clickable {
    cursor: pointer;
  }

  &.theme-blue {
    background: linear-gradient(135deg, #409eff, #337ecc);
  }

  &.theme-green {
    background: linear-gradient(135deg, #67c23a, #529b2e);
  }

  &.theme-purple {
    background: linear-gradient(135deg, #9b59b6, #8e44ad);
  }

  &.theme-dark {
    background: linear-gradient(135deg, #111827, #374151);
  }

  &.theme-gold {
    background: linear-gradient(135deg, #b45309, #f59e0b);
  }

  .ai-entry-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;

    .ai-entry-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .ai-entry-info {
    flex: 1;
    min-width: 0;
  }

  .ai-entry-title {
    overflow: hidden;
    font-size: 15px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ai-entry-desc {
    margin-top: 4px;
    overflow: hidden;
    font-size: 12px;
    opacity: 0.85;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
