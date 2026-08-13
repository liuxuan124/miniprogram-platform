<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="预约服务标题" />
    </el-form-item>
    <el-form-item label="标题字号">
      <el-input-number
        :model-value="data.section_title_font_size ?? 15"
        :min="10"
        :max="28"
        controls-position="right"
        @change="(v: number) => emit('update', { section_title_font_size: v })"
      />
    </el-form-item>
    <TitleFontSizeFields
      :data="data"
      title-label="服务名字号"
      subtitle-label="说明字号"
      :title-default="12"
      :subtitle-default="11"
      @update="(v) => emit('update', v)"
    />

    <el-divider content-position="left" class="field-divider">服务列表</el-divider>
    <div v-for="(item, i) in services" :key="i" class="svc-card">
      <div class="svc-card__head">
        <span>服务{{ i + 1 }}</span>
        <el-button type="danger" text size="small" @click="onRemoveService(i)">删除</el-button>
      </div>
      <el-form-item label="名称" label-width="50px">
        <el-input :model-value="item.name || ''" @input="onUpdateService(i, 'name', $event)" placeholder="服务名称" />
      </el-form-item>
      <el-form-item label="说明" label-width="50px">
        <el-input :model-value="item.desc || ''" @input="onUpdateService(i, 'desc', $event)" placeholder="服务说明" />
      </el-form-item>
      <el-form-item label="按钮" label-width="50px">
        <el-input :model-value="item.button_text || '立即预约'" @input="onUpdateService(i, 'button_text', $event)" placeholder="立即预约" />
      </el-form-item>
      <el-form-item label="链接" label-width="50px">
        <el-input :model-value="item.link_url || ''" @input="onUpdateService(i, 'link_url', $event)" placeholder="/pages/appointment-calendar/..." />
      </el-form-item>
    </div>
    <el-button type="primary" text size="small" @click="onAddService">+ 添加服务</el-button>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useListEditor } from '../composables/useListEditor'
import TitleFontSizeFields from './TitleFontSizeFields.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const services = computed(() => {
  const raw = data.services
  return Array.isArray(raw) ? raw : []
})

const { addItem, removeItem, updateItem } = useListEditor(services, {
  createDefault: () => ({ name: '', desc: '', button_text: '立即预约', link_url: '' }),
  maxItems: 20,
})

function onAddService() {
  emit('update', { services: addItem() })
}

function onRemoveService(index: number) {
  emit('update', { services: removeItem(index) })
}

function onUpdateService(index: number, field: string, value: string) {
  emit('update', { services: updateItem(index, (item) => ({ ...item, [field]: value })) })
}
</script>

<style scoped>
.field-divider {
  margin: 10px 0 6px;
  font-size: 12px;
  color: #8a94a6;
}

.svc-card {
  margin-bottom: 8px;
  padding: 8px;
  background: #f8faff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}

.svc-card__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: #7b8798;
  font-size: 12px;
}
</style>
