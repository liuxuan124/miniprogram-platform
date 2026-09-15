<template>
  <div>
    <div v-for="(pane, pIdx) in panes" :key="pIdx" class="pane-card">
      <div class="pane-card__head">
        <span>分页 {{ pIdx + 1 }}</span>
        <el-button text type="danger" size="small" :disabled="panes.length <= 2" @click="removePane(pIdx)">删除</el-button>
      </div>
      <el-form label-width="56px" size="small">
        <el-form-item label="标题">
          <el-input :model-value="pane.title || ''" maxlength="8" @input="(v: string) => patchPane(pIdx, { title: v })" />
        </el-form-item>
      </el-form>
      <div v-for="(item, iIdx) in pane.items || []" :key="iIdx" class="item-row">
        <el-input :model-value="item.title || ''" placeholder="条目标题" @input="(v: string) => patchItem(pIdx, iIdx, { title: v })" />
        <el-input :model-value="item.link_url || ''" placeholder="跳转路径" @input="(v: string) => patchItem(pIdx, iIdx, { link_url: v })" />
        <el-button text type="danger" size="small" @click="removeItem(pIdx, iIdx)">删</el-button>
      </div>
      <el-button text type="primary" size="small" @click="addItem(pIdx)">+ 条目</el-button>
    </div>
    <el-button size="small" :disabled="panes.length >= 6" @click="addPane">添加分页</el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
const panes = computed(() => (Array.isArray(data.panes) ? data.panes : []))

function emitPanes(next: any[]) {
  emit('update', { panes: next })
}

function patchPane(index: number, patch: Record<string, any>) {
  emitPanes(panes.value.map((p: any, i: number) => (i === index ? { ...p, ...patch } : p)))
}

function addPane() {
  emitPanes([...panes.value, { title: '新分页', items: [{ image: '', title: '', desc: '', link_type: 'page', link_url: '' }] }])
}

function removePane(index: number) {
  emitPanes(panes.value.filter((_: any, i: number) => i !== index))
}

function patchItem(pIdx: number, iIdx: number, patch: Record<string, any>) {
  emitPanes(panes.value.map((p: any, i: number) => {
    if (i !== pIdx) return p
    const items = (p.items || []).map((it: any, j: number) => (j === iIdx ? { ...it, ...patch } : it))
    return { ...p, items }
  }))
}

function addItem(pIdx: number) {
  emitPanes(panes.value.map((p: any, i: number) => {
    if (i !== pIdx) return p
    return { ...p, items: [...(p.items || []), { image: '', title: '新条目', desc: '', link_type: 'page', link_url: '' }] }
  }))
}

function removeItem(pIdx: number, iIdx: number) {
  emitPanes(panes.value.map((p: any, i: number) => {
    if (i !== pIdx) return p
    return { ...p, items: (p.items || []).filter((_: any, j: number) => j !== iIdx) }
  }))
}
</script>

<style scoped>
.pane-card { margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 8px; }
.pane-card__head { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #64748b; }
.item-row { display: flex; gap: 6px; margin-bottom: 6px; }
</style>
