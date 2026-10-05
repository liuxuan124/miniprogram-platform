<template>
  <el-dialog
    v-model="visible"
    title="1:1 裁切"
    width="720px"
    append-to-body
    align-center
    class="image-crop-dialog"
    destroy-on-close
  >
    <div class="crop-body">
      <div
        ref="stageRef"
        class="crop-stage"
        @mousedown="onDragStart"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onDragEnd"
      >
        <img
          v-if="imageSrc"
          class="crop-stage__img"
          :src="imageSrc"
          :style="imgStyle"
          alt=""
          draggable="false"
        />
        <div v-else class="crop-stage__loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在读取图片…</span>
        </div>
        <div v-if="imageSrc" class="crop-mask">
          <div class="crop-mask__ring" :style="ringStyle">
            <div class="crop-grid">
              <span /><span /><span />
              <span /><span class="crop-grid__center" /><span />
              <span /><span /><span />
            </div>
          </div>
        </div>
      </div>

      <div class="crop-side">
        <div class="crop-side__block">
          <div class="crop-side__label">输出尺寸</div>
          <div class="crop-side__value">{{ OUTPUT_SIZE }} × {{ OUTPUT_SIZE }}</div>
        </div>
        <el-slider
          v-model="zoom"
          :min="1"
          :max="3"
          :step="0.01"
          :show-tooltip="false"
          class="crop-zoom"
        />
        <div class="crop-side__hint">拖动图片调整取景，滚轮或滑块缩放</div>

        <el-divider class="crop-side__divider" />

        <div class="crop-side__label">压缩格式</div>
        <el-radio-group v-model="format" size="small">
          <el-radio-button value="image/webp">WebP（更小）</el-radio-button>
          <el-radio-button value="image/jpeg">JPEG（兼容性最好）</el-radio-button>
        </el-radio-group>
        <div class="crop-side__hint">
          预计输出约 {{ estimatedSizeText }}；WebP 通常比 JPEG 小 25%~35%，但个别老旧浏览器不支持。
        </div>

        <el-divider class="crop-side__divider" />

        <div class="crop-side__actions">
          <el-button class="ghost-btn" @click="visible = false">取消</el-button>
          <el-button
            class="ghost-btn"
            :disabled="!imageSrc"
            @click="resetTransform"
          >
            重置
          </el-button>
          <el-button
            class="primary-btn"
            type="primary"
            :loading="processing"
            :disabled="!imageSrc"
            @click="applyCrop"
          >
            裁切并上传
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

/** 取景区边长（px）：与主图建议尺寸一致，输出 1000 已足够清晰 */
const FRAME_SIZE = 360
const OUTPUT_SIZE = 1000

const props = defineProps<{
  modelValue: boolean
  /** 待裁切原图 URL */
  src: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  /** 裁切完成：把裁好的 File 交回给父组件去上传 */
  cropped: [File]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const imageSrc = ref('')
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const format = ref<'image/webp' | 'image/jpeg'>('image/webp')
const processing = ref(false)
const naturalW = ref(0)
const naturalH = ref(0)
const stageRef = ref<HTMLElement | null>(null)

let imgEl: HTMLImageElement | null = null
let dragging = false
let dragStartX = 0
let dragStartY = 0
let startOffsetX = 0
let startOffsetY = 0
let objectUrl = ''

/** 基准缩放：让图片刚好铺满取景框（cover），再叠加用户 zoom */
const baseScale = computed(() => {
  if (!naturalW.value || !naturalH.value) return 1
  return Math.max(FRAME_SIZE / naturalW.value, FRAME_SIZE / naturalH.value)
})

const displayScale = computed(() => baseScale.value * zoom.value)

const imgStyle = computed(() => ({
  width: `${naturalW.value}px`,
  height: `${naturalH.value}px`,
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${displayScale.value})`,
  transformOrigin: 'center center',
}))

const ringStyle = computed(() => ({
  width: `${FRAME_SIZE}px`,
  height: `${FRAME_SIZE}px`,
}))

/** 粗略估体积：按输出边长与格式的经验系数 */
const estimatedSizeText = computed(() => {
  const px = OUTPUT_SIZE * OUTPUT_SIZE
  const perPixel = format.value === 'image/webp' ? 0.09 : 0.13
  const kb = Math.round((px * perPixel) / 1024)
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`
})

/** 可平移范围：图片必须始终盖住取景框 */
function clampOffsets() {
  const dispW = naturalW.value * displayScale.value
  const dispH = naturalH.value * displayScale.value
  const maxX = Math.max(0, (dispW - FRAME_SIZE) / 2)
  const maxY = Math.max(0, (dispH - FRAME_SIZE) / 2)
  offsetX.value = Math.min(maxX, Math.max(-maxX, offsetX.value))
  offsetY.value = Math.min(maxY, Math.max(-maxY, offsetY.value))
}

watch(zoom, () => clampOffsets())

watch(
  () => props.src,
  (url) => {
    releaseObjectUrl()
    imageSrc.value = ''
    resetTransform()
    if (!url) return
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      imageSrc.value = url
      loadImage(url)
      return
    }
    // 跨域图片画布会被污染，加 anonymous 尽量拿到可导出的像素
    const proxied = url.startsWith('http')
      ? url.replace(/^http:\/\//, 'https://')
      : url
    imageSrc.value = proxied
    loadImage(proxied)
  },
  { immediate: true }
)

function loadImage(url: string) {
  imgEl = new Image()
  imgEl.crossOrigin = 'anonymous'
  imgEl.onload = () => {
    naturalW.value = imgEl!.naturalWidth
    naturalH.value = imgEl!.naturalHeight
    nextTick(clampOffsets)
  }
  imgEl.onerror = () => {
    ElMessage.error('图片读取失败，无法裁切')
  }
  imgEl.src = url
}

function resetTransform() {
  zoom.value = 1
  offsetX.value = 0
  offsetY.value = 0
}

function onDragStart(e: MouseEvent) {
  if (!imageSrc.value) return
  dragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  startOffsetX = offsetX.value
  startOffsetY = offsetY.value
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!dragging) return
  offsetX.value = startOffsetX + (e.clientX - dragStartX)
  offsetY.value = startOffsetY + (e.clientY - dragStartY)
  clampOffsets()
}

function onDragEnd() {
  if (!dragging) return
  dragging = false
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

function onTouchStart(e: TouchEvent) {
  if (!imageSrc.value || !e.touches[0]) return
  dragging = true
  dragStartX = e.touches[0].clientX
  dragStartY = e.touches[0].clientY
  startOffsetX = offsetX.value
  startOffsetY = offsetY.value
}

function onTouchMove(e: TouchEvent) {
  if (!dragging || !e.touches[0]) return
  offsetX.value = startOffsetX + (e.touches[0].clientX - dragStartX)
  offsetY.value = startOffsetY + (e.touches[0].clientY - dragStartY)
  clampOffsets()
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const next = zoom.value + (e.deltaY < 0 ? 0.08 : -0.08)
  zoom.value = Math.min(3, Math.max(1, Number(next.toFixed(2))))
}

async function applyCrop() {
  if (!imageSrc.value || !naturalW.value || !naturalH.value) return
  processing.value = true
  try {
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器不支持 canvas')

    // 取景框中心对应的原图坐标
    const scale = displayScale.value
    const centerX = naturalW.value / 2 - offsetX.value / scale
    const centerY = naturalH.value / 2 - offsetY.value / scale
    const cropSide = FRAME_SIZE / scale
    const sx = Math.max(0, centerX - cropSide / 2)
    const sy = Math.max(0, centerY - cropSide / 2)
    const sw = Math.min(cropSide, naturalW.value - sx)
    const sh = Math.min(cropSide, naturalH.value - sy)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(imgEl!, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

    const blob = await new Promise<Blob | null>((resolve) => {
      // WebP 兼容性：探测不支持时回落 JPEG，避免产出前端认不出的格式
      canvas.toBlob(resolve, format.value, 0.9)
    })
    if (!blob) {
      // 浏览器不支持 webp 编码时 toBlob 会返回 null，回落 jpeg 再试一次
      const fallback = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!fallback) throw new Error('裁切失败：浏览器无法编码图片')
      emitCrop(new File([fallback], 'crop.jpg', { type: 'image/jpeg' }))
      return
    }
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    emitCrop(new File([blob], `crop.${ext}`, { type: blob.type }))
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('SecurityError') || msg.includes('tainted')) {
      ElMessage.error('该图片来自跨域源，浏览器禁止导出画布。请改用「批量上传」或「URL 转存」')
    } else {
      ElMessage.error(msg || '裁切失败')
    }
  } finally {
    processing.value = false
  }
}

function emitCrop(file: File) {
  emit('cropped', file)
  visible.value = false
}

function releaseObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }
}

onBeforeUnmount(() => {
  releaseObjectUrl()
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
})
</script>

<style scoped lang="scss">
.crop-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 20px;
  align-items: start;
}

.crop-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 420px;
  overflow: hidden;
  border-radius: 10px;
  background: #1f2023;
  cursor: grab;
  user-select: none;
}

.crop-stage:active {
  cursor: grabbing;
}

.crop-stage__img {
  position: absolute;
  max-width: none;
  pointer-events: none;
}

.crop-stage__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #a8abb3;
  font-size: 13px;
}

.crop-stage__loading .el-icon {
  font-size: 24px;
}

.crop-mask {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, .55);
  pointer-events: none;
}

.crop-mask__ring {
  position: relative;
  border: 2px solid #fff;
  border-radius: 4px;
  box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0);
}

.crop-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.crop-grid span {
  border-right: 1px solid rgba(255, 255, 255, .45);
  border-bottom: 1px solid rgba(255, 255, 255, .45);
}

.crop-grid span:nth-child(3n) {
  border-right: 0;
}

.crop-grid span:nth-child(n + 7) {
  border-bottom: 0;
}

.crop-grid__center {
  position: relative;
  border-right: 0 !important;
  border-bottom: 0 !important;
}

.crop-grid__center::before,
.crop-grid__center::after {
  position: absolute;
  background: rgba(255, 255, 255, .8);
  content: '';
}

.crop-grid__center::before {
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
}

.crop-grid__center::after {
  top: 0;
  left: 50%;
  width: 1px;
  height: 100%;
}

.crop-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crop-side__block {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--bg-page, #f5f7fa);
}

.crop-side__label {
  color: var(--text-muted, #909399);
  font-size: 12px;
}

.crop-side__value {
  margin-top: 2px;
  color: var(--text, #303133);
  font-size: 15px;
  font-weight: 700;
}

.crop-side__hint {
  color: var(--text-muted, #909399);
  font-size: 12px;
  line-height: 1.6;
}

.crop-side__divider {
  margin: 4px 0;
}

.crop-side__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 760px) {
  .crop-body {
    grid-template-columns: 1fr;
  }
}
</style>
