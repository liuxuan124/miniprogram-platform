<template>
  <div class="props-panel">
    <!-- 页面属性：独立「页面」tab 常驻可见；兼容旧用法（未选中组件时回退展示） -->
    <template v-if="section === 'page' || (!section && !pageStore.selectedComponent)">
      <div class="panel-section">
        <div class="section-title">页面属性</div>
        <el-form label-width="72px" size="small">
          <el-form-item label="页面名称">
            <el-input
              :model-value="pageStore.pageConfig.name"
              maxlength="128"
              show-word-limit
              @input="(v: string) => onNameInput(v)"
            />
          </el-form-item>
          <el-form-item label="访问路径">
            <PagePathField
              :model-value="currentPath"
              :page-type="currentPageType"
              @update:model-value="onPathInput"
            />
          </el-form-item>
          <el-form-item label="背景">
            <div class="bg-editor">
              <el-radio-group
                :model-value="bgModel.type"
                size="small"
                @update:model-value="(v: 'solid' | 'gradient') => onBgTypeChange(v)"
              >
                <el-radio-button value="solid">纯色</el-radio-button>
                <el-radio-button value="gradient">渐变</el-radio-button>
              </el-radio-group>

              <!-- 纯色模式 -->
              <div v-if="bgModel.type === 'solid'" class="bg-editor__row">
                <el-color-picker
                  :model-value="bgSolidColor"
                  show-alpha
                  @change="(v: string | null) => onBgSolidChange(v)"
                />
                <span class="bg-editor__hint">支持 Hex / RGBA</span>
              </div>

              <!-- 渐变模式 -->
              <template v-else>
                <div class="bg-editor__row">
                  <span class="bg-editor__label">角度</span>
                  <el-slider
                    :model-value="bgGradient.angle"
                    :min="0"
                    :max="360"
                    :step="1"
                    style="flex: 1"
                    @update:model-value="(v: number) => onBgAngleChange(v)"
                  />
                  <span class="bg-editor__angle">{{ bgGradient.angle }}°</span>
                </div>
                <div
                  v-for="(stop, i) in bgGradient.stops"
                  :key="i"
                  class="bg-editor__row bg-editor__stop"
                >
                  <el-color-picker
                    :model-value="stop.color"
                    show-alpha
                    @change="(v: string | null) => onBgStopColorChange(i, v)"
                  />
                  <el-slider
                    :model-value="stop.offset"
                    :min="0"
                    :max="100"
                    :step="1"
                    style="flex: 1"
                    @update:model-value="(v: number) => onBgStopOffsetChange(i, v)"
                  />
                  <span class="bg-editor__angle">{{ stop.offset }}%</span>
                  <el-button
                    v-if="bgGradient.stops.length > 2"
                    text
                    size="small"
                    type="danger"
                    @click="removeBgStop(i)"
                  >删除</el-button>
                </div>
                <div class="bg-editor__row">
                  <el-button
                    size="small"
                    :disabled="bgGradient.stops.length >= 5"
                    @click="addBgStop"
                  >+ 添加色标</el-button>
                </div>
              </template>

              <!-- 品牌预设色盘：常驻快捷选项 -->
              <div class="bg-editor__presets">
                <button
                  v-for="preset in BACKGROUND_PRESETS"
                  :key="preset.label"
                  type="button"
                  class="bg-preset"
                  :title="preset.label"
                  @click="applyBackgroundPreset(preset)"
                >
                  <span
                    class="bg-preset__swatch"
                    :style="{ background: backgroundToCss(preset.background) }"
                  ></span>
                  <span class="bg-preset__label">{{ preset.label }}</span>
                </button>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="分享标题">
            <el-input :model-value="pageStore.pageConfig.share_title || ''" @input="(v: string) => pageStore.updatePageConfig({ share_title: v })" />
          </el-form-item>
          <el-form-item label="分享封面">
            <div class="share-image-field">
              <div v-if="shareImageUrl" class="share-image-preview">
                <img :src="shareImageUrl" alt="" />
                <el-button text type="danger" size="small" @click="pageStore.updatePageConfig({ share_image: '' })">移除</el-button>
              </div>
              <el-input
                :model-value="pageStore.pageConfig.share_image || ''"
                placeholder="分享封面图 URL"
                @input="(v: string) => pageStore.updatePageConfig({ share_image: v })"
              />
              <label class="upload-btn">
                {{ uploadingShare ? '上传中…' : '本地上传' }}
                <input type="file" accept="image/*" hidden :disabled="uploadingShare" @change="onUploadShareImage" />
              </label>
              <AssetPickerButton
                style="margin-left: 8px"
                @select="(url: string) => pageStore.updatePageConfig({ share_image: url })"
              />
            </div>
          </el-form-item>
        </el-form>
      </div>
      <div class="panel-section">
        <div class="section-title">全局配置</div>
        <el-form label-width="72px" size="small">
          <el-form-item label="下拉刷新">
            <el-switch :model-value="pageStore.globalConfig.pull_refresh" @change="(v: boolean) => pageStore.updateGlobalConfig({ pull_refresh: v })" />
          </el-form-item>
          <el-form-item label="触底加载">
            <el-switch :model-value="pageStore.globalConfig.reach_bottom_load" @change="(v: boolean) => pageStore.updateGlobalConfig({ reach_bottom_load: v })" />
          </el-form-item>
          <el-form-item label="底部渐隐">
            <el-switch
              :model-value="bottomOverlay.enabled"
              @change="(v: boolean) => updateBottomOverlay({ enabled: v })"
            />
            <div class="style-hint">页面底部渐变融合遮罩：列表/卡片下边缘平滑弱化融入背景，不阻断点击与滚动</div>
          </el-form-item>
          <template v-if="bottomOverlay.enabled">
            <el-form-item label="遮罩高度">
              <div class="bg-editor__row" style="width: 100%">
                <el-slider
                  :model-value="bottomOverlay.height"
                  :min="60"
                  :max="160"
                  :step="2"
                  :marks="{ 60: '60', 96: '96', 160: '160' }"
                  style="flex: 1"
                  @update:model-value="(v: number) => updateBottomOverlay({ height: v })"
                />
                <span class="bg-editor__angle">{{ bottomOverlay.height }}px</span>
              </div>
            </el-form-item>
            <el-form-item label="融合色">
              <div class="style-color-row">
                <el-radio-group
                  :model-value="overlayColorMode"
                  size="small"
                  @update:model-value="(v: 'auto' | 'custom') => onOverlayColorModeChange(v)"
                >
                  <el-radio value="auto">自动取底色</el-radio>
                  <el-radio value="custom">自定义</el-radio>
                </el-radio-group>
                <el-color-picker
                  v-if="overlayColorMode === 'custom'"
                  :model-value="bottomOverlay.color === 'auto' ? '' : bottomOverlay.color"
                  show-alpha
                  @change="(v: string | null) => updateBottomOverlay({ color: v || 'auto' })"
                />
              </div>
              <div class="style-hint">自动模式：渐变背景取终点色标，纯色背景取该颜色</div>
            </el-form-item>
          </template>
        </el-form>
      </div>
    </template>

    <!-- 指定了内容/样式分区但未选中组件：空态引导 -->
    <template v-else-if="!pageStore.selectedComponent">
      <div class="props-empty-hint">
        <div class="props-empty-hint__title">未选中组件</div>
        <div class="props-empty-hint__desc">在画布中点击一个组件，即可编辑它的{{ section === 'style' ? '样式与间距' : '内容与数据' }}；页面级设置在「页面」页签。</div>
      </div>
    </template>

    <!-- Component selected: show component properties -->
    <template v-else>
      <div class="panel-header">
        <div>
          <span class="panel-kicker">当前组件</span>
          <div class="comp-type-label">{{ ComponentTypeLabels[pageStore.selectedComponent.type] }}</div>
        </div>
        <el-button text size="small" @click="pageStore.selectComponent('')">取消选中</el-button>
      </div>

      <!-- 分区模式（editor 右栏已有一级 内容/样式/页面 tab）下，按 section 只渲染对应窗格，
           避免内层再出现「内容与数据/样式」二级 tab 与外层重复；
           非分区模式（独立使用）保持两窗格可切换 -->
      <el-tabs v-model="activeTab" class="props-tabs" :class="{ 'props-tabs--single': !!section }" stretch>
        <el-tab-pane v-if="!section || section === 'content'" label="内容与数据" name="content">
          <!-- 组件被隐藏时的提醒：
               画布里的「已隐藏」来自样式页签的 componentStyle.visible，
               与本页签的「显示搜索/显示导航/通知铃」是两套独立开关。
               用户在内容页签点任何开关都不会让组件重新出现，所以必须在此显式提示 + 一键恢复。 -->
          <div v-if="componentHidden" class="hidden-reminder">
            <el-icon class="hidden-reminder__icon"><WarningFilled /></el-icon>
            <div class="hidden-reminder__body">
              <div class="hidden-reminder__title">该组件当前已隐藏，小程序端不会渲染</div>
              <div class="hidden-reminder__desc">在「样式」页签底部把「组件可见」打开即可恢复；本页签的内容开关只控制组件内部元素。</div>
            </div>
            <el-button size="small" type="primary" plain @click="restoreComponentVisible">恢复显示</el-button>
          </div>
          <div v-if="dataStatus" class="data-status-card" :class="`is-${dataStatus.tone}`">
            <div class="data-status-card__main">
              <span class="data-status-dot"></span>
              <div>
                <div class="data-status-title">{{ dataStatus.title }}</div>
                <div class="data-status-desc">{{ dataStatus.description }}</div>
              </div>
            </div>
            <el-button v-if="dataStatus.routeName" text type="primary" size="small" @click="goManageData">
              管理数据
            </el-button>
          </div>
          <div v-if="dataSourceBinding" class="ds-binding-card">
            <div class="ds-binding-card__title">数据源绑定（必填）</div>
            <el-form label-width="72px" size="small">
              <el-form-item label="type" required>
                <el-tag :type="dataSourceBinding.typeOk ? 'success' : 'danger'" size="small">
                  {{ dataSourceBinding.type || '未配置' }}
                </el-tag>
                <span v-if="!dataSourceBinding.typeOk" class="ds-binding-hint">期望：{{ dataSourceBinding.expectedType }}</span>
              </el-form-item>
              <el-form-item label="query" required>
                <el-tag :type="dataSourceBinding.queryOk ? 'success' : 'danger'" size="small">
                  {{ dataSourceBinding.queryOk ? `已配置 ${dataSourceBinding.queryKeyCount} 项` : '未配置' }}
                </el-tag>
              </el-form-item>
            </el-form>
            <el-alert
              v-for="issue in dataSourceBinding.issues"
              :key="issue"
              :title="issue"
              type="warning"
              :closable="false"
              show-icon
              class="ds-binding-alert"
            />
          </div>
          <div class="panel-section panel-section--content">
            <component
              :is="propsPanelMap[pageStore.selectedComponent.type]"
              :props="pageStore.selectedComponent.props"
              :type="pageStore.selectedComponent.type"
              @update="handlePropsUpdate"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="!section || section === 'style'" label="样式" name="style">
          <div class="style-section-body">
          <div class="shell-note">
            边距直接决定组件在手机上的位置，画布里的虚线框只是编辑指示，真机不显示。
          </div>

          <!-- 相对屏幕边缘的外边距 -->
          <div v-if="hideMarginEditor" class="shell-note">
            品牌顶栏始终铺满屏幕宽度并替代系统导航栏，无需设置外边距。
          </div>
          <div v-else class="spacing-card">
            <div class="spacing-card__head">
              <span class="spacing-card__title">外边距<em>相对屏幕</em></span>
              <el-tooltip :content="marginLinked ? '已锁定：四向等比联动' : '点击锁定四向等比联动'" placement="top">
                <el-button
                  :type="marginLinked ? 'primary' : 'default'"
                  size="small"
                  circle
                  class="margin-lock-btn"
                  :aria-label="marginLinked ? '已锁定四向等比，点击取消' : '点击锁定四向等比联动'"
                  @click="marginLinked = !marginLinked"
                >
                  <el-icon><component :is="marginLinked ? Lock : Unlock" /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <div class="spacing-grid">
              <div class="spacing-cell">
                <span>上</span>
                <el-input-number
                  :model-value="Number(currentStyle.margin_top ?? 0)"
                  :min="allowsNegativeMargin ? -120 : 0"
                  :max="100"
                  size="small"
                  controls-position="right"
                  @change="(v: number) => updateMargin('margin_top', v)"
                />
              </div>
              <div class="spacing-cell">
                <span>下</span>
                <el-input-number
                  :model-value="Number(currentStyle.margin_bottom ?? 0)"
                  :min="allowsNegativeMargin ? -120 : 0"
                  :max="100"
                  size="small"
                  controls-position="right"
                  @change="(v: number) => updateMargin('margin_bottom', v)"
                />
              </div>
              <div class="spacing-cell">
                <span>左</span>
                <el-input-number
                  :model-value="currentStyle.margin_left || 0"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number) => updateMargin('margin_left', v)"
                />
              </div>
              <div class="spacing-cell">
                <span>右</span>
                <el-input-number
                  :model-value="currentStyle.margin_right || 0"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number) => updateMargin('margin_right', v)"
                />
              </div>
            </div>
            <div class="style-hint">
              组件与屏幕边缘的距离，单位 px。<template v-if="allowsNegativeMargin">上下可填负数与相邻组件重叠，重叠时本组件置顶。</template>
            </div>
          </div>

          <div class="spacing-card">
            <div class="spacing-card__head">
              <span class="spacing-card__title">内边距<em>组件内部</em></span>
              <el-tooltip :content="paddingLinked ? '已锁定：四向等比联动' : '点击锁定四向等比联动'" placement="top">
                <el-button
                  :type="paddingLinked ? 'primary' : 'default'"
                  size="small"
                  circle
                  class="margin-lock-btn"
                  :aria-label="paddingLinked ? '已锁定四向等比，点击取消' : '点击锁定四向等比联动'"
                  @click="paddingLinked = !paddingLinked"
                >
                  <el-icon><component :is="paddingLinked ? Lock : Unlock" /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <div class="spacing-grid">
              <div class="spacing-cell">
                <span>上</span>
                <el-input-number
                  :model-value="Number(currentStyle.padding_top ?? 0)"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number | undefined) => updatePadding('padding_top', v ?? 0)"
                />
              </div>
              <div class="spacing-cell">
                <span>下</span>
                <el-input-number
                  :model-value="Number(currentStyle.padding_bottom ?? 0)"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number | undefined) => updatePadding('padding_bottom', v ?? 0)"
                />
              </div>
              <div class="spacing-cell">
                <span>左</span>
                <el-input-number
                  :model-value="Number(currentStyle.padding_left ?? 0)"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number | undefined) => updatePadding('padding_left', v ?? 0)"
                />
              </div>
              <div class="spacing-cell">
                <span>右</span>
                <el-input-number
                  :model-value="Number(currentStyle.padding_right ?? 0)"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number | undefined) => updatePadding('padding_right', v ?? 0)"
                />
              </div>
            </div>
            <div class="style-hint">内容与组件边框的距离，单位 px，作用于内容区/卡片。</div>
          </div>

          <div class="style-divider"><span>外观</span></div>

          <el-form label-width="72px" size="small" class="style-form">
            <el-form-item label="圆角">
              <el-input-number
                :model-value="Number(currentStyle.border_radius ?? 0)"
                :min="0"
                :max="40"
                controls-position="right"
                @change="(v: number | undefined) => updateStyle('border_radius', v ?? 0)"
              />
              <div class="style-hint">单位 px，作用于组件内容区/卡片（非整块外框）</div>
            </el-form-item>
            <el-form-item label="背景色">
              <div class="style-color-row">
                <el-color-picker
                  :model-value="currentStyle.background_color || ''"
                  show-alpha
                  @change="(v: string | null) => updateStyle('background_color', v || undefined)"
                />
                <el-button
                  v-if="currentStyle.background_color"
                  text
                  size="small"
                  @click="updateStyle('background_color', undefined)"
                >
                  清除
                </el-button>
              </div>
            </el-form-item>
            <el-form-item v-if="isListComponent" label="卡片间距">
              <el-input-number
                :model-value="Number(currentProps.item_gap ?? 8)"
                :min="0"
                :max="48"
                controls-position="right"
                @change="(v: number | undefined) => handlePropsUpdate({ item_gap: v ?? 8 })"
              />
              <div class="style-hint">单位 px，控制小卡片之间的空隙</div>
            </el-form-item>
            <template v-if="supportsShadow">
              <el-form-item label="阴影预设">
                <div class="shadow-preset-row">
                  <button
                    type="button"
                    class="shadow-preset"
                    :class="{ 'is-active': activeShadowPreset === 'warm' }"
                    @click="applyShadowPreset('warm')"
                  >暖调微光</button>
                  <button
                    type="button"
                    class="shadow-preset"
                    :class="{ 'is-active': activeShadowPreset === 'standard' }"
                    @click="applyShadowPreset('standard')"
                  >标准弥散</button>
                  <button
                    type="button"
                    class="shadow-preset"
                    :class="{ 'is-active': activeShadowPreset === 'none' }"
                    @click="applyShadowPreset('none')"
                  >无阴影</button>
                </div>
              </el-form-item>
              <el-form-item label="自定义阴影">
                <div class="shadow-custom-grid">
                  <div class="shadow-custom-item"><span>X</span>
                    <el-input-number
                      :model-value="Number(currentStyle.shadow_x ?? 0)"
                      :min="-40" :max="40" size="small" controls-position="right"
                      @change="(v: number | undefined) => updateStyle('shadow_x', v ?? 0)"
                    />
                  </div>
                  <div class="shadow-custom-item"><span>Y</span>
                    <el-input-number
                      :model-value="Number(currentStyle.shadow_y ?? 0)"
                      :min="-40" :max="40" size="small" controls-position="right"
                      @change="(v: number | undefined) => updateStyle('shadow_y', v ?? 0)"
                    />
                  </div>
                  <div class="shadow-custom-item"><span>模糊</span>
                    <el-input-number
                      :model-value="Number(currentStyle.shadow_blur ?? 0)"
                      :min="0" :max="80" size="small" controls-position="right"
                      @change="(v: number | undefined) => updateStyle('shadow_blur', v ?? 0)"
                    />
                  </div>
                  <div class="shadow-custom-item"><span>扩散</span>
                    <el-input-number
                      :model-value="Number(currentStyle.shadow_spread ?? 0)"
                      :min="-20" :max="40" size="small" controls-position="right"
                      @change="(v: number | undefined) => updateStyle('shadow_spread', v ?? 0)"
                    />
                  </div>
                  <div class="shadow-custom-item shadow-custom-item--color">
                    <span>颜色</span>
                    <el-color-picker
                      :model-value="currentStyle.shadow_color || 'rgba(0, 0, 0, 0)'"
                      show-alpha
                      @change="(v: string | null) => updateStyle('shadow_color', v || 'rgba(0, 0, 0, 0)')"
                    />
                    <el-button
                      v-if="hasCustomShadow"
                      text
                      size="small"
                      @click="applyShadowPreset('none')"
                    >清除</el-button>
                  </div>
                </div>
                <div class="style-hint">偏移/模糊/扩散单位 px，颜色支持 Alpha 透明度；自定义后预设高亮自动跟随</div>
              </el-form-item>
            </template>
            <el-form-item label="文字颜色">
              <div class="style-color-row">
                <el-color-picker
                  :model-value="currentStyle.text_color || ''"
                  @change="(v: string | null) => updateStyle('text_color', v || undefined)"
                />
                <el-button
                  v-if="currentStyle.text_color"
                  text
                  size="small"
                  @click="updateStyle('text_color', undefined)"
                >
                  恢复默认
                </el-button>
              </div>
            </el-form-item>
            <el-form-item v-if="!hasSplitTextSize" label="文字大小">
              <el-input-number
                :model-value="currentStyle.font_size || 0"
                :min="0"
                :max="48"
                controls-position="right"
                @change="(v: number) => updateStyle('font_size', v > 0 ? v : undefined)"
              />
              <div class="style-hint">0 表示使用组件默认字号</div>
            </el-form-item>
            <el-form-item label="组件可见">
              <el-switch
                :model-value="currentStyle.visible !== false"
                @change="(v: boolean) => updateStyle('visible', v)"
              />
              <div class="style-hint">关闭后小程序端不渲染该组件；画布仍保留并标「已隐藏」，便于继续编辑</div>            </el-form-item>
          </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { Lock, Unlock, WarningFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { normalizeUploadUrl } from '@/api/system'
import { usePageStore } from '@/stores/page'
import { ComponentType, ComponentTypeLabels, BACKGROUND_PRESETS } from '@/types/page'
import type { PageBackground, PageGradient } from '@/types/page'
import {
  normalizePageBackground,
  backgroundToCss,
  normalizeBottomOverlay,
  syncLegacyBackgroundColor,
} from '@/utils/page-background'
import { normalizeBuilderPath } from '@/utils/page-path'
import { useImageUpload } from './composables/useImageUpload'
import { getDataSourceBinding } from './dataSourceValidation'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import PagePathField from './PagePathField.vue'

const pageStore = usePageStore()
const router = useRouter()
const { uploadImage, uploading: uploadingShare } = useImageUpload()

/** 分区模式：editor 右栏拍平为 内容/样式/页面 三个一级 tab 时传入；不传则保持旧的两级嵌套行为 */
const { section } = defineProps<{ section?: 'content' | 'style' | 'page' }>()

const currentPageType = computed(() => {
  const t = pageStore.currentPage?.type
  if (t === 1 || t === 2 || t === 3) return t
  const dslType = String(pageStore.pageConfig.type || '')
  if (dslType === 'home') return 1
  if (dslType === 'topic' || dslType === 'activity') return 2
  return 3
})

const currentPath = computed(() =>
  normalizeBuilderPath(
    pageStore.currentPage?.path || pageStore.pageConfig.path || '',
  ),
)

function onNameInput(v: string) {
  pageStore.updatePageConfig({ name: v })
  if (pageStore.currentPage) {
    pageStore.currentPage.name = v
  }
}

function onPathInput(v: string) {
  const path = normalizeBuilderPath(v)
  pageStore.updatePageConfig({ path })
  if (pageStore.currentPage) {
    pageStore.currentPage.path = path
  }
}

const activeTab = ref<'content' | 'style'>('content')
const marginLinked = ref(false)
const paddingLinked = ref(false)
const shareImageUrl = computed(() => normalizeUploadUrl(String(pageStore.pageConfig.share_image || '')))

// 分区模式下内层 tab 跟随外层一级 tab 固定
watch(
  () => section,
  (s) => {
    if (s === 'content' || s === 'style') activeTab.value = s
  },
  { immediate: true },
)

const dataSourceBinding = computed(() => {
  const comp = pageStore.selectedComponent
  if (!comp) return null
  return getDataSourceBinding(comp)
})

// 切换选中组件时收起，避免上一个组件的展开状态带到下一个组件造成误解
watch(() => pageStore.selectedComponentId, () => {
  activeTab.value = section === 'style' ? 'style' : 'content'
})

const dataStatus = computed(() => {
  const component = pageStore.selectedComponent
  if (!component) return null
  if (component.type === ComponentType.ProductList) {
    return {
      title: '读取已上架商品',
      description: '改分类后画布会跟着变，不必先点预览',
      tone: 'success',
      routeName: 'CommerceProduct',
    }
  }
  if (component.type === ComponentType.ArticleList || component.type === ComponentType.HotNews) {
    return {
      title: '读取已发布文章',
      description: '改分类后画布会跟着变，不必先点预览',
      tone: 'success',
      routeName: 'ContentList',
    }
  }
  if (component.type === ComponentType.FormEntry) {
    const linked = component.props.formId || component.props.formTemplateId
    return {
      title: linked ? '已关联表单' : '尚未关联表单',
      description: linked ? `表单 ID：${linked}` : '发布前必须选择一个已启用表单',
      tone: linked ? 'success' : 'warning',
      routeName: 'FormTemplate',
    }
  }
  if (component.type === ComponentType.Coupon) {
    const linked = !!component.props.data_source
    return {
      title: '自动读取已发布优惠券',
      description: linked ? '数据源已连接，预览时优先显示真实优惠券' : '尚未配置优惠券数据源',
      tone: linked ? 'success' : 'warning',
      routeName: 'MarketingCoupon',
    }
  }
  return null
})

function goManageData() {
  if (dataStatus.value?.routeName) router.push({ name: dataStatus.value.routeName })
}

const propsPanelMap: Record<string, any> = {
  [ComponentType.Banner]: defineAsyncComponent(() => import('./props/BannerProps.vue')),
  [ComponentType.Search]: defineAsyncComponent(() => import('./props/SearchProps.vue')),
  [ComponentType.NoticeBar]: defineAsyncComponent(() => import('./props/NoticeBarProps.vue')),
  [ComponentType.Image]: defineAsyncComponent(() => import('./props/ImageProps.vue')),
  [ComponentType.Nav]: defineAsyncComponent(() => import('./props/NavProps.vue')),
  [ComponentType.CategoryNav]: defineAsyncComponent(() => import('./props/CategoryNavProps.vue')),
  [ComponentType.ProductList]: defineAsyncComponent(() => import('./props/ProductListProps.vue')),
  [ComponentType.FlashSale]: defineAsyncComponent(() => import('./props/FlashSaleProps.vue')),
  [ComponentType.ArticleList]: defineAsyncComponent(() => import('./props/ArticleListProps.vue')),
  [ComponentType.ArticleFeed]: defineAsyncComponent(() => import('./props/ArticleFeedProps.vue')),
  [ComponentType.NoteFeed]: defineAsyncComponent(() => import('./props/NoteFeedProps.vue')),
  [ComponentType.MomentsFeed]: defineAsyncComponent(() => import('./props/MomentsFeedProps.vue')),
  [ComponentType.HotNews]: defineAsyncComponent(() => import('./props/HotNewsProps.vue')),
  [ComponentType.ActivityEntry]: defineAsyncComponent(() => import('./props/ActivityEntryProps.vue')),
  [ComponentType.ActivityList]: defineAsyncComponent(() => import('./props/ActivityListProps.vue')),
  [ComponentType.AppointmentService]: defineAsyncComponent(() => import('./props/AppointmentServiceProps.vue')),
  [ComponentType.MemberCard]: defineAsyncComponent(() => import('./props/MemberCardProps.vue')),
  [ComponentType.PromoBanner]: defineAsyncComponent(() => import('./props/PromoBannerProps.vue')),
  [ComponentType.Coupon]: defineAsyncComponent(() => import('./props/CouponProps.vue')),
  [ComponentType.Video]: defineAsyncComponent(() => import('./props/VideoProps.vue')),
  [ComponentType.Audio]: defineAsyncComponent(() => import('./props/AudioProps.vue')),
  [ComponentType.BrandIntro]: defineAsyncComponent(() => import('./props/BrandIntroProps.vue')),
  [ComponentType.ImageText]: defineAsyncComponent(() => import('./props/ImageTextProps.vue')),
  [ComponentType.ContactInfo]: defineAsyncComponent(() => import('./props/ContactInfoProps.vue')),
  [ComponentType.Certificate]: defineAsyncComponent(() => import('./props/CertificateProps.vue')),
  [ComponentType.Countdown]: defineAsyncComponent(() => import('./props/CountdownProps.vue')),
  [ComponentType.FloatButton]: defineAsyncComponent(() => import('./props/FloatButtonProps.vue')),
  [ComponentType.RichText]: defineAsyncComponent(() => import('./props/RichTextProps.vue')),
  [ComponentType.ContentPaywall]: defineAsyncComponent(() => import('./props/ContentPaywallProps.vue')),
  [ComponentType.MaterialList]: defineAsyncComponent(() => import('./props/MaterialListProps.vue')),
  [ComponentType.MemberPlan]: defineAsyncComponent(() => import('./props/MemberPlanProps.vue')),
  [ComponentType.QaList]: defineAsyncComponent(() => import('./props/QaListProps.vue')),
  [ComponentType.SectionTitle]: defineAsyncComponent(() => import('./props/SectionTitleProps.vue')),
  [ComponentType.Divider]: defineAsyncComponent(() => import('./props/DividerProps.vue')),
  [ComponentType.Spacer]: defineAsyncComponent(() => import('./props/SpacerProps.vue')),
  [ComponentType.FormEntry]: defineAsyncComponent(() => import('./props/FormEntryProps.vue')),
  [ComponentType.AIEntry]: defineAsyncComponent(() => import('./props/AIEntryProps.vue')),
  [ComponentType.JoinGroup]: defineAsyncComponent(() => import('./props/JoinGroupProps.vue')),
  [ComponentType.BrandHeader]: defineAsyncComponent(() => import('./props/BrandHeaderProps.vue')),
  [ComponentType.Container]: defineAsyncComponent(() => import('./props/ContainerProps.vue')),
  [ComponentType.ImageHotspot]: defineAsyncComponent(() => import('./props/ImageHotspotProps.vue')),
  [ComponentType.SectionBg]: defineAsyncComponent(() => import('./props/SectionBgProps.vue')),
  [ComponentType.FeatureCards]: defineAsyncComponent(() => import('./props/FeatureCardsProps.vue')),
  [ComponentType.ImageCube]: defineAsyncComponent(() => import('./props/ImageCubeProps.vue')),
  [ComponentType.ContentTabs]: defineAsyncComponent(() => import('./props/ContentTabsProps.vue')),
  [ComponentType.PlanetHero]: defineAsyncComponent(() => import('./props/PlanetHeroProps.vue')),
  [ComponentType.PlanetTopics]: defineAsyncComponent(() => import('./props/PlanetTopicsProps.vue')),
  [ComponentType.PlanetFeed]: defineAsyncComponent(() => import('./props/PlanetFeedProps.vue')),
  [ComponentType.WarmGreet]: defineAsyncComponent(() => import('./props/WarmHomeBlockProps.vue')),
  [ComponentType.WarmAuthors]: defineAsyncComponent(() => import('./props/WarmHomeBlockProps.vue')),
  [ComponentType.WarmFeature]: defineAsyncComponent(() => import('./props/WarmHomeBlockProps.vue')),
  [ComponentType.WarmColumns]: defineAsyncComponent(() => import('./props/WarmHomeBlockProps.vue')),
  [ComponentType.WarmPlanetRec]: defineAsyncComponent(() => import('./props/WarmPlanetRecProps.vue')),
  [ComponentType.WarmFeed]: defineAsyncComponent(() => import('./props/WarmHomeBlockProps.vue')),
  [ComponentType.WarmHome]: defineAsyncComponent(() => import('./props/WarmShellProps.vue')),
  [ComponentType.WarmDiscover]: defineAsyncComponent(() => import('./props/WarmDiscoverProps.vue')),
  [ComponentType.WarmPlanet]: defineAsyncComponent(() => import('./props/WarmShellProps.vue')),
  [ComponentType.WarmShop]: defineAsyncComponent(() => import('./props/WarmShellProps.vue')),
  [ComponentType.WarmMine]: defineAsyncComponent(() => import('./props/WarmShellProps.vue')),
}

const currentStyle = computed(() => {
  return pageStore.selectedComponent?.style || {}
})

const currentProps = computed(() => {
  return pageStore.selectedComponent?.props || {}
})

/** 导航栏、商品列表：允许负边距重叠并置顶 */
const allowsNegativeMargin = computed(() => {
  const type = pageStore.selectedComponent?.type
  return type === ComponentType.Nav || type === ComponentType.ProductList
})

const hideMarginEditor = computed(() => {
  return pageStore.selectedComponent?.type === ComponentType.BrandHeader
})

const isListComponent = computed(() => {
  const type = pageStore.selectedComponent?.type
  return type === ComponentType.ProductList
    || type === ComponentType.ArticleList
    || type === ComponentType.ArticleFeed
    || type === ComponentType.NoteFeed
    || type === ComponentType.MomentsFeed
    || type === ComponentType.HotNews
    || type === ComponentType.FlashSale
    || type === ComponentType.ActivityList
    || type === ComponentType.MaterialList
    || type === ComponentType.QaList
})

const hasSplitTextSize = computed(() => {
  const type = pageStore.selectedComponent?.type
  return [
    ComponentType.SectionTitle,
    ComponentType.ArticleList,
    ComponentType.ArticleFeed,
    ComponentType.HotNews,
    ComponentType.ProductList,
    ComponentType.ActivityList,
    ComponentType.ActivityEntry,
    ComponentType.BrandIntro,
    ComponentType.ImageText,
    ComponentType.AppointmentService,
    ComponentType.ContactInfo,
    ComponentType.FlashSale,
    ComponentType.RichText,
    ComponentType.ContentPaywall,
    ComponentType.Certificate,
    ComponentType.MemberCard,
    ComponentType.Countdown,
    ComponentType.FormEntry,
    ComponentType.AIEntry,
    ComponentType.Coupon,
  ].includes(type as ComponentType)
})

function handlePropsUpdate(partial: Record<string, any>) {
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentProps(pageStore.selectedComponent.id, partial)
}

function updateStyle(key: string, value: any) {
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentStyle(pageStore.selectedComponent.id, { [key]: value })
}

/**
 * 组件是否被隐藏：与BaseRenderer 的 `isHidden` 判定保持一致（visible === false）。
 * 这里用 `=== false` 而不是 `!visible`，避免 undefined（未设置）被误判成隐藏。
 */
const componentHidden = computed(() => pageStore.selectedComponent?.style?.visible === false)

/** 一键恢复显示：直接置 visible=true，与样式页签开关等价 */
function restoreComponentVisible() {
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentStyle(pageStore.selectedComponent.id, { visible: true })
}

/** B6：边距更新，锁定模式下四向同步为同一个值 */
function updateMargin(key: 'margin_top' | 'margin_bottom' | 'margin_left' | 'margin_right', value: number) {
  if (!pageStore.selectedComponent) return
  if (marginLinked.value) {
    pageStore.updateComponentStyle(pageStore.selectedComponent.id, {
      margin_top: value,
      margin_bottom: value,
      margin_left: value,
      margin_right: value,
    })
  } else {
    updateStyle(key, value)
  }
}

function updatePadding(key: 'padding_top' | 'padding_bottom' | 'padding_left' | 'padding_right', value: number) {
  if (!pageStore.selectedComponent) return
  if (paddingLinked.value) {
    pageStore.updateComponentStyle(pageStore.selectedComponent.id, {
      padding_top: value,
      padding_bottom: value,
      padding_left: value,
      padding_right: value,
    })
  } else {
    updateStyle(key, value)
  }
}

/* ================= 复合背景编辑器（v2） ================= */

const FALLBACK_SOLID = '#f6f8fb'

/** 归一化后的背景模型：旧数据（仅 background_color）自动映射为 solid */
const bgModel = computed(() => normalizePageBackground(pageStore.pageConfig))

const bgSolidColor = computed(() => bgModel.value.type === 'solid' ? (bgModel.value.color || FALLBACK_SOLID) : FALLBACK_SOLID)

/** 渐变参数：切到渐变模式但还没有数据时，给一组基于当前纯色的默认双色标 */
const bgGradient = computed<PageGradient>(() => {
  if (bgModel.value.type === 'gradient' && bgModel.value.gradient) {
    return JSON.parse(JSON.stringify(bgModel.value.gradient))
  }
  return {
    angle: 180,
    stops: [
      { color: bgSolidColor.value, offset: 0 },
      { color: '#FDF6EC', offset: 100 },
    ],
  }
})

const bottomOverlay = computed(() => normalizeBottomOverlay(pageStore.pageConfig))
const overlayColorMode = ref<'auto' | 'custom'>(
  bottomOverlay.value.color === 'auto' ? 'auto' : 'custom',
)

/** 保存背景：background 与 background_color 双写，旧端/旧预览不露白 */
function commitBackground(bg: PageBackground) {
  pageStore.updatePageConfig({
    background: bg,
    background_color: syncLegacyBackgroundColor(bg),
  })
}

function onBgTypeChange(type: 'solid' | 'gradient') {
  if (type === 'solid') {
    commitBackground({ type: 'solid', color: bgSolidColor.value })
  } else {
    commitBackground({ type: 'gradient', gradient: bgGradient.value })
  }
}

function onBgSolidChange(v: string | null) {
  commitBackground({ type: 'solid', color: v || FALLBACK_SOLID })
}

function onBgAngleChange(angle: number) {
  commitBackground({ type: 'gradient', gradient: { ...bgGradient.value, angle } })
}

function mutateStops(fn: (stops: PageGradient['stops']) => void) {
  const g: PageGradient = JSON.parse(JSON.stringify(bgGradient.value))
  fn(g.stops)
  g.stops.sort((a, b) => a.offset - b.offset)
  commitBackground({ type: 'gradient', gradient: g })
}

function onBgStopColorChange(index: number, v: string | null) {
  if (!v) return
  mutateStops((stops) => {
    if (stops[index]) stops[index].color = v
  })
}

function onBgStopOffsetChange(index: number, v: number) {
  mutateStops((stops) => {
    if (stops[index]) stops[index].offset = v
  })
}

function addBgStop() {
  mutateStops((stops) => {
    if (stops.length >= 5) return
    const last = stops[stops.length - 1]
    stops.push({ color: last ? last.color : '#ffffff', offset: 100 })
  })
}

function removeBgStop(index: number) {
  mutateStops((stops) => {
    if (stops.length <= 2) return
    stops.splice(index, 1)
  })
}

function applyBackgroundPreset(preset: { label: string; background: PageBackground }) {
  commitBackground(JSON.parse(JSON.stringify(preset.background)))
}

function updateBottomOverlay(partial: Partial<{ enabled: boolean; height: number; color: 'auto' | string }>) {
  const next = { ...bottomOverlay.value, ...partial }
  pageStore.updatePageConfig({
    bottomOverlay: {
      enabled: next.enabled,
      height: Math.min(160, Math.max(60, Number(next.height) || 96)),
      color: next.color || 'auto',
    },
  })
}

function onOverlayColorModeChange(mode: 'auto' | 'custom') {
  overlayColorMode.value = mode
  updateBottomOverlay({ color: mode === 'auto' ? 'auto' : bottomOverlay.value.resolvedColor })
}

/* ================= 暖调环境阴影（卡片类组件） ================= */

const SHADOW_PRESETS = {
  warm: { shadow_x: 0, shadow_y: 4, shadow_blur: 16, shadow_spread: 0, shadow_color: 'rgba(180, 83, 9, 0.06)' },
  standard: { shadow_x: 0, shadow_y: 2, shadow_blur: 12, shadow_spread: 0, shadow_color: 'rgba(0, 0, 0, 0.04)' },
  none: { shadow_x: 0, shadow_y: 0, shadow_blur: 0, shadow_spread: 0, shadow_color: 'rgba(0, 0, 0, 0)' },
} as const

const supportsShadow = computed(() => isListComponent.value)

const hasCustomShadow = computed(() => {
  const s = currentStyle.value
  return Boolean(
    s.shadow_color
    && s.shadow_color !== 'rgba(0, 0, 0, 0)'
    && (Number(s.shadow_y || 0) !== 0 || Number(s.shadow_blur || 0) !== 0 || Number(s.shadow_spread || 0) !== 0),
  )
})

const activeShadowPreset = computed<'warm' | 'standard' | 'none' | null>(() => {
  const s = currentStyle.value
  if (!hasCustomShadow.value) return 'none'
  for (const key of ['warm', 'standard'] as const) {
    const p = SHADOW_PRESETS[key]
    const match = ['shadow_x', 'shadow_y', 'shadow_blur', 'shadow_spread'].every(
      (k) => Number((s as any)[k] || 0) === Number((p as any)[k]),
    ) && s.shadow_color === p.shadow_color
    if (match) return key
  }
  return null
})

function applyShadowPreset(key: 'warm' | 'standard' | 'none') {
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentStyle(pageStore.selectedComponent.id, { ...SHADOW_PRESETS[key] })
}

async function onUploadShareImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await uploadImage(file, {
    maxSizeMB: 5,
    onSuccess: (url: string) => pageStore.updatePageConfig({ share_image: normalizeUploadUrl(url) }),
  })
}
</script>

<style scoped>
.props-panel {
  padding: 0 16px 18px;
  overflow-y: auto;
  height: 100%;
  background: #fff;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 -16px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid #e3e8f0;
}
/* 组件被隐藏时的提醒条：用告警色 + 一键恢复，避免用户在内容页签反复点开关却没反应 */
.hidden-reminder {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 10px 0 2px;
  padding: 9px 10px;
  background: var(--el-color-warning-light-9, #fdf6ec);
  border: 1px solid var(--el-color-warning-light-7, #f3d19e);
  border-radius: 8px;
}
.hidden-reminder__icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--el-color-warning, #e6a23c);
  font-size: 15px;
}
.hidden-reminder__body {
  flex: 1;
  min-width: 0;
}
.hidden-reminder__title {
  color: var(--el-color-warning-dark-2, #b88230);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
}
.hidden-reminder__desc {
  margin-top: 2px;
  color: #8a6d3b;
  font-size: 11px;
  line-height: 1.5;
}
.panel-kicker {
  display: block;
  margin-bottom: 2px;
  color: #9aa4b5;
  font-size: 11px;
}
.comp-type-label {
  font-size: 14px;
  font-weight: 700;
  color: #172033;
}
.panel-section {
  margin-bottom: 16px;
}
.panel-section--content {
  padding-top: 4px;
}
.section-title {
  font-size: 12px;
  font-weight: 700;
  color: #7b8798;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid var(--color-primary);
}

.style-section-body {
  padding-top: 4px;
}

.style-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.style-hint {
  width: 100%;
  margin-top: 4px;
  color: #9aa5b5;
  font-size: 11px;
  line-height: 1.4;
}

.props-tabs {
  :deep(.el-tabs__header) {
    margin: 0 -16px 14px;
    padding: 0 16px;
    background: #fbfcfe;
  }

  :deep(.el-tabs__item) {
    height: 42px;
    font-size: 13px;
  }
}

/* 分区模式：外层已是一级 tab，隐藏内层 tab 头避免两级嵌套。
   注意：必须扁平写法，嵌套进 {} 会编译成 .a [data-v] .b 后代选择器导致匹配失败 */
.props-tabs--single :deep(.el-tabs__header) {
  display: none;
}

.props-empty-hint {
  margin: 24px 4px;
  padding: 18px 16px;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #dbe2ec;
  border-radius: 10px;
}

.props-empty-hint__title {
  font-size: 13px;
  font-weight: 700;
  color: #172033;
}

.props-empty-hint__desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: #7b8798;
}

.data-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
  padding: 11px 12px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.data-status-card__main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.data-status-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  flex-shrink: 0;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 0 3px #dcfce7;
}

.data-status-card.is-warning .data-status-dot {
  background: #f59e0b;
  box-shadow: 0 0 0 3px #fef3c7;
}

.data-status-title {
  color: #172033;
  font-size: 12px;
  font-weight: 700;
}

.data-status-desc {
  margin-top: 2px;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.45;
}

/* 间距卡片：外边距 / 内边距 共用，2×2 等宽网格 */
.spacing-card {
  margin-bottom: 10px;
  padding: 10px 12px 8px;
  background: var(--bg-page, #f7f8fa);
  border: 1px solid var(--border, #e6e8eb);
  border-radius: 10px;
}

.spacing-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.spacing-card__title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--text-primary, #303133);
  font-size: 12px;
  font-weight: 600;
}

.spacing-card__title em {
  color: var(--text-muted, #9aa4b5);
  font-size: 11px;
  font-style: normal;
  font-weight: 400;
}

.spacing-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 10px;
}

.spacing-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--text-muted, #9aa4b5);
  font-size: 12px;

  > span {
    flex: 0 0 16px;
    text-align: center;
  }

  :deep(.el-input-number) {
    flex: 1;
    min-width: 0;
  }
}

.style-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 10px;
  color: var(--text-muted, #9aa4b5);
  font-size: 11px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border, #e6e8eb);
  }
}

/* 数字框宽度、label 字号、行距已由 styles/props-panel-typography.scss 的
   .props-panel 基线统一接管，这里不再重复定义，避免两处口径打架。 */
.style-form {
  /* 最后一个表单项不要多撑一段空白 */
  :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }
}

.shell-note {
  margin: 0 0 10px;
  padding: 8px 10px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.5;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.margin-lock-btn {
  width: 22px;
  height: 22px;
}

.share-image-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.share-image-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-image-preview img {
  width: 72px;
  height: 48px;
  object-fit: cover;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  background: #eef2f7;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  cursor: pointer;
}

.ds-binding-card {
  margin: 0 12px 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.ds-binding-card__title {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.ds-binding-hint {
  margin-left: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.ds-binding-alert {
  margin-top: 8px;
}

/* ================= 复合背景编辑器 ================= */
.bg-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}
.bg-editor__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bg-editor__label {
  flex-shrink: 0;
  color: #7b8798;
  font-size: 12px;
}
.bg-editor__angle {
  flex-shrink: 0;
  min-width: 38px;
  color: #475569;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.bg-editor__hint {
  color: #9aa5b5;
  font-size: 11px;
}
.bg-editor__presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding-top: 2px;
}
.bg-preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px 5px;
  font-family: inherit;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.bg-preset:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(23, 105, 255, 0.12);
}
.bg-preset__swatch {
  width: 100%;
  height: 22px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 5px;
}
.bg-preset__label {
  color: #475569;
  font-size: 10.5px;
  line-height: 1.2;
}

/* ================= 暖调环境阴影 ================= */
.shadow-preset-row {
  display: flex;
  gap: 6px;
}
.shadow-preset {
  padding: 4px 10px;
  font-family: inherit;
  font-size: 12px;
  color: #475569;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.12s ease;
}
.shadow-preset:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.shadow-preset.is-active {
  color: #fff;
  font-weight: 600;
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.shadow-custom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  width: 100%;
}
.shadow-custom-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7b8798;
  font-size: 12px;

  :deep(.el-input-number) {
    flex: 1;
  }
}
.shadow-custom-item--color {
  grid-column: 1 / -1;
}
</style>
