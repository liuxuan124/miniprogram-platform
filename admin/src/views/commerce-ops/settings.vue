<template>
  <div class="commerce-wb mw-page" v-loading="loading">
    <div class="head">
      <div>
        <h1 class="h1">交易设置</h1>
        <div class="sub">商城页展示、支付与退款、消息通知、测试账号</div>
      </div>
      <div class="actions">
        <button type="button" class="btn primary" :disabled="saving" @click="save">保存设置</button>
      </div>
    </div>

    <div v-if="loadError" class="empty-box">
      {{ loadError }}
      <div style="margin-top:10px">
        <button type="button" class="btn sm" @click="load">重试</button>
      </div>
    </div>

    <div v-else class="set-grid">
      <section class="card">
        <h2 class="h2">商城页展示</h2>
        <div class="sub">小程序商品列表顶部的标题、介绍和服务保障</div>
        <label class="kv" style="margin-top:8px">
          <span>显示顶部介绍</span>
          <label class="switch">
            <input type="checkbox" v-model="form.showMallHeader" />
            <span />
          </label>
        </label>
        <div class="field"><label>标题</label><input v-model="form.mallTitle" class="input" maxlength="32" /></div>
        <div class="field" style="margin-top:8px"><label>介绍</label><input v-model="form.mallIntro" class="input" maxlength="80" /></div>
        <div class="field" style="margin-top:8px"><label>服务保障</label><input v-model="form.mallGuarantees" class="input" placeholder="一行或顿号分隔" /></div>
        <div v-if="form.showMallHeader" class="blk" style="margin-top:12px;background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px 12px">
          <b>{{ form.mallTitle || '精选好物' }}</b>
          <span style="display:block;font-size:12px;color:var(--mute);margin-top:4px">{{ form.mallIntro || '精选在售商品' }}</span>
          <span style="display:block;font-size:12px;color:var(--mute);margin-top:4px">
            <MiniIcon name="shield" :size="11" style="display:inline" /> {{ form.mallGuarantees || '正品保障' }}
          </span>
        </div>
      </section>

      <section class="card">
        <h2 class="h2">订阅消息</h2>
        <div class="sub">哪些事件给用户发微信服务通知</div>
        <div style="margin-top:8px">
          <div class="list-row">
            <label class="switch"><input type="checkbox" v-model="form.subscribeOrderStatus" /><span /></label>
            <b style="font-weight:500;flex:1">订单状态</b>
          </div>
          <div class="list-row">
            <label class="switch"><input type="checkbox" v-model="form.subscribeShip" /><span /></label>
            <b style="font-weight:500;flex:1">发货通知</b>
          </div>
          <div class="list-row">
            <label class="switch"><input type="checkbox" v-model="form.subscribeCouponExpire" /><span /></label>
            <b style="font-weight:500;flex:1">券到期提醒</b>
          </div>
          <div class="list-row">
            <label class="switch"><input type="checkbox" v-model="form.subscribeRecall" /><span /></label>
            <b style="font-weight:500;flex:1">未付款召回</b>
          </div>
        </div>
        <div class="faint">召回券、续费提醒、发货通知都依赖这里</div>
      </section>

      <section class="card">
        <h2 class="h2">支付与退款</h2>
        <div class="field" style="margin-top:10px">
          <label>未付款自动关闭</label>
          <select v-model.number="form.autoCloseMinutes" class="input">
            <option :value="15">15 分钟</option>
            <option :value="30">30 分钟</option>
            <option :value="60">1 小时</option>
            <option :value="1440">24 小时</option>
          </select>
        </div>
        <div class="field" style="margin-top:10px">
          <label>虚拟商品退款规则</label>
          <select v-model="form.virtualRefundRule" class="input">
            <option>7 天内未下载可退</option>
            <option>7 天内无理由退款</option>
            <option>虚拟商品不支持退款</option>
          </select>
        </div>
        <label class="kv" style="margin-top:6px">
          <span>允许申请电子发票</span>
          <label class="switch">
            <input type="checkbox" v-model="form.invoiceEnabled" />
            <span />
          </label>
        </label>
        <div v-if="form.invoiceEnabled" class="field" style="margin-top:8px">
          <label>发票说明</label>
          <input v-model="form.invoiceNote" class="input" placeholder="开票须知" />
        </div>
      </section>

      <section class="card">
        <h2 class="h2">iOS 虚拟支付</h2>
        <div class="sub">默认阻断 iOS 普通微信支付虚拟商品；最终方案<strong>待用户确认</strong>是否接入官方虚拟支付。</div>
        <div class="field" style="margin-top:10px">
          <label>策略</label>
          <select v-model="form.iosStrategy" class="input">
            <option value="block_wx_pay">iOS 阻断虚拟品微信支付（推荐过渡）</option>
            <option value="virtual_payment">官方虚拟支付（仅占位，未接米大师）</option>
          </select>
        </div>
        <div class="field" style="margin-top:10px">
          <label>iOS 拦截提示</label>
          <input v-model="form.blockMessage" class="input" maxlength="120" />
        </div>
        <label class="kv" style="margin-top:6px">
          <span>iOS 允许实物微信支付</span>
          <label class="switch">
            <input type="checkbox" v-model="form.allowPhysicalOnIos" />
            <span />
          </label>
        </label>
        <div class="faint">{{ form.iosVirtualPayNote || '待用户确认 wx.requestVirtualPayment 立项' }}</div>
      </section>

      <section class="card">
        <h2 class="h2">测试账号</h2>
        <div class="sub">这些账号下的订单自动标记为测试，不计入收入、销量和转化（每行一个昵称或手机号）</div>
        <textarea
          v-model="testAccountsText"
          class="input"
          style="margin-top:10px;min-height:120px"
          placeholder="每行一个"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { getCommerceSettings, putCommerceSettings, type CommerceSettings } from '@/api/commerceOps'

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const testAccountsText = ref('')

const form = reactive<CommerceSettings>({
  mallTitle: '精选好物',
  mallIntro: '精选在售商品',
  mallGuarantees: '正品保障 · 售后无忧',
  showMallHeader: true,
  subscribeOrderStatus: true,
  subscribeShip: true,
  subscribeCouponExpire: true,
  subscribeRecall: true,
  autoCloseMinutes: 30,
  virtualRefundRule: '7 天内未下载可退',
  invoiceEnabled: false,
  invoiceNote: '',
  testAccounts: [],
  iosStrategy: 'block_wx_pay',
  blockMessage: '根据微信小程序规则，iOS 端暂不支持直接购买此类虚拟商品，请使用 Android 或联系客服。',
  allowPhysicalOnIos: true,
  userConfirmRequired: true,
  iosVirtualPayNote: '',
})

watch(testAccountsText, (v) => {
  form.testAccounts = v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res: any = await getCommerceSettings()
    const data: CommerceSettings = res?.data ?? res ?? {}
    Object.assign(form, {
      mallTitle: data.mallTitle ?? form.mallTitle,
      mallIntro: data.mallIntro ?? form.mallIntro,
      mallGuarantees: data.mallGuarantees ?? form.mallGuarantees,
      showMallHeader: data.showMallHeader ?? form.showMallHeader,
      subscribeOrderStatus: data.subscribeOrderStatus ?? form.subscribeOrderStatus,
      subscribeShip: data.subscribeShip ?? form.subscribeShip,
      subscribeCouponExpire: data.subscribeCouponExpire ?? form.subscribeCouponExpire,
      subscribeRecall: data.subscribeRecall ?? form.subscribeRecall,
      autoCloseMinutes: data.autoCloseMinutes ?? form.autoCloseMinutes,
      virtualRefundRule: data.virtualRefundRule ?? form.virtualRefundRule,
      invoiceEnabled: data.invoiceEnabled ?? form.invoiceEnabled,
      invoiceNote: data.invoiceNote ?? form.invoiceNote,
      testAccounts: Array.isArray(data.testAccounts) ? data.testAccounts : [],
      iosStrategy: data.iosStrategy ?? form.iosStrategy,
      blockMessage: data.blockMessage ?? form.blockMessage,
      allowPhysicalOnIos: data.allowPhysicalOnIos ?? form.allowPhysicalOnIos,
      userConfirmRequired: data.userConfirmRequired ?? form.userConfirmRequired,
      iosVirtualPayNote: data.iosVirtualPayNote ?? form.iosVirtualPayNote,
    })
    testAccountsText.value = (form.testAccounts || []).join('\n')
  } catch (e: any) {
    loadError.value = e?.message || '设置接口暂不可用（后端 commerce-ops 可能尚未上线）'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await putCommerceSettings({ ...form, testAccounts: form.testAccounts || [] })
    ElMessage.success('已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
