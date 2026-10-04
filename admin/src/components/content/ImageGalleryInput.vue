<template>
  <div class="img-gallery">
    <!-- 轨道：可用鼠标横向拖动 / 滚轮 / 触摸板滑动 -->
    <div ref="trackRef" class="img-gallery__track" @wheel.prevent="onWheel">
      <div
        v-for="(url, idx) in images"
        :key="`${url}-${idx}`"
        class="img-gallery__slide"
        :draggable="images.length > 1"
        @dragstart="onDragStart(idx)"
        @dragover.prevent="onDragOver(idx)"
        @drop.prevent="onDrop(idx)"
        @dragend="onDragEnd"
      >
        <img :src="normalizePreviewUrl(url)" alt="" draggable="false" />

        <span class="img-gallery__ord">{{ idx + 1 }}</span>

        <!-- 删除：右上角圆形图标，hover 才显形，不占布局 -->
        <button
          type="button"
          class="img-gallery__del"
          :aria-label="`删除第 ${idx + 1} 张`"
          @click.stop="onRemove(idx)"
        >✕</button>

        <!-- 拖拽把手 -->
        <span v-if="images.length > 1" class="img-gallery__grip" title="按住拖动可排序">⋮⋮</span>
      </div>

      <div v-if="canAdd" class="img-gallery__add">
        <label class="img-gallery__add-main">
          <span class="img-gallery__addplus">+</span>
          <span class="img-gallery__addtext">{{ uploading ? '上传中…' : '添加图片' }}</span>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden :disabled="uploading" @change="onPick" />
        </label>
        <button
          type="button"
          class="img-gallery__add-asset"
          :disabled="uploading"
          @click="emit('pick-asset')"
        >素材库</button>
      </div>
    </div>

    <div class="img-gallery__bar">
      <span class="img-gallery__tip">横向拖动查看 · 按住可拖动排序，第一张即封面</span>
      <span class="img-gallery__count">{{ images.length }} / {{ max }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizePreviewMediaUrl } from '@/utils/content-preview'

const props = withDefaults(
  defineProps<{
    images: string[]
    max?: number
    uploading?: boolean
  }>(),
  { max: 9, uploading: false },
)

const emit = defineEmits<{
  (e: 'remove', index: number): void
  (e: 'reorder', from: number, to: number): void
  (e: 'pick', file: File): void
  (e: 'pick-asset'): void
}>()

const trackRef = ref<HTMLElement | null>(null)
/** 拖拽排序：记录源index，drop 时换位 */
const dragFrom = ref<number | null>(null)

function normalizePreviewUrl(url: string) {
  return normalizePreviewMediaUrl(url)
}

function onWheel(e: WheelEvent) {
  //纵向滚轮改为横向滑动，符合「左右拖拉」直觉
  const el = trackRef.value
  if (!el) return
  const absX = Math.abs(e.deltaX)
  const absY = Math.abs(e.deltaY)
  if (absY <= absX) return
  el.scrollLeft += e.deltaY
}

function onDragStart(index: number) {
  dragFrom.value = index
}

function onDragOver(index: number) {
  // 拖到谁头上，谁就高亮为落点
  const el = trackRef.value
  if (!el) return
  const slides = [...el.querySelectorAll<HTMLElement>('.img-gallery__slide')]
  slides.forEach((s, i) => s.classList.toggle('is-droptarget', i === index && dragFrom.value !== index))
}

function onDrop(index: number) {
  const from = dragFrom.value
  dragFrom.value = null
  if (from === null || from === index) return
  emit('reorder', from, index)
}

function onDragEnd() {
  dragFrom.value = null
  const el = trackRef.value
  if (!el) return
  ;[...el.querySelectorAll('.is-droptarget')].forEach(s => s.classList.remove('is-droptarget'))
}

function onRemove(index: number) {
  emit('remove', index)
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  emit('pick', file)
}

const canAdd = computed(() => props.images.length < props.max)
</script>

<style lang="scss" scoped>
.img-gallery {
  width: 100%;
}

/* 轨道：固定单张宽度 + 横向滚动，每张严格 3:4。
   宽度不设死 max-width —— 跟随所在表单项的内容区（与下方正文文本框右边界对齐），
   靠单图尺寸控制一屏可见张数，越界即横向滚动 */
.img-gallery__track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  padding: 4px 2px 10px;
  scroll-snap-type: x proximity;
  cursor: grab;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--text-muted, #94a3b8) 45%, transparent) transparent;

  &:active {
    cursor: grabbing;
  }

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-muted, #94a3b8) 40%, transparent);
  }
  &::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--text-muted, #94a3b8) 62%, transparent);
  }
}

.img-gallery__slide {
  position: relative;
  flex: 0 0 auto;
  /* 小红书笔记图是 3:4 竖图，保持同比例 + object-fit:contain 完整不裁切。
     140×187 是「能认清版式」与「不挡正文」之间的折中：
     更小看不清排版，更大就把下方正文挤出视野。
     完整效果交给右侧「小红书预览」看 */
  width: 140px;
  aspect-ratio: 3 / 4;
  border-radius: 10px;
  overflow: hidden;
  background: color-mix(in srgb, var(--text, #172033) 4%, #fff);
  border: 1px solid var(--border, #e3e8f0);
  scroll-snap-align: start;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--brand, #002fa7) 45%, var(--border, #e3e8f0));
    box-shadow: 0 4px 14px color-mix(in srgb, var(--text, #172033) 12%, transparent);
  }

  &.is-droptarget {
    border-color: var(--brand, #002fa7);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 20px color-mix(in srgb, var(--brand, #002fa7) 22%, transparent);
  }

  img {
    width: 100%;
    height: 100%;
    /* contain：完整显示整张图，不裁切不压扁 */
    object-fit: contain;
    display: block;
    background: color-mix(in srgb, var(--text, #172033) 3%, #fff);
  }
}

.img-gallery__ord {
  position: absolute;
  right: 5px;
  bottom: 5px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

/* 删除：圆形图标按钮，hover 才现形 */
.img-gallery__del {
  position: absolute;
  right: 4px;
  top: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  font-size: 11px;
  line-height: 1;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s ease, background 0.18s ease;

  &:hover {
    background: var(--el-color-danger, #ef4444);
  }
  &:focus-visible {
    opacity: 1;
  }
}

.img-gallery__slide:hover .img-gallery__del,
.img-gallery__slide:focus-within .img-gallery__del {
  opacity: 1;
}

/* 拖拽把手 */
.img-gallery__grip {
  position: absolute;
  left: 5px;
  bottom: 5px;
  font-size: 11px;
  letter-spacing: -2px;
  color: #fff;
  opacity: 0;
  cursor: grab;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  transition: opacity 0.18s ease;
}

.img-gallery__slide:hover .img-gallery__grip {
  opacity: 0.9;
}

/* 添加卡：与图片同尺寸。卡内分两层：主体点按=本地上传，底部胶囊=素材库选择 */
.img-gallery__add {
  flex: 0 0 auto;
  width: 140px;
  aspect-ratio: 3 / 4;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--text-muted, #94a3b8) 55%, transparent);
  background: color-mix(in srgb, var(--text, #172033) 2.5%, transparent);
  color: var(--text-muted, #94a3b8);
  overflow: hidden;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;

  &:hover {
    border-color: var(--brand, #002fa7);
    color: var(--brand, #002fa7);
    background: color-mix(in srgb, var(--brand, #002fa7) 5%, transparent);
  }
}

.img-gallery__add-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: inherit;
}

.img-gallery__add-asset {
  flex: 0 0 auto;
  margin: 0 14px 10px;
  padding: 3px 0;
  font-size: 12px;
  line-height: 1.4;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--text-muted, #94a3b8) 40%, transparent);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;

  &:hover:not(:disabled) {
    border-color: var(--brand, #002fa7);
    background: color-mix(in srgb, var(--brand, #002fa7) 8%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.img-gallery__addplus {
  font-size: 22px;
  line-height: 1;
  font-weight: 300;
}

.img-gallery__addtext {
  font-size: 12px;
}

.img-gallery__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}

.img-gallery__tip {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}

.img-gallery__count {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
}
</style>
