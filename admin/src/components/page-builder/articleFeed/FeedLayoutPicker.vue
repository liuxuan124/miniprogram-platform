<template>
  <div class="layout-grid-picker">
    <div v-for="group in LAYOUT_GROUPS" :key="group.title" class="layout-grid-picker__group">
      <p class="layout-grid-picker__gt">{{ group.title }}</p>
      <div class="layout-grid-picker__items">
        <button
          v-for="opt in group.items"
          :key="opt.value"
          type="button"
          class="lp-card"
          :class="{ 'is-on': modelValue === opt.value }"
          :aria-pressed="modelValue === opt.value"
          :title="opt.desc"
          @click="emit('update:modelValue', opt.value)"
        >
          <!-- 微缩线框图：用纯 div 画出该版式的卡片骨架，比文字列表直观得多 -->
          <span class="lp-card__thumb" :class="`lp-card__thumb--${opt.value}`">
            <template v-if="opt.value === 'card'">
              <i class="lp-t lp-t--img" /><i class="lp-t lp-t--line" /><i class="lp-t lp-t--line lp-t--short" />
            </template>
            <template v-else-if="opt.value === 'list'">
              <i class="lp-t lp-t--sq" /><i class="lp-t lp-t--col"><b class="lp-t--line" /><b class="lp-t--line lp-t--short" /></i>
            </template>
            <template v-else-if="opt.value === 'compact'">
              <i class="lp-t lp-t--xs" /><i class="lp-t lp-t--col"><b class="lp-t--line" /><b class="lp-t--line lp-t--short" /></i>
              <i class="lp-t lp-t--xs" /><i class="lp-t lp-t--col"><b class="lp-t--line" /><b class="lp-t--line lp-t--short" /></i>
            </template>
            <template v-else-if="opt.value === 'magazine'">
              <i class="lp-t lp-t--hero" /><i class="lp-t lp-t--line" /><i class="lp-t lp-t--line lp-t--short" /><i class="lp-t lp-t--hr" />
            </template>
            <template v-else-if="opt.value === 'overlay'">
              <i class="lp-t lp-t--fill"><b class="lp-t--over" /></i>
            </template>
            <template v-else-if="opt.value === 'grid'">
              <i class="lp-t lp-t--half"><b class="lp-t--line" /></i><i class="lp-t lp-t--half"><b class="lp-t--line" /></i>
            </template>
            <template v-else-if="opt.value === 'editorial'">
              <i class="lp-t lp-t--col"><b class="lp-t--line" /><b class="lp-t--line" /><b class="lp-t--line lp-t--short" /></i><i class="lp-t lp-t--sq" />
            </template>
          </span>
          <span class="lp-card__label">{{ opt.label }}</span>
          <span v-if="modelValue === opt.value" class="lp-card__tick" aria-hidden="true">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LAYOUT_GROUPS, type ArticleListLayout } from '../articleFeed/articleFeedSchema'

/**
 * 版式可视化选择器。
 * 为什么不用 el-radio-group + 文字：
 *   「卡片/列表/紧凑/杂志/沉浸/网格/报刊」这 7 个词对运营几乎没有画面感，
 *   光看名字选不对。改成 2 列微缩线框图，选之前就知道长什么样。
 */
defineProps<{ modelValue: ArticleListLayout }>()
const emit = defineEmits<{ 'update:modelValue': [value: ArticleListLayout] }>()
</script>

<style scoped lang="scss">
.layout-grid-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.layout-grid-picker__gt {
  margin: 0 0 6px;
  font-size: 11px;
  color: #a89c8d;
}

.layout-grid-picker__items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.lp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: stretch;
  padding: 8px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 9px;
  transition: border-color 0.16s ease, background 0.16s ease;

  &:hover {
    border-color: #d5cbbe;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.lp-card__label {
  font-size: 12px;
  color: #5c5249;
}

.lp-card.is-on .lp-card__label {
  font-weight: 600;
  color: var(--el-color-primary, #c08e6e);
}

.lp-card__tick {
  position: absolute;
  top: 5px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  font-size: 9px;
  color: #fff;
  background: var(--el-color-primary, #c08e6e);
  border-radius: 999px;
}

/* ---------- 线框图骨架 ---------- */
.lp-card__thumb {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px;
  align-items: start;
  height: 46px;
  padding: 4px;
  overflow: hidden;
  background: #f7f4ef;
  border-radius: 6px;
}

.lp-t {
  display: block;
  background: #ded5c7;
  border-radius: 2px;
}

.lp-t--line { height: 3px; width: 100%; }
.lp-t--short { width: 60%; }
.lp-t--img { grid-column: 1 / -1; height: 15px; background: #e2d9c9; }
.lp-t--hero { grid-column: 1 / -1; height: 20px; background: #d9cdb9; }
.lp-t--sq { width: 14px; height: 14px; background: #ddd3c3; }
.lp-t--xs { width: 9px; height: 8px; background: #e3dacb; }
.lp-t--col { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.lp-t--col .lp-t--line { height: 3px; }
.lp-t--fill { position: relative; grid-column: 1 / -1; height: 100%; background: #d5c9b6; }
.lp-t--over { position: absolute; right: 3px; bottom: 3px; left: 3px; height: 8px; background: rgba(255, 255, 255, 0.85); border-radius: 2px; }
.lp-t--half { display: flex; flex-direction: column; gap: 2px; height: 100%; padding: 2px; background: #e0d7c8; border-radius: 2px; }
.lp-t--half .lp-t--line { height: 3px; background: #f0e9de; }
.lp-t--hr { grid-column: 1 / -1; height: 1px; margin-top: 2px; background: #e0d7c8; }
</style>
