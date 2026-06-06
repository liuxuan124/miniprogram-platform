<template>
  <el-form label-width="70px" size="small">
    <el-form-item label="标题">
      <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="联系我们" />
    </el-form-item>
    <el-form-item label="电话">
      <el-input :model-value="data.phone" @input="emit('update', { phone: $event })" placeholder="400-888-0000" />
    </el-form-item>
    <el-form-item label="地址">
      <el-input :model-value="data.address" @input="emit('update', { address: $event })" placeholder="公司地址" />
    </el-form-item>
    <el-form-item label="营业时间">
      <el-input :model-value="data.service_time" @input="emit('update', { service_time: $event })" placeholder="周一至周五 9:00-18:00" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
