<template>
  <div class="member-card-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="会员卡标题" />
      </el-form-item>
      <el-form-item label="显示等级">
        <el-switch :model-value="data.show_level" @change="emit('update', { show_level: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示积分">
        <el-switch :model-value="data.show_points" @change="emit('update', { show_points: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示余额">
        <el-switch :model-value="data.show_balance" @change="emit('update', { show_balance: $event as boolean })" />
      </el-form-item>
      <el-form-item label="背景图">
        <el-input :model-value="data.background_image" @input="emit('update', { background_image: $event })" placeholder="背景图片URL" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>