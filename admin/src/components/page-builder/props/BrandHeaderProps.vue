<template>
  <div class="brand-header-props">
    <el-tabs v-model="activeTab" class="bhp-tabs">
      <!-- ==================== 内容配置 ==================== -->
      <el-tab-pane label="内容" name="content">
        <div class="bhp-sec">
          <div class="bhp-sec__head"><span class="bhp-sec__title">品牌主体信息</span></div>

          <el-form label-width="76px" size="small">
            <el-form-item label="Logo 模式">
              <BuilderSegmented
                v-model="logoModeProxy"
                block
                :options="LOGO_MODE_OPTIONS"
                aria-label="Logo 展示形式"
              />
            </el-form-item>
          </el-form>

          <!-- 图片 Logo：仅图片模式 / 图文模式展开 -->
          <div v-if="showsImage" class="bhp-card">
            <p class="bhp-card__title">Logo 图片</p>
            <div class="bhp-logo">
              <div class="bhp-logo__preview">
                <img v-if="logoPreview && !logoBroken" :src="logoPreview" alt="" @error="logoBroken = true" />
                <span v-else class="bhp-logo__ph">LOGO</span>
              </div>
              <div class="bhp-logo__ops">
                <el-input
                  :model-value="cfg.logo"
                  size="small"
                  placeholder="Logo 图片 URL"
                  @update:model-value="onLogoUrl"
                />
                <div class="bhp-logo__btns">
                  <label class="bhp-btn">
                    {{ uploading ? '上传中…' : '本地上传' }}
                    <input type="file" accept="image/*" hidden @change="onUploadLogo" />
                  </label>
                  <AssetPickerButton @select="onPickAsset" />
                  <el-button v-if="cfg.logo" size="small" text @click="patch({ logo: '' })">清空</el-button>
                </div>
              </div>
            </div>

            <el-form label-width="76px" size="small" class="bhp-card__form">
              <el-form-item label="Logo 高度">
                <NumSliderRow
                  :model-value="cfg.logo_height"
                  :min="LOGO_HEIGHT.min"
                  :max="LOGO_HEIGHT.max"
                  :step="LOGO_HEIGHT.step"
                  @update:model-value="(v: number) => patch({ logo_height: v })"
                />
              </el-form-item>
              <el-form-item label="最大宽度">
                <NumSliderRow
                  :model-value="cfg.logo_max_width"
                  :min="LOGO_MAX_WIDTH.min"
                  :max="LOGO_MAX_WIDTH.max"
                  :step="LOGO_MAX_WIDTH.step"
                  @update:model-value="(v: number) => patch({ logo_max_width: v })"
                />
              </el-form-item>
              <el-form-item label="保持比例">
                <el-switch
                  :model-value="cfg.logo_keep_ratio"
                  @change="(v: boolean) => patch({ logo_keep_ratio: v })"
                />
                <FieldHint text="开启后按原始宽高比缩放，不会被压扁或拉伸；关闭请同时确认「适应方式」" />
              </el-form-item>
              <el-form-item v-if="!cfg.logo_keep_ratio" label="适应方式">
                <BuilderSegmented
                  :model-value="cfg.logo_fit"
                  block
                  :options="LOGO_FIT_OPTIONS"
                  @update:model-value="(v) => patch({ logo_fit: v })"
                />
              </el-form-item>
            </el-form>
          </div>

          <!-- 文字 Logo：仅文字模式 / 图文模式展开 -->
          <div v-if="showsText" class="bhp-card">
            <p class="bhp-card__title">文字品牌</p>
            <el-form label-width="76px" size="small">
              <el-form-item label="品牌文字">
                <el-input
                  :model-value="cfg.logo_text"
                  maxlength="8"
                  placeholder="如：跨境墨太白"
                  @update:model-value="(v: string) => patch({ logo_text: v })"
                />
              </el-form-item>
              <el-form-item label="文字加粗">
                <el-switch
                  :model-value="cfg.logo_text_bold"
                  @change="(v: boolean) => patch({ logo_text_bold: v })"
                />
              </el-form-item>
              <el-form-item label="字色">
                <ColorPickerField
                  :model-value="cfg.logo_text_color"
                  label=""
                  :predefine="BRAND_PALETTE"
                  @update:model-value="(v: string) => patch({ logo_text_color: v })"
                />
              </el-form-item>
            </el-form>
          </div>

          <!-- Logo 区分隔线：放在 Logo 配置之后，语义是 Logo 与标题之间的分割 -->
          <div v-if="cfg.logo_mode !== 'none'" class="bhp-card">
            <p class="bhp-card__title">Logo 区分隔线</p>
            <el-form label-width="76px" size="small">
              <el-form-item label="显示竖线">
                <el-switch
                  :model-value="cfg.show_divider"
                  @change="(v: boolean) => patch({ show_divider: v })"
                />
                <FieldHint text="Logo 与主标题之间的竖向分割线" />
              </el-form-item>
              <el-form-item v-if="cfg.show_divider" label="竖线颜色">
                <ColorPickerField
                  :model-value="isDark ? cfg.divider_color_light : cfg.divider_color"
                  label=""
                  :predefine="BRAND_PALETTE"
                  @update:model-value="onDividerColor"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="bhp-sec">
          <div class="bhp-sec__head"><span class="bhp-sec__title">文案内容</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="主标题">
              <el-input
                :model-value="cfg.title"
                :maxlength="TITLE_MAX_LENGTH"
                show-word-limit
                placeholder="品牌名 · 一句话定位"
                @update:model-value="(v: string) => patch({ title: v })"
              />
              <FieldHint text="主标题过长会撞到微信右上角胶囊，画布会标红提醒" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input
                :model-value="cfg.subtitle"
                :maxlength="SUBTITLE_MAX_LENGTH"
                show-word-limit
                placeholder="可选，留空则不显示"
                @update:model-value="(v: string) => patch({ subtitle: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="bhp-sec">
          <div class="bhp-sec__head"><span class="bhp-sec__title">点击跳转</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="点击品牌区">
              <el-select
                :model-value="cfg.tap_action"
                style="width: 100%"
                @update:model-value="(v: string) => patch({ tap_action: v })"
              >
                <el-option v-for="o in TAP_ACTION_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="cfg.tap_action === 'custom' || cfg.tap_action === 'intro'" label="跳转目标">
              <LinkPickerField
                :link-type="cfg.tap_link_type"
                :link-url="cfg.tap_link_url"
                @update:link-type="(v: string) => patch({ tap_link_type: v })"
                @update:link-url="(v: string) => patch({ tap_link_url: v })"
              />
              <FieldHint v-if="cfg.tap_action === 'intro'" text="小程序端没有内置「品牌介绍」页，请选择承载品牌介绍内容的页面路径" />
            </el-form-item>
          </el-form>
        </div>

        <div class="bhp-sec">
          <div class="bhp-sec__head"><span class="bhp-sec__title">右侧功能区</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="快捷入口">
              <el-switch
                :model-value="cfg.show_action"
                @change="(v: boolean) => patch({ show_action: v })"
              />
              <FieldHint text="在顶栏右侧展示一个小图标按钮" />
            </el-form-item>

            <template v-if="cfg.show_action">
              <el-form-item label="图标类型">
                <el-select
                  :model-value="cfg.action_icon"
                  style="width: 100%"
                  @update:model-value="(v: string) => patch({ action_icon: v })"
                >
                  <el-option v-for="o in ACTION_ICON_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="触发动作">
                <el-select
                  :model-value="cfg.action_tap_action"
                  style="width: 100%"
                  @update:model-value="(v: string) => patch({ action_tap_action: v })"
                >
                  <el-option label="无操作" value="none" />
                  <el-option label="打开品牌介绍页" value="intro" />
                  <el-option label="自定义跳转" value="custom" />
                </el-select>
              </el-form-item>
              <el-form-item
                v-if="cfg.action_tap_action === 'custom' || cfg.action_tap_action === 'intro'"
                label="跳转目标"
              >
                <LinkPickerField
                  :link-type="cfg.action_link_type"
                  :link-url="cfg.action_link_url"
                  @update:link-type="(v: string) => patch({ action_link_type: v })"
                  @update:link-url="(v: string) => patch({ action_link_url: v })"
                />
              </el-form-item>
            </template>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- ==================== 样式配置 ==================== -->
      <el-tab-pane label="样式" name="style">
        <div class="bhp-sec">
          <div class="bhp-sec__head"><span class="bhp-sec__title">背景风格</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="背景模式">
              <BuilderSegmented
                :model-value="cfg.bg_mode"
                block
                :options="BG_MODE_OPTIONS"
                @update:model-value="(v) => patch({ bg_mode: v })"
              />
            </el-form-item>

            <el-form-item v-if="cfg.bg_mode === 'plain'" label="背景色">
              <ColorPickerField
                :model-value="cfg.background_color"
                label=""
                :predefine="BRAND_PALETTE"
                default-value="#ffffff"
                @update:model-value="(v: string) => patch({ background_color: v })"
              />
            </el-form-item>

            <template v-if="cfg.bg_mode === 'gradient'">
              <el-form-item label="渐变起">
                <ColorPickerField
                  :model-value="cfg.gradient_from"
                  label=""
                  :predefine="BRAND_PALETTE"
                  @update:model-value="(v: string) => patch({ gradient_from: v })"
                />
              </el-form-item>
              <el-form-item label="渐变止">
                <ColorPickerField
                  :model-value="cfg.gradient_to"
                  label=""
                  :predefine="BRAND_PALETTE"
                  @update:model-value="(v: string) => patch({ gradient_to: v })"
                />
              </el-form-item>
            </template>

            <el-form-item v-if="cfg.bg_mode === 'immersive'" label="压暗层">
              <el-switch :model-value="true" disabled />
              <FieldHint text="沉浸模式为半透明底，下方页面内容会透出；建议同时开启吸顶毛玻璃" />
            </el-form-item>

            <el-form-item label="底部分隔线">
              <el-switch
                :model-value="cfg.bottom_border"
                @change="(v: boolean) => patch({ bottom_border: v })"
              />
              <FieldHint text="页面白底时用细线区分顶栏与正文" />
            </el-form-item>
            <el-form-item v-if="cfg.bottom_border" label="分隔线色">
              <ColorPickerField
                :model-value="cfg.bottom_border_color"
                label=""
                :predefine="BRAND_PALETTE"
                default-value="#eef1f6"
                @update:model-value="(v: string) => patch({ bottom_border_color: v })"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="bhp-sec">
          <div class="bhp-sec__head"><span class="bhp-sec__title">文字排版与色彩</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="主标题字号">
              <NumSliderRow
                :model-value="cfg.title_font_size"
                :min="TITLE_FONT_SIZE.min"
                :max="TITLE_FONT_SIZE.max"
                :step="TITLE_FONT_SIZE.step"
                @update:model-value="(v: number) => patch({ title_font_size: v })"
              />
            </el-form-item>
            <el-form-item label="主标题色">
              <ColorPickerField
                :model-value="isDark ? cfg.title_color_light : cfg.title_color"
                label=""
                :predefine="BRAND_PALETTE"
                @update:model-value="onTitleColor"
              />
            </el-form-item>
            <el-form-item label="副标题字号">
              <NumSliderRow
                :model-value="cfg.subtitle_font_size"
                :min="SUBTITLE_FONT_SIZE.min"
                :max="SUBTITLE_FONT_SIZE.max"
                :step="SUBTITLE_FONT_SIZE.step"
                @update:model-value="(v: number) => patch({ subtitle_font_size: v })"
              />
            </el-form-item>
            <el-form-item label="副标题色">
              <ColorPickerField
                :model-value="isDark ? cfg.subtitle_color_light : cfg.subtitle_color"
                label=""
                :predefine="BRAND_PALETTE"
                @update:model-value="onSubtitleColor"
              />
            </el-form-item>
          </el-form>
        </div>

        <div class="bhp-sec">
          <div class="bhp-sec__head"><span class="bhp-sec__title">内边距与布局</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="左右内边距">
              <div class="bhp-both">
                <NumSliderRow
                  :model-value="cfg.bar_padding_left"
                  :min="BAR_PADDING.min"
                  :max="BAR_PADDING.max"
                  :step="BAR_PADDING.step"
                  @update:model-value="syncPadding"
                />
                <el-tooltip content="把右内边距同步为左内边距" placement="top">
                  <el-button size="small" text @click="syncPadding(cfg.bar_padding_left)">联动</el-button>
                </el-tooltip>
              </div>
            </el-form-item>
            <el-form-item label="元素间距">
              <NumSliderRow
                :model-value="cfg.item_gap"
                :min="ITEM_GAP.min"
                :max="ITEM_GAP.max"
                :step="ITEM_GAP.step"
                @update:model-value="(v: number) => patch({ item_gap: v })"
              />
              <FieldHint text="Logo、竖线与标题之间的间隙" />
            </el-form-item>
          </el-form>
        </div>

        <div class="bhp-sec">
          <div class="bhp-sec__head"><span class="bhp-sec__title">滚动吸顶与高级交互</span></div>
          <el-form label-width="76px" size="small">
            <el-form-item label="滚动吸顶">
              <el-switch
                :model-value="cfg.sticky"
                @change="(v: boolean) => patch({ sticky: v, fixed_top: v })"
              />
            </el-form-item>
            <template v-if="cfg.sticky">
              <el-form-item label="毛玻璃">
                <el-switch
                  :model-value="cfg.backdrop_blur"
                  @change="(v: boolean) => patch({ backdrop_blur: v })"
                />
                <FieldHint text="吸顶时背景增加 blur(8px) 质感；小程序端需真机才能看到" />
              </el-form-item>
              <el-form-item label="滚动投影">
                <el-switch
                  :model-value="cfg.scroll_shadow"
                  @change="(v: boolean) => patch({ scroll_shadow: v })"
                />
                <FieldHint text="向下滚动后显示细腻浅阴影，提升层次感" />
              </el-form-item>
            </template>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import ColorPickerField from '../ColorPickerField.vue'
import NumSliderRow from './NumSliderRow.vue'
import LinkPickerField from '../LinkPickerField.vue'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import { normalizeUploadUrl } from '@/api/system'
import { useImageUpload } from '../composables/useImageUpload'
import {
  ACTION_ICON_OPTIONS,
  BAR_PADDING,
  BG_MODE_OPTIONS,
  BRAND_PALETTE,
  ITEM_GAP,
  LOGO_FIT_OPTIONS,
  LOGO_HEIGHT,
  LOGO_MAX_WIDTH,
  LOGO_MODE_OPTIONS,
  SUBTITLE_FONT_SIZE,
  SUBTITLE_MAX_LENGTH,
  TAP_ACTION_OPTIONS,
  TITLE_FONT_SIZE,
  TITLE_MAX_LENGTH,
  isDarkBrandBg,
  normalizeBrandHeaderProps,
  showsLogoImage,
  showsLogoText,
  type BrandHeaderProps,
} from '../brandHeader/brandHeaderSchema'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const { uploadImage } = useImageUpload()
const uploading = ref(false)
const logoBroken = ref(false)
const activeTab = ref<'content' | 'style'>('content')

const cfg = computed<BrandHeaderProps>(() => normalizeBrandHeaderProps(data))

const isDark = computed(() => isDarkBrandBg(cfg.value.bg_mode))
const showsImage = computed(() => showsLogoImage(cfg.value.logo_mode))
const showsText = computed(() => showsLogoText(cfg.value.logo_mode))

const logoPreview = computed(() => normalizeUploadUrl(String(cfg.value.logo || '').trim()) || '')

/** BuilderSegmented 需要可写 model */
const logoModeProxy = computed({
  get: () => cfg.value.logo_mode,
  set: (v: string) => patch({ logo_mode: v }),
})

/** 左右内边距「联动」按钮用的目标值 */
function syncPadding(value: number) {
  patch({ bar_padding_left: value, bar_padding_right: value })
}

function patch(partial: Record<string, unknown>) {
  emit('update', { ...partial })
}

function onLogoUrl(url: string) {
  logoBroken.value = false
  patch({ logo: url })
}

function onPickAsset(url: string) {
  logoBroken.value = false
  patch({ logo: url })
}

async function onUploadLogo(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    await uploadImage(file, {
      onSuccess: (url: string) => {
        logoBroken.value = false
        patch({ logo: url })
      },
    })
  } finally {
    uploading.value = false
    input.value = ''
  }
}

/* 深色背景下，颜色要写进 *_light 字段（端上按背景模式读不同键） */
function onTitleColor(color: string) {
  patch(isDark.value ? { title_color_light: color } : { title_color: color })
}

function onSubtitleColor(color: string) {
  patch(isDark.value ? { subtitle_color_light: color } : { subtitle_color: color })
}

function onDividerColor(color: string) {
  patch(isDark.value ? { divider_color_light: color } : { divider_color: color })
}
</script>

<style lang="scss" scoped>
.bhp-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.bhp-sec {
  margin-bottom: 16px;
}

.bhp-sec__head {
  margin-bottom: 8px;
}

.bhp-sec__title {
  font-size: 13px;
  font-weight: 600;
  color: #3f3a35;
}

/* ---------- 配置卡片（Logo 图文 / 分隔线等成组项） ---------- */
.bhp-card {
  padding: 10px 10px 2px;
  margin-bottom: 10px;
  background: #faf8f5;
  border: 1px solid #eee8e0;
  border-radius: 10px;
}

.bhp-card__title {
  margin: 0 0 8px;
  font-size: 11px;
  color: #a89c8d;
}

.bhp-card__form {
  margin-top: 4px;
}

/* ---------- Logo 上传 ---------- */
.bhp-logo {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.bhp-logo__preview {
  display: grid;
  place-items: center;
  flex: none;
  width: 56px;
  height: 56px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e6dfd5;
  border-radius: 8px;

  img {
    max-width: 100%;
    max-height: 100%;
    /* 预览也保持比例，与画布一致，避免「预览不扁、画布扁」 */
    object-fit: contain;
  }
}

.bhp-logo__ph {
  font-size: 10px;
  color: #c3b8aa;
}

.bhp-logo__ops {
  flex: 1;
  min-width: 0;
}

.bhp-logo__btns {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}

.bhp-btn {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  color: #606b75;
  cursor: pointer;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;

  &:hover {
    color: var(--el-color-primary, #c08e6e);
    border-color: var(--el-color-primary, #c08e6e);
  }
}

/* ---------- 左右内边距联动 ---------- */
.bhp-both {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}
</style>
