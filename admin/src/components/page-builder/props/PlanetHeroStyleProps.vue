<template>
  <el-form label-width="76px" size="small" class="phs">
    <div class="phs__lead">
      这些只影响外观显示，已从「内容」页签移到这里 —— 内容页签只管身份、文案与动作。
    </div>

    <BuilderFieldItem label="背景类型">
      <BuilderSegmented
        :model-value="bgType"
        :options="BG_TYPE_OPTIONS"
        @update:model-value="(v: string | number) => emit('update', { bg_type: String(v) })"
      />
    </BuilderFieldItem>

    <BuilderFieldItem v-if="bgType === 'preset'" label="渐变预设">
      <div class="preset-row">
        <button
          v-for="p in PLANET_BG_PRESETS"
          :key="p.value"
          type="button"
          class="preset"
          :class="{ 'is-on': bgPreset === p.value }"
          :title="p.label"
          @click="emit('update', { bg_preset: p.value })"
        >
          <span class="preset__sw" :style="{ background: p.css }" />
          <span class="preset__name">{{ p.label }}</span>
        </button>
      </div>
    </BuilderFieldItem>

    <BuilderFieldItem
      v-else-if="bgType === 'gradient'"
      label="自定义渐变"
      hint="用 CSS 渐变语法，如 linear-gradient(135deg,#ff0000,#0000ff)。"
    >
      <el-input
        :model-value="data.bg_gradient || ''"
        placeholder="linear-gradient(150deg,#7c2d12,#d97706)"
        @input="(v: string) => emit('update', { bg_gradient: v })"
      />
      <div class="preset-preview" :style="{ background: bgGradient }" />
    </BuilderFieldItem>

    <BuilderFieldItem v-else label="背景图片" hint="图片会铺满组件，底部叠一层品牌色兜底防止文字看不清。">
      <div class="picker-row">
        <el-input :model-value="data.bg_image || ''" readonly placeholder="未选择图片" />
        <el-button size="small" @click="bgPickerOpen = true">素材库</el-button>
      </div>
      <div v-if="data.bg_image" class="bg-preview" :style="{ backgroundImage: `url(${data.bg_image})` }" />
    </BuilderFieldItem>

    <BuilderFieldItem label="毛玻璃" hint="给 KPI 卡与社群条加半透+模糊质感。关掉更实、更清晰。">
      <el-switch :model-value="glass" @change="(v: boolean) => emit('update', { glass: v })" />
    </BuilderFieldItem>

    <el-divider content-position="left">排版与圆角</el-divider>

    <BuilderFieldItem label="容器圆角">
      <NumSliderRow
        :model-value="Number(data.radius ?? 0)"
        :min="0"
        :max="24"
        :step="1"
        :fallback="0"
        @update:model-value="(v: number) => emit('update', { radius: v })"
      />
      <div class="ds-hint">0px = 直角铺满；24px = 大圆角卡片</div>
    </BuilderFieldItem>

    <BuilderFieldItem label="容器内边距">
      <NumSliderRow
        :model-value="Number(data.padding ?? 18)"
        :min="12"
        :max="24"
        :step="1"
        :fallback="18"
        @update:model-value="(v: number) => emit('update', { padding: v })"
      />
      <div class="ds-hint">影响标题与 KPI 距组件边缘的距离</div>
    </BuilderFieldItem>

    <BuilderFieldItem label="KPI 卡片" hint="纯色微透有底色块；无底色极简只用底部细线分隔。">
      <BuilderSegmented
        :model-value="kpiStyle"
        :options="KPI_STYLE_OPTIONS"
        @update:model-value="(v: string | number) => emit('update', { kpi_style: String(v) })"
      />
    </BuilderFieldItem>
  </el-form>

  <AssetPickerDialog v-model="bgPickerOpen" @select="(url: string) => emit('update', { bg_image: url })" />
</template>

<script setup lang="ts">
/**
 * 星球顶栏的「样式」子面板（在 PropsPanel 的样式页签渲染）。
 *
 * 为什么独立成文件：内容页签只该管「谁看、点什么」；背景/圆角/内边距/KPI 卡样式
 * 是纯视觉规则，混在内容页签会让运营为找一个开关滚过整屏。
 * PropsPanel 的 `stylePanelMap` 就是为此预留的。
 */
import { computed, ref } from 'vue'
import BuilderFieldItem from '../BuilderFieldItem.vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import NumSliderRow from './NumSliderRow.vue'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import { PLANET_BG_PRESETS, PLANET_STYLE_DEFAULTS, PLANET_KPI_STYLES } from '../planetHeroConfig'

/**
 * ⚠️ 样式字段存 **props** 而不是 style —— 这是本项目的既有约定
 * （PropsPanel 的 stylePanelMap 只传 :props、只接 @update，没有 style 通道）。
 * 渲染器也一律从 component.props 读，两边必须一致，否则改了不生效。
 */
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [patch: Record<string, any>] }>()

const BG_TYPE_OPTIONS = [
  { value: 'preset', label: '渐变预设' },
  { value: 'gradient', label: '自定义渐变' },
  { value: 'image', label: '背景图' },
]
const KPI_STYLE_OPTIONS = PLANET_KPI_STYLES.map((s) => ({ value: s.value, label: s.label }))

const bgType = computed(() => data?.bg_type ?? PLANET_STYLE_DEFAULTS.bg_type)
const bgPreset = computed(() => data?.bg_preset ?? PLANET_STYLE_DEFAULTS.bg_preset)
const bgGradient = computed(
  () => data?.bg_gradient || PLANET_STYLE_DEFAULTS.bg_gradient,
)
/** 毛玻璃默认开（与渲染器一致），老配置没写就按开处理 */
const glass = computed(() => data?.glass !== false)
const kpiStyle = computed(() =>
  data?.kpi_style === 'plain' ? 'plain' : 'glass',
)

const bgPickerOpen = ref(false)
</script>

<style scoped lang="scss">
.phs__lead {
  padding: 7px 9px;
  margin-bottom: 10px;
  color: #6b7a8d;
  font-size: 11px;
  line-height: 1.5;
  background: #f5f7fb;
  border-radius: 6px;
}

.ds-hint {
  margin: 4px 0 0;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}

/* 渐变预设卡：色块 + 名称，与需求给的「轻奢暖棕金 / 科技深蓝 / 黑金暗黑」三套对应 */
.preset-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  width: 100%;
}

.preset {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 4px 3px 5px;
  background: #fbf8f4;
  border: 1px solid #e8dfd3;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.15s;

  &:hover {
    border-color: #d9c7b4;
  }

  &.is-on {
    background: #f7efe7;
    border-color: #c08e6e;
    box-shadow: 0 0 0 1px #c08e6e;
  }
}

.preset__sw {
  display: block;
  width: 100%;
  height: 22px;
  border-radius: 5px;
}

.preset__name {
  color: #6b5b4e;
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
}

.is-on .preset__name {
  font-weight: 600;
  color: #8c3208;
}

.preset-preview {
  height: 34px;
  margin-top: 6px;
  border-radius: 8px;
}

.bg-preview {
  height: 48px;
  margin-top: 6px;
  background-size: cover;
  background-position: center;
  border-radius: 8px;
}

.picker-row {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}
</style>
