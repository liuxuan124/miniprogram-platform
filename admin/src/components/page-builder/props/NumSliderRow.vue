<template>
  <div class="num-slider">
    <el-slider
      class="num-slider__bar"
      :model-value="current"
      :min="min"
      :max="max"
      :step="step"
      :show-tooltip="false"
      @update:model-value="onSlide"
    />
    <el-input-number
      class="num-slider__num"
      :model-value="current"
      :min="min"
      :max="max"
      :step="step"
      :controls="false"
      size="small"
      @change="onInput"
    />
    <!-- 🔴 单位可为空：数量类字段（条数/个数/篇数）本来就没有单位，
         渲染空 span 会留下一段无意义的空白间距。 -->
    <span v-if="displayUnit" class="num-slider__unit">{{ displayUnit }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 带单位的「滑块 + 数字」组合输入。
 *
 * 为什么不用裸 el-input-number：
 * ① 运营调圆角/间距靠手输试不出效果，滑块拖动才有「手感」；
 * ② 裸步进器看不出单位，容易填 14 以为是 14%；
 * ③ **必须夹紧范围** —— 负数间距会破坏布局（需求 Bug1.5 的真实诉求）。
 *   这里用 computed 先夹一次，避免用户手输越界值直接落库。
 *
 * 🔴 unit 必须由调用方传（2026-10-06 修复）：
 *   原来单位硬编码为 `px`，于是「显示数量」这个**计件**字段也显示 px ——
 *   运营看到「6 px」会以为在调间距。复用本组件的非像素字段必须显式传 unit。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    min?: number
    max?: number
    step?: number
    /** 越界时的兜底值（留空则用 min） */
    fallback?: number
    /**
     * 单位后缀；像素类传 'px'，计件类传 '篇'/'个'/'条' 等。
     * 🔴 留空**不带单位**（数量类字段的正确形态）。
     */
    unit?: string
    /**
     * 业务语义（2026-10-06 新增）—— 由调用方告知这是「长度」还是「数量」。
     *
     * 🔴 为什么加这个：原来 `unit` 默认 `'px'`，于是「每页条数 6 px」
     * 「商品数量 8 px」这种错配会静默出现 —— 运营看到 px 会以为在调间距。
     * 靠「每个调用方都记得传」不可靠（全站 70 处use，历史上已漏传多次），
     * 所以这里**由语义推导**：`count` → 强制无单位，从根上不可能错。
     */
    semantic?: 'length' | 'count'
  }>(),
  { min: 0, max: 48, step: 1, unit: 'px', semantic: 'length' },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const fallback = computed(() => props.fallback ?? props.min)

/**
 * 实际展示的单位。
 * 🔴 `semantic === 'count'` 时**强制无单位**——
 * 哪怕调用方漏传/传错unit，数量类也不可能显示 px。
 * 这是「防呆」而不是「约定」：约定会被遗忘，防呆不会。
 */
const displayUnit = computed(() => (props.semantic === 'count' ? '' : props.unit))

/** 展示值也夹紧：手输 999 时输入框立即回弹，不让非法值停留在界面 */
const current = computed(() => {
  const n = Number(props.modelValue)
  if (!Number.isFinite(n)) return fallback.value
  return Math.min(props.max, Math.max(props.min, n))
})

function onSlide(v: number | number[]) {
  emit('update:modelValue', clamp(Number(v)))
}

function onInput(v: number | undefined | null) {
  emit('update:modelValue', clamp(Number(v)))
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return fallback.value
  const lo = props.min
  const hi = props.max
  // 先夹进区间，再按步长吸附。
  // ⚠️ 顺序不能反：step>1 时先吸附会把 min 值顶掉（min=1/step=2 时 round(0.5)*2=2，
  // 于是「1」永远输不进去，区间下沿形同虚设）。
  const bounded = Math.min(hi, Math.max(lo, Math.round(n)))
  if (props.step <= 1) return bounded
  const snapped = Math.round(bounded / props.step) * props.step
  // 吸附后越出下沿（如 min=1 吸附成 0）时退回 lo，保证 min 始终可达
  return snapped < lo ? lo : Math.min(hi, snapped)
}
</script>

<style scoped lang="scss">
.num-slider {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.num-slider__bar {
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}

.num-slider__num {
  width: 62px;
  flex-shrink: 0;
}

.num-slider__unit {
  flex-shrink: 0;
  font-size: 11px;
  color: #94a3b8;
}

:deep(.num-slider__num .el-input__inner) {
  padding-right: 4px;
  padding-left: 8px;
  text-align: right;
}
</style>
