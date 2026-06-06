<template>
  <div class="tpl-card" :class="{ active: selected }" @click="$emit('select', template)">
    <div class="tpl-cover" :style="{ background: coverGradient }">
      <span class="tpl-icon">{{ template.icon }}</span>
      <span v-if="template.isOfficial" class="official-badge">官方</span>
    </div>
    <div class="tpl-body">
      <h4>{{ template.name }}</h4>
      <p>{{ template.description }}</p>
      <div class="tpl-tags">
        <span class="tag cat">{{ categoryLabel }}</span>
        <span class="tag style">{{ styleLabel }}</span>
        <span v-for="tag in featureTags" :key="tag" class="tag feat">{{ tag }}</span>
      </div>
      <div class="tpl-actions">
        <el-button text size="small" @click.stop="$emit('preview', template)">👁 预览</el-button>
        <el-button type="primary" size="small" @click.stop="$emit('apply', template)">✨ 使用</el-button>
        <el-button text size="small" @click.stop="$emit('edit', template)">✏️ 编辑</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageTemplate } from '@/types/pageTemplate'
import { TemplateCategoryLabels, TemplateStyleLabels } from '@/types/pageTemplate'

const props = defineProps<{ template: PageTemplate; selected?: boolean }>()
defineEmits<{ select: [t: PageTemplate]; preview: [t: PageTemplate]; apply: [t: PageTemplate]; edit: [t: PageTemplate] }>()

const categoryLabel = computed(() => TemplateCategoryLabels[props.template.category] || props.template.category)
const styleLabel = computed(() => TemplateStyleLabels[props.template.style] || props.template.style)

const featureTags = computed(() => {
  const f = props.template.features || {}
  const labels: string[] = []
  if (f.hasBanner) labels.push('轮播')
  if (f.hasNavGrid) labels.push('宫格')
  if (f.hasProductList) labels.push('商品')
  if (f.hasCoupon) labels.push('优惠券')
  if (f.hasMemberCard) labels.push('会员卡')
  if (f.hasCountdown) labels.push('倒计时')
  return labels.slice(0, 3)
})

const coverGradient = computed(() => {
  const c = props.template.coverColor || '#1769ff'
  return `linear-gradient(135deg, ${c}, ${c}99)`
})
</script>

<style scoped>
.tpl-card {
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #e3e8f0;
  cursor: pointer;
  transition: all 0.16s;
  background: #fff;
}
.tpl-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border-color: #a0b4d0;
}
.tpl-card.active {
  border-color: #1769ff;
  box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.15);
}
.tpl-cover {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.tpl-icon {
  font-size: 48px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
}
.official-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #1769ff;
  border-radius: 99px;
  font-weight: 700;
}
.tpl-body {
  padding: 14px;
}
.tpl-body h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: #172033;
}
.tpl-body p {
  margin: 0 0 8px;
  font-size: 11px;
  color: #7b8798;
  line-height: 1.4;
}
.tpl-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
}
.tag {
  padding: 1px 7px;
  font-size: 10px;
  border-radius: 99px;
}
.tag.cat {
  background: #eff6ff;
  color: #1769ff;
}
.tag.style {
  background: #f0fdf4;
  color: #16a34a;
}
.tag.feat {
  background: #f8faff;
  color: #607187;
}
.tpl-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}
</style>
