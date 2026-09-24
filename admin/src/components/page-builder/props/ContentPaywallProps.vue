<template>
  <div class="props-block">
    <el-form label-width="96px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @update:model-value="(v: string) => emit('update', { title: v })" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input
          type="textarea"
          :rows="3"
          :model-value="data.hint"
          @update:model-value="(v: string) => emit('update', { hint: v })"
        />
      </el-form-item>
      <el-form-item label="主按钮">
        <el-input
          :model-value="data.button_text"
          @update:model-value="(v: string) => emit('update', { button_text: v })"
        />
      </el-form-item>
      <el-form-item label="副文案">
        <el-input
          :model-value="data.secondary_text"
          @update:model-value="(v: string) => emit('update', { secondary_text: v })"
        />
      </el-form-item>
      <el-form-item label="关联长文 ID">
        <el-input
          :model-value="data.content_id"
          placeholder="可选，跳转详情带 id"
          @update:model-value="(v: string) => emit('update', { content_id: v })"
        />
      </el-form-item>
      <el-form-item label="主按钮链接">
        <el-input
          :model-value="data.primary_link"
          @update:model-value="(v: string) => emit('update', { primary_link: v })"
        />
      </el-form-item>
      <el-form-item label="副链链接">
        <el-input
          :model-value="data.secondary_link"
          @update:model-value="(v: string) => emit('update', { secondary_link: v })"
        />
      </el-form-item>
      <el-form-item label="主题">
        <el-select
          :model-value="data.theme || 'warm'"
          style="width: 100%"
          @change="(v: string) => emit('update', { theme: v })"
        >
          <el-option label="暖色" value="warm" />
          <el-option label="蓝色" value="blue" />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import type { ComponentInstance } from '@/types/page'

defineProps<{ data: ComponentInstance['props'] }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()
</script>
