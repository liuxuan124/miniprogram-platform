<template>
  <div class="render-video" :style="videoStyle">
    <el-icon :size="40" color="#c0c4cc"><VideoPlay /></el-icon>
    <span class="video-title">{{ component.props.title || '视频播放器' }}</span>
    <span class="video-btn">{{ component.props.button_text || '点击播放' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VideoPlay } from '@element-plus/icons-vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const videoStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  const styleRadius = Number(props.component.style?.border_radius ?? 0)
  const propRadius = Number(props.component.props?.border_radius ?? 8)
  const radius = styleRadius > 0 ? styleRadius : propRadius
  style.borderRadius = `${radius}px`
  return style
})
</script>

<style lang="scss" scoped>
.render-video {
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
  gap: 8px;
  font-size: 12px;
  color: #909399;

  .video-title {
    color: #c0c4cc;
  }

  .video-btn {
    padding: 4px 10px;
    color: #fff;
    font-size: 11px;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 999px;
  }
}
</style>
