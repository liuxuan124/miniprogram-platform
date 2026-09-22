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

/** 文案贴近原型 stTag */
const label = computed(() => {
  const st = resolved.value
  const row = props.row
  if (st === 'pending') {
    const current = Number(row?.currentVersion ?? row?.version ?? 0)
    if (!current) return '待发布'
    return '有改动'
  }
  if (st === 'live') return '已上线'
  if (st === 'draft') return '草稿'
  if (st === 'offline') return '已下线'
  if (st === 'archived') return '归档'
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
