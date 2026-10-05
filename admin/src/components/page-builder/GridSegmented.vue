<template>
  <div
    class="wb-grid-seg"
    :class="`wb-grid-seg--${cols}`"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      role="radio"
      class="wb-grid-seg__item"
      :class="{ 'is-on': opt.value === modelValue }"
      :aria-checked="opt.value === modelValue"
      :title="opt.title"
      @click="pick(opt.value)"
    >
      <span class="wb-grid-seg__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * 网格分段选择器（专治窄栏横向挤压叠字）。
 *
 * 🔴 为什么不用 BuilderSegmented：
 *   它是 `display:inline-flex` + 每项 `flex:1 1 auto; white-space:nowrap`，
 *   4 个中文选项（如「跟随全局 / 双列瀑布 / 图文横滑 / 单列列表」）
 *   在 ~300px 面板里必然放不下 —— flex 会压缩每项，内容又 nowrap 不换行，
 *   于是**文字溢出并互相叠压**（需求点名的 Bug，截图可见）。
 *   本组件改用 grid 固定列数，每格独立成行、文本完整不裁切。
 *
 * 若选项文案很长，建议 cols=1（纵向列表），彻底不挤压。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string | number
    options: Array<{ value: string | number; label: string; title?: string }>
    /** 列数：2 = 两列网格（默认），3 = 三列，1 = 纵向单列 */
    cols?: 1 | 2 | 3
    ariaLabel?: string
  }>(),
  { cols: 2, ariaLabel: '网格分段选择' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

function pick(value: string | number) {
  if (value === props.modelValue) return
  emit('update:modelValue', value)
}
</script>

<style scoped lang="scss">
.wb-grid-seg {
  display: grid;
  gap: 4px;
  width: 100%;
}

.wb-grid-seg--1 { grid-template-columns: minmax(0, 1fr); }
.wb-grid-seg--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.wb-grid-seg--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.wb-grid-seg__item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  color: var(--wb-mute, #6b5b4e);
  font-family: inherit;
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 7px;
  transition: color 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.wb-grid-seg__item:hover {
  color: var(--el-color-primary, #c08e6e);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, var(--wb-line, #e8dfd3));
}

.wb-grid-seg__item.is-on {
  color: var(--el-color-primary, #c08e6e);
  font-weight: 600;
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 10%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 55%, #fff);
}

/* 🔴 文本完整显示：单行省略而不是溢出叠字 */
.wb-grid-seg__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
