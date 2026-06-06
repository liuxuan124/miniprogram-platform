<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="提示词">
      <el-input :model-value="data.placeholder" @input="emit('update', { placeholder: $event })" placeholder="请输入搜索提示词" />
    </el-form-item>
    <el-form-item label="搜索范围">
      <el-select :model-value="data.scope || 'all'" @change="emit('update', { scope: $event })" style="width: 100%">
        <el-option label="全部" value="all" />
        <el-option label="商品" value="product" />
        <el-option label="内容" value="content" />
        <el-option label="活动" value="activity" />
      </el-select>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
