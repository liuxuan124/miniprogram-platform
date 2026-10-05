<template>
  <div class="login-config-page">
    <PageHeader
      title="登录页配置"
      description="小程序内置的登录页。左侧改配置、右侧实时预览，改动自动存入草稿。"
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
          <li><b>不能改结构</b>：这是小程序内置原生页，不进装修器。可改的是文案、按钮、隐私提示与皮肤。</li>
          <li><b>路径固定</b>：<code>/pages/login/login</code>，由小程序 app.json 注册。</li>
          <li><b>保存 ≠ 生效</b>：保存只写草稿，线上用户看到的仍是上一版，需点「发布配置」。</li>
          <li><b>与功能开关的关系</b>：登录能力本身受「系统功能」里的开关控制，本页只管登录页长什么样。</li>
        </ul>
      </template>
    </PageHeader>

    <div v-loading="loading" class="login-layout">
      <div class="login-form">
        <!-- ===== 模板库：默认收起，按需展开 ===== -->
        <div class="section-head">
          <div class="section-label">登录页模板</div>
          <span class="section-badge">当前：{{ currentTemplateName }}</span>
        </div>
        <p class="section-hint">
          {{ LOGIN_TEMPLATES.length }} 套成套方案，每套自带文案 + 皮肤 + 模块开关。展开看缩略图对比，选定后仍可继续微调。
        </p>

        <button type="button" class="tpl-toggle" @click="tplExpanded = !tplExpanded">
          <span class="tpl-toggle__label">
            {{ tplExpanded ? '收起模板库' : `展开 ${LOGIN_TEMPLATES.length} 套模板` }}
          </span>
          <span class="tpl-toggle__hint">
            {{ tplExpanded ? '收起以腾出首屏空间' : '默认收起，不占首屏' }}
            <span class="tpl-toggle__arrow" :class="{ open: tplExpanded }">▾</span>
          </span>
        </button>

        <div v-if="tplExpanded" class="tpl-grid">
          <button
            v-for="tpl in LOGIN_TEMPLATES"
            :key="tpl.key"
            type="button"
            class="tpl-card"
            :class="{ selected: currentTemplate === tpl.key }"
            @click="openPreview(tpl.key)"
          >
            <div class="tpl-thumb">
              <div class="tpl-thumb__inner">
                <LoginPagePreview :login-config="templateConfig(tpl.key)" :theme="form.theme" />
              </div>
              <span v-if="currentTemplate === tpl.key" class="tpl-thumb__flag">使用中</span>
            </div>
            <div class="tpl-body">
              <div class="tpl-body__name">{{ tpl.name }}</div>
              <div class="tpl-body__desc">{{ tpl.desc }}</div>
              <div class="tpl-body__scene">{{ tpl.scene }}</div>
            </div>
          </button>
        </div>

        <div class="section-divider"></div>

        <div class="section-label">外观皮肤</div>
        <p class="section-hint">同一套文案下可换配色；这只改皮肤预设，是否启用「页面独立配色」在下方主题配色区。</p>
        <div class="skin-picker">
          <button
            v-for="tpl in LOGIN_PAGE_STYLE_TEMPLATES"
            :key="tpl.key"
            type="button"
            class="skin-card"
            :class="{ selected: selectedSkin === tpl.key }"
            @click="selectSkin(tpl.key)"
          >
            <div class="skin-preview" :style="{ background: tpl.gradient, border: tpl.border }">
              <div class="skin-icon">{{ tpl.icon }}</div>
            </div>
            <div class="skin-name">{{ tpl.name }}</div>
            <div class="skin-desc">{{ tpl.desc }}</div>
          </button>
        </div>

        <div class="section-divider"></div>

        <LoginPageConfig v-model="form.loginPageConfig" :global-theme="form.theme" />
      </div>

      <div class="login-preview-wrap">
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
          <LoginPagePreview
            :login-config="form.loginPageConfig"
            :theme="form.theme"
            :identity="identity"
            :intercept-action="PREVIEW_INTERCEPT_ACTION"
          />
        </div>
        <div class="preview-theme">
          <span class="preview-theme__label">生效主色</span>
          <span class="preview-theme__swatch" :style="{ background: effectiveTheme.primary || 'transparent' }" />
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
          <LoginPagePreview
            :login-config="previewConfig"
            :theme="form.theme"
            identity="loggedin"
            :intercept-action="PREVIEW_INTERCEPT_ACTION"
          />
        </div>
        <div class="pv__side">
          <div class="pv__name">{{ previewTpl?.name }}</div>
          <div class="pv__scene">{{ previewTpl?.scene }}</div>
          <p class="pv__desc">{{ previewTpl?.desc }}。套用后可继续改文案、模块显隐与换肤。</p>

          <div class="pv__label">皮肤</div>
          <div class="pv__tags">
            <span class="pv__tag">{{ skinLabel(previewTpl?.styleKey) }}</span>
          </div>

          <div class="pv__label">右侧信息</div>
          <div class="pv__kv">
            <span>装饰光斑</span><b>{{ previewTpl?.showDecorOrbs ? '显示' : '隐藏' }}</b>
            <span>安全徽标</span><b>{{ previewTpl?.showSecurityBadge ? '显示' : '隐藏' }}</b>
            <span>返回按钮</span><b>{{ previewTpl?.showBackButton ? '显示' : '隐藏' }}</b>
          </div>

          <div class="pv__warn">
            <b>套用「{{ previewTpl?.name }}」会覆盖以下配置：</b>
            <ul class="pv__warn-list">
              <li v-for="f in LOGIN_TEMPLATE_OVERWRITE_FIELDS" :key="f.key">{{ f.label }}</li>
            </ul>
            <b>以下配置会保留：</b>
            <ul class="pv__warn-list pv__warn-list--keep">
              <li v-for="f in LOGIN_TEMPLATE_KEEP_FIELDS" :key="f.key">{{ f.label }}</li>
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
import LoginPageConfig from '@/components/miniapp-builder/LoginPageConfig.vue'
import LoginPagePreview from '@/components/miniapp-builder/LoginPagePreview.vue'
import type { LoginIdentity } from '@/components/miniapp-builder/LoginPagePreview.vue'
import {
  LOGIN_TEMPLATES,
  LOGIN_TEMPLATE_OVERWRITE_FIELDS,
  LOGIN_TEMPLATE_KEEP_FIELDS,
  buildLoginTemplateConfig,
  getLoginTemplate,
  resolveLoginTemplateKey,
  resolveLoginTemplateName,
} from '@/components/miniapp-builder/loginTemplates'
import type { LoginPageConfig as LoginPageConfigType } from '@/types/miniapp'
import { useMiniappConfig } from '@/components/miniapp-builder/composables/useMiniappConfig'
import {
  LOGIN_PAGE_STYLE_TEMPLATES,
  applyLoginPageStylePreset,
  resolveLoginPageStyleKey,
  resolveLoginEffectiveTheme,
  normalizeLoginThemeSource,
} from '@/types/miniapp'
import type { SaveState } from '@/components/SaveStateBar.vue'

defineOptions({ name: 'PageBuilderLogin' })

const router = useRouter()
const {
  form, loading, saving, publishing,
  isDirty, hasPendingSiteDraft, saveError,
  loadConfig, handleSave, publishToMiniapp,
} = useMiniappConfig()


/** 保存状态五态映射，语义与「我的」页一致 */
const saveState = computed<SaveState>(() => {
  if (saving.value) return 'saving'
  if (saveError.value) return 'error'
  if (isDirty.value) return 'dirty'
  if (hasPendingSiteDraft.value) return 'pending'
  return 'saved'
})

/** 模板库默认收起：4 张缩略图太占首屏，展开才渲染 */
const tplExpanded = ref(false)

/** 预览身份态：未登录 / 已登录 / 会员 */
const identity = ref<LoginIdentity>('guest')
const IDENTITY_LABEL: Record<LoginIdentity, string> = {
  guest: '未登录',
  loggedin: '已登录',
  member: '会员',
}
const IDENTITY_HINT: Record<LoginIdentity, string> = {
  guest: '协议未勾选，主按钮置灰不可提交',
  loggedin: '协议已勾选，可直接授权登录',
  member: '已开通会员，顶部出现「登录后即可」提示',
}
const identityLabel = computed(() => IDENTITY_LABEL[identity.value])
const identityHint = computed(() => IDENTITY_HINT[identity.value])
const identityTagType = computed(() =>
  identity.value === 'member' ? 'warning' : identity.value === 'loggedin' ? 'success' : 'info')

/** 已登录/会员态的示例拦截文案（仅预览，真机读登录拦截参数） */
const PREVIEW_INTERCEPT_ACTION = '同步收藏与阅读记录'

/** 生效主题色：继承/覆盖的唯一口径，与小程序端 system.js 同源 */
const effectiveTheme = computed(() => resolveLoginEffectiveTheme(
  {
    themeSource: form.loginPageConfig.themeSource,
    themeColor: form.loginPageConfig.themeColor,
    themeColorSecondary: form.loginPageConfig.themeColorSecondary,
  },
  form.theme,
))

const selectedSkin = computed(() => resolveLoginPageStyleKey(form.loginPageConfig))

const currentTemplate = computed(() => resolveLoginTemplateKey(form.loginPageConfig))
const currentTemplateName = computed(() => resolveLoginTemplateName(form.loginPageConfig))

/** 模板配置缓存：同一份对象反复渲染会拖慢缩略图 */
const templateCache = new Map<string, LoginPageConfigType>()
function templateConfig(key: string): LoginPageConfigType {
  const cached = templateCache.get(key)
  if (cached) return cached
  const built = buildLoginTemplateConfig(key)
  templateCache.set(key, built)
  return built
}

const previewVisible = ref(false)
const previewKey = ref('')
const previewTpl = computed(() => getLoginTemplate(previewKey.value))
const previewConfig = computed<LoginPageConfigType>(() =>
  previewKey.value ? templateConfig(previewKey.value) : form.loginPageConfig)

function openPreview(key: string) {
  previewKey.value = key
  previewVisible.value = true
}

function applyPreviewTemplate() {
  const key = previewKey.value
  const tpl = getLoginTemplate(key)
  if (!tpl) return
  const isPageTheme = normalizeLoginThemeSource(form.loginPageConfig.themeSource) === 'page'
  // 先备份「保留项」，套用后原样写回：配色来源与页面底色不能被模板冲掉
  const keep: Record<string, unknown> = {
    themeSource: form.loginPageConfig.themeSource,
    pageBackgroundColor: form.loginPageConfig.pageBackgroundColor,
  }
  // buildLoginTemplateConfig 内的 applyLoginPageStylePreset 会重写 themeColor，
  // 页面覆盖态下必须把用户选的颜色还原，否则「恢复继承」之外配的色会被吞掉。
  if (isPageTheme) {
    keep.themeColor = form.loginPageConfig.themeColor
    keep.themeColorSecondary = form.loginPageConfig.themeColorSecondary
  }
  const next = buildLoginTemplateConfig(key)
  form.loginPageConfig = { ...next, ...keep } as LoginPageConfigType
  previewVisible.value = false
  ElMessage.success(`已套用「${tpl.name}」模板（仅草稿，需保存并发布配置）`)
}

function selectSkin(key: string) {
  applyLoginPageStylePreset(form.loginPageConfig as unknown as Record<string, unknown>, key)
}

function skinLabel(styleKey?: string): string {
  if (!styleKey) return ''
  return LOGIN_PAGE_STYLE_TEMPLATES.find((t) => t.key === styleKey)?.name || styleKey
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
.login-config-page { padding-bottom: 24px; }
.draft-alert { margin-bottom: 12px; }
.login-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  align-items: start;
}
.login-form {
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.login-preview-wrap {
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
  &:hover { border-color: var(--color-primary); transform: translateY(-2px); }
  &.selected { border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(23, 105, 255, 0.15); }
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
  font-size: 10px;
  color: #fff;
  background: var(--color-primary);
  border-radius: 999px;
  padding: 1px 7px;
}
.tpl-body { padding: 6px 4px 2px; text-align: center; }
.tpl-body__name { font-size: 13px; font-weight: 600; color: #1f2937; }
.tpl-body__desc { font-size: 11px; color: #6b7280; margin-top: 2px; }
.tpl-body__scene { font-size: 10.5px; color: #9ca3af; margin-top: 1px; }

.skin-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.skin-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  background: #fff;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:hover { border-color: var(--color-primary); }
  &.selected { border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(23, 105, 255, 0.12); }
}
.skin-preview {
  height: 56px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}
.skin-icon { font-size: 22px; }
.skin-name { font-size: 12.5px; font-weight: 600; color: #1f2937; }
.skin-desc { font-size: 10.5px; color: #9ca3af; margin-top: 1px; line-height: 1.4; }

/* 大图预览 */
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
.pv__side { padding: 8px 0; }
.pv__name { font-size: 18px; font-weight: 700; color: #1f2937; }
.pv__scene { font-size: 12px; color: var(--color-primary); margin-top: 2px; }
.pv__desc { font-size: 13px; color: #4b5563; margin: 12px 0 16px; line-height: 1.6; }
.pv__label { font-size: 12px; font-weight: 700; color: #4a5568; margin-top: 16px; margin-bottom: 6px; }
.pv__tags { display: flex; flex-wrap: wrap; gap: 6px; }
.pv__tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
}
.pv__kv {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 4px 12px;
  font-size: 12px;
  color: #6b7280;
}
.pv__kv b { color: #1f2937; font-weight: 600; }
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
  .login-layout { grid-template-columns: 1fr; }
  .login-preview-wrap { position: static; }
  .pv { grid-template-columns: 1fr; }
  .pv__phone { width: 100%; height: 560px; }
}
</style>