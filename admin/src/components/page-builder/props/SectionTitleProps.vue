<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="区块标题" />
    </el-form-item>
    <el-form-item label="副标题">
      <el-input :model-value="data.subtitle" @input="emit('update', { subtitle: $event })" placeholder="副标题" />
    </el-form-item>
    <el-form-item label="对齐">
      <el-select :model-value="data.align || 'left'" @change="emit('update', { align: $event })" style="width: 100%">
        <el-option label="左对齐" value="left" />
        <el-option label="居中" value="center" />
      </el-select>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
