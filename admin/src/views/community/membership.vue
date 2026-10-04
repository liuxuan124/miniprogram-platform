<template>
  <div class="mw-page community-membership">
    <!-- 面包屑 -->
    <div class="crumb">
      <router-link to="/community/list" class="crumb-link">社区列表</router-link>
      <span class="crumb-sep">/</span>
      <router-link :to="`/community/overview/${cid}`" class="crumb-link">{{ comm.name || '社区' }}</router-link>
      <span class="crumb-sep">/</span>
      <span class="crumb-cur">会员配置</span>
    </div>

    <!-- 头部 -->
    <div class="page-head">
      <div class="head-left">
        <button class="btn-back" @click="$router.push(`/community/overview/${cid}`)">← 返回概览</button>
        <span class="head-emoji">{{ comm.emoji || '🪐' }}</span>
        <div>
          <h2 class="head-title">{{ comm.name || '社区' }} · 会员配置</h2>
          <span class="head-id">ID: {{ cid }}</span>
        </div>
      </div>
      <div class="head-right">
        <select class="inp inp-scope" :value="cid" @change="changeComm(($event.target as HTMLSelectElement).value)">
          <option v-for="c in comms" :key="c.id" :value="c.id">{{ c.emoji || '🪐' }} {{ c.name }}</option>
        </select>
        <button class="btn-primary" @click="openEditor()">+ 新建专属会员档</button>
      </div>
    </div>

    <!-- 说明条 -->
    <div class="info-bar">
      <span class="info-tag">说明</span>
      专属会员档（scope=planet）绑定到本社区，用户购买后获得本社区访问权限；平台通用档可在多个社区间复用。社区成员购买专属档后自动获得访问权。
    </div>

    <!-- 资深会员体系配置区 -->
    <div class="tier-system">
      <div class="tier-system-head">
        <div>
          <h3 class="section-title">资深会员体系</h3>
          <span class="section-hint">配置本社区的多档递进会员体系（体验/普通/资深/VIP），含价格周期与结构化资源权益。数据存本地浏览器，按社区隔离。</span>
        </div>
        <button class="btn-primary" @click="openTierEditor()">+ 新建会员档</button>
      </div>

      <!-- 体系概览 -->
      <div v-if="!tiers.length" class="empty-box">
        尚未配置会员体系。
        <button class="btn-link" @click="initTiers()">初始化默认四档</button>
      </div>
      <div v-else class="tier-grid">
        <div v-for="t in sortedTiers" :key="t.id" class="tier-card" :class="{ rec: t.recommended, disabled: !t.enabled }" :style="{ '--tier-color': t.color }">
          <div class="tier-card-head">
            <span class="tier-level">L{{ t.level }}</span>
            <span class="tier-name">{{ t.name }}</span>
            <span v-if="t.recommended" class="tier-rec">推荐</span>
            <span class="tier-status" :class="{ on: t.enabled }">{{ t.enabled ? '启用' : '停用' }}</span>
          </div>
          <p class="tier-desc">{{ t.desc || '无描述' }}</p>
          <div class="tier-prices">
            <span v-for="(p, i) in t.prices" :key="i" class="tier-price">
              <span class="price-val">¥{{ p.price }}</span>
              <span class="price-period">/{{ p.label }}</span>
              <span v-if="p.originalPrice && p.originalPrice > p.price" class="price-orig">¥{{ p.originalPrice }}</span>
            </span>
          </div>
          <div class="tier-rights">
            <span class="rights-label">权益（{{ rightsCount(t) }} 项）：</span>
            <div class="rights-icons">
              <span v-for="r in resolveRights(t.rights)" :key="r.key" class="right-icon" :title="r.label + '：' + r.desc">{{ r.icon }} {{ r.label }}</span>
              <span v-for="(cr, i) in (t.customRights || [])" :key="'c'+i" class="right-icon right-custom">+ {{ cr }}</span>
            </div>
          </div>
          <div class="tier-card-foot">
            <button class="btn-sm btn-sm-ghost" @click="openTierEditor(t)">编辑</button>
            <button class="btn-sm btn-sm-ghost" @click="duplicateTier(t)">复制</button>
            <button class="btn-sm" @click="toggleTierEnabled(t)">{{ t.enabled ? '停用' : '启用' }}</button>
            <button class="btn-sm btn-danger" @click="removeTier(t)">删除</button>
          </div>
        </div>
      </div>

      <!-- 权益对比表 -->
      <div v-if="tiers.length > 1" class="compare-section">
        <h4 class="compare-title">权益对比</h4>
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th class="ct-first">资源权益</th>
                <th v-for="t in sortedTiers" :key="t.id" class="ct-tier" :style="{ background: t.color }">{{ t.name }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in RESOURCE_RIGHTS" :key="r.key">
                <td class="ct-first"><span class="ct-icon">{{ r.icon }}</span> {{ r.label }}</td>
                <td v-for="t in sortedTiers" :key="t.id" class="ct-cell">
                  <span v-if="t.rights.includes(r.key)" class="ct-yes">✓</span>
                  <span v-else class="ct-no">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- 正式会员档（后端 CRUD） -->
    <div class="formal-plans">
      <div class="formal-head">
        <h3 class="section-title">正式会员档（后端配置）</h3>
        <span class="section-hint">绑定到本社区的 scope=planet 会员档，用户实际购买后写入 mp_member_subscription。可与上方资深体系档对应或独立。</span>
      </div>

    <!-- Tab -->
    <div class="tabs-line">
      <button class="tab-btn" :class="{ on: tab === 'planet' }" @click="tab = 'planet'">本社区专属档（{{ planetPlans.length }}）</button>
      <button class="tab-btn" :class="{ on: tab === 'platform' }" @click="tab = 'platform'">平台通用档（{{ platformPlans.length }}）</button>
    </div>

    <!-- 专属档列表 -->
    <div v-if="tab === 'planet'">
      <div v-if="loading" class="loading-hint">加载中...</div>
      <div v-else-if="!planetPlans.length" class="empty-box">
        本社区暂无专属会员档。
        <button class="btn-link" @click="openEditor()">立即创建</button>
      </div>
      <div v-else class="plan-grid">
        <div v-for="p in planetPlans" :key="p.id" class="plan-card">
          <div class="plan-card-head">
            <span class="plan-name">{{ p.name }}</span>
            <span class="plan-status" :class="{ on: p.status === 1 }">{{ p.status === 1 ? '启用中' : '已停用' }}</span>
          </div>
          <p class="plan-desc">{{ p.description || '无描述' }}</p>
          <div class="plan-rights">
            <span class="rights-label">权益（{{ p.rights?.length || 0 }} 项）：</span>
            <div v-if="p.rights?.length" class="rights-tags">
              <span v-for="(r, i) in p.rights" :key="i" class="right-tag">{{ r }}</span>
            </div>
            <span v-else class="rights-empty">无</span>
          </div>
          <div class="plan-meta-grid">
            <div v-if="p.discountRate" class="meta-item"><span class="meta-label">折扣</span><span class="meta-val">{{ p.discountRate }}%</span></div>
            <div v-if="p.giftPlanetDays" class="meta-item"><span class="meta-label">赠送天数</span><span class="meta-val">{{ p.giftPlanetDays }} 天</span></div>
            <div class="meta-item"><span class="meta-label">显示角标</span><span class="meta-val">{{ p.showBadge ? '是' : '否' }}</span></div>
            <div class="meta-item"><span class="meta-label">到期提醒</span><span class="meta-val">{{ p.expireRemindDays ? p.expireRemindDays + ' 天前' : '关闭' }}</span></div>
            <div class="meta-item"><span class="meta-label">排序</span><span class="meta-val">{{ p.sortOrder }}</span></div>
          </div>
          <div class="plan-card-foot">
            <button class="btn-sm" @click="goSubscribers(p.id)">查看订阅用户</button>
            <button class="btn-sm btn-sm-ghost" @click="openEditor(p)">编辑</button>
            <button class="btn-sm btn-danger" @click="removePlan(p)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 平台档列表 -->
    <div v-if="tab === 'platform'">
      <div v-if="loading" class="loading-hint">加载中...</div>
      <div v-else-if="!platformPlans.length" class="empty-box">暂无平台通用会员档。</div>
      <div v-else class="plan-grid">
        <div v-for="p in platformPlans" :key="p.id" class="plan-card plan-card-alt">
          <div class="plan-card-head">
            <span class="plan-name">{{ p.name }}</span>
            <span class="plan-tag">平台档</span>
          </div>
          <p class="plan-desc">{{ p.description || '无描述' }}</p>
          <div class="plan-rights">
            <span class="rights-label">权益（{{ p.rights?.length || 0 }} 项）：</span>
            <div v-if="p.rights?.length" class="rights-tags">
              <span v-for="(r, i) in p.rights" :key="i" class="right-tag">{{ r }}</span>
            </div>
          </div>
          <div class="plan-card-foot">
            <button class="btn-sm" @click="goSubscribers(p.id)">查看订阅用户</button>
            <button class="btn-sm btn-sm-ghost" @click="openEditor(p)">编辑</button>
          </div>
        </div>
      </div>
    </div>
    </div><!-- /formal-plans -->

    <!-- 资深体系档编辑弹窗 -->
    <div v-if="tierEditor.show" class="modal-mask" @click.self="tierEditor.show = false">
      <div class="modal-box modal-box-lg">
        <h3 class="modal-title">{{ tierEditor.id ? '编辑会员档（资深体系）' : '新建会员档（资深体系）' }}</h3>
        <div class="form-grid">
          <label class="fld"><span class="fld-label">档位名称 <em>*</em></span><input v-model="tierEditor.name" class="inp" placeholder="如：资深会员" maxlength="20" /></label>
          <label class="fld"><span class="fld-label">等级（1-5）</span><input v-model.number="tierEditor.level" class="inp" type="number" min="1" max="5" /></label>
          <label class="fld fld-wide"><span class="fld-label">一句话描述</span><input v-model="tierEditor.desc" class="inp" placeholder="描述这个档位的价值定位" maxlength="60" /></label>
          <label class="fld"><span class="fld-label">主题色</span><input v-model="tierEditor.color" type="color" class="inp-color" /></label>
          <label class="fld"><span class="fld-label">排序</span><input v-model.number="tierEditor.sortOrder" class="inp" type="number" min="0" /></label>
          <label class="fld"><span class="fld-label">推荐档</span><label class="chk-line"><input type="checkbox" :checked="tierEditor.recommended" @change="(e) => tierEditor.recommended = (e.target as HTMLInputElement).checked" /> 前端高亮「推荐」标签</label></label>
          <label class="fld"><span class="fld-label">启用</span><label class="chk-line"><input type="checkbox" :checked="tierEditor.enabled" @change="(e) => tierEditor.enabled = (e.target as HTMLInputElement).checked" /> 启用此档位</label></label>
        </div>

        <!-- 价格周期编辑器 -->
        <div class="sub-editor">
          <div class="sub-editor-head">
            <span class="fld-label">价格周期</span>
            <button type="button" class="btn-add-right" @click="addPrice">+ 添加价格</button>
          </div>
          <div v-for="(p, i) in tierEditor.prices" :key="i" class="price-row">
            <select v-model="p.period" class="inp inp-period">
              <option value="free">免费</option>
              <option value="month">月</option>
              <option value="quarter">季</option>
              <option value="year">年</option>
              <option value="lifetime">终身</option>
            </select>
            <input v-model="p.label" class="inp inp-label-short" placeholder="显示名" />
            <input v-model.number="p.price" class="inp inp-price" type="number" min="0" placeholder="现价" />
            <input v-model.number="p.originalPrice" class="inp inp-price" type="number" min="0" placeholder="原价（可选）" />
            <button type="button" class="btn-del" @click="tierEditor.prices.splice(i, 1)">✕</button>
          </div>
        </div>

        <!-- 资源权益勾选 -->
        <div class="sub-editor">
          <div class="sub-editor-head">
            <span class="fld-label">资源权益（勾选该档可获取的社区资源）</span>
            <span class="rights-count">已选 {{ tierEditor.rights.length }}/{{ RESOURCE_RIGHTS.length }}</span>
          </div>
          <div class="rights-check-grid">
            <label v-for="r in RESOURCE_RIGHTS" :key="r.key" class="right-check" :class="{ on: tierEditor.rights.includes(r.key) }">
              <input type="checkbox" :checked="tierEditor.rights.includes(r.key)" @change="toggleRight(r.key)" />
              <span class="rc-icon">{{ r.icon }}</span>
              <span class="rc-label">{{ r.label }}</span>
              <span class="rc-desc">{{ r.desc }}</span>
            </label>
          </div>
        </div>

        <!-- 自定义权益 -->
        <div class="sub-editor">
          <div class="sub-editor-head">
            <span class="fld-label">自定义权益（额外补充文案）</span>
            <button type="button" class="btn-add-right" @click="tierEditor.customRights.push('')">+ 添加</button>
          </div>
          <div v-for="(_, i) in tierEditor.customRights" :key="i" class="right-row">
            <input v-model="tierEditor.customRights[i]" class="inp" :placeholder="`自定义权益 ${i + 1}`" maxlength="30" />
            <button type="button" class="btn-del" @click="tierEditor.customRights.splice(i, 1)">✕</button>
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn-ghost" @click="tierEditor.show = false">取消</button>
          <button class="btn-primary" @click="saveTier">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editor.show" class="modal-mask" @click.self="editor.show = false">
      <div class="modal-box modal-box-lg">
        <h3 class="modal-title">{{ editor.id ? '编辑会员档' : '新建专属会员档' }}</h3>
        <div class="form-grid">
          <label class="fld"><span class="fld-label">名称 <em>*</em></span><input v-model="editor.name" class="inp" placeholder="如：年度会员" maxlength="20" /></label>
          <label class="fld"><span class="fld-label">排序权重</span><input v-model.number="editor.sortOrder" class="inp" type="number" min="0" /></label>
          <label class="fld fld-wide"><span class="fld-label">描述</span><input v-model="editor.description" class="inp" placeholder="一句话描述会员档价值" maxlength="60" /></label>
          <label class="fld"><span class="fld-label">折扣率（%）</span><input v-model.number="editor.discountRate" class="inp" type="number" min="0" max="100" placeholder="如 85 表示 8.5 折" /></label>
          <label class="fld"><span class="fld-label">赠送天数</span><input v-model.number="editor.giftPlanetDays" class="inp" type="number" min="0" /></label>
          <label class="fld"><span class="fld-label">到期提醒天数</span><input v-model.number="editor.expireRemindDays" class="inp" type="number" min="0" placeholder="0=关闭" /></label>
          <label class="fld"><span class="fld-label">显示会员角标</span><label class="chk-line"><input type="checkbox" :checked="editor.showBadge === 1" @change="(e) => editor.showBadge = (e.target as HTMLInputElement).checked ? 1 : 0" /> 在用户资料页显示会员角标</label></label>
          <label class="fld"><span class="fld-label">状态</span><select v-model="editor.status" class="inp"><option :value="1">启用</option><option :value="0">停用</option></select></label>
        </div>

        <!-- 通票配置（仅星球档） -->
        <div class="sub-editor">
          <div class="sub-editor-head">
            <span class="fld-label">通票适用范围</span>
            <span class="rights-count">星球档可绑定多星球打包售卖</span>
          </div>
          <div class="form-grid" style="grid-template-columns:1fr;">
            <label class="fld">
              <span class="fld-label">适用范围</span>
              <select v-model="editor.appliesTo" class="inp">
                <option value="single_planet">仅本星球（默认）</option>
                <option value="multi_planet">指定多星球（通票覆盖本星球+所选星球）</option>
                <option value="all_planets">全部星球</option>
              </select>
            </label>
            <div v-if="editor.appliesTo === 'multi_planet'" class="fld">
              <span class="fld-label">覆盖的其它星球（不含本星球）</span>
              <div class="planet-pick">
                <label v-for="c in otherPlanets" :key="c.id" class="planet-chk" :class="{ on: editor.appliesPlanets.includes(c.id) }">
                  <input type="checkbox" :checked="editor.appliesPlanets.includes(c.id)" @change="toggleApplyPlanet(c.id)" />
                  <span class="pc-emoji">{{ c.emoji || '🪐' }}</span>
                  <span class="pc-name">{{ c.name || c.id }}</span>
                </label>
                <span v-if="!otherPlanets.length" class="rights-empty-hint">暂无其它星球可勾选</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 权益编辑器 -->
        <div class="rights-editor">
          <div class="rights-editor-head">
            <span class="fld-label">权益列表</span>
            <button type="button" class="btn-add-right" @click="editor.rights.push('')">+ 添加权益</button>
          </div>
          <div v-for="(_, i) in editor.rights" :key="i" class="right-row">
            <input v-model="editor.rights[i]" class="inp" :placeholder="`权益 ${i + 1}（如：每日财税早报推送）`" maxlength="30" />
            <button type="button" class="btn-del" @click="editor.rights.splice(i, 1)">✕</button>
          </div>
          <div v-if="!editor.rights.length" class="rights-empty-hint">暂未添加权益项。点击上方按钮添加。</div>
        </div>

        <div class="modal-foot">
          <button class="btn-ghost" @click="editor.show = false">取消</button>
          <button class="btn-primary" :disabled="saving" @click="savePlan">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchPlanetConfig, normalizeCommunities, type CommCard,
  loadMembershipTiers, saveMembershipTiers, newTierId, resolveRights, rightsCount,
  RESOURCE_RIGHTS, DEFAULT_TIERS, type MembershipTier,
} from './planet-config'
import {
  getMembershipPlanList, createMembershipPlan, updateMembershipPlan, deleteMembershipPlan,
  type MembershipPlan, type MembershipPlanPayload, type MembershipAppliesTo,
} from '@/api/membershipPlan'

const route = useRoute()
const router = useRouter()
const cid = ref(String(route.params.id || ''))

const tab = ref('planet')
const loading = ref(false)
const saving = ref(false)
const comm = ref<CommCard>({} as CommCard)
const comms = ref<CommCard[]>([])
const planetPlans = ref<MembershipPlan[]>([])
const platformPlans = ref<MembershipPlan[]>([])

const editor = ref({
  show: false, id: 0, name: '', description: '', sortOrder: 0, status: 1,
  discountRate: null as number | null, giftPlanetDays: 0, showBadge: 0, expireRemindDays: 0,
  rights: [] as string[],
  appliesTo: 'single_planet' as 'single_planet' | 'multi_planet' | 'all_planets',
  appliesPlanets: [] as string[],
})

/* 资深会员体系 */
const tiers = ref<MembershipTier[]>([])
const sortedTiers = computed(() => [...tiers.value].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
const tierEditor = ref({
  show: false, id: '', name: '', level: 1, color: '#E6F1FB', desc: '',
  recommended: false, enabled: true, sortOrder: 99,
  prices: [] as { period: 'free' | 'month' | 'quarter' | 'year' | 'lifetime'; label: string; price: number; originalPrice?: number }[],
  rights: [] as string[],
  customRights: [] as string[],
})

function initTiers() {
  tiers.value = JSON.parse(JSON.stringify(DEFAULT_TIERS))
  saveMembershipTiers(cid.value, tiers.value)
  ElMessage.success('已初始化默认四档会员体系')
}

function openTierEditor(t?: MembershipTier) {
  if (t) {
    tierEditor.value = {
      show: true, id: t.id, name: t.name, level: t.level, color: t.color, desc: t.desc,
      recommended: !!t.recommended, enabled: t.enabled, sortOrder: t.sortOrder,
      prices: JSON.parse(JSON.stringify(t.prices || [])),
      rights: [...(t.rights || [])],
      customRights: [...(t.customRights || [])],
    }
  } else {
    tierEditor.value = {
      show: true, id: '', name: '', level: tiers.value.length + 1, color: '#E6F1FB',
      desc: '', recommended: false, enabled: true, sortOrder: tiers.value.length + 1,
      prices: [{ period: 'month', label: '月', price: 0 }],
      rights: [], customRights: [],
    }
  }
}

function addPrice() {
  tierEditor.value.prices.push({ period: 'month', label: '月', price: 0 })
}

function toggleRight(key: string) {
  const idx = tierEditor.value.rights.indexOf(key)
  if (idx >= 0) tierEditor.value.rights.splice(idx, 1)
  else tierEditor.value.rights.push(key)
}

function saveTier() {
  if (!tierEditor.value.name.trim()) { ElMessage.warning('请填写档位名称'); return }
  const data: MembershipTier = {
    id: tierEditor.value.id || newTierId(),
    name: tierEditor.value.name.trim(),
    level: tierEditor.value.level || 1,
    color: tierEditor.value.color,
    desc: tierEditor.value.desc.trim(),
    recommended: tierEditor.value.recommended,
    prices: tierEditor.value.prices.filter((p) => p.label.trim()) as any,
    rights: tierEditor.value.rights,
    customRights: tierEditor.value.customRights.filter((r) => r.trim()),
    enabled: tierEditor.value.enabled,
    sortOrder: tierEditor.value.sortOrder || 0,
  }
  const idx = tiers.value.findIndex((x) => x.id === data.id)
  if (idx >= 0) tiers.value[idx] = data
  else tiers.value.push(data)
  saveMembershipTiers(cid.value, tiers.value)
  tierEditor.value.show = false
  ElMessage.success(idx >= 0 ? '已更新' : '已新建')
}

function duplicateTier(t: MembershipTier) {
  const copy = JSON.parse(JSON.stringify(t))
  copy.id = newTierId()
  copy.name = t.name + ' (副本)'
  copy.sortOrder = (t.sortOrder || 0) + 1
  tiers.value.push(copy)
  saveMembershipTiers(cid.value, tiers.value)
  ElMessage.success('已复制')
}

function toggleTierEnabled(t: MembershipTier) {
  t.enabled = !t.enabled
  saveMembershipTiers(cid.value, tiers.value)
  ElMessage.success(t.enabled ? '已启用' : '已停用')
}

async function removeTier(t: MembershipTier) {
  try {
    await ElMessageBox.confirm(`确认删除会员档「${t.name}」？`, '提示', { type: 'warning' })
    tiers.value = tiers.value.filter((x) => x.id !== t.id)
    saveMembershipTiers(cid.value, tiers.value)
    ElMessage.success('已删除')
  } catch { /* cancelled */ }
}

function openEditor(p?: MembershipPlan) {
  if (p) {
    editor.value = {
      show: true, id: p.id, name: p.name, description: p.description || '', sortOrder: p.sortOrder || 0,
      status: p.status, discountRate: p.discountRate ?? null, giftPlanetDays: p.giftPlanetDays || 0,
      showBadge: p.showBadge || 0, expireRemindDays: p.expireRemindDays || 0, rights: [...(p.rights || [])],
      appliesTo: (p.appliesTo || 'single_planet') as MembershipAppliesTo,
      appliesPlanets: [...(p.appliesPlanets || [])],
    }
  } else {
    editor.value = {
      show: true, id: 0, name: '', description: '', sortOrder: 99, status: 1,
      discountRate: null, giftPlanetDays: 0, showBadge: 1, expireRemindDays: 7, rights: [],
      appliesTo: 'single_planet', appliesPlanets: [],
    }
  }
  // 如果 URL 带 edit=ID，自动打开
  if (route.query.edit) {
    const eid = Number(route.query.edit)
    const found = planetPlans.value.find((x) => x.id === eid)
    if (found && !p) openEditor(found)
  }
}

/** 通票多选：除本星球外的其它星球 */
const otherPlanets = computed(() => comms.value.filter((c) => c.id !== cid.value && c.on))

function toggleApplyPlanet(pid: string) {
  const idx = editor.value.appliesPlanets.indexOf(pid)
  if (idx >= 0) editor.value.appliesPlanets.splice(idx, 1)
  else editor.value.appliesPlanets.push(pid)
}

function goSubscribers(pid: number) {
  router.push({ path: '/member/users', query: { membershipPlan: String(pid) } })
}

async function savePlan() {
  if (!editor.value.name.trim()) { ElMessage.warning('请填写名称'); return }
  saving.value = true
  try {
    const payload: MembershipPlanPayload = {
      scope: 'planet', planetId: cid.value, name: editor.value.name.trim(),
      description: editor.value.description.trim() || undefined,
      rights: editor.value.rights.filter((r) => r.trim()),
      discountRate: editor.value.discountRate ?? undefined,
      giftPlanetDays: editor.value.giftPlanetDays || undefined,
      showBadge: editor.value.showBadge, expireRemindDays: editor.value.expireRemindDays || 0,
      sortOrder: editor.value.sortOrder || 0, status: editor.value.status,
      appliesTo: editor.value.appliesTo,
      appliesPlanets: editor.value.appliesTo === 'multi_planet' ? editor.value.appliesPlanets : [],
    }
    if (editor.value.id) {
      await updateMembershipPlan(editor.value.id, payload)
      ElMessage.success('已更新')
    } else {
      await createMembershipPlan(payload)
      ElMessage.success('已创建')
    }
    editor.value.show = false
    await reload()
  } catch (e: any) {
    ElMessage.error('保存失败：' + (e?.message || ''))
  } finally { saving.value = false }
}

async function removePlan(p: MembershipPlan) {
  try {
    await ElMessageBox.confirm(`确认删除会员档「${p.name}」？已订阅的用户不受影响但无法续费。`, '提示', { type: 'warning' })
    await deleteMembershipPlan(p.id)
    ElMessage.success('已删除')
    await reload()
  } catch { /* cancelled */ }
}

async function reload() {
  loading.value = true
  try {
    const [pr, pp] = await Promise.all([
      getMembershipPlanList({ scope: 'planet', planetId: cid.value }),
      getMembershipPlanList({ scope: 'platform' }),
    ])
    planetPlans.value = (pr as any).data || []
    platformPlans.value = (pp as any).data || []
  } finally { loading.value = false }
}

onMounted(async () => {
  try {
    const cfg = await fetchPlanetConfig()
    const cards = normalizeCommunities(cfg)
    comms.value = cards
    comm.value = cards.find((c) => c.id === cid.value) || cards[0] || ({} as CommCard)
  } catch { /* ignore */ }
  // 加载资深会员体系（本地存储，按社区隔离）
  tiers.value = loadMembershipTiers(cid.value)
  await reload()
  // URL edit 参数触发编辑
  if (route.query.edit) {
    const eid = Number(route.query.edit)
    const found = planetPlans.value.find((x) => x.id === eid)
    if (found) openEditor(found)
  }
})

/* 切换目标社区（配置页是写操作，仅单社区，不提供「全部」） */
async function changeComm(v: string) {
  if (!v || v === cid.value) return
  cid.value = v
  localStorage.setItem('community_last_id', v)
  comm.value = comms.value.find((c) => c.id === v) || ({} as CommCard)
  tiers.value = loadMembershipTiers(v)
  await reload()
  router.replace(`/community/membership/${v}`)
  ElMessage.success(`已切换到「${comm.value.name || v}」`)
}
</script>

<style scoped>
.community-membership { padding: 20px 24px; }
.head-right { display: flex; align-items: center; gap: 10px; }
.inp-scope { width: 210px; }
.crumb { font-size: 12px; color: var(--color-text-tertiary, #999); margin-bottom: 12px; }
.crumb-link { color: #C08E6E; text-decoration: none; }
.crumb-sep { margin: 0 6px; }
.crumb-cur { color: var(--color-text-secondary, #666); }
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.head-left { display: flex; align-items: center; gap: 12px; }
.btn-back { padding: 6px 14px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--color-text-secondary, #666); }
.head-emoji { font-size: 28px; }
.head-title { font-size: 16px; font-weight: 500; margin: 0; }
.head-id { font-size: 12px; color: var(--color-text-tertiary, #999); }
.btn-primary { padding: 7px 16px; background: #C08E6E; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; }

.info-bar { background: #E6EEFA; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #0C447C; margin-bottom: 16px; line-height: 1.5; }
.info-tag { background: #185FA5; color: #fff; padding: 1px 8px; border-radius: 10px; font-size: 11px; margin-right: 6px; }

.tabs-line { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); }
.tab-btn { padding: 8px 16px; border: none; background: transparent; cursor: pointer; font-size: 13px; color: var(--color-text-secondary, #666); border-bottom: 2px solid transparent; }
.tab-btn.on { color: #C08E6E; border-bottom-color: #C08E6E; }

.plan-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.plan-card { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; }
.plan-card > * { flex-shrink: 0; }
.plan-card-foot { display: flex; gap: 6px; margin-top: auto; padding-top: 12px; }
.plan-card-alt { background: var(--color-background-secondary, #f9f9f9); }
.plan-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.plan-name { font-size: 15px; font-weight: 500; }
.plan-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--color-background-tertiary, #eee); color: var(--color-text-tertiary, #999); }
.plan-status.on { background: #E3F3EA; color: #0F6E56; }
.plan-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #E6EEFA; color: #185FA5; }
.plan-desc { font-size: 12px; color: var(--color-text-secondary, #666); margin: 0 0 10px; line-height: 1.4; }
.plan-rights { margin-bottom: 0; flex: 1 0 auto; }
.rights-label { font-size: 12px; color: var(--color-text-tertiary, #999); }
.rights-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.right-tag { font-size: 11px; padding: 2px 8px; background: #FAEEDA; color: #854F0B; border-radius: 10px; }
.rights-empty { font-size: 12px; color: var(--color-text-tertiary, #aaa); }
.plan-meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.meta-item { display: flex; flex-direction: column; gap: 1px; }
.meta-label { font-size: 10px; color: var(--color-text-tertiary, #aaa); }
.meta-val { font-size: 12px; color: var(--color-text-secondary, #666); }
.btn-sm { padding: 5px 10px; border: 1px solid #C08E6E; background: #C08E6E; color: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; }
.btn-sm-ghost { background: transparent; color: #C08E6E; }
.btn-danger { background: transparent; color: #D85A30; border-color: #D85A30; }
.btn-link { background: transparent; border: none; color: #C08E6E; cursor: pointer; font-size: 13px; }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 99; }
.modal-box { background: var(--color-background-primary, #fff); border-radius: 12px; padding: 20px; width: 420px; display: flex; flex-direction: column; gap: 12px; max-height: 90vh; overflow-y: auto; }
.modal-box-lg { width: 580px; }
.modal-title { font-size: 16px; font-weight: 500; margin: 0 0 4px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fld { display: flex; flex-direction: column; gap: 4px; }
.fld-wide { grid-column: 1 / -1; }
.fld-label { font-size: 12px; color: var(--color-text-secondary, #666); }
.fld-label em { color: #D85A30; font-style: normal; }
.inp { padding: 7px 12px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; font-size: 13px; background: var(--color-background-primary, #fff); color: var(--color-text-primary, #222); }
.chk-line { font-size: 12px; color: var(--color-text-secondary, #666); display: flex; align-items: center; gap: 6px; }

.rights-editor { border-top: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); padding-top: 12px; }
.rights-editor-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.btn-add-right { padding: 4px 10px; border: 1px dashed #C08E6E; background: transparent; color: #C08E6E; border-radius: 6px; cursor: pointer; font-size: 12px; }
.right-row { display: flex; gap: 8px; margin-bottom: 6px; }
.btn-del { width: 32px; border: none; background: transparent; color: #D85A30; cursor: pointer; font-size: 14px; }
.rights-empty-hint { font-size: 12px; color: var(--color-text-tertiary, #aaa); padding: 8px 0; }

.modal-foot { display: flex; justify-content: flex-end; gap: 10px; }
.btn-ghost { padding: 7px 16px; border: 1px solid var(--color-border-tertiary, #ddd); background: transparent; border-radius: 8px; cursor: pointer; font-size: 13px; }

.empty-box, .loading-hint { padding: 30px; text-align: center; font-size: 13px; color: var(--color-text-tertiary, #999); }

/* 资深会员体系区 */
.tier-system { background: var(--color-background-primary, #fff); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.tier-system-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.section-title { font-size: 15px; font-weight: 500; margin: 0 0 4px; }
.section-hint { font-size: 12px; color: var(--color-text-tertiary, #999); }
.tier-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.tier-card { background: var(--color-background-secondary, #fafafa); border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 10px; padding: 14px; border-top: 3px solid var(--tier-color, #E6F1FB); display: flex; flex-direction: column; }
.tier-card > * { flex-shrink: 0; }
.tier-card-foot { display: flex; gap: 6px; margin-top: auto; padding-top: 10px; }
.tier-card.rec { box-shadow: 0 0 0 1px #C08E6E; }
.tier-card.disabled { opacity: .55; }
.tier-card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.tier-level { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: rgba(0,0,0,.08); color: var(--color-text-secondary, #666); font-weight: 500; }
.tier-name { font-size: 15px; font-weight: 500; flex: 1; }
.tier-rec { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: #C08E6E; color: #fff; }
.tier-status { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: var(--color-background-tertiary, #eee); color: var(--color-text-tertiary, #999); }
.tier-status.on { background: #E3F3EA; color: #0F6E56; }
.tier-desc { font-size: 12px; color: var(--color-text-secondary, #666); margin: 0 0 10px; line-height: 1.4; }
.tier-prices { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.tier-price { display: flex; align-items: baseline; gap: 2px; padding: 4px 8px; background: var(--color-background-primary, #fff); border-radius: 6px; border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); }
.price-val { font-size: 14px; font-weight: 500; color: #C08E6E; }
.price-period { font-size: 11px; color: var(--color-text-tertiary, #999); }
.price-orig { font-size: 11px; color: var(--color-text-tertiary, #aaa); text-decoration: line-through; margin-left: 4px; }
.tier-rights { margin-bottom: 0; flex: 1 0 auto; }
.rights-icons { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.right-icon { font-size: 11px; padding: 2px 8px; background: #FAEEDA; color: #854F0B; border-radius: 10px; }
.right-custom { background: #E6EEFA; color: #185FA5; }

/* 权益对比表 */
.compare-section { margin-top: 16px; }
.compare-title { font-size: 13px; font-weight: 500; margin: 0 0 8px; }
.compare-table-wrap { overflow-x: auto; border: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); border-radius: 8px; }
.compare-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.compare-table th, .compare-table td { padding: 8px 10px; text-align: center; border-bottom: 1px solid var(--color-border-tertiary, rgba(0,0,0,.06)); }
.compare-table .ct-first { text-align: left; background: var(--color-background-secondary, #f5f5f5); font-weight: 500; min-width: 120px; }
.compare-table .ct-tier { font-weight: 500; color: var(--color-text-primary, #222); }
.ct-icon { margin-right: 4px; }
.ct-yes { color: #0F6E56; font-weight: 500; }
.ct-no { color: var(--color-text-tertiary, #ccc); }

.section-divider { height: 1px; background: var(--color-border-tertiary, rgba(0,0,0,.08)); margin: 20px 0; }
.formal-plans { }
.formal-head { margin-bottom: 14px; }
.formal-head .section-title { font-size: 14px; }

/* 通票多选 */
.planet-pick { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 4px; }
.planet-chk { display: flex; align-items: center; gap: 4px; padding: 5px 10px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; cursor: pointer; font-size: 12px; background: var(--color-background-primary, #fff); transition: all .15s; }
.planet-chk.on { border-color: #C08E6E; background: rgba(192,142,110,.08); color: #C08E6E; }
.planet-chk input { margin: 0; }
.pc-emoji { font-size: 14px; }
.pc-name { font-size: 12px; }

/* 资深体系编辑弹窗 */
.inp-color { width: 48px; height: 36px; padding: 2px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 6px; cursor: pointer; background: transparent; }
.sub-editor { border-top: 1px solid var(--color-border-tertiary, rgba(0,0,0,.08)); padding-top: 12px; margin-top: 12px; }
.sub-editor-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.rights-count { font-size: 11px; color: var(--color-text-tertiary, #999); }
.price-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.inp-period { width: 80px; flex-shrink: 0; }
.inp-label-short { width: 80px; flex-shrink: 0; }
.inp-price { flex: 1; min-width: 0; }
.rights-check-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; }
.right-check { display: flex; align-items: flex-start; gap: 6px; padding: 8px 10px; border: 1px solid var(--color-border-tertiary, #ddd); border-radius: 8px; cursor: pointer; font-size: 12px; transition: all .15s; }
.right-check.on { border-color: #C08E6E; background: rgba(192,142,110,.06); }
.right-check input { margin-top: 2px; }
.rc-icon { font-size: 14px; }
.rc-label { font-weight: 500; color: var(--color-text-primary, #222); }
.rc-desc { display: block; font-size: 11px; color: var(--color-text-tertiary, #999); margin-top: 2px; line-height: 1.3; }
.btn-link { background: transparent; border: none; color: #C08E6E; cursor: pointer; font-size: 13px; }
</style>
