<template>
  <div class="form-entry-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="表单ID">
        <el-input :model-value="data.formId" @input="emit('update', { formId: $event })" placeholder="关联表单ID" />
      </el-form-item>
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="表单标题" />
      </el-form-item>
      <el-form-item label="按钮文字">
        <el-input :model-value="data.buttonText" @input="emit('update', { buttonText: $event })" placeholder="立即填写" />
      </el-form-item>
      <el-form-item label="样式">
        <el-select :model-value="data.style" @change="emit('update', { style: $event as string })" style="width: 100%">
          <el-option label="卡片" value="card" />
          <el-option label="列表" value="list" />
          <el-option label="极简" value="minimal" />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
