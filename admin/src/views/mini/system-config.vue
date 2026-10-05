<template>
  <div class="mini-wb mw-page" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <MiniOpsConceptBanner variant="appearance" />

        <div class="head-row">
          <div>
            <h1 class="h1">系统配置</h1>
            <div class="sub">
              小程序自身的功能与页面配置。这里管的是「用户在小程序里看到什么」，
              与后台自己的「系统设置」是两件事。
            </div>
          </div>
          <div class="actions">
            <button type="button" class="btn soft" @click="router.push('/mini/pages')">管理页面 ›</button>
          </div>
        </div>

        <!-- 🔴 与后台系统设置的边界说明：这是最容易混淆的地方，必须显眼 -->
        <section class="card scope-card">
          <div class="scope-grid">
            <div class="scope-col scope-on">
              <div class="scope-head">
                <span class="tag t-acc">本页管</span>
                <strong>小程序配置</strong>
              </div>
              <ul class="scope-list">
                <li>登录页文案与开关</li>
                <li>个人中心（我的）展示项</li>
                <li>小程序功能开关</li>
                <li>客服入口与协议</li>
              </ul>
              <p class="faint scope-foot">
                改动存入草稿，在「发布与版本」统一发布后生效。
              </p>
            </div>
            <div class="scope-col">
              <div class="scope-head">
                <span class="tag t-slot">不在本页</span>
                <strong>后台系统设置</strong>
              </div>
              <ul class="scope-list">
                <li>管理员账号与角色权限</li>
                <li>微信 AppID / 支付商户</li>
                <li>存储与上传密钥</li>
                <li>短信与邮件通道</li>
              </ul>
              <button type="button" class="btn sm soft scope-btn" @click="router.push('/settings/basic')">
                去后台系统设置
              </button>
            </div>
          </div>
        </section>

        <!-- 完成度总览 -->
        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">配置完成度</h2>
              <div class="sub">逐项核对真实配置，缺失项直接给处理入口</div>
            </div>
            <span class="tag" :class="doneCount === items.length ? 't-live' : 't-pending'">
              {{ doneCount }} / {{ items.length }} 项已配置
            </span>
          </div>

          <ul class="cfg-list">
            <li v-for="item in items" :key="item.key" class="cfg-item" :class="`cfg-${item.state}`">
              <span class="cfg-state">
                <MiniIcon :name="item.state === 'done' ? 'check' : item.state === 'partial' ? 'warn' : 'info'" :size="14" />
              </span>
              <div class="cfg-body">
                <div class="cfg-title">
                  <strong>{{ item.title }}</strong>
                  <span class="tag" :class="item.state === 'done' ? 't-live' : item.state === 'partial' ? 't-pending' : 't-slot'">
                    {{ stateText(item.state) }}
                  </span>
                  <span v-if="item.builtin" class="tag t-draft">内置</span>
                </div>
                <p class="faint cfg-desc">{{ item.desc }}</p>
                <p v-if="item.detail" class="faint cfg-detail">{{ item.detail }}</p>
                <div v-if="item.actions.length" class="cfg-actions">
                  <button
                    v-for="(a, i) in item.actions"
                    :key="i"
                    type="button"
                    class="btn sm"
                    :class="i === 0 ? 'primary' : 'soft'"
                    @click="a.event ? emitAction(item.key, a.event) : router.push(a.to!)"
                  >
                    {{ a.label }}
                  </button>
                </div>
                <!-- 能力受限就如实说，不要假装能配 -->
                <p v-if="item.limitNote" class="cfg-limit">
                  <MiniIcon name="info" :size="12" />
                  {{ item.limitNote }}
                </p>
              </div>
            </li>
          </ul>
        </section>

        <!-- 功能开关：只读展示名称/说明/影响，明细去系统设置改 -->
        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">功能开关现状</h2>
              <div class="sub">
                小程序各功能的当前生效状态。
                <b>开关的修改入口在「后台系统设置」</b>——它们存在后台配置体系里，不在本页可改。
              </div>
            </div>
            <button type="button" class="btn sm soft" @click="router.push('/settings/basic')">
              去后台系统设置修改
            </button>
          </div>

          <!-- 🔴 读不到就说读不到，不用空列表冒充「0 个开关」 -->
          <div v-if="!flags" class="flags-unread">
            <MiniIcon name="warn" :size="14" />
            <div>
              <strong>未能读取到功能开关配置</strong>
              <span class="faint">
                可能是尚未配置，也可能是配置格式与预期不同。请到「后台系统设置」确认，
                本页不会在读不到数据时显示「全部正常」。
              </span>
            </div>
          </div>

          <div v-else class="flag-grid">
            <div v-for="f in flags" :key="f.key" class="flag-item" :class="{ 'flag-off': !f.on }">
              <span class="flag-dot" :class="f.on ? 'on' : 'off'" />
              <div class="flag-body">
                <div class="flag-head">
                  <span class="flag-name">{{ f.label }}</span>
                  <code class="flag-key">{{ f.key }}</code>
                  <span class="tag" :class="f.on ? 't-live' : 't-slot'">
                    {{ f.on ? '已启用' : '未启用' }}
                  </span>
                  <span v-if="!f.explicit" class="tag t-draft" title="配置里没有这一项，按默认值显示">默认</span>
                </div>
                <p class="faint flag-desc">{{ f.desc }}</p>
                <p class="faint flag-effect">{{ f.effect }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 系统配置聚合页（工作流第 2 环）
 *
 * 🔴 这一页最容易做成「重复入口」，所以定死两条边界：
 * 1. 只聚合**已经有配置页**的部分（登录页 / 我的页），点进去仍然是原来的配置页，
 *    本页不重复实现一遍表单——重复实现必然两边口径漂移；
 * 2. 客服与协议：本系统确实没有对应配置接口，如实标注限制并指向真实存在的地方，
 *    绝不画一个假的配置表单。
 *
 * 页面不自己发请求做判定，状态统一来自 useBuildWorkbench（单一真相源）。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniOpsConceptBanner from '@/components/mini/MiniOpsConceptBanner.vue'
import { useBuildWorkbench, configJson } from '@/composables/useBuildWorkbench'
import { parseFeatureFlags } from '@/constants/featureMeta'

defineOptions({ name: 'MiniSystemConfig' })

type ItemState = 'done' | 'partial' | 'todo'

type CfgItem = {
  key: string
  title: string
  desc: string
  state: ItemState
  detail?: string
  builtin?: boolean
  limitNote?: string
  actions: Array<{ label: string; to?: string; event?: string }>
}

const router = useRouter()
const { facts, stages, loading, loaded, refresh } = useBuildWorkbench()

function stateText(s: ItemState) {
  return s === 'done' ? '已配置' : s === 'partial' ? '部分配置' : '未配置'
}

/** 从工作台状态机里取「系统配置」这一环的判定，不重写一套 */
const systemStage = computed(() => stages.value.find((s) => s.key === 'system'))

function isDone(text: string) {
  return systemStage.value?.doneItems.some((d) => d.includes(text)) ?? false
}

const items = computed<CfgItem[]>(() => {
  const cfg = facts.value.configMap || {}
  const login = configJson(cfg, 'loginPageConfig') as Record<string, unknown> | null
  const mine = (configJson(cfg, 'minePageConfig') as Record<string, unknown> | null) || {}
  const done = systemStage.value?.doneItems || []

  return [
    {
      key: 'login',
      title: '登录页',
      desc: '登录弹窗的主标、副标题、按钮文案与安全提示',
      state: login && Object.keys(login).length ? 'done' : 'partial',
      detail: login && Object.keys(login).length
        ? `已配置 ${Object.keys(login).length} 项文案/开关`
        : '未配置时使用小程序内置默认文案',
      actions: [{ label: '配置登录页', to: '/page-builder/login' }],
    },
    {
      key: 'mine',
      title: '个人中心（我的）',
      desc: '会员卡、订单入口、菜单项与个人资料展示',
      state: Object.keys(mine).length ? 'done' : 'partial',
      detail: Object.keys(mine).length
        ? `已配置 ${Object.keys(mine).length} 项`
        : '未配置时使用默认布局',
      actions: [{ label: '配置我的页', to: '/page-builder/mine' }],
    },
    {
      key: 'flags',
      title: '功能开关',
      desc: '控制小程序各功能的开放与关闭（会员、星球、商品、评论等）',
      state: flags.value?.some((f) => f.on) ? 'done' : 'partial',
      detail: flags.value
        ? `已启用 ${flags.value.filter((f) => f.on).length} 项 / 共 ${flags.value.length} 项`
        : '未能读取到开关配置，无法确认各功能是否按预期开放',
      actions: [{ label: '去后台系统设置修改', to: '/settings/basic' }],
      limitNote: '开关存放在后台配置体系里，本页只读展示状态与影响；'
        + '修改入口在「后台系统设置」。两处都能改会让「谁生效」说不清，所以只保留一处入口。',
    },
    {
      key: 'support',
      title: '客服',
      desc: '小程序内的客服入口',
      state: 'todo',
      detail: done.find((d) => d.includes('客服')) || '尚未接入',
      actions: [{ label: '去客服中心', to: '/member/support' }],
      limitNote: '尚未接入客服通道，'
        + '当前客服能力由「用户管理›客服中心」维护',
    },
    {
      key: 'protocol',
      title: '用户协议与隐私政策',
      desc: '注册与登录前的协议文本',
      state: 'todo',
      detail: '尚未配置',
      actions: [],
      limitNote: '尚未配置用户协议，'
        + '需在代码或微信后台维护，当前无可配置入口',
    },
  ]
})

const doneCount = computed(() => items.value.filter((i) => i.state === 'done').length)

/**
 * 功能开关只读展示。
 * 🔴 2026-10-06 修复「12 个功能名全显示 [object Object]」：
 * plugins 的真实结构是对象数组 [{key, enabled}]（端上 system.js:617 同口径），
 * 原来按字符串数组解析 → String({...}) → 必然 [object Object]。
 * 现在统一走 parseFeatureFlags，它兼容三种历史形态并给出中文名；
 * 认不出来时返回 null → 页面显示「读不到」，不返回空数组冒充成功。
 */
const flags = computed(() => parseFeatureFlags(
  configJson(facts.value.configMap || {}, 'plugins')
  ?? configJson(facts.value.configMap || {}, 'featureFlags'),
))

function emitAction(key: string, event: string) {
  ElMessage.info({ login: '即将跳转到登录页配置', mine: '即将跳转到我的页配置' }[key] || event)
}

onMounted(() => {
  void refresh()
})
</script>

<style scoped lang="scss">
.scope-card { border-left: 3px solid var(--acc, #b4430f); }

.scope-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.scope-col {
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;
  padding: 12px 14px;
}

.scope-on {
  background: rgba(180, 67, 15, 0.04);
  border-color: rgba(180, 67, 15, 0.25);
}

.scope-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.scope-list {
  margin: 0 0 10px;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--wb-text, #3d3630);
}

.scope-foot {
  font-size: 11.5px;
  line-height: 1.5;
  margin: 0;
}

.scope-btn { margin-top: 4px; }

.cfg-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.cfg-item {
  display: flex;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;
}

.cfg-done { border-left: 3px solid #2f7d4f; }
.cfg-partial { border-left: 3px solid #b46e0f; }
.cfg-todo { border-left: 3px solid #c9c1b5; }

.cfg-state {
  flex: none;
  margin-top: 2px;
  display: inline-flex;
}

.cfg-done .cfg-state { color: #2f7d4f; }
.cfg-partial .cfg-state { color: #b46e0f; }
.cfg-todo .cfg-state { color: #9a9184; }

.cfg-body {
  flex: 1;
  min-width: 0;
}

.cfg-title {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 13.5px;
  margin-bottom: 3px;
}

.cfg-desc {
  font-size: 12.5px;
  margin: 0 0 3px;
  line-height: 1.55;
}

.cfg-detail {
  font-size: 11.5px;
  margin: 0 0 7px;
  line-height: 1.5;
}

.cfg-actions {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.cfg-limit {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin: 8px 0 0;
  font-size: 11.5px;
  line-height: 1.55;
  color: #8a6a3a;
  background: rgba(180, 110, 15, 0.07);
  padding: 6px 9px;
  border-radius: 7px;
}

.flag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: 9px;
}

.flag-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 12px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 9px;
}

.flag-off { background: rgba(0, 0, 0, 0.015); }

.flag-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
  margin-top: 5px;
  &.on { background: #2f7d4f; }
  &.off { background: #c9c1b5; }
}

.flag-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.flag-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.flag-name {
  font-size: 13px;
  font-weight: 600;
}

.flag-key {
  font-size: 10.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--wb-muted, #8a8276);
  background: rgba(0, 0, 0, 0.04);
  padding: 1px 5px;
  border-radius: 4px;
}

.flag-desc {
  font-size: 11.5px;
  line-height: 1.5;
  margin: 0;
}

.flag-effect {
  font-size: 11px;
  line-height: 1.5;
  margin: 0;
  opacity: 0.85;
}

/* 🔴 读不到配置时不能显示「0 个开关」 */
.flags-unread {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 9px;
  background: rgba(180, 40, 40, 0.06);
  color: #972626;

  > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  strong { font-size: 13px; }

  .faint { font-size: 11.5px; line-height: 1.55; }
}
</style>