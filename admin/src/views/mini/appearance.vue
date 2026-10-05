<template>
  <div class="mini-wb mw-page appearance-view" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <MiniOpsConceptBanner variant="appearance" />
        <div class="head-row">
          <div>
            <h1 class="h1">外观</h1>
            <div class="sub">底部导航、品牌配色；整店模板在「模板」里切换</div>
          </div>
          <div class="actions">
            <button type="button" class="btn soft" @click="router.push('/mini/templates')">
              <MiniIcon name="grid" :size="15" />
              整店模板
            </button>
            <button
              type="button"
              class="btn primary"
              :loading="syncing"
              @click="handleSyncAll"
            >
              保存并同步
            </button>
            <button type="button" class="btn soft" @click="router.push('/mini/pages')">管理页面 ›</button>
          </div>
        </div>
        <div class="sub ov-meta">
          <span>当前模板：{{ templateLabel }}</span>
          <span v-if="site.pendingCount">待同步 {{ site.pendingCount }} 项</span>
        </div>

        <section class="card">
          <div class="head" style="margin-bottom: 14px">
            <div>
              <h2 class="h2">底部导航</h2>
              <div class="sub">拖动卡片排序；点卡片改名称、换绑定页面或进入装修</div>
            </div>
          </div>
          <div class="tabs-edit">
            <draggable
              v-model="sortableTabBar"
              item-key="__key"
              handle=".tab-drag"
              class="tabs-edit-inner"
              :animation="180"
              @end="onTabDragEnd"
            >
              <template #item="{ element: tab, index: i }">
                <button
                  type="button"
                  class="tabcard"
                  :class="{ err: isTabUnbound(tab) }"
                  @click="onTabCardClick(i)"
                >
                  <span class="faint tabcard-top">
                    <span>导航 {{ i + 1 }}</span>
                    <span class="tab-drag" title="拖拽排序" @click.stop>
                      <MiniIcon name="drag" :size="14" />
                    </span>
                  </span>
                  <span class="t">
                    {{ tab.text || `导航 ${i + 1}` }}
                    <span v-if="isMineTab(tab)" class="faint" title="系统页，路径固定">
                      <MiniIcon name="lock" :size="13" />
                    </span>
                  </span>
                  <span class="faint" style="font-size: 12px">→ {{ tabBindLabel(tab) === '未绑定' ? '未绑定页面' : tabBindLabel(tab) }}</span>
                  <span>
                    <span
                      class="tag"
                      :class="tabStatusTagClass(tab)"
                    >{{ tabStatus(tab).label === '未绑定' ? '需绑定' : tabStatus(tab).label }}</span>
                  </span>
                </button>
              </template>
            </draggable>
            <button
              v-if="tabBar.length < 5"
              type="button"
              class="tabadd"
              @click="addTabSlot"
            >
              <MiniIcon name="plus" :size="18" />
              <span>添加入口</span>
            </button>
          </div>
        </section>

        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">品牌配色</h2>
              <div class="sub">主色用于导航选中态、按钮和强调组件；改动会自动存入草稿</div>
            </div>
          </div>
          <div class="swatches">
            <button
              v-for="c in THEMES"
              :key="c"
              type="button"
              class="sw"
              :class="{ on: shownTheme === c }"
              :style="{ background: c }"
              :aria-label="`主色 ${c}`"
              :aria-pressed="shownTheme === c"
              @click="pickTheme(c)"
            />
            <label class="sw-custom" title="自定义品牌色">
              <span class="sw-custom__dot" :style="{ background: shownTheme || '#B4430F' }" />
              <span class="sw-custom__txt">自定义</span>
              <input
                type="color"
                class="sw-custom__input"
                :value="normalizeHex(shownTheme) || '#B4430F'"
                aria-label="自定义主色"
                @input="onCustomColor(($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="hex-field" title="输入品牌 VI 标准色号">
              <span class="hex-field__hash">#</span>
              <input
                class="hex-field__input"
                :value="hexInput"
                maxlength="6"
                placeholder="HEX"
                aria-label="HEX 色值"
                @input="onHexInput(($event.target as HTMLInputElement).value)"
                @blur="commitHex"
                @keyup.enter="commitHex"
              />
            </label>
          </div>
          <div class="draft-state" :class="`draft-state--${draftState}`">
            <span v-if="draftState === 'saving'">正在存入草稿…</span>
            <span v-else-if="draftState === 'saved'">已存入草稿</span>
            <span v-else-if="draftState === 'error'">草稿未保存，请检查网络</span>
            <span v-else class="faint">配色改动自动保存，顶部「保存并同步」后生效</span>
            <button
              v-if="themeDirty"
              type="button"
              class="link"
              @click="discardTheme"
            >
              放弃改动
            </button>
            <button
              v-if="undoTheme"
              type="button"
              class="link"
              @click="revertTheme"
            >
              改回 {{ undoTheme }}
            </button>
          </div>
        </section>

        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">品牌信息</h2>
              <div class="sub">小程序名、登录文案等；改动会自动存入草稿</div>
            </div>
          </div>
          <div class="brand-fields">
            <label class="kv">
              <span>小程序名称</span>
              <input v-model="brandForm.appName" class="input" maxlength="20" />
            </label>
            <label class="kv">
              <span>登录副标题</span>
              <input v-model="brandForm.loginTagline" class="input" maxlength="40" />
            </label>
            <label class="kv">
              <span>品牌眉题（英文）</span>
              <input v-model="brandForm.brandEyebrow" class="input" maxlength="32" />
            </label>
          </div>
          <div class="brand-upload">
            <span class="kv__label">品牌 Logo</span>
            <div class="brand-upload__row">
              <span class="brand-upload__preview">
                <img v-if="brandLogoUrl" :src="brandLogoUrl" alt="品牌 Logo 预览" />
                <span v-else class="brand-upload__ph">
                  <MiniIcon name="img" :size="18" />
                </span>
              </span>
              <div class="brand-upload__ops">
                <button type="button" class="btn sm" :disabled="logoUploading" @click="pickLogoFile">
                  <MiniIcon name="upload" :size="14" />
                  {{ logoUploading ? '上传中…' : '本地上传' }}
                </button>
                <AssetPickerButton label="从素材库选" :disabled="logoUploading" @select="onLogoPicked" />
                <button v-if="brandLogoUrl" type="button" class="link" @click="clearLogo">移除</button>
              </div>
              <input
                ref="logoInputRef"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden-file"
                @change="onLogoFileChosen"
              />
            </div>
            <p class="faint" style="margin: 6px 0 0; font-size: 12px; line-height: 1.5">
              建议正方形 PNG（≥ 512×512），用于分享卡片、登录弹窗与个人中心头部。
            </p>
          </div>
        </section>

      </div>

      <DevicePreview
        :hint="appearancePreviewHint"
        :preview-url="previewUrl"
        :preview-url-live="previewUrlLive"
        :iframe-key="previewKey"
        @scan="qrVisible = true"
      />
    </div>

    <MiniH5QrDialog
      v-model="qrVisible"
      mode="miniapp-draft"
      title="扫码在手机上看"
    />

    <el-drawer
      v-model="drawerVisible"
      class="mini-wb-overlay"
      :title="drawerIndex == null ? '编辑底部导航' : `编辑导航 ${drawerIndex + 1}`"
      size="400px"
      destroy-on-close
    >
      <el-form v-if="editTab" label-position="top" @submit.prevent>
        <el-form-item label="标题">
          <el-input v-model="editTab.text" maxlength="8" show-word-limit placeholder="例如：首页" />
        </el-form-item>
        <el-form-item label="未选中图标">
          <div class="icon-pick">
            <el-select
              v-model="editTabIcon"
              filterable
              placeholder="选择未选中图标"
              class="icon-pick__sel"
              @change="onPickIcon('icon', String($event))"
            >
              <el-option
                v-for="ic in NAV_FLAT_ICONS"
                :key="'n-' + ic.id"
                :label="ic.label"
                :value="ic.src"
              >
                <span style="display:inline-flex;align-items:center;gap:8px">
                  <img :src="ic.src" alt="" width="18" height="18" style="object-fit:contain" />
                  {{ ic.label }}
                </span>
              </el-option>
            </el-select>
            <button type="button" class="btn sm soft" @click="pickTabIconFile('icon')">上传</button>
            <input
              ref="iconFileRef"
              type="file"
              accept="image/png,image/jpeg"
              class="hidden-file"
              @change="onTabIconFileChosen"
            />
          </div>
        </el-form-item>
        <el-form-item label="选中图标">
          <div class="icon-pick">
            <el-select
              v-model="editTabSelectedIcon"
              filterable
              clearable
              placeholder="留空则复用未选中图标"
              class="icon-pick__sel"
              @change="onPickIcon('selectedIcon', String($event))"
            >
              <el-option
                v-for="ic in NAV_FLAT_ICONS"
                :key="'s-' + ic.id"
                :label="ic.label"
                :value="ic.src"
              >
                <span style="display:inline-flex;align-items:center;gap:8px">
                  <img :src="ic.src" alt="" width="18" height="18" style="object-fit:contain" />
                  {{ ic.label }}
                </span>
              </el-option>
            </el-select>
            <button type="button" class="btn sm soft" @click="pickTabIconFile('selectedIcon')">上传</button>
          </div>
          <p class="faint" style="margin:6px 0 0;font-size:12px;line-height:1.5">
            选中态留空时，小程序端按「xxx.png → xxx-active.png」推断，不填也能正常显示。
          </p>
        </el-form-item>
        <el-form-item label="绑定页面">
          <el-select
            v-model="editPageId"
            filterable
            clearable
            placeholder="选择系统页或装修页"
            style="width: 100%"
            @change="onBindPage"
          >
            <el-option-group v-if="systemPageOptions.length" label="系统页（小程序内置，不可装修）">
              <el-option
                v-for="s in systemPageOptions"
                :key="s.path"
                :label="`${s.name}（${s.path}）`"
                :value="`${SYSTEM_VALUE_PREFIX}${s.path}`"
              />
            </el-option-group>
            <el-option-group label="装修页">
              <el-option
                v-for="p in bindablePages"
                :key="String(p.id)"
                :label="`${p.name}（${p.path}）`"
                :value="Number(p.id)"
              />
            </el-option-group>
          </el-select>
          <p class="faint" style="margin:6px 0 0;font-size:12px;line-height:1.5">
            系统页由小程序内置模板渲染，后台只能改文案与开关；装修页可在装修器里自由编排。
          </p>
        </el-form-item>
        <el-form-item v-if="editTab.pagePath" label="路径">
          <el-input :model-value="editTab.pagePath" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="faint" style="margin-right: auto; font-size: 12px">
          关闭即自动存入草稿
        </span>
        <el-button type="primary" class="mw-btn-primary" @click="closeTabDrawer">
          完成
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import MiniOpsConceptBanner from '@/components/mini/MiniOpsConceptBanner.vue'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import { useSilentDraft } from '@/composables/useSilentDraft'
import { uploadFileItem } from '@/api/files'
import { createEmptyTab, normalizeTabBarItems } from '@/utils/tabbar'
import type { NavTab } from '@/types/miniapp'
import {
  getMiniSite,
  getPendingChanges,
  updateMiniSite,
  type MiniSiteVO,
  type MiniTabBarItem,
  type PendingChangeItem,
} from '@/api/miniSite'
import { getPageList } from '@/api/page'
import { getLatestRelease } from '@/api/version'
import { getConfigByGroupSilent } from '@/api/system'
import { resolvePageStatus } from '@/utils/pageStatus'
import { refreshMiniPending } from '@/composables/useMiniPending'
import { useMiniConfigSync } from '@/composables/useMiniConfigSync'
import { NAV_FLAT_ICONS } from '@/components/page-builder/navIconSet'
import type { PageRecord as PageRow } from '@/types/page'
import { DEFAULT_MINIAPP_BRAND_CONFIG, type MiniappBrandConfig } from '@/types/miniapp'
import { normalizeBrandConfig } from '@/utils/brand-config'

defineOptions({ name: 'MiniAppearance' })

const THEMES = ['#B4430F', '#A93D0C', '#2458A6', '#1F7A4D', '#8F5400', '#9B2C5A', '#3A2E26'] as const

const router = useRouter()
const { syncing, syncToLive } = useMiniConfigSync()
const loading = ref(false)
/** 首屏用骨架屏，之后的刷新才用遮罩，避免每次操作都闪灰屏 */
const loaded = ref(false)
const savingTabs = ref(false)
const brandForm = ref<MiniappBrandConfig>({ ...DEFAULT_MINIAPP_BRAND_CONFIG })
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const qrVisible = ref(false)
const previewFocusPath = ref('')
const previewRevision = ref(0)
const pageOptions = ref<PageRow[]>([])
const wechatVerFallback = ref('')
const mpMenuConfigured = ref(false)

const drawerVisible = ref(false)
const drawerIndex = ref<number | null>(null)
const editTab = ref<MiniTabBarItem | null>(null)
/** 未选中图标 / 选中图标：两个 select 各自独立绑定，值变化时写回 editTab */
const editTabIcon = ref('')
const editTabSelectedIcon = ref('')
/** 打开抽屉时的未选中图标原值：用于判断「选中态是否还是跟随着未选中态」 */
const editTabIconPrev = ref('')
/** 绑定选择器的值：数字=装修页 id；`sys:<path>`=系统页；null=未绑定 */
const editPageId = ref<number | string | null>(null)

/**
 * 系统页（小程序内置原生页，不走装修 DSL）。
 * Tab 壳是固定的五个，绑定只在自己那个壳里生效，
 * 所以这里按 `tabRoute` 过滤，不展示跨壳的无效组合。
 */
const SYSTEM_PAGES: { route: string; path: string; name: string }[] = [
  // 只有「我的」保留内置模板（承载登录/订单/优惠券等系统能力）。
  // 星球与商城的原生壳已于 2026-09-26 移除，统一由装修 DSL 渲染——
  // 同一个 Tab 保留两条渲染路径，正是「后台搭了不生效」那一类问题的来源。
  { route: '/pages/mine/mine', path: 'pages/mine/mine', name: '个人中心（我的）' },
]
const SYSTEM_VALUE_PREFIX = 'sys:'

function resolveTabShellRoute(tab?: MiniTabBarItem | null) {
  const raw = String(tab?.tabRoute || '').trim()
  if (raw) return raw.startsWith('/') ? raw : `/${raw}`
  const path = String(tab?.pagePath || '')
  const text = String(tab?.text || '')
  if (/mine/.test(path) || text === '我的') return '/pages/mine/mine'
  if (/planet/.test(path) || text === '星球') return '/pages/planet/planet'
  if (/shop|mall/.test(path) || text === '商城') return '/pages/shop/shop'
  if (/discover/.test(path) || text === '发现') return '/pages/discover/discover'
  return '/pages/index/index'
}

/** 当前 Tab 可选的系统页（最多一个，取决于它落在哪个壳） */
const systemPageOptions = computed(() =>
  SYSTEM_PAGES.filter((s) => s.route === resolveTabShellRoute(editTab.value)),
)


function systemPageByPath(path?: string | null) {
  const p = String(path || '').replace(/^\//, '')
  return SYSTEM_PAGES.find((s) => s.path === p) || null
}

/** 已选但尚未落库的主色；空串表示与草稿一致 */
const pendingTheme = ref('')
/** 落库成功后可一键改回的上一个主色 */
const undoTheme = ref('')
/** HEX 输入框的原始文本（允许用户输入到一半的非法值） */
const hexInput = ref('')
const logoInputRef = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)

type SortableTab = MiniTabBarItem & { __key: string }
const sortableTabBar = ref<SortableTab[]>([])

const templateLabel = computed(() => site.value.templateName || '自定义模板')
const brandLogoUrl = computed(() => {
  const b = site.value.brand as Record<string, unknown> | undefined
  return String(b?.logoUrl || b?.logo || '')
})
const tabBar = computed(() => site.value.tabBar || [])
const pendingPreview = computed(() => pending.value.slice(0, 5))
const pendingCountText = computed(() => {
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  return n > 0 ? `${n} 项` : '0 项'
})
const wechatCodeLabel = computed(
  () => site.value.wechatCodeVersion || wechatVerFallback.value || '—',
)
const homeTabText = computed(() => (site.value.tabBar || [])[0]?.text || '首页')
const boundPageCount = computed(
  () => (site.value.tabBar || []).filter((t) => t.pageId || t.pagePath).length,
)
const qrCodeLabel = computed(() =>
  boundPageCount.value > 0 ? `${boundPageCount.value} 个页面已生成` : '去生成',
)

const currentTheme = computed(() => {
  const t = site.value.theme || {}
  const c = String((t as any).primaryColor || (t as any).theme || (t as any).color || '').toUpperCase()
  return THEMES.find((x) => x.toUpperCase() === c) || ''
})

/** 色板选中环跟着"正在看的颜色"走，而不是已落库的颜色 */
const shownTheme = computed(() => pendingTheme.value || currentTheme.value)
const themeDirty = computed(() => !!pendingTheme.value && pendingTheme.value !== currentTheme.value)

/** 把任意写法归一成 #RRGGBB；无法识别时返回空串 */
function normalizeHex(input?: string | null): string {
  const raw = String(input || '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((c) => c + c).join('').toUpperCase()}`
  }
  return ''
}

/** 主题色静默落草稿 */
const themeDraft = useSilentDraft()
const draftState = computed(() => themeDraft.state.value)

function onCustomColor(hex: string) {
  const v = normalizeHex(hex)
  if (!v) return
  hexInput.value = v.slice(1)
  applyTheme(v)
}

function onHexInput(text: string) {
  hexInput.value = text.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
}

function commitHex() {
  const v = normalizeHex(hexInput.value)
  if (!v) {
    // 非法值：回填当前生效色，不静默吞掉用户的输入意图
    hexInput.value = currentTheme.value ? currentTheme.value.slice(1) : ''
    ElMessage.warning('HEX 色值格式不对，请输入 3 位或 6 位，例如 C08E6E')
    return
  }
  applyTheme(v)
}

/** 选色：立刻反映到右侧预览，并静默写入草稿（无保存按钮） */
function applyTheme(color: string) {
  const before = currentTheme.value
  if (color === before) {
    pendingTheme.value = ''
    return
  }
  pendingTheme.value = color
  hexInput.value = color.slice(1)
  bumpPreviewRevision()
  void themeDraft.schedule(async () => {
    await writeTheme(color)
    pendingTheme.value = ''
    if (before) {
      undoTheme.value = before
      window.setTimeout(() => { undoTheme.value = '' }, 15000)
    }
  })
}

const bindablePages = computed(() =>
  pageOptions.value.filter((p) => {
    const st = resolvePageStatus(p as any)
    return st === 'live' || st === 'pending' || st === 'draft'
  }),
)

function normalizePreviewPath(path?: string | null) {
  return String(path || '').replace(/^\//, '').trim()
}

function buildAppearancePreview(source: 'draft' | 'live') {
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  if (source === 'draft' && themeDirty.value) query.primary = pendingTheme.value
  const tabs = site.value.tabBar || []
  const screen = previewFocusPath.value || normalizePreviewPath(tabs[0]?.pagePath)
  if (screen) query.screen = screen
  return router.resolve({ path: '/h5/miniapp-preview', query }).href
}

const previewUrl = computed(() => buildAppearancePreview('draft'))
const previewUrlLive = computed(() => buildAppearancePreview('live'))

const previewKey = computed(() => `draft-${previewRevision.value}`)

const appearancePreviewHint = computed(() => {
  if (themeDirty.value) {
    return '预览含未保存的主色 · 保存草稿后再同步'
  }
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  if (n > 0) {
    return `有 ${n} 项草稿待同步 · 可切换草稿/线上预览`
  }
  return '可切换草稿/线上预览；点底部导航可切换页面'
})

async function handleSyncAll() {
  const ok = await syncToLive({ includeSite: true })
  if (ok) await load()
}

function focusPreviewOnTab(tab?: MiniTabBarItem | null) {
  const path = normalizePreviewPath(tab?.pagePath)
  if (path) previewFocusPath.value = path
}

function bumpPreviewRevision() {
  previewRevision.value += 1
}

function onTabCardClick(index: number) {
  const tab = sortableTabBar.value[index] || tabBar.value[index]
  focusPreviewOnTab(tab)
  openTabDrawer(index)
}

function syncSortableFromSite() {
  sortableTabBar.value = (site.value.tabBar || []).map((t, i) => ({
    ...t,
    __key: `${t.pageId || t.pagePath || t.text || 'tab'}-${i}`,
  }))
}

watch(tabBar, () => syncSortableFromSite(), { deep: true })

function formatShort(t?: string | null) {
  if (!t) return ''
  const s = String(t).replace('T', ' ')
  return s.length >= 16 ? s.slice(5, 16) : s.slice(0, 16)
}

function pendingTime(item: PendingChangeItem) {
  const raw = (item as any).updatedAt || (item as any).updateTime || (item as any).createdAt
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return formatShort(String(raw))
}

function isMineTab(tab: MiniTabBarItem) {
  const path = String(tab.pagePath || '')
  const name = String(tab.text || '')
  return path.includes('mine/mine') || name === '我的' || /pkg-user|\/mine/.test(path)
}

function isTabUnbound(tab: MiniTabBarItem) {
  return !(tab.pageId || tab.pagePath)
}

function findBoundPage(tab: MiniTabBarItem) {
  return pageOptions.value.find((p) => {
    if (tab.pageId != null && tab.pageId !== '' && Number(p.id) === Number(tab.pageId)) return true
    const path = String(p.path || '').replace(/^\//, '')
    return path && path === String(tab.pagePath || '').replace(/^\//, '')
  })
}

function shortPath(path: string) {
  const clean = String(path || '').replace(/^\//, '')
  if (!clean) return ''
  const parts = clean.split('/').filter(Boolean)
  if (parts.length <= 2) return clean
  return `…/${parts.slice(-2).join('/')}`
}

function tabBindLabel(tab: MiniTabBarItem) {
  if (isMineTab(tab)) return '系统页 · 个人中心'
  const hit = findBoundPage(tab)
  const name = String(hit?.name || tab.pageName || '').trim()
  if (name) return name.length > 10 ? `${name.slice(0, 10)}…` : name
  const path = String(tab.pagePath || hit?.path || '').trim()
  if (path) return shortPath(path)
  return '未绑定'
}

function tabStatus(tab: MiniTabBarItem): { key: string; label: string } {
  if (isTabUnbound(tab)) return { key: 'empty', label: '未绑定' }
  const hit = findBoundPage(tab)
  if (!hit) return { key: 'live', label: '已上线' }
  const st = resolvePageStatus(hit as any)
  if (st === 'pending' || st === 'draft') return { key: 'dirty', label: '有改动' }
  if (st === 'offline') return { key: 'empty', label: '已下架' }
  return { key: 'live', label: '已上线' }
}

function tabStatusTagClass(tab: MiniTabBarItem) {
  const st = tabStatus(tab)
  if (st.key === 'empty') return 't-err'
  if (st.key === 'dirty') return 't-pending'
  return 't-live'
}

function changeKindLabel(item: PendingChangeItem) {
  if (item.type === 'site') return '修改'
  const st = String(item.status || '')
  if (st === 'draft' || /尚未|新增|新建/.test(String(item.summary || ''))) return '新增'
  return '修改'
}

function openLivePreview() {
  qrVisible.value = true
}

/** 色板点击入口：走统一的 applyTheme，行为与自定义吸色/HEX 完全一致 */
function pickTheme(color: string) {
  applyTheme(color)
}

function discardTheme() {
  pendingTheme.value = ''
  hexInput.value = currentTheme.value ? currentTheme.value.slice(1) : ''
  bumpPreviewRevision()
}

/** 品牌 Logo 写入草稿（与其它字段同一静默通道） */
async function writeBrandLogo(url: string) {
  const raw = site.value.brand && typeof site.value.brand === 'object'
    ? { ...site.value.brand }
    : {}
  const updated = await updateMiniSite({
    brandConfig: { ...raw, logoUrl: url } as unknown as Record<string, unknown>,
  })
  site.value = { ...site.value, ...updated }
  void refreshMiniPending(true)
}

function pickLogoFile() {
  logoInputRef.value?.click()
}

async function onLogoFileChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    ElMessage.warning('Logo 请上传 PNG / JPG / WebP')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('Logo 请控制在 2MB 以内')
    return
  }
  logoUploading.value = true
  try {
    const res = await uploadFileItem(file, { name: `brand-logo-${Date.now()}` })
    const url = String((res as { url?: string; fileUrl?: string })?.url
      || (res as { fileUrl?: string })?.fileUrl || '')
    if (!url) throw new Error('上传成功但未返回可访问地址')
    // 先把品牌文本字段的防抖写入刷掉：否则随后这次 logo 写入会用旧 brandConfig 覆盖掉
    await brandDraft.flush(writeBrandFields)
    await writeBrandLogo(url)
    ElMessage.success('Logo 已更新')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : 'Logo 上传失败')
  } finally {
    logoUploading.value = false
  }
}

function onLogoPicked(url: string) {
  void brandDraft.flush(writeBrandFields).then(() => writeBrandLogo(url))
}

function clearLogo() {
  void brandDraft.flush(writeBrandFields).then(() => writeBrandLogo(''))
}

/**
 * 品牌信息静默落草稿。
 * 关键点：提交前先 flush 掉防抖队列，否则「改完标题立刻传 Logo」会用旧的 brandConfig
 * 覆盖掉 Logo（两者都写同一个 brandConfig 字段，是真正的丢数据路径）。
 */
const brandDraft = useSilentDraft(800)
let brandCommitted = ''

async function writeBrandFields() {
  const payload = normalizeBrandConfig(brandForm.value)
  const updated = await updateMiniSite({
    brandConfig: payload as unknown as Record<string, unknown>,
  })
  site.value = { ...site.value, ...updated, brand: payload as unknown as Record<string, unknown> }
  brandForm.value = payload
  brandCommitted = JSON.stringify(payload)
}

watch(
  () => brandForm.value,
  () => {
    const next = JSON.stringify(normalizeBrandConfig(brandForm.value))
    if (!brandCommitted || next === brandCommitted) return
    void brandDraft.schedule(writeBrandFields)
  },
  { deep: true },
)

async function writeTheme(color: string) {
  const prev = (site.value.theme && typeof site.value.theme === 'object') ? { ...site.value.theme } : {}
  const theme = {
    ...prev,
    primaryColor: color,
    tabBarActiveColor: color,
    secondaryColor: (prev as { secondaryColor?: string }).secondaryColor || color,
  }
  const prevMine =
    site.value.minePageConfig && typeof site.value.minePageConfig === 'object'
      ? { ...site.value.minePageConfig }
      : {}
  const brandRaw =
    site.value.brand && typeof site.value.brand === 'object' ? { ...site.value.brand } : {}
  const updated = await updateMiniSite({
    theme,
    minePageConfig: {
      ...prevMine,
      themeColor: color,
      themeColorSecondary: (prevMine as { themeColorSecondary?: string }).themeColorSecondary || color,
      templateStyle: 'warm',
    },
    brandConfig: {
      ...brandRaw,
      loginStyleKey: 'warm',
    },
  })
  site.value = { ...site.value, ...updated, theme: updated.theme || theme }
  void refreshMiniPending(true)
}

async function revertTheme() {
  const color = undoTheme.value
  if (!color) return
  const ok = await themeDraft.flush(async () => {
    await writeTheme(color)
  })
  if (!ok) return
  undoTheme.value = ''
  pendingTheme.value = ''
  hexInput.value = color.slice(1)
  ElMessage.success(`主色已恢复为 ${color}`)
}

function openTabDrawer(index?: number) {
  const list = [...(site.value.tabBar || [])]
  if (index == null) {
    drawerIndex.value = 0
    if (!list.length) {
      editTab.value = { text: '首页', pagePath: '' }
      editPageId.value = null
      drawerVisible.value = true
      return
    }
  } else {
    drawerIndex.value = index
  }
  const idx = drawerIndex.value ?? 0
  const current = list[idx] || { text: '', pagePath: '' }
  editTab.value = { ...current }
  syncIconFieldsFromTab()
  if (current.pageId != null && current.pageId !== '') {
    editPageId.value = Number(current.pageId)
  } else {
    const sys = systemPageByPath(current.pagePath)
    editPageId.value = sys ? `${SYSTEM_VALUE_PREFIX}${sys.path}` : null
  }
  drawerVisible.value = true
}

/* ---------- 双图标（未选中 / 选中） ---------- */

const iconFileRef = ref<HTMLInputElement | null>(null)
/** 本次上传要写入哪个字段 */
const iconUploadTarget = ref<'icon' | 'selectedIcon'>('icon')

/** 从 editTab 同步到两个独立 v-model，避免直接改 editTab 时 select 显示不同步 */
function syncIconFieldsFromTab() {
  const t = editTab.value
  editTabIcon.value = String(t?.icon || t?.iconPath || '')
  editTabSelectedIcon.value = String(t?.selectedIcon || '')
  editTabIconPrev.value = editTabIcon.value
}

function onPickIcon(field: 'icon' | 'selectedIcon', value: string) {
  if (!editTab.value) return
  const next = { ...editTab.value }
  if (field === 'icon') {
    next.icon = value
    next.iconPath = value
    // 未选中态改了，选中态若还是同一个旧值就跟着改，避免两态看起来一样
    if (!next.selectedIcon || next.selectedIcon === editTabIconPrev.value) {
      next.selectedIcon = value
      next.selectedIconPath = value
    }
  } else {
    next.selectedIcon = value
    next.selectedIconPath = value
  }
  editTab.value = next
  syncIconFieldsFromTab()
}

function pickTabIconFile(field: 'icon' | 'selectedIcon') {
  iconUploadTarget.value = field
  iconFileRef.value?.click()
}

async function onTabIconFileChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/^image\/(png|jpeg)$/.test(file.type)) {
    ElMessage.warning('导航图标请上传 PNG 或 JPG')
    return
  }
  if (file.size > 512 * 1024) {
    ElMessage.warning('导航图标请控制在 512KB 以内')
    return
  }
  try {
    const res = await uploadFileItem(file, { name: `tabbar-icon-${Date.now()}` })
    const url = String((res as { url?: string; fileUrl?: string })?.url
      || (res as { fileUrl?: string })?.fileUrl || '')
    if (!url) throw new Error('上传成功但未返回可访问地址')
    onPickIcon(iconUploadTarget.value, url)
    ElMessage.success('图标已更新')
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '图标上传失败')
  }
}

function addTabSlot() {
  const list = [...(site.value.tabBar || [])]
  if (list.length >= 5) {
    ElMessage.warning('底部导航最多 5 个')
    return
  }
  list.push(createEmptyTab(list as NavTab[]))
  site.value = { ...site.value, tabBar: list }
  syncSortableFromSite()
  openTabDrawer(list.length - 1)
}

function onBindPage(id: number | string | null) {
  if (!editTab.value) return
  if (id == null || id === '') {
    editTab.value = { ...editTab.value, pageId: undefined, pagePath: '', pageName: '' }
    return
  }
  // 系统页：只写路径，不写 pageId——有 pageId 就会被当成装修页去拉 DSL
  if (typeof id === 'string' && id.startsWith(SYSTEM_VALUE_PREFIX)) {
    const sys = systemPageByPath(id.slice(SYSTEM_VALUE_PREFIX.length))
    if (!sys) return
    editTab.value = {
      ...editTab.value,
      pageId: '',
      pagePath: sys.path,
      pageName: '',
    }
    return
  }
  const hit = pageOptions.value.find((p) => Number(p.id) === Number(id))
  if (!hit) return
  editTab.value = {
    ...editTab.value,
    pageId: hit.id,
    pagePath: String(hit.path || '').replace(/^\//, ''),
    pageName: hit.name,
  }
}

async function persistTabBar(next: MiniTabBarItem[], successMsg = '') {
  // 「我的」未绑定装修页时，路径回落到系统页，避免残留旧路径（如 pages/custom/warm-mine）
  // 被当成装修页去拉 DSL。显式绑定了装修页则尊重选择，不做干预。
  const normalized = normalizeTabBarItems(next as NavTab[]).map((tab) => {
    const t = tab as MiniTabBarItem
    const bound = t.pageId != null && String(t.pageId) !== ''
    return isMineTab(t) && !bound
      ? { ...tab, pageId: '', pageName: '', pagePath: 'pages/mine/mine' }
      : tab
  })
  if (normalized.length < 2) {
    ElMessage.warning('底部导航至少保留 2 个入口')
    return false
  }
  const updated = await updateMiniSite({ tabBar: normalized })
  site.value = { ...site.value, ...updated, tabBar: updated.tabBar || next }
  syncSortableFromSite()
  bumpPreviewRevision()
  void refreshMiniPending(true)
  if (successMsg) ElMessage.success(successMsg)
  return true
}

/** 导航草稿静默通道：与配色/品牌同一套防抖与失败提示 */
const tabDraft = useSilentDraft(600)

function scheduleTabBar(next: MiniTabBarItem[], successMsg = '') {
  return tabDraft.schedule(async () => {
    await persistTabBar(next, successMsg)
  })
}

/**
 * 抽屉编辑：字段变更即静默写入草稿。
 * 「完成」按钮只负责关闭 + 强制 flush（把防抖队列里那次写入立刻落库），
 * 不再有独立的「保存」动作。
 */
function commitTabEdit() {
  if (!editTab.value || drawerIndex.value == null) return
  // 系统页无需也不允许绑定装修页，跳过「请先绑定页面」校验
  if (!isMineTab(editTab.value) && isTabUnbound(editTab.value)) {
    ElMessage.warning('请先绑定页面')
    return
  }
  const next = [...(site.value.tabBar || [])]
  while (next.length <= drawerIndex.value) next.push({ text: '', pagePath: '' })
  next[drawerIndex.value] = {
    ...next[drawerIndex.value],
    text: editTab.value.text,
    pagePath: editTab.value.pagePath,
    pageId: editTab.value.pageId,
    pageName: editTab.value.pageName,
    icon: editTab.value.icon,
    selectedIcon: editTab.value.selectedIcon,
  }
  focusPreviewOnTab(editTab.value)
  void scheduleTabBar(next)
}

async function closeTabDrawer() {
  commitTabEdit()
  drawerVisible.value = false
  // 等最后一次写入真正落到服务端再让用户离开，避免「关抽屉瞬间丢改动」
  await tabDraft.flush(async () => {
    await persistTabBar(site.value.tabBar || [])
  })
}

// 抽屉里的字段（标题/绑定页/图标）变化 → 静默排一次写入
watch(
  () => (editTab.value ? { ...editTab.value } : null),
  (val, prev) => {
    if (!val || drawerIndex.value == null) return
    if (JSON.stringify(val) === JSON.stringify(prev)) return
    commitTabEdit()
  },
  { deep: true },
)

/** 「我的」固定末位：拖到中间时自动弹回，不静默改写用户的拖拽意图 */
function onTabDragEnd() {
  const list = [...sortableTabBar.value]
  const mineIdx = list.findIndex((t) => isMineTab(t))
  if (mineIdx > 0 && mineIdx !== list.length - 1) {
    const [mine] = list.splice(mineIdx, 1)
    list.push(mine)
    syncSortableFromSite()
    ElMessage.info('「我的」固定在最后一个入口，已自动放回末位')
  }
  const next = list.map(({ __key: _k, ...rest }) => rest)
  void scheduleTabBar(next)
}

async function load() {
  loading.value = true
  try {
    const [s, p, pageRes, latestRes, cfgRes] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      getPageList({ current: 1, size: 100 }),
      getLatestRelease().catch(() => null),
      getConfigByGroupSilent('basic').catch(() => null),
    ])
    site.value = s
    if (!previewFocusPath.value) {
      focusPreviewOnTab((s.tabBar || [])[0])
    }
    bumpPreviewRevision()
    brandForm.value = normalizeBrandConfig(
      (s.brand && typeof s.brand === 'object' ? s.brand : null) as Partial<MiniappBrandConfig>,
    )
    pending.value = p.items || []
    syncSortableFromSite()
    const data = (pageRes as { data?: { records?: PageRow[]; list?: PageRow[] } })?.data
    pageOptions.value = (data?.records || data?.list || []) as PageRow[]
    const pendingTotal =
      (p as { pendingCount?: number; total?: number }).pendingCount
      ?? (p as { total?: number }).total
      ?? pending.value.length
    if (s.pendingCount == null) {
      site.value = { ...s, pendingCount: pendingTotal }
    }
    const latest = (latestRes as { data?: { semver?: string; version?: string } })?.data
    wechatVerFallback.value = String(latest?.semver || latest?.version || '')
    try {
      const configs = (cfgRes as any)?.data?.configs || (cfgRes as any)?.data || []
      const map = Array.isArray(configs)
        ? Object.fromEntries(configs.map((c: any) => [c.configKey || c.key, c.configValue ?? c.value]))
        : {}
      mpMenuConfigured.value = !!(
        map.mp_app_id
        || map.mpAppId
        || map.wechat_mp_appid
        || map.officialAccountAppId
        || map.mp_menu
        || map.mpMenu
      )
    } catch {
      mpMenuConfigured.value = false
    }
    void refreshMiniPending(true)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载概览失败')
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(load)

// 离开页面前把防抖队列里未落库的改动写掉，避免「改完立刻切走丢改动」
onUnmounted(() => {
  void brandDraft.flush(writeBrandFields)
  void themeDraft.flush(async () => {
    if (pendingTheme.value) await writeTheme(pendingTheme.value)
  })
})
</script>

<style scoped lang="scss">
/* 对照 docs/prototypes/暖阁小程序搭建原型.html · vOverview */
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.appearance-view.mw-page {
  max-width: none;
  margin: 0;
  padding: 24px 28px 48px;
  gap: 18px;
}

.ov {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.ov-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.ov-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
}

.tabs-edit-inner {
  display: contents;
}

.tabs-edit {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.tabcard-top {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.tab-drag {
  cursor: grab;
  user-select: none;
  display: inline-flex;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line2);
  &:last-child { border-bottom: 0; }
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 6px 0;
}

.lower-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.pending-card {
  flex: 1.3;
  min-width: 280px;
}

.eco-card {
  flex: 1;
  min-width: 240px;
}

.brand-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;

  label.kv {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    align-items: center;
    justify-content: start;
    gap: 12px;
    padding: 4px 0;

    > span {
      width: 96px;
      white-space: nowrap;
      flex-shrink: 0;
      color: var(--mute);
      font-size: 13px;
    }

    .input {
      width: 100%;
      min-width: 0;
    }
  }
}

.theme-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line2);
  flex-wrap: wrap;
  .btn, .link { margin-left: auto; }
  .btn + .btn, .btn + .link { margin-left: 0; }
}

/* ---------- 静默草稿状态条 ---------- */
.draft-state {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line2);
  font-size: 12px;
  color: var(--text-2);
  min-height: 30px;
  .link { margin-left: auto; }
  .link + .link { margin-left: 0; }
}
.draft-state--saving { color: var(--text-2); }
.draft-state--saved { color: var(--ok, #1F7A4D); }
.draft-state--error { color: var(--danger, #B42318); }

/* ---------- 自定义吸色 + HEX ---------- */
.swatches {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.sw-custom {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 12px;
  border: 1px dashed var(--line2);
  border-radius: 8px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-2);
  transition: border-color .15s, background .15s;
  &:hover { border-color: var(--accent, #B4430F); background: var(--surface-2, #FAF8F4); }
}
.sw-custom__dot {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, .12);
  flex: none;
}
.sw-custom__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
.hex-field {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line2);
  border-radius: 8px;
  background: var(--surface-1, #fff);
  transition: border-color .15s;
  &:focus-within { border-color: var(--accent, #B4430F); }
}
.hex-field__hash {
  font-size: 12.5px;
  color: var(--text-3, #999);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.hex-field__input {
  width: 66px;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 12.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .5px;
  color: var(--text-1, #2C2C2A);
  text-transform: uppercase;
  &::placeholder { color: var(--text-3, #BBB); letter-spacing: 1px; }
}

/* ---------- 品牌 Logo ---------- */
.brand-upload {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line2);
}
.kv__label {
  display: block;
  font-size: 12.5px;
  color: var(--text-2);
  margin-bottom: 8px;
}
.brand-upload__row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.brand-upload__preview {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  border: 1px solid var(--line2);
  background: var(--surface-2, #FAF8F4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: none;
  img { width: 100%; height: 100%; object-fit: cover; }
}
.brand-upload__ph { color: var(--text-3, #BBB); }
.brand-upload__ops {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hidden-file { display: none; }

/* ---------- 导航双图标 ---------- */
.icon-pick {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.icon-pick__sel { flex: 1; min-width: 0; }

.empty-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  flex-wrap: wrap;
}

@media (max-width: 1100px) {
  .ov {
    grid-template-columns: minmax(0, 1fr);
  }
  .tabs-edit {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
