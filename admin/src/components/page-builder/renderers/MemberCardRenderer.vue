<template>
  <div class="render-member-card">
    <div
      class="member-bg"
      :class="`theme-${component.props.theme || 'blue'}`"
      :style="memberCardStyle"
    >
      <div class="member-row">
        <div class="member-avatar">👤</div>
        <div>
          <div class="member-title">{{ component.props.title || '金卡会员' }}</div>
          <div class="member-subtitle">点击查看权益</div>
        </div>
      </div>
      <div class="member-info-row">
        <span><b>1280</b><em>积分</em></span>
        <span><b>5600</b><em>成长值</em></span>
        <span><b>3</b><em>优惠券</em></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const memberCardStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  const styleRadius = Number(props.component.style?.border_radius ?? 0)
  const propRadius = Number(props.component.props?.border_radius ?? 14)
  const radius = styleRadius > 0 ? styleRadius : propRadius
  style.borderRadius = `${radius}px`
  return style
})
</script>

<style lang="scss" scoped>
.render-member-card {
  padding: 0 10px 10px;

  .member-bg {
    background: linear-gradient(135deg, #0f2150, #1769ff);
    border-radius: 14px;
    padding: 16px;
    color: #fff;

    .member-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .member-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.16);
      border-radius: 999px;
    }

    .member-title {
      font-size: 15px;
      font-weight: 800;
    }

    .member-subtitle {
      margin-top: 2px;
      font-size: 11px;
      opacity: 0.78;
    }

    .member-info-row {
      display: flex;
      justify-content: space-around;
      margin-top: 16px;
      text-align: center;

      span {
        display: flex;
        flex-direction: column;
      }

      b {
        font-size: 16px;
        line-height: 1.2;
      }

      em {
        margin-top: 3px;
        font-size: 10px;
        font-style: normal;
        opacity: 0.75;
      }
    }
  }

  .member-bg.theme-purple {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
  }

  .member-bg.theme-dark {
    background: linear-gradient(135deg, #111827, #374151);
  }

  .member-bg.theme-gold {
    background: linear-gradient(135deg, #b45309, #f59e0b);
  }
}
</style>
