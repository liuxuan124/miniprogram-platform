<template>
  <header class="studio-header">
    <div class="studio-header__identity">
      <span class="studio-mark" aria-hidden="true"><el-icon><Crop /></el-icon></span>
      <div>
        <div class="studio-eyebrow">小程序设计工作室<span v-if="section"> / {{ section }}</span></div>
        <h1>{{ title }}</h1>
        <p v-if="description">{{ description }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="studio-header__actions"><slot name="actions" /></div>
  </header>
</template>

<script setup lang="ts">
import { Crop } from '@element-plus/icons-vue'
import '@/styles/builder-studio.css'
defineProps<{ title: string; section?: string; description?: string }>()
</script>
