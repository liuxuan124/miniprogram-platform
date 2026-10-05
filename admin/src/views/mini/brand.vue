<template>
  <div class="mini-wb mw-page" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <!--
          2026-10-06 统一框架：原来这一页用 .head-row + .h1 + .sub 手写头部，
          与固定页（我的/登录）的 PageHeader 是两套标题字号与按钮间距。
          现在改用同一个 PageHeader，视觉与保存状态位置全站一致。
          原先挂在头部的 MiniOpsConceptBanner 一并移除 ——
          「草稿 vs 线上」已由 SaveStateBar + 折叠规则区说清，再挂一条就是重复。
        -->
        <PageHeader
          title="品牌信息"
          description="全局品牌配置：名称、Logo、品牌色与默认分享文案。这里改的是全局值，没单独覆盖的页面都会继承它。"
          :status="saveState"
          help-title="全局值与页面覆盖的关系"
          :on-retry="flushAllDrafts"
        >
          <template #actions>
            <el-button @click="router.push('/mini/navigation')">导航配置</el-button>
            <el-button type="primary" @click="router.push('/mini/publish')">去发布与版本</el-button>
          </template>

          <template #help>
            <ul class="rule-list">
              <li><b>全局 vs 页面覆盖</b>：本页是全局值；某个页面在「页面配置」里单独设了分享标题/图，就只覆盖那一页。</li>
              <li><b>整店模板的影响</b>：套用整店模板会用模板自带的品牌值覆盖本页，属于主动行为。</li>
              <li><b>生效方式</b>：改动自动存入草稿，线上不立即变；到「发布与版本」发布配置后才对用户生效。</li>
              <li><b>品牌色的影响面</b>：主色会作用于导航选中态、主按钮与强调组件，页面内单独设的颜色不受影响。</li>
            </ul>
          </template>
        </PageHeader>

        <!--
          🔴 2026-10-06 移除 MiniOpsConceptBanner：
          草稿/线上的说明已由头部 SaveStateBar + 折叠规则区承担，
          这里再挂一条横幅就是同一句话说三遍。
        -->

        <!--
          保存状态已上移到 PageHeader 的 SaveStateBar（位置固定、紧邻操作）。
          这里只保留它不表达的信息：待发布总数 + 当前整店模板。
        -->
        <div class="draft-state">
          <span v-if="site.pendingCount" class="tag t-pending">
            共 {{ site.pendingCount }} 项待发布
          </span>
          <span class="faint">当前整店模板：{{ templateLabel }}</span>
        </div>

        <!-- 继承关系说明：这层最容易让人改错，必须写在最上面 -->
        <section class="card">
          <div class="head" style="margin-bottom: 10px">
            <div>
              <h2 class="h2">配置层级与继承</h2>
              <div class="sub">搞不清改哪里会被覆盖，就先看这张表</div>
            </div>
          </div>
          <div class="inherit-table">
            <div class="inherit-row inherit-head">
              <span class="inherit-cell">层级</span>
              <span class="inherit-cell">管什么</span>
              <span class="inherit-cell">在哪改</span>
              <span class="inherit-cell">生效范围</span>
            </div>
            <div
              v-for="row in INHERIT_ROWS"
              :key="row.level"
              class="inherit-row"
              :class="{ 'inherit-row-on': row.current }"
            >
              <span class="inherit-cell">
                {{ row.level }}
                <span v-if="row.current" class="tag t-acc" style="margin-left: 6px">当前页</span>
              </span>
              <span class="inherit-cell">{{ row.scope }}</span>
              <span class="inherit-cell">{{ row.where }}</span>
              <span class="inherit-cell faint">{{ row.effect }}</span>
            </div>
          </div>
          <p class="faint" style="margin: 10px 0 0; font-size: 12px; line-height: 1.6">
            规则：页面级设置只覆盖本页，没设的项继续用这里的全局值。所以全局值改动会同时影响所有「没单独覆盖」的页面。
          </p>
        </section>

        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">基本标识</h2>
              <div class="sub">小程序名称、眉题与 Logo</div>
            </div>
          </div>

          <div class="brand-fields">
            <label class="kv">
              <span>小程序名称 <em class="req">必填</em></span>
              <input v-model="brandForm.appName" class="input" maxlength="20" placeholder="展示在微信小程序顶栏" />
              <span class="faint kv__hint">{{ brandForm.appName.length }}/20，微信要求 2~20 个字</span>
            </label>
            <label class="kv">
              <span>品牌眉题（英文）</span>
              <input v-model="brandForm.brandEyebrow" class="input" maxlength="32" placeholder="例如 CROSS-BORDER NOTES" />
              <span class="faint kv__hint">用于登录页顶部的一行小字英文</span>
            </label>
            <label class="kv kv--wide">
              <span>品牌介绍</span>
              <textarea
                v-model="brandForm.intro"
                class="input textarea"
                maxlength="80"
                rows="2"
                placeholder="一句话说明这个小程序是做什么的"
              />
              <span class="faint kv__hint">{{ (brandForm.intro || '').length }}/80，用于个人中心与关于页</span>
            </label>
            <label class="kv">
              <span>登录页副标题</span>
              <input v-model="brandForm.loginTagline" class="input" maxlength="40" placeholder="例如 想认识一下你，可以吗？" />
              <span class="faint kv__hint">登录弹窗顶部那句话</span>
            </label>
          </div>

          <div class="brand-upload">
            <span class="kv__label">品牌 Logo</span>
            <div class="brand-upload__row">
              <span class="brand-upload__preview">
                <img v-if="brandLogoUrl" :src="brandLogoUrl" alt="品牌 Logo 预览" />
                <span v-else class="brand-upload__ph">
                  <MiniIcon name="img" :size="18" />
                </span>
              </span>
              <div class="brand-upload__ops">
                <button type="button" class="btn sm" :disabled="logoUploading" @click="pickLogoFile">
                  <MiniIcon name="upload" :size="14" />
                  {{ logoUploading ? '上传中…' : '本地上传' }}
                </button>
                <AssetPickerButton label="从素材库选" :disabled="logoUploading" @select="onLogoPicked" />
                <button v-if="brandLogoUrl" type="button" class="link" @click="clearLogo">移除</button>
              </div>
              <input
                ref="logoInputRef"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden-file"
                @change="onLogoFileChosen"
              />
            </div>
            <p class="faint" style="margin: 6px 0 0; font-size: 12px; line-height: 1.5">
              建议正方形 PNG（≥ 512×512），用于分享卡片、登录弹窗与个人中心头部。
            </p>
          </div>
        </section>

        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">品牌配色</h2>
              <div class="sub">主色用于导航选中态、按钮和强调组件；改动会自动存入草稿</div>
            </div>
            <button v-if="themeDirty" type="button" class="btn sm soft" @click="undoThemeChange">
              改回 {{ currentTheme || '默认色' }}
            </button>
          </div>
          <div class="swatches">
            <button
              v-for="c in THEMES"
              :key="c"
              type="button"
              class="sw"
              :class="{ on: shownTheme === c }"
              :style="{ background: c }"
              :aria-label="`主色 ${c}`"
              :aria-pressed="shownTheme === c"
              @click="applyTheme(c)"
            />
            <label class="sw-custom" title="自定义品牌色">
              <span class="sw-custom__dot" :style="{ background: shownTheme || FALLBACK_COLOR }" />
              <span class="sw-custom__txt">自定义</span>
              <input
                type="color"
                class="sw-custom__input"
                :value="normalizeHex(shownTheme) || FALLBACK_COLOR.slice(1)"
                aria-label="自定义主色"
                @input="onCustomColor(($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="hex-field" title="输入品牌 VI 标准色号">
              <span class="hex-field__hash">#</span>
              <input
                v-model="hexInput"
                class="hex-field__input"
                maxlength="6"
                :placeholder="normalizeHex(shownTheme).slice(1) || FALLBACK_COLOR.slice(1)"
                @input="onHexInput(hexInput)"
                @blur="commitHex"
                @keyup.enter="commitHex"
              />
            </label>
          </div>
          <!-- 当前生效色读数：色板/取色器/HEX/预览四处的唯一真相就是它 -->
          <p class="faint theme-readout">
            当前生效主色：<b>{{ currentTheme || '未设置（将使用默认色 ' + FALLBACK_COLOR + '）' }}</b>
            <span v-if="themeDirty">，预览中为 {{ shownTheme }}</span>
          </p>
          <div class="draft-inline">
            <span class="tag" :class="themeDraft.state.value === 'error' ? 't-err' : 't-draft'">
              {{ themeDraftText }}
            </span>
            <span v-if="undoTarget" class="faint">上一次主色 {{ undoTarget }}</span>
          </div>
        </section>

        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">默认分享信息</h2>
              <div class="sub">转发卡片与分享弹窗的默认文案；单页可在页面配置里覆盖</div>
            </div>
          </div>
          <div class="brand-fields">
            <label class="kv">
              <span>默认分享标题</span>
              <input
                v-model="shareTitle"
                class="input"
                maxlength="60"
                placeholder="转发时默认带的标题"
              />
              <span class="faint kv__hint">{{ shareTitle.length }}/60</span>
            </label>
            <label class="kv">
              <span>分享描述</span>
              <input v-model="shareDesc" class="input" maxlength="120" placeholder="选填，一句话补充信息" />
            </label>
          </div>
          <div class="share-preview">
            <span class="faint" style="font-size: 12px">分享卡片效果预览</span>
            <div class="share-card">
              <span class="share-card__thumb">
                <img v-if="brandLogoUrl" :src="brandLogoUrl" alt="" />
                <MiniIcon v-else name="img" :size="20" />
              </span>
              <span class="share-card__body">
                <span class="share-card__title">{{ shareTitle || '未设置分享标题' }}</span>
                <span class="share-card__desc">{{ shareDesc || '未设置分享描述' }}</span>
              </span>
            </div>
          </div>
        </section>
      </div>

      <DevicePreview
        :hint="previewHint"
        :preview-url="previewUrl"
        :preview-url-live="previewUrlLive"
        :iframe-key="previewKey"
        @scan="qrVisible = true"
      />
    </div>

    <MiniH5QrDialog v-model="qrVisible" mode="miniapp-draft" title="扫码在手机上看" />
  </div>
</template>

<script setup lang="ts">
/**
 * 品牌信息页（工作流第 1 环）
 *
 * 从 mini/appearance.vue 拆出来的原因：原来品牌 / 配色 / 导航三件事挤在一页，
 * 配置层级看不出来。现在品牌归品牌、导航归导航（/mini/navigation）。
 *
 * 写入方式沿用外观页的静默草稿：改动自动落草稿，不碰线上。
 * 上线由「发布与版本」页统一做，避免每页都有一个「保存并同步」按钮导致语义混乱。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import AssetPickerButton from '@/components/AssetPickerButton.vue'
import { useSilentDraft } from '@/composables/useSilentDraft'
import { uploadFileItem } from '@/api/files'
import { getMiniSite, updateMiniSite, type MiniSiteVO } from '@/api/miniSite'
import { refreshMiniPending } from '@/composables/useMiniPending'
import { updateConfigs } from '@/api/system'
import { DEFAULT_MINIAPP_BRAND_CONFIG, type MiniappBrandConfig } from '@/types/miniapp'
import { normalizeBrandConfig } from '@/utils/brand-config'
import PageHeader from '@/components/PageHeader.vue'
import type { SaveState } from '@/components/SaveStateBar.vue'

defineOptions({ name: 'MiniBrand' })


/**
 * 预设色板。
 * 🔴 2026-10-06 修复「色板显示 #B4430F、HEX 显示 #C2410C」：
 * 原来色板是写死的常量，且取色器 dot 在 currentTheme 取不到值时
 * 回退到硬编码 '#B4430F'。而线上真实主色既不在写死色板里、
 * 取色器的回退色又与它无关，于是同一页面上三个控件显示三种颜色。
 * 现在：预设色板保留，但**当前色若不在预设里就插到第一位**，
 * 保证「色板 / 取色器 / HEX / 预览」四处永远指向同一个真实值。
 */
const PRESET_THEMES = [
  '#C2410C', '#B4430F', '#A93D0C', '#2458A6', '#1F7A4D', '#8F5400', '#9B2C5A', '#C08E6E',
] as const

const THEMES = computed<string[]>(() => {
  const cur = currentTheme.value
  if (cur && !PRESET_THEMES.includes(cur as any)) return [cur, ...PRESET_THEMES]
  return [...PRESET_THEMES]
})

/** 取色器回退色：与当前色同源，绝不硬编码另一个色 */
const FALLBACK_COLOR = '#C2410C'

/** 继承关系对照表：直接写在界面上，不藏进文档 */
const INHERIT_ROWS = [
  {
    level: '全局配置',
    scope: '名称、Logo、品牌色、默认分享文案',
    where: '本页',
    effect: '所有页面默认继承这里的值',
    current: true,
  },
  {
    level: '页面级覆盖',
    scope: '单个页面的标题、分享图、可见范围',
    where: '页面配置',
    effect: '只覆盖该页；其余页面仍走全局',
    current: false,
  },
  {
    level: '整店模板',
    scope: '套用模板时的整套初始值',
    where: '模板',
    effect: '套用时会覆盖当前草稿，仅在主动套用时发生',
    current: false,
  },
]

const router = useRouter()
const loading = ref(false)
const loaded = ref(false)
const site = ref<MiniSiteVO>({})
const brandForm = ref<MiniappBrandConfig>({ ...DEFAULT_MINIAPP_BRAND_CONFIG })
const logoInputRef = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)
const qrVisible = ref(false)
const previewRevision = ref(0)

/* ---------------- 品牌色 ---------------- */

const pendingTheme = ref('')
const undoTheme = ref('')
const hexInput = ref('')
const themeDraft = useSilentDraft()
let themeCommitted = ''

/**
 * 当前生效的主色（来自后端 site.theme = miniappThemeConfig）。
 * 🔴 取值必须逐个做类型校验：theme.theme 这类字段可能是对象，
 * 直接 String() 会得到 "[object Object]"，再被当成合法 HEX 写回去
 * —— 那正是「色板/取色器/HEX 显示不一致」最容易藏身的地方。
 */
const currentTheme = computed(() => {
  const t = (site.value.theme || {}) as Record<string, unknown>
  const candidates = [t.primaryColor, t.color, t.theme, t.mainColor]
  for (const raw of candidates) {
    // 只接受字符串；对象/数组一律跳过
    if (typeof raw !== 'string') continue
    const hex = normalizeHex(raw)
    if (hex) return hex
  }
  return ''
})
const shownTheme = computed(() => pendingTheme.value || currentTheme.value)
const themeDirty = computed(() => !!pendingTheme.value && pendingTheme.value !== currentTheme.value)
const undoTarget = computed(() => (undoTheme.value && undoTheme.value !== shownTheme.value ? undoTheme.value : ''))

const themeDraftText = computed(() => {
  switch (themeDraft.state.value) {
    case 'pending': return '正在存入草稿…'
    case 'saving': return '正在保存…'
    case 'saved': return '已存入草稿'
    case 'error': return `草稿未保存：${themeDraft.lastError.value || '未知原因'}`
    default: return themeCommitted ? '与草稿一致' : '未设置品牌色'
  }
})

function normalizeHex(input?: string | null): string {
  const raw = String(input || '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
  if (/^[0-9a-fA-F]{3}$/.test(raw)) return `#${raw.split('').map((c) => c + c).join('').toUpperCase()}`
  return ''
}

function onCustomColor(hex: string) {
  const v = normalizeHex(hex)
  if (!v) return
  hexInput.value = v.slice(1)
  applyTheme(v)
}

function onHexInput(text: string) {
  hexInput.value = text.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
}

function commitHex() {
  const v = normalizeHex(hexInput.value)
  if (!v) {
    hexInput.value = currentTheme.value ? currentTheme.value.slice(1) : ''
    ElMessage.warning(`HEX 色值格式不对，请输入 3 位或 6 位，例如 ${FALLBACK_COLOR.slice(1)}`)
    return
  }
  applyTheme(v)
}

function applyTheme(color: string) {
  const before = currentTheme.value
  if (color === before) {
    pendingTheme.value = ''
    return
  }
  pendingTheme.value = color
  hexInput.value = color.slice(1)
  bumpPreviewRevision()
  void themeDraft.schedule(async () => {
    await writeTheme(color)
    pendingTheme.value = ''
    if (before) {
      undoTheme.value = before
      window.setTimeout(() => { undoTheme.value = '' }, 15000)
    }
  })
}

function undoThemeChange() {
  const back = undoTheme.value || currentTheme.value
  if (!back) return
  applyTheme(back)
}

async function writeTheme(color: string) {
  const prev = (site.value.theme && typeof site.value.theme === 'object' ? site.value.theme : {}) as Record<string, unknown>
  const updated = await updateMiniSite({
    theme: {
      ...prev,
      primaryColor: color,
      tabBarActiveColor: color,
      secondaryColor: (prev.secondaryColor as string) || color,
    } as Record<string, unknown>,
  })
  site.value = { ...site.value, ...updated }
  themeCommitted = color
  void refreshMiniPending(true)
}

/* ---------------- 品牌文本字段 ---------------- */

const brandDraft = useSilentDraft(800)
let brandCommitted = ''

async function writeBrandFields() {
  const payload = normalizeBrandConfig(brandForm.value)
  const updated = await updateMiniSite({
    brandConfig: payload as unknown as Record<string, unknown>,
  })
  site.value = { ...site.value, ...updated, brand: payload as unknown as Record<string, unknown> }
  brandForm.value = { ...payload }
  brandCommitted = JSON.stringify(payload)
}

watch(
  () => brandForm.value,
  () => {
    const next = JSON.stringify(normalizeBrandConfig(brandForm.value))
    if (!brandCommitted || next === brandCommitted) return
    void brandDraft.schedule(writeBrandFields)
  },
  { deep: true },
)

/* ---------------- 分享信息 ---------------- */

const shareTitle = ref('')
const shareDesc = ref('')
const shareDraft = useSilentDraft(800)
let shareCommitted = ''

async function writeShare() {
  // 分享信息走 updateConfigs（系统配置键），不走站点草稿——
  // 与品牌字段分成两条通道，写入前先 flush 掉对方，避免互相覆盖。
  const rows: Array<{ configKey: string; configValue: string; configGroup: string }> = []
  if (shareTitle.value) rows.push({ configKey: 'miniappShareTitle', configValue: shareTitle.value, configGroup: 'basic' })
  if (shareDesc.value) rows.push({ configKey: 'miniappShareDesc', configValue: shareDesc.value, configGroup: 'basic' })
  if (!rows.length) return
  await updateConfigs(rows)
  shareCommitted = JSON.stringify([shareTitle.value, shareDesc.value])
  void refreshMiniPending(true)
}

watch([shareTitle, shareDesc], () => {
  const next = JSON.stringify([shareTitle.value, shareDesc.value])
  if (!shareCommitted || next === shareCommitted) return
  void shareDraft.schedule(writeShare)
})

/* ---------------- Logo ---------------- */

async function writeBrandLogo(url: string) {
  const raw = site.value.brand && typeof site.value.brand === 'object'
    ? { ...site.value.brand }
    : {}
  const updated = await updateMiniSite({
    brandConfig: { ...raw, logoUrl: url } as unknown as Record<string, unknown>,
  })
  site.value = { ...site.value, ...updated }
  void refreshMiniPending(true)
}

function pickLogoFile() {
  logoInputRef.value?.click()
}

async function onLogoFileChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    ElMessage.warning('Logo 请上传 PNG / JPG / WebP')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('Logo 请控制在 2MB 以内')
    return
  }
  logoUploading.value = true
  try {
    const res = await uploadFileItem(file, { name: `brand-logo-${Date.now()}` })
    const url = String((res as { url?: string; fileUrl?: string })?.url
      || (res as { fileUrl?: string })?.fileUrl || '')
    if (!url) throw new Error('上传成功但未返回可访问地址')
    // 🔴 必须先 flush 文本字段：两者都写同一个 brandConfig，
    // 不 flush 会用旧 brandConfig 覆盖掉刚上传的 Logo。
    await brandDraft.flush(writeBrandFields)
    await writeBrandLogo(url)
    ElMessage.success('Logo 已更新并存入草稿')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : 'Logo 上传失败')
  } finally {
    logoUploading.value = false
  }
}

function onLogoPicked(url: string) {
  void brandDraft.flush(writeBrandFields).then(() => writeBrandLogo(url))
}

function clearLogo() {
  void brandDraft.flush(writeBrandFields).then(() => writeBrandLogo(''))
}

/* ---------------- 派生与预览 ---------------- */

const brandLogoUrl = computed(() => {
  const b = (site.value.brand || {}) as Record<string, unknown>
  return String(b.logoUrl || b.logo || '')
})
const templateLabel = computed(() => site.value.templateName || '自定义模板')

/**
 * 保存状态五态映射。
 * 🔴 品牌页有三条独立的静默写入通道（品牌文本 / 品牌色 / 分享信息），
 * 任一在保存中或失败都要如实反映，不能只盯着其中一条就宣称「已保存」。
 */
const saveState = computed<SaveState>(() => {
  const states = [
    brandDraft.state.value,
    themeDraft.state.value,
    shareDraft.state.value,
  ] as string[]
  if (states.includes('saving') || states.includes('pending')) return 'saving'
  if (states.includes('error')) return 'error'
  if (Number(site.value.pendingCount || 0) > 0) return 'pending'
  return 'saved'
})

/** 保存失败时的重试：把三条通道的防抖队列全部落库 */
async function flushAllDrafts() {
  await Promise.all([
    brandDraft.state.value === 'error' || brandDraft.state.value === 'pending'
      ? brandDraft.flush(writeBrandFields)
      : Promise.resolve(false),
    themeDraft.state.value === 'error' || themeDraft.state.value === 'pending'
      ? themeDraft.flush(() => writeTheme(pendingTheme.value || currentTheme.value))
      : Promise.resolve(false),
    shareDraft.state.value === 'error' || shareDraft.state.value === 'pending'
      ? shareDraft.flush(writeShare)
      : Promise.resolve(false),
  ])
}

function bumpPreviewRevision() {
  previewRevision.value += 1
}

function normalizePreviewPath(path?: string | null) {
  return String(path || '').replace(/^\//, '').trim()
}

function buildPreview(source: 'draft' | 'live') {
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  if (source === 'draft' && themeDirty.value) query.primary = pendingTheme.value
  const tabs = site.value.tabBar || []
  const screen = normalizePreviewPath(tabs[0]?.pagePath)
  if (screen) query.screen = screen
  return router.resolve({ path: '/h5/miniapp-preview', query }).href
}

const previewUrl = computed(() => buildPreview('draft'))
const previewUrlLive = computed(() => buildPreview('live'))
const previewKey = computed(() => `brand-${previewRevision.value}`)

const previewHint = computed(() => {
  if (themeDirty.value) return '预览含未保存的主色 · 存入草稿后再发布'
  const n = Number(site.value.pendingCount || 0)
  if (n > 0) return `预览草稿配置 · 还有 ${n} 项待发布`
  return '预览草稿配置 · 与线上一致'
})

/* ---------------- 加载 ---------------- */

async function load() {
  loading.value = true
  try {
    const data = await getMiniSite('draft')
    site.value = data || {}
    const b = (data?.brand || {}) as Record<string, unknown>
    brandForm.value = normalizeBrandConfig({
      ...DEFAULT_MINIAPP_BRAND_CONFIG,
      ...(b as Partial<MiniappBrandConfig>),
    })
    brandCommitted = JSON.stringify(brandForm.value)
    const t = (data?.theme || {}) as Record<string, unknown>
    themeCommitted = String(t.primaryColor || '').toUpperCase() || ''
    if (themeCommitted) hexInput.value = themeCommitted.replace(/^#/, '')
    shareTitle.value = String((data?.slogan as string) || '')
    shareCommitted = JSON.stringify([shareTitle.value, shareDesc.value])
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '品牌信息读取失败')
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(load)

// 离开页面前把防抖队列落完，否则「改完立刻切走」会丢改动
onUnmounted(() => {
  if (brandDraft.state.value === 'pending' || brandDraft.state.value === 'saving') {
    void brandDraft.flush(writeBrandFields)
  }
  if (themeDraft.state.value === 'pending' || themeDraft.state.value === 'saving') {
    void themeDraft.flush(() => writeTheme(pendingTheme.value || currentTheme.value))
  }
  if (shareDraft.state.value === 'pending' || shareDraft.state.value === 'saving') {
    void shareDraft.flush(writeShare)
  }
})
</script>

<style scoped lang="scss">
/* 折叠帮助区规则清单：正文可读性优先 */
.rule-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li { line-height: 1.75; }

  b { font-weight: 600; }
}

.draft-state {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.draft-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

/* 当前生效色读数：把「色板/取色器/HEX/预览」钉在同一个值上 */
.theme-readout {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;

  b {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--acc, #b4430f);
  }
}

.brand-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.kv--wide { grid-column: 1 / -1; }

.req {
  font-style: normal;
  color: #a63d2a;
  font-size: 11px;
  margin-left: 2px;
}

.kv__hint {
  font-size: 11px;
  line-height: 1.4;
}

.textarea {
  min-height: 62px;
  resize: vertical;
  line-height: 1.6;
}

.inherit-table {
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;
  overflow: hidden;
}

.inherit-row {
  display: grid;
  grid-template-columns: 150px 1.35fr 0.85fr 1.2fr;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--wb-line, #e6e0d6);
  font-size: 12.5px;
  align-items: center;

  &:last-child { border-bottom: 0; }
}

.inherit-head {
  background: rgba(0, 0, 0, 0.025);
  font-weight: 600;
  color: var(--acc, #b4430f);
}

.inherit-row-on {
  background: rgba(180, 67, 15, 0.05);
}

.inherit-cell {
  min-width: 0;
  word-break: break-word;
}

.share-preview {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.share-card {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;
  max-width: 380px;
}

.share-card__thumb {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: none;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.share-card__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.share-card__title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-card__desc {
  font-size: 12px;
  color: var(--wb-muted, #7d7468);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 860px) {
  .inherit-row { grid-template-columns: 1fr 1fr; }
  .inherit-head { display: none; }
}
</style>