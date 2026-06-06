<template>
  <div class="countdown-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="倒计时标题" />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker
          :model-value="data.end_time"
          @change="emit('update', { end_time: $event as string })"
          type="datetime"
          placeholder="选择结束时间"
          style="width: 100%"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="data.style_type" @change="emit('update', { style_type: $event as string })">
          <el-radio value="card">卡片</el-radio>
          <el-radio value="banner">横幅</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示天数">
        <el-switch :model-value="data.show_days" @change="emit('update', { show_days: $event as boolean })" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>