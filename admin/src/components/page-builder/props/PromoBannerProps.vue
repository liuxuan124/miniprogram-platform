<template>
  <el-form label-width="76px" size="small" class="promo-banner-props">
    <!-- ============ 内容：业务数据与逻辑路由 ============ -->
    <el-form-item label="主标题">
      <el-input :model-value="data.title || ''" @input="(v: string) => emit('update', { title: v })" />
    </el-form-item>

    <el-form-item label="副标题">
      <el-input
        :model-value="data.subtitle || ''"
        type="textarea"
        :rows="2"
        resize="none"
        class="promo-banner-props__multiline"
        @input="(v: string) => emit('update', { subtitle: v })"
      />
    </el-form-item>

    <el-form-item label="按钮文案">
      <el-input :model-value="data.button_text || ''" @input="(v: string) => emit('update', { button_text: v })" />
    </el-form-item>

    <el-form-item label="按钮链接">
      <LinkPickerField
        :link-type="linkType"
        :link-url="data.button_link || ''"
        @update:link-type="(v: string) => emit('update', { button_link_type: v })"
        @update:link-url="(v: string) => emit('update', { button_link: v })"
      />
    </el-form-item>

    <el-divider content-position="left">功能开关</el-divider>

    <el-form-item label="右上光斑">
      <el-switch :model-value="data.show_glow !== false" @change="(v: boolean) => emit('update', { show_glow: v })" />
    </el-form-item>

    <!-- ============ 配色：纯视觉表现层 ============ -->
    <el-divider content-position="left">配色</el-divider>

    <el-form-item>
      <template #label>
        <span class="pp-label">
          背景类型
          <FieldHint text="纯色 = 单色铺满；渐变 = 起止色按角度线性过渡。改动立即反映到画布预览。" />
        </span>
      </template>
      <BuilderSegmented
        :model-value="bgType"
        :options="BG_TYPE_OPTIONS"
        block
        @update:model-value="(v: string | number) => emit('update', { bg_type: String(v) })"
      />
    </el-form-item>

    <!-- 渐变：结构化「起始 / 中间(可选) / 终止 / 角度」，不再是无标识的黑盒长条 -->
    <template v-if="bgType === 'gradient'">
      <el-form-item label="起始色">
        <ColorPickerField
          :model-value="data.gradient_from || ''"
          default-value="#1d1b18"
          @update:model-value="(v: string) => emit('update', { gradient_from: v })"
        />
      </el-form-item>

      <el-form-item label="中间色">
        <ColorPickerField
          :model-value="data.gradient_mid || ''"
          default-value="#3b2f22"
          hint="三段渐变的过渡色。留空则退化为两色线性渐变。"
          @update:model-value="(v: string) => emit('update', { gradient_mid: v })"
        />
        <el-switch
          :model-value="useGradientMid"
          class="promo-banner-props__mid-switch"
          @change="(v: string | number | boolean) => emit('update', { use_gradient_mid: Boolean(v), gradient_mid: Boolean(v) ? (data.gradient_mid || '#3b2f22') : '' })"
        />
      </el-form-item>

      <el-form-item label="终止色">
        <ColorPickerField
          :model-value="data.gradient_to || ''"
          default-value="#7a4a1d"
          @update:model-value="(v: string) => emit('update', { gradient_to: v })"
        />
      </el-form-item>

      <el-form-item>
        <template #label>
          <span class="pp-label">
            渐变角度
            <FieldHint text="0° = 从左到右，90° = 从上到下。拖动即时预览。" />
          </span>
        </template>
        <el-slider
          :model-value="gradientAngle"
          :min="0"
          :max="360"
          :step="1"
          show-input
          size="small"
          @update:model-value="(v: number | undefined) => emit('update', { gradient_angle: v ?? 0 })"
        />
      </el-form-item>
    </template>

    <el-form-item v-else label="背景色">
      <ColorPickerField
        :model-value="data.background_color || ''"
        default-value="#1d1b18"
        @update:model-value="(v: string) => emit('update', { background_color: v })"
      />
    </el-form-item>

    <el-divider content-position="left">文字与按钮</el-divider>

    <el-form-item label="标题色">
      <ColorPickerField
        :model-value="data.title_color || ''"
        default-value="#f3dcaa"
        @update:model-value="(v: string) => emit('update', { title_color: v })"
      />
    </el-form-item>

    <el-form-item label="副标题色">
      <ColorPickerField
        :model-value="data.subtitle_color || ''"
        default-value="#d9ccb8"
        @update:model-value="(v: string) => emit('update', { subtitle_color: v })"
      />
    </el-form-item>

    <el-form-item label="按钮底色">
      <ColorPickerField
        :model-value="data.button_bg || ''"
        default-value="#f3dcaa"
        @update:model-value="(v: string) => emit('update', { button_bg: v })"
      />
    </el-form-item>

    <el-form-item label="按钮字色">
      <ColorPickerField
        :model-value="data.button_color || ''"
        default-value="#3a2708"
        @update:model-value="(v: string) => emit('update', { button_color: v })"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import ColorPickerField from '../ColorPickerField.vue'
import FieldHint from '../FieldHint.vue'
import LinkPickerField from '../LinkPickerField.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

/**
 * 背景类型：数据里没存 bg_type 时，用「有渐变色」反推为渐变，
 * 保证历史页面（只有 gradient_from/to）外观不变。
 */
const bgType = computed(() => {
  if (data.value.bg_type) return data.value.bg_type
  const hasGradient = Boolean(data.value.gradient_from || data.value.gradient_to)
  return hasGradient ? 'gradient' : 'solid'
})

/** 中间色可选：显式开关优先；未设置时按「是否真的配过色」兜底 */
const useGradientMid = computed(() => {
  if (data.value.use_gradient_mid !== undefined) return Boolean(data.value.use_gradient_mid)
  return Boolean(data.value.gradient_mid)
})

const gradientAngle = computed(() => Number(data.value.gradient_angle ?? 0))

const BG_TYPE_OPTIONS = [
  { label: '纯色', value: 'solid' },
  { label: '渐变', value: 'gradient' },
]

/** 链接类型：与 LinkPickerField 的 linkType 约定一致 */
const linkType = computed(() => data.value.button_link_type || 'page')
</script>

<style scoped>
/* 表单项纵向间距统一 16px（EP 默认 18px 偏松） */
.promo-banner-props :deep(.el-form-item) {
  margin-bottom: 16px;
}

/* 多行输入统一去掉右下角缩放手柄（运营场景不需要手动拉伸） */
.promo-banner-props__multiline :deep(.el-textarea__inner) {
  resize: none;
  min-height: 52px !important;
  line-height: 1.6;
}

/* Switch 统一右对齐贴靠面板右边缘，消除「标签与开关挤中间、右侧一大片留白」 */
.promo-banner-props :deep(.el-form-item__content) {
  justify-content: flex-end;
}

/* 但宽控件（配色/分段器/滑块/链接选择器）要左对齐铺满，别被上条规则拉走 */
.promo-banner-props :deep(.el-form-item__content:has(.color-field)),
.promo-banner-props :deep(.el-form-item__content:has(.builder-segmented)),
.promo-banner-props :deep(.el-form-item__content:has(.el-slider)),
.promo-banner-props :deep(.el-form-item__content:has(.link-picker)) {
  justify-content: flex-start;
}

/* 中间色那一行：色块 + 开关分列两端 */
.promo-banner-props__mid-switch {
  flex: none;
  margin-left: 8px;
}

.pp-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
</style>
