<script setup lang="ts">
defineProps<{
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyText?: string
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="loading" class="list-state">
    <el-skeleton :rows="5" animated />
  </div>
  <div v-else-if="error" class="list-state">
    <el-result icon="error" title="加载失败" :sub-title="error">
      <template #extra>
        <el-button type="primary" @click="$emit('retry')">重试</el-button>
      </template>
    </el-result>
  </div>
  <div v-else-if="empty" class="list-state">
    <el-empty :description="emptyText || '暂无数据'" />
  </div>
  <slot v-else />
</template>

<style scoped>
.list-state {
  padding: 24px 0;
}
</style>
