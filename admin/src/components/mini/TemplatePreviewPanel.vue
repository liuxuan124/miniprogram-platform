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
      <!-- 🔴 有骨架 → 可交互手机壳（底部 tab 可点击切页） -->
      <TemplatePhonePreview v-if="usePhone" :item="item" :title="title" />
      <!-- 取不到骨架 → 退回原来的静态图预览 -->
      <DevicePreview
        v-else-if="previewSrc"
        frame-only
        :preview-url="previewSrc"
        :iframe-key="'tpl-preview'"
      />
      <div v-else class="gen-empty" style="min-height: 200px">暂无预览</div>
    </div>
    <p v-if="usePhone && skeleton.length > 1" class="tpl-preview-tip">
      共 {{ skeleton.length }} 个页面，点底部标签可切换查看
    </p>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import TemplatePhonePreview from '@/components/mini/TemplatePhonePreview.vue'
import { extractTemplateSkeleton } from '@/utils/template-thumb'
import MiniIcon from '@/components/mini/MiniIcon.vue'

const props = withDefaults(
  defineProps<{
    title: string
    previewSrc: string
    loading?: boolean
    showApply?: boolean
    showQr?: boolean
    /**
     * 🔴 2026-10-06 新增：整店模板记录。
     *   有它就能渲染**可交互**的多页手机壳（底部 tab 可点）。
     *   没有它（页面模板）时退回原来的单张静态图。
     */
    item?: Record<string, any> | null
  }>(),
  { item: null },
)

/** 取得到骨架就用可交互壳；取不到才退回静态图 */
const skeleton = computed(() => (props.item ? extractTemplateSkeleton(props.item) : []))
const usePhone = computed(() => skeleton.value.length > 0)

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
.tpl-preview-tip {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--saas-ink-3);
}
</style>
