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
            <MiniIcon name="upload" :size="15" />
            把当前小程序存为模板
          </button>
        </div>
      </div>

      <div class="tabs-line" role="tablist">
        <button type="button" role="tab" :class="{ on: tab === 'store' }" @click="tab = 'store'">
          整店模板 {{ storeTabTotal }}
        </button>
        <button type="button" role="tab" :class="{ on: tab === 'page' }" @click="tab = 'page'">
          页面模板 {{ pageTabTotal }}
        </button>
        <button type="button" role="tab" :class="{ on: tab === 'mine' }" @click="tab = 'mine'">
          我的模板 {{ mineTabTotal }}
        </button>
        <div class="scene-chips">
          <button
            v-for="s in sceneChips"
            :key="s.key"
            type="button"
            class="chip"
            :class="{ on: sceneFilter === s.key }"
            @click="sceneFilter = s.key"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div v-show="tab === 'store'" class="list-meta muted">共 {{ filteredStoreTemplates.length }} 个</div>

      <div v-show="tab === 'store'" class="tpl-layout" :class="{ 'has-panel': sidePanel !== 'none' }">
        <div v-if="filteredStoreTemplates.length" class="tpl-grid">
          <article
            v-for="item in filteredStoreTemplates"
            :key="item.id"
            class="tpl"
            :class="{ using: isInUse(item), picked: pendingActivate?.id === Number(item.id) }"
          >
            <div class="tpl-art" :class="{ 'tpl-art--img': !!storeThumb(item) }" :style="tplArtStyle(item)">
              <img v-if="storeThumb(item)" class="tpl-art-img" :src="storeThumb(item)" alt="" loading="lazy" />
              <div
                v-else
                v-for="n in 3"
                :key="n"
                class="tpl-phone"
                :style="{ height: `${130 - (n - 1) * 14}px`, opacity: 1 - (n - 1) * 0.15 }"
              >
                <i :style="{ height: '16px', background: accentOf(item) }" />
                <i /><i style="width: 70%" />
              </div>
            </div>
            <div class="tpl-body">
              <div class="tpl-title-row">
                <b class="tpl-title" :title="displayNameFull(item)">{{ displayNameFull(item) }}</b>
                <span v-if="isInUse(item)" class="tag t-acc">
                  {{ isLiveTemplate(item) ? '当前使用中' : '待发布' }}
                </span>
              </div>
              <div class="faint">
                {{ sceneLabelForStore(item) }} · {{ item.pageCount || 0 }} 个导航页 · 含导航与配色
              </div>
              <div class="tpl-actions">
                <button type="button" class="btn sm" @click="previewStore(item)">
                  <MiniIcon name="eye" :size="14" />
                  预览
                </button>
                <button type="button" class="btn sm" @click="previewStoreQr(item)">
                  <MiniIcon name="qr" :size="14" />
                  扫码
                </button>
                <button
                  v-if="!isInUse(item)"
                  type="button"
                  class="btn sm soft"
                  :disabled="activatingId === item.id"
                  @click="confirmActivate(item)"
                >
                  应用
                </button>
                <button v-else type="button" class="btn sm" disabled>当前使用中</button>
                <button type="button" class="btn sm" @click="duplicateStore(item)">复制</button>
                <button type="button" class="btn sm" @click="openEditStoreMeta(item)">编辑</button>
                <button
                  v-if="canDeleteStore(item)"
                  type="button"
                  class="btn sm tpl-btn-danger"
                  @click="deleteStore(item)"
                >
                  删除
                </button>
              </div>
              <div v-if="!isSystemStore(item)" class="tpl-actions tpl-actions--sub">
                <button type="button" class="btn sm soft" @click="editStoreSite(item)">编辑站点</button>
                <button type="button" class="btn sm soft" @click="captureStoreFromSite(item)">覆盖保存</button>
              </div>
            </div>
          </article>
          <button type="button" class="tpl tpl-add" :disabled="creating" @click="createFromCurrent">
            <span class="tpl-add__plus">+</span>
            <span>把当前小程序存为模板</span>
          </button>
        </div>
        <div v-else class="gen-empty" style="min-height: 200px; gap: 14px">
          <span>{{ sceneFilter === 'all' ? '还没有整店模板' : '这个场景下还没有模板' }}</span>
          <button type="button" class="btn" :disabled="creating" @click="createFromCurrent">
            把当前小程序存为模板
          </button>
        </div>

        <TemplatePreviewPanel
          v-if="sidePanel === 'preview' && previewTitle && previewSrc"
          :title="previewTitle"
          :preview-src="previewSrc"
          :loading="previewLoading"
          :show-apply="previewKind === 'store'"
          :show-qr="previewKind === 'store'"
          @close="closeSidePanel"
          @apply="applyFromPreview"
          @qr="qrFromPreview"
        />

        <aside v-if="sidePanel === 'impact' && pendingActivate" class="card impact-panel">
          <h2 class="h2" style="font-size: 17px">应用「{{ pendingActivate.name }}」</h2>
          <div class="muted" style="font-size: 13px; margin-bottom: 4px">应用前先看清会发生什么：</div>
          <div class="impact">
            <div>
              <span class="impact-ic"><MiniIcon name="tab" :size="16" /></span>
              <span>
                <b>底部导航变成 {{ impactTabs.length || impactPageCount }} 个</b>
                <span class="faint" v-if="impactTabs.length">
                  {{ impactTabs.map((t) => t.text || '导航').join(' / ') }}
                </span>
              </span>
            </div>
            <div>
              <span class="impact-ic"><MiniIcon name="page" :size="16" /></span>
              <span>
                <b>新增约 {{ impactPageCount }} 个页面</b>
                <span class="faint">被替换的旧页进归档；「我的」个人中心不受影响</span>
              </span>
            </div>
            <div>
              <span class="impact-ic"><MiniIcon name="palette" :size="16" /></span>
              <span>
                <b>{{ keepTheme ? '保留当前配色' : '品牌主色换成模板色' }}</b>
              </span>
            </div>
            <div>
              <span class="impact-ic" style="color: var(--g)"><MiniIcon name="lock" :size="16" /></span>
              <span><b>「我的」个人中心不受影响</b></span>
            </div>
          </div>
          <div class="note" style="margin: 12px 0">
            确认后会切换页面与导航草稿；请到「外观/概览」点「保存并同步」后才会更新线上配置。
          </div>
          <label style="display: flex; gap: 8px; align-items: center; font-size: 13px; cursor: pointer">
            <input v-model="keepTheme" type="checkbox" />
            保留我的配色
          </label>
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px">
            <button type="button" class="btn" @click="closeSidePanel">取消</button>
            <button type="button" class="btn primary" :disabled="activatingId != null" @click="doActivate">
              确认应用
            </button>
          </div>
        </aside>
      </div>

      <div v-show="tab === 'page'">
        <div class="list-meta muted">共 {{ filteredPageTemplates.length }} 个</div>
        <div v-if="filteredPageTemplates.length" class="tpl-grid">
          <article v-for="tpl in filteredPageTemplates" :key="String(tpl.id || tpl.key)" class="tpl">
            <div class="tpl-art tpl-art--img" :style="{ background: pageArtBg(tpl) }">
              <img class="tpl-art-img" :src="pageThumb(tpl)" alt="" loading="lazy" />
            </div>
            <div class="tpl-body">
              <b>{{ tpl.name }}</b>
              <div class="faint">{{ pageTemplateSubtitle(tpl) }} · {{ sceneLabelForPage(tpl) }}</div>
              <div class="tpl-actions">
                <button type="button" class="btn sm" @click="openPagePreview(tpl)">
                  <MiniIcon name="eye" :size="14" />
                  预览
                </button>
                <button type="button" class="btn sm soft" @click="applyPageTpl(tpl)">用这个新建</button>
                <button
                  v-if="canEditPageTpl(tpl)"
                  type="button"
                  class="btn sm"
                  @click="goEditPageTpl(tpl)"
                >
                  编辑
                </button>
                <button
                  v-if="canDeletePageTpl(tpl)"
                  type="button"
                  class="btn sm tpl-btn-danger"
                  @click="deletePageTpl(tpl)"
                >
                  删除
                </button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="gen-empty" style="min-height: 200px; gap: 14px">
          <span>{{ sceneFilter === 'all' ? '还没有页面模板' : '这个场景下还没有模板' }}</span>
          <button type="button" class="btn" @click="router.push('/mini/pages/new-ai')">用 AI 生成一页</button>
        </div>
      </div>

      <div v-show="tab === 'mine'">
        <div class="list-meta muted">共 {{ filteredMineTemplates.length }} 个</div>
        <div v-if="filteredMineTemplates.length" class="tpl-grid">
          <article
            v-for="item in filteredMineTemplates"
            :key="item.id"
            class="tpl"
            :class="{ using: isInUse(item) }"
          >
            <div class="tpl-art" :class="{ 'tpl-art--img': !!storeThumb(item) }" :style="tplArtStyle(item)">
              <img v-if="storeThumb(item)" class="tpl-art-img" :src="storeThumb(item)" alt="" loading="lazy" />
              <div v-else class="tpl-phone" style="height: 130px">
                <i :style="{ height: '16px', background: accentOf(item) }" /><i /><i style="width: 70%" />
              </div>
            </div>
            <div class="tpl-body">
              <b class="tpl-title" :title="displayNameFull(item)">{{ displayNameFull(item) }}</b>
              <div class="faint">
                {{ sceneLabelForStore(item) }} · {{ formatTime(item.updateTime || item.createTime) }}
              </div>
              <div class="tpl-actions">
                <button
                  v-if="!isInUse(item)"
                  type="button"
                  class="btn sm soft"
                  @click="confirmActivate(item)"
                >
                  应用
                </button>
                <button v-else type="button" class="btn sm" disabled>当前使用中</button>
                <button type="button" class="btn sm" @click="duplicateStore(item)">复制</button>
                <button type="button" class="btn sm" @click="openEditStoreMeta(item)">编辑</button>
                <button
                  v-if="canDeleteStore(item)"
                  type="button"
                  class="btn sm tpl-btn-danger"
                  @click="deleteStore(item)"
                >
                  删除
                </button>
              </div>
              <div class="tpl-actions tpl-actions--sub">
                <button type="button" class="btn sm soft" @click="editStoreSite(item)">编辑站点</button>
                <button type="button" class="btn sm soft" @click="captureStoreFromSite(item)">覆盖保存</button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="gen-empty" style="min-height: 200px; gap: 14px">
          <span>还没有我的模板</span>
          <button type="button" class="btn primary" :disabled="creating" @click="createFromCurrent">
            把当前小程序存为模板
          </button>
        </div>
      </div>
    </template>

    <MiniH5QrDialog
      v-model="qrVisible"
      mode="release"
      :release-id="qrReleaseId"
      title="扫码预览模板"
      hint="手机浏览器打开 H5 整站预览（模板快照）。配置微信后可在发布页上传体验版。"
    />

    <SaveStoreTemplateDialog
      ref="saveDialogRef"
      v-model="saveDialogVisible"
      :mode="saveDialogMode"
      :name-locked="saveNameLocked"
      :default-name="saveDefaultName"
      :default-scene="saveDefaultScene"
      :default-description="saveDefaultDescription"
      :default-cover-url="saveDefaultCover"
      @submit="onSaveTemplateSubmit"
    />

    <el-dialog
      v-model="previewDialogVisible"
      :title="previewTitle || '模板预览'"
      width="min(420px, 96vw)"
      destroy-on-close
      class="tpl-preview-dialog"
      @closed="onPreviewDialogClosed"
    >
      <div v-loading="previewLoading" class="tpl-preview-dialog-body">
        <div v-if="previewKind === 'store'" class="tpl-preview-actions">
          <button type="button" class="btn sm primary" @click="applyFromPreview">应用这套</button>
          <button type="button" class="btn sm" @click="qrFromPreview">
            <MiniIcon name="qr" :size="14" />
            扫码
          </button>
        </div>
        <DevicePreview
          v-if="previewSrc"
          frame-only
          :preview-url="previewSrc"
          iframe-key="tpl-dialog"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getStoreTemplates,
  activateStoreTemplate,
  createStoreTemplate,
  duplicateStoreTemplate,
  updateStoreTemplate,
  captureStoreTemplate,
  deleteRelease,
  getReleaseDetail,
  toReleaseId,
} from '@/api/version'
import { deleteTemplate, getPageTemplates } from '@/api/page'
import { getMiniSite } from '@/api/miniSite'
import { createPreviewDraft } from '@/api/preview-draft'
import { applyPageTemplate, isUserCancelError } from '@/components/page-templates/applyPageTemplate'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import SaveStoreTemplateDialog from '@/components/mini/SaveStoreTemplateDialog.vue'
import TemplatePreviewPanel from '@/components/mini/TemplatePreviewPanel.vue'
import type { ReleaseRecord } from '@/types/page'
import { pageTemplateThumbUrl, storeTemplateThumbUrl } from '@/utils/template-thumb'
import {
  TEMPLATE_SCENE_CHIPS,
  TEMPLATE_SCENE_LABEL,
  matchesTemplateSceneFilter,
  resolvePageTemplateScene,
  resolveStoreTemplateScene,
  type TemplateSceneKey,
} from '@/constants/templateScenes'
import { pageTemplateSubtitle } from '@/utils/pageTemplateMeta'
import { apiErrorMessage, shouldShowLocalError } from '@/utils/apiError'

defineOptions({ name: 'MiniTemplates' })

const WIDE_PREVIEW_PX = 1180
const sceneChips = TEMPLATE_SCENE_CHIPS

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const loaded = ref(false)
const tab = ref<'store' | 'page' | 'mine'>((route.query.tab as any) === 'page' || route.query.tab === 'mine'
  ? (route.query.tab as 'page' | 'mine')
  : 'store')
const sceneFilter = ref<TemplateSceneKey>('all')
const storeTemplates = ref<ReleaseRecord[]>([])
const pageTemplates = ref<any[]>([])
const creating = ref(false)
const activatingId = ref<number | null>(null)
const sidePanel = ref<'none' | 'impact' | 'preview'>('none')
const pendingActivate = ref<{ id: number; name: string; raw: ReleaseRecord } | null>(null)
const impactTabs = ref<Array<{ text?: string; pagePath?: string; pageName?: string }>>([])
const currentTabBar = ref<typeof impactTabs.value>([])
const impactPageCount = ref(0)
const currentPageCount = ref(0)
const keepTheme = ref(true)
const siteTemplateId = ref<number | null>(null)
const liveTemplateId = ref<number | null>(null)
const siteName = ref('我的小程序')

const previewKind = ref<'store' | 'page'>('store')
const previewTitle = ref('')
const previewSrc = ref('')
const previewLoading = ref(false)
const previewDialogVisible = ref(false)
const previewStoreItem = ref<ReleaseRecord | null>(null)
const previewPageItem = ref<Record<string, unknown> | null>(null)
const viewportWide = ref(typeof window !== 'undefined' ? window.innerWidth >= WIDE_PREVIEW_PX : true)

const saveDialogVisible = ref(false)
const saveDialogMode = ref<'create' | 'edit'>('create')
const saveNameLocked = ref(false)
const editingStoreId = ref<number | null>(null)
const saveDefaultName = ref('')
const saveDefaultScene = ref('')
const saveDefaultDescription = ref('')
const saveDefaultCover = ref('')
const saveDialogRef = ref<InstanceType<typeof SaveStoreTemplateDialog> | null>(null)

const myTemplates = computed(() =>
  storeTemplates.value.filter((r) => {
    const sys = (r as any).isSystem === 1 || (r as any).is_system === 1 || (r as any).systemTemplate
    return String((r as any).mode || '') === 'template' && !sys
  }),
)

function sceneLabelForStore(item: ReleaseRecord) {
  const key = resolveStoreTemplateScene(item as unknown as Record<string, unknown>)
  return TEMPLATE_SCENE_LABEL[key]
}

function sceneLabelForPage(tpl: Record<string, unknown>) {
  const key = resolvePageTemplateScene(tpl)
  return TEMPLATE_SCENE_LABEL[key]
}

function matchStoreScene(item: ReleaseRecord) {
  const key = resolveStoreTemplateScene(item as unknown as Record<string, unknown>)
  return matchesTemplateSceneFilter(sceneFilter.value, key)
}

function matchPageScene(tpl: Record<string, unknown>) {
  const key = resolvePageTemplateScene(tpl)
  return matchesTemplateSceneFilter(sceneFilter.value, key)
}

function isSystemStore(item: ReleaseRecord) {
  const sys = (item as any).isSystem ?? (item as any).is_system
  return sys === 1 || sys === true || !!(item as any).systemTemplate
}

const storeListBase = computed(() => {
  const system = storeTemplates.value.filter((r) => isSystemStore(r))
  const custom = myTemplates.value
  const merged: ReleaseRecord[] = []
  const seen = new Set<number>()
  for (const r of [...system, ...custom]) {
    const id = Number(r.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    merged.push(r)
  }
  const pool = merged.length ? merged : storeTemplates.value
  return pool.filter((r) => {
    const name = displayNameFull(r)
    return name && !/^模板\s*#/.test(name)
  })
})

const filteredStoreTemplates = computed(() => storeListBase.value.filter((r) => matchStoreScene(r)))

const filteredPageTemplates = computed(() =>
  pageTemplates.value.filter((t) => matchPageScene(t as Record<string, unknown>)),
)

const filteredMineTemplates = computed(() =>
  myTemplates.value.filter((r) => matchStoreScene(r)),
)

const storeTabTotal = computed(() => storeListBase.value.length)
const pageTabTotal = computed(() => pageTemplates.value.length)
const mineTabTotal = computed(() => myTemplates.value.length)

watch(tab, (v) => {
  router.replace({ query: { ...route.query, tab: v === 'store' ? undefined : v } })
})

function onViewportResize() {
  viewportWide.value = window.innerWidth >= WIDE_PREVIEW_PX
}

function closeSidePanel() {
  sidePanel.value = 'none'
  pendingActivate.value = null
}

function storePreviewUrl(item: ReleaseRecord): string {
  const id = toReleaseId(item.id)
  if (id == null) return ''
  const { href } = router.resolve({
    path: '/h5/miniapp-preview',
    query: { view: 'config', releaseId: String(id), embed: '1', ...(item.semver ? { semver: item.semver } : {}) },
  })
  return `${window.location.origin}${href}`
}

function isInUse(item: ReleaseRecord) {
  if (siteTemplateId.value != null && Number(item.id) === Number(siteTemplateId.value)) return true
  return item.isCurrent === 1 || item.isCurrent === true
}

function isLiveTemplate(item: ReleaseRecord) {
  if (liveTemplateId.value != null && Number(item.id) === Number(liveTemplateId.value)) return true
  return isInUse(item) && !(item as any).pending
}

function displayNameFull(item: ReleaseRecord) {
  return String((item as any).templateName || item.releaseNotes || `模板 #${item.id}`)
}

function formatTime(t?: string) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '—'
}

function storeThumb(item: ReleaseRecord) {
  const cover = String((item as any).coverUrl || (item as any).cover_url || '').trim()
  if (cover) return cover
  return storeTemplateThumbUrl(item)
}

function pageThumb(tpl: Record<string, unknown>) {
  return pageTemplateThumbUrl(tpl)
}

function tplArtStyle(item: ReleaseRecord) {
  if (storeThumb(item)) return {}
  const colors = ['#F4E3D3', '#E1E9F5', '#DDEFE4', '#F5E7CC', '#F3DDE6', '#E9E4DD']
  const id = Number(item.id) || 0
  return { background: colors[id % colors.length] }
}

function artBg(item: ReleaseRecord) {
  const colors = ['#F4E3D3', '#E1E9F5', '#DDEFE4', '#F5E7CC', '#F3DDE6', '#E9E4DD']
  const id = Number(item.id) || 0
  return colors[id % colors.length]
}

function accentOf(item: ReleaseRecord) {
  const colors = ['#B4430F', '#2458A6', '#1F7A4D', '#8F5400', '#7A3E5C', '#5E5146']
  return colors[(Number(item.id) || 0) % colors.length]
}

function pageArtBg(tpl: any) {
  const colors = ['#F4E3D3', '#E1E9F5', '#DDEFE4', '#F5E7CC', '#F3DDE6']
  const id = Number(tpl.id) || String(tpl.name || '').length
  return colors[id % colors.length]
}

const qrVisible = ref(false)
const qrReleaseId = ref<number | null>(null)

async function previewStore(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) {
    ElMessage.warning('无法预览：模板 ID 无效')
    return
  }
  previewKind.value = 'store'
  previewStoreItem.value = item
  previewPageItem.value = null
  previewTitle.value = displayNameFull(item)
  previewSrc.value = storePreviewUrl(item)
  previewLoading.value = false
  if (viewportWide.value) {
    previewDialogVisible.value = false
    sidePanel.value = 'preview'
  } else {
    sidePanel.value = 'none'
    previewDialogVisible.value = true
  }
}

async function openPagePreview(tpl: Record<string, unknown>) {
  previewKind.value = 'page'
  previewPageItem.value = tpl
  previewStoreItem.value = null
  previewTitle.value = String(tpl.name || '页面模板')
  previewSrc.value = ''
  previewLoading.value = true
  if (viewportWide.value) {
    previewDialogVisible.value = false
    sidePanel.value = 'preview'
  } else {
    sidePanel.value = 'none'
    previewDialogVisible.value = true
  }
  try {
    const dsl = typeof tpl.dslContent === 'string' ? JSON.parse(tpl.dslContent) : (tpl.dsl || tpl.dslContent)
    if (!dsl) throw new Error('该模板无可用内容')
    const res = await createPreviewDraft({ dsl, pageTitle: previewTitle.value })
    const token = String((res as any)?.data?.token || (res as any)?.token || '')
    if (!token) throw new Error('预览凭证生成失败')
    previewSrc.value = `${window.location.origin}/h5/draft-preview?token=${encodeURIComponent(token)}`
  } catch (e: unknown) {
    const msg = apiErrorMessage(e, '预览失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
    closeSidePanel()
    previewDialogVisible.value = false
  } finally {
    previewLoading.value = false
  }
}

function onPreviewDialogClosed() {
  previewSrc.value = ''
}

function applyFromPreview() {
  if (previewKind.value === 'store' && previewStoreItem.value) {
    previewDialogVisible.value = false
    confirmActivate(previewStoreItem.value)
    return
  }
  if (previewKind.value === 'page' && previewPageItem.value) {
    previewDialogVisible.value = false
    applyPageTpl(previewPageItem.value)
  }
}

function qrFromPreview() {
  if (previewStoreItem.value) previewStoreQr(previewStoreItem.value)
}

function previewStoreQr(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) return
  qrReleaseId.value = id
  qrVisible.value = true
}

async function confirmActivate(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) return
  pendingActivate.value = { id, name: displayNameFull(item), raw: item }
  keepTheme.value = true
  impactTabs.value = []
  impactPageCount.value = Number(item.pageCount || 0)
  try {
    const res = await getReleaseDetail(id)
    const detail = (res as any)?.data || res
    const snap = detail?.snapshot
    const cfg = typeof snap === 'string' ? JSON.parse(snap) : snap
    const tabs = cfg?.tabbarItems || cfg?.systemConfig?.tabbarItems || cfg?.tabBar || cfg?.tabs || []
    impactTabs.value = Array.isArray(tabs) ? tabs : []
    if (Array.isArray(cfg?.pages) && cfg.pages.length) {
      impactPageCount.value = cfg.pages.length
    } else if (impactTabs.value.length) {
      impactPageCount.value = impactTabs.value.length
    }
  } catch {
    /* 详情失败时用列表 pageCount 兜底 */
  }
  sidePanel.value = 'impact'
}

async function doActivate() {
  if (!pendingActivate.value) return
  activatingId.value = pendingActivate.value.id
  try {
    await activateStoreTemplate(pendingActivate.value.id)
    ElMessage.success(
      '已套用整店模板：页面内容已切换。站点导航/配色若有草稿请到「发布」确认；用户侧以发布后为准。',
    )
    closeSidePanel()
    await load()
    router.push('/mini/overview')
  } catch (e: unknown) {
    const msg = apiErrorMessage(e, '套用失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
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
    const id = await applyPageTemplate({ name: tpl.name || '页面模板', category: tpl.category, dsl })
    ElMessage.success('已生成草稿页')
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: unknown) {
    if (isUserCancelError(e)) return
    const msg = apiErrorMessage(e, '套用失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
  }
}

function formatDateYmd(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function createFromCurrent() {
  saveDialogMode.value = 'create'
  editingStoreId.value = null
  saveNameLocked.value = false
  saveDefaultName.value = `${siteName.value || '我的小程序'} · ${formatDateYmd()}`
  saveDefaultScene.value = 'content'
  saveDefaultDescription.value = ''
  saveDefaultCover.value = ''
  saveDialogVisible.value = true
}

function openEditStoreMeta(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) return
  saveDialogMode.value = 'edit'
  editingStoreId.value = id
  saveNameLocked.value = isSystemStore(item)
  saveDefaultName.value = displayNameFull(item)
  saveDefaultScene.value = String(
    (item as any).templateScene || (item as any).template_scene || resolveStoreTemplateScene(item as unknown as Record<string, unknown>) || 'content',
  )
  saveDefaultDescription.value = String(item.releaseNotes || '')
  saveDefaultCover.value = String((item as any).coverUrl || (item as any).cover_url || '')
  saveDialogVisible.value = true
}

async function editStoreSite(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) return
  if (isSystemStore(item)) {
    ElMessage.info('系统模板请先用「应用」选用，再到「外观」里改导航与配色')
    return
  }
  try {
    if (!isInUse(item)) {
      await ElMessageBox.confirm(
        '将先选用这套模板，再打开外观与导航编辑。继续？',
        '编辑站点',
        { type: 'info', confirmButtonText: '继续', cancelButtonText: '取消' },
      )
      activatingId.value = id
      await activateStoreTemplate(id)
      await load()
    }
    router.push('/mini/appearance')
  } catch (e: unknown) {
    if (e === 'cancel') return
    const msg = apiErrorMessage(e, '打开编辑失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
  } finally {
    activatingId.value = null
  }
}

async function captureStoreFromSite(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) return
  try {
    await ElMessageBox.confirm(
      `用当前正在搭建的小程序内容覆盖「${displayNameFull(item)}」的快照？`,
      '覆盖保存',
      { type: 'warning', confirmButtonText: '覆盖', cancelButtonText: '取消' },
    )
    await captureStoreTemplate(id)
    ElMessage.success('已用当前站点内容更新该模板')
    await load()
  } catch (e: unknown) {
    if (e === 'cancel') return
    const msg = apiErrorMessage(e, '保存失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
  }
}

function canEditPageTpl(tpl: Record<string, unknown>) {
  return canDeletePageTpl(tpl)
}

function goEditPageTpl(tpl: Record<string, unknown>) {
  router.push({ path: '/page-builder/template-center', query: { editId: String(tpl.id || '') } })
}

function canDeleteStore(item: ReleaseRecord) {
  return !isSystemStore(item)
}

function canDeletePageTpl(tpl: Record<string, unknown>) {
  const src = String(tpl.source || tpl.templateSource || tpl.origin || '').toLowerCase()
  if (src === 'system' || src === 'builtin') return false
  const flag = tpl.isSystem ?? tpl.system ?? tpl.builtin
  if (flag === true || flag === 1 || flag === '1') return false
  return tpl.id != null && Number(tpl.id) > 0
}

async function duplicateStore(item: ReleaseRecord) {
  const id = toReleaseId(item.id)
  if (id == null) return
  try {
    await duplicateStoreTemplate(id)
    ElMessage.success('已复制到我的模板，可在列表中应用或删除')
    tab.value = 'mine'
    await load()
  } catch (e: unknown) {
    const msg = apiErrorMessage(e, '复制失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
  }
}

async function deleteStore(item: ReleaseRecord) {
  if (isSystemStore(item)) {
    ElMessage.warning('系统预置模板不能删除，可先「复制」再改')
    return
  }
  const id = toReleaseId(item.id)
  if (id == null) return
  const inUseHint = isInUse(item)
    ? '这套正在用于当前搭建，删除后仅取消模板关联，已生成的页面与导航草稿会保留。'
    : ''
  try {
    await ElMessageBox.confirm(
      `确认删除「${displayNameFull(item)}」？删除后不可恢复。${inUseHint ? `\n\n${inUseHint}` : ''}`,
      '删除整店模板',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    await deleteRelease(id)
    ElMessage.success('已删除')
    if (sidePanel.value === 'preview' && previewStoreItem.value?.id === item.id) {
      closeSidePanel()
      previewDialogVisible.value = false
    }
    await load()
  } catch (e: unknown) {
    if (e === 'cancel') return
    const msg = apiErrorMessage(e, '删除失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
  }
}

async function deletePageTpl(tpl: Record<string, unknown>) {
  if (!canDeletePageTpl(tpl)) {
    ElMessage.warning('系统预置页面模板不能删除')
    return
  }
  const id = Number(tpl.id)
  try {
    await ElMessageBox.confirm(
      `确认删除页面模板「${tpl.name || id}」？`,
      '删除页面模板',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    await deleteTemplate(id)
    ElMessage.success('已删除')
    await load()
  } catch (e: unknown) {
    if (e === 'cancel') return
    const msg = apiErrorMessage(e, '删除失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
  }
}

async function onSaveTemplateSubmit(payload: {
  templateName: string
  scene: string
  description?: string
  coverUrl?: string
}) {
  creating.value = true
  saveDialogRef.value?.setSubmitting(true)
  try {
    if (saveDialogMode.value === 'edit' && editingStoreId.value != null) {
      await updateStoreTemplate(editingStoreId.value, {
        templateName: saveNameLocked.value ? undefined : payload.templateName,
        scene: payload.scene,
        description: payload.description ?? '',
        coverUrl: payload.coverUrl ?? '',
      })
      ElMessage.success('已保存模板信息')
    } else {
      await createStoreTemplate(payload)
      ElMessage.success('已从当前站点新建模板')
      tab.value = 'store'
    }
    saveDialogVisible.value = false
    await load()
  } catch (e: unknown) {
    const msg = apiErrorMessage(e, saveDialogMode.value === 'edit' ? '保存失败' : '创建失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
  } finally {
    creating.value = false
    saveDialogRef.value?.setSubmitting(false)
  }
}

async function load() {
  loading.value = true
  try {
    const [storeRes, pageRes, site, live] = await Promise.all([
      getStoreTemplates(),
      getPageTemplates({ current: 1, size: 50 }).catch(() => null),
      getMiniSite('draft').catch(() => null),
      getMiniSite('live').catch(() => null),
    ])
    storeTemplates.value = ((storeRes as any)?.data || []) as ReleaseRecord[]
    pageTemplates.value = ((pageRes as any)?.data?.records || (pageRes as any)?.data?.list || (pageRes as any)?.data || []) as any[]
    currentTabBar.value = site?.tabBar || []
    siteTemplateId.value = site?.templateId != null ? Number(site.templateId) : null
    liveTemplateId.value = live?.templateId != null ? Number(live.templateId) : null
    siteName.value = String(site?.name || site?.brand?.name || '我的小程序')
    const inUse = storeTemplates.value.find((r) => isInUse(r))
    currentPageCount.value = Number(inUse?.pageCount || currentTabBar.value.length || 0)
  } catch (e: unknown) {
    const msg = apiErrorMessage(e, '加载模板失败')
    if (msg && shouldShowLocalError(e)) ElMessage.error(msg)
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(() => {
  window.addEventListener('resize', onViewportResize)
  load()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportResize)
})
</script>

<style scoped lang="scss">
.scene-chips {
  margin-left: auto;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-bottom: 6px;
}
.tpl-title-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}
.tpl-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  &--sub {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--line, #e8dfd3);
  }
}
.tpl-art {
  align-items: flex-end;
  overflow: hidden;
  min-height: 148px;
  &.tpl-art--img {
    align-items: stretch;
    justify-content: center;
    padding: 0;
  }
  .tpl-art-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    display: block;
  }
  .tpl-phone {
    width: 60px;
    border-radius: 10px 10px 0 0;
    background: #fff;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}
.impact {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  > div {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  b { font-weight: 500; display: block; }
  .faint { display: block; }
}
.impact-ic {
  color: var(--acc);
  display: inline-flex;
  margin-top: 2px;
  flex-shrink: 0;
}
.impact-panel {
  position: sticky;
  top: 72px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.list-meta {
  font-size: 13px;
  margin: 4px 0 12px;
}
.tpl-preview-dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 420px;
}
.tpl-preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  justify-content: center;
}
.tpl-btn-danger {
  color: var(--r, #c0392b);
  border-color: rgba(192, 57, 43, 0.35);
  &:hover {
    border-color: var(--r, #c0392b);
    background: rgba(192, 57, 43, 0.06);
  }
}
.tpl-add {
  min-height: 280px;
  border-style: dashed;
  border-color: var(--line);
  background: var(--soft, #faf8f5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  font: inherit;
  color: var(--mute);
  text-align: center;
  padding: 20px;
  &:hover:not(:disabled) {
    border-color: var(--acc);
    color: var(--acc);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
.tpl-add__plus {
  font-size: 32px;
  line-height: 1;
  font-weight: 300;
}
/* 双栏规则在 mini-workbench.scss：.tpl-layout.has-panel */
</style>
