<template>
  <div
    class="preview-phone"
    :class="sizeClass"
    :style="{ '--phone-w': phoneWidth }"
  >
    <div class="preview-phone__notch" aria-hidden="true">
      <span class="preview-phone__speaker" />
    </div>
    <div ref="viewportRef" class="preview-phone__viewport">
      <iframe
        :key="iframeKey"
        :src="src"
        :title="title"
        width="375"
        height="812"
        loading="lazy"
        @load="onIframeLoad"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const LOGICAL_W = 375

const props = withDefaults(
  defineProps<{
    src: string
    title?: string
    size?: 'default' | 'lg' | 'sm'
    iframeKey?: string
  }>(),
  {
    title: '小程序预览',
    size: 'default',
    iframeKey: '',
  },
)

const sizeClass = computed(() => {
  if (props.size === 'lg') return 'preview-phone--lg'
  if (props.size === 'sm') return 'preview-phone--sm'
  return ''
})

const phoneWidth = computed(() => {
  if (props.size === 'lg') return '320px'
  if (props.size === 'sm') return '210px'
  return '250px'
})

const viewportRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

function updateScale() {
  const el = viewportRef.value
  if (!el) return
  const w = el.clientWidth
  if (w <= 0) return
  el.style.setProperty('--scale', String(w / LOGICAL_W))
}

function onIframeLoad() {
  nextTick(updateScale)
}

watch(
  () => props.src,
  () => {
    nextTick(updateScale)
  },
)

watch(
  () => props.iframeKey,
  () => {
    nextTick(updateScale)
  },
)

watch(
  viewportRef,
  (el, _prev, onCleanup) => {
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => updateScale())
    }
    if (el) {
      resizeObserver.observe(el)
      updateScale()
    }
    onCleanup(() => {
      if (el) resizeObserver?.unobserve(el)
    })
  },
  { flush: 'post' },
)

onMounted(() => {
  nextTick(updateScale)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style scoped lang="scss">
.preview-phone {
  --phone-w: 250px;
  width: var(--phone-w);
  aspect-ratio: 375 / 812;
  box-sizing: border-box;
  border: calc(var(--phone-w) * 9 / 250) solid #1e1611;
  border-radius: calc(var(--phone-w) * 34 / 250);
  background: #fffbf6;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  max-width: 100%;
}

.preview-phone--lg {
  --phone-w: 320px;
}

.preview-phone--sm {
  --phone-w: 210px;
}

.preview-phone__notch {
  flex-shrink: 0;
  height: calc(var(--phone-w) * 22 / 250);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-phone__speaker {
  display: block;
  width: calc(var(--phone-w) * 72 / 250);
  height: calc(var(--phone-w) * 6 / 250);
  border-radius: 999px;
  background: #2a221c;
  opacity: 0.85;
}

.preview-phone__viewport {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  width: 100%;
}

.preview-phone__viewport iframe {
  width: 375px;
  height: 812px;
  border: 0;
  position: absolute;
  top: 0;
  left: 0;
  transform: scale(var(--scale, 0.5));
  transform-origin: top left;
  background: #fffbf6;
  display: block;
}
</style>
