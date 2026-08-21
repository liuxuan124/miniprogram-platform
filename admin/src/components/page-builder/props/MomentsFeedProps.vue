<template>
  <div class="moments-feed-props">
    <el-form label-width="88px" size="small">
      <div class="ds-hint ds-hint--block">知识星球式动态时间线，展示 content_type=moment 的已发布内容（正文+图片+资料附件）。</div>
      <el-form-item label="显示作者">
        <el-switch :model-value="data.show_author !== false" @change="(v: boolean) => emit('update', { show_author: v })" />
      </el-form-item>
      <el-form-item label="显示时间">
        <el-switch :model-value="data.show_publish_time !== false" @change="(v: boolean) => emit('update', { show_publish_time: v })" />
      </el-form-item>
      <el-form-item label="每页条数">
        <el-input-number :model-value="Number(data.page_size ?? 10)" :min="4" :max="30" controls-position="right" @change="(v: number | undefined) => emit('update', { page_size: v ?? 10 })" />
      </el-form-item>
      <el-form-item label="卡片间距">
        <el-input-number :model-value="data.item_gap ?? 12" :min="0" :max="48" controls-position="right" @change="(v: number | undefined) => emit('update', { item_gap: v ?? 12 })" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>

<style scoped lang="scss">
.ds-hint { margin-top: 4px; color: #909399; font-size: 12px; line-height: 1.4; }
.ds-hint--block { margin: 0 0 8px; }
</style>
