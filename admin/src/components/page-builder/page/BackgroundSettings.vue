<template>
  <div class="bgs">
    <div class="fld">
      <el-radio-group
        :model-value="model.type"
        size="small"
        @update:model-value="(v: string) => onTypeChange(v as any)"
      >
        <el-radio-button value="solid">纯色</el-radio-button>
        <el-radio-button value="gradient">渐变</el-radio-button>
        <el-radio-button value="image">背景图</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 纯色 -->
    <div v-if="model.type === 'solid'" class="fld">
      <span class="fld__lab">底色</span>
      <ColorInputRow
        :model-value="solidColor"
        aria-label="页面底色"
        @update:model-value="(v: string | null) => patch({ type: 'solid', color: v || '' })"
      />
    </div>

    <!-- 渐变 -->
    <template v-else-if="model.type === 'gradient'">
      <CompactSliderRow
        label="渐变角度"
        hint="0° 从下到上，90° 从左到右。"
        :model-value="angle"
        :min="0" :max="360" :step="1" unit="°"
        @update:model-value="(v: number) => patchStop(0, { offset: v })"
      />
      <div v-for="(stop, i) in stops" :key="i" class="stop">
        <span class="stop__idx">{{ i + 1 }}</span>
        <ColorInputRow
          :model-value="stop.color"
          :aria-label="`色标 ${i + 1}`"
          @update:model-value="(v: string | null) => patchStop(i, { color: v || '' })"
        />
        <CompactSliderRow
          label="位置"
          :model-value="stop.offset"
          :min="0" :max="100" :step="1" unit="%"
          @update:model-value="(v: number) => patchStop(i, { offset: v })"
        />
        <el-button
          v-if="stops.length > 2"
          text size="small" type="danger"
          @click="removeStop(i)"
        >删</el-button>
      </div>
      <el-button size="small" :disabled="stops.length >= 5" @click="addStop">+ 添加色标</el-button>
    </template>

    <!-- 背景图 -->
    <template v-else>
      <div class="img-prev" :style="previewStyle">
        <img v-if="imageUrl" :src="imageUrl" alt="" />
        <div v-else class="img-prev__empty">未设置背景图</div>
      </div>
      <div class="img-acts">
        <label class="upload-btn">
          {{ uploading ? '上传中…' : '本地上传' }}
          <input type="file" accept="image/*" hidden :disabled="uploading" @change="onUpload" />
        </label>
        <AssetPickerButton @select="(url: string) => patchImage({ url })" />
        <el-button v-if="imageUrl" text size="small" type="danger" @click="patchImage({ url: '' })">移除</el-button>
      </div>
      <div class="fld">
        <span class="fld__lab">
          平铺模式
          <el-tooltip :content="fitHint" placement="top" :show-after="200">
            <span class="fld__q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <el-radio-group
          :model-value="imageMode"
          size="small"
          @update:model-value="(v: string) => patchImage({ mode: v })"
        >
          <el-radio-button
            v-for="m in PAGE_BG_IMAGE_MODES"
            :key="m.value"
            :value="m.value"
          >{{ m.label }}</el-radio-button>
        </el-radio-group>
      </div>
      <div class="switch-row">
        <span class="switch-row__lab">
          上下固定
          <el-tooltip text="打开后背景图固定在视口，不随内容滚动；关闭则跟随滚动。" placement="top" :show-after="200">
            <span class="fld__q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <el-switch :model-value="imageFixed" @change="(v: boolean) => patchImage({ fixed: v })" />
      </div>
    </template>

    <!-- 预设色盘：chip + 色彩圆点 + 选中 Checkmark -->
    <div class="presets">
      <button
        v-for="p in presets"
        :key="p.label"
        type="button"
        class="preset"
        :class="{ 'is-on': isPresetActive(p) }"
        :title="p.label"
        @click="applyPreset(p)"
      >
        <span class="preset__dot" :style="{ background: presetDot(p) }"></span>
        <span class="preset__label">{{ p.label }}</span>
        <el-icon v-if="isPresetActive(p)" class="preset__check"><Select /></el-icon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Select } from '@element-plus/icons-vue'
import ColorInputRow from '@/components/ColorInputRow.vue'
import CompactSliderRow from '../CompactSliderRow.vue'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import { useImageUpload } from '../composables/useImageUpload'
import { normalizeUploadUrl } from '@/api/system'
import { BACKGROUND_PRESETS } from '@/types/page'
import { normalizePageBgImage, PAGE_BG_IMAGE_MODES, pageBgImageCss } from './pageConfigSchema'
import type { PageBackground } from '@/types/page'

/**
 * 页面背景设置（2026-10-06 拆分自 PropsPanel）。
 * ⚠️ 预设「选中态」判定用的是**归一化后的实际值**对比，不是 key 对比 ——
 * 运营手输一个和预设完全相同的色，也该高亮为「当前用的是这套配色」。
 */
const props = defineProps<{ model: PageBackground }>()
const emit = defineEmits<{ patch: [value: PageBackground] }>()

const { uploadImage, uploading } = useImageUpload()

const presets = BACKGROUND_PRESETS

/** 渐变缺色标时的兜底（与端上 FALLBACK 口径一致：暖阁纸感两端） */
const DEFAULT_STOPS = [
  { color: '#F6F1E9', offset: 0 },
  { color: '#EFE6D8', offset: 100 },
]

const solidColor = computed(() =>
  props.model.type === 'solid' ? (props.model.color || '') : '',
)

const angle = computed(() => props.model.gradient?.angle ?? 180)
const stops = computed(() => props.model.gradient?.stops ?? [])

const image = computed(() => normalizePageBgImage(props.model.image))
const imageUrl = computed(() => normalizeUploadUrl(image.value.url))
const imageMode = computed(() => image.value.mode)
const imageFixed = computed(() => image.value.fixed)

/** 预览用内联样式：与端上同一套 CSS 生成，视觉即真机 */
const previewStyle = computed(() => ({
  background: pageBgImageCss({ ...image.value, url: imageUrl.value }) || 'transparent',
}))

const fitHint = computed(
  () => PAGE_BG_IMAGE_MODES.find((m) => m.value === image.value.mode)?.desc || '',
)

function patch(next: PageBackground) {
  emit('patch', next)
}

function onTypeChange(type: 'solid' | 'gradient' | 'image') {
  if (type === 'image') {
    patch({ type: 'image', image: { ...image.value } })
    return
  }
  if (type === 'solid') {
    patch({ type: 'solid', color: solidColor.value || '#F6F1E9' })
    return
  }
  patch({ type: 'gradient', gradient: { angle: angle.value, stops: stops.value.length >= 2 ? stops.value : DEFAULT_STOPS } })
}

/** 渐变色标改一处：整体回写归一化后的数组（store 是浅合并） */
function patchStop(index: number, partial: { color?: string; offset?: number }) {
  const next = stops.value.map((s, i) => (i === index ? { ...s, ...partial } : s))
  next.sort((a, b) => a.offset - b.offset)
  patch({ type: 'gradient', gradient: { angle: angle.value, stops: next } })
}

function removeStop(index: number) {
  const next = stops.value.filter((_, i) => i !== index)
  patch({ type: 'gradient', gradient: { angle: angle.value, stops: next } })
}

function addStop() {
  if (stops.value.length >= 5) return
  const last = stops.value[stops.value.length - 1]
  const next = [...stops.value, { color: last?.color || '#ffffff', offset: Math.min(100, (last?.offset ?? 50) + 20) }]
  patch({ type: 'gradient', gradient: { angle: angle.value, stops: next } })
}

function patchImage(partial: Record<string, unknown>) {
  patch({ type: 'image', image: { ...image.value, ...partial } as any })
}

async function onUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, { maxSizeMB: 5, onSuccess: (url) => patchImage({ url: normalizeUploadUrl(url) }) })
}

/** 预设圆点色：渐变取起点色标、纯色取其色 */
function presetDot(p: { background: PageBackground }): string {
  const bg = p.background
  if (bg.type === 'solid') return bg.color || '#ccc'
  const s = bg.gradient?.stops
  return (s && s[0]?.color) || '#ccc'
}

/** 选中态：拿预设的实际 CSS 与当前值比，一致即高亮 */
function isPresetActive(p: { background: PageBackground }): boolean {
  const cur = bgCss(props.model)
  const target = bgCss(p.background)
  return cur === target
}

function bgCss(bg: PageBackground): string {
  if (bg.type === 'solid') return `solid ${(bg.color || '').toLowerCase()}`
  if (bg.type === 'image') {
    const i = normalizePageBgImage(bg.image)
    return `image ${i.url} ${i.mode} ${i.fixed}`
  }
  const s = [...(bg.gradient?.stops || [])].sort((a, b) => a.offset - b.offset)
  return `grad ${bg.gradient?.angle} ${s.map((x) => `${(x.color || '').toLowerCase()}@${x.offset}`).join(',')}`
}

function applyPreset(p: { background: PageBackground }) {
  patch(JSON.parse(JSON.stringify(p.background)))
}
</script>

<style scoped>
.bgs { display: flex; flex-direction: column; gap: 6px; }

.fld { display: flex; flex-direction: column; gap: 4px; }
.fld__lab { display: flex; align-items: center; gap: 3px; color: #64748b; font-size: 12px; }
.fld__q {
  display: inline-grid; place-items: center; flex: none;
  width: 13px; height: 13px; color: #a8b3c4;
  font-size: 9px; font-weight: 700; line-height: 1;
  border: 1px solid #dbe2ec; border-radius: 50%; cursor: help;
}
.fld__q:hover { color: #64748b; background: #f1f5f9; border-color: #cbd5e1; }

.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; }
.switch-row__lab { display: flex; align-items: center; gap: 3px; color: #64748b; font-size: 12px; }

.stop {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 4px 6px;
  align-items: center;
  padding: 3px 0;
}
.stop__idx {
  display: grid; place-items: center;
  width: 14px; height: 14px;
  color: #94a3b8; font-size: 10px;
  background: #f1f5f9; border-radius: 3px;
}
.stop :deep(.csr) { grid-column: 2; }
.stop > :last-child { grid-column: 2; justify-self: end; }

.img-prev {
  height: 74px;
  overflow: hidden;
  background: #f4f6f9;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}
.img-prev img { display: none; }
.img-prev__empty { display: grid; place-items: center; height: 100%; color: #a8b3c4; font-size: 11px; }
.img-acts { display: flex; align-items: center; gap: 6px; }

/* 预设 chip：圆点 + 名称 + 选中勾 */
.presets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
.preset {
  position: relative;
  display: flex; align-items: center; gap: 4px;
  min-width: 0;
  padding: 4px 16px 4px 6px;
  font-family: inherit; text-align: left;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.preset:hover { border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #e3e8f0); }
.preset.is-on {
  border-color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 8%, #fff);
}
.preset__dot {
  flex: none;
  width: 12px; height: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 50%;
}
.preset__label {
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.preset.is-on .preset__label { color: #475569; }
.preset__check {
  position: absolute; right: 4px;
  color: var(--el-color-primary, #c08e6e);
  font-size: 12px;
}
</style>