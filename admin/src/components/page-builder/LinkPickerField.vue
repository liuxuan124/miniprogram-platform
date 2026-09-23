<template>
  <div class="link-picker">
    <el-select
      :model-value="linkType"
      style="width: 96px; flex-shrink: 0"
      @update:model-value="onTypeChange"
    >
      <el-option label="页面" value="page" />
      <el-option label="网页" value="webview" />
      <el-option label="链接" value="url" />
      <el-option label="小程序" value="miniapp" />
      <el-option label="电话" value="phone" />
      <el-option label="无" value="none" />
    </el-select>
    <template v-if="linkType === 'page'">
      <el-select
        :model-value="linkUrl"
        filterable
        remote
        clearable
        placeholder="搜索页面名称或路径"
        style="flex: 1; min-width: 0"
        :remote-method="searchPages"
        :loading="pageLoading"
        @update:model-value="onUrlChange"
      >
        <el-option
          v-for="p in pageOptions"
          :key="p.id"
          :label="`${p.name} · ${p.path}`"
          :value="p.path"
        />
      </el-select>
    </template>
    <el-input
      v-else-if="linkType !== 'none'"
      :model-value="linkUrl"
      :placeholder="placeholder"
      style="flex: 1; min-width: 0"
      @update:model-value="onUrlChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPageList } from '@/api/page'

const props = defineProps<{
  linkType?: string
  linkUrl?: string
}>()

const emit = defineEmits<{
  'update:linkType': [value: string]
  'update:linkUrl': [value: string]
}>()

const linkType = computed(() => props.linkType || 'page')
const linkUrl = computed(() => props.linkUrl || '')

const placeholder = computed(() => {
  if (linkType.value === 'phone') return '电话号码'
  if (linkType.value === 'miniapp') return 'AppId|路径'
  return '链接地址'
})

const pageLoading = ref(false)
const pageOptions = ref<Array<{ id: number; name: string; path: string }>>([])

async function searchPages(query: string) {
  pageLoading.value = true
  try {
    const res = await getPageList({ current: 1, size: 30, keyword: query || undefined })
    const records = (res as any)?.data?.records || (res as any)?.data?.list || []
    pageOptions.value = (Array.isArray(records) ? records : []).map((r: any) => ({
      id: Number(r.id),
      name: String(r.name || '未命名'),
      path: String(r.path || ''),
    }))
  } catch {
    pageOptions.value = []
  } finally {
    pageLoading.value = false
  }
}

function onTypeChange(v: string) {
  emit('update:linkType', v)
  if (v === 'none') emit('update:linkUrl', '')
}

function onUrlChange(v: string) {
  emit('update:linkUrl', v)
}

onMounted(() => {
  void searchPages('')
})
</script>

<style scoped>
.link-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
</style>
