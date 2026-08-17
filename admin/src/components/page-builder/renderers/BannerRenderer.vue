<template>
  <div class="render-banner" :class="{ 'render-banner--preview': previewMode }">
    <div
      v-if="previewMode && hasValidBannerImage"
      class="banner-image-wrap"
      :class="{ 'banner-clickable': currentBannerLink }"
      :style="bannerWrapStyle"
      @click="handleBannerClick"
    >
      <img :src="displayBannerImage" alt="" class="banner-image" @error="onBannerImageError" />
      <div v-if="bannerImages.length > 1" class="banner-dots">
        <span
          v-for="(_, idx) in bannerImages"
          :key="`dot-${idx}`"
          :class="{ on: idx === activeBannerIndex }"
        ></span>
      </div>
    </div>

    <div
      v-else-if="previewMode"
      class="banner-fallback"
      :class="{ 'banner-clickable': currentBannerLink }"
      :style="bannerWrapStyle"
      @click="handleBannerClick"
    >
      <div class="banner-orb"></div>
      <div class="banner-title">{{ currentBannerTitle }}</div>
      <div class="banner-subtitle">点击了解</div>
      <div v-if="bannerImages.length > 1" class="banner-dots">
        <span
          v-for="(_, idx) in bannerImages"
          :key="`dot-${idx}`"
          :class="{ on: idx === activeBannerIndex }"
        ></span>
      </div>
    </div>

    <div v-else class="banner-content" :style="bannerContentStyle">
      <div class="banner-title">{{ currentBannerTitle }}</div>
      <div class="banner-subtitle">点击了解</div>
      <div class="banner-dots">
        <span
          v-for="(_, idx) in bannerImages"
          :key="`dot-${idx}`"
          :class="{ on: idx === activeBannerIndex }"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

type BannerImage = {
  title?: string
  image?: string
  link_type?: string
  link_url?: string
}

const activeBannerIndex = ref(0)
const brokenBannerImages = ref<Record<string, boolean>>({})
let bannerTimer: ReturnType<typeof setInterval> | null = null

const bannerImages = computed<BannerImage[]>(() => {
  const images = props.component.props?.images
  if (Array.isArray(images) && images.length > 0) return images
  if (props.previewMode) return [{ title: props.component.props?.title || '会员福利专区', image: '' }]
  return [{ title: '五一活动限时优惠', image: '' }]
})

const currentBanner = computed<BannerImage>(() => {
  return bannerImages.value[activeBannerIndex.value] || bannerImages.value[0] || { title: '五一活动限时优惠' }
})

const currentBannerTitle = computed(() => currentBanner.value.title || '五一活动限时优惠')

function isImageUrl(value?: string) {
  if (!value) return false
  const text = value.trim()
  if (text.startsWith('http') || text.startsWith('//')) return true
  return text.startsWith('/') && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(text)
}

const hasValidBannerImage = computed(() => {
  const image = currentBanner.value.image || ''
  const placeholder = String(props.component.props?.image_error_placeholder || '').trim()
  return (isImageUrl(image) && !brokenBannerImages.value[image]) || isImageUrl(placeholder)
})

const displayBannerImage = computed(() => {
  const image = currentBanner.value.image || ''
  if (image && !brokenBannerImages.value[image] && isImageUrl(image)) return image
  return String(props.component.props?.image_error_placeholder || '').trim()
})

function onBannerImageError() {
  const image = currentBanner.value.image
  if (!image) return
  brokenBannerImages.value = { ...brokenBannerImages.value, [image]: true }
}

const currentBannerLink = computed(() => (currentBanner.value.link_url || '').trim())

/** 预览模式下点击轮播图：外链新开窗口；页面/小程序路径在预览环境仅提示（真机小程序会真实跳转） */
function handleBannerClick() {
  if (!props.previewMode) return
  const link = currentBannerLink.value
  if (!link) return
  const linkType = currentBanner.value.link_type || 'page'
  if (linkType === 'url' || /^https?:\/\//i.test(link)) {
    window.open(/^https?:\/\//i.test(link) ? link : `https://${link}`, '_blank')
    return
  }
  ElMessage.info(`预览环境：小程序内将跳转「${link}」`)
}

const bannerRadius = computed(() => {
  // 样式面板里设置过圆角（含 0）时以其为准，未设置时才用组件默认值
  const styleRadius = props.component.style?.border_radius
  if (styleRadius === undefined || styleRadius === null) {
    return Number(props.component.props?.border_radius ?? 8)
  }
  return Number(styleRadius)
})

const bannerWrapStyle = computed<Record<string, string>>(() => ({
  borderRadius: `${bannerRadius.value}px`,
}))

const bannerContentStyle = computed<Record<string, string>>(() => {
  const image = currentBanner.value.image || ''
  return {
    borderRadius: `${bannerRadius.value}px`,
    backgroundImage: image
      ? `linear-gradient(135deg, rgba(23, 105, 255, 0.28), rgba(32, 183, 255, 0.28)), url(${image})`
      : 'linear-gradient(135deg, var(--theme-primary, #1769ff), var(--theme-secondary, #20b7ff))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
})

function clearBannerTimer() {
  if (!bannerTimer) return
  clearInterval(bannerTimer)
  bannerTimer = null
}

function restartBannerAutoplay() {
  clearBannerTimer()
  if (props.component.props?.autoplay === false) return
  const images = bannerImages.value
  if (images.length <= 1) return
  const interval = Math.max(Number(props.component.props?.interval || 3000), 1000)
  bannerTimer = setInterval(() => {
    activeBannerIndex.value = (activeBannerIndex.value + 1) % images.length
  }, interval)
}

watch(
  () => [
    props.component.props?.autoplay,
    props.component.props?.interval,
    JSON.stringify(props.component.props?.images || []),
  ],
  () => {
    if (activeBannerIndex.value >= bannerImages.value.length) {
      activeBannerIndex.value = 0
    }
    restartBannerAutoplay()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearBannerTimer()
})
</script>

<style lang="scss" scoped>
.render-banner {
  padding: 0;

  &.render-banner--preview {
    padding: 0;
  }

  .banner-image-wrap,
  .banner-fallback,
  .banner-content {
    position: relative;
    height: 145px;
    overflow: hidden;
  }

  .banner-clickable {
    cursor: pointer;
  }

  .banner-image-wrap {
    background: #eef2f7;

    .banner-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .banner-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    text-align: center;
    background: linear-gradient(135deg, var(--theme-primary, #1d73ff) 0%, var(--theme-secondary, #25b9f6) 100%);
  }

  .banner-orb {
    position: absolute;
    right: -30px;
    top: -35px;
    width: 110px;
    height: 110px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
  }

  .banner-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    text-align: center;

    &::after {
      position: absolute;
      right: -30px;
      top: -35px;
      width: 110px;
      height: 110px;
      content: '';
      background: rgba(255, 255, 255, 0.14);
      border-radius: 999px;
    }
  }

  .banner-title {
    position: relative;
    z-index: 1;
    margin-bottom: 4px;
    font-size: 15px;
    font-weight: 800;
  }

  .banner-subtitle {
    position: relative;
    z-index: 1;
    font-size: 12px;
    opacity: 0.88;
    font-weight: 600;
  }

  .banner-dots {
    position: absolute;
    bottom: 10px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 4px;
    z-index: 2;

    span {
      width: 5px;
      height: 5px;
      background: rgba(255, 255, 255, 0.55);
      border-radius: 99px;

      &.on {
        width: 14px;
        background: #fff;
      }
    }
  }
}
</style>
