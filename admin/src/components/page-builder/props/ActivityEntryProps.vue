<template>
  <div class="activity-entry-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="活动标题" />
      </el-form-item>
      <el-form-item label="图片">
        <el-input :model-value="data.image" @input="emit('update', { image: $event })" placeholder="活动图片URL" />
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="data.style_type" @change="emit('update', { style_type: $event as string })">
          <el-radio value="full">通栏</el-radio>
          <el-radio value="card">卡片</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="链接类型">
        <el-select :model-value="data.link_type" @change="emit('update', { link_type: $event as string })" style="width: 100%">
          <el-option label="页面" value="page" />
          <el-option label="链接" value="url" />
          <el-option label="小程序" value="miniapp" />
        </el-select>
      </el-form-item>
      <el-form-item label="链接地址">
        <el-input :model-value="data.link_url" @input="emit('update', { link_url: $event })" placeholder="链接地址" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>