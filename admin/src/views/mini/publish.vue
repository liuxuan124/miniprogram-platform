<template>
  <div class="mini-wb mw-page pub-view" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="list" />
    <div v-else class="pub">
      <div class="pub-main">
        <MiniOpsConceptBanner variant="publish" />

        <div class="head-row">
          <div>
            <h1 class="h1">发布与版本</h1>
            <div class="sub">把草稿发布到线上配置，并保存一份可回溯的版本快照</div>
          </div>
          <div class="actions">
            <button type="button" class="btn soft" @click="router.push('/mini/releases')">预览检查 ›</button>
          </div>
        </div>

        <!-- 🔴 三种语义必须并排讲清楚，这是本次改造最核心的解混淆 -->
        <section class="card semantics">
          <div class="sem-row">
            <div class="sem-item">
              <span class="sem-ic sem-draft"><MiniIcon name="note" :size="16" /></span>
              <div class="sem-body">
                <b>保存草稿</b>
                <span class="faint">各配置页改动后自动存入草稿。草稿只在小程序预览里可见，线上用户完全不受影响。</span>
              </div>
              <span class="tag t-draft">随时可用</span>
            </div>
            <div class="sem-item">
              <span class="sem-ic sem-pub"><MiniIcon name="send" :size="16" /></span>
              <div class="sem-body">
                <b>发布配置</b>
                <span class="faint">
                  把下方勾选的改动写入线上可读配置，并生成版本快照。用户下次打开小程序即可见。
                  <em>不涉及微信审核。</em>
                </span>
              </div>
              <span class="tag t-acc">本页操作</span>
            </div>
            <div class="sem-item">
              <span class="sem-ic sem-wx"><MiniIcon name="wechat" :size="16" /></span>
              <div class="sem-body">
                <b>微信代码包</b>
                <span class="faint">
                  上传新代码、提交审核、发布正式版。这是另一条独立流程，状态在下方「微信代码包」单独展示，
                  与本页的配置发布互不替代。
                </span>
              </div>
              <span class="tag t-slot">另一处操作</span>
            </div>
          </div>
        </section>

        <!-- 待发布改动 -->
        <section class="card">
          <div class="head" style="margin-bottom: 10px">
            <div>
              <h2 class="h2">本次要发布的改动</h2>
              <div class="sub">
                <template v-if="pending.length">
                  {{ pending.length }} 项 · 取消勾选的改动会继续留在草稿，不会丢
                </template>
                <template v-else>
                  没有待发布的改动。
                  <template v-if="site.liveReleaseNo != null">
                    线上是第 {{ site.liveReleaseNo }} 次发布
                    <template v-if="site.liveReleaseAt">（{{ formatTime(site.liveReleaseAt) }}）</template>。
                  </template>
                  <template v-else>线上还没有任何发布记录。</template>
                </template>
              </div>
            </div>
            <div v-if="pending.length" class="sel-ops">
              <button type="button" class="link" @click="selectAll">全选</button>
              <button type="button" class="link" @click="selectNone">全不选</button>
            </div>
          </div>

          <div v-if="pending.length" class="pending-list">
            <label
              v-for="item in pending"
              :key="String(item.id || item.name)"
              class="list-row"
              :class="{ dim: !isSelected(item) }"
            >
              <el-checkbox
                :model-value="isSelected(item)"
                @change="(v: boolean | string | number) => setSelected(item, Boolean(v))"
                @click.stop
              />
              <span :class="['tag', kindTagClass(item)]">{{ kindLabel(item) }}</span>
              <span class="list-main">
                <b>{{ item.type === 'site' ? '站点 / 导航 / 品牌' : (item.name || '页面') }}</b>
                <span class="faint">{{ item.summary || item.path || '' }}</span>
              </span>
              <button
                v-if="item.pageId"
                type="button"
                class="link"
                @click.stop="router.push(`/page-builder/editor/${item.pageId}`)"
              >查看</button>
            </label>
          </div>

          <!-- 发布前检查：阻断与提醒分开，各带修复入口 -->
          <div class="checks" :class="{ 'is-blocked': hasBlocking, 'is-ok': !hasBlocking && pending.length }">
            <div v-if="preflightLoading && !preflight" class="chk chk--muted">
              <span class="chk__ic"><MiniIcon name="info" :size="15" /></span>检查中…
            </div>
            <div v-else-if="preflightError" class="chk chk--warn">
              <span class="chk__ic"><MiniIcon name="warn" :size="15" /></span>
              {{ preflightError }}
            </div>
            <template v-else-if="preflight">
              <div v-if="!blocking.length && !warnings.length" class="chk chk--ok">
                <span class="chk__ic"><MiniIcon name="check" :size="15" /></span>检查通过，可以发布
              </div>
              <div v-for="(item, i) in blocking" :key="'b' + i" class="chk chk--err">
                <span class="chk__ic"><MiniIcon name="x" :size="15" /></span>
                <span class="chk-text">{{ item }}</span>
              </div>
              <div v-for="(item, i) in warnings" :key="'w' + i" class="chk chk--warn">
                <span class="chk__ic"><MiniIcon name="warn" :size="15" /></span>
                <span class="chk-text">{{ item }}</span>
              </div>
            </template>
            <div v-else class="chk chk--muted">
              <span class="chk__ic"><MiniIcon name="info" :size="15" /></span>暂无检查结果
            </div>
          </div>

          <!-- 阻断项给直接修复入口，而不是只说一句"去检查" -->
          <!-- 链路自检的阻断项：后端 preflight 不覆盖的跨表依赖 -->
          <div v-if="chainBlocking.length" class="chain-block">
            <span class="chain-block__hd">
              <MiniIcon name="x" :size="14" />
              搭建链路自检发现 {{ chainBlocking.length }} 个阻断项（后端发布前检查不覆盖这些）
            </span>
            <ul class="chain-block__list">
              <li v-for="(c, i) in chainBlocking" :key="i">
                <span>{{ c.text }}</span>
                <button
                  v-if="c.action && c.action.to"
                  type="button"
                  class="link"
                  @click="router.push(String(c.action.to))"
                >{{ c.action.label }}</button>
              </li>
            </ul>
          </div>

          <div v-if="hasBlocking" class="fix-list">
            <span class="fix-head">修复入口</span>
            <button type="button" class="btn sm" @click="router.push('/mini/appearance?tab=nav')">检查导航绑定</button>
            <button type="button" class="btn sm" @click="router.push('/mini/appearance?tab=brand')">检查品牌配置</button>
            <button type="button" class="btn sm" @click="router.push('/mini/pages')">检查页面状态</button>
            <button type="button" class="btn sm" @click="router.push('/mini/releases')">打开完整检查</button>
          </div>

          <!-- 变更摘要 -->
          <div v-if="pending.length" class="impact">
            <span class="impact-head">变更摘要</span>
            <div class="impact-grid">
              <div class="impact-cell">
                <span class="faint">站点配置</span>
                <strong>{{ siteChangeSelected ? '将更新' : '不变更' }}</strong>
              </div>
              <div class="impact-cell">
                <span class="faint">受影响页面</span>
                <strong>{{ selectedPageCount }} 个</strong>
              </div>
              <div class="impact-cell">
                <span class="faint">发布后版本</span>
                <strong>第 {{ nextReleaseNo }} 次</strong>
              </div>
            </div>
          </div>

          <div class="pub-bar">
            <input
              v-model="publishNote"
              class="input"
              placeholder="发布说明：这次改了什么（选填，方便以后回看）"
            />
            <button type="button" class="btn" @click="openPreviewQr">
              <MiniIcon name="qr" :size="15" />扫码预览草稿
            </button>
            <button
              type="button"
              class="btn primary"
              :disabled="publishDisabled"
              @click="handlePublish"
            >
              <MiniIcon name="send" :size="15" />
              {{ publishing ? '发布中…' : publishButtonText }}
            </button>
          </div>

          <p class="faint pub-note">
            发布只更新线上内容配置，不会提交微信审核、不会替换正式版代码。发布失败时后端整体回滚，不会留下只改了一半的线上配置。
          </p>
        </section>

        <!-- 微信代码包：独立状态展示 -->
        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">微信代码包</h2>
              <div class="sub">独立于配置发布。改页面结构需要发新代码包，配置改动只需发布配置</div>
            </div>
            <span class="tag" :class="wxUploadAvailable ? 't-live' : 't-slot'">
              {{ wxUploadAvailable ? '能力可用' : '未配置' }}
            </span>
          </div>

          <div class="wx-steps">
            <div v-for="(s, i) in WX_STEPS" :key="s.title" class="wx-step">
              <span class="wx-step__no">{{ i + 1 }}</span>
              <div class="wx-step__body">
                <b>{{ s.title }}</b>
                <span class="faint">{{ s.desc }}</span>
              </div>
              <span class="tag" :class="s.tagClass">{{ s.status }}</span>
            </div>
          </div>

          <div class="wx-meta">
            <span class="faint">当前代码版本：{{ wechatCodeLabel }}</span>
            <span class="faint">{{ wxStatusText }}</span>
          </div>
          <p v-if="!wxUploadAvailable" class="wx-limit">
            <MiniIcon name="info" :size="12" />
            {{ wxStatusReason || '尚未配置微信 AppID / 上传密钥，无法在此上传代码包。' }}
            上传与发布由开发者本人在微信开发者工具完成，本页只展示状态。
          </p>
          <p class="faint wx-tip">
            代码包发布由开发者手动完成，本系统不代为提交审核——
            这一栏如实展示能力是否可用，不会伪造上传或审核回执。
          </p>
        </section>
      </div>

      <!-- 版本存档 -->
      <div class="pub-side">
        <section class="card">
          <div class="head" style="margin-bottom: 10px">
            <div>
              <h2 class="h2">版本存档</h2>
              <div class="sub">每次配置发布都留一份快照</div>
            </div>
          </div>

          <!-- 归档 vs 版本存档 的区别必须写清楚 -->
          <p class="archive-note">
            <MiniIcon name="info" :size="12" />
            <span>
              「版本存档」记录配置发布时的快照（被导航引用的页面内容 + 全局配置 + 导航 + 品牌），
              可对比、可还原为草稿。<br>
              「页面归档」只是把不再使用的页面标记起来，不进版本快照，两者互相替代不了。
            </span>
          </p>

          <div v-if="!releases.length" class="rel-empty">
            还没有发布记录。第一次「发布配置」后这里会出现快照。
          </div>

          <ol v-else class="rel-list">
            <li v-for="row in releases" :key="String(row.id)" class="rel-item" :class="{ on: row.currentLive }">
              <div class="rel-head">
                <span class="rel-no">{{ releaseTitle(row) }}</span>
                <span v-if="row.currentLive" class="tag t-live">当前线上</span>
                <span v-else-if="row.rollback" class="tag t-draft">已回滚</span>
              </div>
              <div class="rel-meta">
                <span class="faint">{{ formatTime(row.publishedAt) }}</span>
                <span v-if="row.publisherName" class="faint">{{ row.publisherName }}</span>
                <span v-if="row.pageCount" class="faint">{{ row.pageCount }} 页</span>
                <span class="faint rel-id" :title="'这是发布记录的自增主键，仅用于定位记录，不是发布次数'">记录 #{{ row.id }}</span>
              </div>
              <p v-if="displayNote(row.note)" class="rel-note">{{ displayNote(row.note) }}</p>
              <div class="rel-ops">
                <button
                  type="button"
                  class="link"
                  :disabled="!row.hasSnapshot"
                  @click="openSnapshot(row)"
                >查看快照</button>
                <button
                  v-if="!row.currentLive"
                  type="button"
                  class="link"
                  :disabled="!row.hasSnapshot"
                  @click="handleRollback(row)"
                >还原为草稿</button>
                <span v-if="!row.hasSnapshot" class="faint rel-nofile">
                  该记录未保存快照，无法查看或还原
                </span>
              </div>
            </li>
          </ol>
        </section>

        <section class="card">
          <h2 class="h2">快照里包含什么</h2>
          <ul class="snap-list">
            <li><b>导航绑定的页面</b>：被底部 Tab 或首页配置引用的页面，其已发布版本的完整布局</li>
            <li><b>系统配置</b>：品牌、主题、登录页、我的页等全部配置项</li>
            <li><b>导航配置</b>：底部 Tab 的名称、图标、顺序与绑定</li>
          </ul>
          <p class="snap-caveat">
            <MiniIcon name="info" :size="12" />
            <span>
              当前快照<strong>只收录被导航引用的页面</strong>，未被导航引用的独立页面不在其中；
              这类页面请用页面列表里的「历史版本」逐页回退。
            </span>
          </p>
          <p class="faint snap-excl">
            同样不包含：内容条目的上下架（当前即时生效，不纳入配置版本）、
            管理员账号与权限、支付与微信密钥。这些恢复不了，也不会被版本快照影响。
          </p>
        </section>
      </div>
    </div>

    <MiniH5QrDialog v-model="qrVisible" mode="miniapp-draft" title="扫码预览草稿" />

    <el-dialog v-model="snapVisible" title="版本快照" width="640px" class="mini-wb-overlay">
      <div v-loading="snapLoading">
        <p v-if="snapRow" class="faint" style="margin: 0 0 10px; font-size: 12px">
          {{ releaseTitle(snapRow) }}
          <template v-if="snapRow.publishedAt"> · {{ formatTime(snapRow.publishedAt) }}</template>
        </p>
        <div v-if="snapData" class="snap-body">
          <div class="snap-sec">
            <span class="snap-sec__t">发布说明</span>
            <p style="margin: 4px 0 0; font-size: 13px">
              {{ displayNote(snapRow?.note) || '（未填写）' }}
            </p>
          </div>
          <!-- 空快照与「只有页面没有配置」是两回事，分开说 -->
          <div v-if="snapData.emptyConfirmed" class="snap-empty">
            该记录保存的快照内容为空（很可能是早期版本发布时未捕获快照）。
            这种记录无法用于还原，如需恢复请用页面级「历史版本」。
          </div>
          <div class="snap-sec">
            <span class="snap-sec__t">页面（{{ snapData.pages.length }} 个）</span>
            <div v-if="snapData.pages.length" class="snap-pages">
              <span v-for="p in snapData.pages.slice(0, 30)" :key="String(p.pageId || p.path)" class="snap-page">
                {{ p.name || p.path || `页面 #${p.pageId}` }}
              </span>
            </div>
            <p v-else class="faint" style="margin: 4px 0 0; font-size: 12px">快照中未包含页面</p>
          </div>
          <div class="snap-sec">
            <span class="snap-sec__t">系统配置（{{ Object.keys(snapData.systemConfig || {}).length }} 项）</span>
            <div v-if="Object.keys(snapData.systemConfig || {}).length" class="snap-keys">
              <span v-for="k in Object.keys(snapData.systemConfig).slice(0, 20)" :key="k" class="snap-key">
                {{ k }}
              </span>
            </div>
            <p v-else class="faint" style="margin: 4px 0 0; font-size: 12px">快照中未包含系统配置</p>
          </div>
          <p v-if="snapData.createdAt" class="faint" style="margin: 0; font-size: 11.5px">
            快照生成时间：{{ snapData.createdAt }}
          </p>
        </div>
        <!-- 🔴 解析失败 ≠ 空快照：如实说读不出来，不显示 0 -->
        <p v-else-if="!snapLoading" class="snap-fail">
          快照内容无法解析。可能是早期记录格式与当前不同，或内容已损坏。
          这种情况下请用「还原为草稿」后再逐项核对。
        </p>
      </div>
      <template #footer>
        <el-button @click="snapVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 发布与版本（工作流第 7 环）
 *
 * 这个文件原本存在但路由是 redirect（死文件，561 行完整逻辑没人能打开）。
 * 这次把它救活，并重写语义层——原来最大的问题是「保存草稿 / 保存并同步 / 一键同步到线上 /
 * 查看并发布」四种说法混在四个页面里，用户根本不知道哪个操作会让线上变。
 *
 * 现在的三条语义：
 *   保存草稿   = 各配置页自动写入，只影响预览
 *   发布配置   = 本页，把勾选的改动写入线上 + 生成快照（不涉及微信审核）
 *   微信代码包 = 另一处，状态在下方单独展示，能力不可用时如实说明
 *
 * 诚实性约束（必须守住）：
 * - 不伪造上传成功 / 审核通过 / 审核回执
 * - 不宣称版本快照能恢复内容上下架（那是即时生效，不在快照里）
 * - 发布失败不隐瞒，后端整体回滚的事实要讲清楚
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniOpsConceptBanner from '@/components/mini/MiniOpsConceptBanner.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import { getReleaseDetail, getPushPreviewStatus } from '@/api/version'
import { useBuildWorkbench } from '@/composables/useBuildWorkbench'
import {
  getMiniSite,
  getPendingChanges,
  postContentPreflight,
  publishMiniSite,
  previewMiniRollback,
  prepareMiniRollback,
  listMiniContentReleases,
  type MiniSiteVO,
  type PendingChangeItem,
  type ContentPreflight,
  type MiniContentReleaseVO,
} from '@/api/miniSite'

defineOptions({ name: 'MiniPublish' })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const loaded = ref(false)
const publishing = ref(false)
const rollingId = ref<number | null>(null)
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const selectedKeys = ref<Set<string>>(new Set())
const releases = ref<MiniContentReleaseVO[]>([])
const publishNote = ref('')
const wechatCodeLabel = ref('—')
const qrVisible = ref(false)
const wxUploadAvailable = ref(false)
const wxStatusReason = ref('')
const wxStatusText = ref('检测微信上传能力中…')

const preflight = ref<ContentPreflight | null>(null)
const preflightLoading = ref(false)
const preflightError = ref('')

const snapVisible = ref(false)
const snapLoading = ref(false)
const snapRow = ref<MiniContentReleaseVO | null>(null)
const snapData = ref<ParsedSnapshot | null>(null)

const highlightPageId = computed(() => {
  const raw = route.query.pageId
  return raw != null && String(raw) !== '' ? String(raw) : ''
})

const nextReleaseNo = computed(() => Number(site.value.liveReleaseNo || 0) + 1)

const blocking = computed(() => preflight.value?.blocking || [])
const warnings = computed(() => preflight.value?.warnings || [])

/**
 * 🔴 2026-10-06 统一发布资格判定（发布页 / 预览检查 / 工作台三处必须一致）：
 *
 * 原来 hasBlocking 只看后端 preflight，而 preflight **不校验跨表依赖**
 * （比如「导航指向的页面是否真的存在」）。于是会出现：
 *   预览检查说「检查通过、0 个阻止发布的问题」，
 *   同一时刻内容体检列出 4 个失效导航链接。
 * 两者都不是错的，只是口径不同 —— 但放在一起就是自相矛盾。
 *
 * 现在：发布资格 = 后端 preflight 的阻断 ∪ 搭建链路自检的阻断。
 * 链路自检直接复用 useBuildWorkbench（与工作台、预览页同源，零漂移）。
 */
const workbench = useBuildWorkbench()
const chainBlocking = computed(() =>
  workbench.stages.value
    .flatMap((s) => s.issues || [])
    .filter((i) => i.level === 'blocking'),
)
const hasBlocking = computed(
  () => blocking.value.length > 0
    || preflight.value?.canPublish === false
    || chainBlocking.value.length > 0,
)

function itemKey(item: PendingChangeItem): string {
  return String(item.changeId ?? item.id ?? item.pageId ?? `${item.type}-${item.name}-${item.path}`)
}
function isSelected(item: PendingChangeItem): boolean {
  return selectedKeys.value.has(itemKey(item))
}
function setSelected(item: PendingChangeItem, on: boolean) {
  const next = new Set(selectedKeys.value)
  const key = itemKey(item)
  if (on) next.add(key)
  else next.delete(key)
  selectedKeys.value = next
}
function selectedChangeIds(): string[] {
  return pending.value.filter((item) => isSelected(item)).map(itemKey)
}
function syncSelection() {
  selectedKeys.value = new Set(pending.value.map(itemKey))
}
function selectAll() {
  syncSelection()
}
function selectNone() {
  selectedKeys.value = new Set()
}

const selectedCount = computed(() => pending.value.filter(isSelected).length)

const siteChangeSelected = computed(() =>
  pending.value.some((item) => item.type === 'site' && isSelected(item)),
)

const selectedPageCount = computed(() =>
  pending.value.filter(
    (item) => isSelected(item) && item.pageId != null && item.pageId !== '',
  ).length,
)

const publishDisabled = computed(() => {
  if (publishing.value) return true
  if (hasBlocking.value) return true
  if (!pending.value.length) return true
  if (selectedCount.value === 0) return true
  if (!siteChangeSelected.value && selectedPageCount.value === 0) return true
  return false
})

const publishButtonText = computed(() => {
  const scope = selectedCount.value === pending.value.length
    ? ''
    : `（${selectedCount.value}/${pending.value.length} 项）`
  return publishing.value ? '发布中…' : `发布配置（第 ${nextReleaseNo.value} 次${scope}）`
})

function kindLabel(item: PendingChangeItem) {
  const t = String((item as any).changeKind || (item as any).kind || item.type || '')
  if (t.includes('new') || t === 'create' || t.includes('新增')) return '新增'
  if (t.includes('offline') || t.includes('下线')) return '下线'
  return '修改'
}
function kindTagClass(item: PendingChangeItem) {
  const k = kindLabel(item)
  if (k === '新增') return 't-new'
  if (k === '下线') return 't-draft'
  return 't-pending'
}

function formatTime(t?: string | null) {
  return t ? String(t).replace('T', ' ').slice(0, 19) : ''
}

/**
 * 版本记录标题。
 * 🔴 版本语义（utils/version-semantics）：这里的「第 N 次」是**配置发布序号**，
 * 后端 listContentReleases 用 r.getPatch() 赋值，与 live_release_no 同源，是权威值。
 * 不要再用记录 id 或 semver 全串数字去推算——那会得到 1200 这类假序号。
 */
function releaseTitle(row: MiniContentReleaseVO) {
  const no = row.releaseNo
  if (row.rollback && row.rollbackToReleaseNo != null) {
    return `第 ${no} 次 · 回滚至第 ${row.rollbackToReleaseNo} 次`
  }
  return `第 ${no} 次发布`
}

function displayNote(note?: string | null) {
  if (!note) return ''
  return String(note).replace(/\s*\(releaseNo=\d+\)/g, '').trim()
}

/* ---------------- 微信代码包（只展示真实能力，不伪造） ---------------- */

const WX_STEPS = computed(() => {
  const can = wxUploadAvailable.value
  return [
    {
      title: '本地上传代码',
      desc: can ? '上传当前版本代码包到微信后台' : '需在微信开发者工具中上传',
      status: can ? '可用' : '不可用',
      tagClass: can ? 't-live' : 't-slot',
    },
    {
      title: '提交审核',
      desc: '由开发者本人在微信公众平台提交',
      status: '本系统不代办',
      tagClass: 't-slot',
    },
    {
      title: '发布正式版',
      desc: '微信审核通过后由开发者发布',
      status: '本系统不代办',
      tagClass: 't-slot',
    },
    {
      title: '小程序读取新配置',
      desc: '配置发布后自动生效，与代码包相互独立',
      status: '随配置发布',
      tagClass: 't-draft',
    },
  ]
})

async function loadWxPushStatus() {
  try {
    const res = await getPushPreviewStatus()
    const data = (res as any)?.data ?? res ?? {}
    wxUploadAvailable.value = data.uploadAvailable === true || data.available === true
    wxStatusReason.value = String(data.capabilityReason || data.reason || '')
    if (data.lastVersion) {
      wechatCodeLabel.value = String(data.lastVersion)
      wxStatusText.value = `最近上传 ${data.lastVersion}`
    } else if (wxUploadAvailable.value) {
      wxStatusText.value = '已配置，可上传体验版代码'
    } else {
      wxStatusText.value = wxStatusReason.value || '尚未配置 AppID / 上传密钥'
    }
  } catch {
    wxUploadAvailable.value = false
    wxStatusText.value = '上传能力接口不可用'
    wxStatusReason.value = '未能获取微信上传能力状态，可能是未配置 AppID / 上传密钥'
  }
}

/* ---------------- 预检与发布 ---------------- */

async function loadPreflight() {
  preflightLoading.value = true
  preflightError.value = ''
  try {
    const ids = selectedChangeIds()
    preflight.value = await postContentPreflight(ids.length ? ids : pending.value.map(itemKey))
  } catch (e: any) {
    preflight.value = null
    preflightError.value = e?.message || '发布前检查暂不可用'
  } finally {
    preflightLoading.value = false
  }
}

async function handlePublish() {
  if (publishDisabled.value) return
  const pageIds = pending.value
    .filter((item) => isSelected(item) && item.pageId != null && item.pageId !== '')
    .map((item) => Number(item.pageId))
    .filter((id) => Number.isFinite(id) && id > 0)
  const includeSite = siteChangeSelected.value

  if (!includeSite && pageIds.length === 0) {
    ElMessage.warning('请至少勾选一项改动')
    return
  }

  const scopeText = includeSite
    ? `站点配置${pageIds.length ? ` + ${pageIds.length} 个页面` : ''}`
    : `${pageIds.length} 个页面`
  try {
    await ElMessageBox.confirm(
      `即将把 ${scopeText} 写入线上配置，线上用户下次打开即可见。\n`
      + '这次发布会生成一份版本快照，之后可对比或还原为草稿。\n\n'
      + '注意：这不会提交微信审核，也不替换正式版代码。',
      `发布配置 · 第 ${nextReleaseNo.value} 次`,
      { type: 'warning', confirmButtonText: '确认发布', cancelButtonText: '再检查一下' },
    )
  } catch {
    return
  }

  publishing.value = true
  const clientRequestId = `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    const result = await publishMiniSite({
      pageId: highlightPageId.value || undefined,
      pageIds,
      changeIds: selectedChangeIds(),
      includeSite,
      notes: publishNote.value.trim() || undefined,
      clientRequestId,
    })
    // 🔴 发布接口可能返回 200 却什么都没做（后端禁空发），不能直接报成功
    if (result.siteConfigPromoted === false && !(result.publishedPages || result.publishedPageCount)) {
      ElMessage.warning('本次没有任何内容被写入线上配置（后端判定无可发布改动），线上未发生变化')
    } else {
      ElMessage.success(result.message || `已发布配置（第 ${result.liveReleaseNo ?? nextReleaseNo.value} 次），版本快照已保存`)
    }
    publishNote.value = ''
    await load()
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '发布失败'
    ElMessage.error(`${msg}。发布未完成，线上配置不会只改一半`)
  } finally {
    publishing.value = false
  }
}

function openPreviewQr() {
  qrVisible.value = true
}

/* ---------------- 版本快照 ---------------- */

/**
 * 解析版本快照。
 *
 * 🔴 2026-10-06 修复「记录摘要显示 1 页，打开快照却是页面 0 个 / 系统配置 0 项」：
 * 后端 getReleaseDetail 返回的 `snapshot` 字段是**一个 JSON 字符串**
 * （mp_miniapp_release.snapshot 是 MEDIUMTEXT，里面再套 pages/systemConfig/createdAt）。
 * 原来直接把返回对象当快照用，于是 `snapData.pages` 全是 undefined，
 * 模板按 0 渲染 —— 看起来像「快照是空的」，实际是没解析。
 *
 * 兼容两种形态：
 *  1. { snapshot: "<json字符串>" }   ← 当前后端
 *  2. { pages: [...], systemConfig: {...} }  ← 早期/其它端已解析
 * 两者都取不到时返回 null，界面显示「无法解析」并禁止还原，
 * 不能把「读不出来」显示成「0 页 0 配置」。
 */
type ParsedSnapshot = {
  pages: Array<{ pageId?: number | string; name?: string; path?: string }>
  systemConfig: Record<string, unknown>
  createdAt?: string
  /** true = 后端确实存了空快照；false = 读不出来 */
  emptyConfirmed: boolean
}

function parseSnapshot(raw: any): ParsedSnapshot | null {
  if (!raw) return null
  // 形态 1：snapshot 是 JSON 字符串
  const rawSnap = raw.snapshot ?? raw
  if (typeof rawSnap === 'string') {
    const s = rawSnap.trim()
    if (!s) return { pages: [], systemConfig: {}, emptyConfirmed: true }
    try {
      const obj = JSON.parse(s)
      if (!obj || typeof obj !== 'object') return null
      return {
        pages: Array.isArray(obj.pages) ? obj.pages : [],
        systemConfig: (obj.systemConfig && typeof obj.systemConfig === 'object') ? obj.systemConfig : {},
        createdAt: obj.createdAt,
        emptyConfirmed: Array.isArray(obj.pages) && obj.pages.length === 0,
      }
    } catch {
      return null
    }
  }
  // 形态 2：已经是对象
  if (typeof rawSnap === 'object') {
    return {
      pages: Array.isArray(rawSnap.pages) ? rawSnap.pages : [],
      systemConfig: (rawSnap.systemConfig && typeof rawSnap.systemConfig === 'object') ? rawSnap.systemConfig : {},
      createdAt: rawSnap.createdAt,
      emptyConfirmed: Array.isArray(rawSnap.pages) && rawSnap.pages.length === 0,
    }
  }
  return null
}

async function openSnapshot(row: MiniContentReleaseVO) {
  snapRow.value = row
  snapVisible.value = true
  snapLoading.value = true
  snapData.value = null
  try {
    const res = await getReleaseDetail(Number(row.id))
    const d = (res as any)?.data ?? res
    snapData.value = parseSnapshot(d)
    if (!snapData.value) {
      ElMessage.warning('该快照无法解析（可能是早期记录格式），可改用「还原为草稿」后逐项核对')
    }
  } catch (e: unknown) {
    snapData.value = null
    ElMessage.warning(e instanceof Error ? e.message : '快照内容读取失败')
  } finally {
    snapLoading.value = false
  }
}

async function handleRollback(row: MiniContentReleaseVO) {
  if (!row.id || !row.hasSnapshot) {
    ElMessage.warning('该记录无快照，无法还原')
    return
  }
  if (rollingId.value != null) return
  rollingId.value = Number(row.id)
  try {
    const preview = await previewMiniRollback(row.id)
    const restoreNames = (preview.restorePageNames || []).slice(0, 8)
    const pendingLines = (preview.currentPendingSummaries || []).slice(0, 6)
    const lines = [
      `将第 ${row.releaseNo} 次的配置还原为「草稿」。`,
      '',
      '还原只生成草稿，不会立刻改变线上——你可以先在预览里检查，确认无误再回来发布。',
      '',
      restoreNames.length
        ? `会恢复的页面（${preview.restorePageNames?.length || restoreNames.length}）：${restoreNames.join('、')}${(preview.restorePageNames?.length || 0) > 8 ? ' 等' : ''}`
        : '快照中未解析到页面名。',
      preview.hasSiteConfig ? '同时恢复站点 / 导航 / 品牌配置草稿。' : '',
      pendingLines.length
        ? `当前未发布改动（${preview.currentPendingCount || pendingLines.length} 项）会被覆盖：\n· ${pendingLines.join('\n· ')}`
        : '当前没有未发布改动。',
    ].filter(Boolean)

    await ElMessageBox.confirm(lines.join('\n'), '还原为草稿', {
      type: 'warning',
      confirmButtonText: '还原为草稿',
      cancelButtonText: '取消',
      customClass: 'mini-rollback-confirm',
    })
    const result = await prepareMiniRollback(row.id)
    ElMessage.success(
      `${result.message || '已生成草稿'}。请先到「预览检查」确认，再发布配置。`,
    )
    await load()
  } catch (e: any) {
    if (e === 'cancel' || e?.action === 'cancel') return
    ElMessage.error(e?.message || '还原失败')
  } finally {
    rollingId.value = null
  }
}

/* ---------------- 加载 ---------------- */

async function load() {
  loading.value = true
  try {
    const [s, p, r] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      listMiniContentReleases(),
    ])
    site.value = s
    wechatCodeLabel.value = String(s.wechatCodeVersion || wechatCodeLabel.value || '—')
    pending.value = p.items || []
    releases.value = r || []
    syncSelection()
    // 链路自检与 preflight 并行：发布资格 = 两者阻断项的并集
    await Promise.all([
      loadPreflight(),
      loadWxPushStatus(),
      workbench.refresh(true),
    ])
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
    loaded.value = true
  }
}

watch(
  () => selectedKeys.value.size,
  () => {
    if (loaded.value) loadPreflight()
  },
)

watch(
  () => pending.value.map(itemKey).join('|'),
  () => {
    if (pending.value.length && selectedKeys.value.size === 0) syncSelection()
  },
)

onMounted(load)
</script>

<style scoped lang="scss">
.pub {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.pub-main,
.pub-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.pub-side { position: sticky; top: 12px; }

/* 🔴 链路自检阻断项：与后端 preflight 阻断并列展示，说明来源不同 */
.chain-block {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 9px;
  background: rgba(180, 40, 40, 0.05);
  border: 1px solid rgba(180, 40, 40, 0.18);
}

.chain-block__hd {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  color: #972626;
}

.chain-block__list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 12.5px;
    line-height: 1.55;
    color: #972626;
  }

  span { flex: 1; min-width: 0; }
}

/* 三种语义 */
.semantics { border-left: 3px solid var(--acc, #b4430f); }

.sem-row { display: flex; flex-direction: column; gap: 10px; }

.sem-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
}

.sem-ic {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sem-draft { background: rgba(120, 110, 95, 0.12); color: #6f6659; }
.sem-pub { background: rgba(180, 67, 15, 0.12); color: var(--acc, #b4430f); }
.sem-wx { background: rgba(7, 193, 96, 0.12); color: #0a8f4a; }

.sem-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  b { font-size: 13.5px; }

  em {
    font-style: normal;
    font-weight: 600;
    color: var(--acc, #b4430f);
  }
}

.sem-body .faint {
  font-size: 11.5px;
  line-height: 1.6;
}

/* 待发布清单 */
.sel-ops { display: flex; gap: 12px; }

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 9px;
  cursor: pointer;
  font-size: 13px;

  &.dim { opacity: 0.5; }
}

.list-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  b { font-weight: 500; }

  .faint {
    font-size: 11.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* 检查结果 */
.checks {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.chk {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.55;
  padding: 8px 10px;
  border-radius: 8px;
}

.chk-text { flex: 1; min-width: 0; }
.chk__ic { flex: none; margin-top: 1px; }

.chk--ok { background: rgba(47, 125, 79, 0.08); color: #24673f; }
.chk--err { background: rgba(180, 40, 40, 0.07); color: #972626; }
.chk--warn { background: rgba(180, 110, 15, 0.08); color: #8f580c; }
.chk--muted { background: rgba(0, 0, 0, 0.03); color: var(--wb-muted, #7d7468); }

.fix-list {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding: 10px;
  border-radius: 9px;
  background: rgba(180, 40, 40, 0.05);
}

.fix-head {
  font-size: 12px;
  font-weight: 600;
  color: #972626;
}

/* 变更摘要 */
.impact { margin-top: 12px; }

.impact-head {
  font-size: 12px;
  color: var(--wb-muted, #7d7468);
  display: block;
  margin-bottom: 6px;
}

.impact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.impact-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 8px;
  font-size: 13px;
}

.pub-bar {
  display: flex;
  gap: 9px;
  margin-top: 14px;
  flex-wrap: wrap;

  .input { flex: 1; min-width: 220px; }
}

.pub-note {
  font-size: 11.5px;
  line-height: 1.6;
  margin: 10px 0 0;
}

/* 微信代码包 */
.wx-steps {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.wx-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 9px;
}

.wx-step__no {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.wx-step__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  b { font-size: 13px; }

  .faint { font-size: 11.5px; line-height: 1.5; }
}

.wx-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 10px;
  font-size: 11.5px;
}

.wx-limit {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 10px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: #8a6a3a;
  background: rgba(180, 110, 15, 0.07);
  padding: 8px 10px;
  border-radius: 8px;
}

.wx-tip {
  font-size: 11px;
  line-height: 1.6;
  margin: 8px 0 0;
}

/* 版本存档 */
.archive-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11.5px;
  line-height: 1.6;
  margin: 0 0 12px;
  padding: 9px 10px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  color: var(--wb-muted, #6d6559);
}

.rel-empty {
  font-size: 12.5px;
  color: var(--wb-muted, #7d7468);
  padding: 12px 0;
  line-height: 1.6;
}

.rel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 460px;
  overflow-y: auto;
}

.rel-item {
  padding: 9px 11px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 9px;
  font-size: 12.5px;

  &.on { border-color: rgba(47, 125, 79, 0.4); background: rgba(47, 125, 79, 0.04); }
}

.rel-head {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.rel-no { font-weight: 600; font-size: 13px; }

.rel-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 3px;
  font-size: 11px;
}

.rel-note {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--wb-text, #3d3630);
}

.rel-ops {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 7px;
}

.rel-nofile { font-size: 11px; }

/* 记录 ID：明确与「第几次发布」不是一回事 */
.rel-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  cursor: help;
  border-bottom: 1px dotted currentColor;
}

.snap-list {
  margin: 8px 0 0;
  padding-left: 17px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--wb-text, #3d3630);
}

.snap-caveat {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11.5px;
  line-height: 1.6;
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(180, 110, 15, 0.08);
  color: #8a5a0c;

  strong { font-weight: 600; }
}

.snap-excl {
  font-size: 11px;
  line-height: 1.6;
  margin: 8px 0 0;
}

.snap-body { display: flex; flex-direction: column; gap: 14px; }

/* 🔴 快照为空 与 快照读不出来 必须视觉区分 */
.snap-empty {
  font-size: 12px;
  line-height: 1.6;
  color: #8a6a3a;
  background: rgba(180, 110, 15, 0.08);
  padding: 9px 11px;
  border-radius: 8px;
}

.snap-fail {
  font-size: 12.5px;
  line-height: 1.65;
  color: #972626;
  background: rgba(180, 40, 40, 0.06);
  padding: 10px 12px;
  border-radius: 8px;
  margin: 0;
}

.snap-sec__t {
  font-size: 12px;
  font-weight: 600;
  color: var(--acc, #b4430f);
}

.snap-pages, .snap-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

.snap-page, .snap-key {
  font-size: 11.5px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
}

.snap-key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

@media (max-width: 1100px) {
  .pub { grid-template-columns: minmax(0, 1fr); }
  .pub-side { position: static; }
}
</style>