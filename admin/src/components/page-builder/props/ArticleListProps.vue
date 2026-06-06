<template>
  <div class="article-list-props">
    <el-form label-width="70px" size="small">
      <el-form-item label="标题">
        <el-input :model-value="data.title" @input="emit('update', { title: $event })" placeholder="模块标题" />
      </el-form-item>
      <el-form-item label="样式">
        <el-radio-group :model-value="data.style_type" @change="emit('update', { style_type: $event as string })">
          <el-radio value="card">卡片</el-radio>
          <el-radio value="list">列表</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示封面">
        <el-switch :model-value="data.show_cover" @change="emit('update', { show_cover: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示日期">
        <el-switch :model-value="data.show_date" @change="emit('update', { show_date: $event as boolean })" />
      </el-form-item>
      <el-form-item label="显示数量">
        <el-input-number
          :model-value="data.limit"
          @change="emit('update', { limit: $event as number })"
          :min="1"
          :max="50"
          controls-position="right"
        />
      </el-form-item>

      <el-divider content-position="left" style="margin: 10px 0 6px; font-size: 12px; color: #8a94a6">数据源</el-divider>
      <el-form-item label="排序方式">
        <el-select :model-value="sortBy" @change="onSortByChange" style="width: 100%">
          <el-option label="最新发布" value="newest" />
          <el-option label="阅读量最多" value="popular" />
          <el-option label="推荐优先" value="recommended" />
        </el-select>
      </el-form-item>
      <el-alert
        type="info"
        :closable="false"
        description="内容数据自动从后台已发布的文章中拉取，无需手动录入"
        style="font-size: 12px"
      />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const sortBy = computed(() => {
  const ds = data.data_source
  if (!ds) return 'newest'
  const params = ds.params || ds.config?.params || {}
  return params.sort_by || 'newest'
})

function onSortByChange(val: string) {
  emit('update', {
    data_source: {
      type: 'content',
      params: {
        status: 'published',
        sort_by: val,
      },
    },
  })
}
</script>
