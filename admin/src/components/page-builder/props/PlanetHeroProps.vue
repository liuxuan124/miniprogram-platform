<template>
  <div class="planet-props">
    <el-form label-width="76px" size="small">
      <!-- ── 预览身份（装修器专用） ── -->
      <BuilderFieldItem
        label="预览身份"
        hint="决定画布预览「加入按钮」与「有效期条」二选一。这只影响装修器，真机按用户真实会员态渲染。"
      >
        <BuilderSegmented
          :model-value="identity"
          :options="IDENTITY_OPTIONS"
          @update:model-value="(v: string | number) => emit('update', { preview_identity: String(v) })"
        />
      </BuilderFieldItem>
      <div class="ph-note">
        <template v-if="isGuest">
          当前是<b>未加入（游客）</b>：画布显示加入按钮，不显示有效期条。
        </template>
        <template v-else>
          当前是<b>已加入（会员）</b>：画布显示有效期条与续费入口，加入按钮隐藏。
        </template>
      </div>

      <el-divider content-position="left">基础信息</el-divider>

      <BuilderFieldItem label="数据来源">
        <BuilderSegmented
          :model-value="sourceMode"
          :options="SOURCE_OPTIONS"
          @update:model-value="(v: string | number) => emit('update', { source_mode: String(v) })"
        />
      </BuilderFieldItem>
      <div v-if="isAutoSource" class="ph-note ph-note--warn">
        数据将通过星球 OpenAPI 实时拉取，标题、副标题、图标三项<b>已锁为只读</b>
        ——它们属于星球资料，运营改了会被接口返回值覆盖。切到「手动配置」可自定义（作为接口失败时的兜底展示）。
      </div>

      <BuilderFieldItem label="图标模式">
        <BuilderSegmented
          :model-value="logoMode"
          :options="LOGO_MODE_OPTIONS"
          @update:model-value="onLogoModeChange"
        />
      </BuilderFieldItem>
      <BuilderFieldItem
        v-if="logoMode === 'emoji'"
        label="图标"
        :hint="logoHint"
      >
        <el-input
          :model-value="data.logo_value ?? ''"
          placeholder="🪐"
          maxlength="4"
          :disabled="isAutoSource"
          @input="(v: string) => emit('update', { logo_value: v })"
        />
      </BuilderFieldItem>
      <BuilderFieldItem
        v-else
        label="图标图片"
        :hint="logoImageHint"
      >
        <div class="picker-row">
          <el-input :model-value="data.logo_value || ''" readonly placeholder="未选择图片" :disabled="isAutoSource" />
          <el-button size="small" :disabled="isAutoSource" @click="logoPickerOpen = true">素材库</el-button>
        </div>
        <div v-if="data.logo_value" class="logo-preview">
          <img :src="data.logo_value" alt="" />
        </div>
      </BuilderFieldItem>

      <BuilderFieldItem
        label="标题"
        :hint="isAutoSource ? fallbackHint : ''"
      >
        <el-input
          :model-value="data.title || ''"
          :disabled="isAutoSource"
          placeholder="跨境墨太白 · 知识星球"
          @input="(v: string) => emit('update', { title: v })"
        />
      </BuilderFieldItem>
      <BuilderFieldItem
        label="副标题"
        :hint="isAutoSource ? fallbackHint : ''"
      >
        <el-input
          :model-value="data.subtitle || ''"
          :disabled="isAutoSource"
          placeholder="深度问答、资料与同路人"
          @input="(v: string) => emit('update', { subtitle: v })"
        />
      </BuilderFieldItem>

      <!-- ── 操作按钮组 ── -->
      <el-divider content-position="left">操作按钮</el-divider>

      <BuilderFieldItem
        label="加入按钮"
        hint="游客态的主操作入口。可单独关闭（比如该星球已全员开通，只做展示）。"
      >
        <el-switch
          :model-value="showJoinBtn"
          @change="(v: boolean) => emit('update', { show_join_btn: v })"
        />
      </BuilderFieldItem>
      <template v-if="showJoinBtn">
        <BuilderFieldItem label="加入文案">
          <el-input :model-value="data.join_text || ''" placeholder="加入" @input="(v: string) => emit('update', { join_text: v })" />
        </BuilderFieldItem>
        <BuilderFieldItem label="加入链接" hint="点「加入」跳到哪儿。未配置时端上会跳会员中心。">
          <PlanetLinkRow
            :link-type="data.join_link_type || 'page'"
            :link-url="data.join_link || ''"
            :invalid="linkError('join_link')"
            @change="onJoinLink"
          />
        </BuilderFieldItem>
      </template>

      <BuilderFieldItem
        label="切换按钮"
        hint="是否允许「已绑定多个星球」的会员在顶栏快速切换主星球。用户只绑定一个星球时，这个按钮没有意义，可以关掉——绝大多数单星球运营应该关。"
      >
        <el-switch
          :model-value="showSwitchBtn"
          @change="(v: boolean) => emit('update', { show_switch_btn: v })"
        />
      </BuilderFieldItem>
      <template v-if="showSwitchBtn">
        <BuilderFieldItem label="切换文案">
          <el-input :model-value="data.switch_btn_text || ''" placeholder="切换" @input="(v: string) => emit('update', { switch_btn_text: v })" />
        </BuilderFieldItem>
        <BuilderFieldItem label="切换方式">
          <BuilderSegmented
            :model-value="String(data.switch_action || 'sheet')"
            :options="SWITCH_ACTION_OPTIONS"
            @update:model-value="(v: string | number) => emit('update', { switch_action: String(v) })"
          />
        </BuilderFieldItem>
        <BuilderFieldItem v-if="switchAction === 'link'" label="切换链接" hint="点击后直接跳到该页面。">
          <PlanetLinkRow
            :link-type="data.switch_btn_link_type || 'page'"
            :link-url="data.switch_btn_link || ''"
            :invalid="linkError('switch_btn_link')"
            @change="onSwitchLink"
          />
        </BuilderFieldItem>
      </template>

      <!-- ── 有效期与权益（会员态） ── -->
      <el-divider content-position="left">有效期与权益</el-divider>

      <BuilderFieldItem
        label="有效期模块"
        :hint="`仅在「已加入（会员）」态显示。可用变量：{expire_date} 到期日、{days_left} 剩余天数、{renew} 续费文案`"
      >
        <el-switch
          :model-value="showExpireNotice"
          @change="(v: boolean) => emit('update', { show_expire_notice: v })"
        />
      </BuilderFieldItem>
      <template v-if="showExpireNotice">
        <BuilderFieldItem label="有效期文案" hint="支持模板变量，写死文本每天都会过期。">
          <el-input
            :model-value="expireTemplate"
            placeholder="会员有效期至 {expire_date} · 剩余 {days_left} 天"
            @input="(v: string) => emit('update', { expire_text: v })"
          />
        </BuilderFieldItem>
        <div class="ph-note">
          画布预览效果：{{ renderPreview }}
        </div>
        <BuilderFieldItem label="续费入口" hint="会员态下在有效期条右侧展示的续费按钮。">
          <el-switch
            :model-value="data.show_renew_btn === true"
            @change="(v: boolean) => emit('update', { show_renew_btn: v })"
          />
        </BuilderFieldItem>
        <template v-if="data.show_renew_btn === true">
          <BuilderFieldItem label="续费文案">
            <el-input :model-value="data.renew_text || ''" placeholder="续费 8 折" @input="(v: string) => emit('update', { renew_text: v })" />
          </BuilderFieldItem>
          <BuilderFieldItem label="续费链接">
            <PlanetLinkRow
              :link-type="data.renew_link_type || 'page'"
              :link-url="data.renew_link || ''"
              :invalid="linkError('renew_link')"
              @change="onRenewLink"
            />
          </BuilderFieldItem>
        </template>
      </template>

      <!-- ── 社群引导条 ── -->
      <el-divider content-position="left">社群引导条</el-divider>

      <BuilderFieldItem label="社群引导">
        <el-switch
          :model-value="showGroupNotice"
          @change="(v: boolean) => emit('update', { show_group_notice: v })"
        />
      </BuilderFieldItem>
      <template v-if="showGroupNotice">
        <BuilderFieldItem label="提示文案">
          <el-input
            :model-value="data.join_row_text || ''"
            placeholder="👥 加入球友微信群，第一时间收到更新通知"
            @input="(v: string) => emit('update', { join_row_text: v })"
          />
        </BuilderFieldItem>
        <BuilderFieldItem label="按钮文案">
          <el-input :model-value="data.join_row_go || ''" placeholder="去加入 ›" @input="(v: string) => emit('update', { join_row_go: v })" />
        </BuilderFieldItem>
        <BuilderFieldItem
          label="加群动作"
          hint="点整条引导后做什么。群活码弹窗适合二维码运营；跳转链接适合已有加群页。"
        >
          <BuilderSegmented
            :model-value="groupActionType"
            :options="GROUP_ACTION_OPTIONS"
            @update:model-value="onGroupActionChange"
          />
        </BuilderFieldItem>

        <BuilderFieldItem
          v-if="groupActionType === 'link'"
          label="加群链接"
          :required="groupLinkMissing"
        >
          <PlanetLinkRow
            :link-type="data.group_link_type || 'page'"
            :link-url="data.group_link || ''"
            :invalid="groupLinkMissing"
            :invalid-text="GROUP_LINK_REQUIRED"
            @change="onGroupLink"
          />
        </BuilderFieldItem>
        <template v-else>
          <BuilderFieldItem label="群二维码" hint="弹窗里展示的二维码 / 客服微信图。建议正方形。">
            <div class="picker-row">
              <el-input :model-value="data.group_qr_image || ''" readonly placeholder="未选择图片" />
              <el-button size="small" @click="qrPickerOpen = true">素材库</el-button>
            </div>
            <div v-if="data.group_qr_image" class="logo-preview">
              <img :src="data.group_qr_image" alt="" />
            </div>
          </BuilderFieldItem>
          <BuilderFieldItem label="弹窗主标题">
            <el-input
              :model-value="data.group_modal_title || ''"
              placeholder="扫码加入球友群"
              maxlength="16"
              @input="(v: string) => emit('update', { group_modal_title: v })"
            />
          </BuilderFieldItem>
          <BuilderFieldItem label="引导文案">
            <el-input
              :model-value="data.group_modal_desc || ''"
              placeholder="长按识别二维码，第一时间收到更新通知"
              maxlength="30"
              @input="(v: string) => emit('update', { group_modal_desc: v })"
            />
          </BuilderFieldItem>
        </template>
      </template>

      <!-- ── KPI 卡片 ── -->
      <el-divider content-position="left">KPI 卡片</el-divider>

      <div class="ph-kpi-head">
        <span>
          核心数据项
          <FieldHint text="顶栏下方的一排数字。宽度按数量自动平分，配 4 项会均分成四列。留空的数值/名称不占位。" />
        </span>
        <div class="ph-kpi-ops">
          <el-tooltip
            :content="kpiMaxTip"
            placement="top"
            :show-after="200"
          >
            <span class="ph-kpi-add">
              <el-button
                size="small"
                text
                :disabled="kpiAtMax"
                @click="addKpi"
              >
                + 添加
              </el-button>
            </span>
          </el-tooltip>
          <span class="ph-kpi-count" :class="{ 'is-full': kpiAtMax }">
            {{ kpis.length }} / {{ PLANET_KPI_MAX }}
          </span>
        </div>
      </div>
      <div v-if="!kpis.length" class="ph-note ph-note--warn">
        还没有 KPI 数据项，画布会隐藏这一行。点「+ 添加」新建。
      </div>
      <div v-for="(item, idx) in kpis" :key="idx" class="ph-kpi-row">
        <div class="ph-kpi-row__fields">
          <el-input
            :model-value="item.value || ''"
            placeholder="数值 / 统计量"
            title="数值 / 统计量"
            @input="(v: string) => patchKpi(idx, { value: v })"
          />
          <el-input
            :model-value="item.label || ''"
            placeholder="指标名称"
            title="指标名称"
            @input="(v: string) => patchKpi(idx, { label: v })"
          />
          <el-input
            :model-value="item.suffix || ''"
            placeholder="单位/标牌（选填）"
            title="单位/标牌（选填）"
            class="ph-kpi-suffix"
            @input="(v: string) => patchKpi(idx, { suffix: v })"
          />
        </div>
        <el-tooltip content="删除该项" placement="top">
          <button
            type="button"
            class="ph-kpi-del"
            :disabled="kpis.length <= PLANET_KPI_MIN"
            :aria-label="`删除第 ${idx + 1} 项`"
            @click="removeKpi(idx)"
          >
            ✕
          </button>
        </el-tooltip>
        <p v-if="!String(item.value || '').trim() || !String(item.label || '').trim()" class="ph-kpi-warn">
          第 {{ idx + 1 }} 项：数值与指标名称至少要填一项，否则画布上是一块空白。
        </p>
      </div>
    </el-form>

    <AssetPickerDialog v-model="logoPickerOpen" @select="(url: string) => emit('update', { logo_value: url })" />
    <AssetPickerDialog v-model="qrPickerOpen" @select="(url: string) => emit('update', { group_qr_image: url })" />
  </div>
</template>

<script setup lang="ts">
/**
 * 星球顶栏（PlanetHeader）属性面板 —— 内容 Tab。
 *
 * 本轮结构决策：
 * ① 顶部加「预览身份」分段，这是**装修器专用**开关：真机身份由用户真实会员态决定，
 *    但运营需要能切着看两种效果，否则面板改的东西无法判断上线后长什么样。
 * ② 「切换」按钮此前写死在渲染器里、面板无开关 → 补 show_switch_btn / 文案 / 跳转。
 * ③ 加群条此前只有文案没有动作 → 加 group_action_type（跳转 / 二维码弹窗）二态。
 * ④ 图标从纯文本框升级为 Emoji / 图片双模（复用 AssetPickerDialog）。
 * ⑤ source_mode=auto 时把内容字段置只读 + 明确提示「走 OpenAPI 实时拉取」。
 * ⑥ KPI 从固定 4 行改为可增删的动态列表（2~4 项），支持单位后缀。
 *
 * 视觉项（背景/圆角/内边距/KPI 卡样式）放在样式 Tab，见 PlanetHeroStyleProps.vue。
 */
import { computed, ref } from 'vue'
import BuilderFieldItem from '../BuilderFieldItem.vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import FieldHint from '../FieldHint.vue'
import PlanetLinkRow from './PlanetLinkRow.vue'
import AssetPickerDialog from '@/components/AssetPickerDialog.vue'
import {
  PLANET_CONTENT_DEFAULTS,
  PLANET_KPI_MAX,
  PLANET_KPI_MIN,
  renderExpireTemplate,
  resolveLogoMode,
  type PlanetLogoMode,
} from '../planetHeroConfig'

/**
 * ⚠️ `data` 是**解构出来的普通对象**，不是 ref —— 读值必须写 `data.xxx`。
 * 此前全篇写成 `data.value?.xxx`（13 处），值恒为 undefined：
 * 于是所有 computed 都在读「空配置」，
 * `identity` 永远算出 'guest'，切到「会员」后 modelValue 与点击值相同，
 * BuilderSegmented 的 `if (value === modelValue) return` 直接吞掉事件 ——
 * 表现就是**所有分段选择器点了没反应**。
 * 判据：computed 依赖的是 props 里的字段，模板里 `:model-value` 传 computed 名（不带 .value）。
 */
const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const IDENTITY_OPTIONS = [
  { value: 'guest', label: '未加入（游客）' },
  { value: 'member', label: '已加入（会员）' },
]
const SOURCE_OPTIONS = [
  { value: 'auto', label: '接口自动' },
  { value: 'manual', label: '手动配置' },
]
const LOGO_MODE_OPTIONS = [
  { value: 'emoji', label: 'Emoji' },
  { value: 'image', label: '图标库' },
]
const SWITCH_ACTION_OPTIONS = [
  { value: 'sheet', label: '半屏切换' },
  { value: 'link', label: '跳转链接' },
]
const GROUP_ACTION_OPTIONS = [
  { value: 'link', label: '跳转链接' },
  { value: 'qrcode', label: '群活码弹窗' },
]

const identity = computed(() =>
  data.preview_identity === 'member' ? 'member' : 'guest',
)
const isGuest = computed(() => identity.value === 'guest')
const sourceMode = computed(() => (data.source_mode === 'manual' ? 'manual' : 'auto'))
const isAutoSource = computed(() => sourceMode.value === 'auto')

/**
 * 图标模式：**优先读显式 `logo_mode`**，缺省时才从值反推。
 *
 * ⚠️ 这里原先只写 `resolveLogoMode(data.logo_value ?? data.logo_emoji)`，
 * 完全忽略了 `logo_mode` 字段。而 `onLogoModeChange` 切模式时会把 logo_value 清空，
 * 于是：点「图标库」→ logo_mode='image' 但 logo_value='' → 反推又得到 'emoji'
 * → 高亮弹回 Emoji → **第二次点击时 modelValue 与点击值相同，
 * BuilderSegmented 的 `if (value === modelValue) return` 吞掉事件**。
 * 表现就是「图标模式切不过去，且来回都切不动」。
 *
 * 老 DSL（只有 logo_emoji）没有 logo_mode，仍走值反推，行为不变。
 */
const logoMode = computed<PlanetLogoMode>(() => {
  const declared = String(data.logo_mode || '')
  if (declared === 'emoji' || declared === 'image') return declared
  return resolveLogoMode(data.logo_value ?? data.logo_emoji)
})

const showJoinBtn = computed(() => data.show_join_btn !== false)
const showSwitchBtn = computed(() => data.show_switch_btn === true)
const switchAction = computed(() => (data.switch_action === 'link' ? 'link' : 'sheet'))
const groupActionType = computed(() =>
  data.group_action_type === 'qrcode' ? 'qrcode' : 'link',
)
const showGroupNotice = computed(() => data.show_group_notice !== false)

/** 老 DSL 只有 expire_text 文本、无开关：文本非空即视为开启 */
const showExpireNotice = computed(() => {
  if (data.show_expire_notice !== undefined) return data.show_expire_notice === true
  return String(data.expire_text || '').trim() !== ''
})

const expireTemplate = computed(() => data.expire_text ?? '')
const renderPreview = computed(() => renderExpireTemplate(expireTemplate.value))

const logoPickerOpen = ref(false)
const qrPickerOpen = ref(false)

const kpis = computed<Array<Record<string, string>>>(() =>
  Array.isArray(data.kpis) ? data.kpis : PLANET_CONTENT_DEFAULTS.kpis,
)

/* ---------------- 校验：阻止空链接上线 ---------------- */

/**
 * 社群引导开启 + 动作为「跳转链接」时，加群链接必填。
 *
 * 为什么必须拦：端上 `onJoinRow` 对 link 模式直接 `wx.navigateTo({url})`，
 * url 为空会跳失败并静默停在原地 —— 用户看到的是「点了没反应」，
 * 线上既没报错也没日志，事后极难定位。
 */
const GROUP_LINK_REQUIRED = '请选择加群跳转页面'
const groupLinkMissing = computed(
  () => showGroupNotice.value && groupActionType.value === 'link' && !String(data.group_link || '').trim(),
)

/** 通用空链接判据：面板层只提示，不硬拦（加入/续费留了端上兜底默认值） */
function linkError(key: string): boolean {
  if (key === 'group_link') return groupLinkMissing.value
  return false
}

/* ---------------- KPI 上限 ---------------- */

const kpiAtMax = computed(() => kpis.value.length >= PLANET_KPI_MAX)
const kpiMaxTip = computed(() =>
  kpis.value.length >= PLANET_KPI_MAX
    ? `最多配置 ${PLANET_KPI_MAX} 项 KPI。删掉一项才能再加。`
    : `还能再加 ${PLANET_KPI_MAX - kpis.value.length} 项`,
)

function patchKpi(index: number, patch: Record<string, string>) {
  emit('update', {
    kpis: kpis.value.map((it, i) => (i === index ? { ...it, ...patch } : it)),
  })
}

function addKpi() {
  if (kpis.value.length >= PLANET_KPI_MAX) return
  emit('update', { kpis: [...kpis.value, { value: '', label: '', suffix: '' }] })
}

function removeKpi(index: number) {
  if (kpis.value.length <= PLANET_KPI_MIN) return
  emit('update', { kpis: kpis.value.filter((_, i) => i !== index) })
}

function onLogoModeChange(v: string | number) {
  // 切模式时清掉旧值，避免 URL 留在 emoji 框里 / emoji 文本被当图片 src
  emit('update', { logo_mode: String(v), logo_value: '' })
}

function onGroupActionChange(v: string | number) {
  emit('update', { group_action_type: String(v) })
}

/* ---------------- 链接四件套 ----------------
 * PlanetLinkRow 把 LinkPickerField 的两个独立事件收敛成 change({type,url})，
 * 这里只负责把值落到各自的字段名上。四个链接的字段名不同，故各写一个具名函数，
 * 不用模板内联 —— 模板里的行内带类型注解的对象会被 vue-tsc 判为语法错。 */
type LinkValue = { type: string; url: string }

const onJoinLink = (v: LinkValue) => emit('update', { join_link_type: v.type, join_link: v.url })
const onSwitchLink = (v: LinkValue) => emit('update', { switch_btn_link_type: v.type, switch_btn_link: v.url })
const onRenewLink = (v: LinkValue) => emit('update', { renew_link_type: v.type, renew_link: v.url })
const onGroupLink = (v: LinkValue) => emit('update', { group_link_type: v.type, group_link: v.url })

/* ---------------- 只读态提示文案 ---------------- */
const logoHint = computed(() =>
  isAutoSource.value
    ? '当前是「接口自动」，图标由星球资料决定，此处只读。切「手动配置」后可自定义。'
    : '直接填一个 Emoji。不同机型渲染有差异，重要视觉建议改用「图标库」上传品牌图。',
)
const logoImageHint = computed(() =>
  isAutoSource.value
    ? '当前是「接口自动」，图标由星球资料决定，此处只读。切「手动配置」后可上传。'
    : '从素材库选图。建议正方形，裁切后按圆形展示。',
)
const fallbackHint = 'OpenAPI 失败时的兜底展示值。切「手动配置」可编辑。'
</script>

<style scoped lang="scss">
.ph-note {
  padding: 6px 9px;
  margin-bottom: 10px;
  color: #6b7a8d;
  font-size: 11px;
  line-height: 1.5;
  background: #f5f7fb;
  border-radius: 6px;

  b {
    color: #8c3208;
  }
}

.ph-note--warn {
  color: #9a5b12;
  background: #fdf6ec;
  border: 1px solid #f0dfc4;
}

.picker-row {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.logo-preview {
  margin-top: 6px;

  img {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border: 1px solid #e8dfd3;
    border-radius: 8px;
  }
}

.ph-kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}
.ph-kpi-head > span { display: inline-flex; align-items: center; }

.ph-kpi-ops {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: none;
}
/* Tooltip 需要真实元素承载：disabled 的按钮不触发 tooltip */
.ph-kpi-add { display: inline-flex; }

.ph-kpi-count {
  color: #94a3b8;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ph-kpi-count.is-full { color: #e6a23c; font-weight: 600; }

/*
 * KPI 行改成「字段区 + 删除键」两列：
 * 三个输入框在窄面板里横向排会被压到 40px 占位符都放不下，
 * 改为 2×2 网格（数值/名称一行，单位一行）后可读性明显更好。
 */
.ph-kpi-row {
  display: grid;
  grid-template-columns: 1fr 22px;
  align-items: start;
  gap: 5px;
  margin-bottom: 8px;
  padding: 6px 6px 7px;
  background: #fbfcfe;
  border: 1px solid #e6ebf3;
  border-radius: 8px;
}
.ph-kpi-row__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  min-width: 0;
}
.ph-kpi-row__fields > :nth-child(3) { grid-column: 1 / -1; }

.ph-kpi-del {
  display: grid;
  place-items: center;
  width: 22px;
  height: 24px;
  padding: 0;
  color: #94a3b8;
  font-size: 12px;
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.ph-kpi-del:hover:not(:disabled) { color: #b42318; background: #fef0f0; }
.ph-kpi-del:disabled { opacity: 0.35; cursor: not-allowed; }

.ph-kpi-warn {
  grid-column: 1 / -1;
  margin: 0;
  color: #e6a23c;
  font-size: 11px;
  line-height: 1.45;
}
</style>
