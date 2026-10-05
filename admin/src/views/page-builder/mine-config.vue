<template>
  <div class="mine-config-page">
    <PageHeader
      title="我的页配置"
      description="小程序内置的个人中心页。左侧改配置、右侧实时预览，改动自动存入草稿。"
      :status="saveState"
      help-title="这个页面能改什么、不能改什么"
      :on-retry="onSave"
    >
      <template #actions>
        <el-button @click="router.push('/mini/pages')">页面列表</el-button>
        <el-button :loading="saving" @click="onSave">保存草稿</el-button>
        <el-button type="primary" :loading="publishing" @click="onPublish">发布配置</el-button>
      </template>

      <template #help>
        <ul class="rule-list">
          <li><b>不能改结构</b>：这是小程序内置原生页，不进装修器。可改的是文案、开关、菜单项与模板外观。</li>
          <li><b>路径固定</b>：<code>/pages/mine/mine</code>，由小程序 app.json 注册，不随配置变化。</li>
          <li><b>保存 ≠ 生效</b>：保存只写草稿，线上用户看到的仍是上一版，需点「发布配置」。</li>
          <li><b>与导航的关系</b>：底部导航的「我的」入口固定指向本页；若在导航里把它绑到别的装修页，本页配置就不会出现在 Tab 里。</li>
        </ul>
      </template>
    </PageHeader>

    <!--
      🔴 2026-10-06 发布语义统一：按钮从「上线到小程序」改为「发布配置」，
      并明确它与「发布与版本」页是同一套机制（同一接口、同一发布序号、同一快照）。
      「上线到小程序」这个说法会让人以为只影响小程序，而实际也写服务端配置。
    -->
    <!--
      原来这里还有一个 el-alert「存在待上线草稿」。
      2026-10-06 起由 PageHeader 的 SaveStateBar 统一承担（pending 态就是它），
      同一件事不再用两种视觉各说一遍。
    -->

    <div v-loading="loading" class="mine-layout">
      <div class="mine-form">
        <!-- ===== 模板库：默认收起，按需展开 ===== -->
        <div class="section-head">
          <div class="section-label">我的页模板</div>
          <span class="section-badge">当前：{{ currentTemplateName }}</span>
        </div>
        <p class="section-hint">
          6 套成套方案，每套自带文案 + 菜单组合 + 模块开关。展开看缩略图对比，选定后仍可继续微调。
        </p>

        <button type="button" class="tpl-toggle" @click="tplExpanded = !tplExpanded">
          <span class="tpl-toggle__label">
            {{ tplExpanded ? '收起模板库' : `展开 ${MINE_TEMPLATES.length} 套模板` }}
          </span>
          <span class="tpl-toggle__hint">
            {{ tplExpanded ? '收起以腾出首屏空间' : '默认收起，不占首屏' }}
            <span class="tpl-toggle__arrow" :class="{ open: tplExpanded }">▾</span>
          </span>
        </button>

        <div v-if="tplExpanded" class="tpl-grid">
          <button
            v-for="tpl in MINE_TEMPLATES"
            :key="tpl.key"
            type="button"
            class="tpl-card"
            :class="{ selected: currentTemplate === tpl.key }"
            @click="openPreview(tpl.key)"
          >
            <div class="tpl-thumb">
              <div class="tpl-thumb__inner">
                <MinePagePreview :mine-config="templateConfig(tpl.key)" :theme="form.theme" />
              </div>
              <span v-if="currentTemplate === tpl.key" class="tpl-thumb__flag">使用中</span>
            </div>
            <div class="tpl-body">
              <div class="tpl-body__name">{{ tpl.name }}</div>
              <div class="tpl-body__desc">{{ tpl.desc }}</div>
              <div class="tpl-body__scene">{{ tpl.menuKeys.length }} 项菜单 · {{ tpl.scene }}</div>
            </div>
          </button>
        </div>

        <div class="section-divider"></div>

        <div class="section-label">外观皮肤</div>
        <p class="section-hint">同一套菜单组合下可换配色；这只改皮肤预设，是否启用「页面独立配色」在下方主题配色区。</p>
        <div class="mine-template-picker">
          <button
            v-for="tpl in personalCenterTemplates"
            :key="tpl.key"
            type="button"
            class="mine-tpl-card"
            :class="{ selected: selectedMineTemplate === tpl.key }"
            @click="selectMineTemplate(tpl.key)"
          >
            <div class="mine-tpl-preview" :style="{ background: tpl.gradient, border: tpl.border }">
              <div class="mine-tpl-icon">{{ tpl.icon }}</div>
            </div>
            <div class="mine-tpl-name">{{ tpl.name }}</div>
            <div class="mine-tpl-desc">{{ tpl.desc }}</div>
          </button>
        </div>

        <div class="section-divider"></div>
        <MinePageConfig v-model="form.mineConfig" :global-theme="form.theme" />
      </div>

      <div class="mine-preview-wrap">
        <div class="preview-chrome">
          <span class="preview-chrome__label">预览身份</span>
          <el-radio-group v-model="identity" size="small">
            <el-radio-button value="guest">未登录</el-radio-button>
            <el-radio-button value="loggedin">已登录</el-radio-button>
            <el-radio-button value="member">会员</el-radio-button>
          </el-radio-group>
        </div>
        <div class="preview-state">
          <el-tag size="small" :type="identityTagType">{{ identityLabel }}</el-tag>
          <span class="preview-state__hint">{{ identityHint }}</span>
        </div>
        <div class="preview-phone">
          <MinePagePreview
            :mine-config="form.mineConfig"
            :theme="form.theme"
            :identity="identity"
            :preview-stats="identity === 'guest' ? undefined : PREVIEW_STATS"
            :preview-learn-item="identity === 'guest' ? null : PREVIEW_LEARN"
            :preview-planet-item="identity === 'member' ? PREVIEW_PLANET : null"
          />
        </div>
        <div class="preview-theme">
          <span class="preview-theme__label">生效主色</span>
          <span class="preview-theme__swatch" :style="{ background: effectiveTheme.primary }" />
          <span class="preview-theme__hex">{{ effectiveTheme.primary || '—' }}</span>
          <el-tag size="small" :type="effectiveTheme.source === 'page' ? 'warning' : 'info'">
            {{ effectiveTheme.source === 'page' ? '页面覆盖' : '继承全局' }}
          </el-tag>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="previewVisible"
      width="820px"
      top="4vh"
      destroy-on-close
      :title="`模板预览 · ${previewTpl?.name || ''}`"
    >
      <div class="pv">
        <div class="pv__phone">
          <MinePagePreview :mine-config="previewConfig" :theme="form.theme" identity="loggedin" />
        </div>
        <div class="pv__side">
          <div class="pv__name">{{ previewTpl?.name }}</div>
          <div class="pv__scene">{{ previewTpl?.scene }}</div>
          <p class="pv__desc">{{ previewTpl?.desc }}。套用后可继续改菜单顺序、增删条目与换肤。</p>

          <div class="pv__label">包含的菜单（{{ previewMenuTitles.length }}）</div>
          <div class="pv__tags">
            <span v-for="t in previewMenuTitles" :key="t" class="pv__tag">{{ t }}</span>
          </div>

          <div class="pv__label">右侧信息</div>
          <div class="pv__kv">
            <span>会员卡</span><b>{{ previewTpl?.showMemberCard ? '显示' : '隐藏' }}</b>
            <span>订单入口</span><b>{{ previewTpl?.showOrderTabs ? '显示' : '隐藏' }}</b>
            <span>装饰背景</span><b>{{ previewTpl?.showDecorBackground ? '显示' : '隐藏' }}</b>
            <span>菜单图标</span><b>{{ previewTpl?.showMenuIcons ? '显示' : '隐藏' }}</b>
          </div>

          <div class="pv__warn">
            <b>套用「{{ previewTpl?.name }}」会覆盖以下配置：</b>
            <ul class="pv__warn-list">
              <li v-for="f in TEMPLATE_OVERWRITE_FIELDS" :key="f.key">{{ f.label }}</li>
            </ul>
            <b>以下配置会保留：</b>
            <ul class="pv__warn-list pv__warn-list--keep">
              <li v-for="f in TEMPLATE_KEEP_FIELDS" :key="f.key">{{ f.label }}</li>
            </ul>
            <p class="pv__warn-note">
              套用只改当前编辑态（草稿），不会直接生效；确认后请点「保存草稿」→「发布配置」。
            </p>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">取消</el-button>
        <el-button type="primary" @click="applyPreviewTemplate">确认套用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import MinePageConfig from '@/components/miniapp-builder/MinePageConfig.vue'
import MinePagePreview from '@/components/miniapp-builder/MinePagePreview.vue'
import type { MineIdentity } from '@/components/miniapp-builder/MinePagePreview.vue'
import {
  MINE_TEMPLATES,
  TEMPLATE_OVERWRITE_FIELDS,
  TEMPLATE_KEEP_FIELDS,
  buildTemplateConfig,
  getMineTemplate,
  resolveTemplateKey,
} from '@/components/miniapp-builder/mineTemplates'
import type { MinePageConfig as MinePageConfigType } from '@/types/miniapp'
import { useMiniappConfig } from '@/components/miniapp-builder/composables/useMiniappConfig'
import {
  MINE_STYLE_TEMPLATES,
  applyMineStylePreset,
  resolveMineStyleKey,
  resolveMineEffectiveTheme,
} from '@/types/miniapp'
import type { SaveState } from '@/components/SaveStateBar.vue'

const router = useRouter()
const {
  form, loading, saving, publishing,
  isDirty, hasPendingSiteDraft, saveError,
  loadConfig, handleSave, publishToMiniapp,
} = useMiniappConfig()
const personalCenterTemplates = MINE_STYLE_TEMPLATES


/**
 * 保存状态五态映射（优先级从上到下）。
 * 🔴 关键区分：saving/error/dirty 都只涉及「存草稿」，
 * pending 才是「存了但线上还是旧的」——这两件事混为一谈是最常见的误解。
 */
const saveState = computed<SaveState>(() => {
  if (saving.value) return 'saving'
  if (saveError.value) return 'error'
  if (isDirty.value) return 'dirty'
  if (hasPendingSiteDraft.value) return 'pending'
  return 'saved'
})

/** 模板库默认收起：6 张缩略图太占首屏，展开才渲染 */
const tplExpanded = ref(false)

/** 预览身份态：未登录 / 已登录 / 会员 */
const identity = ref<MineIdentity>('guest')
const IDENTITY_LABEL: Record<MineIdentity, string> = {
  guest: '未登录',
  loggedin: '已登录',
  member: '会员',
}
const IDENTITY_HINT: Record<MineIdentity, string> = {
  guest: '菜单里「登录后显示 / 会员可见」的项会隐藏',
  loggedin: '登录类入口可点，会员专属项仍隐藏',
  member: '全部菜单可见，星球与学习条目显示为已开通',
}
const identityLabel = computed(() => IDENTITY_LABEL[identity.value])
const identityHint = computed(() => IDENTITY_HINT[identity.value])
const identityTagType = computed(() =>
  identity.value === 'member' ? 'warning' : identity.value === 'loggedin' ? 'success' : 'info')

/** 已登录/会员态的示例数据（仅预览，真机读 /mp/mine/overview） */
const PREVIEW_STATS = { 收藏: '128', 笔记: '16', 关注: '9', 暖豆: '2,480' }
const PREVIEW_LEARN = { title: '内容增长实战课 · 第 12 讲' }
const PREVIEW_PLANET = { title: '暖阁星球', remainDays: 86 }

/** 生效主题色：继承/覆盖的唯一口径，与小程序端同源 */
const effectiveTheme = computed(() => resolveMineEffectiveTheme(
  {
    themeSource: form.mineConfig.themeSource,
    themeColor: form.mineConfig.themeColor,
    themeColorSecondary: form.mineConfig.themeColorSecondary,
  },
  form.theme,
))

const selectedMineTemplate = computed(() => resolveMineStyleKey(form.mineConfig as Record<string, unknown>))

const currentTemplate = computed(() => resolveTemplateKey(form.mineConfig))
const currentTemplateName = computed(() => {
  const tpl = getMineTemplate(currentTemplate.value)
  return tpl ? tpl.name : '自定义组合'
})

/** 模板配置缓存：同一份对象反复渲染会拖慢 6 张缩略图 */
const templateCache = new Map<string, MinePageConfigType>()
function templateConfig(key: string): MinePageConfigType {
  const cached = templateCache.get(key)
  if (cached) return cached
  const built = buildTemplateConfig(key)
  templateCache.set(key, built)
  return built
}

const previewVisible = ref(false)
const previewKey = ref('')
const previewTpl = computed(() => getMineTemplate(previewKey.value))
const previewConfig = computed<MinePageConfigType>(() =>
  previewKey.value ? templateConfig(previewKey.value) : form.mineConfig)
const previewMenuTitles = computed(() => previewConfig.value.menuItems.map((m) => m.title))

function openPreview(key: string) {
  previewKey.value = key
  previewVisible.value = true
}

function applyPreviewTemplate() {
  const key = previewKey.value
  const tpl = getMineTemplate(key)
  if (!tpl) return
  // 先备份「保留项」，套用后原样写回：配色来源/页面色/头部样式不能被模板冲掉
  const keep: Record<string, unknown> = {
    themeSource: form.mineConfig.themeSource,
    themeColor: form.mineConfig.themeColor,
    themeColorSecondary: form.mineConfig.themeColorSecondary,
    pageBackgroundColor: form.mineConfig.pageBackgroundColor,
    headerStyle: form.mineConfig.headerStyle,
    userProfile: form.mineConfig.userProfile,
    previewNickname: form.mineConfig.previewNickname,
    previewAvatar: form.mineConfig.previewAvatar,
    previewPhone: form.mineConfig.previewPhone,
    previewEmail: form.mineConfig.previewEmail,
  }
  const next = buildTemplateConfig(key)
  // 沿用当前皮肤配色，避免套模板把用户选过的主色冲掉
  const currentStyle = resolveMineStyleKey(form.mineConfig as Record<string, unknown>)
  form.mineConfig = { ...next, ...keep } as MinePageConfigType
  applyMineStylePreset(form.mineConfig as Record<string, unknown>, currentStyle)
  // applyMineStylePreset 会重写 themeColor，页面覆盖态下再还原一次
  if (keep.themeSource === 'page') {
    form.mineConfig.themeColor = keep.themeColor as string
    form.mineConfig.themeColorSecondary = keep.themeColorSecondary as string
  }
  previewVisible.value = false
  ElMessage.success(`已套用「${tpl.name}」模板（仅草稿，需保存并发布配置）`)
}

function selectMineTemplate(key: string) {
  applyMineStylePreset(form.mineConfig as Record<string, unknown>, key)
}

async function onSave() {
  await handleSave()
}

async function onPublish() {
  await publishToMiniapp()
}

onMounted(async () => {
  await loadConfig()
})
</script>

<style scoped lang="scss">
/* 折叠帮助区里的规则清单：正文可读性优先，行高放宽 */
.rule-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li { line-height: 1.75; }

  b { font-weight: 600; }

  code {
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.05);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
  }
}
.mine-config-page { padding-bottom: 24px; }
.draft-alert { margin-bottom: 12px; }
.mine-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: start;
}
.mine-form {
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.mine-preview-wrap {
  position: sticky;
  top: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
}
.preview-chrome {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.preview-chrome__label { font-size: 12px; font-weight: 700; color: #4a5568; }
.preview-state {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  min-height: 24px;
}
.preview-state__hint { font-size: 11px; color: #9aa3b2; line-height: 1.4; }
.preview-phone {
  width: 380px;
  max-width: 100%;
  height: 660px;
  overflow: hidden auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  box-sizing: border-box;
}
.preview-theme {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: #6b7280;
}
.preview-theme__swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
.preview-theme__hex { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

.section-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.section-badge {
  font-size: 12px;
  color: var(--color-primary);
  background: rgba(23, 105, 255, 0.08);
  border-radius: 999px;
  padding: 2px 10px;
}
.section-label {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
}
.section-hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  line-height: 1.5;
}
.section-divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
}

/* ===== 模板库折叠开关 ===== */
.tpl-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 12px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #fafbfc;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.tpl-toggle:hover {
  border-color: var(--color-primary);
  background: #f5f8ff;
}
.tpl-toggle__label { font-size: 13px; font-weight: 700; color: #172033; }
.tpl-toggle__hint { font-size: 12px; color: #9aa3b2; display: inline-flex; align-items: center; gap: 4px; }
.tpl-toggle__arrow {
  display: inline-block;
  transition: transform 0.18s;
  font-size: 11px;
}
.tpl-toggle__arrow.open { transform: rotate(180deg); }

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.tpl-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.tpl-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}
.tpl-card.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(23, 105, 255, 0.15);
}
.tpl-thumb {
  position: relative;
  width: 128px;
  height: 246px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #f4f6fa;
  pointer-events: none;
}
.tpl-thumb__inner {
  width: 375px;
  transform: scale(0.3413);
  transform-origin: top left;
}
.tpl-thumb__flag {
  position: absolute;
  right: 4px;
  top: 4px;
  font-size: 11px;
  color: #fff;
  background: var(--color-primary);
  border-radius: 999px;
  padding: 1px 8px;
}
.tpl-body {
  padding-top: 8px;
}
.tpl-body__name {
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.tpl-body__desc {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}
.tpl-body__scene {
  margin-top: 2px;
  font-size: 11px;
  color: #9aa3b2;
  text-align: center;
  line-height: 1.35;
}

.pv {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  align-items: start;
}
.pv__phone {
  width: 340px;
  height: 620px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
}
.pv__phone > :deep(div) {
  width: 375px;
  transform: scale(0.9067);
  transform-origin: top left;
}
.pv__name { font-size: 16px; font-weight: 700; }
.pv__scene { margin-top: 4px; font-size: 12px; color: var(--color-primary); }
.pv__desc { margin: 10px 0 0; font-size: 13px; color: #4a5568; line-height: 1.7; }
.pv__label { margin-top: 16px; font-size: 12px; font-weight: 700; color: #4a5568; }
.pv__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pv__tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f2f5fa;
  color: #4a5568;
}
.pv__kv {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 6px 10px;
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}
.pv__kv b { color: #172033; font-weight: 500; }
.pv__warn {
  margin: 16px 0 0;
  padding: 8px 10px;
  font-size: 12px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  line-height: 1.6;
}
.pv__warn-list {
  margin: 6px 0 10px;
  padding-left: 18px;
}
.pv__warn-list li { margin-bottom: 2px; }
.pv__warn-list--keep { color: #166534; }
.pv__warn-note {
  margin: 6px 0 0;
  padding-top: 6px;
  border-top: 1px dashed #fcd34d;
  color: #92400e;
}

@media (max-width: 1180px) {
  .mine-layout { grid-template-columns: 1fr; }
  .mine-preview-wrap { position: static; }
  .pv { grid-template-columns: 1fr; }
  .pv__phone { width: 100%; height: 560px; }
}
</style>
