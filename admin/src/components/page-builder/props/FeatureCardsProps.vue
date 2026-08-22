<template>
  <div>
    <el-form label-width="72px" size="small">
      <el-form-item label="列数">
        <el-input-number :model-value="Number(data.columns || 3)" :min="2" :max="4" controls-position="right" @change="(v: number | undefined) => emit('update', { columns: v || 3 })" />
      </el-form-item>
    </el-form>
    <div v-for="(item, idx) in items" :key="idx" class="item-card">
      <div class="item-card__head">
        <span>卡片 {{ idx + 1 }}</span>
        <el-button text type="danger" size="small" @click="removeItem(idx)">删除</el-button>
      </div>
      <el-form label-width="48px" size="small">
        <el-form-item label="图标">
          <el-input :model-value="item.icon || ''" @input="(v: string) => patchItem(idx, { icon: v })" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input :model-value="item.title || ''" @input="(v: string) => patchItem(idx, { title: v })" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input :model-value="item.desc || ''" type="textarea" :rows="2" @input="(v: string) => patchItem(idx, { desc: v })" />
        </el-form-item>
      </el-form>
    </div>
    <el-button size="small" @click="addItem" :disabled="items.length >= 9">添加卡片</el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const items = computed(() => Array.isArray(data.items) ? data.items : [])

function addItem() {
  emit('update', { items: [...items.value, { icon: '✨', title: '新卖点', desc: '' }] })
}
function patchItem(index: number, patch: Record<string, any>) {
  emit('update', { items: items.value.map((it: any, i: number) => (i === index ? { ...it, ...patch } : it)) })
}
function removeItem(index: number) {
  emit('update', { items: items.value.filter((_: any, i: number) => i !== index) })
}
</script>

<style scoped>
.item-card { margin-bottom: 10px; padding: 8px; background: #f8fafc; border-radius: 8px; }
.item-card__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 12px; color: #64748b; }
</style>
