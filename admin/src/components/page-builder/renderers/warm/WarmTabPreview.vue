<template>
  <div class="warm-tab-preview" :class="'warm-tab-preview--' + variant">
    <div v-if="loading" class="warm-tab-preview__state">加载中…</div>
    <div v-else-if="error" class="warm-tab-preview__state">{{ error }}</div>

    <!-- 发现 -->
    <template v-else-if="variant === 'discover'">
      <div class="dc-tabs">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          class="dc-tab"
          :class="{ on: tab.key === activeTabKey }"
          @click="activeTabKey = tab.key"
        >{{ tab.label }}</span>
      </div>
      <div v-if="chips.length" class="dc-chips">
        <span v-for="(c, i) in chips" :key="i" class="dc-chip">{{ c.label }}</span>
      </div>
      <div class="dc-grid">
        <div v-for="item in items" :key="String(item.id)" class="dc-card">
          <img v-if="item.cover" class="dc-card__img" :src="item.cover" alt="" />
          <div class="dc-card__t">{{ item.title }}</div>
        </div>
      </div>
      <div v-if="!items.length" class="warm-tab-preview__state">暂无内容</div>
    </template>

    <!-- 星球 -->
    <template v-else-if="variant === 'planet'">
      <div class="pl-hero">
        <div class="pl-hero__t">{{ planet.title || '暖阁星球' }}</div>
        <div class="pl-hero__d">{{ planet.subtitle || planet.members || '社区与讨论' }}</div>
      </div>
      <div v-for="(row, i) in planetTopics" :key="i" class="pl-row">
        <span class="pl-row__tag">{{ row.tag }}</span>
        <span class="pl-row__tx">{{ row.text || row.title }}</span>
      </div>
    </template>

    <!-- 商城 -->
    <template v-else-if="variant === 'shop'">
      <div class="sh-hd">{{ title || '暖阁商城' }}</div>
      <div class="sh-grid">
        <div v-for="p in products" :key="String(p.id)" class="sh-card">
          <img v-if="p.cover" :src="String(p.cover)" alt="" />
          <div class="sh-card__t">{{ p.title || p.name }}</div>
          <div class="sh-card__p">{{ p.price }}</div>
        </div>
      </div>
    </template>

    <!-- 我的 -->
    <template v-else-if="variant === 'mine'">
      <div class="mine-hd">
        <div class="mine-hd__av" />
        <div>
          <div class="mine-hd__name">{{ mine.nickname || '微信用户' }}</div>
          <div class="mine-hd__sub">与真机一致需登录；预览展示布局结构</div>
        </div>
      </div>
      <div v-for="(m, i) in mineMenus" :key="i" class="mine-row">{{ m.label || m.title }}</div>
    </template>

    <template v-else>
      <div class="warm-tab-preview__state">{{ title || '暖阁固定页' }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { get } from '@/api/request'
import { defaultWarmDiscoverProps } from '@/constants/warmDiscoverDefaults'
import type { DiscoverTab } from '@/constants/warmDiscoverDefaults'

const props = defineProps<{
  path: string
  shellProps?: Record<string, unknown>
}>()

const loading = ref(true)
const error = ref('')
const items = ref<Array<{ id: unknown; title: string; cover?: string }>>([])
const products = ref<Array<Record<string, unknown>>>([])
const planet = ref<Record<string, unknown>>({})
const planetTopics = ref<Array<Record<string, unknown>>>([])
const mine = ref<Record<string, unknown>>({})
const mineMenus = ref<Array<Record<string, unknown>>>([])
const activeTabKey = ref('all')

const variant = computed(() => {
  const p = props.path || ''
  if (p.includes('warm-discover') || p.includes('discover')) return 'discover'
  if (p.includes('warm-planet') || p.includes('planet')) return 'planet'
  if (p.includes('warm-shop') || p.includes('shop')) return 'shop'
  if (p.includes('warm-mine') || p.includes('mine')) return 'mine'
  return 'other'
})

const title = computed(() => String(props.shellProps?.title || ''))

const tabs = computed<DiscoverTab[]>(() => {
  const raw = props.shellProps?.tabs
  if (Array.isArray(raw) && raw.length) return raw as DiscoverTab[]
  return defaultWarmDiscoverProps().tabs as DiscoverTab[]
})

const chips = computed(() => {
  const tab = tabs.value.find((t) => t.key === activeTabKey.value) || tabs.value[0]
  return (tab?.chips || []).slice(0, 10)
})

async function loadDiscover() {
  const res = await get<{ records?: unknown[] }>('/api/v1/mp/contents', {
    page: 1,
    pageSize: 12,
    status: 'published',
  }, { showError: false } as any)
  const list = (res as any)?.data?.records || (res as any)?.data || []
  items.value = (Array.isArray(list) ? list : []).slice(0, 12).map((row: any) => ({
    id: row.id,
    title: row.title || row.name || '未命名',
    cover: row.coverUrl || row.cover || row.thumb,
  }))
}

async function loadPlanet() {
  const res = await get<Record<string, unknown>>('/api/v1/mp/planet/home', undefined, { showError: false } as any)
  const data = (res as any)?.data || {}
  planet.value = data
  planetTopics.value = Array.isArray(data.items) ? data.items : (Array.isArray(data.topics) ? data.topics : [])
}

async function loadShop() {
  const res = await get<{ records?: unknown[] }>('/api/v1/mp/products', {
    page: 1,
    pageSize: 8,
    status: 1,
  }, { showError: false } as any)
  const list = (res as any)?.data?.records || (res as any)?.data || []
  products.value = (Array.isArray(list) ? list : []).slice(0, 8).map((row: any) => ({
    id: row.id,
    title: row.title || row.name,
    cover: row.coverUrl || row.cover || row.mainImage,
    price: row.price != null ? `¥${row.price}` : '',
  }))
}

async function loadMine() {
  try {
    const res = await get<Record<string, unknown>>('/api/v1/mp/mine/overview', undefined, { showError: false } as any)
    mine.value = (res as any)?.data || {}
    mineMenus.value = Array.isArray((mine.value as any).menus) ? (mine.value as any).menus : [
      { label: '我的订单' },
      { label: '会员中心' },
      { label: '设置' },
    ]
  } catch {
    mineMenus.value = [{ label: '我的订单' }, { label: '会员中心' }, { label: '设置' }]
  }
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    if (variant.value === 'discover') await loadDiscover()
    else if (variant.value === 'planet') await loadPlanet()
    else if (variant.value === 'shop') await loadShop()
    else if (variant.value === 'mine') await loadMine()
  } catch (e: any) {
    error.value = e?.message || '预览数据加载失败'
  } finally {
    loading.value = false
  }
}

watch(() => props.path, () => { void reload() }, { immediate: true })
watch(activeTabKey, () => { if (variant.value === 'discover') void loadDiscover() })

onMounted(() => { void reload() })
</script>

<style scoped>
.warm-tab-preview {
  background: #fdf6ec;
  min-height: 120px;
  color: #2a1c12;
  font-size: 13px;
}
.warm-tab-preview__state {
  padding: 24px 16px;
  text-align: center;
  color: #a1897a;
}
.dc-tabs {
  display: flex;
  gap: 16px;
  padding: 12px 16px 8px;
  overflow-x: auto;
}
.dc-tab {
  font-weight: 650;
  color: #a1897a;
  white-space: nowrap;
}
.dc-tab.on {
  color: #2a1c12;
  font-weight: 800;
  border-bottom: 2px solid #ea580c;
}
.dc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 12px;
}
.dc-chip {
  padding: 4px 10px;
  border-radius: 8px;
  background: #f8ecdd;
  font-size: 12px;
}
.dc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 12px 16px;
}
.dc-card {
  background: #fffaf3;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #f0dcc4;
}
.dc-card__img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  background: #f8ecdd;
}
.dc-card__t {
  padding: 8px;
  font-size: 12px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pl-hero {
  padding: 20px 16px;
  background: linear-gradient(135deg, #7c2d12, #b45309);
  color: #fff;
}
.pl-hero__t { font-size: 18px; font-weight: 700; }
.pl-hero__d { margin-top: 6px; opacity: 0.85; font-size: 12px; }
.pl-row {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(120,72,40,.1);
}
.pl-row__tag { font-weight: 700; color: #c2410c; }
.sh-hd { padding: 16px; font-size: 17px; font-weight: 700; }
.sh-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 12px 16px; }
.sh-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #f0dcc4;
}
.sh-card img { width: 100%; height: 90px; object-fit: cover; }
.sh-card__t { padding: 6px 8px; font-size: 12px; }
.sh-card__p { padding: 0 8px 8px; color: #c2410c; font-weight: 700; }
.mine-hd {
  display: flex;
  gap: 12px;
  padding: 20px 16px;
  background: linear-gradient(180deg, #f7e0c3, #fdf6ec);
}
.mine-hd__av {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f2dcc0;
}
.mine-hd__name { font-weight: 700; }
.mine-hd__sub { font-size: 11px; color: #6b5443; margin-top: 4px; }
.mine-row {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(120,72,40,.08);
}
</style>
