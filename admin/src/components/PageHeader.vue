<template>
  <header class="page-header">
    <div class="page-header__main">
      <div v-if="kicker" class="page-header__kicker">{{ kicker }}</div>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="description" class="page-header__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  kicker?: string
  description?: string
}>()
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.page-header__kicker {
  margin-bottom: 4px;
  color: var(--text-muted);
  font-size: var(--font-caption);
  line-height: 1.4;
}

.page-header__title {
  margin: 0;
  color: var(--text);
  font-size: var(--font-h1);
  font-weight: 700;
  line-height: 1.3;
}

.page-header__desc {
  margin: 6px 0 0;
  max-width: 640px;
  color: var(--text-secondary);
  font-size: var(--font-body);
  line-height: 1.5;
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 2px;
}
</style>
