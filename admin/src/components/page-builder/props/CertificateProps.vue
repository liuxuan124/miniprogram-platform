<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="资质证书" />
    </el-form-item>
    <el-divider content-position="left">证书条目</el-divider>
    <div v-for="(item, i) in items" :key="i" style="margin-bottom: 8px; padding: 6px; background: #f8faff; border: 1px solid #e3e8f0; border-radius: 6px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #7b8798; font-size: 12px;">
        <span>证书{{ i + 1 }}</span>
        <el-button type="danger" text size="small" @click="onRemoveItem(i)">删除</el-button>
      </div>
      <el-form-item label="名称" label-width="50px">
        <el-input :model-value="item.name || ''" @input="onUpdateItem(i, 'name', $event)" placeholder="证书名称" />
      </el-form-item>
    </div>
    <el-button type="primary" text size="small" @click="onAddItem" style="margin-left: 70px">+ 添加证书</el-button>
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
  createDefault: () => ({ name: '' }),
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
