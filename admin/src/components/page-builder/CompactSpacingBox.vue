<template>
  <div class="csb">
    <div class="csb__head">
      <span class="csb__title">
        {{ label }}
        <el-tooltip v-if="hint" :content="hint" placement="top" :show-after="200">
          <span class="csb__q" :aria-label="`${label} 说明`" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <span class="csb__tools">
        <!-- 锁链：切「统一」态。四向相同时点它 = 直接进统一，省一次展开 -->
        <button
          type="button"
          class="csb__lock"
          :class="{ 'is-on': linked }"
          :title="linked ? '已统一：四向同步，改一个即改全部' : '四向统一（改一个即改全部）'"
          :aria-label="linked ? '已统一四向，点击解除' : '设为四向统一'"
          :aria-pressed="linked"
          @click="setLinked(!linked)"
        >
          <el-icon><component :is="linked ? Lock : Unlock" /></el-icon>
        </button>
        <!-- 展开箭头：切「独立」态。统一态下才需要 -->
        <button
          type="button"
          class="csb__lock"
          :class="{ 'is-on': !linked }"
          :title="linked ? '展开四向，分别设置' : '已分别设置，点击收起'"
          :aria-label="linked ? '展开四向设置' : '收起四向设置'"
          :aria-pressed="!linked"
          @click="setLinked(false)"
        >
          <el-icon><component :is="linked ? ArrowRight : ArrowDown" /></el-icon>
        </button>
      </span>
    </div>

    <!--
      统一态：一行一个数值，四向同步。省掉 4 个输入框，面板高度直接少 30px。
      🔴 不用 v-if：保留四向那一行，展开/收起才只是高度变化，
      不会让下方字段跳位。
    -->
    <div class="fold" :class="{ 'is-closed': linked }">
      <div class="fold__inner">
        <div class="csb__grid">
          <label v-for="side in SIDES" :key="side.key" class="csb__cell">
            <span class="csb__side">{{ side.arrow }}</span>
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
    </div>

    <div class="csb__unify" :class="{ 'is-closed': !linked }">
      <el-input-number
        class="csb__unify-num"
        :model-value="unifiedValue"
        :min="allowNegative ? -120 : 0"
        :max="max"
        size="small"
        :controls="false"
        :disabled="disabled"
        @change="(v: number | undefined) => onUnifiedInput(v)"
      />
      <span class="csb__unit">px</span>
      <span class="csb__unify-tag">四向统一</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Lock, Unlock, ArrowRight, ArrowDown } from '@element-plus/icons-vue'

/**
 * 间距输入：统一 / 独立双态（2026-10-06 样式 Tab 降噪新增 → 同日二次增强）。
 *
 * 🔴 为什么不一直平铺四宫格：四向各一个输入框 = 44px + 标题行，
 * 外边距 + 内边距两组就是 ~100px，占掉侧栏近三分之一。
 * 而绝大多数页面**四向就是同一个值**（外边距 0 / 20 这种），
 * 让运营为「反正都填 20」去点四个框，是纯浪费。
 * → 默认收起为**一行统一值**，标题右侧两个小按钮切「锁链（统一）/ 箭头（独立）」。
 *
 * 顺序刻意按 **上 右 下 左**（顺时针，与 Figma / CSS margin 速记一致），
 * 比「上 下 左 右」更好读；独立态下以「最后编辑的那个方向」为基准。
 */
const SIDES = [
  { key: 'top' as const, label: '上', arrow: '↑' },
  { key: 'right' as const, label: '右', arrow: '→' },
  { key: 'bottom' as const, label: '下', arrow: '↓' },
  { key: 'left' as const, label: '左', arrow: '←' },
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
 * 独立态下编辑某一边：只改这一边。
 * 🔴 **不联动** —— 独立态的语义就是「这四个不一样」，
 * 若还自动同步四向，切到独立态就毫无意义。
 */
function onInput(side: SpacingSide, v: number | undefined) {
  const next = Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0
  emit('update:modelValue', { [side]: next })
}

/** 统一态下的展示值：取 top（唯一可信的代表值） */
const unifiedValue = computed(() => valueOf('top'))

/** 统一态改一个数 → 四向全改 */
function onUnifiedInput(v: number | undefined) {
  const next = Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0
  const patch: Record<string, number> = {}
  SIDES.forEach((it) => {
    patch[it.key] = next
  })
  emit('update:modelValue', patch)
}

/**
 * 切换统一 / 独立。
 * 🔴 从「独立」切回「统一」时**必须把四向抹平**，
 * 只切 UI 不改值会出现「看着是统一态、实际四向不同」——
 * 运营改一个数就发现另外三个跳变，比不做这个功能还糟。
 * 反向（统一 → 独立）不改值：此时四向本来就一致，展开只是为了分别调。
 */
function setLinked(next: boolean) {
  if (next === props.linked) return
  if (next && !props.linked) {
    // 独立 → 统一：抹平，以 top 为基准
    const base = valueOf('top')
    const patch: Record<string, number> = {}
    SIDES.forEach((it) => {
      patch[it.key] = base
    })
    emit('update:modelValue', patch)
  }
  emit('update:linked', next)
}
</script>

<style scoped>
.csb {
  padding: 2px 0;
}

.csb__head {
  display: flex;
  align-items: center;
  /* 🔴 用 inline-flex 而不是 space-between：右侧两个小按钮要贴着标题，
     space-between 会把它们推到面板最右边，离标题 300px 远得像另一组。 */
  gap: 4px;
  margin-bottom: 4px;
}

/* 标题行右侧的工具组：锁链 + 展开箭头 */
.csb__tools {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
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

/* 统一 / 独立的折叠过渡：max-height 而非 v-if，保留内部实例不闪 */
.fold,
.csb__unify {
  overflow: hidden;
  max-height: 34px;
  opacity: 1;
  transition: max-height 0.2s ease, opacity 0.16s ease;
}
.fold.is-closed,
.csb__unify.is-closed {
  max-height: 0;
  opacity: 0;
  pointer-events: none;
}

/* 统一态：标题 + 一个数字框 + 单位 + 状态标签，一行搞定 */
.csb__unify {
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  height: 26px;
  padding: 0 6px;
  background: #fbf9f6;
  border: 1px solid #e2d8cc;
  border-radius: 5px;
  transition: max-height 0.2s ease, opacity 0.16s ease, border-color 0.15s, background 0.15s;
}
.csb__unify:focus-within {
  background: #fff;
  border-color: var(--el-color-primary, #c08e6e);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary, #c08e6e) 14%, transparent);
}
.csb__unify-num { flex: 1 1 auto; min-width: 0; }
.csb__unify-tag {
  flex: none;
  color: #a8b3c4;
  font-size: 10px;
  white-space: nowrap;
}
.csb__unit {
  flex: none;
  color: #a8b3c4;
  font-size: 11px;
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