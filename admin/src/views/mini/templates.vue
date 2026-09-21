<template>
  <div class="mini-page" v-loading="loading">
    <header class="page-head">
      <div>
        <div class="page-head__kicker">小程序 · 模板库</div>
        <h1>模板库</h1>
        <p>整店模板改导航与版式；页面模板只生成单页草稿。套用后请去发布。</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </header>

    <el-tabs v-model="tab" class="mini-tabs">
      <el-tab-pane label="整店" name="store" />
      <el-tab-pane label="页面" name="page" />
      <el-tab-pane label="我的" name="mine" />
    </el-tabs>

    <section v-show="tab === 'store'" class="panel">
      <div v-if="storeTemplates.length" class="card-grid">
        <div
          v-for="item in storeTemplates"
          :key="item.id"
          class="tpl-card"
          :class="{ live: isInUse(item) }"
        >
          <div class="tpl-card__badges">
            <span v-if="isInUse(item)" class="badge live">使用中</span>
            <span v-else class="badge">备用</span>
          </div>
          <div class="tpl-card__name">{{ displayName(item) }}</div>
          <div class="tpl-card__meta">{{ item.pageCount || 0 }} 页 · {{ formatTime(item.updateTime || item.createTime) }}</div>
          <div class="tpl-card__actions">
            <el-button
              v-if="!isInUse(item)"
              type="primary"
              size="small"
              class="btn-terracotta"
              :loading="activatingId === item.id"
              @click="confirmActivate(item)"
            >
              套用
            </el-button>
            <el-tag v-else size="small" type="success" effect="plain">当前模板</el-tag>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无整店模板" />
    </section>

    <section v-show="tab === 'page'" class="panel">
      <div v-if="pageTemplates.length" class="card-grid">
        <div v-for="tpl in pageTemplates" :key="String(tpl.id || tpl.key)" class="tpl-card">
          <div class="tpl-card__name">{{ tpl.name }}</div>
          <div class="tpl-card__meta">{{ tpl.description || '单页模板' }}</div>
          <div class="tpl-card__actions">
            <el-button size="small" type="primary" class="btn-terracotta" @click="applyPageTpl(tpl)">套用为草稿</el-button>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无页面模板" />
    </section>

    <section v-show="tab === 'mine'" class="panel">
      <el-empty description="将当前站点另存为整店模板，可在下方操作">
        <el-button type="primary" class="btn-terracotta" :loading="creating" @click="createFromCurrent">从当前新建</el-button>
      </el-empty>
      <div v-if="myTemplates.length" class="card-grid" style="margin-top: 16px">
        <div v-for="item in myTemplates" :key="item.id" class="tpl-card">
          <div class="tpl-card__name">{{ displayName(item) }}</div>
          <div class="tpl-card__meta">我的模板 · {{ formatTime(item.updateTime || item.createTime) }}</div>
          <div class="tpl-card__actions">
            <el-button
              v-if="!isInUse(item)"
              size="small"
              type="primary"
              class="btn-terracotta"
              @click="confirmActivate(item)"
            >
              套用
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <el-drawer v-model="impactVisible" title="套用整店模板 · 影响预览" size="440px">
      <p class="impact-lead">
        套用「{{ pendingActivate?.name }}」后为<strong>待发布</strong>，用户看不到，需在发布页确认。
      </p>
      <h3 class="impact-h">底部导航将变成</h3>
      <ul v-if="impactTabs.length" class="impact-list">
        <li v-for="(t, i) in impactTabs" :key="i">
          {{ i + 1 }}. {{ t.text || `导航 ${i + 1}` }} → {{ t.pagePath || t.pageName || '未绑定' }}
        </li>
      </ul>
      <el-empty v-else description="模板未带导航快照，套用后以模板侧配置为准" :image-size="48" />

      <h3 class="impact-h">页面影响</h3>
      <ul class="impact-list">
        <li>模板约 {{ impactPageCount }} 页；当前站点约 {{ currentPageCount }} 页</li>
        <li>被替换的旧页会进入「归档」，可一键恢复</li>
        <li>系统页「我的」不受影响</li>
      </ul>

      <h3 class="impact-h">配色</h3>
      <el-checkbox v-model="keepTheme">保留我的配色（不覆盖主题色）</el-checkbox>
      <p class="impact-note">{{ keepTheme ? '将尽量保留当前主题配置' : '模板配色将覆盖当前主题（写入草稿）' }}</p>

      <template #footer>
        <el-button @click="impactVisible = false">取消</el-button>
        <el-button type="primary" class="btn-terracotta" :loading="activatingId != null" @click="doActivate">
          确认套用
        </el-button>
      </template>
    </el-drawer>
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
import type { ReleaseRecord } from '@/types/page'

defineOptions({ name: 'MiniTemplates' })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
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
    // keepTheme：一期文案提示；后端 activate 暂无独立配色开关，后续可接
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
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.mini-page {
  --mini-bg: #f6f2ec;
  --mini-terracotta: #b4430f;
  --mini-ink: #2c241c;
  --mini-muted: #7a6e64;
  --mini-card: #fffcf8;
  --mini-border: #e5ddd2;
  min-height: 100%;
  margin: -16px;
  padding: 20px 24px 40px;
  background: var(--mini-bg);
  color: var(--mini-ink);
}
.page-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  h1 { margin: 4px 0; font-size: 24px; }
  p { margin: 0; color: var(--mini-muted); font-size: 13px; max-width: 560px; }
}
.page-head__kicker { font-size: 12px; color: var(--mini-muted); }
.btn-terracotta {
  --el-button-bg-color: var(--mini-terracotta);
  --el-button-border-color: var(--mini-terracotta);
  --el-button-hover-bg-color: #9a390d;
  --el-button-hover-border-color: #9a390d;
}
.mini-tabs :deep(.el-tabs__item.is-active) { color: var(--mini-terracotta); }
.mini-tabs :deep(.el-tabs__active-bar) { background: var(--mini-terracotta); }
.panel {
  background: var(--mini-card);
  border: 1px solid var(--mini-border);
  border-radius: 12px;
  padding: 16px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.tpl-card {
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--mini-border);
  background: #f8f4ee;
  &.live { border-color: #d4a88a; background: #fdf6ef; }
}
.tpl-card__badges { margin-bottom: 8px; }
.badge {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #ebe4da;
  color: var(--mini-muted);
  &.live { background: #f3ddd0; color: var(--mini-terracotta); }
}
.tpl-card__name { font-weight: 600; margin-bottom: 4px; }
.tpl-card__meta { font-size: 12px; color: var(--mini-muted); margin-bottom: 12px; line-height: 1.4; }
.impact-lead { color: var(--mini-muted); font-size: 13px; line-height: 1.5; }
.impact-h { font-size: 14px; margin: 16px 0 8px; }
.impact-list { margin: 0; padding-left: 18px; color: var(--mini-ink); line-height: 1.7; }
.impact-note { margin: 8px 0 0; font-size: 12px; color: var(--mini-muted); }
</style>
