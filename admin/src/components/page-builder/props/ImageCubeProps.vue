<template>
  <div class="cube-props">
    <el-form label-width="72px" size="small">
      <el-form-item label="布局">
        <el-select :model-value="data.layout || '2x2'" @change="(v: string) => onLayout(v)">
          <el-option label="四宫格 2×2" value="2x2" />
          <el-option label="左一右二" value="1-2" />
          <el-option label="九宫格 3×3" value="3x3" />
        </el-select>
      </el-form-item>
      <el-form-item label="间距">
        <el-input-number :model-value="Number(data.gap ?? 6)" :min="0" :max="16" controls-position="right" @change="(v: number | undefined) => emit('update', { gap: v ?? 6 })" />
      </el-form-item>
      <el-form-item label="圆角">
        <el-input-number :model-value="Number(data.radius ?? 8)" :min="0" :max="24" controls-position="right" @change="(v: number | undefined) => emit('update', { radius: v ?? 8 })" />
      </el-form-item>
    </el-form>
    <div v-for="(item, idx) in items" :key="idx" class="item-card">
      <div class="item-card__head">
        <span>格子 {{ idx + 1 }}</span>
      </div>
      <el-form label-width="56px" size="small">
        <el-form-item label="图片">
          <el-input :model-value="item.image || ''" placeholder="图片 URL" @input="(v: string) => patch(idx, { image: v })" />
          <label class="upload-btn">
            上传
            <input type="file" accept="image/*" hidden @change="(e) => onUpload(idx, e)" />
          </label>
        </el-form-item>
        <el-form-item label="跳转">
          <el-select :model-value="item.link_type || 'none'" @change="(v: string) => patch(idx, { link_type: v })">
            <el-option label="无" value="none" />
            <el-option label="页面" value="page" />
            <el-option label="外链" value="url" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="(item.link_type || 'none') !== 'none'" label="地址">
          <el-input :model-value="item.link_url || ''" @input="(v: string) => patch(idx, { link_url: v })" />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useImageUpload } from '../composables/useImageUpload'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const { uploadImage } = useImageUpload()

const slotCount: Record<string, number> = { '2x2': 4, '1-2': 3, '3x3': 9 }

const items = computed(() => (Array.isArray(data.items) ? data.items : []))

function ensureCount(layout: string, list: any[]) {
  const n = slotCount[layout] || 4
  const next = list.slice(0, n)
  while (next.length < n) next.push({ image: '', link_type: 'none', link_url: '' })
  return next
}

function onLayout(layout: string) {
  emit('update', { layout, items: ensureCount(layout, items.value) })
}

function patch(index: number, patch: Record<string, any>) {
  emit('update', { items: items.value.map((it: any, i: number) => (i === index ? { ...it, ...patch } : it)) })
}

async function onUpload(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, { maxSizeMB: 5, onSuccess: (url: string) => patch(index, { image: url }) })
}
</script>

<style scoped>
.item-card { margin-bottom: 10px; padding: 8px; background: #f8fafc; border-radius: 8px; }
.item-card__head { margin-bottom: 6px; font-size: 12px; color: #64748b; }
.upload-btn {
  display: inline-flex; margin-top: 6px; padding: 0 10px; height: 28px; align-items: center;
  font-size: 12px; color: var(--color-primary); border: 1px solid #c9d8ff; border-radius: 6px; cursor: pointer;
}
</style>
