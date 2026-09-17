<template>
  <div class="theme-config">
    <div class="theme-config-heading"><h3>选择配色</h3><el-button link @click="showAll = !showAll">{{ showAll ? '收起配色' : '全部配色' }}</el-button></div>
    <div class="theme-presets">
      <button v-for="key in visiblePresets" :key="key" type="button" class="theme-preset" :class="{ selected: presetSelected(key) }" :aria-pressed="presetSelected(key)" @click="applyPreset(key)">
        <span class="theme-preset__swatches"><i :style="{ background: industryPresets[key][0] }"></i><i :style="{ background: industryPresets[key][1] }"></i><i :style="{ background: modelValue.pageBackgroundColor }"></i></span>
        <span>{{ industryLabels[key] || key }}</span><el-icon v-if="presetSelected(key)"><Check /></el-icon>
      </button>
    </div>
    <div class="theme-config-heading theme-custom-heading"><h3>自定义颜色</h3><span>修改后立即预览</span></div>
    <div class="theme-color-fields">
      <div v-for="field in mainFields" :key="field.key" class="theme-color-field">
        <div><strong>{{ field.label }}</strong><span>{{ field.desc }}</span></div>
        <el-color-picker :model-value="modelValue[field.key]" @change="(v: string) => updateField(field.key, v)" />
        <code>{{ modelValue[field.key] }}</code>
      </div>
    </div>
    <el-collapse class="theme-advanced">
      <el-collapse-item title="导航与界面细节" name="details">
        <div v-for="field in detailFields" :key="field.key" class="theme-color-field">
          <div><strong>{{ field.label }}</strong></div>
          <el-color-picker :model-value="modelValue[field.key]" @change="(v: string) => updateField(field.key, v)" />
          <code>{{ modelValue[field.key] }}</code>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { IndustryLabels, IndustryColors } from '@/types/page'
import type { ThemeConfig } from '@/types/miniapp'
const props = defineProps<{ modelValue: ThemeConfig }>()
const emit = defineEmits<{ 'update:modelValue': [value: ThemeConfig] }>()
const industryPresets = IndustryColors
const industryLabels = IndustryLabels
const showAll = ref(false)
const visiblePresets = computed(() => showAll.value ? Object.keys(industryPresets) : ['content_ip', 'local_life', 'digital', 'education', 'home', 'clothing'].filter(k => k in industryPresets))
const mainFields: { key: keyof ThemeConfig; label: string; desc: string }[] = [
  { key: 'primaryColor', label: '品牌主色', desc: '按钮与重要元素' },
  { key: 'secondaryColor', label: '辅助色', desc: '与主色配合使用' },
  { key: 'pageBackgroundColor', label: '页面背景', desc: '内容区域的底色' },
]
const detailFields: { key: keyof ThemeConfig; label: string }[] = [
  { key: 'navBarColor', label: '顶部导航背景' }, { key: 'tabBarActiveColor', label: '底部入口选中颜色' },
  { key: 'tabBarInactiveColor', label: '底部入口默认颜色' }, { key: 'tabBarBackgroundColor', label: '底部导航背景' },
]
function updateField(key: keyof ThemeConfig, value: string) {
  if (value) emit('update:modelValue', { ...props.modelValue, [key]: value })
}
function presetSelected(key: string) {
  return props.modelValue.primaryColor.toLowerCase() === industryPresets[key][0].toLowerCase() && props.modelValue.secondaryColor.toLowerCase() === industryPresets[key][1].toLowerCase()
}
function applyPreset(industryKey: string) {
  const colors = IndustryColors[industryKey]
  if (!colors) return
  emit('update:modelValue', { ...props.modelValue, primaryColor: colors[0], secondaryColor: colors[1], navBarColor: colors[0], tabBarActiveColor: colors[0] })
}
</script>

<style scoped>
.theme-config-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.theme-config-heading h3 { margin: 0; font-size: .875rem; font-weight: 600; color: #192235; }
.theme-config-heading > span { font-size: .75rem; color: #626e82; }
.theme-presets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.theme-preset { padding: 12px; border: 1px solid #e2e6ed; border-radius: 8px; background: #fff; font: inherit; text-align: left; cursor: pointer; position: relative; color: #46546a; }
.theme-preset:hover { border-color: #9aadd8; }
.theme-preset.selected { border-color: #002fa7; background: #f5f7ff; box-shadow: inset 0 0 0 1px #002fa7; }
.theme-preset > span:last-of-type { font-size: .8125rem; }
.theme-preset > .el-icon { position: absolute; right: 10px; bottom: 14px; color: #002fa7; font-size: 14px; }
.theme-preset__swatches { display: flex; gap: 3px; margin-bottom: 10px; }
.theme-preset__swatches i { width: 22px; height: 22px; border-radius: 5px; border: 1px solid #00000008; }
.theme-custom-heading { margin-top: 30px; }
.theme-color-field { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #eef0f4; }
.theme-color-field > div:first-child { flex: 1; display: grid; gap: 3px; }
.theme-color-field strong { font-size: .875rem; font-weight: 500; color: #192235; }
.theme-color-field span { font-size: .75rem; color: #626e82; }
.theme-color-field code { width: 70px; color: #626e82; font-size: .75rem; text-transform: uppercase; }
.theme-advanced { margin-top: 20px; border: 0; }
.theme-advanced :deep(.el-collapse-item__header) { font-size: .875rem; font-weight: 500; color: #46546a; }
.theme-advanced :deep(.el-collapse-item__content) { padding-bottom: 0; }
@media (max-width: 700px) { .theme-presets { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
