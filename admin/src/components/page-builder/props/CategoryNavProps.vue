<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="分类导航标题" />
    </el-form-item>
    <el-form-item label="布局">
      <el-select :model-value="data.layout || 'grid'" @change="emit('update', { layout: $event })" style="width: 100%">
        <el-option label="网格" value="grid" />
        <el-option label="横向滚动" value="scroll" />
        <el-option label="胶囊" value="pill" />
        <el-option label="列表" value="list" />
      </el-select>
    </el-form-item>
    <el-form-item label="列数">
      <el-input-number :model-value="data.columns || 4" @change="emit('update', { columns: $event })" :min="2" :max="8" controls-position="right" />
    </el-form-item>
    <el-divider content-position="left">分类项</el-divider>
    <div v-for="(item, i) in items" :key="i" style="margin-bottom: 8px; padding: 6px; background: #f8faff; border: 1px solid #e3e8f0; border-radius: 6px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #7b8798; font-size: 12px;">
        <span>分类{{ i + 1 }}</span>
        <el-button type="danger" text size="small" @click="onRemoveItem(i)">删除</el-button>
      </div>
      <el-form-item label="图标" label-width="50px">
        <el-input :model-value="item.icon || ''" @input="onUpdateItem(i, 'icon', $event)" placeholder="Emoji 或图片URL" />
      </el-form-item>
      <el-form-item label="名称" label-width="50px">
        <el-input :model-value="item.title || ''" @input="onUpdateItem(i, 'title', $event)" placeholder="分类名称" />
      </el-form-item>
      <el-form-item label="链接" label-width="50px">
        <el-input :model-value="item.link_url || ''" @input="onUpdateItem(i, 'link_url', $event)" placeholder="/pages/xxx/xxx" />
      </el-form-item>
    </div>
    <el-button type="primary" text size="small" @click="onAddItem" style="margin-left: 70px">+ 添加分类项</el-button>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useListEditor } from '../composables/useListEditor'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const items = computed(() => {
  const raw = data.items
  return Array.isArray(raw) ? raw : []
})

const { addItem, removeItem, updateItem } = useListEditor(items, {
  createDefault: () => ({ icon: '📌', title: '', link_url: '' }),
  maxItems: 20,
})

function onAddItem() {
  addItem()
  emit('update', { items: [...items.value] })
}

function onRemoveItem(index: number) {
  removeItem(index)
  emit('update', { items: [...items.value] })
}

function onUpdateItem(index: number, field: string, value: string) {
  updateItem(index, field, value)
  emit('update', { items: [...items.value] })
}
</script>
