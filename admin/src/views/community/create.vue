<template>
  <div class="mw-page community-create">
    <!-- 面包屑 -->
    <div class="crumb">
      <router-link to="/community/list" class="crumb-link">社区列表</router-link>
      <span class="crumb-sep">/</span>
      <span class="crumb-cur">新建社区</span>
    </div>

    <!-- 步骤条 -->
    <div class="steps-bar">
      <div v-for="(s, i) in STEPS" :key="i" class="step" :class="{ active: step === i, done: step > i }" @click="goto(i)">
        <span class="step-no">{{ i < step ? '✓' : i + 1 }}</span>
        <span class="step-label">{{ s.label }}</span>
      </div>
    </div>

    <div class="create-body">
      <!-- 左侧表单 -->
      <div class="create-form">
        <!-- Step 0 选择模板 -->
        <div v-if="step === 0" class="step-panel">
          <h3 class="panel-title">选择模板</h3>
          <p class="panel-hint">从预设模板一键生成社区基础信息与亮点卖点，选中后仍可在后续步骤自由修改；也可以从空白开始。</p>
          <div class="tpl-grid">
            <div
              v-for="t in TEMPLATES"
              :key="t.key"
              class="tpl-card"
              :class="{ on: pickedTpl === t.key }"
              @click="applyTemplate(t)"
            >
              <div class="tpl-head">
                <span class="tpl-emoji">{{ t.emoji }}</span>
                <span class="tpl-name">{{ t.name }}</span>
                <span v-if="pickedTpl === t.key" class="tpl-check">✓</span>
              </div>
              <p class="tpl-desc">{{ t.desc }}</p>
              <div class="tpl-chips">
                <span v-for="h in t.highlights" :key="h.title" class="tpl-chip">{{ h.icon }} {{ h.title }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 1 基础信息 -->
        <div v-if="step === 1" class="step-panel">
          <h3 class="panel-title">基础信息</h3>
          <p class="panel-hint">填写社区的基本展示信息，这些会显示在小程序社区卡片上。</p>
          <div class="form-grid">
            <label class="fld">
              <span class="fld-label">社区名称 <em>*</em></span>
              <input v-model="form.name" class="inp" placeholder="如：跨境财税交流星球" maxlength="20" />
            </label>
            <label class="fld">
              <span class="fld-label">副标题</span>
              <input v-model="form.sub" class="inp" placeholder="一句话描述社区定位" maxlength="30" />
            </label>
            <label class="fld fld-emoji">
              <span class="fld-label">标志 emoji</span>
              <div class="emoji-row">
                <input v-model="form.emoji" class="inp inp-emoji" placeholder="🪐" maxlength="4" />
                <div class="emoji-pick">
                  <button v-for="e in EMOJI_PRESETS" :key="e" type="button" class="emoji-btn" @click="form.emoji = e">{{ e }}</button>
                </div>
              </div>
            </label>
            <label class="fld">
              <span class="fld-label">封面色</span>
              <div class="tone-row">
                <button v-for="c in COMMUNITY_TONES" :key="c" type="button" class="tone-btn" :class="{ on: form.cover === c }" :style="{ background: c }" @click="form.cover = c"></button>
              </div>
            </label>
            <label class="fld fld-wide">
              <span class="fld-label">社区介绍</span>
              <textarea v-model="form.intro" class="inp inp-area" rows="3" placeholder="详细介绍社区的内容方向、适合人群、加入价值" maxlength="200"></textarea>
              <span class="fld-count">{{ form.intro.length }}/200</span>
            </label>
          </div>
        </div>

        <!-- Step 2 入场设置 -->
        <div v-if="step === 2" class="step-panel">
          <h3 class="panel-title">入场设置</h3>
          <p class="panel-hint">配置用户加入社区的入口和引导信息。</p>
          <div class="form-grid">
            <label class="fld">
              <span class="fld-label">主按钮文案</span>
              <input v-model="form.btn" class="inp" placeholder="加入星球" maxlength="10" />
            </label>
            <label class="fld">
              <span class="fld-label">加入提示语</span>
              <input v-model="form.joinHint" class="inp" placeholder="如：加入后可参与打卡、阅读专享资料" maxlength="40" />
            </label>
            <label class="fld">
              <span class="fld-label">介绍页 URL</span>
              <input v-model="form.introUrl" class="inp" placeholder="/pages/intro/index?id=xxx 或 https://..." />
            </label>
            <label class="fld">
              <span class="fld-label">信息流 URL</span>
              <input v-model="form.feedUrl" class="inp" placeholder="/pages/planet/feed?id=xxx" />
            </label>
            <label class="fld">
              <span class="fld-label">主页 URL</span>
              <input v-model="form.homeUrl" class="inp" placeholder="/pages/planet/home?id=xxx" />
            </label>
            <label class="fld">
              <span class="fld-label">排序权重</span>
              <input v-model.number="form.sortOrder" class="inp" type="number" min="0" placeholder="数字越小越靠前" />
            </label>
          </div>
        </div>

        <!-- Step 3 亮点卖点 -->
        <div v-if="step === 3" class="step-panel">
          <h3 class="panel-title">亮点与卖点</h3>
          <p class="panel-hint">添加 1-6 条核心亮点，展示社区的独特价值（图标 + 标题 + 描述）。</p>
          <div class="highlights-editor">
            <div v-for="(h, i) in form.highlights" :key="i" class="hl-row">
              <div class="hl-emoji">
                <input v-model="h.icon" class="inp inp-emoji-sm" maxlength="4" />
                <div class="hl-emoji-pick">
                  <button v-for="e in HIGHLIGHT_ICON_PRESETS" :key="e" type="button" class="emoji-btn-sm" @click="h.icon = e">{{ e }}</button>
                </div>
              </div>
              <input v-model="h.title" class="inp hl-title" placeholder="亮点标题（如：每日财税早报）" maxlength="15" />
              <input v-model="h.desc" class="inp hl-desc" placeholder="一句话描述" maxlength="40" />
              <button type="button" class="btn-del" @click="form.highlights.splice(i, 1)">✕</button>
            </div>
            <button v-if="form.highlights.length < 6" type="button" class="btn-add-hl" @click="form.highlights.push({ icon: '✦', title: '', desc: '' })">+ 添加亮点</button>
          </div>
        </div>

        <!-- Step 4 会员档绑定 -->
        <div v-if="step === 4" class="step-panel">
          <h3 class="panel-title">会员档绑定</h3>
          <p class="panel-hint">为社区配置付费会员档（scope=planet）。用户购买后获得本社区访问权限。可跳过后续在「会员配置」页设置。</p>

          <div class="bind-mode-row">
            <label class="bind-mode" :class="{ on: bindMode === 'existing' }">
              <input type="radio" value="existing" v-model="bindMode" />
              <span>绑定现有会员档</span>
            </label>
            <label v-if="activePreset" class="bind-mode" :class="{ on: bindMode === 'create' }">
              <input type="radio" value="create" v-model="bindMode" />
              <span>按「{{ pickedTplName }}」模板快速新建档</span>
            </label>
          </div>
          <p v-if="!activePreset && pickedTpl === 'interest'" class="tpl-note">☕ 轻量兴趣圈建议免费开放，不设付费档；也可以绑定现有档位作为进阶身份。</p>

          <div v-if="loadingPlans" class="loading-hint">加载会员档中...</div>
          <div v-else-if="bindMode === 'create' && activePreset" class="preset-editor">
            <div class="preset-head">
              <span class="preset-tag">模板预设</span>
              <span class="preset-hint">名称与权益已按模板填好，可自由修改</span>
            </div>
            <div class="form-grid">
              <label class="fld">
                <span class="fld-label">档位名称 <em>*</em></span>
                <input v-model="newPlan.name" class="inp" maxlength="20" placeholder="如：知识星球会员" />
              </label>
              <label class="fld">
                <span class="fld-label">档位描述</span>
                <input v-model="newPlan.description" class="inp" maxlength="50" placeholder="一句话说明会员价值" />
              </label>
              <label class="fld fld-wide">
                <span class="fld-label">会员权益（{{ newPlan.rights.length }} 项）</span>
                <div class="rights-editor">
                  <span v-for="(r, i) in newPlan.rights" :key="i" class="right-chip">
                    {{ r }}
                    <button type="button" class="chip-del" @click="newPlan.rights.splice(i, 1)">✕</button>
                  </span>
                  <input
                    v-model="newRightInput"
                    class="inp inp-right-add"
                    placeholder="输入权益后回车添加"
                    maxlength="20"
                    @keydown.enter.prevent="addRight"
                  />
                </div>
              </label>
            </div>
            <p class="tpl-note">创建社区后将同步创建该会员档并绑定到本社区，价格等商业参数稍后在「会员配置」页设置。</p>
          </div>
          <div v-else>
            <div v-if="planetPlans.length" class="plan-list">
              <label v-for="p in planetPlans" :key="p.id" class="plan-opt" :class="{ on: boundPlanIds.includes(p.id) }">
                <input type="checkbox" :value="p.id" v-model="boundPlanIds" />
                <div class="plan-info">
                  <span class="plan-name">{{ p.name }}</span>
                  <span class="plan-desc">{{ p.description || '无描述' }}</span>
                  <span class="plan-meta">{{ p.rights?.length || 0 }} 项权益 · {{ p.status === 1 ? '启用中' : '已停用' }}</span>
                </div>
              </label>
            </div>
            <div v-else class="empty-hint">
              暂无 scope=planet 的会员档。
              <router-link to="/community/list" class="link">返回列表</router-link>
              后在「会员配置」页创建。
            </div>
            <div class="skip-row">
              <label class="chk"><input type="checkbox" v-model="skipBind" /> 跳过，稍后在「会员配置」页设置</label>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧实时预览 -->
      <div class="create-preview">
        <div class="preview-tag">小程序端预览</div>
        <div class="phone-card">
          <div class="phone-cover" :style="{ background: form.cover || COMMUNITY_TONES[0] }">
            <span class="phone-emoji">{{ form.emoji || '🪐' }}</span>
          </div>
          <div class="phone-body">
            <div class="phone-name">{{ form.name || '社区名称' }}</div>
            <div class="phone-sub">{{ form.sub || '社区副标题' }}</div>
            <div class="phone-intro">{{ form.intro || '社区介绍会显示在这里...' }}</div>
            <div v-if="form.highlights.length" class="phone-hls">
              <div v-for="(h, i) in form.highlights" :key="i" class="phone-hl">
                <span class="phone-hl-icon">{{ h.icon || '✦' }}</span>
                <div>
                  <div class="phone-hl-title">{{ h.title || '亮点标题' }}</div>
                  <div class="phone-hl-desc">{{ h.desc || '亮点描述' }}</div>
                </div>
              </div>
            </div>
            <div v-if="form.joinHint" class="phone-hint">{{ form.joinHint }}</div>
            <button class="phone-btn">{{ form.btn || '加入星球' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="create-footer">
      <button class="btn-ghost" @click="$router.push('/community/list')">取消</button>
      <div class="footer-right">
        <button v-if="step > 0" class="btn-ghost" @click="step--">上一步</button>
        <button v-if="step < 4" class="btn-primary" :disabled="!canNext" @click="next">下一步</button>
        <button v-if="step === 4" class="btn-primary" :disabled="saving" @click="save">{{ saving ? '保存中...' : '创建社区' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  COMMUNITY_TONES, HIGHLIGHT_ICON_PRESETS, fetchPlanetConfig, buildPlanetSavePayload,
  newCommunityId, type Highlight,
} from './planet-config'
import { getMembershipPlanList, createMembershipPlan, type MembershipPlan } from '@/api/membershipPlan'

const router = useRouter()

const STEPS = [
  { label: '选择模板' },
  { label: '基础信息' },
  { label: '入场设置' },
  { label: '亮点卖点' },
  { label: '会员档绑定' },
]
const EMOJI_PRESETS = ['🪐', '🌍', '🌟', '📚', '💎', '🔥', '🎯', '🚀', '☕', '🌙']

/** 社区模板：预填基础信息 + 亮点卖点，选中后可继续修改 */
interface CommunityPlanPreset {
  name: string
  description: string
  rights: string[]
}
interface CommunityTemplate {
  key: string
  name: string
  desc: string
  emoji: string
  cover: string
  sub: string
  intro: string
  btn: string
  joinHint: string
  highlights: Highlight[]
  /** 付费档预设；为空表示该模板建议免费开放（如轻量兴趣圈） */
  planPreset?: CommunityPlanPreset
}
const TEMPLATES: CommunityTemplate[] = [
  {
    key: 'blank',
    name: '空白社区',
    desc: '从零开始，全部字段自己填写。',
    emoji: '🪐',
    cover: COMMUNITY_TONES[0],
    sub: '',
    intro: '',
    btn: '加入星球',
    joinHint: '',
    highlights: [],
  },
  {
    key: 'knowledge',
    name: '知识付费星球',
    desc: '内容 + 资料为核心卖点的付费星球，适合财税/行业知识社区。',
    emoji: '📚',
    cover: COMMUNITY_TONES[1] ?? COMMUNITY_TONES[0],
    sub: '行业知识 · 干货资料 · 每日更新',
    intro: '汇聚行业干货与实战资料，每日早报同步最新动态。加入即享专属内容阅读与资料库下载权益，与同行一起高效成长。',
    btn: '加入星球',
    joinHint: '加入后可阅读专享内容、下载资料库文件',
    highlights: [
      { icon: '📰', title: '每日早报', desc: '每天 1 篇行业动态速览' },
      { icon: '📝', title: '专属内容', desc: '会员专享深度文章与解读' },
      { icon: '📚', title: '资料库访问', desc: '成套资料、模板、清单随时下载' },
      { icon: '🏆', title: '成长加速', desc: '体系化学习路径与进阶指南' },
    ],
    planPreset: {
      name: '知识星球会员',
      description: '解锁专属内容阅读与资料库下载',
      rights: ['每日早报推送', '会员专属内容阅读', '资料库文件下载', '体系化成长路径'],
    },
  },
  {
    key: 'bootcamp',
    name: '打卡训练营',
    desc: '以打卡、作业、督导为主的训练营社区，适合短期高强度陪伴。',
    emoji: '🎯',
    cover: COMMUNITY_TONES[2] ?? COMMUNITY_TONES[0],
    sub: '每日打卡 · 作业点评 · 全程督导',
    intro: '一期一会的陪伴式训练营：每日打卡养成习惯，作业逐份点评，疑问优先解答。和同路人互相见证，坚持到结营。',
    btn: '加入训练营',
    joinHint: '加入后可参与每日打卡、提交作业并获得点评',
    highlights: [
      { icon: '🔥', title: '每日打卡', desc: '连续打卡记录，断签提醒' },
      { icon: '✍️', title: '作业点评', desc: '每份作业人工逐条点评' },
      { icon: '💬', title: '优先答疑', desc: '提问置顶响应，讲师直接回复' },
      { icon: '🏅', title: '结营奖励', desc: '完成全部任务解锁结营证书' },
    ],
    planPreset: {
      name: '训练营学员',
      description: '全程打卡督导陪伴，作业逐份点评',
      rights: ['每日打卡', '作业逐份点评', '提问优先答疑', '结营证书'],
    },
  },
  {
    key: 'vip',
    name: '会员专属社群',
    desc: '围绕付费会员权益的私享社群，适合商城/品牌会员运营。',
    emoji: '💎',
    cover: COMMUNITY_TONES[3] ?? COMMUNITY_TONES[0],
    sub: '会员专享 · 权益兑换 · 专属服务',
    intro: '面向正式会员的私享社群：专属角标与身份标识，商城专属折扣、生日礼包、线下活动优先报名，1v1 专属咨询服务。',
    btn: '加入会员社群',
    joinHint: '正式会员专享，加入后解锁全部会员权益',
    highlights: [
      { icon: '🛍️', title: '商城折扣', desc: '会员专享价格与限时折扣' },
      { icon: '🎁', title: '生日礼包', desc: '生日月专属礼物与祝福' },
      { icon: '⭐', title: '专属角标', desc: '评论与动态展示会员身份' },
      { icon: '🤝', title: '1v1 咨询', desc: '专属顾问一对一咨询服务' },
    ],
    planPreset: {
      name: 'VIP 会员',
      description: '会员专享折扣、礼包与专属服务',
      rights: ['商城专属折扣', '生日礼包', '专属会员角标', '1v1 专属咨询'],
    },
  },
  {
    key: 'interest',
    name: '轻量兴趣圈',
    desc: '免费加入的轻量交流圈，靠发帖与资讯维持活跃，适合引流与拉新。',
    emoji: '☕',
    cover: COMMUNITY_TONES[4] ?? COMMUNITY_TONES[0],
    sub: '免费加入 · 随聊随看',
    intro: '一个轻松的交流圈子：聊聊行业见闻、分享一手资讯，每周精选内容推送。免费加入，先感受氛围再决定要不要深入。',
    btn: '加入圈子',
    joinHint: '免费加入，发帖与资讯查看无门槛',
    highlights: [
      { icon: '💬', title: '自由发帖', desc: '话题不限，随时开聊' },
      { icon: '📮', title: '每周资讯', desc: '每周精选内容汇总推送' },
      { icon: '🎨', title: '活动互助', desc: '线下活动与资源互换信息' },
    ],
  },
]

const step = ref(0)
const saving = ref(false)
const loadingPlans = ref(false)
const planetPlans = ref<MembershipPlan[]>([])
const boundPlanIds = ref<number[]>([])
const skipBind = ref(false)
const planetConfig = ref<any>({})
const pickedTpl = ref<string>('')
const bindMode = ref<'existing' | 'create'>('existing')
const newPlan = ref({ name: '', description: '', rights: [] as string[] })
const newRightInput = ref('')

const activePreset = computed(() => TEMPLATES.find((t) => t.key === pickedTpl.value)?.planPreset)
const pickedTplName = computed(() => TEMPLATES.find((t) => t.key === pickedTpl.value)?.name || '')

function addRight() {
  const v = newRightInput.value.trim()
  if (!v) return
  if (!newPlan.value.rights.includes(v)) newPlan.value.rights.push(v)
  newRightInput.value = ''
}

const form = ref({
  name: '',
  sub: '',
  emoji: '🪐',
  cover: COMMUNITY_TONES[0],
  intro: '',
  btn: '加入星球',
  joinHint: '',
  introUrl: '',
  feedUrl: '',
  homeUrl: '',
  sortOrder: 99,
  highlights: [] as Highlight[],
})

const canNext = computed(() => {
  if (step.value === 1) return form.value.name.trim().length >= 2
  return true
})

/** 应用模板：预填表单（覆盖当前值），并标记选中 */
function applyTemplate(t: CommunityTemplate) {
  pickedTpl.value = t.key
  form.value.emoji = t.emoji
  form.value.cover = t.cover
  form.value.sub = t.sub
  form.value.intro = t.intro
  form.value.btn = t.btn
  form.value.joinHint = t.joinHint
  form.value.highlights = t.highlights.map((h) => ({ ...h }))
  if (t.key !== 'blank') form.value.name = form.value.name.trim() || t.name.replace(/星球|训练营|社群|圈子/, '')
  // 会员档预设联动：有预设默认走「快速新建档」
  if (t.planPreset) {
    bindMode.value = 'create'
    newPlan.value = { name: t.planPreset.name, description: t.planPreset.description, rights: [...t.planPreset.rights] }
  } else {
    bindMode.value = 'existing'
  }
}

function goto(i: number) {
  if (i <= step.value || (i === step.value + 1 && canNext.value)) step.value = i
}
function next() {
  if (!canNext.value) return
  step.value++
}

async function loadPlans() {
  loadingPlans.value = true
  try {
    const res: any = await getMembershipPlanList({ scope: 'planet' })
    planetPlans.value = res.data || []
  } finally {
    loadingPlans.value = false
  }
}

async function save() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请填写社区名称')
    step.value = 1
    return
  }
  if (bindMode.value === 'create' && !newPlan.value.name.trim()) {
    ElMessage.warning('请填写会员档名称，或切换为「绑定现有会员档」')
    step.value = 4
    return
  }
  if (bindMode.value === 'create' && !newPlan.value.rights.filter((r) => r.trim()).length) {
    ElMessage.warning('请至少添加一项会员权益')
    step.value = 4
    return
  }
  saving.value = true
  try {
    const id = newCommunityId()
    const entry: Record<string, any> = {
      id,
      title: form.value.name.trim(),
      subtitle: form.value.sub.trim(),
      intro: form.value.intro.trim(),
      cover: form.value.cover,
      emoji: form.value.emoji,
      ctaText: form.value.btn || '加入星球',
      joinHint: form.value.joinHint,
      introUrl: form.value.introUrl,
      feedUrl: form.value.feedUrl,
      homeUrl: form.value.homeUrl,
      sortOrder: form.value.sortOrder,
      enabled: true,
      primary: false,
      highlights: form.value.highlights.filter((h) => h.title.trim()),
    }
    const existing = planetConfig.value?.communities || []
    const payload = { ...planetConfig.value, communities: [...existing, entry] }
    await import('./planet-config').then((m) => m.putPlanetConfig(payload))

    if (bindMode.value === 'create') {
      // 按模板快速新建档并绑定到本社区
      if (!newPlan.value.name.trim()) {
        throw new Error('请填写会员档名称')
      }
      await createMembershipPlan({
        scope: 'planet',
        planetId: id,
        name: newPlan.value.name.trim(),
        description: newPlan.value.description.trim() || undefined,
        rights: newPlan.value.rights.filter((r) => r.trim()),
        showBadge: 1,
        expireRemindDays: 7,
        sortOrder: 50,
        status: 1,
      })
    } else if (!skipBind.value && boundPlanIds.value.length) {
      // 绑定现有会员档到本社区
      const { updateMembershipPlan } = await import('@/api/membershipPlan')
      for (const pid of boundPlanIds.value) {
        const p = planetPlans.value.find((x) => x.id === pid)
        if (p) {
          await updateMembershipPlan(pid, {
            scope: 'planet', planetId: id, name: p.name, icon: p.icon,
            description: p.description, rights: p.rights, discountRate: p.discountRate,
            giftPlanetId: p.giftPlanetId, giftPlanetDays: p.giftPlanetDays,
            showBadge: p.showBadge, expireRemindDays: p.expireRemindDays,
            sortOrder: p.sortOrder, status: p.status,
          })
        }
      }
    }

    ElMessage.success('社区创建成功')
    router.push('/community/list')
  } catch (e: any) {
    ElMessage.error('创建失败：' + (e?.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    planetConfig.value = await fetchPlanetConfig()
  } catch { /* ignore */ }
  await loadPlans()
})
</script>

<style scoped>
.community-create { padding: 20px 24px; }
.crumb { font-size: 12px; color: var(--color-text-tertiary, #999); margin-bottom: 12px; }
.crumb-link { color: #C08E6E; text-decoration: none; }
.crumb-sep { margin: 0 6px; }
.crumb-cur { color: var(--color-text-secondary, #666); }
.steps-bar { display: flex; gap: 4px; margin-bottom: 20px; background: var(--color-background-secondary, #f5f5f5); border-radius: 10px; padding: 6px; }
.step { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; cursor: pointer; flex: 1; transition: background .15s; }
.step.active { background: var(--color-background-primary, #fff); }
.step.done { opacity: .7; }
.step-no { width: 22px; height: 22px; border-radius: 50%; background: var(--color-border-tertiary, #ddd); color: var(--color-text-secondary, #666); font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: 500; }
.step.active .step-no { background: #C08E6E; color: #fff; }
.step.done .step-no { background: #3B6D11; color: #fff; }
.step-label { font-size: 13px; color: var(--color-text-secondary, #666); }
.step.active .step-label { color: var(--color-text-primary, #222); font-weight: 500; }

.create-body { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }
.create-form { background: var(--color-background-primary, #fff); border-radius: 12px; padding: 24px; border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); }
.panel-title { font-size: 16px; font-weight: 500; margin: 0 0 4px; }
.panel-hint { font-size: 13px; color: var(--color-text-tertiary, #999); margin: 0 0 20px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.fld { display: flex; flex-direction: column; gap: 6px; }
.fld-wide { grid-column: 1 / -1; }
.fld-emoji { grid-column: 1 / -1; }
.fld-label { font-size: 13px; color: var(--color-text-secondary, #666); }
.fld-label em { color: #D85A30; font-style: normal; }
.inp { padding: 8px 12px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; font-size: 13px; background: var(--color-background-primary, #fff); color: var(--color-text-primary, #222); }
.inp:focus { outline: none; border-color: #C08E6E; }
.inp-area { resize: vertical; }
.inp-emoji { width: 80px; text-align: center; font-size: 20px; }
.inp-emoji-sm { width: 50px; text-align: center; font-size: 16px; }
.fld-count { font-size: 11px; color: var(--color-text-tertiary, #aaa); text-align: right; }
.emoji-row { display: flex; align-items: center; gap: 12px; }
.emoji-pick { display: flex; gap: 4px; flex-wrap: wrap; }
.emoji-btn { width: 32px; height: 32px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 6px; background: var(--color-background-primary, #fff); cursor: pointer; font-size: 16px; }
.emoji-btn:hover { border-color: #C08E6E; }
.emoji-btn-sm { width: 26px; height: 26px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 5px; background: var(--color-background-primary, #fff); cursor: pointer; font-size: 13px; }
.tone-row { display: flex; gap: 8px; }
.tone-btn { width: 32px; height: 32px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
.tone-btn.on { border-color: #C08E6E; }

.tpl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tpl-card { border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 12px; padding: 16px; cursor: pointer; transition: border-color .15s, box-shadow .15s; display: flex; flex-direction: column; gap: 8px; }
.tpl-card:hover { border-color: #C08E6E; }
.tpl-card.on { border-color: #C08E6E; box-shadow: 0 0 0 1px #C08E6E inset; background: #FAECE7; }
.tpl-head { display: flex; align-items: center; gap: 8px; }
.tpl-emoji { font-size: 22px; }
.tpl-name { font-size: 14px; font-weight: 500; color: var(--color-text-primary, #222); flex: 1; }
.tpl-check { width: 20px; height: 20px; border-radius: 50%; background: #C08E6E; color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.tpl-desc { font-size: 12px; color: var(--color-text-secondary, #666); margin: 0; line-height: 1.5; min-height: 36px; }
.tpl-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.tpl-chip { font-size: 11px; padding: 2px 8px; background: var(--color-background-secondary, #f5f5f5); border-radius: 10px; color: var(--color-text-secondary, #666); }
.tpl-card.on .tpl-chip { background: #fff; }

.highlights-editor { display: flex; flex-direction: column; gap: 10px; }
.hl-row { display: grid; grid-template-columns: auto 1fr 1.5fr auto; gap: 8px; align-items: start; }
.hl-emoji { display: flex; flex-direction: column; gap: 4px; }
.hl-emoji-pick { display: flex; gap: 2px; flex-wrap: wrap; max-width: 120px; }
.hl-title, .hl-desc { margin-top: 0; }
.btn-del { width: 32px; height: 32px; border: none; background: transparent; color: #D85A30; cursor: pointer; font-size: 14px; border-radius: 6px; }
.btn-del:hover { background: #FAECE7; }
.btn-add-hl { align-self: flex-start; padding: 8px 16px; border: 1px dashed #C08E6E; background: transparent; color: #C08E6E; border-radius: 8px; cursor: pointer; font-size: 13px; }
.btn-add-hl:hover { background: #FAECE7; }

.plan-list { display: flex; flex-direction: column; gap: 8px; }
.bind-mode-row { display: flex; gap: 10px; margin-bottom: 16px; }
.bind-mode { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--color-text-secondary, #666); }
.bind-mode.on { border-color: #C08E6E; background: #FAECE7; color: var(--color-text-primary, #222); }
.tpl-note { font-size: 12px; color: var(--color-text-tertiary, #999); margin: 12px 0 0; line-height: 1.5; }
.preset-editor { border: 1px solid #C08E6E; border-radius: 12px; padding: 16px; background: #FFFDF9; }
.preset-head { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.preset-tag { font-size: 11px; padding: 2px 10px; background: #C08E6E; color: #fff; border-radius: 10px; }
.preset-hint { font-size: 12px; color: var(--color-text-tertiary, #999); }
.rights-editor { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.right-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 4px 10px; background: #FAEEDA; color: #854F0B; border-radius: 12px; }
.chip-del { border: none; background: transparent; color: #B06A2C; cursor: pointer; font-size: 11px; padding: 0; }
.inp-right-add { flex: 1; min-width: 160px; }
.plan-opt { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; cursor: pointer; }
.plan-opt.on { border-color: #C08E6E; background: #FAECE7; }
.plan-opt input { margin-top: 3px; }
.plan-info { display: flex; flex-direction: column; gap: 2px; }
.plan-name { font-size: 13px; font-weight: 500; }
.plan-desc { font-size: 12px; color: var(--color-text-secondary, #666); }
.plan-meta { font-size: 11px; color: var(--color-text-tertiary, #aaa); }
.skip-row { margin-top: 16px; }
.chk { font-size: 13px; color: var(--color-text-secondary, #666); display: flex; align-items: center; gap: 6px; }
.empty-hint, .loading-hint { font-size: 13px; color: var(--color-text-tertiary, #999); padding: 20px 0; text-align: center; }
.link { color: #C08E6E; }

.create-preview { position: sticky; top: 20px; align-self: start; }
.preview-tag { font-size: 12px; color: var(--color-text-tertiary, #999); margin-bottom: 8px; text-align: center; }
.phone-card { background: var(--color-background-primary, #fff); border-radius: 16px; overflow: hidden; border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); }
.phone-cover { height: 100px; display: flex; align-items: center; justify-content: center; }
.phone-emoji { font-size: 40px; }
.phone-body { padding: 16px; }
.phone-name { font-size: 15px; font-weight: 500; margin-bottom: 4px; }
.phone-sub { font-size: 12px; color: var(--color-text-secondary, #666); margin-bottom: 8px; }
.phone-intro { font-size: 12px; color: var(--color-text-tertiary, #999); line-height: 1.5; margin-bottom: 12px; }
.phone-hls { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.phone-hl { display: flex; align-items: center; gap: 8px; }
.phone-hl-icon { font-size: 16px; }
.phone-hl-title { font-size: 12px; font-weight: 500; }
.phone-hl-desc { font-size: 11px; color: var(--color-text-tertiary, #999); }
.phone-hint { font-size: 11px; color: var(--color-text-tertiary, #999); background: var(--color-background-secondary, #f5f5f5); padding: 6px 8px; border-radius: 6px; margin-bottom: 12px; }
.phone-btn { width: 100%; padding: 10px; background: #C08E6E; color: #fff; border: none; border-radius: 20px; font-size: 13px; cursor: pointer; }

.create-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 16px 24px; background: var(--color-background-primary, #fff); border-radius: 12px; border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); }
.footer-right { display: flex; gap: 10px; }
.btn-ghost { padding: 8px 20px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--color-text-secondary, #666); }
.btn-primary { padding: 8px 20px; background: #C08E6E; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
</style>
