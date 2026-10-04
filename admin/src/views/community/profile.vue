<template>
  <div class="mw-page community-profile" v-loading="loading">
    <!-- 面包屑 -->
    <div class="crumb">
      <router-link to="/community/list" class="crumb-link">社区列表</router-link>
      <span class="crumb-sep">/</span>
      <router-link :to="`/community/overview/${activeId}`" class="crumb-link">{{ activeComm?.name || '社区' }}</router-link>
      <span class="crumb-sep">/</span>
      <span class="crumb-cur">编辑资料</span>
    </div>

    <!-- 头部 -->
    <div class="page-head">
      <div class="head-left">
        <button class="btn-back" @click="$router.push(`/community/overview/${activeId}`)">← 返回概览</button>
        <span class="head-emoji">{{ activeComm?.emoji || '🪐' }}</span>
        <h2 class="head-title">{{ activeComm?.name || '社区' }} · 资料编辑</h2>
      </div>
    </div>

    <div v-if="activeComm" class="profile-body">
      <div class="section-card">
        <h3 class="section-title">基础信息</h3>
        <div class="form-grid">
          <label class="fld"><span class="fld-label">名称 <em>*</em></span><input v-model="activeComm.name" class="inp" maxlength="20" /></label>
          <label class="fld"><span class="fld-label">副标题</span><input v-model="activeComm.sub" class="inp" maxlength="30" /></label>
          <label class="fld"><span class="fld-label">标志 emoji</span>
            <div class="emoji-row">
              <input v-model="activeComm.emoji" class="inp inp-emoji" maxlength="4" />
              <div class="emoji-pick">
                <button v-for="e in EMOJI_PRESETS" :key="e" type="button" class="emoji-btn" @click="activeComm!.emoji = e">{{ e }}</button>
              </div>
            </div>
          </label>
          <label class="fld"><span class="fld-label">封面色</span>
            <div class="tone-row">
              <button v-for="c in COMMUNITY_TONES" :key="c" type="button" class="tone-btn" :class="{ on: activeComm.cover === c }" :style="{ background: c }" @click="activeComm!.cover = c"></button>
            </div>
          </label>
          <label class="fld fld-wide"><span class="fld-label">社区介绍</span>
            <textarea v-model="activeComm.intro" class="inp inp-area" rows="3" maxlength="200"></textarea>
            <span class="fld-count">{{ (activeComm.intro || '').length }}/200</span>
          </label>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">入场设置</h3>
        <div class="form-grid">
          <label class="fld"><span class="fld-label">主按钮文案</span><input v-model="activeComm.btn" class="inp" maxlength="10" /></label>
          <label class="fld"><span class="fld-label">加入提示语</span><input v-model="joinHint" class="inp" placeholder="加入后可参与打卡" maxlength="40" /></label>
          <label class="fld"><span class="fld-label">介绍页 URL</span><input v-model="introUrl" class="inp" /></label>
          <label class="fld"><span class="fld-label">信息流 URL</span><input v-model="feedUrl" class="inp" /></label>
          <label class="fld"><span class="fld-label">主页 URL</span><input v-model="homeUrl" class="inp" /></label>
          <label class="fld"><span class="fld-label">排序权重</span><input v-model.number="sortOrder" class="inp" type="number" min="0" /></label>
        </div>
      </div>

      <div class="section-card">
        <div class="hl-head">
          <h3 class="section-title">亮点卖点</h3>
          <button v-if="highlights.length < 6" type="button" class="btn-add" @click="highlights.push({ icon: '✦', title: '', desc: '' })">+ 添加亮点</button>
        </div>
        <div v-if="!highlights.length" class="empty-hint">暂无亮点。点击右上角添加，展示社区独特价值。</div>
        <div v-for="(h, i) in highlights" :key="i" class="hl-row">
          <div class="hl-emoji-col">
            <input v-model="h.icon" class="inp inp-emoji-sm" maxlength="4" />
            <div class="hl-emoji-pick">
              <button v-for="e in HIGHLIGHT_ICON_PRESETS" :key="e" type="button" class="emoji-btn-sm" @click="h.icon = e">{{ e }}</button>
            </div>
          </div>
          <input v-model="h.title" class="inp hl-title" placeholder="亮点标题" maxlength="15" />
          <input v-model="h.desc" class="inp hl-desc" placeholder="一句话描述" maxlength="40" />
          <button type="button" class="btn-del" @click="highlights.splice(i, 1)">✕</button>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">状态控制</h3>
        <div class="status-row">
          <div class="status-item">
            <span class="status-label">展示状态</span>
            <span class="status-val" :class="activeComm.on ? 'on' : 'off'">{{ activeComm.on ? '展示中' : '已停用' }}</span>
            <button class="btn-ghost" @click="toggleEnabled">{{ activeComm.on ? '停用' : '启用' }}</button>
          </div>
          <div class="status-item">
            <span class="status-label">主社区</span>
            <span class="status-val" :class="activeComm.main ? 'main' : ''">{{ activeComm.main ? '是' : '否' }}</span>
            <button v-if="!activeComm.main" class="btn-ghost" @click="setMain">设为主社区</button>
          </div>
        </div>
      </div>

      <!-- 权益统一配置（mp_planet_benefit_config） -->
      <div class="section-card">
        <div class="hl-head">
          <h3 class="section-title">星球权益配置</h3>
          <button class="btn-add" :disabled="benefitSaving" @click="saveBenefit">{{ benefitSaving ? '保存中...' : '保存权益配置' }}</button>
        </div>
        <p class="section-hint">统一管控本星球会员「能做什么」——发帖/资源/打卡/作业权限、商城折扣、每日限额。档位管「卖什么」，本配置管「买了能干啥」。</p>
        <div v-if="benefitLoaded" class="benefit-grid">
          <label class="benefit-chk" :class="{ on: !!benefit.postEnabled }">
            <input type="checkbox" :checked="!!benefit.postEnabled" @change="(e) => benefit.postEnabled = (e.target as HTMLInputElement).checked ? 1 : 0" />
            <span class="bc-icon">💬</span>
            <div class="bc-text"><b>发帖</b><span class="bc-desc">会员可在本星球发帖</span></div>
          </label>
          <label class="benefit-chk" :class="{ on: !!benefit.resourceEnabled }">
            <input type="checkbox" :checked="!!benefit.resourceEnabled" @change="(e) => benefit.resourceEnabled = (e.target as HTMLInputElement).checked ? 1 : 0" />
            <span class="bc-icon">📂</span>
            <div class="bc-text"><b>专属资源</b><span class="bc-desc">会员可访问星球专属资源</span></div>
          </label>
          <label class="benefit-chk" :class="{ on: !!benefit.checkinEnabled }">
            <input type="checkbox" :checked="!!benefit.checkinEnabled" @change="(e) => benefit.checkinEnabled = (e.target as HTMLInputElement).checked ? 1 : 0" />
            <span class="bc-icon">📅</span>
            <div class="bc-text"><b>打卡</b><span class="bc-desc">会员可参与本星球打卡</span></div>
          </label>
          <label class="benefit-chk" :class="{ on: !!benefit.homeworkEnabled }">
            <input type="checkbox" :checked="!!benefit.homeworkEnabled" @change="(e) => benefit.homeworkEnabled = (e.target as HTMLInputElement).checked ? 1 : 0" />
            <span class="bc-icon">📝</span>
            <div class="bc-text"><b>作业</b><span class="bc-desc">会员可提交作业</span></div>
          </label>
          <label class="benefit-chk" :class="{ on: !!benefit.postRequireMember }">
            <input type="checkbox" :checked="!!benefit.postRequireMember" @change="(e) => benefit.postRequireMember = (e.target as HTMLInputElement).checked ? 1 : 0" />
            <span class="bc-icon">🔒</span>
            <div class="bc-text"><b>发帖需会员</b><span class="bc-desc">关闭=登录即可发；开启=必须星球会员</span></div>
          </label>
        </div>
        <div class="form-grid" style="margin-top:14px;">
          <label class="fld"><span class="fld-label">商城折扣率（0-1，1=无折扣）</span>
            <input v-model.number="benefit.discountRate" type="number" step="0.05" min="0" max="1" class="inp" />
          </label>
          <label class="fld"><span class="fld-label">每日发帖上限（0=不限）</span>
            <input v-model.number="benefit.dailyPostLimit" type="number" min="0" class="inp" />
          </label>
          <label class="fld"><span class="fld-label">资料下载上限/日（0=不限）</span>
            <input v-model.number="benefit.resourceDownloadLimit" type="number" min="0" class="inp" />
          </label>
          <label class="fld"><span class="fld-label">权益状态</span>
            <select v-model="benefit.status" class="inp"><option :value="1">启用</option><option :value="0">停用</option></select>
          </label>
        </div>
        <div style="margin-top:10px;">
          <button class="btn-ghost btn-sm" @click="resetBenefit">重置为默认值</button>
        </div>
      </div>

      <div class="profile-foot">
        <button class="btn-ghost" @click="$router.push(`/community/overview/${activeId}`)">取消</button>
        <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存设置' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  COMMUNITY_TONES, HIGHLIGHT_ICON_PRESETS, fetchPlanetConfig, putPlanetConfig,
  normalizeCommunities, buildPlanetSavePayload, readHighlights, type CommCard, type Highlight,
} from './planet-config'
import {
  getPlanetBenefitConfig, savePlanetBenefitConfig, resetPlanetBenefitConfig,
  type PlanetBenefitConfig,
} from '@/api/planetBenefit'

const route = useRoute()
const router = useRouter()
const activeId = String(route.params.id || '')

const loading = ref(false)
const saving = ref(false)
const planetConfig = ref<any>({})
const cards = ref<CommCard[]>([])
const activeComm = ref<CommCard | null>(null)

const joinHint = ref('')
const introUrl = ref('')
const feedUrl = ref('')
const homeUrl = ref('')
const sortOrder = ref(0)
const highlights = ref<Highlight[]>([])

/* 星球权益统一配置 */
const benefitLoaded = ref(false)
const benefitSaving = ref(false)
const benefit = ref<PlanetBenefitConfig>({
  planetId: '', postEnabled: 1, resourceEnabled: 1, checkinEnabled: 1, homeworkEnabled: 1,
  discountRate: 1, dailyPostLimit: 0, resourceDownloadLimit: 0, postRequireMember: 0, status: 1,
})

const EMOJI_PRESETS = ['🪐', '🌍', '🌟', '📚', '💎', '🔥', '🎯', '🚀', '☕', '🌙']

function syncFromRaw() {
  if (!activeComm.value?.raw) return
  joinHint.value = activeComm.value.raw.joinHint || ''
  introUrl.value = activeComm.value.raw.introUrl || ''
  feedUrl.value = activeComm.value.raw.feedUrl || ''
  homeUrl.value = activeComm.value.raw.homeUrl || ''
  sortOrder.value = Number(activeComm.value.raw.sortOrder || 0)
  highlights.value = readHighlights(activeComm.value.raw)
}

async function save() {
  if (!activeComm.value) return
  if (!activeComm.value.name.trim()) { ElMessage.warning('请填写名称'); return }
  saving.value = true
  try {
    activeComm.value.raw = {
      ...activeComm.value.raw,
      joinHint: joinHint.value, introUrl: introUrl.value, feedUrl: feedUrl.value,
      homeUrl: homeUrl.value, sortOrder: sortOrder.value,
      highlights: highlights.value.filter((h) => h.title.trim()),
    }
    const payload = buildPlanetSavePayload(planetConfig.value, cards.value)
    await putPlanetConfig(payload)
    ElMessage.success('设置已保存')
    router.push(`/community/overview/${activeId}`)
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || ''))
  } finally { saving.value = false }
}

async function toggleEnabled() {
  if (!activeComm.value) return
  activeComm.value.on = !activeComm.value.on
  await save()
}
async function setMain() {
  if (!activeComm.value) return
  cards.value.forEach((c) => (c.main = c.id === activeId))
  await save()
}

onMounted(async () => {
  loading.value = true
  try {
    planetConfig.value = await fetchPlanetConfig()
    cards.value = normalizeCommunities(planetConfig.value)
    activeComm.value = cards.value.find((c) => c.id === activeId) || cards[0] || null
    if (activeComm.value) syncFromRaw()
  } finally { loading.value = false }
  // 加载星球权益配置
  if (activeId) {
    try {
      const res: any = await getPlanetBenefitConfig(activeId)
      benefit.value = res?.data || benefit.value
    } catch {
      // 接口未上线时用默认值，不阻塞页面
    } finally {
      benefitLoaded.value = true
    }
  } else {
    benefitLoaded.value = true
  }
})

async function saveBenefit() {
  if (!activeComm.value) return
  benefitSaving.value = true
  try {
    const res: any = await savePlanetBenefitConfig(activeId, { ...benefit.value, planetId: activeId })
    benefit.value = res?.data || benefit.value
    ElMessage.success('权益配置已保存')
  } catch (e: any) {
    ElMessage.error('权益配置保存失败：' + (e?.message || ''))
  } finally { benefitSaving.value = false }
}

async function resetBenefit() {
  if (!activeComm.value) return
  try {
    await ElMessageBox.confirm(`确认重置「${activeComm.value.name || activeId}」的权益配置为默认值？`, '提示', { type: 'warning' })
    await resetPlanetBenefitConfig(activeId)
    const res: any = await getPlanetBenefitConfig(activeId)
    benefit.value = res?.data || benefit.value
    ElMessage.success('已重置为默认值')
  } catch { /* cancelled or api not ready */ }
}
</script>

<style scoped>
.community-profile { padding: 20px 24px; max-width: 860px; }
.crumb { font-size: 12px; color: var(--color-text-tertiary, #999); margin-bottom: 12px; }
.crumb-link { color: #C08E6E; text-decoration: none; }
.crumb-sep { margin: 0 6px; }
.crumb-cur { color: var(--color-text-secondary, #666); }

.page-head { margin-bottom: 16px; }
.head-left { display: flex; align-items: center; gap: 12px; }
.btn-back { padding: 6px 14px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--color-text-secondary, #666); }
.head-emoji { font-size: 28px; }
.head-title { font-size: 16px; font-weight: 500; margin: 0; }

.section-card { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 18px; margin-bottom: 14px; }
.section-title { font-size: 14px; font-weight: 500; margin: 0 0 14px; }
.hl-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.hl-head .section-title { margin: 0; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.fld { display: flex; flex-direction: column; gap: 5px; }
.fld-wide { grid-column: 1 / -1; }
.fld-label { font-size: 12px; color: var(--color-text-secondary, #666); }
.fld-label em { color: #D85A30; font-style: normal; }
.inp { padding: 8px 12px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; font-size: 13px; background: var(--color-background-primary, #fff); color: var(--color-text-primary, #222); }
.inp:focus { outline: none; border-color: #C08E6E; }
.inp-area { resize: vertical; }
.inp-emoji { width: 70px; text-align: center; font-size: 18px; }
.inp-emoji-sm { width: 46px; text-align: center; font-size: 14px; }
.fld-count { font-size: 11px; color: var(--color-text-tertiary, #aaa); text-align: right; }
.emoji-row { display: flex; align-items: center; gap: 10px; }
.emoji-pick { display: flex; gap: 4px; flex-wrap: wrap; }
.emoji-btn { width: 30px; height: 30px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 6px; background: var(--color-background-primary, #fff); cursor: pointer; font-size: 15px; }
.emoji-btn:hover { border-color: #C08E6E; }
.emoji-btn-sm { width: 26px; height: 26px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 5px; background: var(--color-background-primary, #fff); cursor: pointer; font-size: 13px; }
.tone-row { display: flex; gap: 6px; }
.tone-btn { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
.tone-btn.on { border-color: #C08E6E; }

.hl-row { display: grid; grid-template-columns: auto 1fr 1.5fr auto; gap: 8px; margin-bottom: 8px; align-items: start; }
.hl-emoji-col { display: flex; flex-direction: column; gap: 4px; }
.hl-emoji-pick { display: flex; gap: 2px; flex-wrap: wrap; max-width: 110px; }
.hl-title, .hl-desc { margin-top: 0; }
.btn-del { width: 30px; height: 30px; border: none; background: transparent; color: #D85A30; cursor: pointer; font-size: 13px; border-radius: 6px; }
.btn-del:hover { background: #FAECE7; }
.btn-add { padding: 5px 12px; border: 1px dashed #C08E6E; background: transparent; color: #C08E6E; border-radius: 6px; cursor: pointer; font-size: 12px; }
.empty-hint { font-size: 13px; color: var(--color-text-tertiary, #999); padding: 12px 0; }

.status-row { display: flex; gap: 24px; }
.status-item { display: flex; align-items: center; gap: 10px; }
.status-label { font-size: 13px; color: var(--color-text-secondary, #666); }
.status-val { font-size: 13px; font-weight: 500; padding: 2px 10px; border-radius: 10px; }
.status-val.on { background: #E3F3EA; color: #0F6E56; }
.status-val.off { background: #FCEBEB; color: #A32D2D; }
.status-val.main { background: #FAEEDA; color: #854F0B; }

.profile-foot { display: flex; gap: 10px; justify-content: flex-end; }
.btn-ghost { padding: 8px 20px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; }
.btn-primary { padding: 8px 20px; background: #C08E6E; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }
.btn-primary:disabled { opacity: .5; }
.btn-sm { padding: 5px 12px; font-size: 12px; }

/* 权益配置 */
.section-hint { font-size: 12px; color: var(--color-text-tertiary, #999); margin: 4px 0 12px; line-height: 1.5; }
.benefit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.benefit-chk { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; cursor: pointer; font-size: 12px; transition: all .15s; background: var(--color-background-primary, #fff); }
.benefit-chk.on { border-color: #C08E6E; background: rgba(192,142,110,.06); }
.benefit-chk input { margin-top: 2px; }
.bc-icon { font-size: 16px; }
.bc-text { display: flex; flex-direction: column; gap: 2px; }
.bc-text b { font-size: 13px; color: var(--color-text-primary, #222); font-weight: 500; }
.bc-desc { font-size: 11px; color: var(--color-text-tertiary, #999); line-height: 1.3; }
</style>
