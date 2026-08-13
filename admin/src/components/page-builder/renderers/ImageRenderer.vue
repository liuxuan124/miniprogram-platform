<template>
  <div
    class="render-image"
    :class="{ 'image-clickable': previewMode && linkUrl }"
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

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

// 规范字段为 image，兼容旧数据的 src；修正历史保存的 localhost 上传地址
const imageUrl = computed(() =>
  normalizeUploadUrl(props.component.props?.image || props.component.props?.src || ''),
)

const linkUrl = computed(() => (props.component.props?.link_url || '').trim())

const imageBoxStyle = computed<Record<string, string>>(() => {
  // 样式面板里设置过圆角（含 0）时以其为准，未设置时才用组件默认值
  const styleRadius = props.component.style?.border_radius
  const radius = styleRadius === undefined || styleRadius === null
    ? Number(props.component.props?.border_radius ?? 8)
    : Number(styleRadius)
  return {
    borderRadius: `${radius}px`,
  }
})

/** 预览模式下点击图片：外链新开窗口；页面/小程序路径仅提示（真机小程序会真实跳转） */
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
  height: 150px;
  overflow: hidden;
  background: #f1f5fb;

  &.image-clickable {
    cursor: pointer;
  }

  .single-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
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
