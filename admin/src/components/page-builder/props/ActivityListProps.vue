<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="活动列表标题" />
    </el-form-item>
    <el-form-item label="显示数量">
      <el-input-number :model-value="data.limit || 4" @change="emit('update', { limit: $event })" :min="1" :max="10" controls-position="right" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
