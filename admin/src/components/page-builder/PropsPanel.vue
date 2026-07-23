<template>
  <div class="props-panel">
    <!-- No component selected: show page properties -->
    <template v-if="!pageStore.selectedComponent">
      <div class="panel-section">
        <div class="section-title">页面属性</div>
        <el-form label-width="70px" size="small">
          <el-form-item label="页面名称">
            <el-input :model-value="pageStore.pageConfig.name" @input="(v: string) => pageStore.updatePageConfig({ name: v })" />
          </el-form-item>
          <el-form-item label="背景色">
            <el-color-picker :model-value="pageStore.pageConfig.background_color || '#f6f8fb'" @change="(v: string) => pageStore.updatePageConfig({ background_color: v })" />
          </el-form-item>
          <el-form-item label="分享标题">
            <el-input :model-value="pageStore.pageConfig.share_title || ''" @input="(v: string) => pageStore.updatePageConfig({ share_title: v })" />
          </el-form-item>
        </el-form>
      </div>
      <div class="panel-section">
        <div class="section-title">全局配置</div>
        <el-form label-width="70px" size="small">
          <el-form-item label="下拉刷新">
            <el-switch :model-value="pageStore.globalConfig.pull_refresh" @change="(v: boolean) => pageStore.updateGlobalConfig({ pull_refresh: v })" />
          </el-form-item>
          <el-form-item label="触底加载">
            <el-switch :model-value="pageStore.globalConfig.reach_bottom_load" @change="(v: boolean) => pageStore.updateGlobalConfig({ reach_bottom_load: v })" />
          </el-form-item>
        </el-form>
      </div>
    </template>

    <!-- Component selected: show component properties -->
    <template v-else>
      <div class="panel-header">
        <span class="comp-type-label">{{ ComponentTypeLabels[pageStore.selectedComponent.type] }}</span>
        <el-button text size="small" @click="pageStore.selectComponent('')">取消选中</el-button>
      </div>

      <!-- Dynamic component props panel -->
      <div class="panel-section">
        <div class="section-title">组件属性</div>
        <component
          :is="propsPanelMap[pageStore.selectedComponent.type]"
          :props="pageStore.selectedComponent.props"
          @update="handlePropsUpdate"
        />
      </div>

      <!-- Common spacing/style config：B6 默认折叠，减少每次选中组件都要滚过一屏边距设置 -->
      <div class="panel-section">
        <button class="section-title section-title--toggle" @click="styleSectionExpanded = !styleSectionExpanded">
          <span>通用样式</span>
          <el-icon class="toggle-icon" :class="{ expanded: styleSectionExpanded }"><ArrowRight /></el-icon>
        </button>
        <div v-show="styleSectionExpanded" class="style-section-body">
          <!-- B6：四向边距合并为一个联动控件，可锁定等比同步调整 -->
          <div class="margin-box">
            <div class="margin-box__label">
              <span>边距</span>
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
            <div class="margin-box__grid">
              <div class="margin-cell margin-cell--top">
                <span>上</span>
                <el-input-number
                  :model-value="currentStyle.margin_top || 0"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number) => updateMargin('margin_top', v)"
                />
              </div>
              <div class="margin-cell margin-cell--left">
                <span>左</span>
                <el-input-number
                  :model-value="currentStyle.margin_left || 0"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number) => updateMargin('margin_left', v)"
                />
              </div>
              <div class="margin-cell margin-cell--right">
                <span>右</span>
                <el-input-number
                  :model-value="currentStyle.margin_right || 0"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number) => updateMargin('margin_right', v)"
                />
              </div>
              <div class="margin-cell margin-cell--bottom">
                <span>下</span>
                <el-input-number
                  :model-value="currentStyle.margin_bottom || 0"
                  :min="0" :max="100" size="small" controls-position="right"
                  @change="(v: number) => updateMargin('margin_bottom', v)"
                />
              </div>
            </div>
          </div>

          <el-form label-width="70px" size="small">
            <el-form-item label="圆角">
              <el-input-number :model-value="currentStyle.border_radius || 0" :min="0" :max="50" @change="(v: number) => updateStyle('border_radius', v)" />
            </el-form-item>
            <el-form-item label="背景色">
              <el-color-picker :model-value="currentStyle.background_color || '#ffffff'" @change="(v: string) => updateStyle('background_color', v)" />
            </el-form-item>
          </el-form>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { ArrowRight, Lock, Unlock } from '@element-plus/icons-vue'
import { usePageStore } from '@/stores/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'

const pageStore = usePageStore()

/** B6：通用样式默认折叠；边距四向可锁定为等比联动 */
const styleSectionExpanded = ref(false)
const marginLinked = ref(false)

// 切换选中组件时收起，避免上一个组件的展开状态带到下一个组件造成误解
watch(() => pageStore.selectedComponentId, () => {
  styleSectionExpanded.value = false
})

const propsPanelMap: Record<string, any> = {
  [ComponentType.Banner]: defineAsyncComponent(() => import('./props/BannerProps.vue')),
  [ComponentType.Search]: defineAsyncComponent(() => import('./props/SearchProps.vue')),
  [ComponentType.NoticeBar]: defineAsyncComponent(() => import('./props/NoticeBarProps.vue')),
  [ComponentType.Image]: defineAsyncComponent(() => import('./props/ImageProps.vue')),
  [ComponentType.Nav]: defineAsyncComponent(() => import('./props/NavProps.vue')),
  [ComponentType.CategoryNav]: defineAsyncComponent(() => import('./props/CategoryNavProps.vue')),
  [ComponentType.ProductList]: defineAsyncComponent(() => import('./props/ProductListProps.vue')),
  [ComponentType.FlashSale]: defineAsyncComponent(() => import('./props/GenericProps.vue')),
  [ComponentType.ArticleList]: defineAsyncComponent(() => import('./props/ArticleListProps.vue')),
  [ComponentType.ActivityEntry]: defineAsyncComponent(() => import('./props/GenericProps.vue')),
  [ComponentType.ActivityList]: defineAsyncComponent(() => import('./props/ActivityListProps.vue')),
  [ComponentType.AppointmentService]: defineAsyncComponent(() => import('./props/AppointmentServiceProps.vue')),
  [ComponentType.MemberCard]: defineAsyncComponent(() => import('./props/MemberCardProps.vue')),
  [ComponentType.Coupon]: defineAsyncComponent(() => import('./props/CouponProps.vue')),
  [ComponentType.Video]: defineAsyncComponent(() => import('./props/VideoProps.vue')),
  [ComponentType.BrandIntro]: defineAsyncComponent(() => import('./props/BrandIntroProps.vue')),
  [ComponentType.ImageText]: defineAsyncComponent(() => import('./props/ImageTextProps.vue')),
  [ComponentType.ContactInfo]: defineAsyncComponent(() => import('./props/ContactInfoProps.vue')),
  [ComponentType.Certificate]: defineAsyncComponent(() => import('./props/CertificateProps.vue')),
  [ComponentType.Countdown]: defineAsyncComponent(() => import('./props/CountdownProps.vue')),
  [ComponentType.FloatButton]: defineAsyncComponent(() => import('./props/FloatButtonProps.vue')),
  [ComponentType.RichText]: defineAsyncComponent(() => import('./props/RichTextProps.vue')),
  [ComponentType.SectionTitle]: defineAsyncComponent(() => import('./props/SectionTitleProps.vue')),
  [ComponentType.Divider]: defineAsyncComponent(() => import('./props/DividerProps.vue')),
  [ComponentType.Spacer]: defineAsyncComponent(() => import('./props/SpacerProps.vue')),
  [ComponentType.FormEntry]: defineAsyncComponent(() => import('./props/FormEntryProps.vue')),
  [ComponentType.AIEntry]: defineAsyncComponent(() => import('./props/AIEntryProps.vue')),
}

const currentStyle = computed(() => {
  return pageStore.selectedComponent?.style || {}
})

function handlePropsUpdate(partial: Record<string, any>) {
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentProps(pageStore.selectedComponent.id, partial)
}

function updateStyle(key: string, value: any) {
  if (!pageStore.selectedComponent) return
  pageStore.updateComponentStyle(pageStore.selectedComponent.id, { [key]: value })
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
</script>

<style scoped>
.props-panel {
  padding: 12px;
  overflow-y: auto;
  height: 100%;
  background: #fff;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e3e8f0;
}
.comp-type-label {
  font-size: 14px;
  font-weight: 700;
  color: #172033;
}
.panel-section {
  margin-bottom: 16px;
}
.section-title {
  font-size: 12px;
  font-weight: 700;
  color: #7b8798;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #1769ff;
}

/* B6：可折叠的"通用样式"标题按钮 */
.section-title--toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 4px;
  font-family: inherit;
  background: transparent;
  border: 0;
  border-left: 3px solid var(--brand, #1769ff);
  cursor: pointer;
}

.toggle-icon {
  color: #9aa4b5;
  font-size: 12px;
  transition: transform 0.15s ease;

  &.expanded {
    transform: rotate(90deg);
  }
}

.style-section-body {
  margin-top: 10px;
}

/* B6：边距联动控件 */
.margin-box {
  margin-bottom: 14px;
  padding: 10px;
  background: var(--bg-page, #f5f7fb);
  border: 1px solid var(--border, #e3e8f0);
  border-radius: var(--radius, 8px);
}

.margin-box__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--text-secondary, #7b8798);
  font-size: 12px;
  font-weight: 600;
}

.margin-lock-btn {
  width: 22px;
  height: 22px;
}

.margin-box__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'top top'
    'left right'
    'bottom bottom';
  gap: 6px;
}

.margin-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted, #9aa4b5);

  :deep(.el-input-number) {
    flex: 1;
  }

  &--top { grid-area: top; }
  &--left { grid-area: left; }
  &--right { grid-area: right; }
  &--bottom { grid-area: bottom; }
}
</style>
