<template>
  <aside class="card tpl-preview-panel">
    <div class="tpl-preview-head">
      <h2 class="h2" style="font-size: 17px">{{ title }}</h2>
      <button type="button" class="btn sm" aria-label="关闭预览" @click="$emit('close')">关闭</button>
    </div>
    <div class="tpl-preview-actions">
      <button v-if="showApply" type="button" class="btn sm primary" @click="$emit('apply')">应用这套</button>
      <button v-if="showQr" type="button" class="btn sm" @click="$emit('qr')">
        <MiniIcon name="qr" :size="14" />
        扫码
      </button>
    </div>
    <div v-loading="loading" class="tpl-preview-phone-wrap">
      <MiniOverviewPhone v-if="previewSrc" :src="previewSrc" :title="title" iframe-key="tpl-preview" />
      <div v-else class="gen-empty" style="min-height: 200px">暂无预览</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import MiniOverviewPhone from '@/components/mini/MiniOverviewPhone.vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'

defineProps<{
  title: string
  previewSrc: string
  loading?: boolean
  showApply?: boolean
  showQr?: boolean
}>()

defineEmits<{
  close: []
  apply: []
  qr: []
}>()
</script>

<style scoped lang="scss">
.tpl-preview-panel {
  position: sticky;
  top: 72px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tpl-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.tpl-preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tpl-preview-phone-wrap {
  display: flex;
  justify-content: center;
  min-height: 420px;
}
</style>
