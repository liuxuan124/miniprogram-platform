<script setup lang="ts">
import EmptyState from './EmptyState.vue'

/**
 * 列表三态包裹组件（loading / error / empty / 正常内容）
 * A4：统一全站列表页的加载与空态体验，避免各页各写一套。
 *
 * 用法：
 * <ListStateWrap :loading="loading" :error="error" :empty="list.length === 0" empty-text="暂无商品" @retry="fetchList">
 *   <el-table :data="list">...</el-table>
 *   <template #empty-action>
 *     <el-button type="primary" @click="goCreate">去添加第一个商品</el-button>
 *   </template>
 *   <!-- 可选：自定义骨架屏，不传则使用默认表格骨架 -->
 *   <template #skeleton><MySkeleton /></template>
 * </ListStateWrap>
 */
withDefaults(defineProps<{
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyText?: string
  emptyDescription?: string
  /** 骨架屏行数，默认表格骨架时生效 */
  skeletonRows?: number
}>(), {
  loading: false,
  error: null,
  empty: false,
  emptyText: '',
  emptyDescription: '',
  skeletonRows: 6,
})

defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="loading" class="list-state list-state--loading">
    <slot name="skeleton">
      <el-skeleton animated>
        <template #template>
          <div class="table-skeleton">
            <div class="table-skeleton__toolbar">
              <el-skeleton-item variant="rect" style="width: 160px; height: 32px; border-radius: var(--radius-sm);" />
              <el-skeleton-item variant="rect" style="width: 88px; height: 32px; border-radius: var(--radius-sm);" />
            </div>
            <div class="table-skeleton__header">
              <el-skeleton-item v-for="i in 4" :key="`h${i}`" variant="text" style="height: 14px;" />
            </div>
            <div v-for="row in skeletonRows" :key="row" class="table-skeleton__row">
              <el-skeleton-item v-for="i in 4" :key="`r${row}-${i}`" variant="text" style="height: 14px;" />
            </div>
          </div>
        </template>
      </el-skeleton>
    </slot>
  </div>

  <div v-else-if="error" class="list-state list-state--error">
    <el-result icon="error" title="加载失败" :sub-title="error">
      <template #extra>
        <el-button type="primary" @click="$emit('retry')">重试</el-button>
      </template>
    </el-result>
  </div>

  <div v-else-if="empty" class="list-state list-state--empty">
    <EmptyState :title="emptyText || '暂无数据'" :description="emptyDescription">
      <template v-if="$slots['empty-action']" #action>
        <slot name="empty-action" />
      </template>
    </EmptyState>
  </div>

  <slot v-else />
</template>

<style scoped lang="scss">
.list-state {
  padding: var(--space-5) 0;
}

.table-skeleton {
  padding: var(--space-2) 0;

  &__toolbar {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  &__header {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    padding-bottom: var(--space-3);
    margin-bottom: var(--space-2);
    border-bottom: 1px solid var(--border);
  }

  &__row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border);
  }
}
</style>
