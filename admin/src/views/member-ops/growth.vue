<template>
  <div class="member-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">成长与积分</h1>
        <div class="sub">成长等级只用来展示和激励，<b>不决定阅读权限</b>；权限只看「会员与权益」</div>
      </div>
      <div class="actions">
        <button type="button" class="btn primary" :disabled="saving" @click="saveAll">保存更改</button>
        <button type="button" class="btn" @click="adjustOpen = true"><MiniIcon name="coin" :size="14" />调积分</button>
      </div>
    </div>

    <div v-if="loadError" class="empty-box">
      {{ loadError }}
      <div style="margin-top:10px"><button type="button" class="btn sm" @click="load">重试</button></div>
    </div>

    <div v-else class="set-grid">
      <section class="card">
        <h2 class="h2">成长等级</h2>
        <div class="sub">按累计积分自动升级；名称用「新芽 → 知己」这类词，避免和付费叫法混淆</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
          <div v-for="(lv, i) in levels" :key="lv.id" class="lvstep">
            <span class="lv">Lv{{ lv.level || i + 1 }}</span>
            <input v-model="lv.name" class="input" aria-label="等级名称" />
            <span class="faint">≥</span>
            <input
              v-model.number="lv.min_points"
              class="input"
              type="number"
              :disabled="i === 0"
              style="width:96px"
              aria-label="所需积分"
            />
            <span class="faint" style="width:48px;text-align:right">{{ lv.member_count ?? 0 }} 人</span>
          </div>
          <div v-if="!levels.length" class="muted">暂无等级，可在后端种子后刷新</div>
          <button type="button" class="btn sm" @click="addLevel"><MiniIcon name="plus" :size="14" />新增等级</button>
        </div>
      </section>

      <section class="card">
        <h2 class="h2">积分怎么来</h2>
        <div class="sub">关掉的规则立即停止发分</div>
        <div style="margin-top:8px">
          <div class="list-row">
            <label class="switch">
              <input type="checkbox" v-model="rules.signInEnabled" />
              <span />
            </label>
            <b style="font-weight:500;flex:1">每日签到</b>
            <span class="ptsin">+<input v-model.number="rules.signInPoints" type="number" min="0" /></span>
          </div>
          <div class="list-row">
            <label class="switch">
              <input type="checkbox" v-model="rules.consumeEnabled" />
              <span />
            </label>
            <b style="font-weight:500;flex:1">消费赠送</b>
            <span class="faint">1 元 =</span>
            <span class="ptsin"><input v-model.number="rules.consumeRate" type="number" min="0" /> 分</span>
          </div>
          <div class="list-row">
            <label class="switch">
              <input type="checkbox" v-model="rules.exchangeEnabled" />
              <span />
            </label>
            <b style="font-weight:500;flex:1">积分兑换</b>
            <span class="faint">最低</span>
            <span class="ptsin"><input v-model.number="rules.exchangeMin" type="number" min="0" /> 分</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="h2">积分怎么用</h2>
        <div class="sub">给积分一个出口，用户才会在意</div>
        <div style="margin-top:8px">
          <div class="list-row"><b style="font-weight:500;flex:1">兑换 7 天会员体验</b><span class="faint">按运营配置</span></div>
          <div class="list-row"><b style="font-weight:500;flex:1">兑换资料包</b><span class="faint">按运营配置</span></div>
          <div class="list-row"><b style="font-weight:500;flex:1">抵扣会员费</b><span class="faint">视商城规则</span></div>
        </div>
      </section>

      <section class="card">
        <h2 class="h2">手动调积分</h2>
        <div class="sub">在用户详情或此处操作，必须填原因，所有调整留痕</div>
        <div class="note" style="margin-top:12px">
          建议从「用户」页打开详情后再调；此处提供快捷入口，避免列表每行误点。
        </div>
        <button type="button" class="btn sm primary" style="margin-top:10px;align-self:flex-start" @click="adjustOpen = true">
          <MiniIcon name="coin" :size="14" />调整积分
        </button>
      </section>
    </div>

    <div v-if="adjustOpen" class="scrim" @click.self="adjustOpen = false">
      <div class="card" style="width:400px;max-width:100%;display:flex;flex-direction:column;gap:12px">
        <h2 class="h2">调整积分</h2>
        <div class="field"><label>用户 ID</label><input v-model.number="adjust.userId" type="number" class="input" /></div>
        <div class="field"><label>变动积分（负数为扣减）</label><input v-model.number="adjust.points" type="number" class="input" /></div>
        <div class="field"><label>原因</label><input v-model="adjust.remark" class="input" /></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="adjustOpen = false">取消</button>
          <button type="button" class="btn primary" :disabled="adjusting" @click="doAdjust">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import {
  getMemberLevelList,
  createMemberLevel,
  updateMemberLevel,
  adjustMemberPoints,
} from '@/api/member'
import { getConfigByGroupSilent, updateConfigs } from '@/api/system'
import type { MemberLevel } from '@/types/member'

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const levels = ref<MemberLevel[]>([])
const rules = reactive({
  signInEnabled: true,
  signInPoints: 10,
  consumeEnabled: true,
  consumeRate: 1,
  exchangeEnabled: true,
  exchangeMin: 100,
})
const adjustOpen = ref(false)
const adjusting = ref(false)
const adjust = reactive({ userId: 0, points: 10, remark: '' })

function isTruthy(raw: string | undefined, def: boolean) {
  if (raw == null || raw === '') return def
  return raw === '1' || raw === 'true' || raw === 'yes'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [lvRes, cfgRes]: any[] = await Promise.all([
      getMemberLevelList(),
      getConfigByGroupSilent('member').catch(() => null),
    ])
    levels.value = (lvRes?.data || []).map((x: MemberLevel) => ({ ...x }))
    const rows = Array.isArray(cfgRes?.data) ? cfgRes.data : cfgRes?.data?.configs || []
    const map = new Map<string, string>()
    rows.forEach((item: any) => {
      const key = item.configKey || item.config_key || item.key
      const val = item.configValue ?? item.config_value ?? item.value
      if (key != null) map.set(String(key), String(val ?? ''))
    })
    rules.signInPoints = Number(map.get('points_sign_in') ?? 10) || 10
    rules.consumeRate = Number(map.get('points_consume_rate') ?? 1) || 0
    rules.exchangeMin = Number(map.get('points_exchange_min') ?? 100) || 0
    rules.signInEnabled = isTruthy(map.get('points_sign_in_enabled'), true)
    rules.consumeEnabled = isTruthy(map.get('points_consume_enabled'), true)
    rules.exchangeEnabled = isTruthy(map.get('points_exchange_enabled'), true)
  } catch (e: any) {
    loadError.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function addLevel() {
  try {
    const maxMin = levels.value.reduce((m, l) => Math.max(m, Number(l.min_points) || 0), 0)
    await createMemberLevel({
      name: '新等级',
      level: levels.value.length + 1,
      min_points: maxMin + 100,
      discount_rate: 1,
      points_rate: 1,
      benefits: [],
      status: 1,
    } as any)
    ElMessage.success('已新增')
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '新增失败')
  }
}

async function saveAll() {
  saving.value = true
  try {
    await Promise.all(
      levels.value.map((lv) =>
        updateMemberLevel(lv.id, {
          name: lv.name,
          level: lv.level,
          min_points: lv.min_points,
          discount_rate: lv.discount_rate,
          points_rate: lv.points_rate,
          benefits: lv.benefits,
          status: lv.status,
        } as any),
      ),
    )
    await updateConfigs([
      { configKey: 'points_sign_in', configValue: String(rules.signInPoints ?? 0), configGroup: 'member', description: '每日签到获得积分' },
      { configKey: 'points_consume_rate', configValue: String(rules.consumeRate ?? 0), configGroup: 'member', description: '消费赠送：每实付1元赠送积分' },
      { configKey: 'points_exchange_min', configValue: String(rules.exchangeMin ?? 0), configGroup: 'member', description: '积分兑换最低门槛' },
      { configKey: 'points_sign_in_enabled', configValue: rules.signInEnabled ? '1' : '0', configGroup: 'member', description: '是否开启每日签到送积分' },
      { configKey: 'points_consume_enabled', configValue: rules.consumeEnabled ? '1' : '0', configGroup: 'member', description: '是否开启消费赠送积分' },
      { configKey: 'points_exchange_enabled', configValue: rules.exchangeEnabled ? '1' : '0', configGroup: 'member', description: '是否开启积分兑换' },
    ])
    ElMessage.success('已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doAdjust() {
  if (!adjust.userId || !adjust.remark.trim()) {
    ElMessage.warning('请填写用户 ID 与原因')
    return
  }
  adjusting.value = true
  try {
    await adjustMemberPoints({
      user_id: adjust.userId,
      points: adjust.points,
      remark: adjust.remark,
    })
    ElMessage.success('已调整')
    adjustOpen.value = false
  } catch (e: any) {
    ElMessage.error(e?.message || '调整失败')
  } finally {
    adjusting.value = false
  }
}

onMounted(load)
</script>
