<template>
  <div class="render-float-btn" :style="floatButtonStyle">
    <div class="float-btn-circle" :class="`variant-${floatVariant}`" :style="floatButtonCircleStyle">
      <img v-if="floatIconImage" :src="floatIconImage" class="float-btn-icon-img" alt="" />
      <el-icon v-else :size="floatIconSize" color="#fff"><Service /></el-icon>
    </div>
    <span v-if="floatShowText">{{ component.props.title || '悬浮按钮' }}</span>
    <span v-else class="float-btn-mini-label">{{ component.props.title || '悬浮按钮' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Service } from '@element-plus/icons-vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const floatVariant = computed(() => {
  return String(props.component.props?.style_variant || 'circle')
})

const floatButtonStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  const variant = String(props.component.props?.style_variant || 'circle')
  const size = Math.min(120, Math.max(36, Number(props.component.props?.size || 56)))
  const opacity = Math.min(100, Math.max(40, Number(props.component.props?.opacity || 100)))
  const shadowLevel = Math.min(4, Math.max(0, Number(props.component.props?.shadow_level ?? 2)))
  const radiusMap: Record<number, string> = {
    0: 'none',
    1: '0 4px 10px rgba(15,23,42,0.12)',
    2: '0 8px 20px rgba(15,23,42,0.18)',
    3: '0 12px 26px rgba(15,23,42,0.24)',
    4: '0 16px 34px rgba(15,23,42,0.3)',
  }
  style.opacity = String(opacity / 100)
  style.boxShadow = radiusMap[shadowLevel]
  style.backgroundColor = String(props.component.style?.background_color || '#ffffff')
  style.padding = variant === 'pill' || variant === 'bar' ? '8px 12px' : '8px'
  style.gap = variant === 'text' ? '6px' : '8px'
  style.minHeight = `${size}px`
  style.width = variant === 'pill' || variant === 'text' ? 'auto' : variant === 'bar' ? '100%' : `${size}px`
  style.borderRadius = variant === 'square' ? '10px' : variant === 'text' ? '8px' : variant === 'pill' || variant === 'bar' ? '999px' : '50%'
  return style
})

const floatButtonCircleStyle = computed<Record<string, string>>(() => {
  const color = String(props.component.props?.button_color || '#409eff')
  return {
    background: color,
  }
})

const floatIconImage = computed(() => {
  return String(props.component.props?.icon_image || '').trim()
})

const floatShowText = computed(() => {
  return props.component.props?.show_text === true
})

const floatIconSize = computed(() => {
  return Math.min(56, Math.max(14, Number(props.component.props?.icon_size || 24)))
})
</script>

<style lang="scss" scoped>
.render-float-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #e4e9f2;

  .float-btn-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #409eff;
    display: flex;
    align-items: center;
    justify-content: center;

    &.variant-square {
      border-radius: 10px;
    }

    &.variant-pill {
      border-radius: 999px;
    }

    &.variant-text {
      border-radius: 8px;
    }

    &.variant-bar {
      width: 34px;
      height: 34px;
      border-radius: 999px;
    }
  }

  .float-btn-icon-img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  span {
    font-size: 12px;
    color: #909399;
  }

  .float-btn-mini-label {
    display: none;
  }
}
</style>
