<template>
  <div class="render-banner">
    <div class="banner-content" :style="bannerContentStyle">
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
}

const activeBannerIndex = ref(0)
let bannerTimer: ReturnType<typeof setInterval> | null = null

const bannerImages = computed<BannerImage[]>(() => {
  const images = props.component.props?.images
  if (Array.isArray(images) && images.length > 0) return images
  return [{ title: '五一活动限时优惠', image: '' }]
})

const currentBanner = computed<BannerImage>(() => {
  return bannerImages.value[activeBannerIndex.value] || bannerImages.value[0] || { title: '五一活动限时优惠' }
})

const currentBannerTitle = computed(() => currentBanner.value.title || '五一活动限时优惠')

const bannerContentStyle = computed<Record<string, string>>(() => {
  const styleRadius = Number(props.component.style?.border_radius ?? 0)
  const propRadius = Number(props.component.props?.border_radius ?? 8)
  const radius = styleRadius > 0 ? styleRadius : propRadius
  const image = currentBanner.value.image || ''
  return {
    borderRadius: `${radius}px`,
    backgroundImage: image
      ? `linear-gradient(135deg, rgba(23, 105, 255, 0.28), rgba(32, 183, 255, 0.28)), url(${image})`
      : 'linear-gradient(135deg, #1769ff, #20b7ff)',
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
  padding: 10px;

  .banner-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 145px;
    overflow: hidden;
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
    opacity: 0.85;
  }

  .banner-dots {
    position: absolute;
    bottom: 10px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 4px;

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
