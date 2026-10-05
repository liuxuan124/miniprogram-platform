<template>
  <div class="csb">
    <div class="csb__head">
      <span class="csb__title">
        {{ label }}
        <el-tooltip v-if="hint" :content="hint" placement="top" :show-after="200">
          <span class="csb__q" :aria-label="`${label} 说明`" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <button
        type="button"
        class="csb__lock"
        :class="{ 'is-on': linked }"
        :title="linked ? '已锁定：四向等比联动，点击解除' : '点击锁定四向等比联动'"
        :aria-label="linked ? '已锁定四向等比，点击解除' : '点击锁定四向等比联动'"
        :aria-pressed="linked"
        @click="$emit('update:linked', !linked)"
      >
        <el-icon><component :is="linked ? Lock : Unlock" /></el-icon>
      </button>
    </div>

    <div class="csb__grid">
      <label v-for="side in SIDES" :key="side.key" class="csb__cell">
        <span class="csb__side">{{ side.label }}</span>
        <el-input-number
          class="csb__num"
          :model-value="valueOf(side.key)"
          :min="minOf(side.key)"
          :max="max"
          size="small"
          :controls="false"
          :disabled="disabled"
          @change="(v: number | undefined) => onInput(side.key, v)"
        />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Lock, Unlock } from '@element-plus/icons-vue'

/**
 * 单行四联间距输入（2026-10-06 样式 Tab 降噪新增）。
 *
 * 🔴 为什么不用 2×2 的四宫格：四宫格每个格子带一个「上/下/左/右」文字标签，
 * 单格高度约 32px + 间距 → 整个块要 80px+；而外边距 + 内边距两块就是 160px，
 * 还没开始配就已把面板撑出一屏。
 * 改成**一行四个 56px 数字格**后，一个方向组只占 44px，
 * 上下两组共 88px —— **面板高度直接砍掉一半**。
 *
 * 顺序刻意按 **上 右 下 左**（顺时针，与 Figma / CSS margin 速记一致），
 * 比「上 下 左 右」更好读；锁定后以「第一个非零方向」为基准四向等比。
 */
const SIDES = [
  { key: 'top' as const, label: '上' },
  { key: 'right' as const, label: '右' },
  { key: 'bottom' as const, label: '下' },
  { key: 'left' as const, label: '左' },
]

export type SpacingSide = (typeof SIDES)[number]['key']

const props = withDefaults(
  defineProps<{
    /** 四向当前值（缺失按 0 处理；⚠️ 别用 `||0` 读「空字符串」以外的脏值） */
    modelValue?: Record<string, unknown>
    label?: string
    hint?: string
    /** 允许负值（外边距可用于与相邻组件重叠） */
    allowNegative?: boolean
    max?: number
    disabled?: boolean
    /** 四向等比联动；受控于父组件的 v-model:linked */
    linked?: boolean
  }>(),
  {
    modelValue: () => ({}),
    label: '',
    hint: '',
    allowNegative: false,
    max: 100,
    disabled: false,
    linked: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, number>]
  'update:linked': [value: boolean]
}>()

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function valueOf(side: SpacingSide): number {
  return num(props.modelValue?.[side])
}

function minOf(side: SpacingSide): number {
  // 只有「外边距」允许负值（上/下），左右为负会把组件挤出屏幕
  if (!props.allowNegative) return 0
  return side === 'left' || side === 'right' ? 0 : -120
}

/**
 * 锁定时以「刚被编辑的那个方向」为基准同步四向 —— 不是固定取 top，
 * 否则运营先点左再点上，锁定语义就变成「永远跟左上」而不是「跟最后一次输入」。
 */
function onInput(side: SpacingSide, v: number | undefined) {
  const next = Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0
  const patch: Record<string, number> = { [side]: next }
  if (props.linked) {
    SIDES.forEach((it) => {
      if (it.key !== side) patch[it.key] = next
    })
  }
  emit('update:modelValue', patch)
}

const values = computed(() => SIDES.map((it) => valueOf(it.key)))
void values
</script>

<style scoped>
.csb {
  padding: 2px 0;
}

.csb__head {
  display: flex;
  align-items: center;
  /* 🔴 用 inline-flex 而不是 space-between：四联网格是撑满整宽的，
     space-between 会把锁定键推到面板最右边，离标题 300px 之远，
     视觉上完全不像一组。改成标题占位 + 锁定键紧跟其后。 */
  gap: 4px;
  margin-bottom: 4px;
}

.csb__title {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.csb__q {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 13px;
  height: 13px;
  color: #a8b3c4;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid #dbe2ec;
  border-radius: 50%;
  cursor: help;
}
.csb__q:hover,
.csb__q:focus-visible {
  color: #64748b;
  background: #f1f5f9;
  border-color: #cbd5e1;
  outline: none;
}

/* 锁定键：常态极轻，只有锁定后才变主色，避免长期占视觉 */
.csb__lock {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  padding: 0;
  color: #b6c0cf;
  font-size: 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.csb__lock:hover { color: #64748b; background: #f1f5f9; border-color: #e2e8f0; }
.csb__lock.is-on {
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 10%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 40%, #fff);
}

/* 四联：等宽一行，grid 而非 flex —— flex 里 el-input-number 会各自按内容宽伸缩，长短不齐 */
.csb__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.csb__cell {
  display: flex;
  align-items: center;
  gap: 2px;
  box-sizing: border-box;
  min-width: 0;
  height: 26px;
  padding: 0 2px 0 6px;
  background: #fbf9f6;
  border: 1px solid #e2d8cc;
  border-radius: 5px;
  transition: border-color 0.15s, background 0.15s;
}
.csb__cell:hover { border-color: #cbbca9; }
.csb__cell:focus-within {
  background: #fff;
  border-color: var(--el-color-primary, #c08e6e);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary, #c08e6e) 14%, transparent);
}

.csb__side {
  flex: none;
  color: #a8b3c4;
  font-size: 11px;
}

.csb__num {
  flex: 1 1 auto;
  min-width: 0;
}

:deep(.csb__num .el-input__wrapper) {
  padding: 0;
  background: transparent;
  box-shadow: none;
}
:deep(.csb__num .el-input__inner) {
  height: 24px;
  padding: 0 2px;
  color: #4a3d33;
  font-size: 12px;
  text-align: right;
  background: transparent;
}
</style>