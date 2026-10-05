<template>
  <div class="login-page-config">
    <div class="config-label">登录页配置</div>

    <!-- ===== 主题配色：继承全局 / 页面覆盖 ===== -->
    <div class="config-block">
      <div class="block-title">
        主题配色
        <span class="block-tip">默认跟随全局品牌色；开启覆盖后本页可单独配色</span>
      </div>

      <div class="theme-source" :class="themeSource === 'page' ? 'theme-source--page' : 'theme-source--inherit'">
        <span class="theme-source__dot" />
        <span class="theme-source__text">
          当前：<b>{{ themeSource === 'page' ? '页面独立覆盖' : '继承全局品牌色' }}</b>
        </span>
        <el-button
          v-if="themeSource === 'page'"
          text
          size="small"
          @click="restoreThemeInherit"
        >恢复继承</el-button>
      </div>

      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="配色来源">
          <el-radio-group :model-value="themeSource" size="small" @update:model-value="setThemeSource">
            <el-radio-button value="inherit">继承全局</el-radio-button>
            <el-radio-button value="page">页面独立</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <template v-if="themeSource === 'page'">
          <el-form-item label="主色">
            <el-color-picker
              :model-value="modelValue.themeColor || '#C2410C'"
              size="small"
              @update:model-value="(v: string) => updateField('themeColor', v)"
            />
            <span class="color-hint">{{ modelValue.themeColor || '#C2410C' }}</span>
          </el-form-item>
          <el-form-item label="辅色">
            <el-color-picker
              :model-value="modelValue.themeColorSecondary || '#EA580C'"
              size="small"
              @update:model-value="(v: string) => updateField('themeColorSecondary', v)"
            />
            <span class="color-hint">{{ modelValue.themeColorSecondary || '#EA580C' }}</span>
          </el-form-item>
        </template>
        <el-form-item v-else label="全局主色">
          <span class="color-swatch" :style="{ background: globalTheme.primaryColor }" />
          <span class="color-hint">{{ globalTheme.primaryColor || '未设置' }}</span>
          <span class="color-hint color-hint--faint">在「品牌导航」里改全局主色</span>
        </el-form-item>
      </el-form>

      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="页面背景">
          <el-color-picker
            :model-value="modelValue.pageBackgroundColor || ''"
            size="small"
            placeholder="跟随默认"
            @update:model-value="(v: string) => updateField('pageBackgroundColor', v)"
          />
          <span class="color-hint">{{ modelValue.pageBackgroundColor || '跟随登录页默认底色' }}</span>
          <el-button
            v-if="modelValue.pageBackgroundColor"
            text
            size="small"
            @click="updateField('pageBackgroundColor', '')"
          >清除</el-button>
        </el-form-item>
        <el-form-item label="顶部样式">
          <el-radio-group
            :model-value="headerStyle"
            size="small"
            @update:model-value="(v: any) => updateField('headerStyle', v)"
          >
            <el-radio-button value="gradient">渐变</el-radio-button>
            <el-radio-button value="solid">纯色</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="卡片样式">
          <el-radio-group
            :model-value="cardStyle"
            size="small"
            @update:model-value="(v: any) => updateField('cardStyle', v)"
          >
            <el-radio-button value="shadow">阴影</el-radio-button>
            <el-radio-button value="flat">扁平</el-radio-button>
            <el-radio-button value="outline">描边</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 内容模块显隐 ===== -->
    <div class="config-block">
      <div class="block-title">
        内容模块
        <span class="block-tip">隐藏后布局自动收拢，不留空白</span>
      </div>
      <div class="module-grid">
        <div v-for="key in LOGIN_MODULE_KEYS" :key="key" class="module-cell">
          <el-switch
            :model-value="modules[key]"
            size="small"
            @update:model-value="(v: any) => setModule(key, v !== false)"
          />
          <span class="module-cell__label">{{ LOGIN_MODULE_LABELS[key] }}</span>
        </div>
      </div>
      <p class="module-note">
        隐藏是<b>界面隐藏</b>，不影响授权与合规校验：协议勾选、隐私弹窗与登录主按钮
        始终保留（见下方锁定项）。
      </p>

      <!-- 合规锁定项：不给开关，只解释原因，避免有人以为漏做了功能 -->
      <div class="locked-list">
        <div v-for="item in LOGIN_COMPLIANCE_LOCKED_MODULES" :key="item.key" class="locked-cell">
          <el-switch :model-value="true" size="small" disabled />
          <span class="locked-cell__label">{{ item.label }}</span>
          <span class="locked-cell__reason">{{ item.reason }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 文案与开关 ===== -->
    <div class="config-block">
      <div class="block-title">文案与开关</div>
      <p class="block-hint">留空则不显示该字段；「用户协议 / 隐私政策」文案属合规内容，不提供隐藏开关。</p>
      <el-form label-width="100px" size="small" class="compact-form">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="顶部主标">
              <el-input :model-value="modelValue.heroTitle" placeholder="欢迎回来" maxlength="20" @input="(v: string) => updateField('heroTitle', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主标副文案">
              <el-input :model-value="modelValue.heroSubtitle" placeholder="登录后同步收藏、预约与阅读记录" maxlength="40" @input="(v: string) => updateField('heroSubtitle', v)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="登录按钮文案">
              <el-input :model-value="modelValue.loginButtonText" placeholder="手机号快捷登录" maxlength="16" @input="(v: string) => updateField('loginButtonText', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="暂不登录按钮">
              <el-input :model-value="modelValue.skipButtonText" placeholder="暂不登录（留空则不显示）" maxlength="12" @input="(v: string) => updateField('skipButtonText', v)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="表单标题">
              <el-input :model-value="modelValue.sheetTitle" placeholder="手机号快捷登录" maxlength="16" @input="(v: string) => updateField('sheetTitle', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="表单副文案">
              <el-input :model-value="modelValue.sheetSubtitle" placeholder="使用授权信息快速登录" maxlength="24" @input="(v: string) => updateField('sheetSubtitle', v)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="安全徽标文案">
              <el-input :model-value="modelValue.securityBadgeText" placeholder="安全登录（留空+关开关则隐藏）" maxlength="12" @input="(v: string) => updateField('securityBadgeText', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="底部隐私提示">
              <el-input :model-value="modelValue.privacyNoteText" placeholder="未登录也可浏览资讯；手机号仅用于登录" maxlength="60" @input="(v: string) => updateField('privacyNoteText', v)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="装饰光斑">
          <el-switch :model-value="modelValue.showDecorOrbs !== false" @update:model-value="(v: any) => updateField('showDecorOrbs', v !== false)" />
        </el-form-item>
        <el-form-item label="安全徽标">
          <el-switch :model-value="modelValue.showSecurityBadge !== false" @update:model-value="(v: any) => updateField('showSecurityBadge', v !== false)" />
        </el-form-item>
        <el-form-item label="返回按钮">
          <el-switch :model-value="modelValue.showBackButton !== false" @update:model-value="(v: any) => updateField('showBackButton', v !== false)" />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  LoginPageConfig,
  LoginModuleKey,
  LoginThemeSource,
} from '@/types/miniapp'
import {
  LOGIN_MODULE_KEYS,
  LOGIN_MODULE_LABELS,
  LOGIN_COMPLIANCE_LOCKED_MODULES,
  resolveLoginModules,
  normalizeLoginHeaderStyle,
  normalizeLoginCardStyle,
  DEFAULT_THEME,
} from '@/types/miniapp'

const props = defineProps<{
  modelValue: LoginPageConfig
  /** 全局品牌色：仅用于「继承全局」时展示当前实际生效值 */
  globalTheme?: { primaryColor?: string; secondaryColor?: string }
}>()
const emit = defineEmits<{ 'update:modelValue': [value: LoginPageConfig] }>()

const globalTheme = computed(() => props.globalTheme || DEFAULT_THEME)

/** 模块显隐（缺字段按 true，= 线上现状） */
const modules = computed(() => resolveLoginModules(props.modelValue.modules))

const themeSource = computed<LoginThemeSource>(() =>
  String(props.modelValue.themeSource) === 'page' ? 'page' : 'inherit')

const headerStyle = computed(() => normalizeLoginHeaderStyle(props.modelValue.headerStyle))
const cardStyle = computed(() => normalizeLoginCardStyle(props.modelValue.cardStyle))

function setThemeSource(value: unknown) {
  updateField('themeSource', value === 'page' ? 'page' : 'inherit')
}

/** 恢复继承：清掉显式开关，页面主题色值保留但不再生效（小程序端同语义） */
function restoreThemeInherit() {
  updateField('themeSource', 'inherit')
}

function setModule(key: LoginModuleKey, value: boolean) {
  const next = resolveLoginModules(props.modelValue.modules)
  next[key] = value
  emit('update:modelValue', { ...props.modelValue, modules: next })
}

function updateField(key: string, value: any) {
  // 就地写入 + 新对象发射，避免开关状态与预览不同步
  const current = props.modelValue as unknown as Record<string, unknown>
  current[key] = value
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.login-page-config { margin-bottom: 20px; }
.config-label { font-size: 14px; font-weight: 700; color: #172033; margin-bottom: 14px; }
.config-block { background: #fafbfc; border: 1px solid #e3e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
.block-title { display: flex; align-items: center; font-size: 13px; font-weight: 700; color: #4a5568; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eef0f4; }
.block-tip { margin-left: 8px; font-size: 12px; font-weight: 400; color: #9aa3b2; }
.block-hint { margin: 0 0 10px; font-size: 12px; color: #9aa3b2; line-height: 1.6; }
.compact-form .el-form-item { margin-bottom: 8px; }
.compact-form .el-form-item__label { font-size: 12px; }

/* ===== 主题配色：继承 / 覆盖 状态条 ===== */
.theme-source {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}
.theme-source--inherit { background: #f0f9eb; border: 1px solid #c6e5b3; color: #3f6f21; }
.theme-source--page { background: #fff7e8; border: 1px solid #f5dab0; color: #92400e; }
.theme-source__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: currentColor; flex: none;
}
.theme-source__text b { font-weight: 700; }
.theme-source .el-button { margin-left: auto; }

.color-swatch {
  display: inline-block;
  width: 18px; height: 18px;
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  vertical-align: middle;
  margin-right: 6px;
}
.color-hint { font-size: 12px; color: #6b7280; margin-left: 8px; }
.color-hint--faint { color: #9aa3b2; margin-left: 12px; }

/* ===== 内容模块开关网格 ===== */
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 8px 14px;
}
.module-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #4a5568;
}
.module-cell__label { line-height: 1.4; }
.module-note {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9aa3b2;
  line-height: 1.6;
}

/* ===== 合规锁定项 ===== */
.locked-list {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e3e8f0;
  display: grid;
  gap: 6px;
}
.locked-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #8b93a7;
}
.locked-cell__label { color: #6b7280; }
.locked-cell__reason {
  margin-left: auto;
  font-size: 11px;
  color: #b0b8c6;
  text-align: right;
}
</style>