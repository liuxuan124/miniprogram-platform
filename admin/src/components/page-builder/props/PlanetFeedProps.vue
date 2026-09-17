<template>
  <div class="planet-props">
    <el-form label-width="84px" size="small">
      <el-form-item label="数据来源">
        <el-radio-group :model-value="data.source_mode || 'auto'" @change="(v: string) => emit('update', { source_mode: v })">
          <el-radio-button value="auto">星球动态接口</el-radio-button>
          <el-radio-button value="manual">演示/手动</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="条数">
        <el-input-number :model-value="Number(data.page_size || 20)" :min="5" :max="50" controls-position="right" @change="(v: number | undefined) => emit('update', { page_size: v ?? 20 })" />
      </el-form-item>
      <el-form-item label="资料库路径">
        <el-input :model-value="data.resources_url || ''" @input="(v: string) => emit('update', { resources_url: v })" />
      </el-form-item>
    </el-form>
    <div class="item-head">分段标签</div>
    <div v-for="(seg, idx) in segs" :key="idx" class="seg-row">
      <el-input :model-value="seg.key || ''" placeholder="key" @input="(v: string) => patch(idx, { key: v })" />
      <el-input :model-value="seg.label || ''" placeholder="显示名" @input="(v: string) => patch(idx, { label: v })" />
    </div>
    <el-button size="small" @click="addSeg">+ 分段</el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const segs = computed(() => (Array.isArray(data.segs) ? data.segs : []))
function patch(index: number, patch: Record<string, any>) {
  emit('update', { segs: segs.value.map((it: any, i: number) => (i === index ? { ...it, ...patch } : it)) })
}
function addSeg() {
  emit('update', { segs: [...segs.value, { key: 'seg', label: '新分段' }] })
}
</script>

<style scoped>
.item-head { margin: 8px 0 6px; font-size: 12px; font-weight: 700; color: #64748b; }
.seg-row { display: grid; grid-template-columns: 1fr 1.4fr; gap: 6px; margin-bottom: 6px; }
</style>
