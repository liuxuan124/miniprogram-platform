<template>
  <div class="planet-props">
    <el-form label-width="84px" size="small">
      <el-form-item label="数据来源">
        <el-radio-group :model-value="data.source_mode || 'auto'" @change="(v: string) => emit('update', { source_mode: v })">
          <el-radio-button value="auto">接口自动</el-radio-button>
          <el-radio-button value="manual">手动配置</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="图标">
        <el-input :model-value="data.logo_emoji || '🪐'" @input="(v: string) => emit('update', { logo_emoji: v })" />
      </el-form-item>
      <el-form-item label="标题">
        <el-input :model-value="data.title || ''" @input="(v: string) => emit('update', { title: v })" />
      </el-form-item>
      <el-form-item label="副标题">
        <el-input :model-value="data.subtitle || ''" @input="(v: string) => emit('update', { subtitle: v })" />
      </el-form-item>
      <el-form-item label="加入文案">
        <el-input :model-value="data.join_text || '加入'" @input="(v: string) => emit('update', { join_text: v })" />
      </el-form-item>
      <el-form-item label="加入跳转">
        <el-input :model-value="data.join_link || ''" @input="(v: string) => emit('update', { join_link: v })" />
      </el-form-item>
      <el-form-item label="有效期文案">
        <el-input type="textarea" :rows="2" :model-value="data.expire_text || ''" @input="(v: string) => emit('update', { expire_text: v })" />
      </el-form-item>
      <el-form-item label="加群文案">
        <el-input :model-value="data.join_row_text || ''" @input="(v: string) => emit('update', { join_row_text: v })" />
      </el-form-item>
    </el-form>
    <div class="kpi-head">KPI 卡片</div>
    <div v-for="(item, idx) in kpis" :key="idx" class="kpi-row">
      <el-input :model-value="item.value || ''" placeholder="数值" @input="(v: string) => patchKpi(idx, { value: v })" />
      <el-input :model-value="item.label || ''" placeholder="标签" @input="(v: string) => patchKpi(idx, { label: v })" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const kpis = computed(() => (Array.isArray(data.kpis) ? data.kpis : []))
function patchKpi(index: number, patch: Record<string, any>) {
  emit('update', {
    kpis: kpis.value.map((it: any, i: number) => (i === index ? { ...it, ...patch } : it)),
  })
}
</script>

<style scoped>
.kpi-head { margin: 8px 0 6px; font-size: 12px; font-weight: 700; color: #64748b; }
.kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
</style>
