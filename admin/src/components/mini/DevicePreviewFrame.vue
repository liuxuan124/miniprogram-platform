<template>
  <div ref="shellRef" class="device-frame" :style="shellStyle">
    <div class="device-frame__forehead" aria-hidden="true">
      <div class="device-frame__island" />
    </div>
    <div ref="screenRef" class="device-frame__screen">
      <iframe
        :key="`${iframeKey}|${src}`"
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
const LOGICAL_H = 812
const MIN_SCALE = 0.72
const BEZEL = 9

const props = withDefaults(
  defineProps<{
    src: string
    title?: string
    iframeKey?: string
  }>(),
  {
    title: '小程序预览',
    iframeKey: 'preview',
  },
)

const shellRef = ref<HTMLElement | null>(null)
const screenRef = ref<HTMLElement | null>(null)
const scale = ref(MIN_SCALE)
const shellWidth = ref(280)

let resizeObserver: ResizeObserver | null = null

const shellStyle = computed(() => ({
  width: `${shellWidth.value}px`,
  '--shell-w': `${shellWidth.value}px`,
}))

function updateScale() {
  const shell = shellRef.value
  const screen = screenRef.value
  if (!shell || !screen) return
  const outerW = shell.clientWidth
  if (outerW <= 0) return
  const innerW = Math.max(0, outerW - BEZEL * 2)
  const nextScale = Math.max(MIN_SCALE, innerW / LOGICAL_W)
  scale.value = nextScale
  const scaledH = LOGICAL_H * nextScale
  screen.style.height = `${scaledH}px`
  screen.style.setProperty('--device-scale', String(nextScale))
}

function measureShellWidth() {
  const shell = shellRef.value
  if (!shell?.parentElement) return
  const parentW = shell.parentElement.clientWidth
  if (parentW <= 0) return
  const clamped = Math.min(300, parentW)
  shellWidth.value = clamped >= 280 ? Math.min(300, Math.max(280, clamped)) : Math.max(136, clamped)
  nextTick(updateScale)
}

function onIframeLoad() {
  nextTick(updateScale)
}

watch(
  () => [props.src, props.iframeKey] as const,
  () => nextTick(updateScale),
)

watch(shellRef, (el, _prev, onCleanup) => {
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      measureShellWidth()
    })
  }
  if (el?.parentElement) {
    resizeObserver.observe(el.parentElement)
    measureShellWidth()
  }
  onCleanup(() => {
    if (el?.parentElement) resizeObserver?.unobserve(el.parentElement)
  })
}, { flush: 'post' })

onMounted(() => {
  nextTick(() => {
    measureShellWidth()
    updateScale()
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style scoped lang="scss">
.device-frame {
  --shell-w: 280px;
  box-sizing: border-box;
  margin: 0 auto;
  max-width: 100%;
  border: 9px solid #1e1611;
  border-radius: 34px;
  background: #1e1611;
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.device-frame__forehead {
  flex-shrink: 0;
  height: calc(var(--shell-w) * 32 / 280);
  min-height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1611;
}

.device-frame__island {
  width: calc(var(--shell-w) * 72 / 280);
  min-width: 52px;
  max-width: 88px;
  height: calc(var(--shell-w) * 20 / 280);
  min-height: 14px;
  max-height: 24px;
  border-radius: 999px;
  background: #0a0705;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.device-frame__screen {
  position: relative;
  width: 100%;
  margin: 0 auto;
  overflow: hidden;
  background: #fffbf6;
  border-radius: 0 0 22px 22px;
}

.device-frame__screen iframe {
  width: 375px;
  height: 812px;
  border: 0;
  position: absolute;
  top: 0;
  left: 50%;
  margin-left: calc(-375px / 2);
  transform: scale(var(--device-scale, 0.72));
  transform-origin: top center;
  background: #fffbf6;
  display: block;
}
</style>
