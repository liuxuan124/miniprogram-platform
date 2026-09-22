<template>
  <div class="member-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">会员与权益</h1>
        <div class="sub">付费档决定：会员文章、商城会员价、能进哪些社区。改价只影响新购买</div>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="addPlan"><MiniIcon name="plus" :size="15" />新增付费档</button>
        <button type="button" class="btn" :disabled="trialLoading" @click="trialRemind">
          <MiniIcon name="send" :size="15" />试发到期提醒
        </button>
      </div>
    </div>

    <div v-if="loadError" class="empty-box">
      {{ loadError }}
      <div style="margin-top:10px"><button type="button" class="btn sm" @click="load">重试</button></div>
    </div>

    <div v-else class="plans-layout">
      <div class="plans">
        <article v-for="p in plans" :key="p.id" class="plan" :class="{ off: p.status !== 1 }">
          <div class="plan-top" :style="{ background: toneOf(p.id) }">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <input v-model="p.name" class="input" style="background:transparent;border:0;font-weight:600;padding:0" @change="save(p)" />
              <label class="switch" :title="p.status === 1 ? '上架中' : '已下架'">
                <input type="checkbox" :checked="p.status === 1" @change="toggleStatus(p, $event)" />
                <span />
              </label>
            </div>
            <div class="price">
              <span style="font-size:14px;font-weight:500">¥</span>
              <input
                :value="priceOf(p)"
                type="number"
                style="width:90px;border:0;border-bottom:1.5px dashed rgba(42,31,23,.35);background:transparent;font:inherit;font-size:34px;padding:0;outline:0;font-family:var(--serif)"
                @change="onPrice(p, $event)"
              />
            </div>
            <div class="faint" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <span v-if="p.showBadge" class="tag t-acc">角标</span>
              <span>到期提醒 {{ p.expireRemindDays ? '提前 ' + p.expireRemindDays + ' 天' : '关闭' }}</span>
              <span>{{ discountLabel(p.discountRate) }}</span>
            </div>
          </div>
          <div class="plan-body">
            <div class="faint">包含权益</div>
            <label v-for="r in (p.rights || [])" :key="r" class="perk">
              <MiniIcon name="check" :size="12" style="color:var(--g)" />
              <span>{{ r }}</span>
            </label>
            <div v-if="!(p.rights || []).length" class="faint">暂未配置权益文案</div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
              <button type="button" class="btn sm" @click="editPlan(p)">编辑</button>
              <button type="button" class="btn sm danger" @click="remove(p)">删除</button>
            </div>
          </div>
        </article>
        <div v-if="!plans.length" class="empty-box" style="grid-column:1/-1">暂无付费档，点击「新增付费档」开始</div>
      </div>

      <aside class="preview">
        <b>用户看到的开通页</b>
        <div class="phone">
          <div class="ph-title">开通会员</div>
          <div class="ph-body" style="gap:10px">
            <div
              v-for="p in livePlans"
              :key="p.id"
              class="blk"
              :style="{ background: toneOf(p.id), outline: p.showBadge ? '2px solid var(--acc)' : undefined }"
            >
              <b style="font-size:13px">
                {{ p.name }}
                <span v-if="p.showBadge" class="tag t-acc" style="float:right;font-size:10px">推荐</span>
              </b>
              <span style="font-size:18px;font-weight:700;opacity:1;margin-top:4px">
                ¥{{ priceOf(p) }}
              </span>
              <span>{{ (p.rights || []).slice(0, 3).join(' · ') || '会员权益' }}</span>
            </div>
            <div v-if="!livePlans.length" class="muted" style="padding:40px 10px;text-align:center;font-size:12px">没有上架的付费档</div>
            <div class="blk" style="background:var(--acc);color:#fff;text-align:center"><b>立即开通</b></div>
            <span class="faint" style="font-size:10.5px;text-align:center">到期不自动续费 · 可开发票</span>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="editOpen" class="scrim" @click.self="editOpen = false">
      <div class="card" style="width:480px;max-width:100%;display:flex;flex-direction:column;gap:12px;max-height:90vh;overflow:auto">
        <h2 class="h2">编辑付费档</h2>
        <div class="field"><label>名称</label><input v-model="form.name" class="input" /></div>
        <div class="field"><label>说明</label><textarea v-model="form.description" class="input" rows="2" /></div>
        <div class="field"><label>权益（每行一项）</label>
          <textarea v-model="rightsText" class="input" rows="4" placeholder="全部会员长文&#10;资料下载" />
        </div>
        <div class="field"><label>商城折扣（1=无折扣，0.9=九折）</label>
          <input v-model.number="form.discountRate" type="number" step="0.05" min="0.1" max="1" class="input" />
        </div>
        <div class="field"><label>到期提醒天数（0=关闭）</label>
          <input v-model.number="form.expireRemindDays" type="number" min="0" max="30" class="input" />
        </div>
        <label class="perk"><input type="checkbox" v-model="form.showBadgeBool" />显示推荐角标</label>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="editOpen = false">取消</button>
          <button type="button" class="btn primary" @click="submitEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { post } from '@/api/request'
import {
  getMembershipPlanList,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  type MembershipPlan,
} from '@/api/membershipPlan'

const TONES = ['#F3D9A4', '#FCEBDD', '#E6EEFA', '#E3F3EA', '#EFE6DA', '#F3DDE6']

const loading = ref(false)
const loadError = ref('')
const trialLoading = ref(false)
const plans = ref<MembershipPlan[]>([])
const editOpen = ref(false)
const editingId = ref<number | null>(null)
const rightsText = ref('')
const form = reactive({
  name: '',
  description: '',
  discountRate: 1 as number | null,
  expireRemindDays: 7,
  showBadgeBool: false,
})

const livePlans = computed(() => plans.value.filter((p) => p.status === 1))

function toneOf(id: number) {
  return TONES[id % TONES.length]
}
function priceOf(p: MembershipPlan) {
  // 后端档位可能无价格字段；展示用 description 或占位
  const any = p as any
  return Number(any.price ?? any.salePrice ?? 0) || '—'
}
function discountLabel(r?: number | null) {
  if (r == null || r >= 1) return '无折扣'
  return `${(Number(r) * 10).toFixed(1)} 折`
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res: any = await getMembershipPlanList({ scope: 'platform' })
    plans.value = res?.data || []
  } catch (e: any) {
    loadError.value = e?.message || '付费档加载失败'
    plans.value = []
  } finally {
    loading.value = false
  }
}

async function save(p: MembershipPlan) {
  try {
    await updateMembershipPlan(p.id, {
      scope: p.scope || 'platform',
      name: p.name,
      description: p.description,
      rights: p.rights,
      discountRate: p.discountRate,
      showBadge: p.showBadge,
      expireRemindDays: p.expireRemindDays,
      status: p.status,
      sortOrder: p.sortOrder,
    })
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function toggleStatus(p: MembershipPlan, e: Event) {
  p.status = (e.target as HTMLInputElement).checked ? 1 : 0
  await save(p)
}

function onPrice(_p: MembershipPlan, _e: Event) {
  ElMessage.info('价格字段若后端未建模，需在商品/订单侧配置；此处仅预览展示')
}

async function addPlan() {
  try {
    await createMembershipPlan({
      scope: 'platform',
      name: '新付费档',
      rights: ['全部会员长文'],
      discountRate: 1,
      showBadge: 0,
      expireRemindDays: 7,
      status: 0,
      sortOrder: plans.value.length + 1,
    })
    ElMessage.success('已新增（未上架）')
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  }
}

function editPlan(p: MembershipPlan) {
  editingId.value = p.id
  form.name = p.name
  form.description = p.description || ''
  form.discountRate = p.discountRate ?? 1
  form.expireRemindDays = p.expireRemindDays ?? 0
  form.showBadgeBool = Number(p.showBadge) === 1
  rightsText.value = (p.rights || []).join('\n')
  editOpen.value = true
}

async function submitEdit() {
  if (!editingId.value) return
  const p = plans.value.find((x) => x.id === editingId.value)
  if (!p) return
  try {
    await updateMembershipPlan(editingId.value, {
      scope: p.scope || 'platform',
      name: form.name,
      description: form.description,
      rights: rightsText.value.split('\n').map((s) => s.trim()).filter(Boolean),
      discountRate: form.discountRate,
      showBadge: form.showBadgeBool ? 1 : 0,
      expireRemindDays: form.expireRemindDays,
      status: p.status,
      sortOrder: p.sortOrder,
    })
    editOpen.value = false
    ElMessage.success('已保存')
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function remove(p: MembershipPlan) {
  try {
    await ElMessageBox.confirm(`删除「${p.name}」？`, '确认')
    await deleteMembershipPlan(p.id)
    load()
  } catch {
    /* */
  }
}

async function trialRemind() {
  trialLoading.value = true
  try {
    const res: any = await post('/api/v1/admin/membership-plans/expire-remind/trial')
    ElMessage.success(res?.message || res?.data?.message || '试发已触发')
  } catch (e: any) {
    ElMessage.error(e?.message || '试发失败')
  } finally {
    trialLoading.value = false
  }
}

onMounted(load)
</script>
