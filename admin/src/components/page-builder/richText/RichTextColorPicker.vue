<template>
  <div class="rt-color">
    <!-- 触发器：色块 + 文字，替代原来晦涩的 [A] / [▮] 符号 -->
    <button type="button" class="rt-color__trigger" :title="title" @mousedown.prevent @click.stop="toggle">
      <span class="rt-color__swatch" :style="{ background: modelValue }"></span>
      <span class="rt-color__label">{{ label }}</span>
    </button>

    <el-popover
      v-model:visible="visible"
      placement="bottom-start"
      :width="248"
      trigger="click"
      popper-class="rt-color-popper"
    >
      <div class="rt-color__panel">
        <div class="rt-color__presets">
          <button
            v-for="c in presets"
            :key="c"
            type="button"
            class="rt-color__preset"
            :style="{ background: c }"
            :title="c"
            @mousedown.prevent
            @click="pick(c)"
          ></button>
        </div>
        <div class="rt-color__custom">
          <el-color-picker
            :model-value="modelValue"
            size="small"
            :predefine="presets"
            @change="onPicked"
          />
          <input
            class="rt-color__hex"
            :value="modelValue"
            spellcheck="false"
            :aria-label="`${title}色号`"
            @change="onHex"
            @blur="onHex"
            @keydown.enter.prevent="onHex"
          />
        </div>
        <div class="rt-color__extra">
          <button type="button" class="rt-color__mini" @mousedown.prevent @click="apply('transparent')">透明</button>
          <button type="button" class="rt-color__mini" @mousedown.prevent @click="apply('initial')">清除</button>
          <button
            v-if="eyedropperSupported"
            type="button"
            class="rt-color__mini"
            :disabled="picking"
            @mousedown.prevent
            @click="pickByEye"
          >
            {{ picking ? '取色中…' : '吸管取色' }}
          </button>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * 富文本专用取色器。
 *
 * 🔴 为什么不用裸 `<input type="color">`：
 *   原实现是 `[A] + [吸管] + [▮]` 三个并排按钮，符号晦涩、且没有品牌预设，
 *   运营只能一个个试。现在统一为「色块预览 + Popover 调色板 + 品牌预设 + Hex 录入」。
 *
 * ⚠️ `@mousedown.prevent` 是必须的：编辑器是 contenteditable，
 *    不阻止默认行为会在按钮上丢焦点，导致选完颜色后光标丢失。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    /** 触发器上的文字标签 */
    label?: string
    title?: string
    presets?: string[]
    /** 无操作时传 true，值可传 'transparent' / 'initial' */
    clearable?: boolean
  }>(),
  { label: '', title: '颜色', presets: () => [], clearable: true },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const visible = ref(false)
const picking = ref(false)

const BRAND = [
  '#333333', '#172033', '#C08E6E', '#002FA7',
  '#2f7a42', '#b45309', '#c0392b', '#6b46c1',
  '#ffffff', '#f7faf8', '#fffaef', '#f4f8fd',
]

const presets = computed(() => (props.presets.length ? props.presets : BRAND))
const eyedropperSupported = computed(() => typeof window !== 'undefined' && 'EyeDropper' in window)

function toggle() {
  visible.value = !visible.value
}

function pick(color: string) {
  emit('update:modelValue', color)
  visible.value = false
}

function onPicked(v: string | null) {
  if (v) emit('update:modelValue', v)
}

function apply(v: string) {
  emit('update:modelValue', v)
  visible.value = false
}

/** 归一化 Hex（支持 #rgb / rrggbb / rgb()），非法值静默忽略 */
function onHex(e: Event) {
  const el = e.target as HTMLInputElement
  let s = (el.value || '').trim().toLowerCase()
  if (!s) return
  if (s.startsWith('rgb')) {
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (!m) return
    const parts = m[1].split(',').map((v) => parseInt(v.trim(), 10))
    if (parts.length < 3 || parts.some((v) => Number.isNaN(v) || v < 0 || v > 255)) return
    emit('update:modelValue', '#' + parts.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join(''))
    return
  }
  s = s.replace(/^#/, '')
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/.test(s)) return
  emit('update:modelValue', '#' + s)
}

async function pickByEye() {
  if (!eyedropperSupported.value || picking.value) return
  const Ctor = (window as any).EyeDropper
  if (!Ctor) return
  picking.value = true
  try {
    const res = await new Ctor().open()
    const hex = String(res?.sRGBHex || '').trim()
    if (hex) emit('update:modelValue', hex)
  } catch {
    /* 用户取消取色，忽略 */
  } finally {
    picking.value = false
  }
}
</script>

<style scoped lang="scss">
.rt-color {
  position: relative;
  display: inline-flex;
}

.rt-color__trigger {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 26px;
  padding: 0 6px;
  color: #334155;
  font-size: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #dde3ec;
  border-radius: 5px;

  &:hover {
    color: var(--color-primary);
    border-color: #bcd0ff;
  }
}

.rt-color__swatch {
  width: 14px;
  height: 14px;
  border: 1px solid rgb(0 0 0 / 12%);
  border-radius: 3px;
  /* 透明色时用棋盘格底衬，避免看起来像白块 */
  background-image: linear-gradient(45deg, #ddd 25%, transparent 25%),
    linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%),
    linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}

.rt-color__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rt-color__presets {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
}

.rt-color__preset {
  width: 100%;
  height: 22px;
  cursor: pointer;
  border: 1px solid rgb(0 0 0 / 10%);
  border-radius: 4px;

  &:hover {
    transform: scale(1.08);
  }
}

.rt-color__custom {
  display: flex;
  gap: 6px;
  align-items: center;
}

.rt-color__hex {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 6px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 11.5px;
  text-transform: lowercase;
  background: #fbf9f6;
  border: 1px solid #e2d8cc;
  border-radius: 4px;
  outline: none;
}

.rt-color__extra {
  display: flex;
  gap: 5px;
}

.rt-color__mini {
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  color: #6b7280;
  cursor: pointer;
  background: #f7f7f8;
  border: 1px solid #e5e7eb;
  border-radius: 4px;

  &:hover:not(:disabled) {
    color: var(--color-primary);
    border-color: #bcd0ff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
