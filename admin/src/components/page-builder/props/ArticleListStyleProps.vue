<template>
  <el-form label-width="76px" size="small" class="al-style">
    <div class="al-style__lead">
      这些只影响外观显示，已从「内容」页签移到这里 —— 内容页签只管数据、文案与筛选。
    </div>

    <el-form-item :label="gap.label">
      <NumSliderRow
        :model-value="Number(data.item_gap ?? 8)"
        :min="0"
        :max="48"
        :step="2"
        :fallback="8"
        @update:model-value="(v: number) => emit('update', { item_gap: v })"
      />
      <div class="ds-hint">{{ gap.hint }}</div>
    </el-form-item>

    <el-form-item label="标题字号">
      <NumSliderRow
        :model-value="Number(data.title_font_size ?? 13)"
        :min="TITLE_FONT_MIN"
        :max="TITLE_FONT_MAX"
        :step="1"
        :fallback="13"
        @update:model-value="(v: number) => emit('update', { title_font_size: v })"
      />
      <div class="ds-hint">{{ TITLE_FONT_MIN }}–{{ TITLE_FONT_MAX }} px 视觉舒适区间</div>
    </el-form-item>

    <el-form-item label="日期字号">
      <NumSliderRow
        :model-value="Number(data.subtitle_font_size ?? 11)"
        :min="DATE_FONT_MIN"
        :max="DATE_FONT_MAX"
        :step="1"
        :fallback="11"
        @update:model-value="(v: number) => emit('update', { subtitle_font_size: v })"
      />
      <div class="ds-hint">{{ DATE_FONT_MIN }}–{{ DATE_FONT_MAX }} px，不建议大于标题字号</div>
    </el-form-item>

    <el-form-item v-if="layoutMeta.gapScope === 'none'" class="al-style__note">
      <div class="ds-hint">
        「{{ layoutMeta.label }}」布局由排版本身决定间距，条目间距对其无效 —— 已隐藏该字段。
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import NumSliderRow from './NumSliderRow.vue'
import { gapLabelOf, layoutMetaOf } from '../articleLayouts'

/**
 * 文章列表的「样式」子面板（在 PropsPanel 的样式页签渲染）。
 *
 * 为什么独立成文件而不是塞回 ArticleListProps：
 * 内容页签只该管数据源/文案/筛选；字号与间距是纯视觉规则，混在内容页签里
 * 会让运营为找一个字号滚过 6 个业务区块。PropsPanel 的 `stylePanelMap` 就是为此预留的。
 */

/** 字号安全区间：中文正文低于 12px 真机发虚，高于 20px 在 375 画幅下会折行 */
const TITLE_FONT_MIN = 12
const TITLE_FONT_MAX = 20
const DATE_FONT_MIN = 10
const DATE_FONT_MAX = 14

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [patch: Record<string, any>] }>()

const gap = computed(() => gapLabelOf(data.layout || data.style_type))
const layoutMeta = computed(() => layoutMetaOf(data.layout || data.style_type))
</script>

<style scoped lang="scss">
.al-style__lead {
  margin-bottom: 10px;
  padding: 7px 9px;
  color: #6b7a8d;
  font-size: 11px;
  line-height: 1.5;
  background: #f5f7fb;
  border-radius: 6px;
}

.al-style__note :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.ds-hint {
  margin: 4px 0 0;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}
</style>
