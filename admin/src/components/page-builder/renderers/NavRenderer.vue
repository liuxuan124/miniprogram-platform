<template>
  <div
    class="render-nav"
    :class="{ 'render-nav--frame': showFrame }"
    :style="rootStyle"
  >
    <div
      class="render-nav__grid"
      :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
    >
      <div
        v-for="(item, i) in (component.props.items || [])"
        :key="i"
        class="nav-item"
        :class="{ 'nav-item--clickable': hasLink(item) }"
        @click.stop="onItemClick(item)"
      >
        <div class="nav-icon" :class="{ 'nav-icon--img': isImageIcon(item.icon) }">
          <img v-if="isImageIcon(item.icon)" :src="navIconDisplaySrc(item.icon)" alt="" class="nav-icon-img" />
          <span v-else>{{ item.icon || '▦' }}</span>
        </div>
        <span class="nav-text">{{ item.title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { resolveJump, resolvePreviewLinkAction, runPreviewLinkAction } from '@/utils/preview-link'
import { isNavImageIcon, navIconDisplaySrc } from '@/components/page-builder/navIconSet'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: {
    tab: string
    message: string
    detailType?: string
    detailTitle?: string
    detailDesc?: string
    productId?: string | number
    previewPath?: string
  }]
}>()

const columns = computed(() => {
  const n = Number(props.component.props?.columns || 4)
  return n >= 3 && n <= 5 ? n : 4
})

const showFrame = computed(() => props.component.props?.show_frame !== false)

function clampPad(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 48)) : fallback
}

const rootStyle = computed(() => {
  const padTop = clampPad(props.component.props?.padding_top, 14)
  const padBottom = clampPad(props.component.props?.padding_bottom, 10)
  const style: Record<string, string> = {
    paddingTop: `${padTop}px`,
    paddingBottom: `${padBottom}px`,
  }
  if (!showFrame.value) return style
  const radius = Number(props.component.props?.frame_radius)
  const r = Number.isFinite(radius) ? Math.max(0, Math.min(radius, 40)) : 16
  const bg = props.component.props?.frame_bg || '#ffffff'
  style.background = String(bg)
  style.borderRadius = `${r}px`
  return style
})

function isImageIcon(icon?: string): boolean {
  return isNavImageIcon(icon)
}

function hasLink(item: Record<string, unknown>) {
  return !!resolveJump(item).target
}

function onItemClick(item: Record<string, unknown>) {
  const action = resolvePreviewLinkAction(item, String(item.title || ''))
  if (!action) {
    ElMessage.warning('未配置跳转链接')
    return
  }

  if (props.previewMode) {
    const message = runPreviewLinkAction(action, (payload) => emit('preview-action', payload))
    if (message) ElMessage.info(message)
    return
  }

  if (action.kind === 'open-url') {
    window.open(action.url, '_blank', 'noopener,noreferrer')
    ElMessage.success('已在新窗口打开链接')
    return
  }

  if (action.kind === 'emit') {
    ElMessage.info(action.payload.message || '已配置页面跳转，请在预览中查看效果')
    return
  }

  ElMessage.info(action.message)
}
</script>

<style lang="scss" scoped>
.render-nav {
  padding-left: 4px;
  padding-right: 4px;
  background: transparent;
  box-sizing: border-box;

  &--frame {
    padding-left: 8px;
    padding-right: 8px;
    border: 1px solid #edf1f7;
    box-shadow: 0 4px 14px rgba(28, 43, 76, 0.06);
  }

  &__grid {
    display: grid;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
    gap: 2px;

    &--clickable {
      cursor: pointer;

      &:active {
        opacity: 0.82;
      }
    }

    .nav-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0;
      overflow: hidden;

      span {
        font-size: 22px;
        line-height: 1;
      }

      .nav-icon-img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        display: block;
      }
    }

    .nav-text {
      font-size: 11px;
      color: #4b5563;
      line-height: 1.2;
    }
  }
}
</style>
