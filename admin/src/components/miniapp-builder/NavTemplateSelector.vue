<template>
  <div class="nav-template-selector">
    <div class="selector-label">选择导航模板</div>
    <div class="template-grid">
      <button
        v-for="tpl in templates"
        :key="tpl.key"
        class="template-card"
        :class="{ active: modelValue === tpl.key }"
        @click="$emit('update:modelValue', tpl.key)"
      >
        <div class="tpl-icon">{{ tpl.icon }}</div>
        <div class="tpl-info">
          <strong>{{ tpl.name }}</strong>
          <p>{{ tpl.desc }}</p>
        </div>
        <div class="tpl-tabs">
          <span v-for="tab in tpl.tabs" :key="tab.text">{{ tab.icon }} {{ tab.text }}</span>
        </div>
        <div v-if="modelValue === tpl.key" class="tpl-check">✓</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NAV_TEMPLATES } from '@/types/miniapp'
import type { NavTemplate } from '@/types/miniapp'

defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const templates: NavTemplate[] = NAV_TEMPLATES
</script>

<style scoped>
.nav-template-selector { margin-bottom: 20px; }
.selector-label { font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #172033; }
.template-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.template-card {
  position: relative; padding: 14px; border: 2px solid #e3e8f0; border-radius: 12px;
  cursor: pointer; transition: 0.16s; background: #fff; text-align: left;
}
.template-card:hover { border-color: #a0b4d0; }
.template-card.active { border-color: #1769ff; background: #f8faff; }
.tpl-icon { font-size: 28px; margin-bottom: 6px; }
.tpl-info strong { font-size: 14px; font-weight: 700; display: block; }
.tpl-info p { color: #7b8798; font-size: 12px; margin-top: 4px; line-height: 1.4; }
.tpl-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.tpl-tabs span { padding: 2px 8px; font-size: 11px; color: #607187; background: #f0f4ff; border: 1px solid #d9e2ef; border-radius: 99px; }
.tpl-check { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; background: #1769ff; color: #fff; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 700; }
</style>
