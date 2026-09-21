<template>
  <span class="page-status-tag" :style="styleVars">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  resolvePageStatus,
  MINI_PAGE_STATUS_LABELS,
  MINI_PAGE_STATUS_COLORS,
  type MiniPageStatus,
  type PageStatusInput,
} from '@/utils/pageStatus'

const props = defineProps<{
  status?: MiniPageStatus | string
  row?: PageStatusInput
}>()

const resolved = computed<MiniPageStatus>(() => {
  if (props.status && (props.status in MINI_PAGE_STATUS_LABELS)) {
    return props.status as MiniPageStatus
  }
  return resolvePageStatus(props.row || { status: props.status })
})

const label = computed(() => MINI_PAGE_STATUS_LABELS[resolved.value])
const styleVars = computed(() => {
  const c = MINI_PAGE_STATUS_COLORS[resolved.value]
  return {
    '--pst-bg': c.bg,
    '--pst-text': c.text,
    '--pst-border': c.border,
  }
})
</script>

<style scoped>
.page-status-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  border: 1px solid var(--pst-border);
  background: var(--pst-bg);
  color: var(--pst-text);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
</style>
