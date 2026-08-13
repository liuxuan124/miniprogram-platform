<template>
  <el-form-item :label="titleLabel">
    <el-input-number
      :model-value="data.title_font_size ?? titleDefault"
      :min="8"
      :max="48"
      controls-position="right"
      @change="(v: number) => emit('update', { title_font_size: v })"
    />
  </el-form-item>
  <el-form-item :label="subtitleLabel">
    <el-input-number
      :model-value="data.subtitle_font_size ?? subtitleDefault"
      :min="8"
      :max="36"
      controls-position="right"
      @change="(v: number) => emit('update', { subtitle_font_size: v })"
    />
  </el-form-item>
  <el-form-item v-if="showDesc" :label="descLabel">
    <el-input-number
      :model-value="data.desc_font_size ?? descDefault"
      :min="8"
      :max="36"
      controls-position="right"
      @change="(v: number) => emit('update', { desc_font_size: v })"
    />
  </el-form-item>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  data: Record<string, any>
  titleLabel?: string
  subtitleLabel?: string
  descLabel?: string
  titleDefault?: number
  subtitleDefault?: number
  descDefault?: number
  showDesc?: boolean
}>(), {
  titleLabel: '标题字号',
  subtitleLabel: '副文字号',
  descLabel: '正文字号',
  titleDefault: 13,
  subtitleDefault: 11,
  descDefault: 12,
  showDesc: false,
})

const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>
