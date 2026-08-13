<template>
  <div class="form-entry-props">
    <el-form label-width="80px" size="small">
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
        <el-input :model-value="data.title || ''" @input="emit('update', { title: $event })" placeholder="填写信息" />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input
          :model-value="data.subtitle || ''"
          @input="emit('update', { subtitle: $event })"
          placeholder="可选，如：30 秒快速提交"
        />
      </el-form-item>
      <el-form-item label="按钮文案">
        <el-input
          :model-value="buttonText"
          @input="onButtonTextInput"
          placeholder="立即填写"
        />
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="data.style || 'card'" @change="(v: string) => emit('update', { style: v })">
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="minimal">极简</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="标题字号">
        <el-input-number
          :model-value="data.title_font_size ?? 14"
          :min="10"
          :max="28"
          controls-position="right"
          @change="(v: number) => emit('update', { title_font_size: v })"
        />
      </el-form-item>
      <el-form-item label="副标题字号">
        <el-input-number
          :model-value="data.subtitle_font_size ?? 11"
          :min="8"
          :max="20"
          controls-position="right"
          @change="(v: number) => emit('update', { subtitle_font_size: v })"
        />
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
const buttonText = computed(() => data.button_text || data.buttonText || '立即填写')

function onFormChange(value: string) {
  const id = value || ''
  const hit = templates.value.find((item) => String(item.id) === id)
  emit('update', {
    formTemplateId: id,
    formId: id,
    form_name: hit?.name || '',
  })
}

function onButtonTextInput(value: string) {
  emit('update', { button_text: value, buttonText: value })
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
