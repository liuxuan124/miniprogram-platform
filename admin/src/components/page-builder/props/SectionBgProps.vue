<template>
  <div>
    <el-form label-width="72px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title || ''" @input="(v: string) => emit('update', { title: v })" />
      </el-form-item>
      <el-form-item label="背景类型">
        <el-radio-group :model-value="data.background_type || 'color'" @change="(v: string) => emit('update', { background_type: v })">
          <el-radio-button value="color">纯色</el-radio-button>
          <el-radio-button value="gradient">渐变</el-radio-button>
          <el-radio-button value="image">图片</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="(data.background_type || 'color') === 'color'" label="背景色">
        <el-color-picker :model-value="data.background_color || '#F5F7FB'" @change="(v: string | null) => emit('update', { background_color: v || '#F5F7FB' })" />
      </el-form-item>
      <template v-else-if="data.background_type === 'gradient'">
        <el-form-item label="起始色">
          <el-color-picker :model-value="data.gradient_from || '#F5F7FB'" @change="(v: string | null) => emit('update', { gradient_from: v || '#F5F7FB' })" />
        </el-form-item>
        <el-form-item label="结束色">
          <el-color-picker :model-value="data.gradient_to || '#FFFFFF'" @change="(v: string | null) => emit('update', { gradient_to: v || '#FFFFFF' })" />
        </el-form-item>
      </template>
      <el-form-item v-else label="背景图">
        <el-input :model-value="data.background_image || ''" placeholder="图片 URL" @input="(v: string) => emit('update', { background_image: v })" />
      </el-form-item>
      <el-form-item label="最小高度">
        <el-input-number :model-value="Number(data.min_height || 120)" :min="40" :max="600" controls-position="right" @change="(v: number | undefined) => emit('update', { min_height: v || 120 })" />
      </el-form-item>
    </el-form>
    <div class="child-box">
      <div class="child-box__title">子组件</div>
      <div v-for="(child, idx) in children" :key="child.id" class="child-row">
        <span>{{ labelOf(child.type) }}</span>
        <el-button text type="danger" size="small" @click="removeChild(idx)">删除</el-button>
      </div>
      <el-select v-model="addType" placeholder="添加子组件" size="small" style="width: 100%" @change="onAdd">
        <el-option label="分区标题" :value="ComponentType.SectionTitle" />
        <el-option label="富文本" :value="ComponentType.RichText" />
        <el-option label="卖点卡片" :value="ComponentType.FeatureCards" />
        <el-option label="图片" :value="ComponentType.Image" />
        <el-option label="间距" :value="ComponentType.Spacer" />
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
