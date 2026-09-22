<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">优惠券</h1>
        <div class="sub">发券、看领取和使用；效果在「增长数据」里看</div>
      </div>
      <div class="actions" v-if="tab === 'list'">
        <button type="button" class="btn primary" @click="openCreate">
          <MiniIcon name="plus" :size="15" />创建优惠券
        </button>
      </div>
    </div>

    <div class="tabs-line" role="tablist">
      <button type="button" :class="{ on: tab === 'list' }" @click="tab = 'list'; loadCoupons()">优惠券管理</button>
      <button type="button" :class="{ on: tab === 'user' }" @click="tab = 'user'; loadUserCoupons()">用户优惠券</button>
      <button type="button" :class="{ on: tab === 'lead' }" @click="tab = 'lead'; loadFlash()">引流品与限时价</button>
    </div>

    <!-- 优惠券管理 -->
    <template v-if="tab === 'list'">
      <div v-if="couponError" class="empty-box">{{ couponError }} <button type="button" class="btn sm" @click="loadCoupons">重试</button></div>
      <div v-else-if="!coupons.length" class="empty-box">暂无优惠券</div>
      <div v-else class="cp-grid">
        <article v-for="c in coupons" :key="c.id" class="coupon" :class="{ off: c.status !== 'published' }">
          <div class="cp-left">
            <b>{{ c.type === 'fixed' ? '¥' + c.value : c.value + ' 折' }}</b>
            <span>{{ c.minOrderAmount > 0 ? `满 ${c.minOrderAmount} 可用` : '无门槛' }}</span>
          </div>
          <div class="cp-body">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
              <b>{{ c.name }}</b>
              <label class="switch">
                <input
                  type="checkbox"
                  :checked="c.status === 'published'"
                  @change="togglePublish(c)"
                />
                <span />
              </label>
            </div>
            <span class="faint">
              {{ scopeLabel(c.scope) }} ·
              {{ (c.startTime || '').slice(0, 10) }} ~ {{ (c.endTime || '').slice(0, 10) || '领取后有效' }}
            </span>
            <span class="faint">已用 {{ c.usedCount }} / {{ c.totalCount === -1 ? '不限' : c.totalCount }}</span>
            <div style="display:flex;gap:8px">
              <button type="button" class="link" style="font-size:12.5px" @click="openEdit(c)">编辑</button>
              <button type="button" class="link" style="font-size:12.5px;color:var(--r)" @click="removeCoupon(c)">删除</button>
            </div>
          </div>
        </article>
      </div>
    </template>

    <!-- 用户优惠券 -->
    <template v-else-if="tab === 'user'">
      <div v-if="userError" class="empty-box">{{ userError }} <button type="button" class="btn sm" @click="loadUserCoupons">重试</button></div>
      <div v-else class="group">
        <div class="chead">
          <span style="flex:1;padding:0">用户</span>
          <span style="flex:1">优惠券</span>
          <span class="ctime">领取时间</span>
          <span style="width:120px">状态</span>
        </div>
        <div v-if="!userCoupons.length" class="muted" style="padding:24px;text-align:center">暂无领取记录</div>
        <div v-for="(x, i) in userCoupons" :key="i" class="crow">
          <span style="flex:1">{{ x.user_nickname || x.userNickname || '—' }}</span>
          <span style="flex:1">{{ x.coupon_name || x.couponName || '—' }}</span>
          <span class="ctime faint">{{ shortTime(x.claim_time || x.claimTime || x.created_at) }}</span>
          <span style="width:120px">
            <span class="tag" :class="String(x.status).includes('used') || String(x.status).includes('已使用') ? 't-live' : 't-draft'">
              {{ x.statusLabel || x.status || '—' }}
            </span>
          </span>
        </div>
      </div>
    </template>

    <!-- 引流品与限时价 -->
    <template v-else>
      <div class="ov2">
        <section class="card">
          <h2 class="h2">引流品</h2>
          <div class="sub">免费领取和低价体验，看有没有带到正价</div>
          <div v-if="leadError" class="note err" style="margin-top:10px">{{ leadError }}</div>
          <div v-else-if="!leadProducts.length" class="muted" style="margin-top:12px">暂无引流品（价格 ≤ 1 元）</div>
          <div v-else style="margin-top:8px">
            <div v-for="p in leadProducts" :key="p.id" class="list-row">
              <div class="cthumb" style="width:36px;height:36px;background:#EFE6DA">
                <MiniIcon name="gift" :size="16" />
              </div>
              <div style="flex:1;min-width:0">
                <b style="font-weight:500;display:block">{{ p.name }}</b>
                <span class="faint">¥{{ p.min_price ?? 0 }} · {{ p.status === 'on_sale' ? '在售' : '下架' }}</span>
              </div>
              <span class="tag" :class="p.status === 'on_sale' ? 't-live' : 't-draft'">
                {{ p.status === 'on_sale' ? '进行中' : '已下架' }}
              </span>
            </div>
          </div>
        </section>

        <section class="card">
          <h2 class="h2">限时价</h2>
          <div class="sub">到点自动恢复原价</div>
          <div v-if="flashError" class="note err" style="margin-top:10px">{{ flashError }}</div>
          <form style="display:flex;flex-direction:column;gap:10px;margin-top:12px" @submit.prevent="saveFlash">
            <div class="field">
              <label>商品</label>
              <select v-model="flashForm.productId" class="input">
                <option :value="0">选择商品</option>
                <option v-for="p in productOptions" :key="p.id" :value="p.id">
                  {{ p.name }}（¥{{ p.min_price ?? 0 }}）
                </option>
              </select>
            </div>
            <div class="row">
              <div class="field" style="flex:1">
                <label>限时价</label>
                <input v-model.number="flashForm.flashPrice" class="input" type="number" min="0" step="0.01" />
              </div>
              <div class="field" style="flex:1">
                <label>结束时间</label>
                <input v-model="flashForm.endAt" class="input" type="datetime-local" />
              </div>
            </div>
            <button type="submit" class="btn primary sm" style="align-self:flex-start">设置限时价</button>
          </form>
          <div v-for="f in flashes" :key="f.id" class="note" style="margin-top:10px;display:flex;justify-content:space-between;gap:8px;align-items:center">
            <span>「{{ f.productName || f.productId }}」限时 ¥{{ f.flashPrice }}，{{ f.endAt }} 后恢复</span>
            <button type="button" class="link" style="color:var(--r);font-size:12px" @click="removeFlash(f.id)">删除</button>
          </div>
        </section>
      </div>
    </template>

    <!-- 简易创建/编辑弹层 -->
    <div v-if="formOpen" class="scrim" @click.self="formOpen = false">
      <div class="drawer" style="height:auto;max-height:90vh;width:440px;border-radius:16px;margin:auto" role="dialog">
        <div class="dhead">
          <h2 class="h2">{{ editingId ? '编辑优惠券' : '创建优惠券' }}</h2>
          <button type="button" class="iconbtn" @click="formOpen = false"><MiniIcon name="x" :size="16" /></button>
        </div>
        <div class="field">
          <label>名称</label>
          <input v-model="form.name" class="input" />
        </div>
        <div class="row">
          <div class="field" style="flex:1">
            <label>类型</label>
            <select v-model="form.type" class="input">
              <option value="fixed">满减</option>
              <option value="percent">折扣</option>
            </select>
          </div>
          <div class="field" style="flex:1">
            <label>面额 / 折扣</label>
            <input v-model.number="form.value" class="input" type="number" min="0" />
          </div>
        </div>
        <div class="field">
          <label>门槛（元，0=无门槛）</label>
          <input v-model.number="form.minOrderAmount" class="input" type="number" min="0" />
        </div>
        <div class="row">
          <div class="field" style="flex:1">
            <label>开始</label>
            <input v-model="form.startTime" class="input" type="datetime-local" />
          </div>
          <div class="field" style="flex:1">
            <label>结束</label>
            <input v-model="form.endTime" class="input" type="datetime-local" />
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn" @click="formOpen = false">取消</button>
          <button type="button" class="btn primary" @click="saveCoupon">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import {
  getCouponList,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  publishCoupon,
  disableCoupon,
  getUserCouponList,
} from '@/api/coupon'
import { getProductList } from '@/api/product'
import {
  listFlashPrices,
  createFlashPrice,
  deleteFlashPrice,
  type FlashPrice,
} from '@/api/commerceOps'
import type { CouponRecord } from '@/types/coupon'
import { CouponScope, CouponScopeLabels, CouponType } from '@/types/coupon'
import type { ProductRecord } from '@/types/product'

const loading = ref(false)
const tab = ref<'list' | 'user' | 'lead'>('list')

const coupons = ref<CouponRecord[]>([])
const couponError = ref('')
const userCoupons = ref<any[]>([])
const userError = ref('')
const leadProducts = ref<ProductRecord[]>([])
const leadError = ref('')
const flashes = ref<FlashPrice[]>([])
const flashError = ref('')
const productOptions = ref<ProductRecord[]>([])

const flashForm = reactive({ productId: 0, flashPrice: 0, endAt: '' })
const formOpen = ref(false)
const editingId = ref(0)
const form = reactive({
  name: '',
  type: 'fixed' as string,
  value: 10,
  minOrderAmount: 0,
  startTime: '',
  endTime: '',
})

function scopeLabel(s: string) {
  return (CouponScopeLabels as any)[s] || s
}

function shortTime(t?: string) {
  if (!t) return '—'
  return String(t).replace('T', ' ').slice(5, 16)
}

function toLocalInput(iso?: string) {
  if (!iso) return ''
  return String(iso).slice(0, 16)
}

async function loadCoupons() {
  loading.value = true
  couponError.value = ''
  try {
    const res: any = await getCouponList({ page: 1, page_size: 50 })
    const data = res?.data ?? {}
    const rows = data.records || data.items || data.list || (Array.isArray(data) ? data : [])
    coupons.value = rows.map((raw: any) => ({
      id: Number(raw?.id || 0),
      name: raw?.name || '',
      type: raw?.type || CouponType.Fixed,
      status: raw?.status || 'draft',
      scope: raw?.scope || CouponScope.All,
      value: Number(raw?.value ?? raw?.discount_value ?? 0),
      minOrderAmount: Number(raw?.minOrderAmount ?? raw?.min_amount ?? 0),
      totalCount: Number(raw?.totalCount ?? raw?.total_count ?? -1),
      usedCount: Number(raw?.usedCount ?? raw?.used_count ?? 0),
      startTime: raw?.startTime || raw?.start_time || '',
      endTime: raw?.endTime || raw?.end_time || '',
    }))
  } catch (e: any) {
    couponError.value = e?.message || '优惠券列表加载失败'
    coupons.value = []
  } finally {
    loading.value = false
  }
}

async function loadUserCoupons() {
  loading.value = true
  userError.value = ''
  try {
    const res: any = await getUserCouponList({ page: 1, page_size: 50 })
    const data = res?.data ?? {}
    userCoupons.value = data.records || data.items || data.list || (Array.isArray(data) ? data : [])
  } catch (e: any) {
    userError.value = e?.message || '用户优惠券加载失败'
    userCoupons.value = []
  } finally {
    loading.value = false
  }
}

async function loadFlash() {
  loading.value = true
  flashError.value = ''
  leadError.value = ''
  try {
    const [flashRes, prodRes]: any[] = await Promise.all([
      listFlashPrices().catch((e: any) => { flashError.value = e?.message || '限时价接口不可用'; return { data: [] } }),
      getProductList({ page: 1, page_size: 100, current: 1, size: 100 }),
    ])
    const flashData = flashRes?.data ?? flashRes ?? []
    flashes.value = Array.isArray(flashData) ? flashData : (flashData.records || flashData.list || [])
    const pdata = prodRes?.data ?? {}
    const products: ProductRecord[] = pdata.records || pdata.items || []
    productOptions.value = products.filter((p) => Number(p.min_price ?? 0) > 1)
    leadProducts.value = products.filter((p) => Number(p.min_price ?? 0) <= 1)
  } catch (e: any) {
    leadError.value = e?.message || '商品列表加载失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = 0
  form.name = ''
  form.type = 'fixed'
  form.value = 10
  form.minOrderAmount = 0
  form.startTime = ''
  form.endTime = ''
  formOpen.value = true
}

function openEdit(c: CouponRecord) {
  editingId.value = c.id
  form.name = c.name
  form.type = c.type
  form.value = c.value
  form.minOrderAmount = c.minOrderAmount
  form.startTime = toLocalInput(c.startTime)
  form.endTime = toLocalInput(c.endTime)
  formOpen.value = true
}

async function saveCoupon() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  const payload: any = {
    name: form.name,
    type: form.type,
    value: form.value,
    minOrderAmount: form.minOrderAmount,
    scope: CouponScope.All,
    totalCount: -1,
    startTime: form.startTime ? form.startTime.replace('T', ' ') + ':00' : undefined,
    endTime: form.endTime ? form.endTime.replace('T', ' ') + ':00' : undefined,
  }
  try {
    if (editingId.value) await updateCoupon(editingId.value, payload)
    else {
      const created: any = await createCoupon(payload)
      const id = created?.data?.id
      if (id) await publishCoupon(id)
    }
    ElMessage.success('已保存')
    formOpen.value = false
    await loadCoupons()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function togglePublish(c: CouponRecord) {
  try {
    if (c.status === 'published') {
      await disableCoupon(c.id)
      ElMessage.success('已停用')
    } else {
      await publishCoupon(c.id)
      ElMessage.success('已发布')
    }
    await loadCoupons()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function removeCoupon(c: CouponRecord) {
  try {
    await ElMessageBox.confirm(`删除「${c.name}」？`, '确认', { type: 'warning' })
    await deleteCoupon(c.id)
    ElMessage.success('已删除')
    await loadCoupons()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

async function saveFlash() {
  if (!flashForm.productId || !flashForm.flashPrice || !flashForm.endAt) {
    ElMessage.warning('请填写完整限时价')
    return
  }
  try {
    await createFlashPrice({
      productId: flashForm.productId,
      flashPrice: flashForm.flashPrice,
      endAt: flashForm.endAt.replace('T', ' '),
    })
    ElMessage.success('已设置限时价')
    flashForm.productId = 0
    flashForm.flashPrice = 0
    flashForm.endAt = ''
    await loadFlash()
  } catch (e: any) {
    ElMessage.error(e?.message || '设置失败')
  }
}

async function removeFlash(id: number) {
  try {
    await deleteFlashPrice(id)
    ElMessage.success('已删除')
    await loadFlash()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(loadCoupons)
</script>
