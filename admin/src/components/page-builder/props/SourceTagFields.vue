<template>
  <div class="source-tag-fields">
    <el-divider content-position="left">来源标签</el-divider>
    <el-form-item label="显示标签">
      <el-switch
        :model-value="data.show_source_tag === true"
        @change="(v: boolean) => emit('update', { show_source_tag: v })"
      />
      <div class="ds-hint">旧页面默认关闭；开启后按内容来源展示小标签</div>
    </el-form-item>
    <template v-if="data.show_source_tag === true">
      <el-form-item label="标签位置">
        <el-radio-group
          :model-value="data.source_tag_position || 'meta'"
          @change="(v: string) => emit('update', { source_tag_position: v })"
        >
          <el-radio-button value="title">标题旁</el-radio-button>
          <el-radio-button value="meta">日期行</el-radio-button>
          <el-radio-button value="cover">封面上</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="筛选来源">
        <el-select
          :model-value="filterValue"
          multiple
          collapse-tags
          clearable
          placeholder="不限（展示全部）"
          style="width: 100%"
          @change="onFilterChange"
        >
          <el-option label="微信公众号" value="wechat_mp" />
          <el-option label="小红书" value="xiaohongshu" />
          <el-option label="问答" value="qa" />
          <el-option label="原创" value="original" />
        </el-select>
        <div class="ds-hint">仅影响本组件展示，在客户端二次筛选</div>
      </el-form-item>
      <el-form-item label="公众号文案">
        <el-input
          :model-value="labelOf('wechat_mp')"
          placeholder="默认：公众号"
          @update:model-value="(v: string) => patchLabel('wechat_mp', v)"
        />
      </el-form-item>
      <el-form-item label="小红书文案">
        <el-input
          :model-value="labelOf('xiaohongshu')"
          @update:model-value="(v: string) => patchLabel('xiaohongshu', v)"
        />
      </el-form-item>
      <el-form-item label="问答文案">
        <el-input
          :model-value="labelOf('qa')"
          @update:model-value="(v: string) => patchLabel('qa', v)"
        />
      </el-form-item>
      <el-form-item label="原创文案">
        <el-input
          :model-value="labelOf('original')"
          @update:model-value="(v: string) => patchLabel('original', v)"
        />
      </el-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import type { SourceTagKey } from '@/utils/dsl-source-tag'

const { props: data } = defineProps<{ props: ComponentInstance['props'] }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const filterValue = computed(() => {
  const raw = data.source_filter
  return Array.isArray(raw) ? raw : []
})

function labelOf(key: SourceTagKey) {
  const map = data.source_labels || {}
  return map[key] || ''
}

function patchLabel(key: SourceTagKey, value: string) {
  const map = { ...(data.source_labels || {}), [key]: value }
  emit('update', { source_labels: map })
}

function onFilterChange(v: string[]) {
  emit('update', { source_filter: v && v.length ? v : undefined })
}
</script>
