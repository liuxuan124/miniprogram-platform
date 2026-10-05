<template>
  <div class="mini-wb mw-page pages-view" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="list" />
    <template v-else>
      <MiniOpsConceptBanner variant="pages" />
      <div class="head">
        <div>
          <h1 class="h1">页面搭建</h1>
          <div class="sub">
            共 {{ totalCount + groupCounts.system }} 个（库表页 {{ totalCount }} · 系统页 {{ groupCounts.system }}）·
            <template v-for="(g, i) in headerGroups" :key="g.key">
              <span v-if="i > 0"> · </span>{{ g.label }} {{ g.count }}
            </template>
          </div>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn"
            @click="router.push({ path: '/mini/templates', query: { tab: 'page' } })"
          >
            <MiniIcon name="grid" :size="15" />
            从模板新建
          </button>
          <button type="button" class="btn" @click="createBlank">
            <MiniIcon name="plus" :size="15" />
            空白页面
          </button>
          <button type="button" class="btn primary" @click="router.push('/mini/pages/new-ai')">
            <MiniIcon name="spark" :size="15" />
            AI 生成页面
          </button>
        </div>
      </div>

      <!-- 新建 vs 修改：这两件事最容易混，点错就会攒出一堆同名副本 -->
      <section class="card scope-card">
        <div class="scope-item">
          <span class="scope-ic new"><MiniIcon name="plus" :size="15" /></span>
          <div>
            <b>新建页面</b>
            <span class="faint">从空白、模板或 AI 生成一个<b>新页面</b>。上方三个按钮都是新建，会产生新的页面记录。</span>
          </div>
        </div>
        <div class="scope-item">
          <span class="scope-ic edit"><MiniIcon name="pen" :size="15" /></span>
          <div>
            <b>修改已有页面</b>
            <span class="faint">点列表里的<b>「装修」</b>进入编辑器改的是<b>原页面</b>，保存目标就是它，不会新建副本。
              标题、分享、上下线这些属性去「页面配置」改。</span>
          </div>
          <button type="button" class="btn sm soft" @click="router.push('/mini/pages')">
            页面配置 ›
          </button>
        </div>
      </section>

      <!-- 底部导航绑定全景：哪一位绑了哪页、哪一位还空着，一眼可见 -->
      <div class="navmap">
        <div class="navmap__hd">
          <span class="navmap__t">底部导航</span>
          <span class="faint">点击已绑定的槽位直接进入装修</span>
          <button type="button" class="link navmap__go" @click="router.push('/mini/appearance?tab=nav')">
            去导航配置
          </button>
        </div>
        <div class="navmap__row">
          <template v-if="siteTabs.length">
            <button
              v-for="(tab, i) in siteTabs"
              :key="i"
              type="button"
              class="navslot"
              :class="{ 'navslot--empty': !navBoundPage(tab), 'navslot-- sys': navBoundIsSystem(tab) }"
              @click="onNavSlotClick(tab)"
            >
              <span class="navslot__i">{{ i + 1 }}</span>
              <span class="navslot__n">{{ tab.text || `导航 ${i + 1}` }}</span>
              <span class="navslot__p">
                {{ navBoundPage(tab)?.name || (navBoundIsSystem(tab) ? '系统原生页' : '未绑定') }}
              </span>
            </button>
          </template>
          <span v-else class="muted">尚未配置底部导航</span>
        </div>
      </div>

      <!-- 待发布：改动已存草稿但还没写入线上配置 -->
      <div v-if="pendingRows.length" class="pending-bar">
        <span class="tag t-pending">待发布</span>
        <b>{{ pendingRows.length }} 个页面的改动还没上线</b>
        <span class="faint">用户端看到的仍是旧版本 · {{ pendingPreviewNames }}</span>
        <span class="pending-bar__sp" />
        <button
          type="button"
          class="btn primary"
          @click="router.push('/mini/releases')"
        >
          去发布配置
        </button>
      </div>

      <div class="filters">
        <label class="search">
          <MiniIcon name="search" :size="15" />
          <input v-model="keyword" type="search" placeholder="搜索页面名称或路径" aria-label="搜索页面" />
        </label>
        <button
          v-for="opt in statusFilters"
          :key="opt.key"
          type="button"
          class="chip"
          :class="{ on: statusFilter === opt.key }"
          :aria-pressed="statusFilter === opt.key"
          @click="statusFilter = opt.key"
        >
          {{ opt.label }} {{ opt.count }}
        </button>
        <span class="filters__sp" />
        <div class="sortseg">
          <span class="faint">排序</span>
          <div class="seg">
            <button
              v-for="s in sortOptions"
              :key="s.key"
              type="button"
              :class="{ on: sortKey === s.key }"
              @click="sortKey = s.key"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 批量操作：清理测试残留 / 归档页不再逐个点三下 -->
      <div v-if="selectedIds.size" class="batchbar">
        <b>已选 {{ selectedIds.size }} 项</b>
        <span class="faint">{{ selectedSummary }}</span>
        <span class="batchbar__sp" />
        <button type="button" class="btn sm" :disabled="batchRunning" @click="batchToggleTest">
          标为测试页
        </button>
        <button type="button" class="btn sm" :disabled="batchRunning" @click="batchArchive">
          归档
        </button>
        <button type="button" class="btn sm danger" :disabled="batchRunning" @click="batchDelete">
          删除
        </button>
        <button type="button" class="link" @click="clearSelection">取消选择</button>
      </div>

      <div class="groups-stack">
        <template v-for="group in visibleGroups" :key="group.key">
          <section
            class="group"
            :class="{ arch: group.key === 'archived', closed: closedGroups[group.key] && !filtering }"
          >
            <button
              type="button"
              class="g-head"
              :aria-expanded="!(closedGroups[group.key] && !filtering)"
              @click="toggleGroup(group.key)"
            >
              <b>{{ group.label }}</b>
              <span class="faint">{{ group.total }} 个</span>
              <span v-if="groupSub(group.key)" class="faint g-head__note">{{ groupSub(group.key) }}</span>
              <span class="g-head__arrow" :class="{ closed: closedGroups[group.key] && !filtering }">
                <MiniIcon name="down" :size="16" />
              </span>
            </button>

            <template v-if="!(closedGroups[group.key] && !filtering)">
              <!-- 系统页：小程序内置原生页，不可装修，只能改配置或绑导航位 -->
              <template v-if="group.key === 'system'">
                <template v-for="sp in systemRows" :key="'sys-' + sp.path">
                  <div
                    class="prow sys-row"
                    :class="{ 'sys-row--mine': isMineSystemPage(sp), 'sys-row--login': isLoginSystemPage(sp) }"
                    @mouseenter="isMineSystemPage(sp) ? scheduleMineHover($event) : (isLoginSystemPage(sp) ? scheduleLoginHover($event) : scheduleSysHover(sp, $event))"
                    @mouseleave="isMineSystemPage(sp) ? cancelMineHover() : (isLoginSystemPage(sp) ? cancelLoginHover() : cancelHover())"
                  >
                    <div class="thumb">
                      <i style="background: #e2ddd4" /><i style="background: #e2ddd4" /><i style="background: #e2ddd4" />
                    </div>
                    <div class="pname">
                      <b>{{ sp.name }}</b>
                      <div class="faint">{{ sp.desc }} · {{ sp.path }}</div>
                    </div>
                    <div class="prow-ops">
                      <span class="tag t-live">系统页</span>
                      <span v-if="tabSlotByPath(sp)" class="tag t-slot">导航位 {{ tabSlotByPath(sp) }}</span>
                      <span v-if="isMineSystemPage(sp)" class="tag t-tpl">模板 · {{ mineTemplateName }}</span>
                      <span v-if="isLoginSystemPage(sp)" class="tag t-tpl">模板 · {{ loginTemplateName }}</span>
                      <button
                        type="button"
                        class="btn soft sm"
                        :title="`前往 ${systemPageConfigRoute(sp)}`"
                        @click="router.push(systemPageConfigRoute(sp))"
                      >
                        {{ sp.configLabel || '配置' }}
                      </button>
                      <!--
                        「我的」系统页的显式入口：与「配置模板」同一个目标，
                        但文案更直白地说明这是「配置这个页面」，避免用户以为只能换模板。
                      -->
                      <button
                        v-if="isMineSystemPage(sp)"
                        type="button"
                        class="btn primary sm"
                        title="打开「我的」页配置（模板 / 主题 / 模块 / 菜单）"
                        @click="router.push('/page-builder/mine')"
                      >
                        配置页面
                      </button>
                      <!--
                        「登录」系统页的显式入口：与「配置模板」同一个目标，
                        但文案更直白地说明这是「配置这个页面」，避免用户以为只能换模板。
                      -->
                      <button
                        v-if="isLoginSystemPage(sp)"
                        type="button"
                        class="btn primary sm"
                        title="打开「登录」页配置（模板 / 主题 / 模块显隐）"
                        @click="router.push('/page-builder/login')"
                      >
                        配置页面
                      </button>
                    </div>
                  </div>

                  <!-- 「我的」的模板库：系统页只有一行，但它的模板必须能在这儿被看见、被选中 -->
                  <div v-if="isMineSystemPage(sp)" class="tpl-stack">
                    <div class="tpl-stack__hd">
                      <b>「我的」页模板库</b>
                      <span class="faint">
                        {{ MINE_TEMPLATES.length }} 套 · 点任意一套即套用到「我的」页（皮肤与主色保留）
                      </span>
                      <button
                        type="button"
                        class="link tpl-stack__toggle"
                        @click="mineTplOpen = !mineTplOpen"
                      >
                        {{ mineTplOpen ? '收起' : `展开 ${MINE_TEMPLATES.length} 套` }}
                      </button>
                    </div>
                    <div v-if="mineTplOpen" class="tpl-stack__list">
                      <button
                        v-for="tpl in MINE_TEMPLATES"
                        :key="tpl.key"
                        type="button"
                        class="tpl-item"
                        :class="{ 'tpl-item--active': mineTemplateKey === tpl.key }"
                        :disabled="!!applyingTplKey"
                        @click="applyMineTemplate(tpl)"
                      >
                        <span class="tpl-item__thumb">
                          <span class="tpl-item__inner">
                            <MinePagePreview :mine-config="templateThumbConfig(tpl.key)" :theme="minePreviewTheme" />
                          </span>
                        </span>
                        <span class="tpl-item__body">
                          <span class="tpl-item__name">
                            {{ tpl.name }}
                            <em v-if="mineTemplateKey === tpl.key">使用中</em>
                          </span>
                          <span class="faint tpl-item__meta">
                            {{ tpl.desc }} · {{ tpl.menuKeys.length }} 项菜单 · {{ tpl.scene }}
                          </span>
                        </span>
                        <span class="tpl-item__op">
                          {{ applyingTplKey === tpl.key ? '套用中…' : '套用' }}
                        </span>
                      </button>
                    </div>
                  </div>

                  <!-- 「登录」的模板库：与「我的」同款交互，点套用直接写入待上线草稿 -->
                  <div v-if="isLoginSystemPage(sp)" class="tpl-stack">
                    <div class="tpl-stack__hd">
                      <b>「登录」页模板库</b>
                      <span class="faint">
                        {{ LOGIN_TEMPLATES.length }} 套 · 点任意一套即套用到登录页（文案与皮肤整体替换）
                      </span>
                      <button
                        type="button"
                        class="link tpl-stack__toggle"
                        @click="loginTplOpen = !loginTplOpen"
                      >
                        {{ loginTplOpen ? '收起' : `展开 ${LOGIN_TEMPLATES.length} 套` }}
                      </button>
                    </div>
                    <div v-if="loginTplOpen" class="tpl-stack__list">
                      <button
                        v-for="tpl in LOGIN_TEMPLATES"
                        :key="tpl.key"
                        type="button"
                        class="tpl-item"
                        :class="{ 'tpl-item--active': loginTemplateKey === tpl.key }"
                        :disabled="!!applyingLoginTplKey"
                        @click="applyLoginTemplate(tpl)"
                      >
                        <span class="tpl-item__thumb">
                          <span class="tpl-item__inner">
                            <LoginPagePreview :login-config="loginTplThumbConfig(tpl.key)" :theme="minePreviewTheme" />
                          </span>
                        </span>
                        <span class="tpl-item__body">
                          <span class="tpl-item__name">
                            {{ tpl.name }}
                            <em v-if="loginTemplateKey === tpl.key">使用中</em>
                          </span>
                          <span class="faint tpl-item__meta">
                            {{ tpl.desc }} · {{ tpl.scene }}
                          </span>
                        </span>
                        <span class="tpl-item__op">
                          {{ applyingLoginTplKey === tpl.key ? '套用中…' : '套用' }}
                        </span>
                      </button>
                    </div>
                  </div>
                </template>
                <div v-if="!systemRows.length" class="muted" style="padding: 14px 16px">
                  没有符合条件的系统页
                </div>
              </template>

              <template v-else-if="group.rows.length">
                <div
                  v-for="row in group.rows"
                  :key="String(row.id)"
                  class="prow"
                  @mouseenter="scheduleHover(row, $event)"
                  @mouseleave="cancelHover"
                >
                  <label class="pick" @click.stop>
                    <input
                      type="checkbox"
                      :checked="selectedIds.has(row.id)"
                      aria-label="选择该页面"
                      @change="toggleSelect(row.id)"
                    />
                  </label>
                  <div class="thumb">
                    <i
                      v-for="(c, i) in thumbColors(row)"
                      :key="i"
                      :style="{ background: c }"
                    />
                  </div>
                  <div class="pname">
                    <b>{{ row.name }}</b>
                    <div class="pmeta">
                      <span v-if="navLabel(row)" class="tag t-slot">{{ navLabel(row) }}</span>
                      <span v-else-if="isNamesake(row)" class="faint">同名未绑导航</span>
                      <span v-if="expireLabel(row)" class="tag t-draft">{{ expireLabel(row) }}</span>
                      <span v-if="diffLabel(row)" class="tag t-pending">{{ diffLabel(row) }}</span>
                      <span v-if="accessLabel(row)" class="faint">{{ accessLabel(row) }}</span>
                      <span class="faint path">{{ row.path }}</span>
                    </div>
                  </div>
                  <div class="prow-time" :title="formatUpdatedFull(row)">
                    {{ formatUpdated(row) || '—' }}
                  </div>
                  <div class="prow-ops">
                    <div class="pstat">
                      <PageStatusTag :row="row" />
                      <span v-if="isTestPage(row)" class="tag t-err" style="margin-left: 4px">测试</span>
                    </div>
                    <button
                      v-if="canOffline(row)"
                      type="button"
                      class="btn soft sm prow-offline-btn"
                      title="下线该页面"
                      @click="onQuickOffline(row)"
                    >
                      下线
                    </button>
                    <button type="button" class="btn soft sm" @click="openEditor(row)">装修</button>
                    <button
                      v-if="canDelete(row)"
                      type="button"
                      class="iconbtn prow-del-btn"
                      :class="{ 'is-danger': true }"
                      title="删除该页面"
                      aria-label="删除"
                      @click="onQuickDelete(row)"
                    >
                      <MiniIcon name="trash" :size="15" />
                    </button>
                    <PageRowMenu
                      :row="row"
                      :archived="isArchived(row)"
                      :is-nav="tabIndexOf(row) >= 0"
                      :is-activity="inferPageGroup(row) === 'activity'"
                      :is-test="isTestPage(row)"
                      :can-offline="canOffline(row)"
                      :can-delete="canDelete(row)"
                      @command="onMore"
                    />
                  </div>
                </div>
              </template>
              <div v-else class="muted" style="padding: 14px 16px">
                这一组还没有页面
              </div>
            </template>
          </section>
        </template>
        <div v-if="!visibleGroups.length" class="card muted">没有符合条件的页面</div>
      </div>
    </template>

    <el-dialog
      v-model="navDialogVisible"
      class="mini-wb-overlay"
      :title="navDialogMode === 'entry' ? '设置入口' : '设为导航入口'"
      width="440px"
    >
      <p class="nav-dialog-hint">
        {{
          navDialogMode === 'entry'
            ? '可选底部导航位，并设置活动到期时间（到期后发布前会拦截）。'
            : '将「' + (navTarget?.name || '') + '」绑定到选中的底部导航位。'
        }}
      </p>
      <el-radio-group v-model="navSlotIndex" class="nav-slots">
        <el-radio v-for="(tab, i) in siteTabs" :key="i" :value="i">
          {{ i + 1 }}. {{ tab.text || `导航 ${i + 1}` }}
          <span class="muted">（现：{{ tab.pageName || tab.pagePath || '未绑定' }}）</span>
        </el-radio>
      </el-radio-group>
      <div v-if="navDialogMode === 'entry'" class="entry-expire">
        <label class="faint">入口到期（可选）</label>
        <el-date-picker
          v-model="entryExpireAt"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="不填则长期有效"
          style="width: 100%"
        />
      </div>
      <template #footer>
        <el-button @click="navDialogVisible = false">取消</el-button>
        <el-button type="primary" class="mw-btn-primary" :loading="navSaving" @click="confirmSetNav">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 行悬停预览：不用新开 tab 就能看到页面长什么样 -->
    <PageHoverPreview
      :visible="hoverVisible"
      :src="hoverSrc"
      :title="hoverTitle"
      :hint="hoverHint"
      :top="hoverPos.top"
      :left="hoverPos.left"
      :flip="hoverPos.flip"
    />

    <!-- 「我的」系统页的悬停预览：原生页没有 H5 版本，直接渲染管理端自己的预览 -->
    <MineTemplateHoverPreview
      :visible="mineHoverVisible"
      :mine-config="mineDisplayConfig"
      :theme="minePreviewTheme"
      :template-name="mineTemplateName"
      :menu-count="mineMenuCount"
      :top="mineHoverPos.top"
      :left="mineHoverPos.left"
    />

    <!-- 「登录」系统页的悬停预览：原生页，渲染管理端自己的 LoginPagePreview -->
    <LoginTemplateHoverPreview
      :visible="loginHoverVisible"
      :login-config="loginDisplayConfig"
      :theme="minePreviewTheme"
      :template-name="loginTemplateName"
      :top="loginHoverPos.top"
      :left="loginHoverPos.left"
    />

    <PageVersionDialog v-model="versionVisible" :page="versionTarget" @rolled-back="load" />

    <MiniH5QrDialog
      v-model="qrVisible"
      mode="miniapp-draft"
      :screen-path="qrPath"
      :title="qrTitle"
      :hint="qrHint"
    />

    <!-- 设置分组：选标准分组 / 已有自定义分组 / 输入新分组名 -->
    <el-dialog
      v-model="groupDialogVisible"
      class="mini-wb-overlay"
      title="设置分组"
      width="460px"
    >
      <p class="nav-dialog-hint">
        将「{{ groupTarget?.name || '' }}」移动到哪个分组？可直接输入新分组名创建自定义分组。
      </p>
      <div class="group-pick">
        <button
          v-for="opt in groupOptions"
          :key="opt.key"
          type="button"
          class="group-pick__item"
          :class="{ 'group-pick__item--active': groupTargetCurrent === opt.key }"
          @click="groupTarget && moveToGroup(groupTarget, opt.key)"
        >
          <span class="group-pick__label">{{ opt.label }}</span>
          <span v-if="opt.custom" class="group-pick__tag">自定义</span>
        </button>
      </div>
      <div class="group-new">
        <label class="faint">新建自定义分组</label>
        <div class="group-new__row">
          <el-input
            v-model="groupInput"
            placeholder="输入分组名，如「秒杀会场」「双11」"
            maxlength="32"
            @keyup.enter="groupInput.trim() && groupTarget && moveToGroup(groupTarget, groupInput.trim())"
          />
          <el-button
            type="primary"
            class="mw-btn-primary"
            :disabled="!groupInput.trim()"
            @click="groupInput.trim() && groupTarget && moveToGroup(groupTarget, groupInput.trim())"
          >
            创建并移动
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageStatusTag from '@/components/mini/PageStatusTag.vue'
import PageRowMenu from '@/components/mini/PageRowMenu.vue'
import PageVersionDialog from '@/components/mini/PageVersionDialog.vue'
import PageHoverPreview from '@/components/mini/PageHoverPreview.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniOpsConceptBanner from '@/components/mini/MiniOpsConceptBanner.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import { getPageList, createPage, deletePage, unpublishPage, duplicatePage, updatePage, publishPage, getVersionList } from '@/api/page'
import { getMiniSite, updateMiniSite, publishMiniSite, type MiniTabBarItem } from '@/api/miniSite'
import { getPageAccess } from '@/api/statistics'
import {
  inferPageGroup,
  PAGE_GROUP_LABELS,
  PAGE_GROUP_SUB,
  MINI_SYSTEM_PAGES,
  listableSystemPages,
  systemPageConfigRoute,
  isMineSystemPage,
  isLoginSystemPage,
  resolvePageStatus,
  isStandardPageGroup,
  resolveGroupLabel,
  resolveGroupSub,
  STANDARD_PAGE_GROUPS,
  type MiniPageStatus,
  type MiniSystemPage,
} from '@/utils/pageStatus'
import type { PageRecord } from '@/types/page'
import MinePagePreview from '@/components/miniapp-builder/MinePagePreview.vue'
import MineTemplateHoverPreview from '@/components/mini/MineTemplateHoverPreview.vue'
import LoginPagePreview from '@/components/miniapp-builder/LoginPagePreview.vue'
import LoginTemplateHoverPreview from '@/components/mini/LoginTemplateHoverPreview.vue'
import { getConfigByGroupSilent, updateConfigs } from '@/api/system'
import {
  CONFIG_KEYS,
  DEFAULT_THEME,
  DEFAULT_LOGIN_PAGE_CONFIG,
  applyMineStylePreset,
  resolveMineStyleKey,
  resolveLoginPageStyleKey,
  type MinePageConfig as MinePageConfigType,
  type LoginPageConfig as LoginPageConfigType,
  type ThemeConfig,
} from '@/types/miniapp'
import {
  MINE_TEMPLATES,
  buildTemplateConfig,
  getMineTemplate,
  resolveTemplateKey,
  type MineTemplatePreset,
} from '@/components/miniapp-builder/mineTemplates'
import {
  LOGIN_TEMPLATES,
  buildLoginTemplateConfig,
  resolveLoginTemplateName,
  resolveLoginTemplateKey,
  type LoginTemplatePreset,
} from '@/components/miniapp-builder/loginTemplates'

defineOptions({ name: 'MiniPages' })

const THUMB_PALETTE = ['#E8C4A8', '#C9D6E8', '#C5DCC9', '#E8D5A8', '#E0C4D4', '#D9CFC3', '#F0D5C0', '#B7D4BC']

const router = useRouter()
const loading = ref(false)
const loaded = ref(false)
const pages = ref<PageRecord[]>([])
const keyword = ref('')
const statusFilter = ref<'all' | MiniPageStatus>('all')
const siteTabs = ref<MiniTabBarItem[]>([])
const closedGroups = reactive<Record<string, boolean>>({ archived: true })

const navDialogVisible = ref(false)
const navDialogMode = ref<'nav' | 'entry'>('nav')
const navTarget = ref<PageRecord | null>(null)
const navSlotIndex = ref(0)
const navSaving = ref(false)
const entryExpireAt = ref<string | null>(null)

/** 近 30 天页面访问统计：key = 去掉 query 的路径（带前导 /） */
type PageAccessStat = { pv: number; uv: number }
const pageAccessMap = ref<Record<string, PageAccessStat>>({})

/** 多选：批量归档 / 删除 / 标测试 */
const selectedIds = ref<Set<number>>(new Set())
const batchRunning = ref(false)

/** 排序：默认按分组原顺序，其余用于「找最近改的」「找最热的」 */
type SortKey = 'default' | 'updated' | 'pv'
const sortKey = ref<SortKey>('default')
const sortOptions = [
  { key: 'default' as SortKey, label: '默认' },
  { key: 'updated' as SortKey, label: '最近更新' },
  { key: 'pv' as SortKey, label: '访问最多' },
]

/** 悬停预览 */
const hoverVisible = ref(false)
const hoverSrc = ref('')
const hoverTitle = ref('')
const hoverHint = ref('')
const hoverPos = ref<{ top: number; left: number; flip: boolean }>({ top: 0, left: 0, flip: false })
let hoverTimer: ReturnType<typeof setTimeout> | undefined

/** 版本记录 / 扫码真机 */
const versionVisible = ref(false)
const versionTarget = ref<PageRecord | null>(null)
const qrVisible = ref(false)
const qrPath = ref('')
const qrTitle = ref('扫码看真机')
const qrHint = ref('')

/** 设置分组对话框：可选标准分组 / 现有自定义分组 / 输入新分组名 */
const groupDialogVisible = ref(false)
const groupTarget = ref<PageRecord | null>(null)
const groupInput = ref('')
/** 当前可选的分组列表（标准 + 数据中已存在的自定义 + 用户在对话框里新输入的） */
const groupOptions = computed(() => {
  const std = STANDARD_PAGE_GROUPS.filter((g) => g !== 'system').map((g) => ({
    key: g,
    label: PAGE_GROUP_LABELS[g],
    custom: false,
  }))
  const custom = customGroupKeys.value.map((g) => ({ key: g, label: g, custom: true }))
  return [...std, ...custom]
})

/** 当前目标页面所在的分组（高亮用） */
const groupTargetCurrent = computed(() => {
  if (!groupTarget.value) return ''
  return inferPageGroup(groupTarget.value)
})

function normalizeAccessPath(raw: string) {
  const p = String(raw || '').split('#')[0].split('?')[0]
  if (!p) return ''
  return p.startsWith('/') ? p : `/${p}`
}

async function loadPageAccess() {
  try {
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }
    const end = new Date()
    const start = new Date(Date.now() - 29 * 24 * 3600 * 1000)
    const res = await getPageAccess(fmt(start), fmt(end))
    const list = ((res as any)?.data || []) as Array<{ pagePath?: string; accessCount?: number; visitorCount?: number }>
    const map: Record<string, PageAccessStat> = {}
    for (const item of Array.isArray(list) ? list : []) {
      const key = normalizeAccessPath(String(item.pagePath || ''))
      if (!key) continue
      const prev = map[key] || { pv: 0, uv: 0 }
      prev.pv += Number(item.accessCount || 0)
      prev.uv += Number(item.visitorCount || 0)
      map[key] = prev
    }
    pageAccessMap.value = map
  } catch {
    pageAccessMap.value = {}
  }
}

/** 行的访问统计：页面自身路径 + 绑定到本页的 Tab 路由（绑定页的真实访问都记在 Tab 路由上） */
function rowAccess(row: PageRecord): PageAccessStat | null {
  const keys = new Set<string>()
  const own = normalizeAccessPath(String(row.path || ''))
  if (own) keys.add(own)
  const ti = tabIndexOf(row)
  if (ti >= 0) {
    const tab = siteTabs.value[ti]
    const route = normalizeAccessPath(String(tab?.tabRoute || ''))
    if (route) keys.add(route)
  }
  let pv = 0
  let uv = 0
  keys.forEach((k) => {
    const stat = pageAccessMap.value[k]
    if (stat) {
      pv += stat.pv
      uv += stat.uv
    }
  })
  return pv > 0 ? { pv, uv } : null
}

const filtering = computed(() => !!keyword.value.trim() || statusFilter.value !== 'all')

/** 草稿与线上不一致的页面：这些改动用户端还看不到 */
const pendingRows = computed(() =>
  pages.value.filter(
    (row) =>
      !String(row.path || '').includes('/pages/mine/mine') && resolvePageStatus(row) === 'pending',
  ),
)

const pendingPreviewNames = computed(() => {
  const names = pendingRows.value.slice(0, 3).map((r) => r.name)
  return names.join('、') + (pendingRows.value.length > 3 ? ` 等 ${pendingRows.value.length} 个` : '')
})

/**
 * 🔴 2026-10-05 删除 publishAllPending（原「一键同步到线上」）。
 * 两个理由，都不是"顺手清理"：
 * 1. 语义冲突：它绕过「发布与版本」页的预检与勾选，直接逐页 publishPage，
 *    等于留了一个"点了就上线、没检查"的旁路。本次改造的核心就是消除这种歧义入口。
 * 2. 部分更新风险：逐页循环里 catch 只记 warning 不回滚，最后 publishMiniSite
 *    又是静默 catch —— 会出现"一半页面上线、站点配置没升版本号"的中间态，
 *    而 live_release_no 是小程序缓存失效锚点，不递增就等于用户端继续读旧缓存。
 * 现在待发布条只做「去发布配置」跳转，发布路径唯一。
 */

const totalCount = computed(() =>
  pages.value.filter((row) => !String(row.path || '').includes('/pages/mine/mine')).length,
)

/** 各分组计数（系统页取自内置清单，其余来自库表页面；含自定义分组） */
const groupCounts = computed<Record<string, number>>(() => {
  const c: Record<string, number> = {
    system: listableSystemPages().length,
    decorate: 0,
    ai: 0,
    activity: 0,
    archived: 0,
  }
  for (const row of pages.value) {
    if (String(row.path || '').includes('/pages/mine/mine')) continue
    const g = inferPageGroup(row)
    c[g] = (c[g] || 0) + 1
  }
  return c
})

/** 数据中出现的自定义分组 key（非标准值），按字母序排 */
const customGroupKeys = computed<string[]>(() => {
  const set = new Set<string>()
  for (const row of pages.value) {
    if (String(row.path || '').includes('/pages/mine/mine')) continue
    const g = inferPageGroup(row)
    if (!isStandardPageGroup(g)) set.add(g)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
})

/** 页头分组计数列表（系统页 + 装修页 + AI + 活动 + 自定义… + 归档，仅显示非零项） */
const headerGroups = computed(() => {
  const result: Array<{ key: string; label: string; count: number }> = []
  for (const k of GROUP_ORDER.value) {
    const count = groupCounts.value[k] || 0
    if (count > 0) {
      result.push({ key: k, label: resolveGroupLabel(k), count })
    }
  }
  return result
})

function matchRow(row: PageRecord) {
  const path = String(row.path || '')
  if (path.includes('/pages/mine/mine')) return false
  const q = keyword.value.trim().toLowerCase()
  if (q) {
    const hay = `${row.name || ''} ${path}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (statusFilter.value !== 'all' && resolvePageStatus(row) !== statusFilter.value) return false
  return true
}

const statusFilters = computed(() => {
  const counts: Record<string, number> = {
    all: 0, pending: 0, live: 0, draft: 0, offline: 0, archived: 0,
  }
  for (const row of pages.value) {
    if (String(row.path || '').includes('/pages/mine/mine')) continue
    const st = resolvePageStatus(row)
    if (st in counts) counts[st] += 1
  }
  // 「全部」的口径必须与页头总数一致 = 库表页 + 系统页。
  // 旧实现只累加库表页，导致页头写「共 26 个」而筛选栏写「全部 24」的自相矛盾。
  // 其余状态项仍只数库表页——系统页来自内置清单，本来就没有发布状态。
  const systemCount = listableSystemPages().length
  return [
    { key: 'all' as const, label: '全部', count: counts.all + systemCount },
    { key: 'pending' as const, label: '待同步', count: counts.pending },
    { key: 'live' as const, label: '已上线', count: counts.live },
    { key: 'draft' as const, label: '草稿', count: counts.draft },
    { key: 'offline' as const, label: '已下线', count: counts.offline },
    { key: 'archived' as const, label: '归档', count: counts.archived },
  ]
})

/**
 * 分组顺序：系统页 → 装修页 → AI 页面 → 活动与专题 → [自定义分组…] → 归档。
 * 旧口径把「底部导航」当分类，槽位与页面混排；现在按页面来源分，
 * 导航绑定退化为行内标签（rowSub 里的「导航 N」）。
 * 自定义分组在标准分组之后、归档之前出现（归档恒为最后一组）。
 */
const GROUP_ORDER = computed<string[]>(() => {
  return [...STANDARD_PAGE_GROUPS, ...customGroupKeys.value, 'archived']
})

/** 排序键 -> 排序值：越大越靠前 */
function sortValue(row: PageRecord, key: SortKey): number {
  if (key === 'updated') {
    const t = String((row as any).updateTime || (row as any).updatedAt || (row as any).updated_at || '')
    return t ? new Date(t.replace(' ', 'T')).getTime() || 0 : 0
  }
  if (key === 'pv') return rowAccess(row)?.pv ?? 0
  return 0
}

const groups = computed(() => {
  const buckets: Record<string, PageRecord[]> = {}
  const totals: Record<string, number> = { ...groupCounts.value }
  for (const row of pages.value) {
    if (String(row.path || '').includes('/pages/mine/mine')) continue
    const g = inferPageGroup(row)
    if (!buckets[g]) buckets[g] = []
    if (matchRow(row)) buckets[g].push(row)
  }
  const key = sortKey.value
  if (key !== 'default') {
    Object.keys(buckets).forEach((k) => {
      buckets[k].sort((a, b) => sortValue(b, key) - sortValue(a, key))
    })
  }
  return GROUP_ORDER.value.map((k) => ({
    key: k,
    label: resolveGroupLabel(k),
    rows: buckets[k] || [],
    total: totals[k] || 0,
  }))
})

/** 行的路径（去掉前导 /），用于预览 iframe 的 screen 参数 */
function screenPathOf(row: PageRecord) {
  return String(row.path || '').replace(/^\//, '')
}

function scheduleHover(row: PageRecord, evt: MouseEvent) {
  cancelHover()
  const el = evt.currentTarget as HTMLElement | null
  if (!el) return
  hoverTimer = setTimeout(() => {
    const path = screenPathOf(row)
    if (!path) return
    const rect = el.getBoundingClientRect()
    const cardW = 232
    const cardH = 500
    const flip = rect.right + 16 + cardW > window.innerWidth
    const left = flip ? Math.max(12, rect.left - cardW - 16) : rect.right + 16
    const top = Math.min(Math.max(12, rect.top - 40), Math.max(12, window.innerHeight - cardH - 12))
    hoverPos.value = { top, left, flip }
    hoverTitle.value = String(row.name || '')
    hoverHint.value = path
    hoverSrc.value = `${window.location.origin}/h5/miniapp-preview?view=config&source=draft&embed=1&screen=${encodeURIComponent(path)}`
    hoverVisible.value = true
  }, 600)
}

function cancelHover() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = undefined
  hoverVisible.value = false
}

/**
 * 系统页（非「我的」）悬停预览：首页/发现/星球/商城/登录/搜索
 * 走 H5 预览 iframe（screen=sp.path），与装修页同一个 PageHoverPreview 组件。
 * 「我的」不走这里——它用 MineTemplateHoverPreview 渲染管理端自己的预览。
 */
function scheduleSysHover(sp: MiniSystemPage, evt: MouseEvent) {
  cancelHover()
  const el = evt.currentTarget as HTMLElement | null
  if (!el) return
  hoverTimer = setTimeout(() => {
    const path = String(sp.path || '').replace(/^\//, '')
    if (!path) return
    const rect = el.getBoundingClientRect()
    const cardW = 232
    const cardH = 500
    // 列表行几乎占满屏宽：右侧放不下时贴视口右缘（卡片 pointer-events:none，不挡行内按钮）
    const fitsRight = rect.right + 16 + cardW <= window.innerWidth
    const flip = !fitsRight
    const left = fitsRight ? rect.right + 16 : Math.max(12, window.innerWidth - cardW - 24)
    const top = Math.min(Math.max(12, rect.top - 40), Math.max(12, window.innerHeight - cardH - 12))
    hoverPos.value = { top, left, flip }
    hoverTitle.value = sp.name
    hoverHint.value = sp.path
    hoverSrc.value = `${window.location.origin}/h5/miniapp-preview?view=config&source=draft&embed=1&screen=${encodeURIComponent(path)}`
    hoverVisible.value = true
  }, 600)
}

/* ------------------------------------------------------------------ *
 * 「我的」系统页的模板库
 *
 * 背景：系统页这组里，「我的」是唯一带模板/菜单编排能力的页——
 * 它的 6 套模板在 /page-builder/mine，但列表里的「配置」过去一律跳
 * /mini/appearance（那页根本改不了我的页）。现在：
 *   ① 行上显示当前用的是哪套模板（徽标）
 *   ② 行悬停出真实渲染的预览（原生页，H5 iframe 预览不了）
 *   ③ 行下方直接列出 6 套模板，点一套即套用
 *
 * 数据源与「保存」保持一致：都读写 system_config 里的 site_builder_draft，
 * 也就是「待发布草稿」；要真正生效仍需到「发布与版本」发布配置。
 * ------------------------------------------------------------------ */

/** 线上配置全量（兜底用） */
const basicConfig = ref<Record<string, string>>({})
/** 待上线草稿（比线上新，优先） */
const siteDraft = ref<Record<string, string>>({})
/** 当前「我的」页配置：草稿优先，其次线上 */
const mineConfig = ref<Record<string, unknown> | null>(null)
/** 全站主题色（预览卡要用主辅色，跟配置页保持同一份来源） */
const mineTheme = ref<Record<string, unknown> | null>(null)
const mineTplOpen = ref(true)
const applyingTplKey = ref('')

function parseJsonish(v: unknown): Record<string, any> | null {
  if (v == null || v === '') return null
  if (typeof v === 'object') return v as Record<string, any>
  try {
    const o = JSON.parse(String(v))
    return o && typeof o === 'object' ? o : null
  } catch {
    return null
  }
}

/** 尚未配过菜单时，用模板库的默认组合兜底，避免预览是一张空卡 */
const mineDisplayConfig = computed<MinePageConfigType>(() => {
  const cur = (mineConfig.value || {}) as Partial<MinePageConfigType>
  const hasMenus = Array.isArray(cur.menuItems) && cur.menuItems.length > 0
  if (hasMenus) return cur as MinePageConfigType
  const base = buildTemplateConfig('warm')
  return { ...base, ...cur, menuItems: base.menuItems }
})

const minePreviewTheme = computed<Pick<ThemeConfig, 'primaryColor' | 'secondaryColor'>>(() => {
  const t = (mineTheme.value || {}) as Partial<ThemeConfig>
  return {
    primaryColor: t.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: t.secondaryColor || DEFAULT_THEME.secondaryColor,
  }
})

const mineTemplateKey = computed(() => resolveTemplateKey(mineDisplayConfig.value))
const mineTemplateName = computed(() => {
  const key = mineTemplateKey.value
  if (key) return getMineTemplate(key)?.name || key
  const src = (mineConfig.value || {}) as Partial<MinePageConfigType>
  return Array.isArray(src.menuItems) && src.menuItems.length ? '自定义组合' : '默认菜单'
})
const mineMenuCount = computed(() =>
  (mineDisplayConfig.value.menuItems || []).filter((m) => m.enabled !== false).length,
)

/* ------------------------------------------------------------------ *
 * 登录页系统页配置（仿「我的」页，但更轻量：无内联模板库，仅模板徽标 + 悬停预览）
 * 完整模板画廊在 /page-builder/login 配置页。
 * ------------------------------------------------------------------ */
/** 当前登录页配置（草稿优先，其次线上） */
const loginConfig = ref<LoginPageConfigType>({ ...DEFAULT_LOGIN_PAGE_CONFIG })
/** 兜底：未配过时用第一套模板（warm = 「现在搭建的登录页」默认态） */
const loginDisplayConfig = computed<LoginPageConfigType>(() => {
  const cur = loginConfig.value
  const hasHero = !!(cur.heroTitle || cur.loginButtonText)
  if (hasHero) return cur
  return { ...DEFAULT_LOGIN_PAGE_CONFIG }
})
const loginTemplateName = computed(() => resolveLoginTemplateName(loginDisplayConfig.value))
const loginSkinName = computed(() => {
  const k = resolveLoginPageStyleKey(loginDisplayConfig.value)
  const map: Record<string, string> = { warm: '暖阁纸感', brand: '品牌焦点', minimal: '极简卡片', wechat: '微信原生' }
  return map[k] || '暖阁纸感'
})

/** 「登录」行内模板库（仿「我的」tpl-stack）：展开看 4 套，点套用写入待上线草稿 */
const loginTplOpen = ref(true)
const applyingLoginTplKey = ref('')
const loginTplThumbCache = new Map<string, LoginPageConfigType>()
const loginTemplateKey = computed(() => resolveLoginTemplateKey(loginDisplayConfig.value))

function loginTplThumbConfig(key: string): LoginPageConfigType {
  const cached = loginTplThumbCache.get(key)
  if (cached) return cached
  const built = buildLoginTemplateConfig(key)
  loginTplThumbCache.set(key, built)
  return built
}

async function applyLoginTemplate(tpl: LoginTemplatePreset) {
  if (applyingLoginTplKey.value) return
  try {
    await ElMessageBox.confirm(
      `将「${tpl.name}」套用到登录页？\n`
        + `会覆盖当前的模板文案与皮肤，并保存为待上线草稿。\n`
        + `还需到「发布与版本」发布配置后才会对线上生效。`,
      '套用模板',
      { confirmButtonText: '套用', cancelButtonText: '取消', type: 'info' },
    )
  } catch {
    return
  }
  applyingLoginTplKey.value = tpl.key
  try {
    const payload = buildDraftPayload()
    payload[CONFIG_KEYS.LOGIN_PAGE_CONFIG] = JSON.stringify(buildLoginTemplateConfig(tpl.key))
    await updateConfigs([
      {
        configKey: 'site_builder_draft',
        configValue: JSON.stringify(payload),
        configGroup: 'basic',
        description: '登录页待上线草稿',
      },
    ] as any)

    siteDraft.value = payload
    loginConfig.value = JSON.parse(payload[CONFIG_KEYS.LOGIN_PAGE_CONFIG])
    ElMessage.success(`已套用「${tpl.name}」，到「发布与版本」发布配置后才会对线上生效`)
  } catch (e: any) {
    ElMessage.error(e?.message || '套用失败')
  } finally {
    applyingLoginTplKey.value = ''
  }
}

/** 6 张缩略图共用同一份配置对象，别每次重渲染都重建 */
const tplThumbCache = new Map<string, MinePageConfigType>()
function templateThumbConfig(key: string): MinePageConfigType {
  const cached = tplThumbCache.get(key)
  if (cached) return cached
  const built = buildTemplateConfig(key)
  tplThumbCache.set(key, built)
  return built
}

/**
 * 组装一份完整的待上线草稿：
 * 以线上值为底、草稿覆盖——与 useMiniappConfig.handleSave() 写入的批次同口径，
 * 避免只写一个键就让后端把草稿当成"只改了这一项"。
 */
function buildDraftPayload(): Record<string, string> {
  const keys: string[] = [
    CONFIG_KEYS.TEMPLATE_KEY,
    CONFIG_KEYS.HOME_PAGE_ID,
    CONFIG_KEYS.MINE_PAGE_ID,
    CONFIG_KEYS.TABBAR_ITEMS,
    CONFIG_KEYS.MINE_PAGE_CONFIG,
    CONFIG_KEYS.LOGIN_PAGE_CONFIG,
    CONFIG_KEYS.THEME_CONFIG,
    CONFIG_KEYS.SHARE_TITLE,
    CONFIG_KEYS.SHARE_IMAGE,
  ]
  const base: Record<string, string> = {}
  for (const k of keys) base[k] = String(basicConfig.value[k] ?? '')
  return { ...base, ...(siteDraft.value || {}) }
}

async function applyMineTemplate(tpl: MineTemplatePreset) {
  if (applyingTplKey.value) return
  try {
    await ElMessageBox.confirm(
      `将「${tpl.name}」套用到「我的」页？\n`
        + `会覆盖当前的菜单组合、文案与开关（皮肤与主色保留），并保存为待上线草稿。\n`
        + `还需到「发布与版本」发布配置后才会对线上生效。`,
      '套用模板',
      { confirmButtonText: '套用', cancelButtonText: '取消', type: 'info' },
    )
  } catch {
    return
  }
  applyingTplKey.value = tpl.key
  try {
    const payload = buildDraftPayload()
    const prev = parseJsonish(payload[CONFIG_KEYS.MINE_PAGE_CONFIG]) || {}
    const next: Record<string, unknown> = { ...prev, ...buildTemplateConfig(tpl.key) }
    // 皮肤按现有配置保留：这里换的是「菜单组合 + 文案 + 开关」，不是外观
    applyMineStylePreset(next, resolveMineStyleKey(prev as { templateStyle?: string }))
    payload[CONFIG_KEYS.MINE_PAGE_CONFIG] = JSON.stringify(next)

    await updateConfigs([
      {
        configKey: 'site_builder_draft',
        configValue: JSON.stringify(payload),
        configGroup: 'basic',
        description: '品牌导航待上线草稿',
      },
    ] as any)

    siteDraft.value = payload
    mineConfig.value = next
    ElMessage.success(`已套用「${tpl.name}」，到「发布与版本」发布配置后才会对线上生效`)
  } catch (e: any) {
    ElMessage.error(e?.message || '套用失败')
  } finally {
    applyingTplKey.value = ''
  }
}

/** 「我的」行悬停预览：原生页没有 H5 预览，直接渲染管理端自己的 MinePagePreview */
const mineHoverVisible = ref(false)
const mineHoverPos = ref({ top: 0, left: 0 })
let mineHoverTimer: ReturnType<typeof setTimeout> | undefined

function scheduleMineHover(evt: MouseEvent) {
  cancelMineHover()
  const el = evt.currentTarget as HTMLElement | null
  if (!el) return
  mineHoverTimer = setTimeout(() => {
    const rect = el.getBoundingClientRect()
    const cardW = 200
    const cardH = 440
    // 列表行几乎占满屏宽，右侧放不下时不要翻到屏幕另一头去（离被悬停的行太远会认不出），
    // 改成贴着视口右缘——卡片 pointer-events: none，压住的按钮照样能点。
    const fitsRight = rect.right + 16 + cardW <= window.innerWidth
    const left = fitsRight ? rect.right + 16 : Math.max(12, window.innerWidth - cardW - 24)
    const top = Math.min(Math.max(12, rect.top - 20), Math.max(12, window.innerHeight - cardH - 12))
    mineHoverPos.value = { top, left }
    mineHoverVisible.value = true
  }, 500)
}

function cancelMineHover() {
  if (mineHoverTimer) clearTimeout(mineHoverTimer)
  mineHoverTimer = undefined
  mineHoverVisible.value = false
}

/** 登录系统页行悬停预览（仿「我的」：原生页无 H5 预览，渲染管理端自己的 LoginPagePreview） */
const loginHoverVisible = ref(false)
const loginHoverPos = ref({ top: 0, left: 0 })
let loginHoverTimer: ReturnType<typeof setTimeout> | undefined

function scheduleLoginHover(evt: MouseEvent) {
  cancelLoginHover()
  const el = evt.currentTarget as HTMLElement | null
  if (!el) return
  loginHoverTimer = setTimeout(() => {
    const rect = el.getBoundingClientRect()
    const cardW = 200
    const cardH = 440
    const fitsRight = rect.right + 16 + cardW <= window.innerWidth
    const left = fitsRight ? rect.right + 16 : Math.max(12, window.innerWidth - cardW - 24)
    const top = Math.min(Math.max(12, rect.top - 20), Math.max(12, window.innerHeight - cardH - 12))
    loginHoverPos.value = { top, left }
    loginHoverVisible.value = true
  }, 500)
}

function cancelLoginHover() {
  if (loginHoverTimer) clearTimeout(loginHoverTimer)
  loginHoverTimer = undefined
  loginHoverVisible.value = false
}

function toggleSelect(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function clearSelection() {
  selectedIds.value = new Set()
}

const selectedRows = computed(() =>
  pages.value.filter((r) => selectedIds.value.has(Number(r.id))),
)

const selectedSummary = computed(() => {
  const names = selectedRows.value.slice(0, 3).map((r) => r.name)
  return names.join('、') + (selectedRows.value.length > 3 ? ' 等' : '')
})

async function runBatch(
  label: string,
  fn: (row: PageRecord) => Promise<unknown>,
  filter?: (row: PageRecord) => boolean,
) {
  const rows = selectedRows.value.filter((r) => (filter ? filter(r) : true))
  if (!rows.length) {
    ElMessage.info(`所选页面没有可用于「${label}」的项`)
    return
  }
  try {
    await ElMessageBox.confirm(`确认对 ${rows.length} 个页面执行「${label}」？`, `批量${label}`, {
      type: 'warning',
    })
  } catch {
    return
  }
  batchRunning.value = true
  let ok = 0
  const failed: string[] = []
  for (const row of rows) {
    try {
      await fn(row)
      ok += 1
    } catch (e: any) {
      failed.push(`${row.name}：${e?.message || '失败'}`)
    }
  }
  batchRunning.value = false
  if (failed.length) {
    ElMessage.warning(`${label}完成 ${ok} 项，失败 ${failed.length} 项：${failed.slice(0, 2).join('；')}`)
  } else {
    ElMessage.success(`已${label} ${ok} 个页面`)
  }
  clearSelection()
  await load()
}

function batchToggleTest() {
  void runBatch('标为测试页', (row) => updatePage(Number(row.id), { isTest: 1 } as any))
}

function batchArchive() {
  void runBatch('归档', (row) => updatePage(Number(row.id), { archived: 1, pageGroup: 'archived' } as any))
}

function batchDelete() {
  void runBatch('删除', (row) => deletePage(Number(row.id)), (r) => canDelete(r))
}

/** 某个导航槽位绑定的装修页；返回 null 表示绑的是系统页或空 */
function navBoundPage(tab: MiniTabBarItem): PageRecord | null {
  const id = Number((tab as any)?.pageId)
  if (id) {
    const hit = pages.value.find((p) => Number(p.id) === id)
    if (hit) return hit
  }
  const tp = String((tab as any)?.pagePath || '').replace(/^\//, '')
  if (!tp) return null
  if (MINI_SYSTEM_PAGES.some((s) => s.path === tp)) return null
  return pages.value.find((p) => String(p.path || '').replace(/^\//, '') === tp) || null
}

function navBoundIsSystem(tab: MiniTabBarItem) {
  const tp = String((tab as any)?.pagePath || '').replace(/^\//, '')
  if (!tp) return false
  if (MINI_SYSTEM_PAGES.some((s) => s.path === tp)) return true
  return !navBoundPage(tab)
}

function onNavSlotClick(tab: MiniTabBarItem) {
  const page = navBoundPage(tab)
  if (page) {
    openEditor(page)
    return
  }
  // 槽位绑的是系统原生页时，「我的」有独立的配置台（/page-builder/mine），
  // 直接送过去；别再把人丢到 /mini/appearance —— 那页改不了我的页。
  if (navBoundIsSystem(tab) && isSystemMinePath(tab.pagePath)) {
    router.push('/page-builder/mine')
    return
  }
  ElMessage.info('该导航位未绑定装修页，可到「导航配置」或页面行的「设为底部导航入口」绑定')
  router.push('/mini/appearance?tab=nav')
}

/** 导航槽位绑的是不是「我的」系统页（路径固定 /pages/mine/mine） */
function isSystemMinePath(path?: string | null) {
  return String(path || '').replace(/^\/+/, '') === 'pages/mine/mine'
}

/** 系统页行：来自内置清单（Tab 壳页不列，真实内容在装修页组），不是库表页面；无页面状态，故只在「全部」筛选下展示 */
const systemRows = computed(() => {
  if (statusFilter.value !== 'all') return []
  const list = listableSystemPages()
  const q = keyword.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((s) => `${s.name} ${s.path}`.toLowerCase().includes(q))
})

/** 筛选时藏空组；未筛选时全部展示（空组给引导文案） */
const visibleGroups = computed(() => {
  if (!filtering.value) return groups.value
  return groups.value.filter((g) =>
    g.key === 'system' ? systemRows.value.length > 0 : g.rows.length > 0,
  )
})

function groupSub(key: string) {
  // 「我的」是唯一带模板库的系统页，把模板数量写进组说明，避免它藏在行下面没人知道
  if (key === 'system') {
    return `${PAGE_GROUP_SUB.system}（「我的」另含 ${MINE_TEMPLATES.length} 套模板）`
  }
  return resolveGroupSub(key) || ''
}

function toggleGroup(key: string) {
  if (filtering.value) return
  closedGroups[key] = !closedGroups[key]
}

function tabIndexOf(row: PageRecord) {
  const id = Number(row.id)
  const path = String(row.path || '').replace(/^\//, '')
  const i = siteTabs.value.findIndex((t) => {
    if (t.pageId != null && Number(t.pageId) === id) return true
    const tp = String(t.pagePath || '').replace(/^\//, '')
    return tp && (tp === path || path.endsWith(tp))
  })
  return i
}

function formatUpdated(row: PageRecord) {
  const t = String((row as any).updateTime || (row as any).updatedAt || '')
  if (!t) return ''
  const s = t.replace('T', ' ')
  if (s.length >= 16) return s.slice(5, 16)
  return s.slice(0, 16)
}

/** 完整时间戳（悬停 title） */
function formatUpdatedFull(row: PageRecord) {
  const t = String((row as any).updateTime || (row as any).updatedAt || '')
  return t ? t.replace('T', ' ') : ''
}

function isTestPage(row: PageRecord) {
  return !!(row as any).isTest || (row as any).is_test === 1
}

/** 系统页当前占着哪个底部导航位（1-based）；0 = 该位置已改用装修页 */
function tabSlotByPath(sp: MiniSystemPage) {
  const want = String(sp.path || '').replace(/^\//, '')
  const i = siteTabs.value.findIndex((t) => {
    const tp = String(t.pagePath || '').replace(/^\//, '')
    if (!tp) return false
    return tp === want || tp.endsWith('/' + want) || want.endsWith(tp)
  })
  return i >= 0 ? i + 1 : 0
}

/** 行内结构化信息：拆「导航位 / 到期 / 更新时间 / PV」为独立片段，便于扫读与排序 */
function navLabel(row: PageRecord) {
  const i = tabIndexOf(row)
  return i >= 0 ? `导航 ${i + 1}` : ''
}

function hasNamesake(row: PageRecord) {
  return pages.value.some((p) => p.name === row.name && Number(p.id) !== Number(row.id))
}

function isNamesake(row: PageRecord) {
  return tabIndexOf(row) < 0 && hasNamesake(row)
}

function expireLabel(row: PageRecord) {
  const exp = String((row as any).entryExpireAt || (row as any).entry_expire_at || '')
  return exp ? `到期 ${exp.slice(0, 16)}` : ''
}

function accessLabel(row: PageRecord) {
  const acc = rowAccess(row)
  return acc ? `PV ${acc.pv} · UV ${acc.uv}` : ''
}

/** 待同步页面「改了什么」：草稿版本 vs 线上版本 + 组件数变化 */
type DiffInfo = { text: string; sortTs: number }
const diffMap = ref<Record<string, DiffInfo>>({})

function diffLabel(row: PageRecord) {
  if (resolvePageStatus(row) !== 'pending') return ''
  return diffMap.value[String(row.id)]?.text || '草稿有改动'
}

function countComponents(raw: unknown): number | null {
  try {
    let obj: any = raw
    if (typeof raw === 'string') obj = JSON.parse(raw)
    const comps = obj?.components ?? obj?.dsl?.components
    return Array.isArray(comps) ? comps.length : null
  } catch {
    return null
  }
}

async function loadPendingDiffs() {
  const targets = pendingRows.value.slice(0, 8)
  if (!targets.length) return
  await Promise.all(
    targets.map(async (row) => {
      try {
        const res = await getVersionList(Number(row.id))
        const data = (res as any)?.data as unknown
        const rawList: any[] = Array.isArray(data)
          ? data
          : ((data as any)?.records || (data as any)?.list || (data as any)?.items || [])
        if (!rawList.length) return
        const list = rawList
          .map((v: any) => ({
            version: Number(v.version ?? 0),
            count: countComponents(v.dslContent ?? v.dsl ?? v.content),
          }))
          .filter((v) => v.version > 0)
          .sort((a, b) => b.version - a.version)
        const draft = list[0]
        const liveVersion = Number((row as any).currentVersion ?? (row as any).current_version ?? 0)
        const liveCount = list.find((v) => v.version === liveVersion)?.count ?? null
        if (liveVersion && draft.version === liveVersion) return
        const cnt =
          draft.count != null && liveCount != null && draft.count !== liveCount
            ? ` · 组件 ${liveCount}→${draft.count}`
            : draft.count != null
              ? ` · 组件 ${draft.count}`
              : ''
        diffMap.value = {
          ...diffMap.value,
          [String(row.id)]: {
            text: `草稿 v${draft.version} / 线上 v${liveVersion || '—'}${cnt}`,
            sortTs: 0,
          },
        }
      } catch {
        /* 差异是锦上添花，失败不打扰 */
      }
    }),
  )
}

function thumbColors(row: PageRecord): string[] {
  const fromApi = (row as any).thumbColors
  if (Array.isArray(fromApi) && fromApi.length) {
    return fromApi.slice(0, 4).map(String)
  }
  const id = Number(row.id) || 0
  return [0, 1, 2].map((i) => THUMB_PALETTE[(id + i * 2) % THUMB_PALETTE.length])
}

function isArchived(row: PageRecord) {
  return resolvePageStatus(row) === 'archived'
}

function canOffline(row: PageRecord) {
  const st = resolvePageStatus(row)
  return st === 'live' || st === 'pending'
}

function canDelete(row: PageRecord) {
  // 与后端 PageServiceImpl.deletePage 的约束对齐：仅 status=1（已发布）不可删除。
  // 草稿(0) / 已下线(2) / 归档 均可删除；已上线页需先「下线」再删。
  // 旧实现只放行 'draft'，导致归档组里的测试页、已下线页都没有删除入口。
  return Number((row as any).status ?? 0) !== 1
}

/**
 * 下线强校验：被引用中的页面直接下线会让线上产生死链，必须先解引用。
 * 引用来源：① 底部导航槽位（siteTabs）；② 草稿配置里作为入口被登记的活动页。
 * 返回 true 表示可以安全下线。
 */
async function guardOffline(row: PageRecord): Promise<boolean> {
  const blockers: string[] = []
  const slot = tabIndexOf(row)
  if (slot >= 0) blockers.push(`底部导航第 ${slot + 1} 个入口`)
  // 活动页的对外入口存在草稿配置里；这里只提示不改配置，避免误判成可下线。
  if (inferPageGroup(row) === 'activity') blockers.push('活动入口（需先到「外观」确认入口已摘除）')

  if (blockers.length) {
    await ElMessageBox.alert(
      `「${row.name}」当前仍被引用：${blockers.join('、')}。\n\n` +
        '直接下线会让线上产生死链（用户点得到、进不去）。请先解除上述引用，再下线此页。',
      '无法下线：页面被引用',
      { type: 'warning', confirmButtonText: '我知道了' },
    )
    return false
  }
  return true
}

/** 下线页面：行内按钮与「更多」菜单共用同一套校验，避免两处口径不一致 */
async function doOffline(row: PageRecord) {
  if (!(await guardOffline(row))) return
  try {
    await ElMessageBox.confirm(
      `确认下线「${row.name}」？下线后线上入口将失效，页面草稿会保留。`,
      '下线页面',
      { type: 'warning' },
    )
    await unpublishPage(Number(row.id))
    ElMessage.success('已下线')
    await load()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
  }
}

/** 行内可见的「下线」按钮：live / pending 态直接点 */
async function onQuickOffline(row: PageRecord) {
  await doOffline(row)
}

/** 行内可见的「删除」按钮：草稿 / 已下线 / 归档可直接删；已上线页提示先下线 */
async function onQuickDelete(row: PageRecord) {
  if (Number((row as any).status ?? 0) === 1) {
    ElMessage.warning('已上线页面需先「下线」再删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除「${row.name}」？不可恢复`, '删除', { type: 'warning' })
    await deletePage(Number(row.id))
    ElMessage.success('已删除')
    await load()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
  }
}

/** 移动页面到指定分组（系统页不可移动） */
async function moveToGroup(row: PageRecord, groupKey: string) {
  try {
    await updatePage(Number(row.id), { pageGroup: groupKey } as any)
    ElMessage.success(`已移至「${resolveGroupLabel(groupKey)}」`)
    groupDialogVisible.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '移动失败')
  }
}

function openEditor(row: PageRecord) {
  router.push(`/mini/pages/${row.id}/editor`)
}

async function onMore(cmd: string, row: PageRecord) {
  if (cmd === 'preview') {
    const { href } = router.resolve({ path: `/page-builder/preview/${row.id}` })
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }
  if (cmd === 'versions') {
    versionTarget.value = row
    versionVisible.value = true
    return
  }
  if (cmd === 'qr') {
    qrPath.value = screenPathOf(row)
    qrTitle.value = `扫码看「${row.name}」`
    qrHint.value =
      '微信渠道进入的是体验版（带草稿令牌），从默认页起；切到浏览器渠道可直接看到本页 H5 效果。'
    qrVisible.value = true
    return
  }
  if (cmd === 'copy') {
    try {
      const res = await duplicatePage(Number(row.id))
      const id = Number((res as any)?.data?.id || (res as any)?.id || 0)
      ElMessage.success('已复制')
      if (id) router.push(`/mini/pages/${id}/editor`)
      else await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '复制失败')
    }
    return
  }
  if (cmd === 'copy-path') {
    try {
      await navigator.clipboard.writeText(String(row.path || ''))
      ElMessage.success('路径已复制')
    } catch {
      ElMessage.info(String(row.path || ''))
    }
    return
  }
  if (cmd === 'set-group') {
    groupTarget.value = row
    groupInput.value = ''
    groupDialogVisible.value = true
    return
  }
  if (cmd === 'set-nav') {
    if (tabIndexOf(row) >= 0) {
      ElMessage.info('该页已在底部导航中')
      return
    }
    navTarget.value = row
    navSlotIndex.value = 0
    navDialogMode.value = 'nav'
    entryExpireAt.value = null
    navDialogVisible.value = true
    return
  }
  if (cmd === 'set-entry') {
    navTarget.value = row
    navSlotIndex.value = tabIndexOf(row) >= 0 ? tabIndexOf(row) : 0
    navDialogMode.value = 'entry'
    entryExpireAt.value = String((row as any).entryExpireAt || (row as any).entry_expire_at || '') || null
    navDialogVisible.value = true
    return
  }
  if (cmd === 'toggle-test') {
    const next = isTestPage(row) ? 0 : 1
    try {
      await ElMessageBox.confirm(
        next ? `将「${row.name}」标为测试页？正式发布前检查会拦截导航绑定。` : `取消「${row.name}」的测试页标记？`,
        next ? '标为测试页' : '取消测试',
        { type: 'warning' },
      )
      await updatePage(Number(row.id), { isTest: next } as any)
      ElMessage.success(next ? '已标为测试页' : '已取消测试')
      await load()
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
    return
  }
  if (cmd === 'rename') {
    try {
      const { value } = await ElMessageBox.prompt('页面名称', '重命名', {
        inputValue: String(row.name || ''),
        inputPattern: /\S+/,
        inputErrorMessage: '名称不能为空',
      })
      await updatePage(Number(row.id), { name: String(value).trim() })
      ElMessage.success('已重命名')
      await load()
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
    return
  }
  if (cmd === 'archive') {
    try {
      await ElMessageBox.confirm(`确认归档「${row.name}」？可从归档组恢复`, '归档', { type: 'warning' })
      await updatePage(Number(row.id), { archived: 1, pageGroup: 'archived' } as any)
      ElMessage.success('已归档')
      await load()
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
    return
  }
  if (cmd === 'offline') {
    await doOffline(row)
    return
  }
  if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm(`确认删除「${row.name}」？不可恢复`, '删除', { type: 'warning' })
      await deletePage(Number(row.id))
      ElMessage.success('已删除')
      await load()
    } catch (e: any) {
      if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
    }
  }
}

async function confirmSetNav() {
  if (!navTarget.value) return
  if (!siteTabs.value.length) {
    ElMessage.warning('尚未配置底部导航，请先到「外观」添加')
    return
  }
  navSaving.value = true
  try {
    const next = siteTabs.value.map((t) => ({ ...t }))
    const i = navSlotIndex.value
    const page = navTarget.value
    next[i] = {
      ...next[i],
      pageId: page.id,
      pagePath: String(page.path || '').replace(/^\//, ''),
      pageName: page.name,
      text: next[i].text || page.name,
    }
    await updateMiniSite({ tabBar: next })
    if (navDialogMode.value === 'entry' || entryExpireAt.value) {
      await updatePage(Number(page.id), {
        pageGroup: 'activity',
        entryExpireAt: entryExpireAt.value || '',
      } as any)
    }
    ElMessage.success('底部导航已更新')
    navDialogVisible.value = false
    siteTabs.value = next
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '设置失败')
  } finally {
    navSaving.value = false
  }
}

async function createBlank() {
  try {
    await ElMessageBox.confirm('将创建空白自定义页并进入装修器', '新建空白页', { type: 'info' })
  } catch {
    return
  }
  const suffix = Date.now().toString(36).slice(-5)
  try {
    const res = await createPage({
      name: `未命名页面-${suffix}`,
      type: 3,
      path: `pages/custom/p-${suffix}`,
    })
    const id = Number((res as any)?.data?.id || 0)
    if (!id) throw new Error('未返回页面 id')
    ElMessage.success('已创建')
    router.push(`/mini/pages/${id}/editor`)
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  }
}

async function load() {
  loading.value = true
  try {
    const [res, site, cfgRes] = await Promise.all([
      getPageList({ current: 1, size: 100 }),
      getMiniSite('draft').catch(() => null),
      getConfigByGroupSilent('basic').catch(() => null),
    ])
    pages.value = ((res as any)?.data?.records || (res as any)?.data?.list || []) as PageRecord[]
    siteTabs.value = site?.tabBar || []
    loadMineConfigFrom(cfgRes)
    selectedIds.value = new Set()
    void loadPageAccess()
    void loadPendingDiffs()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载页面失败')
  } finally {
    loading.value = false
    loaded.value = true
  }
}

/** 解析 basic 配置 → 线上值 / 待上线草稿 / 当前「我的」页配置（草稿优先） */
function loadMineConfigFrom(cfgRes: unknown) {
  const data = (cfgRes as any)?.data
  const list = (data?.configs || data || []) as Array<{ configKey?: string; configValue?: unknown }>
  const map: Record<string, string> = {}
  for (const c of Array.isArray(list) ? list : []) {
    if (c?.configKey) map[c.configKey] = String(c.configValue ?? '')
  }
  basicConfig.value = map
  const draft = parseJsonish(map.site_builder_draft) || {}
  siteDraft.value = draft as Record<string, string>
  const fromDraft = parseJsonish((draft as Record<string, unknown>)[CONFIG_KEYS.MINE_PAGE_CONFIG])
  const fromLive = parseJsonish(map[CONFIG_KEYS.MINE_PAGE_CONFIG])
  mineConfig.value = fromDraft || fromLive || {}
  mineTheme.value =
    parseJsonish((draft as Record<string, unknown>)[CONFIG_KEYS.THEME_CONFIG])
    || parseJsonish(map[CONFIG_KEYS.THEME_CONFIG])
  // 登录页配置（草稿优先，其次线上，最后默认）
  const loginDraft = parseJsonish((draft as Record<string, unknown>)[CONFIG_KEYS.LOGIN_PAGE_CONFIG])
  const loginLive = parseJsonish(map[CONFIG_KEYS.LOGIN_PAGE_CONFIG])
  loginConfig.value = { ...DEFAULT_LOGIN_PAGE_CONFIG, ...(loginLive || {}), ...(loginDraft || {}) }
}

onMounted(load)
</script>

<style scoped lang="scss">
/* 新建 vs 修改 的职责边界说明 */
.scope-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
}

.scope-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;

  > div {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  b { font-size: 13.5px; }

  .faint {
    font-size: 11.5px;
    line-height: 1.6;

    b { font-size: 11.5px; }
  }
}

.scope-ic {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &.new { background: rgba(47, 125, 79, 0.12); color: #2f7d4f; }
  &.edit { background: rgba(180, 67, 15, 0.12); color: var(--acc, #b4430f); }
}
/* 底部导航绑定全景 */
.navmap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
}
.navmap__hd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.navmap__t {
  font-weight: 600;
  color: var(--ink);
}
.navmap__go {
  margin-left: auto;
  font-size: 13px;
}
.navmap__row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.navslot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--soft);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  color: var(--ink);
  text-align: left;
  flex: 1 1 200px;
  min-width: 0;
  &:hover { border-color: #d6c8b6; }
}
.navslot__i {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--bs);
  color: var(--b);
  font-size: 12px;
  font-weight: 600;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.navslot__n { font-weight: 500; flex-shrink: 0; }
.navslot__p {
  color: var(--mute);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.navslot--empty {
  border-style: dashed;
  .navslot__i { background: var(--as); color: var(--a); }
  .navslot__p { color: var(--a); }
}

/* 待同步横幅 */
.pending-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid #e6d3ae;
  background: var(--as);
}
.pending-bar__sp { margin-left: auto; }

/* 批量操作条 */
.batchbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--soft);
}
.batchbar__sp { margin-left: auto; }

.filters__sp { margin-left: auto; }
.sortseg {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 行多选 */
.pick {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  cursor: pointer;
  input {
    width: 15px;
    height: 15px;
    cursor: pointer;
    accent-color: var(--acc);
  }
}

/* 行结构化信息 */
.pmeta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 3px;
  .tag { font-size: 11px; padding: 1px 7px; }
  .path {
    color: var(--faint);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 260px;
  }
}
.prow:hover { background: var(--soft); }

/* 更新时间列：从 pmeta 拆出为独立列，悬停显示完整时间戳 */
.prow-time {
  flex-shrink: 0;
  width: 92px;
  text-align: right;
  font-size: 12px;
  color: var(--mute);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* 行内可见下线按钮：暖灰色描边，区别于「装修」的默认色 */
.prow-offline-btn {
  color: #8a6d4a;
  border-color: #d4b896;
  background: #fbf6ef;
  &:hover { background: #f5ead9; }
}

/* 行内可见删除按钮：危险色，放在行尾 PageRowMenu 前 */
.prow-del-btn {
  color: #c0392b;
  &:hover { color: #a93226; background: #fdf0ee; }
}

/* 设置分组对话框 */
.group-pick {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}
.group-pick__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  transition: border-color 0.14s, box-shadow 0.14s;
  &:hover { border-color: var(--acc); }
}
.group-pick__item--active {
  border-color: var(--acc);
  background: var(--as);
  color: var(--a);
}
.group-pick__label { flex: 1; }
.group-pick__tag {
  font-size: 10.5px;
  color: var(--mute);
  background: var(--soft);
  padding: 1px 6px;
  border-radius: 999px;
}
.group-new {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.group-new__row {
  display: flex;
  gap: 8px;
}


.groups-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sys-row {
  background: var(--soft);
}
/* 「我的」是唯一能换模板的系统页，给它一点视觉分量 */
.sys-row--mine { cursor: default; }

/* 「我的」页模板库：缩进在「我的」行下面，让「一套模板」看得见也点得到 */
.tpl-stack {
  padding: 10px 16px 12px 66px;
  background: var(--soft);
  border-bottom: 1px solid var(--line2);
}
.tpl-stack__hd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  b { font-size: 12.5px; }
  .faint { font-size: 11.5px; }
}
.tpl-stack__toggle {
  margin-left: auto;
  font-size: 12px;
  flex-shrink: 0;
}
.tpl-stack__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tpl-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.14s, box-shadow 0.14s;
  &:hover { border-color: var(--acc); }
  &:disabled { cursor: default; opacity: 0.7; }
}
.tpl-item--active {
  border-color: var(--acc);
  box-shadow: 0 0 0 2px rgba(23, 105, 255, 0.12);
}
.tpl-item__thumb {
  width: 40px;
  height: 70px;
  flex-shrink: 0;
  border-radius: 5px;
  border: 1px solid var(--line);
  overflow: hidden;
  background: #fff;
}
/* MinePagePreview 原生宽 375，按 40/375 缩放进 40×70 的框 */
.tpl-item__inner {
  display: block;
  width: 375px;
  transform: scale(0.1067);
  transform-origin: top left;
  pointer-events: none;
}
.tpl-item__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.tpl-item__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  em {
    font-style: normal;
    font-size: 10.5px;
    color: #fff;
    background: var(--acc);
    border-radius: 999px;
    padding: 0 6px;
  }
}
.tpl-item__meta { font-size: 11.5px; }
.tpl-item__op {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--acc);
}
/* 「模板 · xx」徽标：与「导航位」蓝色、「系统页」绿色区分开 */
.tag.t-tpl { color: var(--a); background: var(--as); }
.g-head__note {
  margin-left: auto;
}
.g-head__arrow {
  display: inline-flex;
  color: var(--faint);
  transition: transform 0.15s ease;
  &.closed { transform: rotate(-90deg); }
  &:not(.g-head__note + &) { margin-left: 4px; }
}
.g-head:not(:has(.g-head__note)) .g-head__arrow {
  margin-left: auto;
}
.inline-ic { display: inline-block; vertical-align: -2px; color: var(--faint); }
.nav-dialog-hint {
  font-size: 13px;
  color: var(--mute);
  margin: 0 0 12px;
}
.nav-slots {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.entry-expire {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
