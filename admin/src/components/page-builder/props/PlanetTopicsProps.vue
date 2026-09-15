<template>
  <div class="planet-props">
    <el-form label-width="72px" size="small">
      <el-form-item label="数据来源">
        <el-radio-group :model-value="data.source_mode || 'auto'" @change="(v: string) => emit('update', { source_mode: v })">
          <el-radio-button value="auto">接口自动</el-radio-button>
          <el-radio-button value="manual">手动配置</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="标题">
        <el-input :model-value="data.title || ''" @input="(v: string) => emit('update', { title: v })" />
      </el-form-item>
      <el-form-item label="角标">
        <el-input :model-value="data.badge || ''" @input="(v: string) => emit('update', { badge: v })" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" :rows="3" :model-value="data.note || ''" @input="(v: string) => emit('update', { note: v })" />
      </el-form-item>
    </el-form>
    <div class="item-head">话题条目</div>
    <div v-for="(item, idx) in items" :key="idx" class="item-card">
      <el-input :model-value="item.name || ''" placeholder="话题名" @input="(v: string) => patch(idx, { name: v })" />
      <div class="item-row">
        <el-input-number :model-value="Number(item.width || 40)" :min="5" :max="100" controls-position="right" @change="(v: number | undefined) => patch(idx, { width: v ?? 40 })" />
        <el-input :model-value="item.pct || ''" placeholder="↑ 12%" @input="(v: string) => patch(idx, { pct: v })" />
        <el-checkbox :model-value="!!item.down" @change="(v: boolean | string | number) => patch(idx, { down: !!v })">下跌</el-checkbox>
      </div>
    </div>
    <el-button size="small" @click="addItem">+ 话题</el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const items = computed(() => (Array.isArray(data.items) ? data.items : []))
function patch(index: number, patch: Record<string, any>) {
  emit('update', { items: items.value.map((it: any, i: number) => (i === index ? { ...it, ...patch } : it)) })
}
function addItem() {
  emit('update', { items: [...items.value, { name: '新话题', width: 40, pct: '↑ 0%' }] })
}
</script>

<style scoped>
.item-head { margin: 8px 0 6px; font-size: 12px; font-weight: 700; color: #64748b; }
.item-card { margin-bottom: 8px; padding: 8px; border: 1px solid #eef2f7; border-radius: 8px; }
.item-row { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
</style>
