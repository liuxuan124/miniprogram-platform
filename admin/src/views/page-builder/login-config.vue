<template>
  <div class="login-config-page">
    <PageHeader
      title="固定页 · 登录"
      description="路径锁定为 /pages/login/login，属于固定页（原生页）。先从模板库挑一套成型方案，再微调皮肤与文案；保存并上线后真机立即读取。"
    >
      <template #actions>
        <el-button @click="router.push('/mini/pages')">返回页面列表</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="login-layout">
      <div class="login-form">
        <div class="section-head">
          <div class="section-label">登录页模板</div>
          <span class="section-badge">当前：{{ currentTemplateName }}</span>
        </div>
        <p class="section-hint">每张卡片都是这套模板的真实效果缩略图，点开可看大图对比；选定后写入下方配置，仍可继续微调文案与开关。</p>
        <div class="tpl-grid">
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
        <p class="section-hint">同一套文案下可换配色；点皮肤卡片即切换主色与装饰开关，不改文案。</p>
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

        <div class="section-label">文案与开关</div>
        <p class="section-hint">顶部主标、登录按钮文案、底部隐私提示等，留空则不显示该字段。</p>
        <el-form label-position="top" class="login-fields">
          <div class="field-row">
            <el-form-item label="顶部主标">
              <el-input v-model="form.loginConfig.heroTitle" placeholder="欢迎回来" maxlength="20" />
            </el-form-item>
            <el-form-item label="主标副文案">
              <el-input v-model="form.loginConfig.heroSubtitle" placeholder="登录后同步收藏、预约与阅读记录" maxlength="40" />
            </el-form-item>
          </div>
          <div class="field-row">
            <el-form-item label="登录按钮文案">
              <el-input v-model="form.loginConfig.loginButtonText" placeholder="手机号快捷登录" maxlength="16" />
            </el-form-item>
            <el-form-item label="暂不登录按钮">
              <el-input v-model="form.loginConfig.skipButtonText" placeholder="暂不登录（留空则不显示）" maxlength="12" />
            </el-form-item>
          </div>
          <div class="field-row">
            <el-form-item label="表单标题">
              <el-input v-model="form.loginConfig.sheetTitle" placeholder="手机号快捷登录" maxlength="16" />
            </el-form-item>
            <el-form-item label="表单副文案">
              <el-input v-model="form.loginConfig.sheetSubtitle" placeholder="使用授权信息快速登录" maxlength="24" />
            </el-form-item>
          </div>
          <div class="field-row">
            <el-form-item label="安全徽标文案">
              <el-input v-model="form.loginConfig.securityBadgeText" placeholder="安全登录（留空+关开关则隐藏）" maxlength="12" />
            </el-form-item>
            <el-form-item label="底部隐私提示">
              <el-input v-model="form.loginConfig.privacyNoteText" placeholder="未登录也可浏览资讯；手机号仅用于登录" maxlength="60" />
            </el-form-item>
          </div>
          <div class="field-toggles">
            <el-checkbox v-model="form.loginConfig.showDecorOrbs">顶部装饰光斑</el-checkbox>
            <el-checkbox v-model="form.loginConfig.showSecurityBadge">安全徽标</el-checkbox>
            <el-checkbox v-model="form.loginConfig.showBackButton">返回按钮</el-checkbox>
          </div>
        </el-form>
      </div>

      <div class="login-preview-wrap">
        <LoginPagePreview :login-config="form.loginConfig" :theme="form.theme" />
      </div>
    </div>

    <el-dialog
      v-model="previewVisible"
      width="780px"
      top="4vh"
      destroy-on-close
      :title="`模板预览 · ${previewTpl?.name || ''}`"
    >
      <div class="pv">
        <div class="pv__phone">
          <LoginPagePreview :login-config="previewConfig" :theme="form.theme" />
        </div>
        <div class="pv__side">
          <div class="pv__name">{{ previewTpl?.name }}</div>
          <div class="pv__scene">{{ previewTpl?.scene }}</div>
          <p class="pv__desc">{{ previewTpl?.desc }}。套用后可继续改文案与换肤。</p>

          <div class="pv__label">皮肤</div>
          <div class="pv__tags">
            <span class="pv__tag">{{ skinLabel(previewTpl?.styleKey) }}</span>
          </div>

          <div class="pv__label">开关</div>
          <div class="pv__kv">
            <span>装饰光斑</span><b>{{ previewTpl?.showDecorOrbs ? '显示' : '隐藏' }}</b>
            <span>安全徽标</span><b>{{ previewTpl?.showSecurityBadge ? '显示' : '隐藏' }}</b>
            <span>返回按钮</span><b>{{ previewTpl?.showBackButton ? '显示' : '隐藏' }}</b>
          </div>

          <el-button type="primary" class="mw-btn-primary" @click="applyPreviewTemplate">套用这套模板</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import LoginPagePreview from '@/components/miniapp-builder/LoginPagePreview.vue'
import {
  LOGIN_TEMPLATES,
  buildLoginTemplateConfig,
  getLoginTemplate,
  resolveLoginTemplateKey,
} from '@/components/miniapp-builder/loginTemplates'
import {
  CONFIG_KEYS,
  DEFAULT_THEME,
  DEFAULT_LOGIN_PAGE_CONFIG,
  LOGIN_PAGE_STYLE_TEMPLATES,
  applyLoginPageStylePreset,
  resolveLoginPageStyleKey,
  type LoginPageConfig,
  type ThemeConfig,
} from '@/types/miniapp'
import { getConfigByGroupSilent, updateConfigs } from '@/api/system'

defineOptions({ name: 'PageBuilderLogin' })

const router = useRouter()
const loading = ref(false)
const saving = ref(false)

const form = reactive<{
  loginConfig: LoginPageConfig
  theme: Pick<ThemeConfig, 'primaryColor' | 'secondaryColor'>
}>({
  loginConfig: { ...DEFAULT_LOGIN_PAGE_CONFIG },
  theme: { primaryColor: DEFAULT_THEME.primaryColor, secondaryColor: DEFAULT_THEME.secondaryColor },
})

/** 线上配置全量（兜底）+ 待上线草稿 */
let basicConfig: Record<string, string> = {}
let siteDraft: Record<string, string> = {}

const currentTemplate = computed(() => resolveLoginTemplateKey(form.loginConfig))
const currentTemplateName = computed(() => {
  const tpl = getLoginTemplate(currentTemplate.value)
  return tpl ? tpl.name : '自定义组合'
})
const selectedSkin = computed(() => resolveLoginPageStyleKey(form.loginConfig))

function parseJsonish(v: unknown): Record<string, any> | null {
  if (v == null || v === '') return null
  if (typeof v === 'object') return v as Record<string, any>
  try {
    const o = JSON.parse(String(v))
    return o && typeof o === 'object' ? o : null
  } catch {
    return null
  }
}

/** 模板配置缓存 */
const templateCache = new Map<string, LoginPageConfig>()
function templateConfig(key: string): LoginPageConfig {
  const cached = templateCache.get(key)
  if (cached) return cached
  const built = buildLoginTemplateConfig(key)
  templateCache.set(key, built)
  return built
}

/* 大图预览 */
const previewVisible = ref(false)
const previewKey = ref('')
const previewTpl = computed(() => getLoginTemplate(previewKey.value))
const previewConfig = computed<LoginPageConfig>(() =>
  previewKey.value ? templateConfig(previewKey.value) : form.loginConfig)

function openPreview(key: string) {
  previewKey.value = key
  previewVisible.value = true
}

function applyPreviewTemplate() {
  const tpl = getLoginTemplate(previewKey.value)
  if (!tpl) return
  form.loginConfig = { ...buildLoginTemplateConfig(previewKey.value) }
  previewVisible.value = false
  ElMessage.success(`已套用「${tpl.name}」模板，记得保存`)
}

function selectSkin(key: string) {
  applyLoginPageStylePreset(form.loginConfig as unknown as Record<string, unknown>, key)
}

function skinLabel(styleKey?: string): string {
  if (!styleKey) return ''
  return LOGIN_PAGE_STYLE_TEMPLATES.find((t) => t.key === styleKey)?.name || styleKey
}

/**
 * 组装完整待上线草稿（与「我的」/pages.vue 同口径）：
 * 以线上值为底、草稿覆盖，避免只写一个键就被后端当成"只改了这一项"。
 */
function buildDraftPayload(): Record<string, string> {
  const keys: string[] = [
    CONFIG_KEYS.TEMPLATE_KEY,
    CONFIG_KEYS.HOME_PAGE_ID,
    CONFIG_KEYS.MINE_PAGE_ID,
    CONFIG_KEYS.TABBAR_ITEMS,
    CONFIG_KEYS.MINE_PAGE_CONFIG,
    CONFIG_KEYS.LOGIN_PAGE_CONFIG,
    CONFIG_KEYS.THEME_CONFIG,
    CONFIG_KEYS.SHARE_TITLE,
    CONFIG_KEYS.SHARE_IMAGE,
  ]
  const base: Record<string, string> = {}
  for (const k of keys) base[k] = String(basicConfig[k] ?? '')
  return { ...base, ...(siteDraft || {}) }
}

async function onSave() {
  saving.value = true
  try {
    const payload = buildDraftPayload()
    payload[CONFIG_KEYS.LOGIN_PAGE_CONFIG] = JSON.stringify(form.loginConfig)
    await updateConfigs([
      {
        configKey: 'site_builder_draft',
        configValue: JSON.stringify(payload),
        configGroup: 'basic',
        description: '登录页待上线草稿',
      },
    ] as any)
    siteDraft = payload
    ElMessage.success('已保存为待上线草稿，请到「概览」点「上线到小程序」后真机生效')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function loadConfig() {
  loading.value = true
  try {
    const cfgRes = await getConfigByGroupSilent('basic').catch(() => null)
    const data = (cfgRes as any)?.data
    const list = (data?.configs || data || []) as Array<{ configKey?: string; configValue?: unknown }>
    const map: Record<string, string> = {}
    for (const c of Array.isArray(list) ? list : []) {
      if (c?.configKey) map[c.configKey] = String(c.configValue ?? '')
    }
    basicConfig = map
    const draft = parseJsonish(map.site_builder_draft) || {}
    siteDraft = draft as Record<string, string>
    const fromDraft = parseJsonish((draft as Record<string, unknown>)[CONFIG_KEYS.LOGIN_PAGE_CONFIG])
    const fromLive = parseJsonish(map[CONFIG_KEYS.LOGIN_PAGE_CONFIG])
    const merged = { ...DEFAULT_LOGIN_PAGE_CONFIG, ...(fromLive || {}), ...(fromDraft || {}) }
    form.loginConfig = merged as LoginPageConfig
  } catch (e: any) {
    ElMessage.error(e?.message || '加载配置失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadConfig)
</script>

<style scoped lang="scss">
.login-config-page { padding-bottom: 24px; }
.login-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
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
}
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

.login-fields { margin-top: 4px; }
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field-toggles {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 4px 0;
}

/* 大图预览 */
.pv {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
}
.pv__phone {
  width: 200px;
  height: 432px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid #e8dfd2;
  background: #fffbf6;
}
.pv__phone :deep(.login-page-preview) {
  transform: scale(0.5333);
  transform-origin: top left;
}
.pv__side { padding: 8px 0; }
.pv__name { font-size: 18px; font-weight: 700; color: #1f2937; }
.pv__scene { font-size: 12px; color: #6b7280; margin-top: 2px; }
.pv__desc { font-size: 13px; color: #4b5563; margin: 12px 0 16px; line-height: 1.6; }
.pv__label { font-size: 12px; color: #9ca3af; margin-top: 12px; margin-bottom: 6px; }
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
  grid-template-columns: auto auto;
  gap: 4px 12px;
  font-size: 12px;
  span { color: #9ca3af; }
  b { color: #1f2937; font-weight: 600; }
}
</style>
