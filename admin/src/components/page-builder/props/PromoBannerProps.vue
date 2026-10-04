<template>
  <el-form label-width="72px" size="small">
    <el-form-item label="主标题">
      <el-input :model-value="data.title || ''" @input="(v: string) => emit('update', { title: v })" />
    </el-form-item>
    <el-form-item label="副标题">
      <el-input :model-value="data.subtitle || ''" type="textarea" :rows="2" @input="(v: string) => emit('update', { subtitle: v })" />
    </el-form-item>
    <el-form-item label="按钮文案">
      <el-input :model-value="data.button_text || ''" @input="(v: string) => emit('update', { button_text: v })" />
    </el-form-item>
    <el-form-item label="按钮链接">
      <el-input :model-value="data.button_link || ''" placeholder="/pages/member-center/member-center" @input="(v: string) => emit('update', { button_link: v })" />
    </el-form-item>
    <el-form-item label="右上光斑">
      <el-switch :model-value="data.show_glow !== false" @change="(v: boolean) => emit('update', { show_glow: v })" />
    </el-form-item>
    <el-divider content-position="left">配色</el-divider>
    <el-form-item label="渐变起/中/止">
      <div class="color-row">
        <el-color-picker :model-value="data.gradient_from || '#1d1b18'" @change="(v) => emit('update', { gradient_from: v || '#1d1b18' })" />
        <el-color-picker :model-value="data.gradient_mid || '#3b2f22'" @change="(v) => emit('update', { gradient_mid: v || '#3b2f22' })" />
        <el-color-picker :model-value="data.gradient_to || '#7a4a1d'" @change="(v) => emit('update', { gradient_to: v || '#7a4a1d' })" />
      </div>
    </el-form-item>
    <el-form-item label="标题色">
      <el-color-picker :model-value="data.title_color || '#f3dcaa'" @change="(v) => emit('update', { title_color: v || '#f3dcaa' })" />
    </el-form-item>
    <el-form-item label="副标题色">
      <el-color-picker :model-value="data.subtitle_color || '#d9ccb8'" @change="(v) => emit('update', { subtitle_color: v || '#d9ccb8' })" />
    </el-form-item>
    <el-form-item label="按钮底/字">
      <div class="color-row">
        <el-color-picker :model-value="data.button_bg || '#f3dcaa'" @change="(v) => emit('update', { button_bg: v || '#f3dcaa' })" />
        <el-color-picker :model-value="data.button_color || '#3a2708'" @change="(v) => emit('update', { button_color: v || '#3a2708' })" />
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>

<style scoped>
.color-row { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
