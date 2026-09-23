<template>
  <div class="commerce-wb mw-page">
    <div class="head">
      <div>
        <h1 class="h1">智能助手</h1>
        <div class="sub">问账目、写小结、把订单和账单变成记账草稿；所有动作都要你确认</div>
      </div>
    </div>

    <div class="ov2">
      <section class="card chat-panel">
        <div class="chat">
          <div v-if="!messages.length" class="bub-a">
            可以问我：本月赚了多少、钱花在哪、离目标还差多少；也可以让我把未入账订单整理成记账草稿，或写一份月度经营小结。
          </div>
          <template v-for="(m, i) in messages" :key="i">
            <div v-if="m.role === 'u'" class="bub-u">{{ m.text }}</div>
            <div v-else class="bub-a">
              <div>{{ m.text }}</div>
              <div v-if="m.action" style="margin-top: 8px">
                <button type="button" class="btn sm primary" @click="m.action()">{{ m.actionLabel }}</button>
              </div>
            </div>
          </template>
        </div>
        <div class="composer">
          <div class="chips">
            <button v-for="c in chips" :key="c" type="button" class="chip" @click="ask(c)">{{ c }}</button>
          </div>
          <form class="cbox" @submit.prevent="ask(input)">
            <textarea v-model="input" placeholder="比如：上个月的订阅费一共多少？" rows="2" />
            <button type="submit" class="btn sm primary">发送</button>
          </form>
        </div>
      </section>

      <div class="side-cards">
        <section class="card">
          <h2 class="h2">助手能看到什么</h2>
          <div class="sub">只读你自己的经营数据，不对外</div>
          <ul class="kvs">
            <li>收支流水 {{ txCount }} 条</li>
            <li>订单与商品（来自商业变现）</li>
            <li>预算与目标</li>
            <li>发票与税率设置</li>
          </ul>
        </section>
        <section class="card">
          <h2 class="h2">多人协作</h2>
          <div class="sub">原「财务权限」：现在只有你一个人用，先收起来</div>
          <div class="note">
            等你请了助理或会计，再在「系统设置 → 成员与权限」里给他们开只读或记账权限。权限按数据范围分：只看汇总 /
            看明细 / 可记账 / 可开票。
          </div>
          <button type="button" class="btn sm" style="margin-top: 10px" @click="router.push('/settings/logs')">
            查看操作日志
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getFinanceDashboard, getTransactionList, getPendingOrders, syncAllPendingOrders } from '@/api/finance'

defineOptions({ name: 'FinanceOpsAssistant' })

const router = useRouter()
const input = ref('')
const txCount = ref(0)
const dash = ref<any>({})
const messages = ref<
  { role: 'u' | 'a'; text: string; action?: () => void; actionLabel?: string }[]
>([])

const chips = ['本月赚了多少', '哪类内容最赚钱', '这个月花超了吗', '帮我写月度经营小结', '把这 3 笔订单记账']

async function refreshStats() {
  const [d, t] = await Promise.all([
    getFinanceDashboard(),
    getTransactionList({ page: 1, pageSize: 1 }),
  ])
  dash.value = (d as any)?.data ?? d
  txCount.value = Number((t as any)?.data?.total ?? 0)
}

async function ask(text: string) {
  const q = String(text || input.value).trim()
  if (!q) return
  messages.value.push({ role: 'u', text: q })
  input.value = ''
  const ci = Number(dash.value.totalIncome) || 0
  const ce = Number(dash.value.totalExpense) || 0
  let reply = '我可以基于你的流水、订单、预算回答。试试问：本月净利多少、订阅费花了多少、离目标还差多少。'
  let action: (() => void) | undefined
  let actionLabel = ''
  if (/赚|收入|多少钱/.test(q)) {
    reply = `本月收入 ¥${ci.toFixed(2)}，支出 ¥${ce.toFixed(2)}，净利 ¥${(ci - ce).toFixed(2)}。离目标还差 ¥${Math.max(0, (Number(dash.value.goalMonth) || 0) - ci).toFixed(2)}。`
  } else if (/小结|报告/.test(q)) {
    reply = `${new Date().getMonth() + 1} 月经营小结草稿（可直接改）：收入 ¥${ci.toFixed(2)}，净利 ¥${(ci - ce).toFixed(2)}。`
    actionLabel = '保存为月度小结'
    action = () => ElMessage.success('已保存草稿（可在导出里一起下载）')
  } else if (/记账|订单|入账/.test(q)) {
    const pending = await getPendingOrders()
    const rows = ((pending as any)?.data ?? pending ?? []) as any[]
    reply = `有 ${rows.length} 笔已付款订单还没入账，我整理成了记账草稿，确认后写入流水。`
    actionLabel = '确认入账'
    action = async () => {
      try {
        await ElMessageBox.confirm(`入账 ${rows.length} 笔订单？`, '确认', { type: 'warning' })
      } catch {
        return
      }
      await syncAllPendingOrders()
      ElMessage.success('已入账')
      await refreshStats()
    }
  }
  messages.value.push({ role: 'a', text: reply, action, actionLabel })
}

onMounted(refreshStats)
</script>

<style scoped lang="scss">
.chat-panel {
  display: flex;
  flex-direction: column;
  min-height: 420px;
}
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
}
.bub-u {
  align-self: flex-end;
  max-width: 86%;
  background: var(--ink);
  color: #fff;
  padding: 10px 12px;
  border-radius: 12px 12px 4px 12px;
  font-size: 13px;
}
.bub-a {
  background: var(--accsoft);
  padding: 12px;
  border-radius: 12px 12px 12px 4px;
  font-size: 13px;
  line-height: 1.6;
}
.composer {
  border-top: 1px solid var(--line);
  padding-top: 12px;
  margin-top: 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.cbox {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  textarea {
    flex: 1;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px;
    resize: vertical;
  }
}
.side-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.kvs {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--mute);
  li {
    padding: 4px 0;
  }
}
.note {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--as);
  color: var(--a);
  font-size: 12.5px;
  line-height: 1.6;
}
</style>
