<template>
  <el-form label-width="70px" size="small">
    <el-form-item v-for="(value, key) in data" :key="key" :label="String(key)">
      <el-switch v-if="typeof value === 'boolean'" :model-value="value" @change="(v: any) => emit('update', { [key]: v })" />
      <el-input-number v-else-if="typeof value === 'number'" :model-value="value" @change="(v: any) => emit('update', { [key]: v })" :min="0" />
      <el-input v-else :model-value="String(value || '')" @input="(v: string) => emit('update', { [key]: v })" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
