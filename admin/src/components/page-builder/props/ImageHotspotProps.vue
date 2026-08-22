<template>
  <div>
    <el-form label-width="72px" size="small">
      <el-form-item label="底图">
        <el-input :model-value="data.image || ''" placeholder="图片 URL" @input="(v: string) => emit('update', { image: v })" />
      </el-form-item>
      <el-form-item label="热区">
        <div class="spots">
          <div v-for="(spot, idx) in spots" :key="idx" class="spot-row">
            <span>#{{ idx + 1 }}</span>
            <el-input-number :model-value="Number(spot.x || 0)" :min="0" :max="100" size="small" controls-position="right" @change="(v) => patchSpot(idx, { x: v ?? 0 })" />
            <el-input-number :model-value="Number(spot.y || 0)" :min="0" :max="100" size="small" controls-position="right" @change="(v) => patchSpot(idx, { y: v ?? 0 })" />
            <el-input-number :model-value="Number(spot.w || 20)" :min="5" :max="100" size="small" controls-position="right" @change="(v) => patchSpot(idx, { w: v ?? 20 })" />
            <el-input-number :model-value="Number(spot.h || 15)" :min="5" :max="100" size="small" controls-position="right" @change="(v) => patchSpot(idx, { h: v ?? 15 })" />
            <el-input :model-value="spot.link_url || ''" placeholder="跳转路径" size="small" @input="(v: string) => patchSpot(idx, { link_url: v })" />
            <el-button text type="danger" size="small" @click="removeSpot(idx)">删</el-button>
          </div>
          <el-button size="small" @click="addSpot">添加热区</el-button>
          <div class="hint">数值为相对底图的百分比：x/y/宽/高</div>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const spots = computed(() => Array.isArray(data.hotspots) ? data.hotspots : [])

function addSpot() {
  emit('update', {
    hotspots: [...spots.value, { x: 10, y: 10, w: 30, h: 20, link_url: '' }],
  })
}

function patchSpot(index: number, patch: Record<string, any>) {
  const next = spots.value.map((s: any, i: number) => (i === index ? { ...s, ...patch } : s))
  emit('update', { hotspots: next })
}

function removeSpot(index: number) {
  emit('update', { hotspots: spots.value.filter((_: any, i: number) => i !== index) })
}
</script>

<style scoped>
.spots { width: 100%; }
.spot-row { display: grid; grid-template-columns: 28px repeat(4, 1fr); gap: 4px; margin-bottom: 6px; align-items: center; }
.spot-row .el-input { grid-column: 1 / -2; }
.hint { margin-top: 6px; font-size: 11px; color: #94a3b8; }
</style>
