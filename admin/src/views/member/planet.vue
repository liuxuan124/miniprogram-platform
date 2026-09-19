<template>
  <div class="planet-page" v-loading="loading">
    <div class="page-head">
      <div>
        <h2>社区管理</h2>
        <p>
          一个小程序可配置多个社区（增删改、排序、启停、默认展示）。用户端仍称「星球」；付费档在各社区卡片下维护。
        </p>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存社区配置</el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
      title="发帖：内容管理 → 新建「动态」并勾选「星球专属」+ 所属社区。用户购买绑定该社区付费档的商品后，可看全文并下载资料。"
    />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="社区列表" name="communities">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 14px"
          title="列表顺序即小程序展示顺序。可设一个「默认展示/主社区」（用户未自选常驻时回落此项）。停用后用户端不再展示该社区。"
        />
        <div class="communities-toolbar">
          <span class="hint" style="margin-left: 0">当前 {{ communities.length }} 个社区</span>
          <el-button type="primary" @click="addCommunity">+ 新增社区</el-button>
        </div>
        <div v-for="(c, ci) in communities" :key="c.id || ci" class="community-card">
          <div class="community-card__head">
            <el-input v-model="c.emoji" style="width: 64px" placeholder="🪐" />
            <el-input v-model="c.title" placeholder="社区名称" style="flex: 1" />
            <el-tag v-if="c.primary" type="warning" size="small">默认展示/主社区</el-tag>
            <el-tag v-if="c.enabled === false" type="info" size="small">已停用</el-tag>
            <el-button text :disabled="ci === 0" @click="moveCommunity(ci, -1)">上移</el-button>
            <el-button text :disabled="ci >= communities.length - 1" @click="moveCommunity(ci, 1)">下移</el-button>
            <el-button text type="danger" :disabled="communities.length <= 1" @click="removeCommunity(ci)">删除</el-button>
          </div>
          <el-form label-width="120px" size="small">
            <el-form-item label="社区 ID">
              <el-input v-model="c.id" placeholder="如 warm-main" style="max-width: 240px" />
              <span class="hint">保存后勿随意改 ID（动态/付费档会关联）</span>
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="c.sortOrder" :min="0" :max="999" />
              <span class="hint">越小越靠前；也可用上移/下移</span>
            </el-form-item>
            <el-form-item label="启用">
              <el-switch v-model="c.enabled" active-text="展示" inactive-text="停用" />
            </el-form-item>
            <el-form-item label="默认展示">
              <el-switch
                :model-value="!!c.primary"
                @change="(val) => setPrimary(ci, !!val)"
                active-text="主社区"
                inactive-text="否"
              />
              <span class="hint">用户未自选常驻时，小程序回落至此社区</span>
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="c.subtitle" placeholder="一句话吸引" />
            </el-form-item>
            <el-form-item label="封面图">
              <el-input v-model="c.cover" placeholder="可选，HTTPS 图片 URL" />
            </el-form-item>
            <el-form-item label="介绍正文">
              <el-input v-model="c.intro" type="textarea" :rows="4" placeholder="多段用换行分隔，用于介绍页「关于这里」" />
            </el-form-item>
            <el-form-item label="主按钮文案">
              <el-input v-model="c.ctaText" placeholder="加入星球" style="max-width: 240px" />
            </el-form-item>
            <el-form-item label="底部提示">
              <el-input v-model="c.joinHint" placeholder="加入后可提问 · 看精华 · 下资料" />
            </el-form-item>
            <el-form-item label="亮点卖点">
              <div class="hl-list">
                <div v-for="(h, hi) in (c.highlights || [])" :key="hi" class="hl-row">
                  <el-input v-model="h.icon" placeholder="图标" style="width: 72px" />
                  <el-input v-model="h.title" placeholder="标题" style="width: 140px" />
                  <el-input v-model="h.desc" placeholder="说明" style="flex: 1" />
                  <el-button text type="danger" @click="c.highlights.splice(hi, 1)">删</el-button>
                </div>
                <el-button type="primary" link @click="addHighlight(ci)">+ 亮点</el-button>
              </div>
            </el-form-item>
          </el-form>

          <el-divider content-position="left">本社区会员档（scope=planet）</el-divider>
          <div class="planet-plans">
            <div class="planet-plans__toolbar">
              <span class="hint" style="margin-left: 0">仅对本社区 ID 生效；商品编辑时请绑定对应档位。</span>
              <el-button type="primary" size="small" :disabled="!c.id" @click="openPlanetPlanDialog(c.id)">新增档位</el-button>
            </div>
            <el-table
              :data="planetPlansMap[c.id] || []"
              size="small"
              empty-text="暂无本社区付费档"
              v-loading="planetPlansLoading[c.id]"
            >
              <el-table-column prop="name" label="名称" min-width="120" />
              <el-table-column label="排序" width="70" prop="sortOrder" />
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                    {{ row.status === 1 ? '启用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openPlanetPlanDialog(c.id, row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="handleDeletePlanetPlan(c.id, row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        <el-button type="primary" plain @click="addCommunity">+ 新增社区</el-button>
      </el-tab-pane>

      <el-tab-pane label="全局展示" name="planet">
        <el-form label-width="120px" class="planet-form">
          <el-form-item label="模块开关">
            <el-switch v-model="moduleEnabled" active-text="已开启" inactive-text="已关闭" @change="onToggleModule" />
            <span class="hint">关闭后小程序星球入口不可用</span>
          </el-form-item>
          <el-form-item label="全局名称">
            <el-input v-model="form.title" maxlength="40" show-word-limit placeholder="模块总称，如：创作者星球" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="form.subtitle" maxlength="80" show-word-limit placeholder="星主精选动态与资料" />
          </el-form-item>
          <el-form-item label="入口文案">
            <el-input v-model="form.entryLabel" maxlength="12" placeholder="星球" style="width: 200px" />
            <span class="hint">C 端 Tab/入口常用「星球」</span>
          </el-form-item>
          <el-form-item label="封面图 URL">
            <el-input v-model="form.coverImage" placeholder="可选" />
          </el-form-item>
          <el-form-item label="未付费可见">
            <el-radio-group v-model="form.unpaidViewMode">
              <el-radio-button value="hidden">完全隐藏</el-radio-button>
              <el-radio-button value="title">仅标题</el-radio-button>
              <el-radio-button value="summary">标题+摘要</el-radio-button>
              <el-radio-button value="preview_n">前 N 条可读</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="form.unpaidViewMode === 'preview_n'" label="可读条数 N">
            <el-input-number v-model="form.previewCount" :min="0" :max="50" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="说明" name="levels">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 14px"
          title="成长等级 ≠ 社区付费权益。积分成长档仅展示用；各社区付费门禁请在「社区列表」卡片下的「本社区会员档」维护。"
        />
        <div class="toolbar">
          <span class="toolbar-desc">如需调整积分成长展示文案，可前往成长等级页（与付费订购无关）。</span>
          <el-button @click="$router.push('/member/level')">查看成长等级</el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="动态运营" name="ops">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 14px"
          title="球友=有效付费会员数；今日动态=当日发布的星球专属内容。选「自动」走真统计，选「手动」用下方填写值。"
        />
        <el-form label-width="140px">
          <el-form-item label="首页卡片标题">
            <el-input v-model="opsForm.homeCardTitle" placeholder="暖阁星球 · 内容创作者" style="max-width: 420px" />
          </el-form-item>

          <el-divider content-position="left">球友数</el-divider>
          <el-form-item label="统计方式">
            <el-radio-group v-model="opsForm.membersMode">
              <el-radio-button value="auto">自动统计</el-radio-button>
              <el-radio-button value="manual">手动填写</el-radio-button>
            </el-radio-group>
            <span class="hint">实时：{{ liveStats.activeMembers ?? '-' }}</span>
          </el-form-item>
          <el-form-item v-if="opsForm.membersMode === 'manual'" label="球友数">
            <el-input v-model="opsForm.kpiMembers" placeholder="3241" style="width: 200px" />
          </el-form-item>
          <el-form-item label="文案模板">
            <el-input v-model="opsForm.membersTemplate" placeholder="{n} 位球友" style="max-width: 420px" />
          </el-form-item>

          <el-divider content-position="left">今日新动态</el-divider>
          <el-form-item label="统计方式">
            <el-radio-group v-model="opsForm.todayMode">
              <el-radio-button value="auto">自动统计</el-radio-button>
              <el-radio-button value="manual">手动填写</el-radio-button>
            </el-radio-group>
            <span class="hint">实时：{{ liveStats.todayPosts ?? '-' }}</span>
          </el-form-item>
          <el-form-item v-if="opsForm.todayMode === 'manual'" label="今日条数">
            <el-input v-model="opsForm.kpiTodayFeed" placeholder="27" style="width: 200px" />
          </el-form-item>
          <el-form-item label="CTA 模板">
            <el-input v-model="opsForm.ctaTemplate" placeholder="今日 {n} 条新动态 · 去看看" style="max-width: 420px" />
          </el-form-item>

          <el-divider content-position="left">沉淀内容 KPI</el-divider>
          <el-form-item label="统计方式">
            <el-radio-group v-model="opsForm.postsMode">
              <el-radio-button value="auto">自动统计</el-radio-button>
              <el-radio-button value="manual">手动填写</el-radio-button>
            </el-radio-group>
            <span class="hint">实时：{{ liveStats.planetPosts ?? '-' }}</span>
          </el-form-item>
          <el-form-item v-if="opsForm.postsMode === 'manual'" label="沉淀内容">
            <el-input v-model="opsForm.kpiPosts" placeholder="128" style="width: 200px" />
          </el-form-item>

          <el-divider content-position="left">首页三条话题</el-divider>
          <el-form-item label="来源">
            <el-radio-group v-model="opsForm.itemsMode">
              <el-radio-button value="auto">自动选取</el-radio-button>
              <el-radio-button value="manual">手动配置</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="opsForm.itemsMode === 'auto'" label="预览">
            <div class="live-items">
              <div v-for="(it, idx) in (liveStats.homeItems || [])" :key="idx" class="live-item">
                <el-tag size="small">{{ it.tag }}</el-tag>
                <span>{{ it.text }}</span>
              </div>
              <span v-if="!(liveStats.homeItems || []).length" class="hint">暂无星球专属内容，请在内容管理发布并勾选星球专属</span>
            </div>
          </el-form-item>
          <template v-if="opsForm.itemsMode === 'manual'">
            <el-form-item v-for="(it, idx) in opsForm.homeItems" :key="idx" :label="'条目 ' + (idx + 1)">
              <div class="topic-row">
                <el-input v-model="it.tag" placeholder="标签" style="width: 100px" />
                <el-input v-model="it.text" placeholder="标题文案" style="width: 360px" />
              </div>
            </el-form-item>
          </template>

          <el-form-item label="打卡入口">
            <el-switch v-model="opsForm.checkInEnabled" active-text="展示" inactive-text="隐藏" />
          </el-form-item>
          <el-form-item label="精华标记">
            <el-button type="primary" link @click="$router.push('/content/article?essence=1')">
              在内容管理中标记星球精华
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="话题预测" name="topics">
        <p class="hint" style="margin-bottom: 12px">小程序优先展示真实「本周热门话题」（标签互动热度 Top4）。此处手工配置仅作无真实数据时的兜底；有真实数据时会被覆盖。</p>
        <el-form label-width="100px">
          <el-form-item label="模块标题">
            <el-input v-model="topicsForm.title" maxlength="40" />
          </el-form-item>
          <el-form-item label="说明文案">
            <el-input v-model="topicsForm.note" type="textarea" :rows="3" />
          </el-form-item>
          <div v-for="(item, i) in topicsForm.items" :key="i" class="topic-row">
            <el-input v-model="item.name" placeholder="话题名" style="width: 160px" />
            <el-input-number v-model="item.width" :min="10" :max="100" placeholder="条宽%" />
            <el-input v-model="item.pct" placeholder="趋势如 ↑ 12%" style="width: 100px" />
            <el-button text type="danger" @click="topicsForm.items.splice(i, 1)">删</el-button>
          </div>
          <el-button type="primary" link @click="topicsForm.items.push({ name: '', width: 50, pct: '↑ 0%' })">+ 添加话题</el-button>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="付费套餐" name="packages">
        <div class="toolbar">
          <span class="toolbar-desc">套餐=商品类型「会员」；请绑定 membershipPlanId（平台或社区档），天数 0=终身。</span>
          <div>
            <el-button @click="load">刷新</el-button>
            <el-button type="primary" @click="goCreatePackage">新建会员套餐</el-button>
          </div>
        </div>
        <el-table :data="packages" empty-text="暂无上架套餐">
          <el-table-column prop="name" label="套餐名" min-width="160" />
          <el-table-column prop="price" label="价格" width="100" />
          <el-table-column label="有效期" width="120">
            <template #default="{ row }">
              {{ row.membershipDays === 0 || row.membershipDays == null ? '终身' : row.membershipDays + ' 天' }}
            </template>
          </el-table-column>
          <el-table-column prop="membershipLevelName" label="开通等级(旧)" width="120" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button link type="primary" @click="$router.push(`/product/edit/${row.productId}`)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="planetPlanDialogVisible"
      :title="editingPlanetPlanId ? '编辑本社区付费档' : '新增本社区付费档'"
      width="480px"
      @closed="resetPlanetPlanForm"
    >
      <el-form label-width="100px">
        <el-form-item label="社区 ID">
          <el-input :model-value="editingPlanetId" disabled />
        </el-form-item>
        <el-form-item label="档位名称" required>
          <el-input v-model="planetPlanForm.name" placeholder="如：月卡" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="planetPlanForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="planetPlanForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="planetPlanForm.statusBool" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planetPlanDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="planetPlanSubmitting" @click="handlePlanetPlanSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { get, put } from '@/api/request'
import {
  createMembershipPlan,
  deleteMembershipPlan,
  getMembershipPlanList,
  updateMembershipPlan,
  type MembershipPlan,
} from '@/api/membershipPlan'
import { useFeatureModulesStore } from '@/stores/feature-modules'

type CommunityRow = {
  id: string
  title: string
  subtitle: string
  emoji: string
  cover: string
  intro: string
  ctaText: string
  joinHint: string
  primary?: boolean
  enabled?: boolean
  sortOrder?: number
  highlights: Array<{ icon: string; title: string; desc: string }>
}

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const activeTab = ref('communities')
const moduleEnabled = ref(false)
const packages = ref<any[]>([])
const planetPlansMap = reactive<Record<string, MembershipPlan[]>>({})
const planetPlansLoading = reactive<Record<string, boolean>>({})
const communities = ref<CommunityRow[]>([])
const form = reactive({
  title: '星球',
  subtitle: '星主精选动态与资料',
  coverImage: '',
  unpaidViewMode: 'summary',
  previewCount: 3,
  entryLabel: '星球',
})

const topicsForm = reactive({
  title: '本周星球话题预测',
  note: '',
  items: [] as Array<{ name: string; width: number; pct: string }>,
})

const opsForm = reactive({
  homeCardTitle: '暖阁星球 · 内容创作者',
  membersMode: 'auto',
  todayMode: 'auto',
  postsMode: 'auto',
  itemsMode: 'auto',
  kpiMembers: '3241',
  kpiPosts: '128',
  kpiTodayFeed: '27',
  kpiQuestions: '27',
  membersTemplate: '{n} 位球友',
  ctaTemplate: '今日 {n} 条新动态 · 去看看',
  homeItems: [
    { tag: '热议', text: '' },
    { tag: '精华', text: '' },
    { tag: '提问', text: '' },
  ] as Array<{ tag: string; text: string }>,
  checkInEnabled: true,
})

const liveStats = reactive<{
  activeMembers?: number
  todayPosts?: number
  planetPosts?: number
  homeItems?: Array<{ tag?: string; text?: string }>
}>({})

const featureModules = useFeatureModulesStore()

const planetPlanDialogVisible = ref(false)
const planetPlanSubmitting = ref(false)
const editingPlanetId = ref('')
const editingPlanetPlanId = ref<number | null>(null)
const planetPlanForm = reactive({
  name: '',
  description: '',
  sortOrder: 0,
  statusBool: true,
})

async function loadPlanetPlans(planetId: string) {
  if (!planetId) return
  planetPlansLoading[planetId] = true
  try {
    const res = await getMembershipPlanList({ scope: 'planet', planetId })
    planetPlansMap[planetId] = res.data || []
  } catch {
    planetPlansMap[planetId] = []
  } finally {
    planetPlansLoading[planetId] = false
  }
}

async function loadAllPlanetPlans() {
  const ids = [...new Set(communities.value.map((c) => c.id).filter(Boolean))]
  await Promise.all(ids.map((id) => loadPlanetPlans(id)))
}

function openPlanetPlanDialog(planetId: string, row?: MembershipPlan) {
  if (!planetId) {
    ElMessage.warning('请先填写社区 ID')
    return
  }
  editingPlanetId.value = planetId
  editingPlanetPlanId.value = row?.id ?? null
  planetPlanForm.name = row?.name || ''
  planetPlanForm.description = row?.description || ''
  planetPlanForm.sortOrder = row?.sortOrder ?? 0
  planetPlanForm.statusBool = row ? row.status === 1 : true
  planetPlanDialogVisible.value = true
}

function resetPlanetPlanForm() {
  planetPlanForm.name = ''
  planetPlanForm.description = ''
  planetPlanForm.sortOrder = 0
  planetPlanForm.statusBool = true
  editingPlanetPlanId.value = null
}

async function handlePlanetPlanSubmit() {
  if (!planetPlanForm.name.trim()) {
    ElMessage.warning('请填写档位名称')
    return
  }
  planetPlanSubmitting.value = true
  try {
    const payload = {
      scope: 'planet' as const,
      planetId: editingPlanetId.value,
      name: planetPlanForm.name.trim(),
      description: planetPlanForm.description || undefined,
      giftPlanetDays: 0,
      sortOrder: planetPlanForm.sortOrder,
      status: planetPlanForm.statusBool ? 1 : 0,
    }
    if (editingPlanetPlanId.value != null) {
      await updateMembershipPlan(editingPlanetPlanId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createMembershipPlan(payload)
      ElMessage.success('创建成功')
    }
    planetPlanDialogVisible.value = false
    await loadPlanetPlans(editingPlanetId.value)
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    planetPlanSubmitting.value = false
  }
}

async function handleDeletePlanetPlan(planetId: string, row: MembershipPlan) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」？`, '删除确认', { type: 'warning' })
    await deleteMembershipPlan(row.id)
    ElMessage.success('已删除')
    await loadPlanetPlans(planetId)
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e?.message || '删除失败')
  }
}

function normalizeCommunities(rows: any[], fallbackTitle?: string, fallbackSubtitle?: string, fallbackCover?: string): CommunityRow[] {
  const mapped = rows.map((c: any, idx: number) => ({
    id: c.id || '',
    title: c.title || '',
    subtitle: c.subtitle || '',
    emoji: c.emoji || '🪐',
    cover: c.cover || '',
    intro: c.intro || '',
    ctaText: c.ctaText || '加入星球',
    joinHint: c.joinHint || '',
    primary: !!c.primary,
    enabled: c.enabled !== false,
    sortOrder: Number(c.sortOrder ?? idx),
    highlights: Array.isArray(c.highlights)
      ? c.highlights.map((h: any) => ({
          icon: h.icon || '✨',
          title: h.title || '',
          desc: h.desc || '',
        }))
      : [],
  }))
  mapped.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  if (!mapped.some((c) => c.primary) && mapped.length) {
    mapped[0].primary = true
  }
  if (!mapped.length) {
    return [{
      id: 'warm-main',
      title: fallbackTitle || '主社区',
      subtitle: fallbackSubtitle || '',
      emoji: '🪐',
      cover: fallbackCover || '',
      intro: '',
      ctaText: '加入星球',
      joinHint: '加入后可提问 · 看精华 · 下资料',
      primary: true,
      enabled: true,
      sortOrder: 0,
      highlights: [
        { icon: '💬', title: '提问必达', desc: '星主与编辑轮流答疑' },
        { icon: '⭐', title: '精华沉淀', desc: '每周精选方法论' },
        { icon: '📂', title: '资料库', desc: '模板与案例随手可下' },
      ],
    }]
  }
  return mapped
}

async function load() {
  loading.value = true
  try {
    await featureModules.load()
    moduleEnabled.value = featureModules.isEnabled('planet')
    const res = await get<any>('/api/v1/admin/planet/config')
    const data = (res as any)?.data ?? res
    if (data) {
      form.title = data.title || form.title
      form.subtitle = data.subtitle || ''
      form.coverImage = data.coverImage || ''
      form.unpaidViewMode = data.unpaidViewMode || 'summary'
      form.previewCount = data.previewCount ?? 3
      form.entryLabel = data.entryLabel || '星球'
      const topics = data.topics as any
      if (topics && typeof topics === 'object') {
        topicsForm.title = topics.title || topicsForm.title
        topicsForm.note = topics.note || ''
        topicsForm.items = Array.isArray(topics.items) ? topics.items.map((t: any) => ({
          name: t.name || '',
          width: Number(t.width ?? 50),
          pct: t.pct || '',
        })) : []
      }
      packages.value = data.packages || []
      if (typeof data.enabled === 'boolean') moduleEnabled.value = data.enabled
      communities.value = normalizeCommunities(
        Array.isArray(data.communities) ? data.communities : [],
        data.title,
        data.subtitle,
        data.coverImage,
      )
      const ops = data.ops as any
      if (ops && typeof ops === 'object') {
        opsForm.homeCardTitle = ops.homeCardTitle || opsForm.homeCardTitle
        opsForm.membersMode = ops.membersMode === 'manual' ? 'manual' : 'auto'
        opsForm.todayMode = ops.todayMode === 'manual' ? 'manual' : 'auto'
        opsForm.postsMode = ops.postsMode === 'manual' ? 'manual' : 'auto'
        opsForm.itemsMode = ops.itemsMode === 'manual' ? 'manual' : 'auto'
        opsForm.kpiMembers = ops.kpiMembers || opsForm.kpiMembers
        opsForm.kpiPosts = ops.kpiPosts || opsForm.kpiPosts
        opsForm.kpiTodayFeed = ops.kpiTodayFeed || ops.kpiQuestions || opsForm.kpiTodayFeed
        opsForm.kpiQuestions = ops.kpiQuestions || opsForm.kpiQuestions
        opsForm.membersTemplate = ops.membersTemplate || opsForm.membersTemplate
        opsForm.ctaTemplate = ops.ctaTemplate || opsForm.ctaTemplate
        if (Array.isArray(ops.homeItems) && ops.homeItems.length) {
          opsForm.homeItems = ops.homeItems.map((it: any) => ({
            tag: it.tag || '',
            text: it.text || '',
          }))
          while (opsForm.homeItems.length < 3) {
            opsForm.homeItems.push({ tag: '', text: '' })
          }
        }
        opsForm.checkInEnabled = ops.checkInEnabled !== false
        const live = ops.liveStats || {}
        liveStats.activeMembers = live.activeMembers
        liveStats.todayPosts = live.todayPosts
        liveStats.planetPosts = live.planetPosts
        liveStats.homeItems = Array.isArray(live.homeItems) ? live.homeItems : []
      }
    }
    await loadAllPlanetPlans()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function syncSortOrdersFromIndex() {
  communities.value.forEach((c, idx) => {
    c.sortOrder = idx
  })
}

async function handleSave() {
  if (!communities.value.length) {
    ElMessage.warning('请至少保留一个社区')
    return
  }
  const ids = communities.value.map((c) => (c.id || '').trim()).filter(Boolean)
  if (ids.length !== communities.value.length) {
    ElMessage.warning('每个社区都需要填写社区 ID')
    return
  }
  if (new Set(ids).size !== ids.length) {
    ElMessage.warning('社区 ID 不能重复')
    return
  }
  if (!communities.value.some((c) => c.primary)) {
    communities.value[0].primary = true
  }
  syncSortOrdersFromIndex()
  saving.value = true
  try {
    const opsPayload = {
      ...opsForm,
      kpiQuestions: opsForm.kpiTodayFeed || opsForm.kpiQuestions,
    }
    await put('/api/v1/admin/planet/config', {
      ...form,
      topics: { ...topicsForm },
      ops: opsPayload,
      communities: communities.value.map((c) => ({
        id: c.id.trim(),
        title: c.title,
        subtitle: c.subtitle,
        emoji: c.emoji,
        cover: c.cover,
        intro: c.intro,
        ctaText: c.ctaText,
        joinHint: c.joinHint,
        primary: !!c.primary,
        enabled: c.enabled !== false,
        sortOrder: Number(c.sortOrder ?? 0),
        joined: true,
        highlights: (c.highlights || []).filter((h) => h.title || h.desc),
        feedUrl: `/pages/planet-feed/planet-feed?planetId=${encodeURIComponent(c.id || 'warm-main')}`,
        homeUrl: '/pages/planet/planet',
        introUrl: `/pages/planet-intro/planet-intro?planetId=${encodeURIComponent(c.id || 'warm-main')}`,
        membersLabel: '',
        todayLabel: '',
      })),
    })
    ElMessage.success('已保存')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onToggleModule(val: boolean) {
  try {
    await featureModules.setEnabled('planet', val)
    ElMessage.success(val ? '社区模块已开启' : '社区模块已关闭')
  } catch (e: any) {
    moduleEnabled.value = !val
    ElMessage.error(e?.message || '切换失败')
  }
}

function goCreatePackage() {
  router.push({ path: '/product/edit', query: { type: 'membership' } })
}

function addHighlight(ci: number) {
  const c = communities.value[ci]
  if (!c) return
  if (!c.highlights) c.highlights = []
  c.highlights.push({ icon: '✨', title: '', desc: '' })
}

function setPrimary(ci: number, val: boolean) {
  if (!val) {
    // 至少保留一个主社区
    const others = communities.value.filter((_, i) => i !== ci)
    if (!others.some((c) => c.primary)) {
      ElMessage.warning('请至少保留一个默认展示/主社区')
      return
    }
    communities.value[ci].primary = false
    return
  }
  communities.value.forEach((c, i) => {
    c.primary = i === ci
  })
}

function moveCommunity(ci: number, delta: number) {
  const next = ci + delta
  if (next < 0 || next >= communities.value.length) return
  const list = [...communities.value]
  const [row] = list.splice(ci, 1)
  list.splice(next, 0, row)
  communities.value = list
  syncSortOrdersFromIndex()
}

function removeCommunity(ci: number) {
  if (communities.value.length <= 1) return
  const wasPrimary = !!communities.value[ci]?.primary
  communities.value.splice(ci, 1)
  if (wasPrimary && communities.value.length) {
    communities.value[0].primary = true
  }
  syncSortOrdersFromIndex()
}

function addCommunity() {
  const idx = communities.value.length
  communities.value.push({
    id: `community_${Date.now().toString(36)}`,
    title: '新社区',
    subtitle: '',
    emoji: '🪐',
    cover: '',
    intro: '',
    ctaText: '加入星球',
    joinHint: '加入后可提问 · 看精华 · 下资料',
    primary: false,
    enabled: true,
    sortOrder: idx,
    highlights: [
      { icon: '💬', title: '', desc: '' },
      { icon: '⭐', title: '', desc: '' },
    ],
  })
}

onMounted(load)
</script>

<style scoped>
.planet-page { padding: 8px 4px 24px; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.page-head h2 { margin: 0 0 6px; font-size: 20px; }
.page-head p { margin: 0; color: #909399; font-size: 13px; max-width: 640px; }
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
.planet-form { max-width: 720px; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar-desc { color: #909399; font-size: 13px; }
.communities-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.topic-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.live-items { display: flex; flex-direction: column; gap: 8px; }
.live-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #606266; }
.community-card {
  margin-bottom: 16px;
  padding: 16px 18px 8px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  background: var(--el-bg-color, #fff);
}
.community-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.hl-list { width: 100%; }
.hl-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.planet-plans { margin: 8px 0 16px; }
.planet-plans__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
