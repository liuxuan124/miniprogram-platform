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
        <div>
          <span class="panel-kicker">当前组件</span>
          <div class="comp-type-label">{{ ComponentTypeLabels[pageStore.selectedComponent.type] }}</div>
        </div>
        <el-button text size="small" @click="pageStore.selectComponent('')">取消选中</el-button>
      </div>

      <el-tabs v-model="activeTab" class="props-tabs" stretch>
        <el-tab-pane label="内容与数据" name="content">
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
          <div class="panel-section panel-section--content">
            <component
              :is="propsPanelMap[pageStore.selectedComponent.type]"
              :props="pageStore.selectedComponent.props"
              @update="handlePropsUpdate"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="样式" name="style">
          <div class="style-section-body">
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
          </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { Lock, Unlock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { usePageStore } from '@/stores/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'

const pageStore = usePageStore()
const router = useRouter()

const activeTab = ref<'content' | 'style'>('content')
const marginLinked = ref(false)

// 切换选中组件时收起，避免上一个组件的展开状态带到下一个组件造成误解
watch(() => pageStore.selectedComponentId, () => {
  activeTab.value = 'content'
})

const dataStatus = computed(() => {
  const component = pageStore.selectedComponent
  if (!component) return null
  if (component.type === ComponentType.ProductList) {
    return {
      title: '自动读取已上架商品',
      description: component.props.data_source ? '数据源已连接，预览时显示真实商品' : '尚未配置商品数据源',
      tone: component.props.data_source ? 'success' : 'warning',
      routeName: 'CommerceProduct',
    }
  }
  if (component.type === ComponentType.ArticleList) {
    return {
      title: '自动读取已发布文章',
      description: component.props.data_source ? '数据源已连接，预览时显示真实内容' : '尚未配置文章数据源',
      tone: component.props.data_source ? 'success' : 'warning',
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
  [ComponentType.ActivityEntry]: defineAsyncComponent(() => import('./props/ActivityEntryProps.vue')),
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

const hasSplitTextSize = computed(() => {
  const type = pageStore.selectedComponent?.type
  return [
    ComponentType.SectionTitle,
    ComponentType.ArticleList,
    ComponentType.ProductList,
    ComponentType.ActivityList,
    ComponentType.ActivityEntry,
    ComponentType.BrandIntro,
    ComponentType.ImageText,
    ComponentType.AppointmentService,
    ComponentType.ContactInfo,
    ComponentType.FlashSale,
    ComponentType.RichText,
    ComponentType.Certificate,
    ComponentType.MemberCard,
    ComponentType.Countdown,
    ComponentType.FormEntry,
    ComponentType.AIEntry,
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
  border-left: 3px solid #1769ff;
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

}

.margin-cell--top { grid-area: top; }
.margin-cell--left { grid-area: left; }
.margin-cell--right { grid-area: right; }
.margin-cell--bottom { grid-area: bottom; }
</style>
