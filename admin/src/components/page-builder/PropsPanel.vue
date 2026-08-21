<template>
  <div class="props-panel">
    <!-- No component selected: show page properties -->
    <template v-if="!pageStore.selectedComponent">
      <div class="panel-section">
        <div class="section-title">页面属性</div>
        <el-form label-width="70px" size="small">
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
          <el-form-item label="背景色">
            <el-color-picker :model-value="pageStore.pageConfig.background_color || '#f6f8fb'" @change="(v: string) => pageStore.updatePageConfig({ background_color: v })" />
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
            </div>
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
              @update="handlePropsUpdate"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="样式" name="style">
          <div class="style-section-body">
          <div class="shell-note">
            「外边距」= 内容相对手机屏幕边缘的距离，不会再套一层白外框。<br />
            选中时的虚线只是编辑指示，真机不显示。
          </div>

          <!-- 相对屏幕边缘的外边距 -->
          <div v-if="hideMarginEditor" class="shell-note">
            品牌顶栏始终铺满屏幕宽度并替代系统导航栏，无需设置外边距。
          </div>
          <div v-else class="margin-box">
            <div class="margin-box__label">
              <span>外边距（相对屏幕）</span>
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
                  :model-value="Number(currentStyle.margin_top ?? 0)"
                  :min="allowsNegativeMargin ? -120 : 0"
                  :max="100"
                  size="small"
                  controls-position="right"
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
                  :model-value="Number(currentStyle.margin_bottom ?? 0)"
                  :min="allowsNegativeMargin ? -120 : 0"
                  :max="100"
                  size="small"
                  controls-position="right"
                  @change="(v: number) => updateMargin('margin_bottom', v)"
                />
              </div>
            </div>
            <div v-if="allowsNegativeMargin" class="style-hint margin-overlap-hint">
              上下边距可设为负数，与相邻组件重叠；重叠时本组件始终显示在最上层。
            </div>
          </div>

          <el-form label-width="90px" size="small">
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
              <div class="style-hint">关闭后小程序端不渲染该组件，画布中会半透明显示便于继续编辑</div>
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
import { normalizeUploadUrl } from '@/api/system'
import { usePageStore } from '@/stores/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'
import { normalizeBuilderPath } from '@/utils/page-path'
import { useImageUpload } from './composables/useImageUpload'
import { getDataSourceBinding } from './dataSourceValidation'
import PagePathField from './PagePathField.vue'

const pageStore = usePageStore()
const router = useRouter()
const { uploadImage, uploading: uploadingShare } = useImageUpload()

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

const dataSourceBinding = computed(() => {
  const comp = pageStore.selectedComponent
  if (!comp) return null
  return getDataSourceBinding(comp)
})

// 切换选中组件时收起，避免上一个组件的展开状态带到下一个组件造成误解
watch(() => pageStore.selectedComponentId, () => {
  activeTab.value = 'content'
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
  [ComponentType.HotNews]: defineAsyncComponent(() => import('./props/HotNewsProps.vue')),
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
  [ComponentType.JoinGroup]: defineAsyncComponent(() => import('./props/JoinGroupProps.vue')),
  [ComponentType.BrandHeader]: defineAsyncComponent(() => import('./props/BrandHeaderProps.vue')),
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
    || type === ComponentType.HotNews
    || type === ComponentType.FlashSale
    || type === ComponentType.ActivityList
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

.shell-note {
  margin: 0 0 14px;
  padding: 10px 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
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
</style>
