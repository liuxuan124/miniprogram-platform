<template>
  <div class="notice-ops">
    <PageHeader
      kicker="运营中心"
      title="通知中心"
      description="给用户发站内信、查看送达与已读情况、按场景关掉不想发的通知类型。"
    >
      <template #actions>
        <el-button :loading="loading" @click="loadAll">刷新</el-button>
      </template>
    </PageHeader>

    <!-- 概览 -->
    <div class="nt-stats">
      <div class="nt-stat">
        <div class="nt-stat__num">{{ stats.campaigns }}</div>
        <div class="nt-stat__label">群发批次</div>
      </div>
      <div class="nt-stat">
        <div class="nt-stat__num">{{ stats.manualSent }}</div>
        <div class="nt-stat__label">群发送达条数</div>
      </div>
      <div class="nt-stat">
        <div class="nt-stat__num">{{ stats.unread }}</div>
        <div class="nt-stat__label">当前未读</div>
      </div>
    </div>

    <el-alert type="info" :closable="false" class="nt-alert">
      <template #title>
        站内信会出现在小程序「我的 → 通知」列表。填了跳转路径后，用户点通知标题可直接跳到对应页面。
        <b>通知是单向的</b>，用户能否看到微信服务通知另受订阅消息模板控制（见下方「订阅消息」页签）。
      </template>
    </el-alert>

    <el-tabs v-model="activeTab" class="nt-tabs">
      <!-- ============ 群发通知 ============ -->
      <el-tab-pane label="群发通知" name="broadcast">
        <div class="nt-grid">
          <el-card shadow="never" class="nt-form-card">
            <template #header>新建群发</template>
            <el-form label-width="88px" label-position="left" class="nt-form">
              <el-form-item label="标题" required>
                <el-input
                  v-model="form.title"
                  maxlength="60"
                  show-word-limit
                  placeholder="如：会员权益即将到期提醒"
                />
              </el-form-item>

              <el-form-item label="正文" required>
                <el-input
                  v-model="form.content"
                  type="textarea"
                  :rows="5"
                  maxlength="800"
                  show-word-limit
                  placeholder="说明具体发生了什么、用户该做什么。避免只写「请注意」这类无信息量文案。"
                />
              </el-form-item>

              <el-form-item label="目标人群">
                <el-radio-group v-model="form.audience">
                  <el-radio value="all">全部用户</el-radio>
                  <el-radio value="member">有效会员</el-radio>
                  <el-radio value="recent">近 30 天活跃</el-radio>
                  <el-radio value="segment">指定分群</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item v-if="form.audience === 'segment'" label="选择分群">
                <el-select v-model="form.segmentId" placeholder="选择一个人群包" class="nt-select">
                  <el-option
                    v-for="s in segments"
                    :key="s.id"
                    :label="s.name"
                    :value="s.id"
                  >
                    <div class="nt-opt">
                      <span>{{ s.name }}</span>
                      <span class="nt-opt__desc">{{ s.ruleDesc || '—' }}</span>
                    </div>
                  </el-option>
                </el-select>
                <div class="nt-hint">人群口径与「用户管理 → 角色标签」里的分群触达完全一致</div>
              </el-form-item>

              <el-form-item label="跳转路径">
                <el-input v-model="form.link" placeholder="留空则不可点击；如 /pkg-trade/order-list/order-list" />
                <div class="nt-hint">
                  必须用分包路径（<code>/pkg-xxx/xxx/xxx</code>），填主包未注册页会跳空白
                </div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :loading="sending" :disabled="!canSend" @click="send">
                  立即群发
                </el-button>
                <el-button @click="resetForm">清空</el-button>
              </el-form-item>
            </el-form>
          </el-card>

          <el-card shadow="never" class="nt-records">
            <template #header>
              <div class="nt-records__head">
                <span>发送记录</span>
                <el-pagination
                  v-model:current-page="page"
                  :page-size="pageSize"
                  :total="total"
                  layout="prev, pager, next, total"
                  small
                  @current-change="loadCampaigns"
                />
              </div>
            </template>

            <el-empty v-if="!campaigns.length" description="还没有群发记录" />
            <div v-else class="nt-campaign">
              <div v-for="c in campaigns" :key="c.id" class="nt-campaign__item">
                <div class="nt-campaign__head">
                  <b>{{ c.title }}</b>
                  <el-tag size="small" effect="plain">{{ audienceLabel(c.audience) }}</el-tag>
                </div>
                <p class="nt-campaign__body">{{ c.content }}</p>
                <div class="nt-campaign__meta">
                  <span>目标 {{ c.targetCount }}</span>
                  <span>送达 {{ c.sentCount }}</span>
                  <span>已读 {{ c.readCount }}</span>
                  <span class="nt-campaign__rate">已读率 {{ readRate(c) }}%</span>
                  <span>{{ shortTime(c.sentTime || c.createTime) }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ============ 场景开关 ============ -->
      <el-tab-pane label="场景开关" name="scenes">
        <el-alert type="warning" :closable="false" class="nt-alert">
          <template #title>
            关掉后该场景<b>不再产生新的站内信</b>，已发出的历史通知仍保留。
            订单类通知关闭前请确认业务影响 —— 用户会收不到发货与支付提醒。
          </template>
        </el-alert>
        <el-card shadow="never">
          <div class="nt-scene-list">
            <div v-for="s in scenes" :key="s.scene" class="nt-scene">
              <div class="nt-scene__text">
                <b>{{ s.label }}</b>
                <span class="nt-scene__code">{{ s.scene }}</span>
              </div>
              <el-switch
                :model-value="s.enabled"
                @change="(v: any) => toggleScene(s, !!v)"
              />
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ============ 订阅消息 ============ -->
      <el-tab-pane label="订阅消息" name="subscribe">
        <el-alert type="info" :closable="false" class="nt-alert">
          <template #title>
            订阅消息（微信服务通知）需先在微信公众平台申请模板，再把模板 ID 填到下面。
            与站内信<b>互为补充</b>：站内信常驻可查，订阅消息可在用户不打开小程序时触达。
          </template>
        </el-alert>
        <el-card shadow="never">
          <el-table :data="subscribeList" border stripe style="width: 100%">
            <el-table-column label="通知场景" min-width="160">
              <template #default="{ row }">{{ row.scene }}</template>
            </el-table-column>
            <el-table-column label="微信模板 ID" min-width="260">
              <template #default="{ row }">
                <el-input v-model="row.templateId" placeholder="填写模板 ID" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="触发时机" min-width="160">
              <template #default="{ row }">
                <span class="nt-tbl-sub">{{ row.trigger || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="启用" width="80" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.enabled" />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.enabled && row.templateId ? 'success' : 'info'"
                  size="small"
                  effect="plain"
                >
                  {{ row.enabled && row.templateId ? '已启用' : '未配置' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div class="nt-save-row">
            <el-button type="primary" :loading="subscribeSaving" @click="saveSubscribeAll">保存全部订阅消息</el-button>
            <span class="nt-hint">逐条保存，接口按 scene 覆盖</span>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import {
  broadcastNotice,
  getNoticeStats,
  listNoticeCampaigns,
  listNoticeScenes,
  updateNoticeScene,
  type NoticeCampaignItem,
  type NoticeAudience,
  type NoticeSceneItem,
  type NoticeStats,
} from '@/api/noticeOps'
import { get, put } from '@/api/request'
import { listSegments, type MemberSegment } from '@/api/memberOps'

const activeTab = ref('broadcast')
const loading = ref(false)
const sending = ref(false)

const stats = reactive<NoticeStats>({ campaigns: 0, manualSent: 0, unread: 0 })
const campaigns = ref<NoticeCampaignItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const scenes = ref<NoticeSceneItem[]>([])
const segments = ref<MemberSegment[]>([])

const form = reactive({
  title: '',
  content: '',
  audience: 'all' as NoticeAudience,
  segmentId: null as number | null,
  link: '',
})

const canSend = computed(
  () => !!form.title.trim() && !!form.content.trim() && (form.audience !== 'segment' || !!form.segmentId),
)

function audienceLabel(a: string) {
  const map: Record<string, string> = {
    all: '全部用户',
    member: '有效会员',
    recent: '近 30 天活跃',
    segment: '指定分群',
  }
  return map[a] || a
}

function readRate(c: NoticeCampaignItem) {
  if (!c.sentCount) return 0
  return Math.round((c.readCount / c.sentCount) * 100)
}

function shortTime(s?: string) {
  return s ? String(s).replace('T', ' ').slice(5, 16) : ''
}

function resetForm() {
  form.title = ''
  form.content = ''
  form.audience = 'all'
  form.segmentId = null
  form.link = ''
}

async function loadStats() {
  try {
    const res: any = await getNoticeStats()
    const d = res?.data ?? res
    if (d) Object.assign(stats, d)
  } catch {
    // 统计失败不阻塞主流程
  }
}

async function loadCampaigns() {
  try {
    const res: any = await listNoticeCampaigns({ current: page.value, size: pageSize })
    const d = res?.data ?? res
    const rows = Array.isArray(d) ? d : d?.records || []
    campaigns.value = rows
    total.value = Array.isArray(d) ? rows.length : d?.total ?? rows.length
  } catch (e: any) {
    campaigns.value = []
    ElMessage.error(e?.message || '发送记录加载失败')
  }
}

async function loadScenes() {
  try {
    const res: any = await listNoticeScenes()
    const d = res?.data ?? res
    scenes.value = Array.isArray(d) ? d : d?.records || []
  } catch (e: any) {
    ElMessage.error(e?.message || '场景开关加载失败')
  }
}

async function loadSegments() {
  try {
    const res: any = await listSegments()
    const d = res?.data ?? res
    segments.value = Array.isArray(d) ? d : d?.records || []
  } catch {
    segments.value = []
  }
}

async function send() {
  if (!canSend.value) return
  const audienceText = audienceLabel(form.audience)
  const segName = form.audience === 'segment'
    ? segments.value.find((s) => s.id === form.segmentId)?.name || '指定分群'
    : ''
  try {
    await ElMessageBox.confirm(
      `即将向「${segName || audienceText}」发送一条通知，发送后无法撤回。确认继续？`,
      '确认群发',
      { type: 'warning', confirmButtonText: '确认发送', cancelButtonText: '再想想' },
    )
  } catch {
    return
  }
  sending.value = true
  try {
    const res: any = await broadcastNotice({
      title: form.title.trim(),
      content: form.content.trim(),
      link: form.link.trim() || undefined,
      audience: form.audience,
      segmentId: form.segmentId,
    })
    const d = res?.data ?? res
    ElMessage.success(`已发送 ${d?.sentCount ?? 0} 人`)
    resetForm()
    page.value = 1
    await Promise.all([loadCampaigns(), loadStats()])
  } catch (e: any) {
    ElMessage.error(e?.message || '群发失败')
  } finally {
    sending.value = false
  }
}

async function toggleScene(row: NoticeSceneItem, enabled: boolean) {
  const prev = row.enabled
  row.enabled = enabled
  try {
    await updateNoticeScene(row.scene, enabled)
    ElMessage.success(enabled ? `已开启「${row.label}」` : `已关闭「${row.label}」`)
    await loadStats()
  } catch (e: any) {
    row.enabled = prev
    ElMessage.error(e?.message || '设置失败')
  }
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadStats(), loadCampaigns(), loadScenes(), loadSegments()])
  } finally {
    loading.value = false
  }
}

// ---------- 订阅消息（复用 GrowthAdminController 现有接口） ----------
// ⚠️ 后端 PUT /admin/growth/subscribe/templates 是「按 scene 覆盖单条」，
//    不是接收数组 —— 一次传数组会静默只写第一条。必须逐条 PUT。
const subscribeSaving = ref(false)
const subscribeList = ref<
  Array<{ scene: string; templateId: string; title?: string; trigger: string; enabled: boolean }>
>([])

async function loadSubscribe() {
  try {
    const res: any = await get('/api/v1/admin/growth/subscribe/templates')
    const d = res?.data ?? res
    const rows = Array.isArray(d) ? d : d?.records || []
    subscribeList.value = rows.map((r: any) => ({
      scene: r.scene,
      templateId: r.templateId || '',
      title: r.title || '',
      trigger: r.trigger || '',
      enabled: r.enabled !== false && r.enabled !== 0,
    }))
  } catch (e: any) {
    ElMessage.error(e?.message || '订阅消息配置加载失败')
  }
}

async function saveSubscribeAll() {
  const rows = subscribeList.value.filter((r) => r.scene)
  if (!rows.length) {
    ElMessage.warning('没有可保存的订阅消息场景')
    return
  }
  subscribeSaving.value = true
  let ok = 0
  const failed: string[] = []
  for (const row of rows) {
    try {
      await put('/api/v1/admin/growth/subscribe/templates', {
        scene: row.scene,
        templateId: row.templateId,
        title: row.title || row.scene,
        enabled: row.enabled ? 1 : 0,
      })
      ok++
    } catch {
      failed.push(row.scene)
    }
  }
  subscribeSaving.value = false
  if (failed.length) {
    ElMessage.error(`${ok} 条成功，${failed.length} 条失败：${failed.join('、')}`)
  } else {
    ElMessage.success(`已保存 ${ok} 条订阅消息配置`)
  }
}

onMounted(async () => {
  await loadAll()
  await loadSubscribe()
})
</script>

<style lang="scss" scoped>
.notice-ops {
  padding: 20px 24px 40px;
}

.nt-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.nt-stat {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 14px 16px;
}

.nt-stat__num {
  font-size: 24px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.nt-stat__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.nt-alert {
  margin-bottom: 14px;
}

.nt-grid {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.nt-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.nt-select {
  width: 100%;
}

.nt-opt {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.nt-opt__desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.nt-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.nt-hint code {
  background: var(--el-fill-color-light);
  padding: 0 4px;
  border-radius: 3px;
}

.nt-records__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.nt-campaign {
  display: flex;
  flex-direction: column;
}

.nt-campaign__item {
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.nt-campaign__item:last-child {
  border-bottom: none;
}

.nt-campaign__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.nt-campaign__body {
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

.nt-campaign__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.nt-campaign__rate {
  color: var(--el-color-primary);
}

.nt-scene-list {
  display: flex;
  flex-direction: column;
}

.nt-scene {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.nt-scene:last-child {
  border-bottom: none;
}

.nt-scene__text {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.nt-scene__code {
  font-size: 12px;
  color: var(--el-text-color-tertiary);
  font-family: var(--el-font-family-monospace, monospace);
}

.nt-tbl-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.nt-save-row {
  margin-top: 14px;
}
</style>
