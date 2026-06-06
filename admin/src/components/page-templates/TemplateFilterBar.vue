<template>
  <div class="filter-bar">
    <div class="filter-search">
      <el-input
        v-model="localFilter.keyword"
        placeholder="搜索模板名称、功能..."
        :prefix-icon="Search"
        clearable
        size="default"
        @input="emitUpdate"
      />
    </div>

    <div class="filter-row">
      <span class="filter-label">分类：</span>
      <div class="filter-pills">
        <button
          v-for="(label, key) in categories"
          :key="key"
          class="pill"
          :class="{ active: localFilter.categories.includes(key as TemplateCategory) }"
          @click="toggleCategory(key as TemplateCategory)"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-label">风格：</span>
      <div class="filter-pills">
        <button
          v-for="(label, key) in styles"
          :key="key"
          class="pill"
          :class="{ active: localFilter.styles.includes(key as TemplateStyle) }"
          :style="{ '--accent': styleColor(key) }"
          @click="toggleStyle(key as TemplateStyle)"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-label">特性：</span>
      <div class="feature-chips">
        <el-checkbox v-model="featuresLocal.banner" @change="emitUpdate">轮播图</el-checkbox>
        <el-checkbox v-model="featuresLocal.productList" @change="emitUpdate">商品列表</el-checkbox>
        <el-checkbox v-model="featuresLocal.coupon" @change="emitUpdate">优惠券</el-checkbox>
        <el-checkbox v-model="featuresLocal.memberCard" @change="emitUpdate">会员卡</el-checkbox>
        <el-checkbox v-model="featuresLocal.countdown" @change="emitUpdate">倒计时</el-checkbox>
        <el-checkbox v-model="featuresLocal.richText" @change="emitUpdate">富文本</el-checkbox>
        <el-checkbox v-model="featuresLocal.video" @change="emitUpdate">视频</el-checkbox>
      </div>
    </div>

    <div class="filter-footer">
      <el-button text size="small" @click="reset">重置筛选</el-button>
      <span class="result-count">共 {{ resultCount ?? 0 }} 个模板</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { TemplateFilter, TemplateCategory, TemplateStyle } from '@/types/pageTemplate'
import {
  TemplateCategoryLabels,
  TemplateStyleLabels,
  TemplateStyleColorMap,
  createEmptyFilter,
} from '@/types/pageTemplate'

const props = defineProps<{
  modelValue: TemplateFilter
  resultCount?: number
}>()
const emit = defineEmits<{
  'update:modelValue': [value: TemplateFilter]
  reset: []
}>()

const localFilter = reactive<TemplateFilter>({ ...props.modelValue })
watch(
  () => props.modelValue,
  (v) => Object.assign(localFilter, v),
  { deep: true }
)

const categories = TemplateCategoryLabels
const styles = TemplateStyleLabels

const featuresLocal = reactive({
  banner: false,
  productList: false,
  coupon: false,
  memberCard: false,
  countdown: false,
  richText: false,
  video: false,
})

function toggleCategory(key: TemplateCategory) {
  const idx = localFilter.categories.indexOf(key)
  idx >= 0 ? localFilter.categories.splice(idx, 1) : (localFilter.categories = [key])
  emitUpdate()
}

function toggleStyle(key: TemplateStyle) {
  const idx = localFilter.styles.indexOf(key)
  idx >= 0 ? localFilter.styles.splice(idx, 1) : (localFilter.styles = [key])
  emitUpdate()
}

function styleColor(key: string): string {
  const entry = (TemplateStyleColorMap as Record<string, { start: string; end: string }>)[key]
  return entry?.start || '#666'
}

function emitUpdate() {
  const feats: (keyof import('@/types/pageTemplate').TemplateFeatures)[] = []
  if (featuresLocal.banner) feats.push('hasBanner')
  if (featuresLocal.productList) feats.push('hasProductList')
  if (featuresLocal.coupon) feats.push('hasCoupon')
  if (featuresLocal.memberCard) feats.push('hasMemberCard')
  if (featuresLocal.countdown) feats.push('hasCountdown')
  if (featuresLocal.richText) feats.push('hasRichText')
  if (featuresLocal.video) feats.push('hasVideo')
  localFilter.features = feats
  emit('update:modelValue', { ...localFilter })
}

function reset() {
  Object.assign(localFilter, createEmptyFilter())
  Object.assign(featuresLocal, {
    banner: false,
    productList: false,
    coupon: false,
    memberCard: false,
    countdown: false,
    richText: false,
    video: false,
  })
  emit('reset')
}
</script>

<style scoped>
.filter-bar {
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.filter-search {
  margin-bottom: 12px;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.filter-label {
  font-size: 13px;
  font-weight: 600;
  color: #607187;
  white-space: nowrap;
  min-width: 40px;
}
.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}
.pill {
  padding: 5px 14px;
  border: 1px solid #e3e8f0;
  border-radius: 99px;
  font-size: 12px;
  color: #607187;
  background: #fff;
  cursor: pointer;
  transition: 0.14s;
  white-space: nowrap;
}
.pill:hover {
  border-color: var(--accent, #1769ff);
  color: var(--accent, #1769ff);
}
.pill.active {
  color: #fff;
  border-color: var(--accent, #1769ff);
  background: var(--accent, #1769ff);
}
.feature-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  flex: 1;
}
.feature-chips :deep(.el-checkbox__label) {
  font-size: 12px;
  color: #607187;
}
.filter-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f2f5;
}
.result-count {
  font-size: 12px;
  color: #a0b4d0;
}
</style>
