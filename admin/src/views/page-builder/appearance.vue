<template>
  <div class="appearance-page">
    <PageHeader
      title="品牌导航"
      description="搭建整店模板：配色、底部导航、版式。切换模板在「整店模板」里完成。"
    >
      <template #actions>
        <span v-if="isDirty" class="dirty-pill">有未保存的修改</span>
        <el-button @click="openFullMiniappPreview()">
          <el-icon><Cellphone /></el-icon> 在手机上看
        </el-button>
        <el-button v-if="activeGroup !== 'templates'" type="primary" :loading="saving" @click="handleSave">保存</el-button>
        <el-dropdown trigger="click">
          <el-button class="ap-more" aria-label="更多操作">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="setGroup('templates')">整店模板</el-dropdown-item>
              <el-dropdown-item @click="autoBindPages">按名称自动绑定页面</el-dropdown-item>
              <el-dropdown-item @click="showModuleVersionDialog = true">配置快照与回滚</el-dropdown-item>
              <el-dropdown-item divided @click="handleReset">恢复成默认配置</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </PageHeader>

    <IssueActionList
      :items="issueItems"
      tone="warning"
      badge="待处理"
      :heading="`还需要处理（${issueItems.length} 项）`"
      @go="goIssue"
    />

    <div class="ap-groups">
      <button
        v-for="g in groups"
        :key="g.key"
        type="button"
        class="ap-group-card"
        :class="{ active: activeGroup === g.key, warn: g.issues > 0 }"
        @click="setGroup(g.key)"
      >
        <div class="ap-group-card__name">{{ g.label }}</div>
        <div class="ap-group-card__desc">{{ g.desc }}</div>
        <div class="ap-group-card__status" :data-status="g.issues > 0 ? 'empty' : 'live'">
          {{ g.issues > 0 ? `待处理 ${g.issues}` : '已就绪' }}
        </div>
      </button>
    </div>

    <div class="ap-grid" :class="{ 'ap-grid--wide': activeGroup === 'templates' }">
        <div class="panel ap-config" v-loading="loading">
          <div v-if="activeGroup === 'templates'" class="ap-card">
            <StoreTemplateGallery @edit="onEditStoreTemplate" />
          </div>

          <!-- 品牌配色 -->
          <div v-show="activeGroup === 'brand'" class="ap-card">
            <div class="ap-card-head">
              <h2 class="pb-h2">品牌配色</h2>
              <p>先选一个行业配色，右侧预览会立刻变。不满意再单独调下面的颜色。</p>
            </div>
            <ThemeConfig v-model="form.theme" />
          </div>

          <!-- 底部导航 -->
          <div v-show="activeGroup === 'tabbar'" class="ap-card">
            <div class="ap-card-head">
              <h2 class="pb-h2">底部导航</h2>
              <p>小程序最下面那一排按钮。每个按钮要写清「显示什么字、用什么图标、点了打开哪个页面」。</p>
            </div>
            <el-alert
              v-if="unboundTabs.length > 0"
              type="warning"
              show-icon
              :closable="false"
              class="ap-inline-alert"
              :title="`还有 ${unboundTabs.length} 个导航没有绑定页面：${unboundTabs.map(t => t.text).join('、')}。没绑定的按钮点了会是空白页，发布前要补上。`"
            />
            <TabBarEditor :tabs="form.tabs" :pages="pages" @update:tabs="onTabsUpdate" />
          </div>

          <!-- 首页与我的页 -->
          <div v-show="activeGroup === 'pages'" class="ap-card">
            <div class="ap-card-head">
              <h2 class="pb-h2">首页与我的</h2>
              <p>用户打开小程序看到的第一屏，以及「我的」页面长什么样。</p>
            </div>

            <div class="ap-row">
              <div class="ap-row-text">
                <strong>首页</strong>
                <span>用户打开小程序第一眼看到的页面</span>
              </div>
              <el-select
                v-model="form.homePageId"
                placeholder="选择一个已装修的页面"
                clearable
                filterable
                class="ap-row-field"
                @change="onHomePageIdChange"
              >
                <el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
              <el-button @click="goToPageBuilder">去装修</el-button>
            </div>

            <div class="ap-block">
              <div class="ap-row ap-row-inblock">
                <div class="ap-row-text">
                  <strong>我的页面</strong>
                  <span>用户查看订单、优惠券、个人资料的地方</span>
                </div>
                <el-radio-group v-model="minePageMode" size="small" @change="onMinePageModeChange">
                  <el-radio-button value="config">用现成模板</el-radio-button>
                  <el-radio-button value="custom">自己装修一个</el-radio-button>
                </el-radio-group>
              </div>

              <div class="ap-block-body">
                <el-select
                  v-if="minePageMode === 'custom'"
                  v-model="form.minePageId"
                  placeholder="选择已装修的页面"
                  clearable
                  filterable
                  style="width: 100%"
                >
                  <el-option v-for="p in pages" :key="p.id" :label="p.name" :value="p.id" />
                </el-select>
                <template v-else>
                  <div class="ap-block-hint">先选外观模板，再改里面显示哪些入口；改动会实时反映到右侧预览。</div>
                  <div class="mine-template-picker mine-template-picker--inline">
                    <button
                      v-for="tpl in personalCenterTemplates"
                      :key="tpl.key"
                      type="button"
                      class="mine-tpl-card"
                      :class="{ selected: selectedMineTemplate === tpl.key }"
                      @click="selectMineTemplate(tpl.key)"
                    >
                      <div class="mine-tpl-preview" :style="{ background: tpl.gradient }">
                        <span>{{ tpl.icon }}</span>
                      </div>
                      <div class="mine-tpl-name">{{ tpl.name }}</div>
                      <div class="mine-tpl-desc">{{ tpl.desc }}</div>
                    </button>
                  </div>
                  <MinePageConfig v-model="form.mineConfig" />
                </template>
              </div>
            </div>
          </div>

          <!-- 高级设置 -->
          <div v-show="activeGroup === 'advanced'" class="ap-card">
            <div class="ap-card-head">
              <h2 class="pb-h2">高级设置</h2>
              <p>分享出去的样子，以及一键套用整套导航布局。平时不用动。</p>
            </div>

            <div class="section-label">分享出去时长什么样</div>
            <el-form label-width="80px" size="small">
              <el-form-item label="分享标题">
                <el-input v-model="form.shareTitle" placeholder="用户转发给好友时显示的标题" maxlength="30" show-word-limit />
              </el-form-item>
              <el-form-item label="分享封面">
                <div class="share-image-upload" @click="triggerShareImageUpload">
                  <img v-if="form.shareImage" :src="form.shareImage" class="share-preview" />
                  <div v-else class="upload-placeholder">
                    <el-icon><Plus /></el-icon>
                    <span>上传分享图</span>
                  </div>
                </div>
                <input ref="shareImageInput" type="file" accept="image/*" style="display:none" @change="handleShareImageChange" />
              </el-form-item>
            </el-form>

            <div class="section-divider"></div>

            <div class="section-label">一键套用导航布局</div>
            <div class="ap-block-hint" style="margin-bottom: 10px">
              套用会覆盖当前的底部导航配置，请谨慎使用。当前：{{ templateName }}
            </div>
            <NavTemplateSelector v-model="form.templateKey" @update:model-value="onTemplateChange" />
          </div>
        </div>

        <aside v-show="activeGroup !== 'templates'" class="panel ap-preview">
          <div class="ap-preview-head">
            <h2 class="pb-h2">真机预览</h2>
            <el-button size="small" type="primary" link @click="openFullMiniappPreview()">完整预览 ›</el-button>
          </div>
          <MiniappPreview ref="previewRef" :form="form" :pages="pages" :mine-page-mode="minePageMode" />
        </aside>
      </div>

    <!-- 配置快照与回滚 -->
    <el-dialog v-model="showModuleVersionDialog" title="配置快照与回滚" width="860px" :close-on-click-modal="false" @opened="loadModuleVersions">
      <el-tabs v-model="moduleVersionTab" type="border-card">
        <el-tab-pane label="风格配色" name="theme">
          <div class="module-version-content">
            <div class="module-version-header">
              <span class="module-desc">管理主题配色（主色、辅色、圆角、字体等）的版本快照</span>
              <el-button type="primary" size="small" :loading="moduleSaving" @click="saveStepSnapshot('theme')">
                <el-icon><Plus /></el-icon> 保存当前配置为快照
              </el-button>
            </div>
            <el-table :data="themeVersions" v-loading="moduleLoading && moduleVersionTab === 'theme'" stripe size="small">
              <el-table-column label="版本号" width="110">
                <template #default="{ row }"><span class="semver">{{ row.semver }}</span></template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 1" type="success" size="small">已发布</el-tag>
                  <el-tag v-else-if="row.status === 0" type="info" size="small">草稿</el-tag>
                  <el-tag v-else type="danger" size="small">已回滚</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="变更摘要" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">{{ row.changeSummary || '-' }}</template>
              </el-table-column>
              <el-table-column label="时间" width="160" align="center">
                <template #default="{ row }">{{ row.publishedAt || row.createTime || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button v-if="row.status === 0" link type="success" size="small" @click="handleModulePublish(row)" :loading="publishingId === row.id">发布</el-button>
                  <el-popconfirm title="确认回滚到此版本？" @confirm="handleModuleRollback(row)">
                    <template #reference><el-button link type="warning" size="small">回滚</el-button></template>
                  </el-popconfirm>
                  <el-popconfirm title="确认删除此快照？" @confirm="handleModuleDelete(row)">
                    <template #reference><el-button v-if="row.status !== 1" link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="导航配置" name="navigation">
          <div class="module-version-content">
            <div class="module-version-header">
              <span class="module-desc">管理导航模板、TabBar 配置、页面绑定的版本快照</span>
              <el-button type="primary" size="small" :loading="moduleSaving" @click="saveStepSnapshot('navigation')">
                <el-icon><Plus /></el-icon> 保存当前配置为快照
              </el-button>
            </div>
            <el-table :data="navVersions" v-loading="moduleLoading && moduleVersionTab === 'navigation'" stripe size="small">
              <el-table-column label="版本号" width="110">
                <template #default="{ row }"><span class="semver">{{ row.semver }}</span></template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 1" type="success" size="small">已发布</el-tag>
                  <el-tag v-else-if="row.status === 0" type="info" size="small">草稿</el-tag>
                  <el-tag v-else type="danger" size="small">已回滚</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="变更摘要" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">{{ row.changeSummary || '-' }}</template>
              </el-table-column>
              <el-table-column label="时间" width="160" align="center">
                <template #default="{ row }">{{ row.publishedAt || row.createTime || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button v-if="row.status === 0" link type="success" size="small" @click="handleModulePublish(row)" :loading="publishingId === row.id">发布</el-button>
                  <el-popconfirm title="确认回滚到此版本？" @confirm="handleModuleRollback(row)">
                    <template #reference><el-button link type="warning" size="small">回滚</el-button></template>
                  </el-popconfirm>
                  <el-popconfirm title="确认删除此快照？" @confirm="handleModuleDelete(row)">
                    <template #reference><el-button v-if="row.status !== 1" link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="我的页面" name="mine">
          <div class="module-version-content">
            <div class="module-version-header">
              <span class="module-desc">管理个人中心页面模板、菜单项、功能入口的版本快照</span>
              <el-button type="primary" size="small" :loading="moduleSaving" @click="saveStepSnapshot('mine')">
                <el-icon><Plus /></el-icon> 保存当前配置为快照
              </el-button>
            </div>
            <el-table :data="mineVersions" v-loading="moduleLoading && moduleVersionTab === 'mine'" stripe size="small">
              <el-table-column label="版本号" width="110">
                <template #default="{ row }"><span class="semver">{{ row.semver }}</span></template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 1" type="success" size="small">已发布</el-tag>
                  <el-tag v-else-if="row.status === 0" type="info" size="small">草稿</el-tag>
                  <el-tag v-else type="danger" size="small">已回滚</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="变更摘要" min-width="160" show-overflow-tooltip>
                <template #default="{ row }">{{ row.changeSummary || '-' }}</template>
              </el-table-column>
              <el-table-column label="时间" width="160" align="center">
                <template #default="{ row }">{{ row.publishedAt || row.createTime || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button v-if="row.status === 0" link type="success" size="small" @click="handleModulePublish(row)" :loading="publishingId === row.id">发布</el-button>
                  <el-popconfirm title="确认回滚到此版本？" @confirm="handleModuleRollback(row)">
                    <template #reference><el-button link type="warning" size="small">回滚</el-button></template>
                  </el-popconfirm>
                  <el-popconfirm title="确认删除此快照？" @confirm="handleModuleDelete(row)">
                    <template #reference><el-button v-if="row.status !== 1" link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { Plus, Cellphone, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { uploadFile, normalizeUploadUrl } from '@/api/system'
import { getReleaseDetail, toReleaseId } from '@/api/version'
import {
  getTargetVersions,
  createModuleVersion,
  publishModuleVersion,
  rollbackModuleVersion,
  deleteModuleVersion,
  type ModuleVersionRecord
} from '@/api/module-version'
import { useMiniappConfig } from '@/components/miniapp-builder/composables/useMiniappConfig'
import {
  NAV_TEMPLATES,
  MINE_STYLE_TEMPLATES,
  resolveMineStyleKey,
  applyMineStylePreset,
} from '@/types/miniapp'
import NavTemplateSelector from '@/components/miniapp-builder/NavTemplateSelector.vue'
import TabBarEditor from '@/components/miniapp-builder/TabBarEditor.vue'
import MinePageConfig from '@/components/miniapp-builder/MinePageConfig.vue'
import ThemeConfig from '@/components/miniapp-builder/ThemeConfig.vue'
import MiniappPreview from '@/components/miniapp-builder/MiniappPreview.vue'
import PageHeader from '@/components/PageHeader.vue'
import IssueActionList, { type IssueActionItem } from '@/components/IssueActionList.vue'
import StoreTemplateGallery from '@/components/StoreTemplateGallery.vue'

const {
  form, pages, loading, saving, isDirty,
  applyTemplate, handleSave, handleReset, autoBindPages,
} = useMiniappConfig()

const hasDecoratedPages = computed(() =>
  pages.value.some((p: any) => p && p.type !== 'system' && !String(p.id).startsWith('__')),
)

const router = useRouter()
const route = useRoute()
const editingTemplateId = ref<number | null>(null)

type GroupKey = 'templates' | 'brand' | 'tabbar' | 'pages' | 'advanced'
const activeGroup = ref<GroupKey>('brand')
const previewRef = ref<{ showMineTab: () => void } | null>(null)
const shareImageInput = ref<HTMLInputElement>()
const minePageMode = ref<'config' | 'custom'>('config')
const selectedMineTemplate = ref('warm')

const showModuleVersionDialog = ref(false)
const moduleVersionTab = ref<'theme' | 'navigation' | 'mine'>('theme')
const themeVersions = ref<ModuleVersionRecord[]>([])
const navVersions = ref<ModuleVersionRecord[]>([])
const mineVersions = ref<ModuleVersionRecord[]>([])
const moduleLoading = ref(false)
const moduleSaving = ref(false)
const publishingId = ref<number | null>(null)

const personalCenterTemplates = MINE_STYLE_TEMPLATES

const unboundTabs = computed(() => form.tabs.filter(t => !t.pageId && !t.pagePath.includes('index')))

/** 顶部四张状态卡：点卡切换配置区，不必按顺序 */
const groups = computed<{ key: GroupKey; label: string; desc: string; issues: number }[]>(() => [
  { key: 'templates', label: '整店模板', desc: '新建、复制、选用、覆盖保存', issues: 0 },
  { key: 'brand', label: '品牌配色', desc: '主色、导航栏、页面背景', issues: 0 },
  { key: 'tabbar', label: '底部导航', desc: '最下面那一排按钮', issues: unboundTabs.value.length },
  {
    key: 'pages',
    label: '首页与我的',
    desc: '打开小程序看到的第一屏',
    issues: form.homePageId ? 0 : 1,
  },
  { key: 'advanced', label: '高级设置', desc: '分享卡片、导航布局', issues: 0 },
])

const issueItems = computed<IssueActionItem[]>(() => {
  const items: IssueActionItem[] = []
  if (!hasDecoratedPages.value) {
    items.push({
      key: 'no-pages',
      text: '还没有可绑定的页面。请先在「页面管理」里创建并装修首页，再回来配置导航。',
      to: '/page-builder/list',
      action: '去创建页面',
    })
  }
  if (unboundTabs.value.length > 0) {
    items.push({
      key: 'unbound-tabs',
      text: `还有 ${unboundTabs.value.length} 个导航没有绑定页面：${unboundTabs.value.map(t => t.text).join('、')}。`,
      to: '/page-builder/start',
      action: '去绑定',
    })
  }
  if (!form.homePageId) {
    items.push({
      key: 'no-home',
      text: '还没选首页。用户打开小程序时需要一个第一屏。',
      to: '/page-builder/start',
      action: '去选择',
    })
  }
  return items
})

const templateName = computed(() => {
  const tpl = NAV_TEMPLATES.find(t => t.key === form.templateKey)
  return tpl?.name || '自定义'
})

function selectMineTemplate(key: string) {
  const resolved = applyMineStylePreset(form.mineConfig as Record<string, unknown>, key)
  selectedMineTemplate.value = resolved
  // 模板风格作用于「我的」页，预览自动切过去，让效果立即可见
  previewRef.value?.showMineTab()
}

/** 配置/快照加载后同步选中态；已删除的简约/暗黑回退基础版配色 */
function syncMineTemplateFromConfig() {
  const mc = form.mineConfig as Record<string, unknown>
  const rawKey = String(mc.templateStyle || '')
  const needsFallback =
    mc.style === 'outline'
    || rawKey === 'minimal'
    || rawKey === 'dark'
    || rawKey === 'simple'
    || rawKey === 'standard'
    || rawKey === 'premium'
    || ['#1e293b', '#334155'].includes(String(mc.themeColor || '').toLowerCase())
  const key = resolveMineStyleKey(mc as { templateStyle?: string; style?: string; themeColor?: string })
  if (needsFallback) {
    const before = JSON.stringify({
      templateStyle: mc.templateStyle,
      style: mc.style,
      themeColor: mc.themeColor,
    })
    applyMineStylePreset(mc, key)
    const after = JSON.stringify({
      templateStyle: mc.templateStyle,
      style: mc.style,
      themeColor: mc.themeColor,
    })
    // 无实际变化时不要反复 Object.assign，避免脏状态抖动
    if (before === after && selectedMineTemplate.value === key) return
  }
  if (selectedMineTemplate.value !== key) {
    selectedMineTemplate.value = key
  }
}

watch(
  () => [
    (form.mineConfig as any).templateStyle,
    (form.mineConfig as any).style,
    (form.mineConfig as any).themeColor,
  ],
  () => syncMineTemplateFromConfig(),
  { immediate: true },
)

watch(activeGroup, (key) => {
  // 切到「首页与我的页」时预览自动跳到「我的」tab，改开关能立刻看到效果
  if (key === 'pages' && minePageMode.value === 'config') previewRef.value?.showMineTab()
})

watch(() => (form.mineConfig as any).mode, (mode) => {
  if (mode === 'config' || mode === 'custom') {
    minePageMode.value = mode
  }
}, { immediate: true })

function onTabsUpdate(tabs: typeof form.tabs) {
  const next = tabs
  form.tabs = next
  const homeTab = form.tabs.find((t) => t.text === '首页' || String(t.pagePath || '').replace(/\/+$/, '') === '/pages/index/index')
  if (homeTab?.pageId != null && homeTab.pageId !== '') {
    const nextHomeId = homeTab.pageId as any
    if (String(form.homePageId) !== String(nextHomeId)) {
      form.homePageId = nextHomeId
    }
  }
}

function onHomePageIdChange(pageId: string | number | undefined | null) {
  const homeTab = form.tabs.find((t) => t.text === '首页')
  if (!homeTab) return
  if (pageId == null || pageId === '') {
    homeTab.pageId = '' as any
    homeTab.pageName = ''
    return
  }
  const page = pages.value.find((p: any) => String(p.id) === String(pageId))
  homeTab.pageId = pageId as any
  homeTab.pageName = page?.name || homeTab.pageName
  if (page?.path) homeTab.pagePath = page.path
}

function onTemplateChange(key: string) {
  applyTemplate(key)
}

function onMinePageModeChange(mode: 'config' | 'custom') {
  if (mode === 'config') {
    form.minePageId = ''
  }
  ;(form.mineConfig as any).mode = mode
}

function triggerShareImageUpload() {
  shareImageInput.value?.click()
}

async function handleShareImageChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const res = await uploadFile(file)
    const url = (res.data as any)?.url || ''
    if (!url) {
      ElMessage.error('上传成功但未返回图片地址，请联系管理员')
      return
    }
    form.shareImage = url
  } catch {
    ElMessage.error('图片上传失败，请重试')
  } finally {
    // 允许重新选择同一个文件
    input.value = ''
  }
}

// ==================== 从草稿载入 ====================
async function loadReleaseIntoEditor(releaseId: number) {
  if (toReleaseId(releaseId) == null) return
  editingTemplateId.value = releaseId
  loading.value = true
  try {
    const res = await getReleaseDetail(releaseId)
    const detail = (res as any).data || res
    if (detail?.snapshot) {
      parseSnapshotToForm(detail.snapshot)
    }
  } catch (err) {
    console.error('加载草稿详情失败:', err)
    ElMessage.error('加载草稿详情失败，将使用默认配置')
    applyTemplate('standard')
  } finally {
    loading.value = false
  }
  activeGroup.value = 'brand'
}

// ==================== 预览 ====================
function buildFullPreviewUrl() {
  const query: Record<string, string> = { view: 'config', source: 'live' }
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query })
  return `${window.location.origin}${href}`
}

function openFullMiniappPreview() {
  window.open(buildFullPreviewUrl(), '_blank', 'noopener,noreferrer')
}

// ==================== 页面跳转 ====================
function setGroup(key: GroupKey) {
  activeGroup.value = key
  const query = { ...route.query } as Record<string, string | string[] | undefined>
  if (key === 'templates') query.scene = 'templates'
  else if (query.scene === 'templates') delete query.scene
  router.replace({ query })
}

async function onEditStoreTemplate(item: { id: number }) {
  const id = toReleaseId(item?.id)
  if (!id) return
  await loadReleaseIntoEditor(id)
  setGroup('brand')
}

function goToPageBuilder() {
  router.push('/page-builder/list')
}

function goIssue(item: IssueActionItem) {
  if (item.key === 'unbound-tabs') {
    setGroup('tabbar')
    return
  }
  if (item.key === 'no-home') {
    setGroup('pages')
    return
  }
  if (item.to) router.push(item.to)
}

// ==================== 快照解析 ====================
function parseSnapshotToForm(snapshotJson: string) {
  try {
    const snap = typeof snapshotJson === 'string' ? JSON.parse(snapshotJson) : snapshotJson
    if (!snap) return
    if (snap.templateKey) {
      form.templateKey = snap.templateKey
      applyTemplate(snap.templateKey)
    }
    if (snap.homePageId !== undefined) form.homePageId = snap.homePageId
    if (snap.minePageId !== undefined) form.minePageId = snap.minePageId
    if (Array.isArray(snap.tabs) && snap.tabs.length > 0) {
      form.tabs = snap.tabs.map((t: any, i: number) => ({
        id: t.id || `tab-${i}`,
        text: t.text || t.label || '',
        icon: t.icon || '',
        pagePath: t.pagePath || t.path || '',
        pageId: t.pageId || '',
        pageName: t.pageName || '',
      }))
    }
    if (snap.mineConfig) {
      Object.assign(form.mineConfig, snap.mineConfig)
      syncMineTemplateFromConfig()
    }
    if (snap.theme) Object.assign(form.theme, snap.theme)
    if (snap.shareTitle !== undefined) form.shareTitle = snap.shareTitle
    if (snap.shareImage !== undefined) form.shareImage = normalizeUploadUrl(snap.shareImage)
  } catch (err) {
    console.warn('解析快照失败:', err)
  }
}

// ==================== 模块版本（配置快照与回滚） ====================
async function loadModuleVersions() {
  moduleLoading.value = true
  try {
    const [themeRes, navRes, mineRes] = await Promise.all([
      getTargetVersions('miniapp_theme', 0).catch(() => ({ data: [] })),
      getTargetVersions('miniapp_navigation', 0).catch(() => ({ data: [] })),
      getTargetVersions('miniapp_mine', 0).catch(() => ({ data: [] })),
    ])
    themeVersions.value = extractVersionData(themeRes)
    navVersions.value = extractVersionData(navRes)
    mineVersions.value = extractVersionData(mineRes)
  } catch (err) {
    console.error('加载模块版本失败:', err)
    ElMessage.error('加载模块版本失败')
  } finally {
    moduleLoading.value = false
  }
}

function extractVersionData(res: any): ModuleVersionRecord[] {
  const data = (res as any)?.data?.data || (res as any)?.data || res
  return Array.isArray(data) ? data : []
}

function getStepSnapshot(stepKey: string): string {
  const snap: Record<string, any> = {}
  if (stepKey === 'theme') {
    snap.theme = { ...form.theme }
    snap.step = 'theme'
  } else if (stepKey === 'navigation') {
    snap.templateKey = form.templateKey
    snap.tabs = JSON.parse(JSON.stringify(form.tabs))
    snap.homePageId = form.homePageId
    snap.minePageId = form.minePageId
    snap.minePageMode = minePageMode.value
    snap.step = 'navigation'
  } else if (stepKey === 'mine') {
    snap.mineConfig = JSON.parse(JSON.stringify(form.mineConfig))
    snap.selectedMineTemplate = selectedMineTemplate.value
    snap.minePageMode = minePageMode.value
    snap.step = 'mine'
  }
  return JSON.stringify(snap)
}

const STEP_MODULE_MAP: Record<string, string> = {
  theme: 'miniapp_theme',
  navigation: 'miniapp_navigation',
  mine: 'miniapp_mine',
}

const STEP_LABEL_MAP: Record<string, string> = {
  theme: '风格配色',
  navigation: '导航配置',
  mine: '我的页面',
}

async function saveStepSnapshot(stepKey: string) {
  moduleSaving.value = true
  try {
    const { value } = await ElMessageBox.prompt(
      `保存「${STEP_LABEL_MAP[stepKey]}」的当前配置为版本快照`,
      '创建快照',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputPlaceholder: '描述本次变更内容（可选）',
        inputType: 'textarea',
      }
    ).catch(() => ({ value: '' }))

    const versionData = getStepSnapshot(stepKey)
    await createModuleVersion({
      moduleType: STEP_MODULE_MAP[stepKey],
      targetId: 0,
      versionData,
      changeSummary: value || undefined,
    })
    ElMessage.success(`${STEP_LABEL_MAP[stepKey]} 快照已保存`)
    loadModuleVersions()
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error('保存快照失败')
  } finally {
    moduleSaving.value = false
  }
}

async function handleModulePublish(row: ModuleVersionRecord) {
  publishingId.value = row.id
  try {
    await publishModuleVersion(row.id)
    ElMessage.success(`版本 ${row.semver} 已发布`)
    loadModuleVersions()
  } catch (err) {
    console.error('发布失败:', err)
  } finally {
    publishingId.value = null
  }
}

async function handleModuleRollback(row: ModuleVersionRecord) {
  try {
    const snapshot = row.versionData
    if (!snapshot) {
      ElMessage.warning('该版本无数据，无法回滚')
      return
    }
    const snap = JSON.parse(snapshot)
    if (snap.step === 'theme' && snap.theme) {
      Object.assign(form.theme, snap.theme)
    } else if (snap.step === 'navigation') {
      if (snap.templateKey) {
        form.templateKey = snap.templateKey
        applyTemplate(snap.templateKey)
      }
      if (Array.isArray(snap.tabs)) form.tabs = snap.tabs
      if (snap.homePageId !== undefined) form.homePageId = snap.homePageId
      if (snap.minePageId !== undefined) form.minePageId = snap.minePageId
    } else if (snap.step === 'mine' && snap.mineConfig) {
      Object.assign(form.mineConfig, snap.mineConfig)
      if (snap.selectedMineTemplate) {
        ;(form.mineConfig as any).templateStyle = snap.selectedMineTemplate
      }
      syncMineTemplateFromConfig()
    }
    ElMessage.success(`已回滚到版本 ${row.semver}`)
    loadModuleVersions()
  } catch (err) {
    console.error('回滚失败:', err)
    ElMessage.error('回滚失败，数据格式异常')
  }
}

async function handleModuleDelete(row: ModuleVersionRecord) {
  try {
    await deleteModuleVersion(row.id)
    ElMessage.success('已删除')
    loadModuleVersions()
  } catch (err) {
    console.error('删除失败:', err)
  }
}

onBeforeRouteLeave(() => {
  if (isDirty.value) {
    if (!window.confirm('有未保存的更改，确认离开？')) return false
  }
})

onMounted(async () => {
  const q = route.query
  if (q.scene === 'templates') {
    activeGroup.value = 'templates'
    return
  }
  const releaseId = toReleaseId(q.releaseId ?? q.id)
  if (releaseId) {
    await loadReleaseIntoEditor(releaseId)
    activeGroup.value = 'brand'
  } else if (q.new === '1') {
    editingTemplateId.value = null
    applyTemplate('standard')
    activeGroup.value = 'brand'
  }
})

// 已在本页时再次带参进入（如从模板点「编辑」），重新载入
watch(
  () => route.query.releaseId,
  async (releaseId) => {
    if (route.query.scene === 'templates') return
    const id = toReleaseId(releaseId)
    if (id) await loadReleaseIntoEditor(id)
  },
)

watch(
  () => route.query.scene,
  (scene) => {
    if (scene === 'templates') activeGroup.value = 'templates'
  },
)
</script>

<style lang="scss" scoped>
.appearance-page {
  padding-bottom: 24px;
}

.dirty-pill {
  padding: 3px 12px;
  color: var(--warning);
  font-size: 12px;
  font-weight: 600;
  background: var(--warning-soft);
  border: 1px solid var(--warning);
  border-radius: 99px;
  white-space: nowrap;
}

.pb-h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text);
}

.panel {
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.ap-more {
  padding-left: 10px;
  padding-right: 10px;
}

.ap-groups {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.ap-group-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  min-height: 108px;
  text-align: left;
  padding: 14px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: 0.15s;
}

.ap-group-card:hover {
  border-color: var(--color-primary, var(--brand));
  box-shadow: 0 0 0 2px var(--brand-soft);
}

.ap-group-card.active {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.ap-group-card.warn {
  border-color: var(--warning);
}

.ap-group-card__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.ap-group-card__desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.45;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: keep-all;
}

.ap-group-card__status {
  margin-top: auto;
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand);
}

.ap-group-card__status[data-status='live'] {
  background: var(--success-soft);
  color: var(--success);
}

.ap-group-card__status[data-status='empty'] {
  background: var(--danger-soft);
  color: var(--danger);
}

.ap-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.ap-grid--wide {
  grid-template-columns: 1fr;
}

.ap-config {
  min-width: 0;
}

.ap-card {
  min-width: 0;
  max-width: 100%;
}

.ap-card-head {
  margin-bottom: 18px;
}

.ap-card-head p {
  margin: 5px 0 0;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.55;
  white-space: normal;
}

.ap-inline-alert {
  margin-bottom: 16px;
}

.ap-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.ap-row + .ap-row,
.ap-row + .ap-block {
  margin-top: 12px;
}

.ap-row-inblock {
  border: none;
  border-radius: 0;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.ap-row-text {
  flex: 1 1 200px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ap-row-text strong,
.ap-row-text span {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: keep-all;
}

.ap-row-text strong {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

.ap-row-text span {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.ap-row-field {
  flex: 1 1 220px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.ap-row-field.el-select,
.ap-row :deep(.el-select) {
  min-width: 0;
}

.ap-row :deep(.el-radio-group) {
  flex-shrink: 0;
  flex-wrap: wrap;
}

.ap-block {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.ap-block-body {
  padding: 16px;
  background: var(--bg-page);
}

.ap-block-hint {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.55;
}

.mine-template-picker--inline {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.mine-template-picker--inline .mine-tpl-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  background: var(--bg-elevated);
  cursor: pointer;
  text-align: center;
}

.mine-template-picker--inline .mine-tpl-card.selected {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px var(--brand-soft);
}

.mine-template-picker--inline .mine-tpl-preview {
  height: 56px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 20px;
  color: #fff;
}

.mine-template-picker--inline .mine-tpl-name {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
}

.mine-template-picker--inline .mine-tpl-desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: keep-all;
}

.ap-preview {
  min-width: 0;
  position: sticky;
  top: 12px;
}

.ap-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  margin-bottom: 12px;
}

.section-divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
}

.section-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid var(--brand);
}

.share-image-upload {
  width: 120px;
  height: 120px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  display: grid;
  place-items: center;
  cursor: pointer;
  overflow: hidden;
}

.share-image-upload:hover {
  border-color: var(--brand);
}

.share-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

@media (max-width: 1180px) {
  .ap-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ap-grid {
    grid-template-columns: 1fr;
  }

  .ap-preview {
    position: static;
  }
}

/* ====== 模块版本弹窗 ====== */
.module-version-content {
  padding: 8px 0;
}
.module-version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  .module-desc {
    font-size: 13px;
    color: var(--text-muted);
  }
}
.semver {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-weight: 600;
  color: var(--brand);
}
</style>
