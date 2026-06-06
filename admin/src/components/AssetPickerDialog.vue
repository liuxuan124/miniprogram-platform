<template>
  <el-dialog v-model="visible" title="从素材库选择图片" width="760px" destroy-on-close>
    <div class="asset-picker">
      <div class="asset-toolbar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索素材名称"
          prefix-icon="Search"
          @keyup.enter="fetchAssets"
        />
        <el-button icon="Refresh" @click="fetchAssets">刷新</el-button>
      </div>

      <div v-loading="loading" class="asset-grid">
        <button
          v-for="item in assets"
          :key="item.id"
          type="button"
          class="asset-card"
          :class="{ active: selectedUrl === item.url }"
          @click="selectedUrl = item.url"
        >
          <img :src="resolveAssetUrl(item.thumbUrl || item.url)" :alt="item.name" />
          <span>{{ item.name || '未命名素材' }}</span>
        </button>
        <el-empty v-if="!loading && assets.length === 0" description="暂无图片素材" />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="!selectedUrl" @click="confirmSelect">选择图片</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { get } from '@/api/request'

interface AssetItem {
  id: number
  name: string
  type: string
  url: string
  thumbUrl?: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', url: string): void
}>()

const keyword = ref('')
const loading = ref(false)
const assets = ref<AssetItem[]>([])
const selectedUrl = ref('')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function resolveAssetUrl(url: string) {
  if (!url) return ''
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return `${window.location.origin}/${url}`
}

async function fetchAssets() {
  loading.value = true
  try {
    const res = await get<any>('/api/v1/admin/assets', {
      current: 1,
      size: 100,
      type: 'image',
      keyword: keyword.value || undefined,
    })
    assets.value = (res.data?.records || []).filter((item: AssetItem) => item.url)
  } finally {
    loading.value = false
  }
}

function confirmSelect() {
  if (!selectedUrl.value) return
  emit('select', resolveAssetUrl(selectedUrl.value))
  visible.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selectedUrl.value = ''
      fetchAssets()
    }
  }
)
</script>

<style scoped>
.asset-picker {
  display: grid;
  gap: 14px;
}

.asset-toolbar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}

.asset-grid {
  min-height: 260px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 12px;
}

.asset-card {
  height: 144px;
  padding: 8px;
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 8px;
  border: 1px solid #dfe6f1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.asset-card:hover,
.asset-card.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.14);
}

.asset-card img {
  width: 100%;
  height: 96px;
  object-fit: cover;
  border-radius: 6px;
  background: #f5f7fb;
}

.asset-card span {
  min-width: 0;
  color: #4b5568;
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
