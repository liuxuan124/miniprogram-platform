<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="预约服务标题" />
    </el-form-item>
    <el-form-item label="按钮文案">
      <el-input :model-value="data.button_text" @input="emit('update', { button_text: $event })" placeholder="立即预约" />
    </el-form-item>
    <el-divider content-position="left">服务列表</el-divider>
    <div v-for="(item, i) in services" :key="i" style="margin-bottom: 8px; padding: 6px; background: #f8faff; border: 1px solid #e3e8f0; border-radius: 6px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #7b8798; font-size: 12px;">
        <span>服务{{ i + 1 }}</span>
        <el-button type="danger" text size="small" @click="onRemoveService(i)">删除</el-button>
      </div>
      <el-form-item label="名称" label-width="50px">
        <el-input :model-value="item.name || ''" @input="onUpdateService(i, 'name', $event)" placeholder="服务名称" />
      </el-form-item>
      <el-form-item label="说明" label-width="50px">
        <el-input :model-value="item.desc || ''" @input="onUpdateService(i, 'desc', $event)" placeholder="服务说明" />
      </el-form-item>
      <el-form-item label="链接" label-width="50px">
        <el-input :model-value="item.link_url || ''" @input="onUpdateService(i, 'link_url', $event)" placeholder="/pages/xxx/xxx" />
      </el-form-item>
    </div>
    <el-button type="primary" text size="small" @click="onAddService" style="margin-left: 70px">+ 添加服务</el-button>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useListEditor } from '../composables/useListEditor'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const services = computed(() => {
  const raw = data.services
  return Array.isArray(raw) ? raw : []
})

const { addItem, removeItem, updateItem } = useListEditor(services, {
  createDefault: () => ({ name: '', desc: '', link_url: '' }),
  maxItems: 20,
})

function onAddService() {
  addItem()
  emit('update', { services: [...services.value] })
}

function onRemoveService(index: number) {
  removeItem(index)
  emit('update', { services: [...services.value] })
}

function onUpdateService(index: number, field: string, value: string) {
  updateItem(index, field, value)
  emit('update', { services: [...services.value] })
}
</script>
