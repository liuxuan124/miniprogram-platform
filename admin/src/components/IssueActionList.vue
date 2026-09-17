<template>
  <section v-if="items.length" class="issue-card" :class="tone">
    <h2 class="issue-head">
      <span class="issue-badge" :class="tone">{{ badge }}</span>
      {{ heading }}
    </h2>
    <div v-for="item in items" :key="item.key || item.text" class="issue-row">
      <span class="issue-icon" aria-hidden="true">⚠</span>
      <span class="issue-text">{{ item.text }}</span>
      <el-button v-if="item.to" size="small" @click="$emit('go', item)">{{ item.action || '去处理' }}</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
export type IssueActionItem = {
  text: string
  to?: string
  action?: string
  key?: string
}

defineProps<{
  items: IssueActionItem[]
  heading: string
  badge?: string
  tone?: 'warning' | 'blocking'
}>()

defineEmits<{ go: [item: IssueActionItem] }>()
</script>

<style scoped>
.issue-card {
  margin-bottom: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid transparent;
}
.issue-card.warning {
  background: var(--warning-soft);
  border-color: var(--warning);
  color: var(--warning);
}
.issue-card.blocking {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--danger);
}
.issue-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.3;
}
.issue-badge {
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--warning);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.issue-badge.blocking { background: var(--danger); }
.issue-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  font-size: 13.5px;
  color: var(--text);
}
.issue-row:first-of-type { border-top: 0; }
.issue-icon { flex: none; color: var(--warning); }
.issue-text { flex: 1; min-width: 0; }
</style>
