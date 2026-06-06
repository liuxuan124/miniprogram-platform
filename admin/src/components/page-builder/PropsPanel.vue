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

      <!-- Common spacing/style config -->
      <div class="panel-section">
        <div class="section-title">通用样式</div>
        <el-form label-width="70px" size="small">
          <el-form-item label="上边距">
            <el-input-number :model-value="currentStyle.margin_top || 0" :min="0" :max="100" @change="(v: number) => updateStyle('margin_top', v)" />
          </el-form-item>
          <el-form-item label="下边距">
            <el-input-number :model-value="currentStyle.margin_bottom || 0" :min="0" :max="100" @change="(v: number) => updateStyle('margin_bottom', v)" />
          </el-form-item>
          <el-form-item label="左边距">
            <el-input-number :model-value="currentStyle.margin_left || 0" :min="0" :max="100" @change="(v: number) => updateStyle('margin_left', v)" />
          </el-form-item>
          <el-form-item label="右边距">
            <el-input-number :model-value="currentStyle.margin_right || 0" :min="0" :max="100" @change="(v: number) => updateStyle('margin_right', v)" />
          </el-form-item>
          <el-form-item label="圆角">
            <el-input-number :model-value="currentStyle.border_radius || 0" :min="0" :max="50" @change="(v: number) => updateStyle('border_radius', v)" />
          </el-form-item>
          <el-form-item label="背景色">
            <el-color-picker :model-value="currentStyle.background_color || '#ffffff'" @change="(v: string) => updateStyle('background_color', v)" />
          </el-form-item>
        </el-form>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { usePageStore } from '@/stores/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'

const pageStore = usePageStore()

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
</style>
