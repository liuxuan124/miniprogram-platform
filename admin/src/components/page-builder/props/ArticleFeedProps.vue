<template>
  <div class="article-feed-props">
    <el-form label-width="70px" size="small">
      <div class="ds-hint ds-hint--block">
        自动加载全站已发布文章；小程序端下滑页面将持续加载更多。
      </div>

      <el-divider content-position="left">文章展示</el-divider>
      <el-form-item label="分类标签">
        <el-switch
          :model-value="data.show_category_tabs === true"
          @change="(v: boolean) => emit('update', { show_category_tabs: v })"
        />
        <div class="ds-hint">开启后顶部显示顶级分类 Tab，点击切换下方文章</div>
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="layoutValue" @change="onLayoutChange">
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="compact">紧凑</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示封面">
        <el-switch :model-value="data.show_cover !== false" @change="emit('update', { show_cover: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示日期">
        <el-switch :model-value="data.show_date !== false" @change="emit('update', { show_date: $event as boolean })" />
      </el-form-item>
      <el-form-item label="每页条数">
        <el-input-number
          :model-value="Number(data.page_size ?? 10)"
          :min="5"
          :max="30"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { page_size: v ?? 10 })"
        />
        <div class="ds-hint">小程序每次下滑加载的篇数</div>
      </el-form-item>
      <el-form-item label="卡片间距">
        <el-input-number
          :model-value="data.item_gap ?? 8"
          @change="(v: number | undefined) => emit('update', { item_gap: v ?? 8 })"
          :min="0"
          :max="48"
          controls-position="right"
        />
        <div class="ds-hint">单位 px</div>
      </el-form-item>
      <TitleFontSizeFields
        :data="data"
        subtitle-label="日期字号"
        :title-default="13"
        :subtitle-default="11"
        @update="(v) => emit('update', v)"
      />

      <div class="ds-card">
        <div class="ds-card__head">
          <span>数据来源</span>
          <span class="ds-card__count">{{ liveLoading ? '读取中…' : `${liveItems.length} 篇已发布` }}</span>
        </div>
        <div class="ds-hint">全站已发布文章，按发布时间倒序无限加载</div>
        <div v-if="liveItems.length" class="ds-preview">
          <div v-for="item in liveItems.slice(0, 3)" :key="item.id || item.title" class="ds-chip">
            {{ item.title }}
          </div>
        </div>
        <div v-else-if="!liveLoading" class="ds-empty">暂无已发布内容</div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ComponentType, type ComponentInstance } from '@/types/page'
import TitleFontSizeFields from './TitleFontSizeFields.vue'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const feedComponent = computed<ComponentInstance>(() => ({
  id: 'props-article-feed',
  type: ComponentType.ArticleFeed,
  props: data,
}))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => feedComponent.value,
  () => false,
)

const layoutValue = computed(() => {
  const raw = data.layout || data.style_type || 'list'
  return ['card', 'list', 'compact'].includes(raw) ? raw : 'list'
})

function onLayoutChange(val: string) {
  emit('update', { layout: val, style_type: val })
}
</script>

<style scoped lang="scss">
.ds-hint {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.ds-hint--block {
  margin: 0 0 8px;
}

.ds-card {
  margin-top: 8px;
  padding: 10px 10px 8px;
  background: #f8fafc;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.ds-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.ds-card__count {
  color: #1769ff;
  font-weight: 500;
}

.ds-empty {
  margin: 0 0 4px;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}

.ds-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.ds-chip {
  padding: 4px 8px;
  color: #475569;
  font-size: 11px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
