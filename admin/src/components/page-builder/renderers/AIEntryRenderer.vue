<template>
  <div class="render-ai-entry" :class="`theme-${component.props.theme || 'blue'}`">
    <div class="ai-entry-avatar">
      <el-icon v-if="!component.props.avatar" :size="28" color="#fff"><Monitor /></el-icon>
      <img v-else :src="component.props.avatar" class="ai-entry-avatar-img" />
    </div>
    <div class="ai-entry-info">
      <div class="ai-entry-title">{{ component.props.title || 'AI智能助手' }}</div>
      <div v-if="component.props.description" class="ai-entry-desc">{{ component.props.description }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor } from '@element-plus/icons-vue'
import type { ComponentInstance } from '@/types/page'

defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.render-ai-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  color: #fff;

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
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;

    .ai-entry-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .ai-entry-info {
    flex: 1;
    min-width: 0;

    .ai-entry-title {
      font-size: 15px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ai-entry-desc {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
