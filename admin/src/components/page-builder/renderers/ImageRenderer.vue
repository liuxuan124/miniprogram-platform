<template>
  <div
    class="render-image"
    :class="{
      'image-clickable': previewMode && linkUrl,
      'render-image--auto': !fixedRatio,
      'render-image--ratio': !!fixedRatio,
    }"
    :style="imageBoxStyle"
    @click="handleClick"
  >
    <img v-if="imageUrl" :src="imageUrl" alt="" class="single-image" />
    <div v-else class="image-placeholder">
      <span>📷</span>
      <em>{{ component.props.title || '图片' }}</em>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'
import { aspectRatioCss, normalizeAspectRatio } from '@/utils/image-aspect-ratio'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const imageUrl = computed(() =>
  normalizeUploadUrl(props.component.props?.image || props.component.props?.src || ''),
)

const linkUrl = computed(() => (props.component.props?.link_url || '').trim())

const aspectRatio = computed(() => normalizeAspectRatio(props.component.props?.aspect_ratio))
const fixedRatio = computed(() => aspectRatioCss(aspectRatio.value))

const imageBoxStyle = computed<Record<string, string>>(() => {
  const styleRadius = props.component.style?.border_radius
  const radius = styleRadius === undefined || styleRadius === null
    ? Number(props.component.props?.border_radius ?? 8)
    : Number(styleRadius)
  const style: Record<string, string> = {
    borderRadius: `${radius}px`,
  }
  if (fixedRatio.value) {
    style.aspectRatio = fixedRatio.value
  }
  return style
})

function handleClick() {
  if (!props.previewMode || !linkUrl.value) return
  const link = linkUrl.value
  const linkType = props.component.props?.link_type || 'page'
  if (linkType === 'url' || /^https?:\/\//i.test(link)) {
    window.open(/^https?:\/\//i.test(link) ? link : `https://${link}`, '_blank')
    return
  }
  ElMessage.info(`预览环境：小程序内将跳转「${link}」`)
}
</script>

<style lang="scss" scoped>
.render-image {
  width: 100%;
  overflow: hidden;
  background: #f1f5fb;

  &.image-clickable {
    cursor: pointer;
  }

  &.render-image--auto {
    height: auto;
    min-height: 120px;

    .single-image {
      width: 100%;
      height: auto;
      object-fit: contain;
    }
  }

  &.render-image--ratio {
    height: auto;

    .single-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .single-image {
    display: block;
  }

  .image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    height: 100%;
    color: #8a94a6;

    span {
      font-size: 30px;
      line-height: 1.2;
    }

    em {
      margin-top: 5px;
      font-size: 12px;
      font-style: normal;
    }
  }
}
</style>
