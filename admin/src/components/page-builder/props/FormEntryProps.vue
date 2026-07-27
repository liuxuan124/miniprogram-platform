<template>
  <div class="form-entry-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="关联表单">
        <el-select
          :model-value="selectedFormId"
          :loading="loading"
          clearable
          filterable
          placeholder="请选择已启用表单"
          style="width: 100%"
          @change="onFormChange"
        >
          <el-option
            v-for="item in templates"
            :key="item.id"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>
      </el-form-item>
      <el-alert
        v-if="!loading && templates.length === 0"
        type="warning"
        title="暂无可用表单，请先在表单管理中创建并启用"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="表单标题" />
      </el-form-item>
      <el-form-item label="按钮文字">
        <el-input :model-value="data.buttonText" @input="emit('update', { buttonText: $event })" placeholder="立即填写" />
      </el-form-item>
      <el-form-item label="样式">
        <el-select :model-value="data.style" @change="emit('update', { style: $event as string })" style="width: 100%">
          <el-option label="卡片" value="card" />
          <el-option label="列表" value="list" />
          <el-option label="极简" value="minimal" />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getFormTemplateList } from '@/api/form'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const loading = ref(false)
const templates = ref<Array<{ id: number; name: string }>>([])
const selectedFormId = computed(() => String(data.formTemplateId || data.formId || ''))

function onFormChange(value: string) {
  emit('update', { formTemplateId: value || '', formId: value || '' })
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await getFormTemplateList({ page: 1, page_size: 100, status: 'active' })
    const payload = (res as any)?.data || {}
    const records = payload.records || payload.list || []
    templates.value = (Array.isArray(records) ? records : []).map((item: any) => ({
      id: Number(item.id),
      name: item.name || item.title || `表单 ${item.id}`,
    }))
  } catch {
    templates.value = []
  } finally {
    loading.value = false
  }
})
</script>
