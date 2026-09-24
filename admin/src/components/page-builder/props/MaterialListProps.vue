<template>
  <div class="material-list-props">
    <el-form label-width="88px" size="small">
      <div class="ds-hint ds-hint--block">
        标题请用「标题栏」放在列表上方；行点击跳转资料详情（小程序端）。
      </div>

      <el-divider content-position="left">列表样式</el-divider>
      <el-form-item label="布局">
        <el-radio-group
          :model-value="data.layout || 'list'"
          @change="(v: string) => emit('update', { layout: v })"
        >
          <el-radio-button value="list">列表</el-radio-button>
          <el-radio-button value="card">双列卡片</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="显示数量">
        <el-input-number
          :model-value="Number(data.limit ?? 5)"
          :min="1"
          :max="20"
          controls-position="right"
          @change="(v: number | undefined) => emit('update', { limit: v ?? 5 })"
        />
      </el-form-item>
      <el-form-item label="分类筛选条">
        <el-switch
          :model-value="data.show_filter_bar === true"
          @change="(v: boolean) => emit('update', { show_filter_bar: v })"
        />
      </el-form-item>
      <el-form-item label="显示页数/大小">
        <el-switch :model-value="data.show_meta !== false" @change="(v: boolean) => emit('update', { show_meta: v })" />
      </el-form-item>
      <el-form-item label="显示下载量">
        <el-switch
          :model-value="data.show_downloads !== false"
          @change="(v: boolean) => emit('update', { show_downloads: v })"
        />
      </el-form-item>
      <el-form-item label="显示权限标签">
        <el-switch :model-value="data.show_access !== false" @change="(v: boolean) => emit('update', { show_access: v })" />
      </el-form-item>

      <el-divider content-position="left">数据来源</el-divider>
      <el-form-item label="来源模式">
        <el-radio-group
          :model-value="data.source_mode || 'all'"
          @change="(v: string) => emit('update', { source_mode: v })"
        >
          <el-radio-button value="all">全部资料</el-radio-button>
          <el-radio-button value="categories">按分组</el-radio-button>
          <el-radio-button value="manual">手动挑选</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="(data.source_mode || 'all') === 'categories'" label="资料分组">
        <el-select
          :model-value="data.category_ids || []"
          multiple
          filterable
          collapse-tags
          placeholder="选择分组"
          style="width: 100%"
          @change="(v: number[]) => emit('update', { category_ids: v })"
        >
          <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
        </el-select>
        <div class="ds-hint">对应后台「内容 · 资料」分组</div>
      </el-form-item>
      <el-form-item v-if="(data.source_mode || 'all') === 'manual'" label="挑选资料">
        <el-select
          :model-value="data.manual_ids || []"
          multiple
          filterable
          remote
          :remote-method="searchFiles"
          :loading="fileLoading"
          placeholder="搜索资料名"
          style="width: 100%"
          @change="(v: number[]) => emit('update', { manual_ids: v })"
        >
          <el-option v-for="f in fileOptions" :key="f.id" :label="f.name" :value="f.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="排序">
        <el-select
          :model-value="data.sort || 'newest'"
          style="width: 100%"
          @change="(v: string) => emit('update', { sort: v })"
        >
          <el-option label="最新上传" value="newest" />
          <el-option label="下载最多" value="downloads" />
          <el-option label="手动顺序" value="manual" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">查看更多</el-divider>
      <el-form-item label="显示入口">
        <el-switch :model-value="data.show_more === true" @change="(v: boolean) => emit('update', { show_more: v })" />
      </el-form-item>
      <template v-if="data.show_more">
        <el-form-item label="按钮文案">
          <el-input
            :model-value="data.more_text"
            placeholder="查看更多资料 ›"
            @update:model-value="(v: string) => emit('update', { more_text: v })"
          />
        </el-form-item>
        <LinkPickerField
          label="跳转页面"
          :model-value="data.more_link"
          hint="默认资料库页"
          @update:model-value="(v: string) => emit('update', { more_link: v })"
        />
      </template>

      <ContentTagFilterFields :props="data" @update="(v) => emit('update', v)" />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { getFileGroups, getFileList, type FileGroupItem, type FileItemRecord } from '@/api/files'
import LinkPickerField from '../LinkPickerField.vue'
import ContentTagFilterFields from './ContentTagFilterFields.vue'

const { props: data } = defineProps<{ props: ComponentInstance['props'] }>()
const emit = defineEmits<{ update: [patch: Record<string, unknown>] }>()

const groups = ref<FileGroupItem[]>([])
const fileOptions = ref<FileItemRecord[]>([])
const fileLoading = ref(false)

onMounted(async () => {
  try {
    const res = await getFileGroups()
    groups.value = (res as any)?.data || res || []
  } catch {
    groups.value = []
  }
})

async function searchFiles(keyword: string) {
  fileLoading.value = true
  try {
    const res = await getFileList({ keyword, status: 'published', current: 1, size: 30 })
    fileOptions.value = (res as any)?.data?.records || []
  } finally {
    fileLoading.value = false
  }
}
</script>
