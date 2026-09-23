<template>
  <span class="tag" :class="tagClass">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  resolvePageStatus,
  type MiniPageStatus,
  type PageStatusInput,
} from '@/utils/pageStatus'
import { MINI_OPS_PAGE_STATUS_LABELS } from '@/constants/miniOpsConcept'

const props = defineProps<{
  status?: MiniPageStatus | string
  row?: PageStatusInput
}>()

const resolved = computed<MiniPageStatus>(() => {
  if (props.status === 'draft' || props.status === 'pending' || props.status === 'live'
    || props.status === 'offline' || props.status === 'archived') {
    return props.status
  }
  return resolvePageStatus(props.row || { status: props.status })
})

const label = computed(() => {
  const st = resolved.value
  if (st === 'draft') return MINI_OPS_PAGE_STATUS_LABELS.draft
  if (st === 'live') return MINI_OPS_PAGE_STATUS_LABELS.live
  if (st === 'pending') return MINI_OPS_PAGE_STATUS_LABELS.pending
  if (st === 'offline') return MINI_OPS_PAGE_STATUS_LABELS.offline
  if (st === 'archived') return MINI_OPS_PAGE_STATUS_LABELS.archived
  return st
})

const tagClass = computed(() => {
  const st = resolved.value
  if (st === 'live') return 't-live'
  if (st === 'pending') {
    const current = Number(props.row?.currentVersion ?? props.row?.version ?? 0)
    return current ? 't-pending' : 't-new'
  }
  if (st === 'draft' || st === 'offline' || st === 'archived') return 't-draft'
  return 't-draft'
})
</script>
