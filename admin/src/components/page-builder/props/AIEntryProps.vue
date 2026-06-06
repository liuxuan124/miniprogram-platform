<template>
  <div class="ai-entry-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="AI智能助手" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input :model-value="data.description" @input="emit('update', { description: $event })" placeholder="AI助手描述文字" />
      </el-form-item>
      <el-form-item label="头像">
        <el-input :model-value="data.avatar" @input="emit('update', { avatar: $event })" placeholder="头像图片URL" />
      </el-form-item>
      <el-form-item label="主题色">
        <el-select :model-value="data.theme" @change="emit('update', { theme: $event as string })" style="width: 100%">
          <el-option label="蓝色" value="blue" />
          <el-option label="绿色" value="green" />
          <el-option label="紫色" value="purple" />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
