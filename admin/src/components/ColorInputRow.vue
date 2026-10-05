<template>
  <div
    class="cir"
    :class="[`is-${size}`, { 'is-disabled': disabled }]"
    :style="hostStyle"
  >
    <!-- 左：预览色块。透明棋盘格 + 当前填充色，点击唤起完整取色浮层 -->
    <span class="cir__swatch" :style="swatchStyle" :title="swatchTitle">
      <RawColorPicker
        :model-value="pickerValue"
        :disabled="disabled"
        :size="size"
        :show-alpha="showAlpha"
        :color-format="colorFormat || undefined"
        :predefine="predefine"
        :clearable="false"
        :teleported="teleported"
        :popper-class="popperClass"
        @update:model-value="onPicked"
        @change="onPicked"
      />
    </span>

    <!-- 中：色值文本，可键入；非法值失焦打回 -->
    <input
      v-if="hexInput"
      class="cir__hex"
      :value="displayText"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      :disabled="disabled"
      :aria-label="ariaLabel || '颜色色值'"
      :title="isAlphaHint ? '含透明度，手动输入请用 rgba(...)' : ''"
      :class="{ 'is-alpha': isAlphaHint, 'is-empty': !rawValue }"
      @change="onHexCommit"
      @blur="onHexCommit"
      @keydown.enter.prevent="onHexCommit"
    />

    <!-- 右：工具组。吸管 + 清除，各自独立热区，绝不叠在色块上 -->
    <div class="cir__tools">
      <button
        v-if="showEyedropper"
        type="button"
        class="cir__btn"
        :disabled="disabled || picking"
        title="吸管取色（吸取屏幕任意位置的颜色）"
        aria-label="吸管取色"
        @click.stop="pickFromScreen"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <path
            fill="currentColor"
            d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.23-1.21-1.42 1.42 1.21 1.23-6.96 6.96c-.39.39-.39 1.02 0 1.41l.2.2-2.54 2.54a1.25 1.25 0 0 0 1.77 1.77l2.54-2.54.2.2c.39.39 1.02.39 1.41 0l6.96-6.96 1.23 1.21 1.42-1.42-1.21-1.23 3.12-3.12a1 1 0 0 0 0-1.41zM7.5 15.09L13.59 9H15l-6.09 6.09H7.5z"
          />
        </svg>
      </button>
      <button
        v-if="clearable"
        type="button"
        class="cir__btn cir__btn--clear"
        :disabled="disabled || !rawValue"
        title="清除颜色（恢复为未设置）"
        aria-label="清除颜色"
        @click.stop="onClear"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      </button>
      <button
        v-if="showReset"
        type="button"
        class="cir__btn cir__btn--reset"
        title="恢复默认"
        aria-label="恢复默认"
        @click.stop="onReset"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"
          />
        </svg>
      </button>
      <slot name="tools" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElColorPicker as RawColorPicker, ElMessage } from 'element-plus'
// EP 的 colorFormat 是 @ctrl/tinycolor 的 ColorFormats 联合类型，
// 从 EP 内部 d.ts 取，避免手写 string 而触发 TS2322。
type ColorFormats = 'name' | 'rgb' | 'prgb' | 'hex' | 'hex3' | 'hex4' | 'hex6' | 'hex8' | 'hsl' | 'hsv' | 'cmyk'

/**
 * 颜色输入统一基件（横向 Flex 三段式：预览色块 / 色值输入 / 工具按钮组）。
 *
 * 🔴 为什么必须自己拼而不能直接扔一个 `el-color-picker` 上去（2026-10-06 修的高危样式 bug）：
 * ① Element Plus 的 trigger 内部有 `position:absolute; inset:0` 的 `.el-color-picker__color`
 *    与 clearable 时的居中 clear 图标，在 108px 宽的 trigger 里会盖住色块、还溢出上下边框；
 * ② 裸色块**没有色值文本**，运营无法确认当前颜色、也无法照抄品牌色；
 * ③ 多个裸色块并排时没有字段标识（「底/字」「起/中/止」只能靠记忆）。
 *
 * 本组件的硬约束（三处调用方都靠它保证）：
 * - 容器 `display:flex; align-items:center; gap`，**工具按钮绝不脱离文档流**；
 * - 色块固定 24×24 / 28×28 且 `flex:none`，不会被输入框挤压；
 * - 输入框 `flex:1; min-width:0`，右按钮组 `flex:none`，任何字段名长度都不破版；
 * - 整体高度受控在 32px 内，不产生溢出描边。
 *
 * ⚠️ 内部必须用 `RawColorPicker`（局部 import 的 EP 原件）。
 * `main.ts` 把 `el-color-picker` / `ElColorPicker` 全局替换成了本项目的包装组件，
 * 模板里若写 `<el-color-picker>` 会解析到全局包装 → 无限递归。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    disabled?: boolean
    size?: 'large' | 'default' | 'small'
    /** 允许 alpha；决定输入框是否提示透明度 */
    showAlpha?: boolean
    /** 当前值偏离该默认色时才显示「恢复默认」 */
    defaultValue?: string
    /** 是否显示中间的色值输入框；窄容器（工具条/表格单元格）可关掉只留色块+工具 */
    hexInput?: boolean
    /** 透传给 EP 的色值格式（如 'rgb'） */
    colorFormat?: ColorFormats | ''
    /** 预设色板 */
    predefine?: string[]
    /** 是否显示清除按钮 */
    clearable?: boolean
    /** 是否显示吸管（浏览器不支持 EyeDropper 时自动隐藏） */
    eyedropper?: boolean
    teleported?: boolean
    popperClass?: string
    /** 输入框无障碍标签 */
    ariaLabel?: string
    /** 输入框右上角的额外角标（如「默认」标记位） */
    placeholder?: string
    /** 容器宽度约束；由外层包装器透传调用方的 style.width 用 */
    hostStyle?: Record<string, string> | string
  }>(),
  {
    modelValue: '',
    disabled: false,
    size: 'small',
    showAlpha: false,
    defaultValue: '',
    hexInput: true,
    colorFormat: '',
    predefine: () => [],
    clearable: true,
    eyedropper: true,
    teleported: true,
    popperClass: '',
    ariaLabel: '',
    placeholder: '未设置',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  change: [value: string | null]
}>()

const picking = ref(false)

/** 香云纱·莨绸为项目主色，色板与后台其它取色器保持同一套 */
const BRAND_PREDEFINE = [
  '#C08E6E', '#1D1B18', '#3B2F22', '#7A4A1D',
  '#F3DCAA', '#D9CCB8', '#8B7355', '#FFFFFF',
  '#2C1810', '#4A2C1A', '#B08968', '#E8D5C4',
  '#E53935', '#F56C6C', '#2C1810', '#0F766E',
  '#1D4ED8', '#7C3AED', '#B45309', '#166534',
]

const palette = computed(() => (props.predefine.length ? props.predefine : BRAND_PREDEFINE))

const rawValue = computed(() => String(props.modelValue ?? '').trim())

/** alpha < 1 的 rgba 要显式提示，否则「色块看着不透明、画布却透明」会被当成 bug */
const isAlphaHint = computed(() => {
  const m = rawValue.value.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/i)
  return !!m && Number(m[1]) < 1
})

const displayText = computed(() => rawValue.value || props.placeholder)

/** 色块上色值。EP 只认 hex，rgba 取其纯色部分（alpha 由输入框文字与提示承载） */
const hexOnly = computed(() => {
  const v = rawValue.value
  if (!v) return ''
  if (/^#/i.test(v)) return v
  const m = v.match(/rgba?\(([^)]+)\)/i)
  if (!m) return v
  const parts = m[1].split(',').map((n) => parseFloat(n.trim()))
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return ''
  return `#${parts.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`
})

/** 空值回落 #000000 而不是 '' —— EP 收到空串会渲染成透明块，看不出控件还在 */
const pickerValue = computed(() => hexOnly.value || '#000000')

/** 透明棋盘格：两段 linear-gradient 叠出格子，色块本身再叠一层填充色 */
const swatchStyle = computed(() => {
  const fill = hexOnly.value || 'transparent'
  return {
    backgroundColor: fill,
    backgroundImage:
      'linear-gradient(45deg,#e8e4df 25%,transparent 25%),' +
      '-webkit-linear-gradient(-45deg,#e8e4df 25%,transparent 25%),' +
      '-webkit-linear-gradient(45deg,transparent 75%,#e8e4df 75%),' +
      'linear-gradient(-45deg,transparent 75%,#e8e4df 75%)',
    backgroundSize: '8px 8px',
    backgroundPosition: '0 0,0 4px,4px -4px,-4px 0px',
  }
})

const swatchTitle = computed(() => rawValue.value || '未设置颜色')

const showEyedropper = computed(
  () => props.eyedropper && typeof window !== 'undefined' && 'EyeDropper' in window,
)

/** 只有「当前值 ≠ 默认值」时才给恢复默认入口，空默认色一律不显示 */
const showReset = computed(
  () =>
    !!props.defaultValue &&
    rawValue.value.toLowerCase() !== props.defaultValue.trim().toLowerCase(),
)

function onReset() {
  if (props.disabled) return
  emit('update:modelValue', props.defaultValue)
  emit('change', props.defaultValue)
}

/**
 * 输入归一：接受 #rgb / #rrggbb / rrggbb / rgb(...) / rgba(...,a)。
 * 非法值返回 null（调用方打回真实值，不弹 toast —— 面板里高频输入，弹窗会烦）。
 * ⚠️ 必须校验「恰好 3 段数字」：rgb(1,2) 这类残缺输入会让 b 为 undefined，
 *    后面 toString(16) 直接抛 TypeError 把整个面板打崩。
 */
function toHex(raw: string): string | null {
  let s = (raw || '').trim().toLowerCase()
  if (!s) return null
  if (s.startsWith('rgb')) {
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const parts = m[1].split(',').map((v) => parseFloat(v.trim()))
    if (parts.length < 3) return null
    const [r, g, b] = parts
    if ([r, g, b].some((v) => !Number.isFinite(v) || v < 0 || v > 255)) return null
    const base = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
    // 带 alpha 的保留 rgba 文本，否则运营输入的透明度会被静默吃掉
    if (parts.length >= 4) {
      const a = Number(parts[3])
      if (Number.isFinite(a) && a < 1) {
        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
      }
    }
    return base
  }
  s = s.replace(/^#/, '')
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/.test(s)) return null
  return `#${s}`
}

function onPicked(v: string | null | undefined) {
  if (!v) return
  emit('update:modelValue', v)
  emit('change', v)
}

function onHexCommit(e: Event) {
  const el = e.target as HTMLInputElement
  const typed = el.value.trim()
  // 没动过就别回写，否则每次 blur 都会触发一次 patch → 面板 markDirty
  if (typed === rawValue.value) return
  if (!typed) {
    onClear()
    return
  }
  const hex = toHex(typed)
  if (!hex) {
    el.value = displayText.value
    return
  }
  el.value = hex
  emit('update:modelValue', hex)
  emit('change', hex)
}

function onClear() {
  if (props.disabled) return
  emit('update:modelValue', null)
  emit('change', null)
}

async function pickFromScreen() {
  if (!showEyedropper.value || props.disabled || picking.value) return
  const Ctor = (window as any).EyeDropper
  if (!Ctor) return
  picking.value = true
  try {
    const dropper = new Ctor()
    const result = await dropper.open()
    const hex = String(result?.sRGBHex || '').trim()
    if (!hex) return
    onPicked(hex)
  } catch (err: any) {
    if (err?.name !== 'AbortError') ElMessage.warning('取色失败，请重试或改用色板')
  } finally {
    picking.value = false
  }
}

defineExpose({ openPicker: () => undefined })
</script>

<style scoped>
.cir {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 32px;
}

.cir.is-small { height: 28px; gap: 6px; }
.cir.is-large { height: 36px; }

/* ---------------- 左：预览色块 ---------------- */
.cir__swatch {
  position: relative;
  display: block;
  flex: none;
  box-sizing: border-box;
  border: 1px solid #d8d2ca;
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  cursor: pointer;
}
.cir.is-small .cir__swatch { width: 24px; height: 24px; }
.cir.is-default .cir__swatch { width: 28px; height: 28px; }
.cir.is-large .cir__swatch { width: 32px; height: 32px; }
.cir.is-disabled .cir__swatch { cursor: not-allowed; opacity: 0.6; }

/*
 * EP 的 trigger 自带边框 + 内层 `.el-color-picker__color`（absolute inset:0）
 * 会与我们的棋盘格背景打架，这里整体抹平：只留 EP 负责点击热区。
 * 同时干掉 clearable 的居中 clear 图标 —— 我们自己有清除按钮了。
 */
.cir__swatch :deep(.el-color-picker) { position: absolute; inset: 0; }
.cir__swatch :deep(.el-color-picker__trigger) {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  box-shadow: none;
}
.cir__swatch :deep(.el-color-picker__color) { border: 0; border-radius: 4px; background: transparent; }
.cir__swatch :deep(.el-color-picker__color-inner),
.cir__swatch :deep(.el-color-picker__alpha),
.cir__swatch :deep(.el-color-picker__bar) { display: none; }
.cir__swatch :deep(.el-color-picker__clear) { display: none; }

/* ---------------- 中：色值输入 ---------------- */
.cir__hex {
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  height: 100%;
  padding: 0 8px;
  overflow: hidden;
  color: #4a3d33;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.2px;
  text-overflow: ellipsis;
  background: #fbf9f6;
  border: 1px solid #e2d8cc;
  border-radius: 5px;
  outline: none;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.cir__hex:hover:not(:disabled) { border-color: #cbbca9; }
.cir__hex:focus {
  background: #fff;
  border-color: var(--el-color-primary, #c08e6e);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary, #c08e6e) 16%, transparent);
}
.cir__hex:disabled { color: #b3a596; cursor: not-allowed; }
.cir__hex.is-empty { color: #b3a596; font-style: italic; }
/* 透明度用醒目虚线框，避免「以为配了黑、其实是透明」 */
.cir__hex.is-alpha {
  color: #b45309;
  background: #fffbeb;
  border-color: #fcd34d;
  border-style: dashed;
}

/* ---------------- 右：工具按钮组 ---------------- */
.cir__tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.cir__btn {
  display: grid;
  place-items: center;
  flex: none;
  box-sizing: border-box;
  width: 24px;
  height: 24px;
  padding: 0;
  color: #8b7355;
  background: #fff;
  border: 1px solid #e2d8cc;
  border-radius: 5px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.cir.is-default .cir__btn,
.cir.is-large .cir__btn { width: 28px; height: 28px; }

.cir__btn:hover:not(:disabled) {
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 8%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #fff);
}
.cir__btn--clear:hover:not(:disabled) {
  color: var(--el-color-danger, #f56c6c);
  background: #fef0f0;
  border-color: #fbc4c4;
}
.cir__btn--reset:hover:not(:disabled) {
  color: #0f766e;
  background: #f0fdfa;
  border-color: #99d5cd;
}
.cir__btn:disabled { color: #d5cdc3; cursor: not-allowed; background: #f7f4f1; }
</style>