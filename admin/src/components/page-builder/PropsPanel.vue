<template>
  <div class="props-panel">
    <!-- 页面属性：独立「页面」tab 常驻可见；兼容旧用法（未选中组件时回退展示） -->
    <template v-if="section === 'page' || (!section && !pageStore.selectedComponent)">
      <div class="page-props">
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
            <div class="path-row">
              <PagePathField
                :model-value="currentPath"
                :page-type="currentPageType"
                @update:model-value="onPathInput"
              />
              <el-tooltip :content="copiedPath ? '已复制' : '复制完整路径'" placement="top">
                <button
                  type="button"
                  class="panel-icon-btn"
                  :class="{ 'is-done': copiedPath }"
                  :aria-label="copiedPath ? '路径已复制' : '复制路径'"
                  @click="onCopyPath"
                >
                  <el-icon><component :is="copiedPath ? 'Select' : 'CopyDocument'" /></el-icon>
                </button>
              </el-tooltip>
            </div>
            <p v-if="pathInputInvalid" class="path-row__err">
              路径含非法字符{{ pathInputInvalid }}，已自动过滤
            </p>
          </el-form-item>
        </el-form>
      </div>

      <!-- ==================== 顶部导航栏 ==================== -->
      <StyleFoldGroup v-model:open="navOpen" title="顶部导航栏" :summary="navSummary">
        <NavBarSettings
          :model="navConfig"
          :page-name="pageStore.pageConfig.name"
          @patch="patchNav"
        />
      </StyleFoldGroup>

      <!-- ==================== 页面背景 ==================== -->
      <StyleFoldGroup v-model:open="bgOpen" title="页面背景" :summary="bgSummary">
        <BackgroundSettings :model="bgModelRaw" @patch="commitBackground" />
      </StyleFoldGroup>

      <!-- ==================== 分享与营销 ==================== -->
      <StyleFoldGroup v-model:open="shareOpen" title="分享与营销" :summary="shareSummary">
        <ShareSettings
          :model="shareCfg"
          :page-name="pageStore.pageConfig.name"
          :source-name="shareSourceName"
          :square-image="pageStore.pageConfig.share_square_image || ''"
          :capture-canvas="captureCanvasShot"
          @patch="patchShare"
          @update:square-image="(v: string) => pageStore.updatePageConfig({ share_square_image: v })"
        />
      </StyleFoldGroup>

      <!-- ==================== 全局配置 ==================== -->
      <StyleFoldGroup v-model:open="globalOpen" title="全局滚动" :summary="globalSummary">
        <div class="switch-row">
          <span class="switch-row__lab">下拉刷新</span>
          <el-switch
            :model-value="pageStore.globalConfig.pull_refresh"
            @change="(v: boolean) => pageStore.updateGlobalConfig({ pull_refresh: v })"
          />
        </div>
        <div class="switch-row">
          <span class="switch-row__lab">触底加载</span>
          <el-switch
            :model-value="pageStore.globalConfig.reach_bottom_load"
            @change="(v: boolean) => pageStore.updateGlobalConfig({ reach_bottom_load: v })"
          />
        </div>

        <div class="switch-row">
          <span class="switch-row__lab">
            底部渐隐
            <el-tooltip text="页面底部渐变融合遮罩：让卡片下边缘平滑弱化融入背景，不阻断点击与滚动。" placement="top" :show-after="200">
              <span class="fld__q" role="button" tabindex="0">?</span>
            </el-tooltip>
          </span>
          <el-switch
            :model-value="bottomOverlay.enabled"
            @change="(v: boolean) => updateBottomOverlay({ enabled: v })"
          />
        </div>

        <!--
          🔴 联动折叠：关闭「底部渐隐」后遮罩高度/融合色无意义。
          用 v-show + CSS 过渡而不是 v-if —— 保留内部组件实例，
          重新打开时滑块/取色器还在原位，不会闪一下。
        -->
        <div class="fold-collapse" :class="{ 'is-closed': !bottomOverlay.enabled }">
          <div class="fold-collapse__inner">
            <CompactSliderRow
              label="遮罩高度"
              hint="渐变过渡区的高度。越大，底部内容弱化得越彻底。"
              :model-value="bottomOverlay.height"
              :min="OVERLAY_MIN"
              :max="OVERLAY_MAX"
              :step="2"
              @update:model-value="(v: number) => updateBottomOverlay({ height: v })"
            />
            <div class="fld">
              <span class="fld__lab">融合色</span>
              <div class="overlay-color-row">
                <el-radio-group
                  :model-value="overlayColorMode"
                  size="small"
                  @update:model-value="(v: 'auto' | 'custom') => onOverlayColorModeChange(v)"
                >
                  <el-radio-button value="auto">自动取底色</el-radio-button>
                  <el-radio-button value="custom">自定义</el-radio-button>
                </el-radio-group>
                <ColorInputRow
                  v-if="overlayColorMode === 'custom'"
                  :model-value="bottomOverlay.color === 'auto' ? '' : bottomOverlay.color"
                  aria-label="遮罩融合色"
                  @update:model-value="(v: string | null) => updateBottomOverlay({ color: v || 'auto' })"
                />
              </div>
              <p v-if="overlayColorMode === 'auto'" class="fld__tip">
                渐变背景取终点色标，纯色背景取该颜色
              </p>
            </div>
          </div>
        </div>
      </StyleFoldGroup>

      <!-- ==================== 高级设置 ==================== -->
      <StyleFoldGroup v-model:open="advOpen" title="高级设置" :summary="advSummary">
        <AdvancedSettings :model="advCfg" @patch="patchAdv" />
      </StyleFoldGroup>
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
        <div class="panel-header__lead">
          <span class="comp-type-icon" aria-hidden="true">
            <el-icon :size="16"><component :is="compIconComp" /></el-icon>
          </span>
          <div class="panel-header__titles">
            <span class="panel-kicker">当前组件</span>
            <!-- 组件类型名 + 可编辑别名：类型名是固定主标题，别名可留空（回落类型名） -->
            <div class="comp-title-row">
              <span class="comp-type-name">{{ ComponentTypeLabels[pageStore.selectedComponent.type] }}</span>
              <el-input
                :model-value="compRemark"
                class="comp-remark"
                placeholder="加别名"
                maxlength="15"
                @update:model-value="onRemarkInput"
                @blur="onRemarkBlur"
              />
            </div>
          </div>
        </div>

        <div class="panel-header__actions">
          <el-tooltip content="恢复该组件的默认配置" placement="bottom">
            <button
              type="button"
              class="panel-icon-btn"
              aria-label="重置默认"
              @click="onResetDefault"
            >
              <el-icon><RefreshLeft /></el-icon>
            </button>
          </el-tooltip>

          <el-tooltip content="复制一份（Ctrl+D）" placement="bottom">
            <button
              type="button"
              class="panel-icon-btn"
              aria-label="复制组件"
              @click="onDuplicate"
            >
              <el-icon><CopyDocument /></el-icon>
            </button>
          </el-tooltip>

          <el-popconfirm
            title="删除这个组件？"
            description="删除后可用顶部「撤销」恢复。"
            placement="bottom-end"
            :width="200"
            confirm-button-text="删除"
            cancel-button-text="取消"
            confirm-button-type="danger"
            @confirm="onRemove"
          >
            <template #reference>
              <button type="button" class="panel-icon-btn panel-icon-btn--danger" aria-label="删除组件">
                <el-icon><Delete /></el-icon>
              </button>
            </template>
          </el-popconfirm>
        </div>
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
          <!--
            🔴 数据源绑定卡（2026-10-06 移除）
            原来这里把 `* type content` / `* query 已配置 2 项` 直接渲染给运营看 ——
            既不可点（纯展示），又把底层 JSON 字段名暴露到界面上，
            在 B 端后台里是典型的「开发自研调试期」痕迹。
            正常状态由上方 dataStatus 卡片承担（绿点 + 「已连接已发布文章库」+ 管理数据）。
            ⚠️ 但**问题告警必须保留** —— 配置错了却没提示，运营会以为功能坏了。
            所以只保留 issues，不再展示 type / query 字面量。
          -->
          <el-alert
            v-for="issue in (dataSourceBinding?.issues || [])"
            :key="issue"
            :title="issue"
            type="warning"
            :closable="false"
            show-icon
            class="ds-binding-alert"
          />
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
          <!-- 组件自有的样式子面板（如星球动态流的标签栏/卡片外观）。
               放在通用间距与外观之前：这些是「这个组件长什么样」的高频决策，
               通用间距是低频微调，顺序反过来会让每次都要滚到底才看得到组件专属项。 -->
          <component
            :is="stylePanelMap[pageStore.selectedComponent.type]"
            v-if="stylePanelMap[pageStore.selectedComponent.type]"
            :props="pageStore.selectedComponent.props"
            @update="handlePropsUpdate"
          />
          <StyleFoldGroup
            v-model:open="spacingOpen"
            title="容器与可见性"
            :summary="spacingSummary"
          >
            <template #badge><FieldHint text="边距决定组件在手机上的位置，画布里的虚线框只是编辑指示，真机不显示。" /></template>

            <!-- 品牌顶栏始终铺满屏幕宽度并替代系统导航栏，margin 对它无意义 -->
            <div v-if="hideMarginEditor" class="shell-note--flat">
              品牌顶栏始终铺满屏幕宽度并替代系统导航栏，无需设置边距。
            </div>
            <CompactSpacingBox
              v-else
              label="组件边距 (Margin)"
              hint="组件与屏幕边缘的距离；上下可填负数与相邻组件重叠（重叠时本组件置顶）。"
              :model-value="currentStyle"
              :allow-negative="allowsNegativeMargin"
              :linked="marginLinked"
              @update:linked="marginLinked = $event"
              @update:model-value="onMarginPatch"
            />

            <CompactSpacingBox
              label="内边距 (Padding)"
              hint="内容与组件边框的距离，作用于组件内部的内容区/卡片。"
              :model-value="currentStyle"
              :linked="paddingLinked"
              @update:linked="paddingLinked = $event"
              @update:model-value="onPaddingPatch"
            />

            <!-- 🔴 2026-10-06 UI 降噪：原来开关下方常驻两行长文本，占掉一整块版面。
                 按需求收拢成 Label 旁的 Hover 气泡 —— 信息没丢，但不占常态空间。
                 ⚠️ 用 el-tooltip 而不是 title：原生 title 有延迟、样式不可控。 -->
            <div class="flat-row">
              <span class="flat-row__lab">
                <el-tooltip
                  content="关闭后移动端不渲染该组件；画布中保留并标「已隐藏」，便于继续编辑。"
                  placement="top"
                >
                  <span class="flat-row__lab-tip">
                    组件可见
                    <i class="flat-row__lab-q">?</i>
                  </span>
                </el-tooltip>
              </span>
              <el-switch
                :model-value="currentStyle.visible !== false"
                @change="(v: boolean) => updateStyle('visible', v)"
              />
            </div>
          </StyleFoldGroup>

          <StyleFoldGroup
            v-model:open="appearanceOpen"
            title="卡片与列表"
            :summary="appearanceSummary"
          >
            <!--
              卡片间距只对列表型组件有意义（grid 布局里由列间距承担）。
              🔴 命名统一为「卡片间距 (Item Gap)」，与上面的「组件边距 (Margin)」区分开 ——
              原来看板叫「外边距 / 卡片间距」，两个都像间距，运营分不清作用对象。
            -->
            <CompactSliderRow
              v-if="isListComponent"
              label="卡片间距"
              hint="相邻卡片之间的空隙，决定列表的疏密节奏。"
              :model-value="Number(currentProps.item_gap ?? 8)"
              :min="0"
              :max="48"
              :step="1"
              @update:model-value="(v: number) => handlePropsUpdate({ item_gap: v })"
            />

            <!--
              圆角只保留组件专属面板（stylePanelMap）里的那一处。
              原先「外观」里还有一个 border_radius，与卡片圆角重复 ——
              同一属性在两处可改，运营改了一处另一处不动，就会以为「配了没生效」。
              🔴 判据：卡片类组件的圆角归 cardStyle.radius 管（画布与真机都读它），
              这里不再重复提供 border_radius。非卡片组件若确实需要外框圆角，
              由 stylePanelMap 里对应组件的专属面板显式提供。
            -->

            <template v-if="supportsShadow">
              <div class="flat-row flat-row--wrap">
                <span class="flat-row__lab">
                  阴影预设
                  <el-tooltip content="卡片类组件的投影预设。「自定义」会展开 X/Y/模糊/扩散与颜色四项。" placement="top" :show-after="200">
                    <span class="csb__q" role="button" tabindex="0">?</span>
                  </el-tooltip>
                </span>
                <div class="shadow-preset-row">
                  <button
                    type="button"
                    class="shadow-preset"
                    :class="{ 'is-active': activeShadowPreset === 'none' }"
                    @click="applyShadowPreset('none')"
                  >无阴影</button>
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
                    :class="{ 'is-active': activeShadowPreset === 'custom' }"
                    @click="toggleCustomShadow"
                  >自定义</button>
                </div>
              </div>

              <!--
                自定义阴影：手风琴展开。
                🔴 用 v-show + max-height 而非 v-if —— 保留内部 4 个数字框与取色器实例，
                反复展开收起不会闪一下重建，也保住已输入未提交的值。
              -->
              <div class="fold-collapse" :class="{ 'is-closed': !customShadowOpen }">
                <div class="fold-collapse__inner">
              <div class="flat-row flat-row--wrap">
                <span class="flat-row__lab">
                  自定义阴影
                  <el-tooltip content="偏移 / 模糊 / 扩散单位 px，颜色支持 Alpha 透明度；改完后上方预设的高亮会自动跟随。" placement="top" :show-after="200">
                    <span class="csb__q" role="button" tabindex="0">?</span>
                  </el-tooltip>
                </span>
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
              </div>
                </div>
              </div>
            </template>

            <!-- 文字颜色 -->
            <div class="flat-row">
              <span class="flat-row__lab">文字颜色</span>
              <ColorInputRow
                :model-value="currentStyle.text_color || ''"
                :default-value="defaultTextColor"
                aria-label="文字颜色"
                @update:model-value="(v: string | null) => updateStyle('text_color', v || undefined)"
              />
            </div>

            <CompactSliderRow
              v-if="!hasSplitTextSize"
              label="文字大小"
              hint="0 表示使用组件默认字号。"
              :model-value="currentStyle.font_size || 0"
              :min="0"
              :max="48"
              :step="1"
              @update:model-value="(v: number) => updateStyle('font_size', v > 0 ? v : undefined)"
            />
          </StyleFoldGroup>

          <StyleFoldGroup v-model:open="colorOpen" title="配色" :summary="colorSummary">
            <div class="flat-row">
              <span class="flat-row__lab">
                背景色
                <el-tooltip content="组件内容区/卡片的底色；留空即透明，透出下方内容。" placement="top" :show-after="200">
                  <span class="csb__q" role="button" tabindex="0">?</span>
                </el-tooltip>
              </span>
              <ColorInputRow
                :model-value="currentStyle.background_color || ''"
                aria-label="背景色"
                @update:model-value="(v: string | null) => updateStyle('background_color', v || undefined)"
              />
            </div>
          </StyleFoldGroup>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { Lock, Unlock, WarningFilled, CopyDocument, Delete, RefreshLeft } from '@element-plus/icons-vue'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
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
import ColorInputRow from '@/components/ColorInputRow.vue'
import CompactSliderRow from './CompactSliderRow.vue'
import CompactSpacingBox from './CompactSpacingBox.vue'
import GridSegmented from './GridSegmented.vue'
import StyleFoldGroup from './StyleFoldGroup.vue'
import NavBarSettings from './page/NavBarSettings.vue'
import BackgroundSettings from './page/BackgroundSettings.vue'
import ShareSettings from './page/ShareSettings.vue'
import AdvancedSettings from './page/AdvancedSettings.vue'
import {
  OFFLINE_PRESETS,
  OVERLAY_HEIGHT_MAX as OVERLAY_MAX,
  OVERLAY_HEIGHT_MIN as OVERLAY_MIN,
  PAGE_BG_IMAGE_MODES,
  PAGE_NAV_MODES,
  PAGE_ACCESS_MODES,
  PAGE_PATH_PATTERN,
  SHARE_IMAGE_RATIO,
  pageBgImageCss,
  sanitizePagePath,
  normalizePageBgImage,
  normalizePageAdvanced,
  normalizePageNav,
  normalizePageShare,
  normalizePageSchedule,
} from './page/pageConfigSchema'
import PagePathField from './PagePathField.vue'
import FieldHint from './FieldHint.vue'
import { getComponentDef } from './componentRegistry'
import { WARM_KIT_METAS, WARM_KIT_META_MAP } from './warmKitRegistry'

const pageStore = usePageStore()
const router = useRouter()
const { uploadImage, uploading: uploadingAsset } = useImageUpload()
// 分享封面与背景图共用同一个上传器，状态就是同一个 → 用同一变量，
// 两个字段名会让运营以为可以各自独立上传（其实会同时转圈）
const uploadingShare = uploadingAsset
const uploadingBg = uploadingAsset

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

/* ============ 组件级操作（标题栏） ============ */

/** Element Plus 图标名 → 组件（与 ComponentPanel 的 iconMap 同一套） */
const compIconComp = computed<any>(() => {
  const def = pageStore.selectedComponent
    ? getComponentDef(pageStore.selectedComponent.type)
    : undefined
  const icons = ElementPlusIcons as unknown as Record<string, any>
  return (def && icons[def.icon]) || icons.Document
})

/**
 * 组件备注名（面板上显示为「别名」）。
 * ⚠️ 存在 `props.__remark` 而不是顶层字段：__remark 是运营内部辨识用的
 * 标注，不参与渲染、不进小程序 DSL 语义；放props 里可随组件复制/撤销一起回滚。
 * 读时回落 type 的中文标签，切组件时不会显示成空白。
 */
const compRemark = computed(() => {
  const r = pageStore.selectedComponent?.props?.__remark
  return typeof r === 'string' ? r : ''
})

function onRemarkInput(v: string) {
  const id = pageStore.selectedComponentId
  if (!id) return
  const trimmed = v.slice(0, 15)
  if (!trimmed.trim()) {
    // 清空别名 = 删掉这个键，避免 DSL 里留空字符串噪声
    const cur = pageStore.selectedComponent?.props || {}
    if ('__remark' in cur) {
      const next = { ...cur }
      delete next.__remark
      pageStore.updateComponentProps(id, next as Record<string, any>)
    }
    return
  }
  pageStore.updateComponentProps(id, { __remark: trimmed })
}

function onRemarkBlur() {
  // 失焦时把纯空白回落掉，防止面板上显示「有别名」但 DSL 是空值
  if (compRemark.value && !compRemark.value.trim()) onRemarkInput('')
}

/**
 * 重置默认：props 与 style 一起回到 componentRegistry 的工厂值。
 * 保留 `__remark`（别名是运营自己起的标注，不属于配置，重置不该抹掉）。
 */
async function onResetDefault() {
  const comp = pageStore.selectedComponent
  if (!comp) return
  const def = getComponentDef(comp.type)
  if (!def) return
  const label = ComponentTypeLabels[comp.type] || '组件'
  try {
    await ElMessageBox.confirm(
      `把「${label}」的内容与样式恢复为出厂默认？当前配置会被覆盖，可用顶部「撤销」恢复。`,
      '重置默认',
      { type: 'warning', confirmButtonText: '重置', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const keepRemark = pageStore.selectedComponent?.props?.__remark
  pageStore.updateComponentProps(comp.id, {
    ...def.defaultProps(),
    ...(keepRemark ? { __remark: keepRemark } : {}),
  } as Record<string, any>)
  pageStore.updateComponentStyle(comp.id, def.defaultStyle())
  ElMessage.success(`已恢复「${label}」的默认配置`)
}

function onDuplicate() {
  const id = pageStore.selectedComponentId
  if (!id) return
  pageStore.duplicateComponent(id)
  ElMessage.success('已复制一份，可拖到目标位置')
}

function onRemove() {
  const id = pageStore.selectedComponentId
  if (!id) return
  pageStore.removeComponent(id)
  ElMessage.success('已删除，可用顶部「撤销」恢复')
}

function onPathInput(v: string) {
  // 🔴 先按「仅小写英文/数字/-//」过滤，再交给 normalizeBuilderPath 规范化。
  // 顺序不能反：normalizeBuilderPath 不做字符白名单，大写与空格会直接落库，
  // 真机上 switchTab/navigateTo 报「路径不存在」或跳错页。
  const path = normalizeBuilderPath(sanitizePagePath(v))
  pageStore.updatePageConfig({ path })
  if (pageStore.currentPage) {
    pageStore.currentPage.path = path
  }
}

const activeTab = ref<'content' | 'style'>('content')
/**
 * 间距框默认「四向统一」（2026-10-06 二次增强后语义反过来了）：
 * 绝大多数页面四向同值，让运营点四个框填同一个数是纯浪费。
 * ⚠️ 这只影响**面板默认展示形态**，不改动任何已落库的数据 ——
 * 展开四向时读的还是真实的 margin_* 四字段。
 */
const marginLinked = ref(true)
const paddingLinked = ref(true)
const shareImageUrl = computed(() => normalizeUploadUrl(String(pageStore.pageConfig.share_image || '')))

// 分区模式下内层 tab 跟随外层一级 tab 固定
watch(
  () => section,
  (s) => {
    if (s === 'content' || s === 'style') activeTab.value = s
  },
  { immediate: true },
)

/**
 * 数据源绑定调试卡（`type` / `query` 两个 Tag）。
 *
 * 🔴 对「数据源已由面板业务化配置」的组件不显示：
 *   优惠券的内容面板已提供 `data_mode`（自动/手动）+ 筛选 + 排序 + 手选券，
 *   面板下方再摆一张 `* type coupon / * query 已配置 1 项` 的技术卡，
 *   等于把同一个信息用两种口径各说一遍 —— 运营看不懂 `type/query`，
 *   只会以为「必填」是还有一项没配。故按组件白名单屏蔽。
 */
const dataSourceBinding = computed(() => {
  const comp = pageStore.selectedComponent
  if (!comp) return null
  // 业务化数据源面板已覆盖的组件：不显示技术调试卡
  if (HIDE_DS_BINDING_TYPES.has(comp.type)) return null
  return getDataSourceBinding(comp)
})

/**
 * 这些组件的数据源已由各自面板业务化配置，不需要技术调试卡。
 *
 * 商品列表：面板已提供「已过滤并匹配 N 件商品」胶囊。
 * 优惠券：内容面板已有 data_mode（自动/手动）+ 筛选 + 排序 + 手选券。
 * 限时秒杀：内容面板已有来源模式（自动关联活动/手动自选）。
 * 🔴 文章列表（2026-10-06 新增）：内容面板已把数据源收进【内容筛选规则】
 *   （分类/类型/排序/数量），顶部再摆一张 `* type content / * query 已配置 N 项`
 *   等于把同一件事用研发口径再说一遍，且「必填」二字会让运营去找那个不存在的输入框。
 *   文章列表的数据源由组件内部默认绑定内容库（见 componentRegistry defaultProps），
 *   运营不需要、也不应该知道 data_source 的存在。
 *   ⚠️ 只隐藏 UI 卡片，**不删 data_source 字段** —— 端上 fillDataSource 与
 *   preview-datasource 的取数链路仍读它，删了会取不到数。
 */
const HIDE_DS_BINDING_TYPES = new Set<string>([
  ComponentType.Coupon,
  ComponentType.ProductList,
  ComponentType.FlashSale,
  ComponentType.ArticleList,
])

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
  if (component.type === ComponentType.ArticleList) {
    // 🔴 文章列表不给 routeName（2026-10-06）：不渲染「管理数据」按钮。
    //   原来这个按钮 router.push 同页跳转 /content/articles，会把运营从装修器里
    //   顶走、丢失未保存的编辑态。改为内容面板【内容筛选规则】标题右侧的
    //   「去发布文章 ↗」外链，新标签页打开，互不干扰。
    return {
      title: '读取已发布文章',
      description: '改分类后画布会跟着变，不必先点预览',
      tone: 'success',
      routeName: '',
    }
  }
  if (component.type === ComponentType.HotNews) {
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
    // 🔴 状态栏跟着「数据模式」走，而不是笼统说「自动读取」——
    // 手动自选模式下再说「自动读取已发布优惠券」是**事实性错误**，
    // 运营会以为筛选项在生效、实际展示的是自己挑的固定几张。
    const mode = component.props?.data_mode
    const manualCount = Array.isArray(component.props?.manual_items) ? component.props.manual_items.length : 0
    if (mode === 'manual') {
      return {
        title: manualCount ? `手动自选 · 已选 ${manualCount} 张` : '手动自选 · 尚未选券',
        description: manualCount
          ? '展示面板里挑好的这几张，券库状态变化不影响本组件'
          : '还没选券，真机不会渲染任何券卡；点下面「+ 选择优惠券」',
        tone: manualCount ? 'success' : 'warning',
        routeName: 'MarketingCoupon',
      }
    }
    return {
      title: '自动读取已发布优惠券',
      description: '按下方筛选与排序从券库取，不必先点预览',
      tone: 'success',
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

/**
 * 2026-10-05 新增 22 个组件：统一走 SchemaForm。
 * 每个组件的 formSchema 在各自 schema.ts 里声明，此处只做 type→表单 的接线。
 */
if (!WARM_KIT_META_MAP.size) {
  console.warn('[page-builder] warmKitRegistry 为空，22 个新组件将无属性面板')
}

for (const meta of WARM_KIT_METAS) {
  propsPanelMap[meta.type] = defineAsyncComponent(async () => {
    const { default: Form } = await import('./shared/SchemaForm.vue')
    return {
      name: `WarmKitProps_${meta.type}`,
      components: { SchemaForm: Form },
      props: ['props', 'sections'],
      emits: ['update'],
      template: `<SchemaForm :props="props" :sections="sections" @update="(p) => $emit('update', p)" />`,
    }
  })
}

/**
 * 组件自有的「样式」子面板：只在样式页签渲染，插在通用间距/外观之前。
 * 内容页签的专属项走 propsPanelMap，两者分开登记，避免把样式塞进内容页签。
 */
const stylePanelMap: Record<string, any> = {
  [ComponentType.PlanetFeed]: defineAsyncComponent(() => import('./props/PlanetFeedStyleProps.vue')),
  // 🔴 笔记瀑布流（2026-10-06 补注册）：此前**没注册**，走的是通用样式面板，
  // 于是「两层导航底色 / 首层分割线 / 分类标题胶囊」全无处可调 ——
  // 字段写进了 Schema 但界面没入口，等于配不了。
  // 这类「纯视觉规则」与星球流/文章列表同理，应放样式页签而非内容页签。
  [ComponentType.NoteFeed]: defineAsyncComponent(() => import('./props/NoteFeedStyleProps.vue')),
  // 文章列表：字号/条目间距属纯视觉规则，留在内容页签会让运营为找一个字号滚过 6 个业务区块
  [ComponentType.ArticleList]: defineAsyncComponent(() => import('./props/ArticleListStyleProps.vue')),
  // 品牌专栏：布局方式 / 信息显隐 / 卡片圆角与间距同理，挪到样式页签
  [ComponentType.WarmColumns]: defineAsyncComponent(() => import('./props/ColumnStyleProps.vue')),
  // 星球顶栏：背景风格 / 毛玻璃 / 圆角 / 内边距 / KPI 卡样式属纯视觉规则
  [ComponentType.PlanetHero]: defineAsyncComponent(() => import('./props/PlanetHeroStyleProps.vue')),
  // 搜索组件：框体风格 / 内容对齐 / 颜色系统 / 吸顶常驻四组收在这里。
  // 放样式页签而不是内容页签 —— 它们是纯视觉规则，运营调色时不该先滚过提示词列表。
  [ComponentType.Search]: defineAsyncComponent(() => import('./props/SearchStyleProps.vue')),
  // 分类导航：图标形状 / 文字与副标题配色 / 模块背景三组视觉规则，
  // 与内容面板（分类项、图标、跳转、角标）权责分开。
  [ComponentType.CategoryNav]: defineAsyncComponent(() => import('./props/CategoryNavStyleProps.vue')),
  // 优惠券：排列布局 / 票券风格 / 字号色彩 / 间距四组视觉规则。
  // 需求明确要求把「标题字号 / 内容字号 / 样式（横向纵向）」从内容面板迁到这里。
  [ComponentType.Coupon]: defineAsyncComponent(() => import('./props/CouponStyleProps.vue')),
  // 限时秒杀：陈列布局三档 / 秒杀主题色 / 卡片背景形态 / 字号 / 外边距与圆角。
  // 需求明确要求把「标题字号 / 元信息字号」从内容面板迁到这里。
  [ComponentType.FlashSale]: defineAsyncComponent(() => import('./props/FlashSaleStyleProps.vue')),
  // 商品列表：布局模式（含列数联动约束）/ 度量参数 / 字号 / 价格色 / 卡片风格。
  // 需求明确要求把这些从「内容」Tab 迁到这里。
  [ComponentType.ProductList]: defineAsyncComponent(() => import('./props/ProductListStyleProps.vue')),
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

/* ---------------- 样式 Tab 降噪（2026-10-06） ---------------- */

/**
 * 三个折叠分组的展开态。
 * 容器与可见性默认展开（首次进来最常调的是边距），
 * 「卡片与列表」「配色」默认收起，避免一进来就是一屏框套框。
 */
const spacingOpen = ref(true)
const appearanceOpen = ref(false)
const colorOpen = ref(false)

/**
 * 折叠态摘要：全部收起时也能一眼扫完全部配置，不用逐组展开。
 * 格式统一为「标签 值」用 · 连接，与面板其它地方的摘要风格一致。
 */
const spacingSummary = computed(() => {
  if (hideMarginEditor.value) return '品牌顶栏铺满'
  const s = currentStyle.value
  const m = [s.margin_top, s.margin_bottom, s.margin_left, s.margin_right]
  const p = [s.padding_top, s.padding_bottom, s.padding_left, s.padding_right]
  const parts: string[] = []
  parts.push(m.some((v) => Number(v)) ? `边距 ${m.map((v) => Number(v) || 0).join('/')}` : '边距 0')
  parts.push(p.some((v) => Number(v)) ? `内边距 ${p.map((v) => Number(v) || 0).join('/')}` : '内边距 0')
  if (currentStyle.value.visible === false) parts.push('已隐藏')
  return parts.join(' · ')
})

const appearanceSummary = computed(() => {
  const parts: string[] = []
  if (isListComponent.value) parts.push(`卡片间距 ${Number(currentProps.value.item_gap ?? 8)}`)
  if (supportsShadow.value) parts.push('阴影')
  const fs = Number(currentStyle.value.font_size) || 0
  if (fs > 0) parts.push(`文字 ${fs}px`)
  if (currentStyle.value.text_color) parts.push('文字色')
  return parts.join(' · ')
})

const colorSummary = computed(() =>
  currentStyle.value.background_color ? '已设背景色' : '透明',
)

/** 文字色的恢复默认目标：与组件自身默认一致时不该显示「恢复默认」 */
const defaultTextColor = computed(() => '')

/**
 * 四联间距框的 patch 入口。
 * ⚠️ 一次只带要改的那几个键 —— `updateComponentStyle` 是浅合并，
 * 整包回写会把没显示在界面上的字段（如负 margin 的容差）覆盖掉。
 */
function onMarginPatch(patch: Record<string, number>) {
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentStyle(pageStore.selectedComponent.id, {
    margin_top: patch.top,
    margin_right: patch.right,
    margin_bottom: patch.bottom,
    margin_left: patch.left,
  })
}

function onPaddingPatch(patch: Record<string, number>) {
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentStyle(pageStore.selectedComponent.id, {
    padding_top: patch.top,
    padding_right: patch.right,
    padding_bottom: patch.bottom,
    padding_left: patch.left,
  })
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

/*
 * 旧的 updateMargin / updatePadding 已被 CompactSpacingBox 的
 * onMarginPatch / onPaddingPatch 取代（新组件自己处理等比联动，
 * 锁定基准是「最后编辑的那个方向」而非固定 top）。这里保留引用会
 * 让 vue-tsc 报未使用，且误导后人以为有两套联动逻辑。
 */

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

/** 自定义阴影手风琴的展开态（2026-10-06 二次增强：预设区新增「自定义」档） */
const customShadowOpen = ref(false)

const hasCustomShadow = computed(() => {
  const s = currentStyle.value
  return Boolean(
    s.shadow_color
    && s.shadow_color !== 'rgba(0, 0, 0, 0)'
    && (Number(s.shadow_y || 0) !== 0 || Number(s.shadow_blur || 0) !== 0 || Number(s.shadow_spread || 0) !== 0),
  )
})

const activeShadowPreset = computed<'warm' | 'standard' | 'none' | 'custom' | null>(() => {
  const s = currentStyle.value
  if (!hasCustomShadow.value) return 'none'
  for (const key of ['warm', 'standard'] as const) {
    const p = SHADOW_PRESETS[key]
    const match = ['shadow_x', 'shadow_y', 'shadow_blur', 'shadow_spread'].every(
      (k) => Number((s as any)[k] || 0) === Number((p as any)[k]),
    ) && s.shadow_color === p.shadow_color
    if (match) return key
  }
  // 有影子但不匹配任何预设 = 自定义（与手风琴展开态无关，
  // 用户可能展开后没改值 —— 那仍算自定义，因为值确实来自手风琴之外）
  return 'custom'
})

function applyShadowPreset(key: 'warm' | 'standard' | 'none') {
  if (!pageStore.selectedComponent) return
  // 选预设时收起自定义手风琴 —— 预设已经把四值全写好了，
  // 还摊着 4 个输入框只会让人以为「预设没生效」
  customShadowOpen.value = false
  pageStore.updateComponentStyle(pageStore.selectedComponent.id, { ...SHADOW_PRESETS[key] })
}

/** 点「自定义」：展开手风琴，并给一组可见的初值（全是 0 等于没有影子） */
function toggleCustomShadow() {
  customShadowOpen.value = !customShadowOpen.value
  if (!customShadowOpen.value) return
  if (hasCustomShadow.value) return
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentStyle(pageStore.selectedComponent.id, {
    shadow_x: 0,
    shadow_y: 2,
    shadow_blur: 12,
    shadow_spread: 0,
    shadow_color: 'rgba(0, 0, 0, 0.04)',
  })
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

/* ================= 页面属性：导航栏 / 背景图 / 分享 / 高级 ================= */

/* ---------- 折叠态 ---------- */
const navOpen = ref(false)
const bgOpen = ref(false)
const shareOpen = ref(false)
const globalOpen = ref(false)
const advOpen = ref(false)

/* ---------- 顶部导航栏 ---------- */
const NAV_MODE_OPTIONS = PAGE_NAV_MODES.map((m) => ({ value: m.value, label: m.label, title: m.desc }))
const navConfig = computed(() => normalizePageNav(pageStore.pageConfig.nav))
const navModeDesc = computed(
  () => PAGE_NAV_MODES.find((m) => m.value === navConfig.value.mode)?.desc || '',
)

/**
 * ⚠️ 嵌套对象必须**整对象回写**：
 * store 的 updatePageConfig 是浅合并，
 * 只发 `{nav:{mode:'immersive'}}` 会把 syncTitle / bgColor 等同级字段冲掉。
 */
function patchNav(partial: Record<string, unknown>) {
  pageStore.updatePageConfig({ nav: { ...navConfig.value, ...partial } as any })
}

const navSummary = computed(() => {
  const v = navConfig.value
  const name = PAGE_NAV_MODES.find((m) => m.value === v.mode)?.label || v.mode
  if (v.mode === 'hidden') return name
  if (v.sync_title) return `${name} · 跟随页面名`
  // 超长标题在摘要里截断，别把折叠标题撑成两行
  const t = v.title || '未命名'
  const shown = t.length > 8 ? `${t.slice(0, 8)}…` : t
  return `${name} · ${shown}`
})

/* ---------- 背景（原始值，交给 BackgroundSettings 自己渲染） ---------- */

/**
 * 🔴 传**原始** background 而不是 `bgModel`（归一化后的）：
 * 归一化会在「背景图 URL 为空」时把它改写成 solid，
 * 那样子组件就再也看不到用户选了「背景图」这个意图，切回时颜色已被污染。
 */
const bgModelRaw = computed(
  () => (pageStore.pageConfig.background || { type: 'solid', color: FALLBACK_SOLID }) as PageBackground,
)

const bgSummary = computed(() => {
  const t = bgModelRaw.value.type
  if (t === 'image') {
    const i = normalizePageBgImage(bgModelRaw.value.image)
    return i.url ? '背景图' : '背景图（未设置）'
  }
  if (t === 'gradient') return `渐变 ${bgModelRaw.value.gradient?.angle ?? 180}°`
  return '纯色'
})

/* ---------- 分享 ---------- */

const shareCfg = computed(() =>
  normalizePageShare({
    title: pageStore.pageConfig.share_title,
    desc: pageStore.pageConfig.share_desc,
    image: pageStore.pageConfig.share_image,
  }),
)

/** 分享卡片来源行：用页面名兜底，避免预览里出现「小程序」这种无意义字样 */
const shareSourceName = computed(() => String(pageStore.pageConfig.name || '').trim() || '小程序')

function patchShare(partial: { title?: string; desc?: string; image?: string }) {
  pageStore.updatePageConfig({
    share_title: partial.title ?? pageStore.pageConfig.share_title ?? '',
    share_desc: partial.desc ?? pageStore.pageConfig.share_desc ?? '',
    share_image: partial.image ?? pageStore.pageConfig.share_image ?? '',
  })
}

const shareSummary = computed(() => {
  const t = shareCfg.value.title || String(pageStore.pageConfig.name || '')
  return t ? `「${t}」` : '未设置标题'
})

/**
 * 抓画布首屏的截图能力。
 * ⚠️ 当前**没有**画布截图实现（html2canvas 对 flex/grid + transform 缩放支持很差，
 * 抓出来是错位的半截图），所以返回 undefined 让子组件明确提示「不可用」，
 * 而不是给一个点了必失败的按钮。将来画布层实现了截图，直接改这里注入即可。
 */
const captureCanvasShot = computed(() => undefined as undefined | (() => Promise<string>))

/* ---------- 高级设置 ---------- */

const ACCESS_OPTIONS = PAGE_ACCESS_MODES

const advCfg = computed(() =>
  normalizePageAdvanced({
    access_mode: pageStore.pageConfig.access_mode,
    vip_tiers: pageStore.pageConfig.vip_tiers,
    access_password: pageStore.pageConfig.access_password,
    watermark: pageStore.pageConfig.watermark,
    schedule: pageStore.pageConfig.schedule,
  }),
)

function patchAdv(partial: Record<string, unknown>) {
  pageStore.updatePageConfig({ ...partial } as any)
}

const advSummary = computed(() => {
  const parts: string[] = []
  const m = PAGE_ACCESS_MODES.find((x) => x.value === advCfg.value.access_mode)
  if (m && m.value !== 'public') parts.push(m.label)
  if (advCfg.value.watermark) parts.push('水印')
  if (advCfg.value.schedule.enabled) parts.push('定时上下线')
  return parts.length ? parts.join(' · ') : '全部公开'
})

/* ---------- 全局配置 ---------- */
const globalSummary = computed(() => {
  const g = pageStore.globalConfig
  const parts: string[] = []
  if (g.pull_refresh) parts.push('下拉刷新')
  if (g.reach_bottom_load) parts.push('触底加载')
  if (bottomOverlay.value.enabled) parts.push(`渐隐 ${bottomOverlay.value.height}px`)
  return parts.length ? parts.join(' · ') : '全部关闭'
})

/* ---------- 访问路径：正则拦截 + 复制 ---------- */
const copiedPath = ref(false)

/** 实时算出「被过滤掉的非法字符」，让运营边打边看到哪些没被接受 */
const pathInputInvalid = computed(() => {
  const raw = String(pageStore.pageConfig.path || '')
  const bad = raw.split('').filter((ch) => !PAGE_PATH_PATTERN.test(ch.toLowerCase()))
  return bad.length ? bad.join(' ') : ''
})

async function onCopyPath() {
  const full = `/${String(currentPath.value || '').replace(/^\/+/, '')}`
  try {
    await navigator.clipboard.writeText(full)
    copiedPath.value = true
    ElMessage.success(`已复制：${full}`)
    window.setTimeout(() => { copiedPath.value = false }, 1600)
  } catch {
    // 剪贴板不可用（非 HTTPS / 无权限）时兜底弹提示，不静默失败
    ElMessage.warning('复制失败，请手动选中路径复制')
  }
}
</script>

/* ================= 页面属性：折叠分组内的扁平排版 ================= */

/* 页面属性是「多个并列折叠组」，不套 panel-section 外壳，
   靠这个容器提供 12px 纵向间距（原先每组各自带 padding 会显得松散） */
.page-props { display: flex; flex-direction: column; }

/* 折叠组内统一用「标签一行 / 控件一行」或单控件，不再套灰卡片 */
.fld { display: flex; flex-direction: column; gap: 4px; }
.fld__lab {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #64748b;
  font-size: 12px;
}
.fld__tip { margin: 0; color: #a8b3c4; font-size: 11px; line-height: 1.4; }

/* 问号：与其余面板同款（7px 实心圆，hover 显底色） */
.fld__q {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 13px;
  height: 13px;
  color: #a8b3c4;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid #dbe2ec;
  border-radius: 50%;
  cursor: help;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.fld__q:hover,
.fld__q:focus-visible {
  color: #64748b;
  background: #f1f5f9;
  border-color: #cbd5e1;
  outline: none;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}
.switch-row__lab {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #64748b;
  font-size: 12px;
}

/**
 * 联动折叠动画。
 * 🔴 用 max-height + opacity 而不是 v-if：保留内部组件实例，
 * 重新打开时滑块/取色器还在原位，不会闪一下再重建。
 */
.fold-collapse {
  overflow: hidden;
  max-height: 320px;
  opacity: 1;
  transition: max-height 0.22s ease, opacity 0.18s ease;
}
.fold-collapse.is-closed {
  max-height: 0;
  opacity: 0;
  pointer-events: none;
}
.fold-collapse__inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* 折叠内容左移 8px + 左侧细线：视觉上从属于上方开关，而不是另起一个分组 */
  margin-top: 2px;
  padding-left: 8px;
  border-left: 1px solid #eef1f6;
}

/* ---------- 访问路径 ---------- */
.path-row { display: flex; align-items: center; gap: 6px; width: 100%; }
.path-row :deep(.page-path-field) { flex: 1 1 auto; min-width: 0; }
.path-row__err { margin: 2px 0 0; color: #e6a23c; font-size: 11px; line-height: 1.4; }
.panel-icon-btn.is-done { color: #16a34a; border-color: #a7e3c0; background: #f0fdf4; }

/* ---------- 渐变色标行 ---------- */
.bg-stop {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 4px 6px;
  align-items: center;
  padding: 4px 0;
}
.bg-stop__idx {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  color: #94a3b8;
  font-size: 10px;
  background: #f1f5f9;
  border-radius: 3px;
}
/* 第二行：位置滑块跨满整行 */
.bg-stop :deep(.csr) { grid-column: 2; }
.bg-stop > :last-child { grid-column: 2; justify-self: end; }

/* ---------- 预设色盘：一行紧凑 chip（圆点 + 名称） ---------- */
.bg-editor__presets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin-top: 2px;
}
.bg-preset {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 4px 6px;
  font-family: inherit;
  text-align: left;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.bg-preset:hover {
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #e3e8f0);
}
/* 色彩预览圆点：一眼看出这套配色长什么样，不用读文字 */
.bg-preset__dot {
  flex: none;
  width: 11px;
  height: 11px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 50%;
}
.bg-preset__label {
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ---------- 背景图 ---------- */
.bg-img {
  overflow: hidden;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}
.bg-img__preview {
  height: 74px;
  background-repeat: no-repeat;
}
.bg-img__preview img { display: none; }
.bg-img__empty {
  display: grid;
  place-items: center;
  height: 74px;
  color: #a8b3c4;
  font-size: 11px;
  background: #f8fafc;
}
.bg-img__acts { display: flex; align-items: center; gap: 6px; margin-top: 5px; }

/* ---------- 分享封面 5:4 ---------- */
.share-card-field { display: flex; flex-direction: column; gap: 6px; }
.share-cover {
  position: relative;
  width: 128px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
}
.share-cover.is-5-4 { height: 102px; }
.share-cover img { width: 100%; height: 100%; object-fit: cover; }
.share-cover__empty {
  display: grid;
  place-items: center;
  height: 100%;
  color: #a8b3c4;
  font-size: 11px;
}
/* 裁剪指引：四周虚线框，直观表达「按 5:4 裁切」 */
.share-cover__frame {
  position: absolute;
  inset: 3px;
  border: 1px dashed rgba(120, 90, 60, 0.45);
  border-radius: 3px;
  pointer-events: none;
}
.share-card-field__acts { display: flex; align-items: center; gap: 6px; }

/* ---------- 其它 ---------- */
.overlay-color-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.overlay-color-row :deep(.cir) { flex: 1 1 160px; min-width: 140px; }
.nav-title-input { padding-left: 0; }
.sched-row { display: flex; align-items: center; gap: 6px; }
.sched-preset { width: 108px; flex: none; }
.opt__name { font-size: 12px; }
.opt__desc { float: right; margin-left: 12px; color: #94a3b8; font-size: 11px; }

<style scoped>
.props-panel {
  /* 🔴 单滚动链（2026-10-06 修双滚动条）
     原来这里是 `overflow-y:auto; height:100%`，
     而 el-tabs__content 自身也是可滚动的 —— 两个滚动容器叠加，
     面板里就出现两条竖向滚动条（内层滚到底后外层还能再滚一段，
     滚轮在边界处"打滑"，很显然不是同一个内容）。
     规范做法：**根容器不滚**，让它成为 flex 列容器；
     只有 tab 内容区这一个滚动点。
     ⚠️ height 用 100dvh 而非 100vh —— 移动端浏览器地址栏收起/展开时
     100vh 不会变，内容区高度算错就会多出一条缝。 */
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  /* 🔴 用 flex:1 而不是 height:100dvh ——
   * 面板真实高度由外层 .right-tabs / .editor-right 决定，
   * 写死视口单位会在「编辑器窗口比视口矮」时溢出（又变成外层滚动条）。
   * 高度交给 flex 链传递，这里只负责「不滚」。 */
  flex: 1 1 auto;
  min-height: 0;
  /* 🔴 底部安全区（2026-10-06 需求「全局悬浮层防遮挡」）：
     右下角常驻 AI 助手 Dock（收起态约 34×180）会盖住面板最后几行 ——
     表现是「最后一个字段点不到 / 看不见」。96px 让内容能滚过悬浮层下方
   （2026-10-06 由 88px 调大：AI 助手与浮动保存条实测占位更高）。*/
  padding: 0 16px 96px;
  overflow: hidden;
  background: #fff;
}

/* ---------------- 单滚动链（2026-10-06 修双滚动条） ----------------
   根容器不滚 → el-tabs 撑满剩余高度且自身不滚 → 滚动点唯一交给 __content。
   ⚠️ 每一层的 min-height:0 都不可省：flex 子项默认 min-height:auto，
   内容一多就撑高父容器，overflow:hidden 形同虚设 → 退化成双滚动条。 */
/* 🔴🔴 2026-10-06 修「宽滚动条跑到面板最外侧」
   ⚠️ 原来这里写的是 `.el-tabs`，但真实模板里 el-tabs 的 class 是
   **`props-tabs`**（`<el-tabs class="props-tabs">`）——
   组件库自带类名 ≠ 组件上写的 class，写错则整条规则从未命中。
   后果：el-tabs 既不是 flex 列容器也没有 min-height:0，
   内容区自己撑到 1088px 溢出，滚动点退到最外层 → 面板右侧一条粗滚动条。
   **教训：用 `:deep()` 穿透前先grep 真实模板里组件上写的 class。 */
.props-panel > :deep(.props-tabs) {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* Tab 头（内容/样式/页面）固定不缩 */
.props-panel > :deep(.props-tabs .el-tabs__header) {
  flex: none;
  margin-bottom: 0;
}

.props-panel > :deep(.props-tabs .el-tabs__content) {
  flex: 1 1 auto;
  min-height: 0;
  /* 底部安全区要给在真正滚动这一层，给根容器会被 overflow:hidden 裁掉 */
  padding-bottom: 96px;
  overflow-y: auto;
  overflow-x: hidden;
  /* Firefox 用标准属性（Chrome/Edge 走下面的 ::-webkit-* 伪元素，两套互不冲突）*/
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 113, 108, 0.3) transparent;
}

/* ---------------- 细滚动条（2026-10-06） ----------------
   需求：「这条滑动条很丑，可以不出现吗」
   🔴 判据：**不能真的 `display:none`** ——
   隐藏后用户完全看不出「下面还有内容」，属性面板里折叠分组很长，
   运营会以为面板到底了，配置漏掉都不知道。
   正确做法：**收窄到 6px + 默认半透明淡出，hover 才显形**——
   既不打扰（默认几乎看不见），又保留「还有内容可滚」的视觉线索。
   ⚠️ 只对**真正滚动的那一层**加（.el-tabs__content），
   窄滚动条必须配 `overflow-y:auto` 才有效果（overflow:hidden 时无效）。 */
.props-panel > :deep(.props-tabs .el-tabs__content)::-webkit-scrollbar {
  width: 6px;
}

.props-panel > :deep(.props-tabs .el-tabs__content)::-webkit-scrollbar-track {
  background: transparent;
}

/* 常态 22%透明 —— 看得见有一条，但几乎不抢眼 */
.props-panel > :deep(.props-tabs .el-tabs__content)::-webkit-scrollbar-thumb {
  background: rgba(120, 113, 108, 0.22);
  border-radius: 3px;
  transition: background-color 0.2s;
}

.props-panel > :deep(.props-tabs .el-tabs__content):hover::-webkit-scrollbar-thumb {
  background: rgba(120, 113, 108, 0.42);
}

/* 拖动时加深：正在操作滚动条时才需要强对比 */
.props-panel > :deep(.props-tabs .el-tabs__content)::-webkit-scrollbar-thumb:active {
  background: rgba(120, 113, 108, 0.62);
}

.panel-header {
  /* 面板头（当前组件那一条）固定不缩，否则内容一多就被压扁 */
  flex: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  /* 紧凑化：上下内边距收到 8/6px。原 12/10px 在这一行吃掉近 30px，
     而这一行每次切组件都会出现在视线首屏，白白多一次滚动。 */
  margin: 0 -16px;
  padding: 8px 10px 7px 16px;
  border-bottom: 1px solid #e3e8f0;
}

/* 左侧：类型图标 + 标题组*/
.panel-header__lead {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.comp-type-icon {
  display: grid;
  place-items: center;
  flex: none;
  /* 紧凑化：26 → 22px，与收紧后的头部留白匹配 */
  width: 22px;
  height: 22px;
  margin-top: 1px;
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--el-color-primary, #c08e6e) 24%, #fff);
  border-radius: 6px;
}

.panel-header__titles {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1 1 auto;
  min-width: 0;
}

/* 备注名：无边框裸输入，聚焦才浮出浅底，视觉上不抢「当前组件」 kicker 的层级 */
.comp-remark {
  flex: 1;
  min-width: 0;
  max-width: 130px;
  margin-left: -4px;
}

/* 类型名 + 别名同行：类型名是主标题，别名跟在右侧，两者都占一行不额外撑高 */
.comp-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.comp-type-name {
  flex: none;
  max-width: 50%;
  overflow: hidden;
  color: #3a2f26;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.1px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comp-remark :deep(.el-input__wrapper) {
  padding: 1px 6px;
  background: transparent;
  box-shadow: none;
  transition: background 0.15s, box-shadow 0.15s;
}

.comp-remark :deep(.el-input__wrapper:hover) {
  background: #f7f4f0;
}

.comp-remark :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1px var(--el-color-primary, #c08e6e) inset;
}

.comp-remark :deep(.el-input__inner) {
  height: 20px;
  padding: 0 4px;
  color: #8a7d6f;
  font-size: 12px;
  font-weight: 400;
}

.comp-remark :deep(.el-input__inner::placeholder) {
  color: #c8bcae;
  font-size: 11.5px;
  font-weight: 400;
}

/* 右侧：组件级操作闭环（复制 / 删除 / 取消选中） */
.panel-header__actions {
  display: flex;
  align-items: center;
  /* 紧凑化：图标间距 2 → 1px，三枚按钮整体少占 2px */
  gap: 1px;
  flex: none;
  margin-top: 0;
}

.panel-icon-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: #8a7c6e;
  font-size: 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

.panel-icon-btn:hover {
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 9%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 26%, #fff);
}

.panel-icon-btn:focus-visible {
  outline: 2px solid var(--el-color-primary, #c08e6e);
  outline-offset: 1px;
}

.panel-icon-btn--danger:hover {
  color: var(--el-color-danger, #f56c6c);
  background: var(--el-color-danger-light-9, #fef0f0);
  border-color: var(--el-color-danger-light-7, #fcd3d3);
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
  color: #9aa4b5;
  font-size: 10.5px;
  letter-spacing: 0.3px;
}

/* 组件类型名与别名已合并到 .comp-title-row 一行，此处不再单独定义降级行样式 */
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

/* el-form-item 自定义 label 容器：让「?」提示与标题文字基线对齐 */
.pp-label {
  display: inline-flex;
  align-items: center;
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

/* ---------------- 扁平行（替代灰卡片 + 表单） ----------------
   2026-10-06 视觉降噪：样式 Tab 原来是「灰卡片 + el-form-item」两层，
   叠加右栏已有的折叠面板就成了「框套框」。现改为一行 label + 一行控件，
   分组交给 StyleFoldGroup 的分割线，视觉上只剩一条条轻分隔。 */

/* 单行：标签左侧固定宽，控件右侧占满 */
.flat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 32px;
}

.flat-row--wrap {
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
}

.flat-row__lab {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: none;
  width: 80px;
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 问号与 CompactSliderRow / CompactSpacingBox 里同款（7px 实心圆，hover 显底色） */
.csb__q {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 13px;
  height: 13px;
  color: #a8b3c4;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid #dbe2ec;
  border-radius: 50%;
  cursor: help;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.csb__q:hover,
.csb__q:focus-visible {
  color: #64748b;
  background: #f1f5f9;
  border-color: #cbd5e1;
  outline: none;
}

/* 说明文字已全部收进字段右侧的 ? 悬浮气泡；
   这里只保留「跨字段的整组说明」一种用法（如可见性开关的解释），
   字号压到 11px、行高 1.4，不再各字段各挂一条灰字。 */
.flat-note {
  margin: 0 0 0 80px;
  color: #a8b3c4;
  font-size: 11px;
  line-height: 1.4;
}

/* 品牌顶栏不需要 margin 时的提示，同样降级成一行灰字 */
.shell-note--flat {
  margin: 0 0 2px;
  color: #a8b3c4;
  font-size: 11px;
  line-height: 1.45;
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
  /* 4 个胶囊（无阴影/暖调微光/标准弥散/自定义）在 380px 面板里放不下，
     允许换行比让它们挤成两行更整齐 */
  flex-wrap: wrap;
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

/* ---------------- 可见性说明收拢为 Hover 气泡（2026-10-06） ---------------- */
.flat-row__lab-tip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: help;
}

/* 问号小圆点：只在需要解释的字段出现，不是每个字段都挂 */
.flat-row__lab-q {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  color: #a8b3c4;
  font-size: 9px;
  font-style: normal;
  line-height: 1;
  border: 1px solid #dfe3ea;
  border-radius: 50%;
  transition: color 0.15s, border-color 0.15s;
}

.flat-row__lab-tip:hover .flat-row__lab-q {
  color: var(--el-color-primary, #c08e6e);
  border-color: var(--el-color-primary, #c08e6e);
}

</style>
