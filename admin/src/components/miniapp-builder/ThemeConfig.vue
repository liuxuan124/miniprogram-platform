<template>
  <div class="theme-config">
    <div class="preset-row">
      <span class="preset-label">行业色系</span>
      <div class="preset-colors">
        <button
          v-for="(colors, key) in industryPresets"
          :key="key"
          class="preset-btn"
          :class="{ selected: presetSelected(key) }"
          :style="{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }"
          :title="industryLabels[key] || key"
          @click="applyPreset(key)"
        >
          <el-icon v-if="presetSelected(key)" class="preset-check"><Check /></el-icon>
        </button>
      </div>
    </div>

    <el-form label-width="180px" size="small" class="theme-color-form">
      <el-form-item label="主色调">
        <el-color-picker :model-value="modelValue.primaryColor" @change="(v: string) => updateField('primaryColor', v)" />
      </el-form-item>
      <el-form-item label="辅助色">
        <el-color-picker :model-value="modelValue.secondaryColor" @change="(v: string) => updateField('secondaryColor', v)" />
      </el-form-item>
      <el-form-item label="导航栏色">
        <el-color-picker :model-value="modelValue.navBarColor" @change="(v: string) => updateField('navBarColor', v)" />
      </el-form-item>
      <el-form-item label="Tab选中色">
        <el-color-picker :model-value="modelValue.tabBarActiveColor" @change="(v: string) => updateField('tabBarActiveColor', v)" />
      </el-form-item>
      <el-form-item label="Tab未选色">
        <el-color-picker :model-value="modelValue.tabBarInactiveColor" @change="(v: string) => updateField('tabBarInactiveColor', v)" />
      </el-form-item>
      <el-form-item label="页面背景">
        <el-color-picker :model-value="modelValue.pageBackgroundColor" @change="(v: string) => updateField('pageBackgroundColor', v)" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { Check } from '@element-plus/icons-vue'
import { IndustryLabels, IndustryColors } from '@/types/page'
import type { ThemeConfig } from '@/types/miniapp'

const props = defineProps<{ modelValue: ThemeConfig }>()
const emit = defineEmits<{ 'update:modelValue': [value: ThemeConfig] }>()

const industryPresets = IndustryColors
const industryLabels = IndustryLabels

function presetSelected(key: string) {
  const colors = IndustryColors[key]
  return Boolean(colors && colors[0] === props.modelValue.primaryColor && colors[1] === props.modelValue.secondaryColor)
}

function updateField(key: string, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function applyPreset(industryKey: string) {
  const colors = IndustryColors[industryKey]
  if (!colors) return
  emit('update:modelValue', {
    ...props.modelValue,
    primaryColor: colors[0],
    secondaryColor: colors[1],
    navBarColor: colors[0],
    tabBarActiveColor: colors[0],
  })
}
</script>

<style scoped>
.theme-config { margin-bottom: 8px; }
.preset-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.preset-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.preset-colors { display: flex; flex-wrap: wrap; gap: 6px; }
.preset-btn { position: relative; width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--bg-elevated); box-shadow: 0 1px 3px color-mix(in srgb, var(--text) 15%, transparent); cursor: pointer; transition: 0.14s; }
.preset-btn:hover { transform: scale(1.2); }
.preset-btn.selected { box-shadow: 0 0 0 2px var(--brand); }
.preset-check { position: absolute; top: -6px; right: -6px; color: var(--brand); font-size: 12px; background: var(--bg-elevated); border-radius: 50%; }
.theme-color-form :deep(.el-form-item__label) { width: 180px !important; }
</style>
