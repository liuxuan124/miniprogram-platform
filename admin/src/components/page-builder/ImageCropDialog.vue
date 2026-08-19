<template>
  <el-dialog
    v-model="visibleModel"
    title="裁剪图片"
    width="560px"
    destroy-on-close
    append-to-body
    @closed="onClosed"
  >
    <div v-if="loading" class="crop-loading">{{ loadingText }}</div>
    <div v-else-if="loadError" class="crop-loading crop-loading--error">{{ loadError }}</div>
    <div
      v-else
      ref="stageRef"
      class="crop-stage"
      @mousedown.prevent="onPointerDown"
      @mousemove="onPointerMove"
      @mouseup="onPointerUp"
      @mouseleave="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <img
        ref="imgRef"
        :src="displaySrc"
        class="crop-source"
        :style="imgStyle"
        draggable="false"
      />
      <div class="crop-overlay">
        <div class="crop-frame" :style="frameStyle" />
      </div>
    </div>
    <div v-if="imageLoaded" class="crop-tools">
      <span class="crop-tools__label">缩放</span>
      <el-slider v-model="scale" :min="minScale" :max="maxScale" :step="0.01" @input="clampOffset" />
      <span class="crop-tools__hint">拖动图片调整取景</span>
    </div>
    <template #footer>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button
        type="primary"
        :loading="exporting"
        :disabled="!imageLoaded || !!loadError"
        @click="confirmCrop"
      >
        确认裁剪
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { parseAspectRatio } from '@/utils/image-aspect-ratio'
import { fetchImageBlob, loadImageFromUrl } from '@/utils/crop-image'

const props = defineProps<{
  visible: boolean
  src: string
  aspectRatio: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [blob: Blob]
}>()

const visibleModel = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

const stageRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const cropImageEl = ref<HTMLImageElement | null>(null)
const displaySrc = ref('')
const objectUrl = ref('')
const imageLoaded = ref(false)
const loading = ref(false)
const loadingText = ref('图片加载中…')
const loadError = ref('')
const exporting = ref(false)

const STAGE_W = 480
const STAGE_H = 320

const naturalW = ref(0)
const naturalH = ref(0)
const scale = ref(1)
const minScale = ref(0.2)
const maxScale = ref(3)
const offsetX = ref(0)
const offsetY = ref(0)
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0, ox: 0, oy: 0 })

const ratio = computed(() => parseAspectRatio(props.aspectRatio) ?? 16 / 9)

const frameSize = computed(() => {
  const r = ratio.value
  let w = STAGE_W - 48
  let h = w / r
  if (h > STAGE_H - 48) {
    h = STAGE_H - 48
    w = h * r
  }
  return { w, h }
})

const frameStyle = computed(() => {
  const { w, h } = frameSize.value
  return {
    width: `${w}px`,
    height: `${h}px`,
  }
})

const imgStyle = computed(() => {
  const w = naturalW.value * scale.value
  const h = naturalH.value * scale.value
  return {
    width: `${w}px`,
    height: `${h}px`,
    transform: `translate(calc(-50% + ${offsetX.value}px), calc(-50% + ${offsetY.value}px))`,
  }
})

function revokeObjectUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
  }
}

function resetState() {
  imageLoaded.value = false
  cropImageEl.value = null
  displaySrc.value = ''
  loadError.value = ''
  naturalW.value = 0
  naturalH.value = 0
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  dragging.value = false
}

function onClosed() {
  revokeObjectUrl()
  resetState()
  loading.value = false
}

async function prepareCropImage(src: string) {
  resetState()
  revokeObjectUrl()
  loading.value = true
  loadingText.value = '图片加载中…'
  try {
    const blob = await fetchImageBlob(src)
    const localUrl = URL.createObjectURL(blob)
    objectUrl.value = localUrl
    displaySrc.value = localUrl
    const img = await loadImageFromUrl(localUrl)
    cropImageEl.value = img
    naturalW.value = img.naturalWidth
    naturalH.value = img.naturalHeight
    imageLoaded.value = true
    fitInitial()
  } catch (e: any) {
    loadError.value = e?.message || '图片加载失败'
  } finally {
    loading.value = false
  }
}

function fitInitial() {
  const { w: fw, h: fh } = frameSize.value
  const nw = naturalW.value
  const nh = naturalH.value
  if (!nw || !nh) return
  const coverScale = Math.max(fw / nw, fh / nh)
  scale.value = coverScale
  minScale.value = coverScale * 0.5
  maxScale.value = coverScale * 4
  offsetX.value = 0
  offsetY.value = 0
}

function clampOffset() {
  const { w: fw, h: fh } = frameSize.value
  const iw = naturalW.value * scale.value
  const ih = naturalH.value * scale.value
  const maxX = Math.max(0, (iw - fw) / 2)
  const maxY = Math.max(0, (ih - fh) / 2)
  offsetX.value = Math.max(-maxX, Math.min(maxX, offsetX.value))
  offsetY.value = Math.max(-maxY, Math.min(maxY, offsetY.value))
}

function onPointerDown(e: MouseEvent) {
  dragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY, ox: offsetX.value, oy: offsetY.value }
}

function onPointerMove(e: MouseEvent) {
  if (!dragging.value) return
  offsetX.value = dragStart.value.ox + (e.clientX - dragStart.value.x)
  offsetY.value = dragStart.value.oy + (e.clientY - dragStart.value.y)
  clampOffset()
}

function onPointerUp() {
  dragging.value = false
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  scale.value = Math.max(minScale.value, Math.min(maxScale.value, scale.value * (1 + delta)))
  clampOffset()
}

async function confirmCrop() {
  const img = cropImageEl.value
  if (!img || !naturalW.value || !naturalH.value) {
    ElMessage.warning('图片尚未就绪')
    return
  }
  exporting.value = true
  try {
    const blob = await exportCrop(img)
    emit('confirm', blob)
    visibleModel.value = false
  } catch (e: any) {
    ElMessage.error(e?.message || '裁剪失败，请重试')
  } finally {
    exporting.value = false
  }
}

function exportCrop(img: HTMLImageElement): Promise<Blob> {
  const { w: fw, h: fh } = frameSize.value
  const iw = naturalW.value * scale.value
  const ih = naturalH.value * scale.value
  const frameLeft = (STAGE_W - fw) / 2
  const frameTop = (STAGE_H - fh) / 2
  const imageLeft = STAGE_W / 2 - iw / 2 + offsetX.value
  const imageTop = STAGE_H / 2 - ih / 2 + offsetY.value

  let sx = (frameLeft - imageLeft) / scale.value
  let sy = (frameTop - imageTop) / scale.value
  let sw = fw / scale.value
  let sh = fh / scale.value

  sx = Math.max(0, Math.min(naturalW.value - 1, sx))
  sy = Math.max(0, Math.min(naturalH.value - 1, sy))
  sw = Math.min(sw, naturalW.value - sx)
  sh = Math.min(sh, naturalH.value - sy)

  const outW = Math.max(1, Math.round(sw))
  const outH = Math.max(1, Math.round(sh))
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('无法创建画布'))
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), 'image/jpeg', 0.92)
  })
}

watch(
  () => [props.visible, props.src] as const,
  ([open, src]) => {
    if (open && src) {
      prepareCropImage(src)
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.crop-loading {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a94a6;
  font-size: 13px;

  &--error {
    color: #e53935;
    padding: 0 24px;
    text-align: center;
  }
}

.crop-stage {
  position: relative;
  width: 480px;
  height: 320px;
  margin: 0 auto;
  overflow: hidden;
  background: #111827;
  border-radius: 8px;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
}

.crop-source {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center center;
  pointer-events: none;
}

.crop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.crop-frame {
  box-shadow: 0 0 0 9999px rgb(0 0 0 / 45%);
  border: 2px solid #fff;
  border-radius: 2px;
}

.crop-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 0 4px;

  .el-slider {
    flex: 1;
  }

  &__label,
  &__hint {
    font-size: 12px;
    color: #8a94a6;
    white-space: nowrap;
  }
}
</style>
