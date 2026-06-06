<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="公告标题" />
    </el-form-item>
    <el-divider content-position="left">公告条目</el-divider>
    <div v-for="(item, i) in items" :key="i" style="margin-bottom: 6px; display: flex; gap: 4px; align-items: center;">
      <el-input :model-value="item" @input="onItemInput(i, $event)" placeholder="公告内容" style="flex: 1" />
      <el-button type="danger" text size="small" @click="removeItem(i)">删除</el-button>
    </div>
    <el-button type="primary" text size="small" @click="addItem" style="margin-left: 70px">+ 添加公告</el-button>
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

const { addItem: add, removeItem: remove, updateItem: update } = useListEditor(items, {
  createDefault: () => '',
  maxItems: 20,
})

function addItem() {
  add()
  emit('update', { items: [...items.value] })
}

function removeItem(index: number) {
  remove(index)
  emit('update', { items: [...items.value] })
}

function onItemInput(index: number, value: string) {
  update(index, '', value)
  emit('update', { items: [...items.value] })
}
</script>
