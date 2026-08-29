<template>
  <div class="miniapp-builder">
    <el-alert
      v-if="!hasDecoratedPages"
      type="warning"
      show-icon
      :closable="false"
      title="还没有可绑定的页面。请先在「页面」里创建并装修首页，再回来配置导航。"
      style="margin: 12px 20px 0"
    >
      <el-button type="primary" size="small" @click="$router.push('/page-builder/list')">去创建页面</el-button>
    </el-alert>
    <!-- ==================== VIEW A: Template Gallery ==================== -->
    <div v-if="viewMode === 'gallery'" class="template-gallery">
      <div class="builder-toolbar">
        <div class="toolbar-left">
          <h1>外观</h1>
          <p class="toolbar-sub">配置底部导航、首页绑定与主题。页面内容在「页面」里装修并上线；「我的」页在页面列表中配置。</p>
        </div>
        <div class="toolbar-right">
          <el-button type="success" plain @click="openFullMiniappPreview()">
            <el-icon><Cellphone /></el-icon> 小程序预览
          </el-button>
          <el-button type="primary" @click="handleNewBuild">
            <el-icon><Plus /></el-icon> 新建草稿
          </el-button>
          <el-button :loading="galleryLoading" @click="loadGalleryData">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </div>

      <div class="gallery-body">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-value">{{ templateCount }}</span>
              <span class="stat-label">草稿</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-value">{{ latestPublished ? latestPublished.semver : '无' }}</span>
              <span class="stat-label">当前还原点</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-value">{{ releases.length }}</span>
              <span class="stat-label">总版本数</span>
            </div>
          </div>
        </div>

        <div class="filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: galleryFilter === tab.value }"
            @click="galleryFilter = tab.value"
          >{{ tab.label }}</button>
        </div>

        <div v-if="filteredReleases.length > 0" class="template-grid">
          <div
            v-for="item in filteredReleases"
            :key="item.id"
            class="template-card"
            :class="{
              'card-published': item.status === 1,
              'card-template': item.mode === 'template' || item.status === 0,
            }"
          >
            <div class="card-header">
              <div class="card-badges">
                <el-tag v-if="item.status === 1" type="success" size="small" effect="dark">
                  已发布
                  <span v-if="item.isCurrentPublished" class="current-live-badge">★ 当前线上</span>
                </el-tag>
                <el-tag v-else-if="item.mode === 'template' || item.status === 0" type="primary" size="small" effect="dark">草稿</el-tag>
                <el-tag v-else-if="item.status === 2" type="info" size="small" effect="dark">已替换</el-tag>
              </div>
              <span class="card-semver" :style="{ color: getChangeTypeColor(item.changeType) }">
                {{ item.semver }}
              </span>
            </div>

            <div class="card-notes">{{ item.releaseNotes || '暂无说明' }}</div>

            <div class="card-meta">
              <span><el-icon><Document /></el-icon> {{ item.pageCount }} 页面</span>
              <span>{{ formatTime(item.createTime) }}</span>
            </div>

            <div class="card-actions">
              <el-button size="small" type="primary" @click="handleEditTemplate(item)">编辑</el-button>
              <el-button
                v-if="item.status !== 1"
                size="small"
                type="danger"
                plain
                @click="handleDelete(item)"
              >
                删除
              </el-button>
              <el-button
                v-if="item.mode === 'template' || item.status === 0"
                size="small"
                type="success"
                plain
                @click="$router.push('/page-builder/release')"
              >
                去版本
              </el-button>
              <el-dropdown trigger="click">
                <el-button size="small">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="openFullMiniappPreview(item)">小程序预览（本版本配置）</el-dropdown-item>
                    <el-dropdown-item @click="openH5Preview(item)">仅首页 H5</el-dropdown-item>
                    <el-dropdown-item @click="openPrototypeDemo">设计原型演示（22屏）</el-dropdown-item>
                    <el-dropdown-item :disabled="pushingReleaseId === item.id" @click="handlePushPreview(item)">
                      上传代码到微信
                    </el-dropdown-item>
                    <el-dropdown-item @click="copyFullPreviewLink(item)">复制预览链接</el-dropdown-item>
                    <el-dropdown-item v-if="item.status === 2" divided @click="handleRollback(item)">回滚到此版本</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>

        <div v-else class="empty-gallery">
          <el-empty description="暂无导航配置。请先完成首页装修，再新建草稿绑定导航。">
            <el-button type="primary" @click="$router.push('/page-builder/list')">去创建页面</el-button>
            <el-button @click="handleNewBuild">
              <el-icon><Plus /></el-icon> 新建草稿
            </el-button>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- ==================== VIEW B: Editor ==================== -->
    <div v-else class="editor-view">
      <div class="ap-header">
        <div class="ap-title">
          <h1>外观</h1>
          <p>小程序的底部导航、配色，以及首页和「我的」页。改完点右上角「保存」，小程序里就会更新。</p>
        </div>
        <div class="ap-actions">
          <span v-if="isDirty" class="dirty-pill">有未保存的修改</span>
          <el-button @click="openFullMiniappPreview()">
            <el-icon><Cellphone /></el-icon> 在手机上看
          </el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          <el-dropdown trigger="click">
            <el-button class="ap-more" title="更多操作">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goToGallery">草稿记录</el-dropdown-item>
                <el-dropdown-item @click="goToRelease">去「发布与版本」</el-dropdown-item>
                <el-dropdown-item divided @click="autoBindPages">按名称自动绑定页面</el-dropdown-item>
                <el-dropdown-item @click="showModuleVersionDialog = true">配置快照与回滚</el-dropdown-item>
                <el-dropdown-item divided @click="handleReset">恢复成默认配置</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="ap-body">
        <nav class="ap-nav">
          <button
            v-for="g in groups"
            :key="g.key"
            class="ap-nav-item"
            :class="{ active: activeGroup === g.key }"
            @click="activeGroup = g.key"
          >
            <span class="ap-nav-text">
              <span class="ap-nav-label">{{ g.label }}</span>
              <span class="ap-nav-desc">{{ g.desc }}</span>
            </span>
            <span v-if="g.issues > 0" class="ap-badge warn">{{ g.issues }}</span>
            <span v-else class="ap-badge ok">✓</span>
          </button>
          <div class="ap-nav-tip">
            四组可以随便点，不用按顺序走完。
          </div>
        </nav>

        <div class="ap-config" v-loading="loading">
          <!-- 品牌与配色 -->
          <div v-show="activeGroup === 'brand'" class="ap-card">
            <div class="ap-card-head">
              <h2>品牌与配色</h2>
              <p>先选一个行业配色，右侧预览会立刻变。不满意再单独调下面的颜色。</p>
            </div>
            <ThemeConfig v-model="form.theme" />
          </div>

          <!-- 底部导航 -->
          <div v-show="activeGroup === 'tabbar'" class="ap-card">
            <div class="ap-card-head">
              <h2>底部导航</h2>
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
              <h2>首页与我的页</h2>
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
                  <div class="ap-block-hint">模板里显示哪些内容 —— 改动会实时反映到右侧预览。</div>
                  <MinePageConfig v-model="form.mineConfig" />
                </template>
              </div>
            </div>
          </div>

          <!-- 高级设置 -->
          <div v-show="activeGroup === 'advanced'" class="ap-card">
            <div class="ap-card-head">
              <h2>高级设置</h2>
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

        <aside class="ap-preview">
          <div class="ap-preview-head">
            <span>实时预览</span>
            <el-button size="small" type="primary" link @click="openFullMiniappPreview()">完整预览 ›</el-button>
          </div>
          <MiniappPreview ref="previewRef" :form="form" :pages="pages" :mine-page-mode="minePageMode" />
        </aside>
      </div>
    </div>

    <!-- ==================== Module Version Dialog ==================== -->
    <el-dialog v-model="pushPreviewVisible" title="推送微信小程序体验版" width="560px" :close-on-click-modal="false">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="页面/配置变更会自动同步到小程序，无需推送。仅在 miniapp 代码变更或平台要求重新上传代码时使用。"
        style="margin-bottom: 16px"
      />
      <el-alert
        v-if="pushPreviewResult && isPushPreviewFailure(pushPreviewResult.message)"
        type="error"
        :closable="false"
        show-icon
        :title="pushPreviewResult.message"
        style="margin-bottom: 16px"
      />
      <el-descriptions v-if="pushPreviewResult" :column="1" border size="small">
        <el-descriptions-item label="版本号">{{ pushPreviewResult.version }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ pushPreviewResult.versionDesc }}</el-descriptions-item>
        <el-descriptions-item label="结果">{{ pushPreviewResult.message }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="pushPreviewResult?.manageUrl" class="push-preview-footer">
        <el-link type="primary" :href="pushPreviewResult.manageUrl" target="_blank">前往微信公众平台查看体验版</el-link>
      </div>
      <template #footer>
        <el-button @click="pushPreviewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showModuleVersionDialog" title="📦 模块版本管理" width="860px" :close-on-click-modal="false" @opened="loadModuleVersions">
      <el-tabs v-model="moduleVersionTab" type="border-card">
        <el-tab-pane label="🎨 风格配色" name="theme">
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

        <el-tab-pane label="🧭 导航配置" name="navigation">
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

        <el-tab-pane label="👤 我的页面" name="mine">
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
import { onBeforeRouteLeave } from 'vue-router'
import { Plus, Refresh, Document, Cellphone, MoreFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { uploadFile, normalizeUploadUrl } from '@/api/system'
import {
  getAllReleases,
  getLatestRelease,
  createRelease,
  promoteRelease,
  deleteRelease as deleteReleaseApi,
  rollbackRelease,
  getReleaseDetail,
  pushPreviewRelease,
} from '@/api/version'
import {
  getTargetVersions,
  createModuleVersion,
  publishModuleVersion,
  rollbackModuleVersion,
  deleteModuleVersion,
  type ModuleVersionRecord
} from '@/api/module-version'
import type { ReleaseRecord } from '@/types/page'
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

const {
  form, pages, loading, saving, isDirty,
  applyTemplate, handleSave, handleReset, autoBindPages,
} = useMiniappConfig()

const hasDecoratedPages = computed(() =>
  pages.value.some((p: any) => p && p.type !== 'system' && !String(p.id).startsWith('__')),
)

const router = useRouter()
const viewMode = ref<'gallery' | 'editor'>('editor')
const editingTemplateId = ref<number | null>(null)
const galleryLoading = ref(false)
const releases = ref<ReleaseRecord[]>([])
const latestPublished = ref<ReleaseRecord | null>(null)
const galleryFilter = ref<'all' | 'published' | 'template'>('all')

type GroupKey = 'brand' | 'tabbar' | 'pages' | 'advanced'
const activeGroup = ref<GroupKey>('brand')
const previewRef = ref<{ showMineTab: () => void } | null>(null)
const shareImageInput = ref<HTMLInputElement>()
const minePageMode = ref<'config' | 'custom'>('config')
const selectedMineTemplate = ref('basic')
const newReleaseInfo = ref<any>(null)

const showModuleVersionDialog = ref(false)
const moduleVersionTab = ref<'theme' | 'navigation' | 'mine'>('theme')
const themeVersions = ref<ModuleVersionRecord[]>([])
const navVersions = ref<ModuleVersionRecord[]>([])
const mineVersions = ref<ModuleVersionRecord[]>([])
const moduleLoading = ref(false)
const moduleSaving = ref(false)
const publishingId = ref<number | null>(null)
const pushingReleaseId = ref<number | null>(null)
const pushPreviewVisible = ref(false)
const pushPreviewResult = ref<any>(null)

const filterTabs: { label: string; value: 'all' | 'published' | 'template' }[] = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'template' },
]

const personalCenterTemplates = MINE_STYLE_TEMPLATES

/** 左侧四组导航：可随意点，不用按顺序走完；红色数字=这一组里还有几处要处理 */
const groups = computed<{ key: GroupKey; label: string; desc: string; issues: number }[]>(() => [
  { key: 'brand', label: '品牌与配色', desc: '主色、导航栏、页面背景', issues: 0 },
  { key: 'tabbar', label: '底部导航', desc: '最下面那一排按钮', issues: unboundTabs.value.length },
  {
    key: 'pages',
    label: '首页与我的页',
    desc: '打开小程序看到的第一屏',
    issues: form.homePageId ? 0 : 1,
  },
  { key: 'advanced', label: '高级设置', desc: '分享卡片、导航布局', issues: 0 },
])

const templateName = computed(() => {
  const tpl = NAV_TEMPLATES.find(t => t.key === form.templateKey)
  return tpl?.name || '自定义'
})

const boundCount = computed(() => form.tabs.filter(t => t.pageId || t.pagePath.includes('index')).length)
const unboundTabs = computed(() => form.tabs.filter(t => !t.pageId && !t.pagePath.includes('index')))
const visibleMenuCount = computed(() => form.mineConfig.menuItems.filter(m => m.enabled).length)

const templateCount = computed(() => releases.value.filter(r => r.status === 0 || r.mode === 'template').length)

const filteredReleases = computed(() => {
  if (galleryFilter.value === 'published') return releases.value.filter(r => r.status === 1)
  if (galleryFilter.value === 'template') return releases.value.filter(r => r.mode === 'template' || r.status === 0)
  return releases.value
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

// ==================== Gallery Functions ====================
async function loadGalleryData() {
  galleryLoading.value = true
  try {
    const [allRes, latestRes] = await Promise.all([
      getAllReleases(),
      getLatestRelease().catch(() => null),
    ])
    const data = (allRes.data as any)?.data || allRes.data || []
    releases.value = Array.isArray(data) ? data : []
    if (latestRes) {
      const ld = (latestRes as any).data || latestRes
      latestPublished.value = ld ? { ...ld, isCurrentPublished: true } : null
    }
    releases.value.forEach((r: any) => {
      if (latestPublished.value && r.id === latestPublished.value.id) {
        r.isCurrentPublished = true
      }
    })
  } catch (err) {
    console.error('加载模板数据失败:', err)
    ElMessage.error('加载导航配置失败')
  } finally {
    galleryLoading.value = false
  }
}

function handleNewBuild() {
  editingTemplateId.value = null
  newReleaseInfo.value = null
  applyTemplate('standard')
  activeGroup.value = 'brand'
  viewMode.value = 'editor'
}

async function handleEditTemplate(item: ReleaseRecord) {
  editingTemplateId.value = item.id
  newReleaseInfo.value = null
  viewMode.value = 'editor'
  loading.value = true
  try {
    const res = await getReleaseDetail(item.id)
    const detail = (res as any).data || res
    if (detail?.snapshot) {
      parseSnapshotToForm(detail.snapshot)
    }
  } catch (err) {
    console.error('加载模板详情失败:', err)
    ElMessage.error('加载模板详情失败，将使用默认配置')
    applyTemplate('standard')
  } finally {
    loading.value = false
  }
  activeGroup.value = 'brand'
}

async function handlePromote(item: ReleaseRecord) {
  try {
    await promoteRelease(item.id)
    ElMessage.success('外观已保存。绑定页面请在装修器点「上线」。')
    await loadGalleryData()
  } catch {
    ElMessage.error('发布失败，请重试')
  }
}

async function handleDelete(item: ReleaseRecord) {
  try {
    await ElMessageBox.confirm('确认删除此配置？删除后不可恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
    await deleteReleaseApi(item.id)
    ElMessage.success('已删除')
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败，请重试')
  }
}

async function handleRollback(item: ReleaseRecord) {
  try {
    await ElMessageBox.confirm(`确认回滚到 ${item.semver}？`, '回滚确认', {
      type: 'warning',
      confirmButtonText: '确认回滚',
      cancelButtonText: '取消',
    })
    await rollbackRelease({ targetSemver: item.semver, reason: `回滚到 ${item.semver}` })
    ElMessage.success(`已回滚到 ${item.semver}`)
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('回滚失败，请重试')
  }
}

function buildH5PreviewUrl(item: ReleaseRecord) {
  const { href } = router.resolve({
    path: '/h5/preview',
    query: {
      releaseId: String(item.id),
      semver: item.semver,
      path: 'pages/index/index',
      mode: item.mode === 'template' || item.status === 0 ? 'template' : 'release',
    },
  })
  return `${window.location.origin}${href}`
}

function buildFullPreviewUrl(item?: ReleaseRecord | null, view: 'prototype' | 'config' = 'config') {
  const query: Record<string, string> = { view }
  if (item?.id) {
    query.releaseId = String(item.id)
    if (item.semver) query.semver = item.semver
  } else {
    query.source = 'live'
  }
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query })
  return `${window.location.origin}${href}`
}

function openH5Preview(item: ReleaseRecord) {
  window.open(buildH5PreviewUrl(item), '_blank', 'noopener,noreferrer')
}

/** 无参=当前已保存配置；传入 release=该版本快照 */
function openFullMiniappPreview(item?: ReleaseRecord) {
  window.open(buildFullPreviewUrl(item || null, 'config'), '_blank', 'noopener,noreferrer')
}

function openPrototypeDemo() {
  window.open('/prototype/chuhai-notes.html', '_blank', 'noopener,noreferrer')
}

async function copyH5PreviewLink(item: ReleaseRecord) {
  const url = buildH5PreviewUrl(item)
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('H5 预览链接已复制')
  } catch {
    ElMessage.info(url)
  }
}

async function copyFullPreviewLink(item: ReleaseRecord) {
  const url = buildFullPreviewUrl(item, 'config')
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('小程序预览链接已复制')
  } catch {
    ElMessage.info(url)
  }
}

async function handlePushPreview(item: ReleaseRecord) {
  const releaseId = Number(item.id)
  if (!Number.isFinite(releaseId) || releaseId <= 0) {
    ElMessage.warning('请先保存还原点后再上传代码到微信')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认将版本 v${item.semver} 对应的代码包上传到微信体验版吗？\n\n这只会上传代码包，不会替你上线页面内容。`,
      '上传代码到微信',
      {
        confirmButtonText: '确认上传',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  pushingReleaseId.value = item.id
  pushPreviewResult.value = null
  const loadingMsg = ElMessage({
    message: '正在上传代码到微信，请稍候（约 10–60 秒）…',
    type: 'info',
    duration: 0,
    showClose: false,
  })
  try {
    const res = await pushPreviewRelease(releaseId, {
      versionDesc: item.releaseNotes || `后台上传体验版 v${item.semver}`,
      confirmCodeChange: true,
    })
    pushPreviewResult.value = (res as any).data || res
    pushPreviewVisible.value = true
    ElMessage.success('体验版推送成功，请到微信公众平台「版本管理 → 开发版本」查看')
  } catch (error: any) {
    const message = formatPushPreviewError(error)
    pushPreviewResult.value = { message, version: item.semver, manageUrl: 'https://mp.weixin.qq.com/' }
    pushPreviewVisible.value = true
    ElMessage.error(message)
  } finally {
    loadingMsg.close()
    pushingReleaseId.value = null
  }
}

function formatPushPreviewError(error: any): string {
  const apiMessage = String(error?.response?.data?.message || error?.message || '')
  const code = error?.response?.data?.code
  if (code === 5005 || apiMessage.includes('上传密钥')) {
    return '请先在「系统设置 → 基础配置」保存代码上传密钥，并确认提示「上传密钥已入库」'
  }
  if (apiMessage.includes('invalid ip') || apiMessage.includes('-10008')) {
    const ipMatch = apiMessage.match(/invalid ip:\s*([0-9.]+)/i)
    const ip = ipMatch?.[1] || '124.220.11.79'
    return `微信拒绝上传：服务器 IP ${ip} 未加入代码上传白名单。请到 mp.weixin.qq.com → 开发 → 开发设置 → IP白名单 添加后重试`
  }
  if (code === 400 || apiMessage.includes('参数格式错误')) {
    return '版本记录无效，请刷新页面后重试'
  }
  if (apiMessage.includes('signature fail') || apiMessage.includes('DECODER')) {
    return '代码上传密钥格式有误，请从微信公众平台重新下载并完整粘贴后保存'
  }
  return apiMessage || '体验版推送失败，请稍后重试'
}

function isPushPreviewFailure(message?: string) {
  if (!message) return false
  return !message.includes('成功') && !message.includes('最近一次体验版推送版本')
}

// ==================== Editor Functions ====================
async function handleSaveAsTemplate() {
  try {
    await handleSave()
    newReleaseInfo.value = null
    try {
      const res = await createRelease({
        mode: 'template',
        baseReleaseId: editingTemplateId.value || undefined,
        releaseNotes: `模板：${form.templateKey}模板，${form.tabs.length}个导航项`,
      })
      newReleaseInfo.value = (res as any).data || res
    } catch { /* ignore */ }
  } catch {
    ElMessage.error('保存导航草稿失败，请检查配置后重试')
  }
}

async function goToRelease() {
  try {
    if (isDirty.value) {
      const ok = await handleSave()
      if (!ok) return
    }
    await router.push({ path: '/page-builder/release' })
  } catch {
    // 保存失败时 handleSave 已提示，不跳转
  }
}

async function handlePublishOnline() {
  await goToRelease()
}

function goToGallery() {
  viewMode.value = 'gallery'
  editingTemplateId.value = null
  newReleaseInfo.value = null
  loadGalleryData()
}

function goToPageBuilder() {
  router.push('/page-builder/list')
}

function goToTemplateMarket() {
  router.push('/page-builder/template-center')
}

function goToSystemSettings() {
  router.push('/settings/basic')
}

function goToVersionManagement() {
  router.push('/page-builder/release')
}

// ==================== Common Helper Functions ====================
function formatTime(t: string | Date | null | undefined): string {
  if (!t) return '-'
  const d = typeof t === 'string' ? new Date(t) : t
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getChangeTypeColor(type: string): string {
  const map: Record<string, string> = { major: '#ef4444', minor: '#f59e0b', patch: '#10b981' }
  return map[type] || '#607187'
}

function changeTypeLabel(type: string): string {
  const map: Record<string, string> = { major: '主版本', minor: '次版本', patch: '修订版' }
  return map[type] || type
}

function getStatusLabel(s: number): string {
  const map: Record<number, string> = { 0: '草稿', 1: '已发布', 2: '已替换' }
  return map[s] || '未知'
}

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
  if (viewMode.value === 'editor' && isDirty.value) {
    if (!window.confirm('有未保存的更改，确认离开？')) return false
  }
})

onMounted(() => {
  loadGalleryData()
})
</script>

<style lang="scss" scoped>
.miniapp-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f6f8fb;
}

.dirty-pill {
  padding: 3px 12px;
  color: #b45309;
  font-size: 12px;
  font-weight: 600;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  border-radius: 99px;
  white-space: nowrap;
}

/* ====== 外观设置页（Header + 左侧分组 + 常驻预览） ====== */
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ap-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.ap-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
}

.ap-title p {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  line-height: 1.5;
  max-width: 640px;
}

.ap-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.ap-more {
  padding-left: 10px;
  padding-right: 10px;
}

.ap-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 左侧分组导航 */
.ap-nav {
  width: 216px;
  flex-shrink: 0;
  padding: 16px 12px;
  background: #fff;
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

.ap-nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  margin-bottom: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: 0.14s;
}

.ap-nav-item:hover {
  background: var(--bg-page, #f5f7fb);
}

.ap-nav-item.active {
  background: #eef3ff;
  border-color: #c7d6ed;
}

.ap-nav-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ap-nav-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
}

.ap-nav-item.active .ap-nav-label {
  color: var(--brand);
}

.ap-nav-desc {
  font-size: 11.5px;
  color: var(--text-muted, #94a3b8);
  line-height: 1.35;
}

.ap-badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 99px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.ap-badge.ok {
  color: #0faa6e;
  background: #e7f7f0;
}

.ap-badge.warn {
  color: #fff;
  background: #ef4444;
}

.ap-nav-tip {
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: 8px;
  background: var(--bg-page, #f5f7fb);
  color: var(--text-muted, #94a3b8);
  font-size: 11.5px;
  line-height: 1.5;
}

/* 中间配置区 */
.ap-config {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.ap-card {
  max-width: 720px;
  padding: 22px 24px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.ap-card-head {
  margin-bottom: 18px;
}

.ap-card-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.ap-card-head p {
  margin: 5px 0 0;
  font-size: 12.5px;
  color: var(--text-secondary, #64748b);
  line-height: 1.55;
}

.ap-inline-alert {
  margin-bottom: 16px;
}

.ap-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
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
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ap-row-text strong {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

.ap-row-text span {
  font-size: 12.5px;
  color: var(--text-secondary, #64748b);
}

.ap-row-field {
  width: 240px;
  flex-shrink: 0;
}

.ap-block {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.ap-block-body {
  padding: 16px;
  background: var(--bg-page, #f5f7fb);
}

.ap-block-hint {
  font-size: 12.5px;
  color: var(--text-secondary, #64748b);
  margin-bottom: 12px;
  line-height: 1.55;
}

/* 右侧常驻预览 */
.ap-preview {
  width: 400px;
  flex-shrink: 0;
  padding: 16px;
  background: #fff;
  border-left: 1px solid var(--border);
  overflow-y: auto;
}

.ap-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

/* ====== Gallery 顶部工具栏（保留） ====== */
.builder-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;

  h1 {
    font-size: 18px;
    font-weight: 800;
    margin: 0;
  }
}

.toolbar-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.toolbar-sub {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
}

.toolbar-right {
  display: flex;
  gap: 8px;
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

.share-config {
  margin-top: 4px;
}

.share-image-upload {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9e2ef;
  border-radius: 8px;
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

@media (max-width: 1400px) {
  .ap-preview {
    width: 348px;
  }
}

@media (max-width: 1180px) {
  .ap-body {
    flex-direction: column;
    overflow-y: auto;
  }

  .ap-nav {
    width: 100%;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .ap-nav-item {
    width: auto;
    margin-bottom: 0;
    white-space: nowrap;
  }

  .ap-nav-tip {
    display: none;
  }

  .ap-preview {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}

/* ====== Gallery View Styles ====== */
.template-gallery {
  display: flex;
  flex-direction: column;
  height: 100%;
  animation: fadeIn 0.25s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.gallery-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: 0.16s;

  &:hover {
    box-shadow: 0 4px 12px rgba(23,105,255,0.08);
    border-color: #c7d6ed;
  }

  .stat-icon {
    font-size: 32px;
    line-height: 1;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 800;
    color: var(--text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 2px;
  }
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-tab {
  padding: 7px 20px;
  border: 1px solid var(--border);
  border-radius: 99px;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  color: #607187;
  cursor: pointer;
  transition: 0.15s;

  &:hover {
    border-color: var(--brand);
    color: var(--brand);
  }

  &.active {
    background: var(--brand);
    color: #fff;
    border-color: var(--brand);
  }
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .template-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }
}

.template-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: 0.18s;
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: 0 6px 20px rgba(0,0,0,0.07);
    transform: translateY(-2px);
    border-color: #c7d6ed;
  }

  &.card-published {
    border-left: 3px solid #10b981;
  }

  &.card-template {
    border-left: 3px solid var(--brand);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.current-live-badge {
  margin-left: 4px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.card-semver {
  font-size: 18px;
  font-weight: 800;
  white-space: nowrap;
}

.card-notes {
  font-size: 13px;
  color: #607187;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 38px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #a0b4d0;
  gap: 8px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.card-actions {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
  flex-wrap: wrap;
}

.push-preview-footer {
  margin-top: 12px;
}

.empty-gallery {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  animation: fadeIn 0.35s ease;
}

/* ====== Success Pages ====== */
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
  color: #409eff;
}
</style>
