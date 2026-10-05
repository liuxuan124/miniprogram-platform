<template>
  <div class="layout-pick" role="radiogroup" aria-label="布局样式">
    <button
      v-for="m in ARTICLE_LAYOUT_LIST"
      :key="m.key"
      type="button"
      role="radio"
      :aria-checked="current === m.key"
      class="layout-pick__item"
      :class="{ 'is-on': current === m.key }"
      :title="m.hint"
      @click="emit('update:modelValue', m.key)"
    >
      <span class="layout-pick__thumb">
        <ArticleLayoutThumb :thumb="m.thumb" fluid />
        <span v-if="current === m.key" class="layout-pick__check" aria-hidden="true">
          <el-icon><Select /></el-icon>
        </span>
      </span>
      <span class="layout-pick__name">{{ m.label }}</span>
    </button>
  </div>
  <div class="layout-pick__tip">
    当前：<b>{{ currentMeta.label }}</b> —— {{ currentMeta.hint }}
  </div>
</template>

<script setup lang="ts">
/**
 * 文章列表的布局选择器：3 列缩略图卡片网格。
 *
 * 为什么不用 el-radio-button：7 个纯文字按钮并排在 249px 面板里要折两行，
 * 运营无法从「卡片/列表/紧凑/封面沉浸/杂志首篇/双列网格/报刊细排」这些词
 * 预知排版效果，只能一个个拖进画布试。缩略图卡片让「长什么样」一眼可见。
 *
 * 3 列而非 2 列（2026-10-06）：7 项在 2 列下要占 4 行，3 列只要 3 行，
 * 省下一整行纵向滚动。代价是缩略图变窄 —— 因此同步把骨架尺寸从固定 96px
 * 改成 100% 自适应（ArticleLayoutThumb 的 compact 模式），
 * 否则 3 列会把 96px 骨架溢出格子、压变形，反而看不出「大图在上」还是「左图右文」。
 *
 * 元数据（中文名/示意类型/间距语义）全部来自 articleLayouts.ts，本组件不硬编码文案。
 */
import { computed } from 'vue'
import { Select } from '@element-plus/icons-vue'
import { ARTICLE_LAYOUT_LIST, type ArticleListLayout } from '../articleLayouts'
import ArticleLayoutThumb from './ArticleLayoutThumb.vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: ArticleListLayout] }>()

const current = computed(() => String(props.modelValue || ''))
const currentMeta = computed(
  () => ARTICLE_LAYOUT_LIST.find((m) => m.key === current.value) || ARTICLE_LAYOUT_LIST[1],
)
</script>

<style scoped lang="scss">
/*
 * 3 列：面板净宽约 205px，3×(约 62px) + 2×5px gap 刚好放下。
 * 骨架本身已改成自适应宽度，故列宽变化不会让示意图变形。
 */
.layout-pick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  width: 100%;
}

.layout-pick__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 2px 4px;
  font-family: inherit;
  background: #fbf8f4;
  border: 1px solid #e8dfd3;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.15s;

  &:hover {
    background: #f7efe7;
    border-color: #d9c7b4;
  }

  &:focus-visible {
    outline: 2px solid #c08e6e;
    outline-offset: 1px;
  }

  &.is-on {
    background: #f7efe7;
    border-color: #c08e6e;
    box-shadow: 0 0 0 1px #c08e6e;
  }
}

/* 相对定位容器：Checkmark 挂这里，不占用网格尺寸 */
.layout-pick__thumb {
  position: relative;
  display: block;
  width: 100%;
  line-height: 0;
}

.layout-pick__check {
  position: absolute;
  top: 2px;
  right: 2px;
  display: grid;
  place-items: center;
  width: 13px;
  height: 13px;
  color: #fff;
  line-height: 1;
  background: #c08e6e;
  border-radius: 999px;
  box-shadow: 0 0 0 1.5px #f7efe7;
}

.layout-pick__name {
  color: #6b5b4e;
  font-size: 10.5px;
  line-height: 1.2;
  white-space: nowrap;
}

.is-on .layout-pick__name {
  font-weight: 600;
  color: #8c3208;
}

.layout-pick__tip {
  width: 100%;
  margin-top: 6px;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.45;

  b {
    color: #8c3208;
  }
}
</style>