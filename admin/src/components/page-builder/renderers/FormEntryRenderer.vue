<template>
  <div class="render-form-entry" :class="`style-${component.props.style || 'card'}`">
    <div class="form-entry-icon">
      <el-icon :size="24" color="#409eff"><Document /></el-icon>
    </div>
    <div class="form-entry-info">
      <div class="form-entry-title">{{ component.props.title || '表单填写' }}</div>
      <div v-if="component.props.formId" class="form-entry-id">ID: {{ component.props.formId }}</div>
    </div>
    <div class="form-entry-btn">{{ component.props.buttonText || '立即填写' }}</div>
  </div>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue'
import type { ComponentInstance } from '@/types/page'

defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.render-form-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;

  &.style-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  &.style-list {
    border-radius: 4px;
    border: none;
    border-bottom: 1px solid #ebeef5;
  }

  &.style-minimal {
    border: none;
    padding: 8px 0;
  }

  .form-entry-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #ecf5ff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .form-entry-info {
    flex: 1;
    min-width: 0;

    .form-entry-title {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .form-entry-id {
      font-size: 11px;
      color: #909399;
      margin-top: 2px;
    }
  }

  .form-entry-btn {
    flex-shrink: 0;
    padding: 6px 16px;
    background: #409eff;
    color: #fff;
    border-radius: 16px;
    font-size: 12px;
  }
}
</style>
