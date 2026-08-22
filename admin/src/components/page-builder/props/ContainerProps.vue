<template>
  <div class="container-props">
    <el-form label-width="72px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title || ''" placeholder="可选" @input="(v: string) => emit('update', { title: v })" />
      </el-form-item>
      <el-form-item label="布局">
        <el-select :model-value="data.layout || 'row'" @change="(v: string) => emit('update', { layout: v })">
          <el-option label="横向" value="row" />
          <el-option label="纵向" value="stack" />
          <el-option label="网格" value="grid" />
          <el-option label="横滑" value="scroll" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="(data.layout || 'row') === 'grid'" label="列数">
        <el-input-number :model-value="Number(data.columns || 2)" :min="2" :max="4" controls-position="right" @change="(v: number | undefined) => emit('update', { columns: v || 2 })" />
      </el-form-item>
      <el-form-item label="间距">
        <el-input-number :model-value="Number(data.gap || 12)" :min="0" :max="40" controls-position="right" @change="(v: number | undefined) => emit('update', { gap: v ?? 12 })" />
      </el-form-item>
      <el-form-item label="背景色">
        <el-color-picker :model-value="data.background_color || ''" @change="(v: string | null) => emit('update', { background_color: v || '' })" />
      </el-form-item>
    </el-form>
    <div class="child-box">
      <div class="child-box__title">子组件</div>
      <div v-for="(child, idx) in children" :key="child.id" class="child-row">
        <span>{{ labelOf(child.type) }}</span>
        <el-button text type="danger" size="small" @click="removeChild(idx)">删除</el-button>
      </div>
      <el-select v-model="addType" placeholder="添加子组件" size="small" style="width: 100%" @change="onAdd">
        <el-option v-for="opt in addOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePageStore } from '@/stores/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const pageStore = usePageStore()
const addType = ref('')
const addOptions = [
  { label: '分区标题', value: ComponentType.SectionTitle },
  { label: '图片', value: ComponentType.Image },
  { label: '富文本', value: ComponentType.RichText },
  { label: '卖点卡片', value: ComponentType.FeatureCards },
  { label: '间距', value: ComponentType.Spacer },
  { label: '分割线', value: ComponentType.Divider },
]

const children = computed(() => pageStore.selectedComponent?.children || [])

function labelOf(type: string) {
  return (ComponentTypeLabels as any)[type] || type
}

function onAdd(type: string) {
  if (!type || !pageStore.selectedComponentId) return
  pageStore.addChildComponent(pageStore.selectedComponentId, type as ComponentType)
  addType.value = ''
}

function removeChild(index: number) {
  if (!pageStore.selectedComponentId) return
  pageStore.removeChildComponent(pageStore.selectedComponentId, index)
}
</script>

<style scoped>
.child-box { margin-top: 12px; padding-top: 12px; border-top: 1px solid #eef2f7; }
.child-box__title { margin-bottom: 8px; font-size: 12px; font-weight: 600; color: #64748b; }
.child-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
</style>
