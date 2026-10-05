<template>
  <div class="mini-wb mw-page" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <PageHeader
          title="导航配置"
          description="小程序底部 Tab 的名称、图标、顺序与页面绑定。改动自动存入草稿，发布配置后线上才生效。"
          :status="saveState"
          help-title="导航规则"
          :on-retry="flushTabDraft"
        >
          <template #actions>
            <el-button @click="router.push('/mini/brand')">品牌信息</el-button>
            <el-button @click="router.push('/mini/preview')">预览检查</el-button>
            <el-button type="primary" @click="router.push('/mini/publish')">去发布与版本</el-button>
          </template>

          <template #help>
            <ul class="rule-list">
              <li><b>数量下限</b>：微信要求 2 ~ {{ TABBAR_MAX }} 个，少于 {{ TABBAR_MIN }} 个无法发布。</li>
              <li><b>排序即展示顺序</b>：第 1 位同时是<b>小程序首页</b>；「我的」固定在末位，移动它会被自动放回。</li>
              <li><b>两种绑定</b>：系统内置页（如「我的」）由小程序原生渲染，只能改文案与开关；装修页可在装修器里自由编排。</li>
              <li><b>可以先规划后建页</b>：导航可以先留空位，页面建好后回来补绑即可，空位会被标为「需绑定」。</li>
              <li><b>隐藏 vs 删除</b>：设为隐藏只是不在 Tab 栏显示，配置仍保留，随时可恢复。</li>
            </ul>
          </template>
        </PageHeader>

        <!--
          🔴 2026-10-06 移除 MiniOpsConceptBanner：
          它说「改动会自动存入草稿…到发布与版本发布配置才生效」，
          而现在这句话已经由 PageHeader 的 SaveStateBar（pending 态）
          + 折叠规则区承担，同一件事说了两遍、位置还重复。
          头部下方的 draft-state 只保留它不表达的信息（入口数、待发布总数）。
        -->

        <div class="draft-state">
          <span class="faint">{{ tabs.length }} / {{ TABBAR_MAX }} 个入口</span>
          <span v-if="site.pendingCount" class="tag t-pending">
            共 {{ site.pendingCount }} 项待发布
          </span>
        </div>

        <!-- 🔴 读取失败必须显式告知：否则「绑定检查」会基于空列表误报页面不存在 -->
        <section v-if="loadError" class="card err-card">
          <div class="err-row">
            <MiniIcon name="warn" :size="15" />
            <div class="err-body">
              <strong>页面列表读取失败</strong>
              <span class="faint">{{ loadError }}</span>
              <span class="faint">下方的绑定检查暂时无法核对页面是否真实存在，请勿据此修改导航配置。</span>
            </div>
            <button type="button" class="btn sm" @click="load">重新加载</button>
          </div>
        </section>

        <!-- 绑定体检：这一页最该给用户看的东西 -->
        <section v-if="navChecks.length" class="card check-card">
          <div class="head" style="margin-bottom: 10px">
            <div>
              <h2 class="h2">绑定检查</h2>
              <div class="sub">逐项核对导航指向的页面是否存在、是否可访问</div>
            </div>
          </div>
          <ul class="check-list">
            <li v-for="(c, i) in navChecks" :key="i" class="check-item" :class="`check-${c.level}`">
              <span class="check-dot" />
              <span class="check-text">{{ c.text }}</span>
              <button
                v-if="c.fixTo"
                type="button"
                class="link"
                @click="router.push(c.fixTo)"
              >去处理</button>
            </li>
          </ul>
          <p class="faint" style="margin: 10px 0 0; font-size: 12px; line-height: 1.6">
            导航可以先规划、页面后建：未绑定的入口会留在这里提示，不会被自动清掉。
            等页面建好后回到本页完成绑定即可。
          </p>
        </section>

        <section class="card">
          <div class="head" style="margin-bottom: 14px">
            <div>
              <h2 class="h2">底部导航</h2>
              <div class="sub">拖动卡片排序；点卡片改名称、换绑定页面或进入装修</div>
            </div>
            <span class="faint">{{ TABBAR_MIN }} ~ {{ TABBAR_MAX }} 个</span>
          </div>

          <!--
            🔴 2026-10-06 布局改造：原来是小卡片（5 列 grid），1440 宽下右侧留出大片空白，
            而每张卡只能放 4 行字、信息挤成一团。现改为整宽列表行：
            序号+图标 / 名称+绑定路径 / 状态 / 操作，各占一列，一眼扫完。
            排序除了拖拽，还给了上移下移按钮 —— 拖拽对键盘用户不可用，
            也不够精确（尤其「我的」固定末位时）。
          -->
          <div class="nav-list">
            <draggable
              v-model="sortableTabBar"
              item-key="__key"
              handle=".tab-drag"
              class="nav-list__inner"
              :animation="180"
              @end="onTabDragEnd"
            >
              <template #item="{ element: tab, index: i }">
                <div
                  class="nav-row"
                  :class="{ 'nav-row--err': isTabUnbound(tab), 'nav-row--off': tab.enabled === false }"
                >
                  <span class="nav-row__ord">
                    <span
                      class="tab-drag"
                      :title="`拖拽排序（第 ${i + 1} 位）`"
                      role="button"
                      tabindex="0"
                      @keydown.enter.prevent="$event.stopPropagation()"
                    >
                      <MiniIcon name="drag" :size="15" />
                    </span>
                    <b>{{ i + 1 }}</b>
                  </span>

                  <span class="nav-row__icon">
                    <!--
                      🔴 图标加载失败不留破图：素材被删/路径变更时 img 会 404，
                      变成一块碎图占位，比没有图标更糟。
                      用 brokenIcons 记录失败的图标 key，改渲染中性占位图标。
                    -->
                    <img
                      v-if="tab.icon && !brokenIcons.has(String(tab.icon))"
                      :src="tab.icon"
                      alt=""
                      width="22"
                      height="22"
                      @error="markIconBroken(String(tab.icon))"
                    />
                    <MiniIcon v-else name="grid" :size="18" />
                  </span>

                  <span class="nav-row__main">
                    <span class="nav-row__name">
                      {{ tab.text || `导航 ${i + 1}` }}
                      <span v-if="isMineTab(tab)" class="tag t-draft" title="系统内置页，路径固定">
                        <MiniIcon name="lock" :size="11" />内置
                      </span>
                      <span v-if="tab.enabled === false" class="tag t-slot">隐藏</span>
                    </span>
                    <span class="faint nav-row__path" :title="String(tab.pagePath || '')">
                      <!--
                        🔴 2026-10-06：原来写「→ {{ 页面名 }} {{ 路径 }}」，
                        当页面名恰好等于路径末段时会显示成「→ 首页 /pages/custom/home」——
                        同一个信息出现两遍。现在只在名字与路径**不同**时才补路径。
                      -->
                      <template v-if="tabBindLabel(tab) !== tab.pagePath">
                        → {{ tabBindLabel(tab) }}
                      </template>
                      <span class="nav-row__rawpath">{{ tab.pagePath || '未绑定页面' }}</span>
                    </span>
                  </span>

                  <span class="nav-row__status">
                    <span class="tag" :class="tabStatusTagClass(tab)">{{ tabStatus(tab).label }}</span>
                  </span>

                  <span class="nav-row__ops">
                    <!-- 排序的键盘/按钮替代：拖拽不可用时的唯一通路 -->
                    <button
                      type="button"
                      class="iconbtn"
                      :disabled="i === 0"
                      title="上移"
                      @click.stop="moveTab(i, -1)"
                    ><MiniIcon name="up" :size="14" /></button>
                    <button
                      type="button"
                      class="iconbtn"
                      :disabled="i === sortableTabBar.length - 1"
                      title="下移"
                      @click.stop="moveTab(i, 1)"
                    ><MiniIcon name="down" :size="14" /></button>
                    <button
                      type="button"
                      class="btn sm"
                      @click.stop="onTabCardClick(i)"
                    >编辑</button>
                  </span>
                </div>
              </template>
            </draggable>

            <button
              v-if="tabs.length < TABBAR_MAX"
              type="button"
              class="nav-add"
              @click="addTabSlot"
            >
              <MiniIcon name="plus" :size="16" />
              <span>添加入口</span>
              <span class="faint">还可添加 {{ TABBAR_MAX - tabs.length }} 个</span>
            </button>
          </div>
        </section>

        <!-- 默认首页 -->
        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">默认首页</h2>
              <div class="sub">小程序冷启动打开的页面，默认取导航第 1 项</div>
            </div>
          </div>
          <div class="home-row">
            <div class="home-now">
              <span class="faint">当前首页</span>
              <strong>{{ homeLabel }}</strong>
              <span class="faint">{{ homePath }}</span>
            </div>
            <el-select
              :model-value="homeTabIndex"
              class="home-select"
              placeholder="选择作为首页的导航"
              @change="onHomeChange"
            >
              <el-option
                v-for="(t, i) in tabs"
                :key="t.id || `tab-${i}`"
                :label="`${t.text || `导航 ${i + 1}`}（${t.pagePath || '未绑定'}）`"
                :value="i"
              />
            </el-select>
          </div>
          <p class="faint" style="margin: 10px 0 0; font-size: 12px; line-height: 1.6">
            换首页会把该项移到导航第 1 位——微信的 tabBar 以数组顺序为准，这一步是移动而不是另外设一个「首页」字段。
          </p>
        </section>

        <!-- 双向联动：哪些页面被导航引用 -->
        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">导航与页面的引用关系</h2>
              <div class="sub">被导航占用的页面不能随意删除或归档</div>
            </div>
            <button type="button" class="btn sm soft" @click="router.push('/mini/page-config')">页面配置 ›</button>
          </div>
          <div class="ref-table">
            <div class="ref-row ref-head">
              <span class="ref-cell">页面</span>
              <span class="ref-cell">路径</span>
              <span class="ref-cell">状态</span>
              <span class="ref-cell">被谁引用</span>
            </div>
            <div v-for="row in pageRefs" :key="row.key" class="ref-row">
              <span class="ref-cell">{{ row.name }}</span>
              <span class="ref-cell faint">{{ row.path }}</span>
              <span class="ref-cell">
                <PageStatusTag :status="row.status" />
              </span>
              <span class="ref-cell">
                <template v-if="row.usedBy.length">
                  <span v-for="(u, i) in row.usedBy" :key="i" class="tag t-acc ref-tag">{{ u }}</span>
                </template>
                <span v-else class="faint">未被导航引用</span>
              </span>
            </div>
            <p v-if="!pageRefs.length" class="faint" style="padding: 12px; font-size: 12px">
              <!-- 🔴 读取失败与「确实没有可核对页面」要分开说 -->
              <template v-if="loadError">页面列表读取失败，暂时无法核对引用关系。</template>
              <template v-else>还没有可核对的页面。</template>
            </p>
          </div>
        </section>
      </div>

      <DevicePreview
        :hint="previewHint"
        :preview-url="previewUrl"
        :preview-url-live="previewUrlLive"
        :iframe-key="previewKey"
        @scan="qrVisible = true"
      />
    </div>

    <MiniH5QrDialog v-model="qrVisible" mode="miniapp-draft" title="扫码在手机上看" />

    <el-drawer
      v-model="drawerVisible"
      class="mini-wb-overlay"
      :title="drawerIndex == null ? '编辑导航' : `编辑导航 ${drawerIndex + 1}`"
      size="420px"
      destroy-on-close
    >
      <el-form v-if="editTab" label-position="top" @submit.prevent>
        <el-form-item label="标题">
          <el-input v-model="editTab.text" maxlength="8" show-word-limit placeholder="例如：首页" />
        </el-form-item>
        <el-form-item label="是否在小程序中显示">
          <DsSwitch v-model="editTab.enabled" />
          <p class="faint" style="margin:6px 0 0;font-size:12px;line-height:1.5">
            隐藏后该项仍保留配置，只是不出现在底部栏，适合临时下掉某个入口。
          </p>
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
            :loading="loading"
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
              <!--
                🔴 value 必须是 pageOptionValue()（字符串 'p28'）而不是 Number(id)。
                原来用 :value="Number(p.id)"，而编辑态从后端读回的 pageId 常是字符串 '28'，
                el-select 匹配不到任何选项 → 直接把原始值「28」显示在框里，
                且下拉展开时因为列表是空的（见 load() 的 size>100 问题）显示「无数据」。
              -->
              <el-option
                v-for="p in bindablePages"
                :key="pageOptionValue(p)"
                :label="`${p.name || '未命名'}（${p.path}）`"
                :value="pageOptionValue(p)"
              >
                <span class="opt-row">
                  <span class="opt-name">{{ p.name || '未命名页面' }}</span>
                  <span class="faint opt-path">{{ p.path }}</span>
                  <PageStatusTag :row="p" />
                </span>
              </el-option>
            </el-option-group>
          </el-select>
          <p v-if="loadError" class="faint" style="margin:6px 0 0;font-size:12px;line-height:1.5">
            页面列表读取失败，装修页暂时无法列出：{{ loadError }}
          </p>
          <p v-else-if="!bindablePages.length" class="faint" style="margin:6px 0 0;font-size:12px;line-height:1.5">
            当前没有可绑定的装修页。可先到「页面搭建」新建页面，再回来绑定。
            <template v-if="site.tabBar && site.tabBar.length">
              （导航可以先规划、页面后建：先留空位，建好页面回来补绑即可）
            </template>
          </p>
          <p v-else class="faint" style="margin:6px 0 0;font-size:12px;line-height:1.5">
            系统页由小程序内置模板渲染，后台只能改文案与开关；装修页可在装修器里自由编排。
          </p>
        </el-form-item>
        <el-form-item v-if="editTab.pagePath" label="路径">
          <el-input :model-value="editTab.pagePath" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="faint" style="margin-right: auto; font-size: 12px">关闭即自动存入草稿</span>
        <el-button type="primary" class="mw-btn-primary" @click="closeTabDrawer">完成</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * 导航配置页（工作流第 5 环）
 *
 * 从 mini/appearance.vue 拆出。拆的理由同品牌页：原来导航跟配色混在一页，
 * 改配色和改 Tab 是两件完全不同频次的事，混着改必然互相干扰。
 *
 * 本页相对原外观页的增量：
 * 1. 绑定体检（目标页面是否存在 / 是否可访问），这是原来最缺的反馈；
 * 2. 默认首页显式化（原实现是「取第 1 项」，用户看不到也改不了）；
 * 3. 导航↔页面双向引用视图，避免删掉正在被 Tab 占用的页面；
 * 4. 可见性开关（enabled），支持临时下掉入口而不删配置。
 *
 * 写入沿用静默草稿：只落草稿，绝不触发发布。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import PageStatusTag from '@/components/mini/PageStatusTag.vue'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import PageHeader from '@/components/PageHeader.vue'
import type { SaveState } from '@/components/SaveStateBar.vue'
import { useSilentDraft } from '@/composables/useSilentDraft'
import { uploadFileItem } from '@/api/files'
import {
  createEmptyTab,
  normalizeTabBarItems,
  TABBAR_MAX,
  TABBAR_MIN,
} from '@/utils/tabbar'
import type { NavTab } from '@/types/miniapp'
import { getMiniSite, updateMiniSite, type MiniSiteVO, type MiniTabBarItem } from '@/api/miniSite'
import {
  loadAllPages,
  pageKey,
  pagePathKey,
  pageOptionValue,
  pageOptionValueById,
  pageFromOptionValue,
  isBuiltinShellPath,
} from '@/composables/usePageCatalog'
import { refreshMiniPending } from '@/composables/useMiniPending'
import { resolvePageStatus, type MiniPageStatus } from '@/utils/pageStatus'
import { NAV_FLAT_ICONS } from '@/components/page-builder/navIconSet'
import type { PageRecord as PageRow } from '@/types/page'

defineOptions({ name: 'MiniNavigation' })

const router = useRouter()

const loading = ref(false)
const loaded = ref(false)
/** 🔴 页面列表读取失败信息。非空时导航绑定核对不可信，界面必须说明 */
const loadError = ref('')
const site = ref<MiniSiteVO>({})
const pageOptions = ref<PageRow[]>([])
const qrVisible = ref(false)
const previewFocusPath = ref('')
const previewRevision = ref(0)

const drawerVisible = ref(false)
const drawerIndex = ref<number | null>(null)
const editTab = ref<MiniTabBarItem | null>(null)
const editTabIcon = ref('')
const editTabSelectedIcon = ref('')
const editTabIconPrev = ref('')
const editPageId = ref<number | string | null>(null)
const iconFileRef = ref<HTMLInputElement | null>(null)
const iconField = ref<'icon' | 'selectedIcon'>('icon')

type SortableTab = MiniTabBarItem & { __key: string; enabled?: boolean }
const sortableTabBar = ref<SortableTab[]>([])

const SYSTEM_PAGES: { route: string; path: string; name: string }[] = [
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

const systemPageOptions = computed(() =>
  SYSTEM_PAGES.filter((s) => s.route === resolveTabShellRoute(editTab.value)),
)

function systemPageByPath(path?: string | null) {
  const p = String(path || '').replace(/^\//, '')
  return SYSTEM_PAGES.find((s) => s.path === p) || null
}

const tabBar = computed(() => site.value.tabBar || [])
const tabs = computed<SortableTab[]>(() =>
  normalizeTabBarItems(tabBar.value as NavTab[]).map((t, i) => ({
    ...(t as MiniTabBarItem),
    __key: String((t as any).id || `tab-${i}`),
    // enabled 缺省视为显示：老配置没有这个字段，不能因为没写就当成隐藏
    enabled: (t as any).enabled !== false,
  })),
)

function isMineTab(tab?: MiniTabBarItem | null) {
  return resolveTabShellRoute(tab) === '/pages/mine/mine'
}

function isTabUnbound(tab?: MiniTabBarItem | null) {
  if (!tab) return true
  if (isMineTab(tab)) return false
  return !String(tab.pageId || '') && !String(tab.pagePath || '')
}

const bindablePages = computed(() =>
  pageOptions.value.filter((p) => {
    const st = resolvePageStatus(p as any)
    return st === 'live' || st === 'pending' || st === 'draft'
  }),
)

function tabBindLabel(tab: MiniTabBarItem) {
  // 🔴 用 pageKey 归一化：后端 pageId 可能是 number，编辑态读回是 string
  const pid = pageKey(tab.pageId)
  const path = String(tab.pagePath || '')
  if (!pid && !path) return '未绑定页面'
  if (pid) {
    const hit = pageOptions.value.find((p) => pageKey(p.id) === pid)
    return hit ? String(hit.name || path) : path || `页面 #${pid}`
  }
  return path
}

function tabStatus(tab: MiniTabBarItem): { label: string; level: string } {
  if ((tab as any).enabled === false) return { label: '已隐藏', level: 't-slot' }
  if (isTabUnbound(tab)) return { label: '需绑定', level: 't-err' }
  const pid = pageKey(tab.pageId)
  // 内置壳页不查 mp_page
  if (!pid && isBuiltinShellPath(tab.pagePath)) return { label: '内置页', level: 't-live' }
  if (!pid) return { label: '系统页', level: 't-draft' }
  const hit = pageOptions.value.find((p) => pageKey(p.id) === pid)
  if (!hit) return { label: '页面缺失', level: 't-err' }
  const st = resolvePageStatus(hit as any)
  if (st === 'live') return { label: '已上线', level: 't-live' }
  if (st === 'pending') return { label: '有改动', level: 't-pending' }
  if (st === 'archived') return { label: '已归档', level: 't-slot' }
  if (st === 'offline') return { label: '已下线', level: 't-slot' }
  return { label: '草稿', level: 't-draft' }
}

function tabStatusTagClass(tab: MiniTabBarItem) {
  return tabStatus(tab).level
}

/* ---------------- 绑定体检 ---------------- */

type NavCheck = { level: 'blocking' | 'warning' | 'ok'; text: string; fixTo?: string }

const navChecks = computed<NavCheck[]>(() => {
  const list = tabs.value
  if (!list.length) {
    return [{ level: 'blocking', text: '还没有任何导航入口，小程序将不显示底部 Tab 栏', fixTo: '/mini/navigation' }]
  }

  const out: NavCheck[] = []

  if (list.length < TABBAR_MIN) {
    out.push({
      level: 'blocking',
      text: `当前只有 ${list.length} 个入口，小程序要求 ${TABBAR_MIN} ~ ${TABBAR_MAX} 个`,
      fixTo: '/mini/navigation',
    })
  }
  if (list.length > TABBAR_MAX) {
    out.push({
      level: 'warning',
      text: `当前有 ${list.length} 个入口，超过微信上限 ${TABBAR_MAX} 个，多余的不会被显示`,
      fixTo: '/mini/navigation',
    })
  }

  const unnamed = list.filter((t) => !String(t.text || '').trim())
  if (unnamed.length) {
    out.push({
      level: 'blocking',
      text: `${unnamed.length} 个导航没有名称，小程序 Tab 会显示空文字`,
      fixTo: '/mini/navigation',
    })
  }

  // 🔴 2026-10-06 事故：页面列表读取失败时，下面这段会把每个导航都判成
  // 「页面不存在」，误报 4 个。数据不可信时只说「无法核对」，绝不下结论。
  if (loadError.value) {
    out.push({
      level: 'warning',
      text: `页面列表读取失败（${loadError.value}），暂时无法核对导航绑定是否指向真实存在的页面`,
    })
  } else {
    for (const t of list) {
      const label = String(t.text || '未命名导航')
      const pid = String(t.pageId || '')
      const path = pagePathKey(t.pagePath)

      if (isTabUnbound(t)) {
        out.push({
          level: 'blocking',
          text: `「${label}」还没有绑定页面，点进去会跳到空页。可以先建页面再回来绑定`,
          fixTo: '/mini/pages?create=1',
        })
        continue
      }

      // 内置壳页不在 mp_page 里，查不到是正常的，不能报缺失
      if (!pid && isBuiltinShellPath(path)) {
        out.push({ level: 'ok', text: `「${label}」→ 内置页面 ${path}` })
        continue
      }

      if (!pid) {
        out.push({ level: 'ok', text: `「${label}」→ ${path}` })
        continue
      }

      // 🔴 用统一的 ID 归一化比较：后端可能给 number，读回的却是 string
      const hit = pageOptions.value.find((p) => pageKey(p.id) === pid)
      if (!hit) {
        out.push({
          level: 'blocking',
          text: `「${label}」指向的页面不存在（${path || `ID ${pid}`}），请重新绑定`,
          fixTo: '/mini/navigation',
        })
        continue
      }

      const st = resolvePageStatus(hit as any)
      if (st === 'archived') {
        out.push({
          level: 'blocking',
          text: `「${label}」指向的页面「${hit.name}」已被归档，归档页不能作为导航入口`,
          fixTo: '/mini/page-config',
        })
      } else if (st === 'offline') {
        out.push({
          level: 'blocking',
          text: `「${label}」指向的页面「${hit.name}」已下线，导航点进去会打不开`,
          fixTo: '/mini/pages',
        })
      } else if (st === 'draft') {
        out.push({
          level: 'warning',
          text: `「${label}」指向的页面「${hit.name}」还是草稿，发布配置后才会生效`,
          fixTo: '/mini/publish',
        })
      } else {
        out.push({ level: 'ok', text: `「${label}」→ ${hit.name}（${hit.path}）已上线` })
      }
    }
  }

  const hidden = list.filter((t) => t.enabled === false)
  if (hidden.length) {
    out.push({
      level: 'warning',
      text: `${hidden.length} 个入口已设为隐藏，用户在小程序里看不到`,
      fixTo: '/mini/navigation',
    })
  }

  return out
})

const blockingChecks = computed(() => navChecks.value.filter((c) => c.level === 'blocking'))

/* ---------------- 页面引用关系 ---------------- */

const pageRefs = computed(() => {
  const out: Array<{ key: string; name: string; path: string; status: MiniPageStatus; usedBy: string[] }> = []
  const used = new Map<string, string[]>()
  for (const t of tabs.value) {
    const pid = pageKey(t.pageId)
    if (!pid) continue
    const label = String(t.text || '未命名')
    used.set(pid, [...(used.get(pid) || []), label])
  }

  for (const p of pageOptions.value) {
    const st = resolvePageStatus(p as any)
    // 🔴 统一用 pageKey 比较：导航里的 pageId 与页面 id 可能一个 number 一个 string
    const list = used.get(pageKey(p.id)) || []
    // 只列「被引用 + 可操作」的页，别把几百个页面全倒出来
    if (!list.length && st !== 'live') continue
    out.push({
      key: pageKey(p.id),
      name: String(p.name || p.path || `页面 #${p.id}`),
      path: String(p.path || ''),
      status: st,
      usedBy: list,
    })
  }
  return out.slice(0, 40)
})

/* ---------------- 默认首页 ---------------- */

const homeTabIndex = computed(() => 0)

const homeLabel = computed(() => {
  const first = tabs.value[0]
  if (!first) return '未设置'
  return String(first.text || '未命名导航')
})
const homePath = computed(() => {
  const first = tabs.value[0]
  if (!first) return '请先添加入口并绑定页面'
  return String(first.pagePath || '未绑定页面')
})

function onHomeChange(index: number) {
  if (index === 0) return
  const list = [...sortableTabBar.value]
  const picked = list.splice(index, 1)[0]
  if (!picked) return
  list.unshift(picked)
  sortableTabBar.value = list
  void scheduleTabBar(list.map(({ __key: _k, ...rest }) => rest))
  ElMessage.success(`已把「${picked.text}」设为首页（导航第 1 项）`)
}

/* ---------------- 持久化 ---------------- */

function syncSortableFromSite() {
  sortableTabBar.value = tabs.value.map((t) => ({ ...t }))
}

async function persistTabBar(next: MiniTabBarItem[], successMsg = '') {
  const normalized = normalizeTabBarItems(next as NavTab[]).map((tab) => {
    const t = tab as MiniTabBarItem & { enabled?: boolean }
    const bound = t.pageId != null && String(t.pageId) !== ''
    return isMineTab(t) && !bound
      ? { ...tab, pageId: '', pageName: '', pagePath: 'pages/mine/mine' }
      : tab
  })
  if (normalized.length < TABBAR_MIN) {
    ElMessage.warning(`底部导航至少保留 ${TABBAR_MIN} 个入口`)
    return false
  }
  const updated = await updateMiniSite({ tabBar: normalized as MiniTabBarItem[] })
  site.value = { ...site.value, ...updated, tabBar: updated.tabBar || next }
  syncSortableFromSite()
  previewRevision.value += 1
  void refreshMiniPending(true)
  if (successMsg) ElMessage.success(successMsg)
  return true
}

const tabDraft = useSilentDraft(600)

function scheduleTabBar(next: MiniTabBarItem[], successMsg = '') {
  return tabDraft.schedule(async () => {
    await persistTabBar(next, successMsg)
  })
}

function commitTabEdit() {
  if (!editTab.value || drawerIndex.value == null) return
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
    enabled: (editTab.value as any).enabled !== false,
  }
  previewFocusPath.value = String(editTab.value.pagePath || '')
  void scheduleTabBar(next)
}

async function closeTabDrawer() {
  // 🔴 只在「相对基线确有改动」时才提交。
  // 无条件 commit 会让「打开面板→直接关闭」也写一次库、弹一次「已存入草稿」。
  const changed = baselineOf(editTab.value) !== editBaseline
  if (changed) commitTabEdit()
  drawerVisible.value = false
  editBaseline = ''
  if (!changed) return
  await tabDraft.flush(async () => {
    await persistTabBar(site.value.tabBar || [])
  })
}

/**
 * 打开抽屉那一刻的字段快照。
 * 🔴 2026-10-06 事故：原来靠 watch 的 prev 值判断「有没有变」，
 * 但 onTabCardClick 打开抽屉时 prev 是 null → JSON 不相等 → 立刻 commitTabEdit()
 * → 仅打开面板就写库，还弹出「导航已存入草稿」并让待发布数 +1。
 * 正确做法：打开时存基线，只在「基线之后的真实改动」时才写。
 */
let editBaseline = ''

function baselineOf(tab: MiniTabBarItem | null) {
  if (!tab) return ''
  return JSON.stringify({
    text: tab.text,
    pagePath: tab.pagePath,
    pageId: tab.pageId == null ? '' : pageKey(tab.pageId),
    pageName: tab.pageName,
    icon: tab.icon,
    selectedIcon: tab.selectedIcon,
    enabled: (tab as any).enabled !== false,
  })
}

watch(
  () => (editTab.value ? { ...editTab.value } : null),
  () => {
    if (!editTab.value || drawerIndex.value == null) return
    // 与基线一致 = 用户没改（比如只是打开了面板），不写库
    if (baselineOf(editTab.value) === editBaseline) return
    commitTabEdit()
  },
  { deep: true },
)

/**
 * 「我的」固定末位：无论拖拽还是按钮移动，结果都要过这一道。
 * 抽成函数是因为原来只有 onTabDragEnd 里写了，
 * 按钮移动若不遵守就会把「我的」挪到中间，出现两个互相矛盾的规则。
 */
function normalizeMineLast(list: SortableTab[]): { list: SortableTab[]; moved: boolean } {
  const mineIdx = list.findIndex((t) => isMineTab(t))
  if (mineIdx <= 0 || mineIdx === list.length - 1) return { list, moved: false }
  const next = [...list]
  const [mine] = next.splice(mineIdx, 1)
  next.push(mine)
  return { list: next, moved: true }
}

function onTabDragEnd() {
  const { list, moved } = normalizeMineLast([...sortableTabBar.value])
  if (moved) {
    syncSortableFromSite()
    ElMessage.info('「我的」固定在最后一个入口，已自动放回末位')
  }
  void scheduleTabBar(list.map(({ __key: _k, ...rest }) => rest))
}

/**
 * 上移/下移：拖拽的键盘/精确替代。
 * 有了它，排序不依赖鼠标拖拽——原先只能靠拖，触屏与键盘用户基本没法调顺序。
 */
function moveTab(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= sortableTabBar.value.length) return
  const list = [...sortableTabBar.value]
  const [item] = list.splice(index, 1)
  if (!item) return
  list.splice(target, 0, item)
  const normalized = normalizeMineLast(list)
  sortableTabBar.value = normalized.list
  if (normalized.moved) {
    ElMessage.info('「我的」固定在最后一个入口，已自动放回末位')
  }
  void scheduleTabBar(normalized.list.map(({ __key: _k, ...rest }) => rest))
}

/**
 * 记录加载失败的导航图标。
 * 用 Set 而不是直接隐藏 img：隐藏后容器会空着，位置会跳；
 * 记录下来才能换成占位图标，行高与对齐都不变。
 */
const brokenIcons = ref<Set<string>>(new Set())
function markIconBroken(src: string) {
  if (!src || brokenIcons.value.has(src)) return
  brokenIcons.value = new Set([...brokenIcons.value, src])
}

function addTabSlot() {
  const next = [...sortableTabBar.value]
  const created = createEmptyTab(next as NavTab[])
  next.push({ ...(created as MiniTabBarItem), __key: `tab-new-${Date.now()}`, enabled: true })
  sortableTabBar.value = next
  void scheduleTabBar(next.map(({ __key: _k, ...rest }) => rest))
  ElMessage.info('已添加入口，请点开卡片绑定页面')
}

function onTabCardClick(index: number) {
  const tab = tabs.value[index]
  if (!tab) return
  drawerIndex.value = index
  editTab.value = { ...tab }
  // 🔴 先存基线，再让 watch 接手；否则「打开面板」本身会被当成一次改动
  editBaseline = baselineOf(tab)
  editTabIcon.value = String(tab.icon || '')
  editTabIconPrev.value = editTabIcon.value
  editTabSelectedIcon.value = String(tab.selectedIcon || '')

  // 🔴 统一走 pageOptionValue：确保「读回的 pageId」与「选项的 value」同型，
  // 否则 el-select 会把原始值（28）直接显示在框里。
  const pid = pageKey(tab.pageId)
  if (pid) editPageId.value = pageOptionValueById(pid)
  else if (tab.pagePath && systemPageByPath(tab.pagePath)) {
    editPageId.value = `${SYSTEM_VALUE_PREFIX}${tab.pagePath}`
  } else editPageId.value = null

  drawerVisible.value = true
}

function onPickIcon(field: 'icon' | 'selectedIcon', url: string) {
  if (!editTab.value) return
  editTab.value = { ...editTab.value, [field]: url }
  // 选中态没单独设时，让它跟随未选中态；用户随后单独改选中态就不再跟随
  if (field === 'icon' && !editTabSelectedIcon.value) {
    editTab.value.selectedIcon = url
    editTabSelectedIcon.value = url
  }
}

function pickTabIconFile(field: 'icon' | 'selectedIcon') {
  iconField.value = field
  iconFileRef.value?.click()
}

async function onTabIconFileChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    ElMessage.warning('图标请上传 PNG / JPG / WebP')
    return
  }
  try {
    const res = await uploadFileItem(file, { name: `tab-icon-${Date.now()}` })
    const url = String((res as { url?: string; fileUrl?: string })?.url
      || (res as { fileUrl?: string })?.fileUrl || '')
    if (!url) throw new Error('上传成功但未返回可访问地址')
    onPickIcon(iconField.value, url)
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : '图标上传失败')
  }
}

function onBindPage(value: number | string | null) {
  if (!editTab.value) return
  if (value == null || value === '') {
    editTab.value = { ...editTab.value, pageId: undefined, pagePath: '', pageName: '' }
    return
  }
  const v = String(value)
  if (v.startsWith(SYSTEM_VALUE_PREFIX)) {
    const sys = systemPageByPath(v.slice(SYSTEM_VALUE_PREFIX.length))
    if (!sys) return
    // 🔴 系统页只写路径、不写 pageId：有 pageId 会被当成装修页去拉 DSL，然后拉不到
    editTab.value = { ...editTab.value, pageId: '', pagePath: sys.path, pageName: '' }
    return
  }
  // 反解统一走 pageFromOptionValue，兼容 'p28' / '28' 两种形态
  const hit = pageFromOptionValue(v, pageOptions.value)
  if (!hit) return
  editTab.value = {
    ...editTab.value,
    pageId: hit.id,
    pagePath: pagePathKey(hit.path),
    pageName: hit.name,
  }
}

/* ---------------- 预览与状态 ---------------- */

function normalizePreviewPath(path?: string | null) {
  return String(path || '').replace(/^\//, '').trim()
}

function buildPreview(source: 'draft' | 'live') {
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  const screen = normalizePreviewPath(previewFocusPath.value || tabs.value[0]?.pagePath)
  if (screen) query.screen = screen
  return router.resolve({ path: '/h5/miniapp-preview', query }).href
}

const previewUrl = computed(() => buildPreview('draft'))
const previewUrlLive = computed(() => buildPreview('live'))
const previewKey = computed(() => `nav-${previewRevision.value}`)

const previewHint = computed(() => {
  const blocking = blockingChecks.value.length
  if (blocking) return `预览草稿 · 有 ${blocking} 个绑定问题未解决`
  const n = Number(site.value.pendingCount || 0)
  if (n > 0) return `预览草稿配置 · 还有 ${n} 项待发布`
  return '预览草稿配置 · 与线上一致'
})

/**
 * 保存状态五态映射（与品牌页同一套口径）。
 * 🔴 注意区分：「已存草稿」≠「已生效」——pending 态明确提示还需发布。
 */
const saveState = computed<SaveState>(() => {
  if (tabDraft.state.value === 'saving' || tabDraft.state.value === 'pending') return 'saving'
  if (tabDraft.state.value === 'error') return 'error'
  if (Number(site.value.pendingCount || 0) > 0) return 'pending'
  return 'saved'
})

/** 保存失败时的重试：立刻把防抖队列落库 */
async function flushTabDraft() {
  if (tabDraft.state.value === 'error' || tabDraft.state.value === 'pending') {
    await tabDraft.flush(async () => {
      await persistTabBar(site.value.tabBar || [])
    })
  }
}

/* ---------------- 加载 ---------------- */

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const siteData = await getMiniSite('draft')
    site.value = siteData || {}
    // 🔴 统一走 loadAllPages。原来写 size:200 → 后端抛 100101（上限 100）→
    // 列表空 → 下面 navChecks 把每个导航都判成「页面不存在」（误报 4 个）。
    const cat = await loadAllPages()
    if (cat.status === 'error') {
      loadError.value = cat.error || '页面列表读取失败'
      pageOptions.value = []
    } else {
      pageOptions.value = cat.pages
    }
    syncSortableFromSite()
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : '导航配置读取失败'
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(load)

onUnmounted(() => {
  if (tabDraft.state.value === 'pending' || tabDraft.state.value === 'saving') {
    void tabDraft.flush(async () => {
      await persistTabBar(site.value.tabBar || [])
    })
  }
})
</script>

<style scoped lang="scss">
/* 折叠帮助区规则清单 */
.rule-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li { line-height: 1.75; }
  b { font-weight: 600; }
}

/* 🔴 2026-10-06 导航列表：整宽行布局，利用横向空间 */
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.nav-list__inner {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.nav-row {
  display: grid;
  grid-template-columns: 52px 34px minmax(0, 1fr) 96px 132px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;
  background: transparent;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: rgba(180, 67, 15, 0.35);
  }
}

.nav-row--err {
  border-color: rgba(180, 40, 40, 0.4);
  background: rgba(180, 40, 40, 0.03);
}

.nav-row--off { opacity: 0.62; }

.nav-row__ord {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  b {
    font-size: 12.5px;
    color: var(--wb-muted, #8a8276);
  }
}

.nav-row__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);

  img { object-fit: contain; }
}

.nav-row__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.nav-row__name {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 13.5px;
  font-weight: 600;
}

.nav-row__path {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-row__rawpath {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-row__status {
  display: flex;
  justify-content: flex-start;
}

.nav-row__ops {
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: flex-end;
}

.nav-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border: 1px dashed var(--wb-line, #e6e0d6);
  border-radius: 10px;
  background: transparent;
  color: var(--wb-muted, #7d7468);
  font-size: 12.5px;
  cursor: pointer;

  &:hover {
    border-color: rgba(180, 67, 15, 0.45);
    color: var(--acc, #b4430f);
  }
}

/* 拖拽手柄：可聚焦，键盘用户也能看到 */
.tab-drag {
  display: inline-flex;
  cursor: grab;
  color: var(--wb-muted, #8a8276);
  border-radius: 4px;

  &:focus-visible {
    outline: 2px solid var(--acc, #b4430f);
    outline-offset: 1px;
  }
}

@media (max-width: 900px) {
  .nav-row {
    grid-template-columns: 44px 30px minmax(0, 1fr);
    row-gap: 8px;
  }
  .nav-row__status,
  .nav-row__ops {
    grid-column: 3;
    justify-content: flex-start;
  }
}

/* 🔴 读取失败提示 */
.err-card {
  border-left: 3px solid #b42828;
  background: rgba(180, 40, 40, 0.04);
}

.err-row {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #972626;
}

.err-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong { font-size: 13.5px; }

  .faint { font-size: 11.5px; line-height: 1.5; }
}

/* 绑定选择器里的可读行：名称 + 路径 + 状态，别只给一个裸 ID */
.opt-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.opt-name {
  flex: none;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opt-path {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-state {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.check-card { border-left: 3px solid var(--acc, #b4430f); }

.check-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.55;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.02);
}

.check-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 5px;
  flex: none;
  background: #b9b1a5;
}

.check-text { flex: 1; min-width: 0; }

.check-blocking {
  background: rgba(180, 40, 40, 0.06);
  .check-dot { background: #b42828; }
}

.check-warning {
  background: rgba(180, 110, 15, 0.07);
  .check-dot { background: #b46e0f; }
}

.check-ok { .check-dot { background: #2f7d4f; } }

.home-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.home-now {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;

  strong { font-size: 15px; }
}

.home-select { width: 260px; }

.ref-table {
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;
  overflow: hidden;
}

.ref-row {
  display: grid;
  grid-template-columns: 1.1fr 1.2fr 0.6fr 1fr;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--wb-line, #e6e0d6);
  font-size: 12.5px;
  align-items: center;

  &:last-child { border-bottom: 0; }
}

.ref-head {
  background: rgba(0, 0, 0, 0.025);
  font-weight: 600;
  color: var(--acc, #b4430f);
}

.ref-cell { min-width: 0; word-break: break-word; }
.ref-tag { margin-right: 4px; }

.tabcard-bind {
  font-size: 12px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-pick {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;

  &__sel { flex: 1; min-width: 0; }
}

@media (max-width: 860px) {
  .ref-row { grid-template-columns: 1fr 1fr; }
  .ref-head { display: none; }
}
</style>