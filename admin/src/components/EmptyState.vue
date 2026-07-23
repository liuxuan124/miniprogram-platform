<template>
  <div class="empty-state">
    <el-icon class="empty-state__icon" :size="size">
      <component :is="icon" />
    </el-icon>
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="description" class="empty-state__desc">{{ description }}</p>
    <div v-if="$slots.action" class="empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Box } from '@element-plus/icons-vue'

withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: object
  size?: number
}>(), {
  title: '暂无数据',
  description: '',
  icon: () => Box,
  size: 36,
})
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 160px;
  padding: 24px 16px;
  color: var(--text-muted);
  text-align: center;
}

.empty-state__icon {
  color: #c0c4cc;
  margin-bottom: 4px;
}

.empty-state__title {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-body);
  font-weight: 500;
}

.empty-state__desc {
  margin: 0;
  font-size: var(--font-caption);
  line-height: 1.5;
}

.empty-state__action {
  margin-top: 10px;
}
</style>
