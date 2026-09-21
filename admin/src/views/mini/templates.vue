<template>
  <div class="mini-wb mw-page tpl-view" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="grid" />
    <template v-else>
    <div class="head">
      <div>
        <h1 class="h1">模板库</h1>
        <div class="sub">整店模板换整套风格；页面模板只新建一页</div>
      </div>
      <div class="actions">
        <button type="button" class="btn" :disabled="creating" @click="createFromCurrent">
          把当前小程序存为模板
        </button>
      </div>
    </div>

    <div class="tabs-line" role="tablist">
      <button type="button" role="tab" :class="{ on: tab === 'store' }" @click="tab = 'store'">
        整店模板 {{ storeTemplates.length }}
      </button>
      <button type="button" role="tab" :class="{ on: tab === 'page' }" @click="tab = 'page'">
        页面模板 {{ pageTemplates.length }}
      </button>
      <button type="button" role="tab" :class="{ on: tab === 'mine' }" @click="tab = 'mine'">
        我的模板 {{ myTemplates.length }}
      </button>
    </div>

    <div v-show="tab === 'store'" class="tpl-layout" :class="{ 'has-panel': impactVisible }">
      <div v-if="storeTemplates.length" class="tpl-grid">
        <div
          v-for="item in storeTemplates"
          :key="item.id"
          class="tpl"
          :class="{ using: isInUse(item), picked: pendingActivate?.id === Number(item.id) }"
        >
          <div class="tpl-art" :style="{ background: artBg(item) }">
            <div v-for="n in 3" :key="n"><i /><i /><i /></div>
          </div>
          <div class="tpl-body">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
              <b style="font-weight: 600">{{ displayName(item) }}</b>
              <span v-if="isInUse(item)" class="tag t-acc">使用中</span>
            </div>
            <div class="faint">
              {{ item.pageCount || 0 }} 个导航页 · 含导航与配色
            </div>
            <div style="display: flex; gap: 8px; margin-top: 4px">
              <button
                v-if="!isInUse(item)"
                type="button"
                class="btn sm primary"
                :disabled="activatingId === item.id"
                @click="confirmActivate(item)"
              >
                应用
              </button>
              <span v-else class="tag t-live">已应用</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="gen-empty" style="min-height: 200px; gap: 14px">
        <span>还没有整店模板</span>
        <button type="button" class="btn" :disabled="creating" @click="createFromCurrent">
          把当前小程序存为模板
        </button>
      </div>

      <aside v-if="impactVisible && pendingActivate" class="card impact-panel">
        <h2 class="h2">应用「{{ pendingActivate.name }}」</h2>
        <div class="sub" style="margin-bottom: 12px">应用前先看清会发生什么：</div>
        <div class="impact">
          <div>
            <b>底部导航变成 {{ impactTabs.length || impactPageCount }} 个</b>
            <span class="faint" v-if="impactTabs.length">
              {{ impactTabs.map((t) => t.text || '导航').join(' · ') }}
            </span>
          </div>
          <div>
            <b>新增约 {{ impactPageCount }} 个页面</b>
            <span class="faint">被替换的旧页进归档；「我的」个人中心不受影响</span>
          </div>
          <div>
            <b>{{ keepTheme ? '保留当前配色' : '品牌主色换成模板色' }}</b>
          </div>
        </div>
        <div class="note" style="margin: 12px 0">
          应用后只是「待发布」，用户看不到；在「发布」确认后才生效。
        </div>
        <label class="kv" style="align-items: center; cursor: pointer">
          <span>保留我的配色</span>
          <input v-model="keepTheme" type="checkbox" />
        </label>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px">
          <button type="button" class="btn sm" @click="impactVisible = false">取消</button>
          <button type="button" class="btn sm primary" :disabled="activatingId != null" @click="doActivate">
            确认应用
          </button>
        </div>
      </aside>
    </div>

    <div v-show="tab === 'page'">
      <div v-if="pageTemplates.length" class="tpl-grid">
        <div v-for="tpl in pageTemplates" :key="String(tpl.id || tpl.key)" class="tpl">
          <div class="tpl-art"><div><i /><i /><i /></div></div>
          <div class="tpl-body">
            <b style="font-weight: 600">{{ tpl.name }}</b>
            <div class="faint">{{ tpl.description || '单页' }}</div>
            <button type="button" class="btn sm primary" @click="applyPageTpl(tpl)">用这个新建</button>
          </div>
        </div>
      </div>
      <div v-else class="gen-empty" style="min-height: 200px; gap: 14px">
        <span>还没有页面模板</span>
        <button type="button" class="btn" @click="router.push('/mini/pages/new-ai')">用 AI 生成一页</button>
      </div>
    </div>

    <div v-show="tab === 'mine'">
      <div v-if="myTemplates.length" class="tpl-grid">
        <div v-for="item in myTemplates" :key="item.id" class="tpl" :class="{ using: isInUse(item) }">
          <div class="tpl-art"><div><i /><i /><i /></div></div>
          <div class="tpl-body">
            <b style="font-weight: 600">{{ displayName(item) }}</b>
            <div class="faint">我的模板 · {{ formatTime(item.updateTime || item.createTime) }}</div>
            <button
              v-if="!isInUse(item)"
              type="button"
              class="btn sm primary"
              @click="confirmActivate(item)"
            >
              应用
            </button>
          </div>
        </div>
      </div>
      <div v-else class="gen-empty" style="min-height: 200px; gap: 14px">
        <span>还没有我的模板</span>
        <button type="button" class="btn primary" :disabled="creating" @click="createFromCurrent">
          把当前小程序存为模板
        </button>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getStoreTemplates,
  activateStoreTemplate,
  createStoreTemplate,
  toReleaseId,
} from '@/api/version'
import { getPageTemplates } from '@/api/page'
import { getMiniSite } from '@/api/miniSite'
import { applyPageTemplate } from '@/components/page-templates/applyPageTemplate'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import type { ReleaseRecord } from '@/types/page'

defineOptions({ name: 'MiniTemplates' })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const loaded = ref(false)
const tab = ref<'store' | 'page' | 'mine'>((route.query.tab as any) === 'page' || route.query.tab === 'mine'
  ? (route.query.tab as 'page' | 'mine')
  : 'store')
const storeTemplates = ref<ReleaseRecord[]>([])
const pageTemplates = ref<any[]>([])
const creating = ref(false)
const activatingId = ref<number | null>(null)
const impactVisible = ref(false)
const pendingActivate = ref<{ id: number; name: string; raw: ReleaseRecord } | null>(null)
const impactTabs = ref<Array<{ text?: string; pagePath?: string; pageName?: string }>>([])
const currentTabBar = ref<typeof impactTabs.value>([])
const impactPageCount = ref(0)
const currentPageCount = ref(0)
const keepTheme = ref(true)
const siteTemplateId = ref<number | null>(null)

const myTemplates = computed(() =>
  storeTemplates.value.filter((r) => !(r as any).isSystem && !(r as any).systemTemplate),
)

function isInUse(item: ReleaseRecord) {
  if (siteTemplateId.value != null && Number(item.id) === Number(siteTemplateId.value)) return true
  return item.isCurrent === 1 || item.isCurrent === true
}

function displayName(item: ReleaseRecord) {
  return (item as any).templateName || item.releaseNotes || `模板 #${item.id}`
}

function formatTime(t?: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '—'
}

function artBg(item: ReleaseRecord) {
  const colors = ['#F4E3D3', '#E1E9F5', '#DDEFE4', '#F5E7CC', '#F3DDE6', '#E9E4DD']
  const id = Number(item.id) || 0
  return colors[id % colors.length]
}

async function confirmActivate(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) return
  pendingActivate.value = { id, name: displayName(item), raw: item }
  keepTheme.value = true
  const snap = (item as any).snapshot || (item as any).configSnapshot
  let tabs: any[] = []
  let pageCount = Number(item.pageCount || 0)
  try {
    const cfg = typeof snap === 'string' ? JSON.parse(snap) : snap
    tabs = cfg?.tabbarItems || cfg?.systemConfig?.tabbarItems || cfg?.tabBar || cfg?.tabs || []
    if (!pageCount && Array.isArray(cfg?.pages)) pageCount = cfg.pages.length
  } catch { /* ignore */ }
  impactTabs.value = Array.isArray(tabs) && tabs.length ? tabs : []
  impactPageCount.value = pageCount || impactTabs.value.length || 0
  impactVisible.value = true
}

async function doActivate() {
  if (!pendingActivate.value) return
  activatingId.value = pendingActivate.value.id
  try {
    await activateStoreTemplate(pendingActivate.value.id)
    ElMessage.success(
      keepTheme.value
        ? '已套用整店模板（已尽量保留站点信息），请去发布让用户看到'
        : '已套用整店模板，请去发布让用户看到',
    )
    impactVisible.value = false
    await load()
    router.push('/mini/publish')
  } catch (e: any) {
    ElMessage.error(e?.message || '套用失败')
  } finally {
    activatingId.value = null
  }
}

async function applyPageTpl(tpl: any) {
  try {
    const dsl = typeof tpl.dslContent === 'string' ? JSON.parse(tpl.dslContent) : (tpl.dsl || tpl.dslContent)
    if (!dsl) {
      ElMessage.warning('该模板无可用内容，请换一套或从空白页开始')
      return
    }
    const id = await applyPageTemplate({ name: tpl.name || '页面模板', dsl })
    ElMessage.success('已生成草稿页')
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: any) {
    ElMessage.error(e?.message || '套用失败')
  }
}

async function createFromCurrent() {
  creating.value = true
  try {
    await createStoreTemplate(`我的模板 ${new Date().toLocaleDateString()}`)
    ElMessage.success('已从当前站点新建模板')
    tab.value = 'mine'
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const [storeRes, pageRes, site] = await Promise.all([
      getStoreTemplates(),
      getPageTemplates({ current: 1, size: 50 }).catch(() => null),
      getMiniSite('draft').catch(() => null),
    ])
    storeTemplates.value = ((storeRes as any)?.data || []) as ReleaseRecord[]
    pageTemplates.value = ((pageRes as any)?.data?.records || (pageRes as any)?.data?.list || (pageRes as any)?.data || []) as any[]
    currentTabBar.value = site?.tabBar || []
    siteTemplateId.value = site?.templateId != null ? Number(site.templateId) : null
    const inUse = storeTemplates.value.find((r) => isInUse(r))
    currentPageCount.value = Number(inUse?.pageCount || currentTabBar.value.length || 0)
  } catch (e: any) {
    ElMessage.error(e?.message || '加载模板失败')
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.tpl-view.mw-page {
  margin: -16px;
}
.impact {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  b { font-weight: 500; display: block; }
}
.impact-panel {
  position: sticky;
  top: 84px;
}
.tpl-layout.has-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;
}
.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
</style>
