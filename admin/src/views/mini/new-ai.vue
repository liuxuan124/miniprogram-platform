<template>
  <div class="mini-wb ai-gen">
    <header class="ai-gen__head">
      <div>
        <div class="mw-kicker">小程序 / 页面 / AI 生成页面</div>
        <h1 class="mw-title">✨ AI 生成页面</h1>
        <p class="mw-sub">描述想要的页面，一次出 3 套方案；选中后再进装修器微调。生成结果先存草稿，不会直接上线。</p>
      </div>
      <el-button @click="router.push('/mini/pages')">返回页面</el-button>
    </header>

    <div class="ai-gen__body">
      <!-- 左栏 -->
      <aside class="mw-panel ai-gen__left">
        <div class="field">
          <div class="field__label">页面用途</div>
          <div class="purpose-row">
            <button
              v-for="p in purposes"
              :key="p"
              type="button"
              class="mw-capsule"
              :class="{ active: purpose === p }"
              @click="purpose = p"
            >
              {{ p }}
            </button>
          </div>
        </div>

        <div class="field">
          <div class="field__label">描述你想要的页面</div>
          <el-input
            v-model="prompt"
            type="textarea"
            :rows="6"
            maxlength="300"
            show-word-limit
            placeholder="例如：中秋读书节活动页，要有活动规则、推荐书单、报名按钮，暖金色调"
          />
        </div>

        <div class="field">
          <div class="field__label">使用我的素材</div>
          <div class="asset-checks">
            <label class="asset-check">
              <el-checkbox v-model="useContentLib" />
              <span>内容库 · 书单占位</span>
            </label>
            <label class="asset-check">
              <el-checkbox v-model="useCoupon" />
              <span>优惠券 · 活动券占位</span>
            </label>
          </div>
          <el-button class="upload-fake" disabled>上传图片或参考截图（占位）</el-button>
        </div>

        <div class="field field--row">
          <span class="field__label">跟随品牌配色</span>
          <el-switch v-model="followBrand" />
        </div>

        <div class="ai-gen__actions">
          <el-button :loading="running" :disabled="!canGenerate" @click="regenerate">
            重新生成
          </el-button>
          <el-button
            type="primary"
            class="mw-btn-primary continue-btn"
            :loading="continuing"
            :disabled="!selectedScheme"
            @click="continueWithSelected"
          >
            用方案 {{ selectedIndex + 1 }} 继续装修
          </el-button>
        </div>
      </aside>

      <!-- 右栏 -->
      <section class="ai-gen__right">
        <div class="right-head">
          <div>
            <h2>{{ rightTitle }}</h2>
            <p>{{ rightSub }}</p>
          </div>
          <span class="right-note">生成后保存为草稿，不会直接上线</span>
        </div>

        <div v-if="!schemes.length && !running" class="empty-state mw-panel">
          <p>左侧填好描述后点「重新生成」，这里会横排出 3 套方案。</p>
          <el-button type="primary" class="mw-btn-primary" :disabled="!canGenerate" @click="regenerate">
            开始生成
          </el-button>
        </div>

        <div v-else class="scheme-row">
          <article
            v-for="(s, i) in schemes"
            :key="s.key"
            class="scheme-card"
            :class="{ selected: selectedIndex === i, appearing: s.appearing }"
            @click="selectScheme(i)"
          >
            <div class="scheme-card__badge" v-if="selectedIndex === i">已选</div>
            <div class="scheme-card__title">{{ s.title }}</div>
            <div class="phone-frame" :class="[`phone-frame--${s.variant}`, { 'has-iframe': !!s.pageId }]">
              <div class="phone-frame__notch" />
              <div class="phone-frame__screen">
                <iframe
                  v-if="s.pageId"
                  class="phone-frame__iframe"
                  :src="previewHref(s.pageId)"
                  :title="s.title"
                  loading="lazy"
                  tabindex="-1"
                />
                <template v-else>
                  <div class="mock-hero">{{ s.mockHero }}</div>
                  <div v-for="(block, bi) in s.mockBlocks" :key="bi" class="mock-block" :class="block.cls">
                    <span class="mock-block__label">{{ block.text }}</span>
                    <span v-if="block.cls === 'is-list' || block.cls === 'is-grid'" class="mock-lines">
                      <i /><i /><i />
                    </span>
                    <span v-else-if="block.cls === 'is-count'" class="mock-count">23:59:12</span>
                    <span v-else-if="block.cls === 'is-coupon'" class="mock-coupon">券 · 8 折</span>
                    <span v-else-if="block.cls === 'is-qr'" class="mock-qr" />
                  </div>
                  <div class="mock-cta">{{ s.mockCta }}</div>
                </template>
              </div>
              <div class="phone-frame__tab">
                <span /><span /><span /><span /><span />
              </div>
            </div>
            <p class="scheme-card__blurb">{{ s.blurb }}</p>
            <div v-if="s.loading" class="scheme-card__loading">生成中…</div>
          </article>

          <!-- 流式占位：尚未出现的槽位 -->
          <article
            v-for="n in pendingSlots"
            :key="`pending-${n}`"
            class="scheme-card scheme-card--skeleton"
          >
            <div class="scheme-card__title">方案 {{ n }} · 生成中</div>
            <div class="phone-frame phone-frame--skeleton">
              <div class="skel-bar" /><div class="skel-bar short" /><div class="skel-bar" />
            </div>
            <p class="scheme-card__blurb">正在根据描述排布组件…</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { runAiPagePipeline } from '@/api/page'

defineOptions({ name: 'MiniNewAi' })

type SchemeVariant = 'full' | 'atmosphere' | 'community'

interface SchemeCard {
  key: string
  variant: SchemeVariant
  title: string
  blurb: string
  mockHero: string
  mockBlocks: Array<{ text: string; cls?: string }>
  mockCta: string
  pageId: number | null
  /** 真正可进装修的是 pipeline 返回的那套；其余需再生成 */
  real: boolean
  loading?: boolean
  appearing?: boolean
}

const SCHEME_DEFS: Array<{
  variant: SchemeVariant
  title: string
  blurb: string
  mockHero: string
  mockBlocks: Array<{ text: string; cls?: string }>
  mockCta: string
  promptHint: string
}> = [
  {
    variant: 'full',
    title: '方案 1 · 信息完整',
    blurb: '规划、书单、报名一屏讲清，适合首次参加的用户',
    mockHero: '活动主视觉',
    mockBlocks: [
      { text: '活动规则摘要', cls: 'is-rules' },
      { text: '推荐书单 · 列表', cls: 'is-list' },
    ],
    mockCta: '立即报名',
    promptHint: '信息完整：规则+书单/列表+报名 CTA 一屏讲清',
  },
  {
    variant: 'atmosphere',
    title: '方案 2 · 氛围大图',
    blurb: '大图头 + 倒计时，适合公众号推文引流进来',
    mockHero: '月下共读 · 大图氛围',
    mockBlocks: [
      { text: '倒计时', cls: 'is-count' },
      { text: '优惠券条', cls: 'is-coupon' },
    ],
    mockCta: '立即参与',
    promptHint: '氛围大图头图+倒计时，弱化规则、适合推文引流',
  },
  {
    variant: 'community',
    title: '方案 3 · 社群导向',
    blurb: '弱化规则，突出入群，适合老用户召回',
    mockHero: '轻量头图',
    mockBlocks: [
      { text: '双列书单', cls: 'is-grid' },
      { text: '入群二维码区', cls: 'is-qr' },
    ],
    mockCta: '扫码入群',
    promptHint: '社群导向：弱化规则，突出入群与老用户召回',
  },
]

const purposes = ['活动页', '商品页', '内容页', '落地页', '首页改版'] as const

const router = useRouter()
const purpose = ref<(typeof purposes)[number]>('活动页')
const prompt = ref('')
const useContentLib = ref(true)
const useCoupon = ref(true)
const followBrand = ref(true)
const running = ref(false)
const continuing = ref(false)
const schemes = ref<SchemeCard[]>([])
const selectedIndex = ref(0)

const canGenerate = computed(() => prompt.value.trim().length > 0)
const selectedScheme = computed(() => schemes.value[selectedIndex.value] || null)
const pendingSlots = computed(() => {
  if (!running.value) return []
  const shown = schemes.value.length
  return [1, 2, 3].filter((n) => n > shown)
})
const rightTitle = computed(() => {
  if (running.value && schemes.value.length < 3) return `正在生成方案…（已出 ${schemes.value.length}/3）`
  if (schemes.value.length) return `已生成 ${schemes.value.length} 套方案`
  return '方案预览'
})
const rightSub = computed(() =>
  schemes.value.length
    ? '组件都是可编辑的真实组件；绑定素材为占位，进装修器后可再换'
    : '生成后横排展示 3 套手机预览，点选后再继续装修',
)

function buildPrompt(extraHint?: string) {
  const parts = [
    `用途：${purpose.value}`,
    prompt.value.trim(),
    useContentLib.value ? '尽量引用内容库素材（书单/内容占位）' : '',
    useCoupon.value ? '尽量带优惠券入口占位' : '',
    followBrand.value ? '跟随品牌配色' : '可用独立配色',
    extraHint || '',
  ].filter(Boolean)
  return parts.join('。')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function deriveThreeSchemes(pageId: number | null): SchemeCard[] {
  return SCHEME_DEFS.map((def, i) => ({
    key: `${def.variant}-${pageId || 'x'}-${i}`,
    variant: def.variant,
    title: def.title,
    blurb: def.blurb,
    mockHero: def.mockHero,
    mockBlocks: def.mockBlocks,
    mockCta: def.mockCta,
    pageId: i === 0 ? pageId : null,
    real: i === 0 && !!pageId,
  }))
}

async function callPipeline(fullPrompt: string) {
  const res = await runAiPagePipeline(fullPrompt)
  const data = (res as any)?.data ?? res
  const draft = data?.draft
  const pageId = Number(draft?.pageId || 0) || null
  return { data, pageId }
}

async function regenerate() {
  if (!canGenerate.value) {
    ElMessage.warning('请先填写页面描述')
    return
  }
  running.value = true
  schemes.value = []
  selectedIndex.value = 0
  try {
    const fullPrompt = buildPrompt(SCHEME_DEFS[0].promptHint)
    const pipelinePromise = callPipeline(fullPrompt)

    // 并行：先流式露出「生成中」卡片壳，pipeline 回来再填真实 pageId
    const skeletonReveal = (async () => {
      for (let i = 0; i < 3; i++) {
        await sleep(i === 0 ? 200 : 450)
        if (!running.value) return
        const def = SCHEME_DEFS[i]
        schemes.value = [
          ...schemes.value,
          {
            key: `loading-${i}`,
            variant: def.variant,
            title: def.title,
            blurb: def.blurb,
            mockHero: def.mockHero,
            mockBlocks: def.mockBlocks,
            mockCta: def.mockCta,
            pageId: null,
            real: false,
            loading: true,
            appearing: true,
          },
        ]
      }
    })()

    const { pageId } = await pipelinePromise
    await skeletonReveal
    const cards = deriveThreeSchemes(pageId)
    schemes.value = cards
    selectedIndex.value = 0
    if (pageId) {
      ElMessage.success('已生成 3 套方案预览（方案 1 为可进装修的真实草稿）')
    } else {
      ElMessage.warning('流水线未返回草稿 id，可换描述后重试，或仍可点方案再生成')
    }
  } catch {
    schemes.value = []
    ElMessage.error('AI 生成失败，请稍后重试')
  } finally {
    running.value = false
  }
}

function selectScheme(i: number) {
  if (running.value) return
  selectedIndex.value = i
}

function previewHref(pageId: number) {
  const { href } = router.resolve({ path: `/page-builder/preview/${pageId}` })
  return href
}

async function continueWithSelected() {
  const s = selectedScheme.value
  if (!s) return

  if (s.real && s.pageId) {
    router.push(`/mini/pages/${s.pageId}/editor`)
    return
  }

  // 方案 2/3：用该定位再跑一遍 pipeline
  try {
    await ElMessageBox.confirm(
      `「${s.title}」将用此定位重新生成一版真实草稿后再进入装修。`,
      '用此定位重新生成',
      { confirmButtonText: '重新生成并进入', cancelButtonText: '取消', type: 'info' },
    )
  } catch {
    return
  }

  continuing.value = true
  try {
    const def = SCHEME_DEFS[selectedIndex.value] || SCHEME_DEFS[0]
    const { pageId } = await callPipeline(buildPrompt(def.promptHint))
    if (!pageId) {
      ElMessage.warning('未返回草稿，请重试')
      return
    }
    ElMessage.success('已按该定位生成草稿')
    router.push(`/mini/pages/${pageId}/editor`)
  } catch {
    ElMessage.error('重新生成失败')
  } finally {
    continuing.value = false
  }
}
</script>

<style scoped lang="scss">
.ai-gen {
  min-height: 100%;
  margin: -16px;
  padding: 20px 24px 40px;
  background: var(--mw-bg, #f6f2ec);
}

.ai-gen__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.ai-gen__body {
  display: grid;
  grid-template-columns: minmax(280px, 340px) 1fr;
  gap: 18px;
  align-items: start;
}

.ai-gen__left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 12px;
}

.field__label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--mw-ink, #2c241c);
}
.field--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .field__label { margin: 0; }
}

.purpose-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  :deep(.mw-capsule.active),
  .mw-capsule.active {
    background: var(--mw-terracotta, #b4430f);
    border-color: var(--mw-terracotta, #b4430f);
    color: #fff;
  }
}

.asset-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}
.asset-check {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--mw-border, #e8dfd3);
  border-radius: 10px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.upload-fake {
  width: 100%;
}

.ai-gen__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  .continue-btn { width: 100%; }
}

.ai-gen__right {
  min-width: 0;
}
.right-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  h2 { margin: 0 0 4px; font-size: 18px; }
  p { margin: 0; font-size: 13px; color: var(--mw-muted, #7a6e64); }
}
.right-note {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--mw-muted, #7a6e64);
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--mw-border, #e8dfd3);
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  p { color: var(--mw-muted, #7a6e64); margin-bottom: 16px; }
}

.scheme-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.scheme-card {
  position: relative;
  background: #fffcf8;
  border: 2px solid var(--mw-border, #e8dfd3);
  border-radius: 14px;
  padding: 12px 12px 14px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.25s;
  &.appearing {
    animation: scheme-in 0.35s ease-out;
  }
  &:hover { border-color: #d4a88a; }
  &.selected {
    border-color: var(--mw-terracotta, #b4430f);
    box-shadow: 0 8px 24px rgba(180, 67, 15, 0.12);
  }
  &--skeleton {
    opacity: 0.72;
    cursor: default;
  }
}
@keyframes scheme-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.scheme-card__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--mw-terracotta, #b4430f);
  padding: 2px 8px;
  border-radius: 999px;
}
.scheme-card__title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 10px;
  padding-right: 48px;
}
.scheme-card__blurb {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--mw-muted, #7a6e64);
}
.scheme-card__loading {
  margin-top: 6px;
  font-size: 12px;
  color: var(--mw-terracotta, #b4430f);
}

.phone-frame {
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
  border-radius: 18px;
  border: 1px solid #ddd2c4;
  background: #1a1510;
  padding: 8px 6px 6px;
  box-shadow: 0 6px 18px rgba(44, 36, 28, 0.12);
  /* 375 宽缩小展示 */
  transform-origin: top center;
}
.phone-frame__notch {
  width: 36%;
  height: 6px;
  margin: 0 auto 6px;
  border-radius: 999px;
  background: #333;
}
.phone-frame__screen {
  background: #f6f2ec;
  border-radius: 10px;
  min-height: 260px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 10px;
  color: #2c241c;
  position: relative;
  overflow: hidden;
}
.phone-frame.has-iframe .phone-frame__screen {
  padding: 0;
  background: #fff;
}
.phone-frame__iframe {
  position: absolute;
  inset: 0;
  width: 375px;
  height: 812px;
  border: 0;
  pointer-events: none;
  transform-origin: top left;
  transform: scale(0.48);
  background: #fff;
}
.phone-frame__tab {
  display: flex;
  justify-content: space-around;
  padding: 6px 4px 2px;
  span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #5a5046;
  }
}
.phone-frame--skeleton {
  background: #f0ebe3;
  border-color: #e5ddd2;
  min-height: 220px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skel-bar {
  height: 18px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e8dfd3, #f5efe6, #e8dfd3);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  &.short { width: 60%; }
}
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.mock-hero {
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: flex-end;
  padding: 8px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #b4430f, #8f5400);
}
.phone-frame--atmosphere .mock-hero {
  height: 96px;
  background: linear-gradient(160deg, #1e2a4a, #4a3a6b);
}
.phone-frame--community .mock-hero {
  height: 48px;
  background: linear-gradient(135deg, #c4a574, #b4430f);
}
.mock-block {
  border-radius: 6px;
  padding: 8px;
  background: #fff;
  border: 1px solid #e8dfd3;
  display: flex;
  flex-direction: column;
  gap: 4px;
  &__label { font-weight: 600; }
  &.is-count { text-align: center; font-weight: 700; color: #b4430f; }
  &.is-coupon { background: #fbeadf; border-color: #f0c9a8; }
  &.is-grid { min-height: 48px; }
  &.is-qr { min-height: 56px; align-items: center; background: #fffef9; }
  &.is-rules { background: linear-gradient(90deg, #fff8f0, #fff); }
  &.is-list { min-height: 40px; }
}
.mock-lines {
  display: flex;
  flex-direction: column;
  gap: 3px;
  i {
    display: block;
    height: 5px;
    border-radius: 2px;
    background: #e8dfd3;
    &:nth-child(2) { width: 78%; }
    &:nth-child(3) { width: 55%; }
  }
}
.mock-count {
  font-size: 14px;
  letter-spacing: 0.04em;
  font-weight: 800;
  color: #b4430f;
}
.mock-coupon {
  font-size: 10px;
  color: #8f5400;
}
.mock-qr {
  width: 36px;
  height: 36px;
  border: 2px solid #2c241c;
  border-radius: 4px;
  background:
    linear-gradient(#2c241c, #2c241c) 4px 4px / 8px 8px no-repeat,
    linear-gradient(#2c241c, #2c241c) 24px 4px / 8px 8px no-repeat,
    linear-gradient(#2c241c, #2c241c) 4px 24px / 8px 8px no-repeat,
    #fff;
}
.mock-cta {
  margin-top: auto;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  background: #b4430f;
  color: #fff;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .ai-gen__body { grid-template-columns: 1fr; }
  .ai-gen__left { position: static; }
  .scheme-row { grid-template-columns: 1fr; }
}
</style>
