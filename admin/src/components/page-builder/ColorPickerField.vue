<template>
  <div class="color-field">
    <!-- 左label：优先用 el-form-item 的 label slot 之外的独立排版时用 slot -->
    <span v-if="label" class="color-field__label">
      {{ label }}
      <FieldHint v-if="hint" :text="hint" />
    </span>

    <div class="color-field__control">
      <!-- 取色方块：点击弹 el-color-picker（吸色/预设/Hex 录入都在里面） -->
      <el-color-picker
        :model-value="normalized"
        size="small"
        :predefine="predefine"
        :show-alpha="showAlpha"
        @change="onPicked"
      />

      <!-- HEX 文本色号：可直接键盘录入，失焦/回车归一化 -->
      <input
        class="color-field__hex"
        :value="normalized"
        spellcheck="false"
        inputmode="text"
        :aria-label="`${label || '颜色'}色号`"
        @change="onHexCommit"
        @blur="onHexCommit"
        @keydown.enter.prevent="onHexCommit"
      />

      <!-- 恢复默认值（仅在有 defaultValue 且当前值被改过时出现） -->
      <button
        v-if="defaultValue && normalized.toLowerCase() !== defaultValue.toLowerCase()"
        type="button"
        class="color-field__reset"
        :aria-label="`恢复默认${defaultValue}`"
        title="恢复默认"
        @click="emit('update:modelValue', defaultValue)"
      >
        ↺
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldHint from './FieldHint.vue'

/**
 * 配色字段基件 —— 替代裸el-color-picker。
 *
 * 解决三个问题：
 * ① 裸色块**没有色号文本**，运营无法确认当前颜色、也无法照抄品牌色；
 * ② 多个裸色块并排时没有字段标识（「起/中/止」「底/字」只能靠记忆）；
 * ③ 无法键盘录入，只能拖 picker。
 *
 * 布局：左标签（可带 ? 说明）+ 右「色块 + HEX 输入 + 恢复默认」。
 * HEX 输入接受 #rgb / #rrggbb / rrggbb / rgb(...) ，非法值静默回退不抛错。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    /** 字段标签；由外层 el-form-item 提供 label 时可省略 */
    label?: string
    /** 「?」悬浮说明 */
    hint?: string
    /** 恢复默认按钮的目标色 */
    defaultValue?: string
    /** 预设主题色（不传则用品牌默认色板） */
    predefine?: string[]
    showAlpha?: boolean
  }>(),
  {
    modelValue: '',
    label: '',
    hint: '',
    defaultValue: '',
    showAlpha: false,
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

/** 品牌色板（香云纱·莨绸 #C08E6E 为项目主色） */
const BRAND_PREDEFINE = [
  '#C08E6E', '#1D1B18', '#3B2F22', '#7A4A1D',
  '#F3DCAA', '#D9CCB8', '#8B7355', '#FFFFFF',
  '#2C1810', '#4A2C1A', '#B08968', '#E8D5C4',
]

const predefine = computed(() => props.predefine?.length ? props.predefine : BRAND_PREDEFINE)

/** 归一化：空值回落transparent 之外的合法色值，避免 el-color-picker 收到脏数据 */
const normalized = computed(() => (props.modelValue || '#000000').toString())

/** 把用户输入统一成 #rrggbb（不支持 alpha，alpha 场景请走 showAlpha + picker） */
function toHex(raw: string): string | null {
  let s = (raw || '').trim().toLowerCase()
  if (!s) return null
  if (s.startsWith('rgb')) {
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const parts = m[1].split(',').map((v) => parseInt(v.trim(), 10))
    // ⚠️ 必须校验「恰好 3 段」：rgb(1,2) 这类残缺输入会让 b 为 undefined，
    //    后面 v.toString(16) 直接抛 TypeError 把面板打崩（单测已覆盖）。
    if (parts.length < 3) return null
    const [r, g, b] = parts
    if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) return null
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  }
  s = s.replace(/^#/, '')
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}$/.test(s)) return null
  return '#' + s
}

function onPicked(v: string | null) {
  if (!v) return
  emit('update:modelValue', v)
}

function onHexCommit(e: Event) {
  const el = e.target as HTMLInputElement
  const hex = toHex(el.value)
  if (!hex) {
    // 非法输入：把框里的值打回当前真实色，不弹 toast（面板里高频输入，弹窗会烦）
    el.value = normalized.value
    return
  }
  el.value = hex
  emit('update:modelValue', hex)
}
</script>

<style scoped>
.color-field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.color-field__label {
  display: inline-flex;
  align-items: center;
  flex: none;
  color: #6b5b4e;
  font-size: 13px;
  white-space: nowrap;
}

/* 控件区固定占满剩余宽度，色块 + HEX 输入贴右，与面板右边缘对齐 */
.color-field__control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
}

.color-field__hex {
  flex: 1 1 auto;
  min-width: 0;
  height: 24px;
  padding: 0 7px;
  color: #4a3d33;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 11.5px;
  letter-spacing: 0.2px;
  text-transform: lowercase;
  background: #fbf9f6;
  border: 1px solid #e2d8cc;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}

.color-field__hex:hover {
  border-color: #cbbca9;
}

.color-field__hex:focus {
  background: #fff;
  border-color: var(--el-color-primary, #c08e6e);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary, #c08e6e) 16%, transparent);
}

.color-field__reset {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  padding: 0;
  color: #b3a596;
  font-size: 12px;
  line-height: 1;
  background: transparent;
  border: 1px solid #e2d8cc;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.color-field__reset:hover {
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 8%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #fff);
}
</style>
