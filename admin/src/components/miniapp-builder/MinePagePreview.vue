<template>
  <div class="mine-page-preview">
    <!-- 机内「编辑资料」假页（非真实跳转） -->
    <div v-if="showProfileEdit" class="profile-edit">
      <div class="profile-edit-nav">
        <button type="button" class="profile-edit-back" @click="closeProfileEdit">‹</button>
        <span class="profile-edit-title">编辑资料</span>
        <span class="profile-edit-nav-spacer" />
      </div>
      <div class="profile-edit-body">
        <button type="button" class="profile-edit-avatar-btn" @click="triggerAvatarPick">
          <img
            v-if="editAvatar"
            class="profile-edit-avatar-img"
            :src="editAvatar"
            alt=""
          />
          <span v-else class="profile-edit-avatar-fallback">👤</span>
          <span class="profile-edit-avatar-cam" aria-hidden="true">📷</span>
          <input
            ref="avatarFileInput"
            class="profile-edit-avatar-file"
            type="file"
            accept="image/*"
            @change="onAvatarFileChange"
          />
        </button>
        <div class="profile-edit-field">
          <label class="profile-edit-label">昵称</label>
          <input
            class="profile-edit-input"
            :class="{ 'profile-edit-input--error': nicknameError }"
            type="text"
            :value="editNickname"
            placeholder="请输入昵称"
            @input="onNicknameInput"
          />
          <div v-if="nicknameError" class="profile-edit-tip">{{ nicknameError }}</div>
          <div v-else class="profile-edit-hint">最多 {{ NICKNAME_MAX_LEN }} 个字</div>
        </div>
        <div class="profile-edit-field">
          <label class="profile-edit-label">手机号</label>
          <input
            class="profile-edit-input"
            :class="{ 'profile-edit-input--warn': phoneSoftTip }"
            type="tel"
            :value="editPhone"
            placeholder="请输入手机号"
            @input="onPhoneInput"
          />
          <div v-if="phoneSoftTip" class="profile-edit-soft">{{ phoneSoftTip }}</div>
        </div>
        <div class="profile-edit-field">
          <label class="profile-edit-label">邮箱</label>
          <input
            class="profile-edit-input"
            :class="{ 'profile-edit-input--warn': emailSoftTip }"
            type="email"
            :value="editEmail"
            placeholder="请输入邮箱"
            @input="onEmailInput"
          />
          <div v-if="emailSoftTip" class="profile-edit-soft">{{ emailSoftTip }}</div>
        </div>
        <button
          type="button"
          class="profile-edit-save"
          :disabled="!canSaveProfile"
          @click="saveProfileEdit"
        >保存</button>
      </div>
    </div>

    <template v-else>
      <div
        v-if="showDecorBackground"
        class="mine-decor"
        :class="`mine-decor--${styleKey}`"
        aria-hidden="true"
      >
        <!-- 会员版：丝绸感装饰（柔滑褶皱光泽） -->
        <svg
          v-if="styleKey === 'member'"
          class="mine-decor-ribbons"
          viewBox="0 0 375 220"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="silkFoldA" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55" />
              <stop offset="35%" stop-color="#E8F2FC" stop-opacity="0.28" />
              <stop offset="65%" stop-color="#B8D0E8" stop-opacity="0.22" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.4" />
            </linearGradient>
            <linearGradient id="silkFoldB" x1="100%" y1="20%" x2="0%" y2="80%">
              <stop offset="0%" stop-color="#F5FAFF" stop-opacity="0.45" />
              <stop offset="40%" stop-color="#C5DCF0" stop-opacity="0.18" />
              <stop offset="70%" stop-color="#9BB8D4" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.38" />
            </linearGradient>
            <linearGradient id="silkShine" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0" />
              <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.55" />
              <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.15" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="silkShade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#7A9EBE" stop-opacity="0" />
              <stop offset="50%" stop-color="#7A9EBE" stop-opacity="0.12" />
              <stop offset="100%" stop-color="#7A9EBE" stop-opacity="0" />
            </linearGradient>
            <filter id="silkSoft" x="-8%" y="-20%" width="116%" height="140%">
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
          </defs>

          <!-- 宽幅丝绸层：柔和波浪褶皱（偏上，避开用户名） -->
          <g filter="url(#silkSoft)" opacity="0.95">
            <path
              class="mine-decor-ribbon mine-decor-ribbon--a"
              fill="url(#silkFoldA)"
              d="M-50 -8
                 C40 -36, 110 30, 190 -4
                 C260 -28, 310 16, 420 -16
                 L420 48
                 C310 68, 250 22, 185 50
                 C110 82, 40 32, -50 56 Z"
            />
            <path
              class="mine-decor-ribbon mine-decor-ribbon--b"
              fill="url(#silkFoldB)"
              d="M-50 48
                 C50 24, 130 88, 220 56
                 C290 34, 340 84, 420 54
                 L420 108
                 C340 128, 285 82, 215 110
                 C130 140, 50 92, -50 118 Z"
            />
          </g>

          <!-- 丝绸高光条：缎面反光 -->
          <path
            class="mine-decor-ribbon mine-decor-ribbon--c"
            fill="url(#silkShine)"
            d="M-20 8
               C70 -16, 150 36, 240 4
               C300 -14, 350 0, 400 -6
               L400 10
               C350 16, 300 2, 242 20
               C152 48, 70 0, -20 22 Z"
          />
          <path
            fill="url(#silkShine)"
            opacity="0.55"
            d="M40 62
               C120 40, 200 88, 290 60
               C340 46, 370 64, 410 56
               L410 70
               C370 78, 340 60, 292 74
               C202 100, 120 54, 40 76 Z"
          />
          <!-- 轻阴影褶皱 -->
          <path
            fill="url(#silkShade)"
            d="M80 18
               C140 -2, 190 44, 260 22
               C300 10, 330 28, 380 18
               L380 38
               C330 46, 300 28, 262 40
               C192 62, 140 16, 80 36 Z"
          />
        </svg>
      </div>
      <div class="mine-page-body" :class="{ 'mine-page-body--decor': showDecorBackground }">
        <!-- 红区：头像资料行，叠在装饰背景上 -->
        <div
          class="profile-row profile-row--clickable"
          :class="{
            'profile-row--on-decor': showDecorBackground,
            'profile-row--plain': !showDecorBackground,
            [`profile-row--${styleKey}`]: true,
          }"
          role="button"
          tabindex="0"
          @click="openProfileEdit"
          @keydown.enter.prevent="openProfileEdit"
        >
          <div v-if="mineConfig.userProfile.showAvatar" class="user-avatar">
            <img
              v-if="mineConfig.previewAvatar"
              class="user-avatar-img"
              :src="mineConfig.previewAvatar"
              alt=""
            />
            <template v-else>👤</template>
          </div>
          <div class="user-info">
            <template v-if="previewLoggedIn">
              <div class="user-name-row">
                <strong class="user-title">{{
                  mineConfig.userProfile.showNickname !== false
                    ? (mineConfig.previewNickname || '微信用户')
                    : '用户'
                }}</strong>
                <span
                  v-if="mineConfig.userProfile.showMemberLevel"
                  class="user-level"
                  :class="`user-level--${styleKey}`"
                >
                  {{ loggedInLevelLabel }}
                </span>
              </div>
              <div v-if="loggedInSubtitle" class="user-expire-row">
                <span class="user-subtitle">{{ loggedInSubtitle }}</span>
                <span class="user-expire-chevron" aria-hidden="true">›</span>
              </div>
            </template>
            <template v-else>
              <strong class="user-title">{{ mineConfig.loginTitle || '点击登录，解锁会员权益' }}</strong>
              <span v-if="mineConfig.loginSubtitle" class="user-subtitle">{{ mineConfig.loginSubtitle }}</span>
            </template>
          </div>
        </div>

        <!-- 绿区：会员信息卡片（搭建侧可关） -->
        <div
          v-if="mineConfig.showMemberCard !== false"
          class="member-info-card"
          :class="[
            `member-info-card--${styleKey}`,
            { 'mine-card--outline': mineAccentColors.outline },
          ]"
          :style="memberCardStyle"
        >
          <div
            v-if="SHOW_MEMBER_CROWN && styleKey === 'member'"
            class="member-info-crown-wrap"
            aria-hidden="true"
          >
            <!-- 凹嵌皇冠：白边框托起 + 内底面下沉；经典三主峰+两侧峰 -->
            <svg class="member-info-crown-svg" viewBox="0 0 72 64" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="crownWellFloor" x1="20%" y1="10%" x2="85%" y2="90%">
                  <stop offset="0%" stop-color="#FFF8E8" />
                  <stop offset="48%" stop-color="#F5DFA0" />
                  <stop offset="100%" stop-color="#E8B84A" />
                </linearGradient>
                <linearGradient id="crownWellShade" x1="0%" y1="0%" x2="70%" y2="80%">
                  <stop offset="0%" stop-color="#B07A18" stop-opacity="0.38" />
                  <stop offset="42%" stop-color="#C9922A" stop-opacity="0.12" />
                  <stop offset="100%" stop-color="#C9922A" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="crownWellLift" x1="100%" y1="100%" x2="30%" y2="20%">
                  <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
                  <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0" />
                </linearGradient>
                <!-- 外轮廓：左峰 / 次峰 / 中高峰 / 次峰 / 右峰 + 宽底托 -->
                <path
                  id="crownShapeOuter"
                  d="M8 46
                     L10 24
                     C10 20 13 18 16 20
                     L22 36
                     L28 16
                     C30 11 33 8 36 8
                     C39 8 42 11 44 16
                     L50 36
                     L56 20
                     C59 18 62 20 62 24
                     L64 46
                     L64 52
                     C64 56.4 60.4 60 56 60
                     L16 60
                     C11.6 60 8 56.4 8 52
                     Z"
                />
                <!-- 内底：同形略缩，形成槽 -->
                <path
                  id="crownShapeInner"
                  d="M13 45
                     L15 27
                     C15 24.5 17 23.2 19 24.5
                     L24 37
                     L29 20
                     C30.5 16 33 13.5 36 13.5
                     C39 13.5 41.5 16 43 20
                     L48 37
                     L53 24.5
                     C55 23.2 57 24.5 57 27
                     L59 45
                     L59 50
                     C59 53 56.5 55.5 53.5 55.5
                     L18.5 55.5
                     C15.5 55.5 13 53 13 50
                     Z"
                />
              </defs>

              <use href="#crownShapeOuter" fill="rgba(180, 120, 30, 0.22)" />
              <use
                href="#crownShapeOuter"
                fill="none"
                stroke="rgba(255, 255, 255, 0.88)"
                stroke-width="5.2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
              <use href="#crownShapeInner" fill="url(#crownWellFloor)" />
              <use href="#crownShapeInner" fill="url(#crownWellShade)" />
              <use href="#crownShapeInner" fill="url(#crownWellLift)" />
              <use
                href="#crownShapeInner"
                fill="none"
                stroke="rgba(160, 110, 30, 0.2)"
                stroke-width="1.2"
                stroke-linejoin="round"
              />
              <!-- 三主峰圆顶，加强皇冠识别 -->
              <circle cx="16" cy="21" r="2.6" fill="rgba(255,255,255,0.55)" />
              <circle cx="36" cy="10" r="3.1" fill="rgba(255,255,255,0.62)" />
              <circle cx="56" cy="21" r="2.6" fill="rgba(255,255,255,0.55)" />
            </svg>
          </div>
          <div class="member-info-main">
            <div class="member-info-title">{{ mineConfig.memberCardTitle || '会员中心' }}</div>
            <div v-if="mineConfig.userProfile.showMemberLevel" class="member-info-level">
              {{ previewLoggedIn ? loggedInLevelLabel : (mineConfig.userProfile.memberLevelLabel || '会员等级') }}
            </div>
            <div class="member-info-benefits">{{ memberBenefitsLine }}</div>
          </div>
          <button
            v-if="memberCtaText"
            class="member-cta"
            type="button"
            @click="onMemberCtaClick"
          >{{ memberCtaText }}</button>
        </div>

        <div v-if="mineConfig.orderQuickAccess.showOrderTabs" class="order-card">
          <div class="order-card-header">
            <span class="order-card-title">我的订单</span>
            <span
              v-if="mineConfig.orderQuickAccess.showAllOrdersBtn"
              class="all-orders-link"
            >
              全部订单
            </span>
          </div>
          <div class="order-tabs">
            <div
              v-for="key in ORDER_TAB_KEYS"
              :key="key"
              class="order-tab-item"
            >
              <MenuIconDisplay class="order-tab-icon" :icon="ORDER_TAB_ICONS[key]" :size="24" />
              <span class="order-tab-label">{{ tabLabel(key) }}</span>
            </div>
          </div>
        </div>

        <div v-if="visibleMenuItems.length" class="menu-card">
          <div class="preview-menu-list">
            <div
              v-for="item in visibleMenuItems"
              :key="item.id"
              class="preview-menu-row"
              :class="{ 'preview-menu-row--clickable': isSettingsMenuItem(item) && previewLoggedIn }"
              @click="onMenuItemClick(item)"
            >
              <MenuIconDisplay
                v-if="mineConfig.showMenuIcons"
                class="menu-icon"
                :icon="item.icon"
                :size="26"
              />
              <span class="menu-text">{{ item.title }}</span>
              <span class="menu-chevron">›</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { PREVIEW_LOGIN_SHEET_API } from '@/utils/preview-phone-overlay'
import type { MinePageConfig, MineMenuItem, ThemeConfig, OrderTabKey } from '@/types/miniapp'
import {
  ORDER_TAB_KEYS,
  ORDER_TAB_ICONS,
  DEFAULT_ORDER_QUICK_ACCESS,
  resolveMineStyleKey,
} from '@/types/miniapp'
import MenuIconDisplay from './MenuIconDisplay.vue'

const NICKNAME_MAX_LEN = 10
/** 会员卡嵌入式磨砂皇冠：暂隐藏，改 true 可恢复 */
const SHOW_MEMBER_CROWN = false

const props = defineProps<{
  mineConfig: MinePageConfig
  theme: Pick<ThemeConfig, 'primaryColor' | 'secondaryColor'>
}>()

const emit = defineEmits<{
  'update:previewNickname': [value: string]
  'update:previewAvatar': [value: string]
  'update:previewPhone': [value: string]
  'update:previewEmail': [value: string]
}>()

/** 仅预览态切换，非真实登录；由外层 chrome 控制 */
const previewLoggedIn = defineModel<boolean>('previewLoggedIn', { default: false })

const showProfileEdit = ref(false)
const loginSheetApi = inject(PREVIEW_LOGIN_SHEET_API, null)

onMounted(() => {
  loginSheetApi?.setCompleteHandler(() => {
    previewLoggedIn.value = true
  })
})

onUnmounted(() => {
  loginSheetApi?.setCompleteHandler(null)
})
const editNickname = ref('')
const editAvatar = ref('')
const editPhone = ref('')
const editEmail = ref('')
const avatarFileInput = ref<HTMLInputElement | null>(null)

const visibleMenuItems = computed(() => props.mineConfig.menuItems.filter((m) => m.enabled))

const showDecorBackground = computed(() => props.mineConfig.showDecorBackground !== false)

const styleKey = computed(() => resolveMineStyleKey(props.mineConfig))

const loggedInLevelLabel = computed(() => {
  const custom = (props.mineConfig.userProfile.memberLevelLabel || '').trim()
  if (custom && custom !== '会员等级') return custom
  return styleKey.value === 'member' ? '黄金会员' : '普通会员'
})

const loggedInSubtitle = computed(() => '会员至：2027-02-03')

const nicknameError = computed(() => {
  if (editNickname.value.length > NICKNAME_MAX_LEN) {
    return `昵称不能超过${NICKNAME_MAX_LEN}个字`
  }
  return ''
})

const phoneSoftTip = computed(() => {
  const p = editPhone.value.trim()
  if (!p) return ''
  const digits = p.replace(/\D/g, '')
  if (/[a-zA-Z]/.test(p) || digits.length < 7 || digits.length > 15) {
    return '手机号格式可能不正确'
  }
  return ''
})

const emailSoftTip = computed(() => {
  const e = editEmail.value.trim()
  if (!e) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    return '邮箱格式可能不正确'
  }
  return ''
})

const canSaveProfile = computed(() => {
  const nick = editNickname.value.trim()
  return nick.length > 0 && nick.length <= NICKNAME_MAX_LEN && !nicknameError.value
})

/** 配置面板「预览昵称」变更时，若未在编辑态则保持本地草稿一致 */
watch(
  () => props.mineConfig.previewNickname,
  (v) => {
    if (!showProfileEdit.value) {
      editNickname.value = String(v ?? '微信用户')
    }
  },
)

watch(
  () => [props.mineConfig.previewAvatar, props.mineConfig.previewPhone, props.mineConfig.previewEmail] as const,
  ([avatar, phone, email]) => {
    if (!showProfileEdit.value) {
      editAvatar.value = String(avatar ?? '')
      editPhone.value = String(phone ?? '')
      editEmail.value = String(email ?? '')
    }
  },
)

function openProfileEdit() {
  if (!previewLoggedIn.value) {
    openLoginSheet()
    return
  }
  editNickname.value = String(props.mineConfig.previewNickname ?? '微信用户')
  editAvatar.value = String(props.mineConfig.previewAvatar ?? '')
  editPhone.value = String(props.mineConfig.previewPhone ?? '')
  editEmail.value = String(props.mineConfig.previewEmail ?? '')
  showProfileEdit.value = true
}

function openLoginSheet() {
  loginSheetApi?.open()
}

function closeProfileEdit() {
  showProfileEdit.value = false
}

function onNicknameInput(e: Event) {
  editNickname.value = (e.target as HTMLInputElement).value
}

function onPhoneInput(e: Event) {
  editPhone.value = (e.target as HTMLInputElement).value
}

function onEmailInput(e: Event) {
  editEmail.value = (e.target as HTMLInputElement).value
}

function triggerAvatarPick() {
  avatarFileInput.value?.click()
}

function onAvatarFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    editAvatar.value = String(reader.result || '')
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function saveProfileEdit() {
  if (!canSaveProfile.value) return
  const nick = editNickname.value.trim()
  emit('update:previewNickname', nick)
  emit('update:previewAvatar', editAvatar.value)
  emit('update:previewPhone', editPhone.value.trim())
  emit('update:previewEmail', editEmail.value.trim())
  editNickname.value = nick
  showProfileEdit.value = false
}

function isSettingsMenuItem(item: MineMenuItem): boolean {
  const title = (item.title || '').trim()
  const icon = (item.icon || '').toLowerCase()
  const url = (item.url || '').toLowerCase()
  return (
    title === '设置' ||
    title.includes('设置') ||
    icon.includes('gear') ||
    icon.includes('setting') ||
    url.includes('setting')
  )
}

/** 预览专用：已登录时点「设置」切到未登录 */
function onMenuItemClick(item: MineMenuItem) {
  if (previewLoggedIn.value && isSettingsMenuItem(item)) {
    previewLoggedIn.value = false
  }
}

const memberBenefitsLine = computed(() => {
  if (previewLoggedIn.value) {
    if (styleKey.value === 'member') {
      return '专属折扣 · 积分加速 · 优先预约'
    }
    return '成长值 320 · 距下一等级还差 180'
  }
  if (styleKey.value === 'member') {
    return '专属折扣 · 积分加速 · 优先预约'
  }
  return '登录后查看会员权益与成长进度'
})

const memberCtaText = computed(() => {
  if (previewLoggedIn.value) return '查看权益'
  const raw = (props.mineConfig.loginButtonText || '').trim()
  // 预览未登录 CTA：优先简洁「登录」，点了只切预览态（非真登录）
  if (raw && raw !== '微信一键登录') return raw
  return '登录'
})

/** 预览与真机一致：点登录唤起半屏 login-sheet */
function onMemberCtaClick() {
  if (!previewLoggedIn.value) {
    openLoginSheet()
  }
}

function tabLabel(key: OrderTabKey): string {
  const labels = props.mineConfig.orderQuickAccess.tabLabels as Partial<Record<OrderTabKey, string>> & { refund?: string }
  if (key === 'completed') {
    const raw = labels.completed || labels.refund
    if (!raw || raw === '退换/售后') return DEFAULT_ORDER_QUICK_ACCESS.tabLabels.completed
    return raw
  }
  return labels[key] || DEFAULT_ORDER_QUICK_ACCESS.tabLabels[key]
}

const mineAccentColors = computed(() => {
  const mc = props.mineConfig as Record<string, unknown>
  return {
    primary: (mc.themeColor as string) || props.theme.primaryColor,
    secondary: (mc.themeColorSecondary as string) || props.theme.secondaryColor,
    flat: mc.style === 'flat',
    outline: mc.style === 'outline',
  }
})

const memberCardStyle = computed(() => {
  const { primary, secondary, flat, outline } = mineAccentColors.value
  if (outline) {
    return {
      background: '#ffffff',
      border: '1.5px solid #d7dde6',
      color: '#1f2937',
      '--mine-accent': primary,
    }
  }
  // 会员版 / 基础版用样式类渐变；flat 时用主题色铺底
  if (flat) {
    return {
      background: primary,
      '--mine-accent': primary,
    }
  }
  return {
    '--mine-accent': primary,
    '--mine-accent-2': secondary,
  }
})
</script>

<style scoped lang="scss">
.mine-page-preview {
  position: relative;
  animation: fadeIn 0.2s;
}

.mine-decor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 220px;
  z-index: 0;
  pointer-events: none;
  user-select: none;
}

.mine-decor--basic {
  background: linear-gradient(
    180deg,
    #6B8EF5 0%,
    #7B9CF7 42%,
    #A8C0FA 78%,
    rgba(168, 192, 250, 0.12) 100%
  );
}

.mine-decor--member {
  /* 铂金冷蓝：上实色 → 中浅 → 底极浅透出 */
  background: linear-gradient(
    180deg,
    #9BBFE8 0%,
    #B8D0F0 42%,
    #D8E6F6 78%,
    rgba(216, 230, 246, 0.12) 100%
  );
  overflow: hidden;
}

/* 会员版装饰：丝绸柔光褶皱 */
.mine-decor-ribbons {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  opacity: 1;
}

.mine-decor-ribbon--a {
  opacity: 0.7;
}

.mine-decor-ribbon--b {
  opacity: 0.55;
}

.mine-decor-ribbon--c {
  opacity: 0.65;
}

.mine-page-body {
  position: relative;
  z-index: 1;
  overflow: visible;
  /* 预览机 notch/状态栏避让：资料行整体下移 */
  padding-top: 20px;
}

/* 资料行落在装饰区顶部；会员卡再往下叠一点（原 28 + 避让 20） */
.mine-page-body--decor {
  padding-top: 48px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-edit {
  min-height: 100%;
  background: #f5f6f8;
  animation: fadeIn 0.2s;
}

.profile-edit-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 44px;
  padding: 0 8px;
  background: #fff;
  border-bottom: 1px solid #eef0f3;
}

.profile-edit-back {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  color: #1f2937;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
}

.profile-edit-title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.profile-edit-nav-spacer {
  width: 36px;
  flex-shrink: 0;
}

.profile-edit-body {
  padding: 28px 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
}

.profile-edit-avatar-btn {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto;
  padding: 0;
  border: 2px solid #d7dde6;
  border-radius: 50%;
  background: #e8eef7;
  cursor: pointer;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.profile-edit-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-edit-avatar-fallback {
  font-size: 34px;
  line-height: 1;
}

.profile-edit-avatar-cam {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(23, 105, 255, 0.92);
  color: #fff;
  font-size: 12px;
  display: grid;
  place-items: center;
  line-height: 1;
  border: 2px solid #fff;
}

.profile-edit-avatar-file {
  display: none;
}

.profile-edit-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-edit-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.profile-edit-input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d7dde6;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: #fff;
  outline: none;

  &:focus {
    border-color: #1769ff;
  }
}

.profile-edit-input--error {
  border-color: #ef4444;

  &:focus {
    border-color: #ef4444;
  }
}

.profile-edit-input--warn {
  border-color: #f59e0b;

  &:focus {
    border-color: #f59e0b;
  }
}

.profile-edit-tip {
  font-size: 12px;
  color: #ef4444;
  line-height: 1.3;
}

.profile-edit-soft {
  font-size: 12px;
  color: #d97706;
  line-height: 1.3;
}

.profile-edit-hint {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.3;
}

.profile-edit-save {
  margin-top: 8px;
  height: 42px;
  border: none;
  border-radius: 99px;
  background: #1769ff;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px 16px;
}

.profile-row--clickable {
  cursor: pointer;
  user-select: none;
}

.profile-row--on-decor {
  color: #fff;
}

/* 会员版：昵称 / 会员至 与铂金主色一致 */
.profile-row--on-decor.profile-row--member .user-title,
.profile-row--on-decor.profile-row--member .user-subtitle,
.profile-row--on-decor.profile-row--member .user-expire-chevron {
  color: #3A6BB5;
}

.profile-row--on-decor.profile-row--member .user-subtitle {
  opacity: 0.92;
}

.profile-row--on-decor.profile-row--member .user-expire-chevron {
  opacity: 0.72;
}

.profile-row--plain {
  color: #1f2937;
  padding-top: 16px;
}

.user-avatar {
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 26px;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.user-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.profile-row--plain .user-avatar {
  background: #e8eef7;
  border-color: #d7dde6;
  box-shadow: none;
}

.user-info {
  min-width: 0;
  flex: 1;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.user-title {
  font-size: 15px;
  font-weight: 700;
  display: block;
  line-height: 1.3;
}

.user-nickname {
  font-size: 12px;
  font-weight: 600;
  margin-top: 3px;
  display: block;
  opacity: 0.92;
}

.user-expire-row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 3px;
  min-width: 0;
}

.user-subtitle {
  font-size: 11px;
  opacity: 0.78;
  display: block;
  line-height: 1.3;
}

.user-expire-chevron {
  font-size: 12px;
  line-height: 1;
  opacity: 0.55;
  flex-shrink: 0;
}

.profile-row--plain .user-subtitle {
  opacity: 1;
  color: #64748b;
}

.profile-row--plain .user-expire-chevron {
  opacity: 0.45;
  color: #94a3b8;
}

.user-level {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.22);
  padding: 1px 7px;
  border-radius: 99px;
  font-weight: 600;
  line-height: 1.4;
}

/* 基础版：偏蓝紫哑光 */
.user-level--basic {
  background: rgba(200, 220, 255, 0.38);
  color: #eef4ff;
}

/* 会员版：铂金冷蓝 */
.user-level--member {
  background: rgba(255, 255, 255, 0.42);
  color: #3A6BB5;
}

.profile-row--plain .user-level {
  background: #f1f5f9;
  color: #475569;
}

.profile-row--plain .user-level--basic {
  background: #e8effe;
  color: #4a6de8;
}

.profile-row--plain .user-level--member {
  background: #e8f0fa;
  color: #3A6BB5;
}

.member-info-card {
  position: relative;
  margin: 14px 12px 0;
  padding: 16px;
  border-radius: 16px;
  border: none;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  /* soft light rim + raised feather shadow (no hard stroke) */
  box-shadow:
    0 0 6px 2px rgba(255, 255, 255, 0.28),
    0 10px 18px rgba(0, 0, 0, 0.10),
    0 3px 6px rgba(0, 0, 0, 0.06);
  min-height: 88px;
  overflow: visible;
}

.member-info-crown-wrap {
  position: absolute;
  right: 8px;
  top: -28px;
  width: 84px;
  height: 74px;
  pointer-events: none;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.member-info-crown-svg {
  width: 84px;
  height: 74px;
  display: block;
}

.member-info-card--basic {
  background: linear-gradient(to right, #6B6FE8 0%, #5B7FEA 52%, #7BA3F5 100%);
  border: none;
  box-shadow:
    0 0 6px 2px rgba(255, 255, 255, 0.28),
    0 10px 18px rgba(0, 0, 0, 0.10),
    0 3px 6px rgba(0, 0, 0, 0.06);
}

.member-info-card--member {
  /* 铂金卡：左浅紫蓝 → 右天空蓝 + 金属流光 */
  background:
    linear-gradient(
      115deg,
      rgba(255, 255, 255, 0.55) 0%,
      rgba(255, 255, 255, 0) 28%,
      rgba(255, 255, 255, 0.22) 48%,
      rgba(255, 255, 255, 0) 68%,
      rgba(255, 255, 255, 0.35) 100%
    ),
    linear-gradient(to right, #E8EEF8 0%, #C8DAF0 48%, #A8C8EC 100%);
  color: #3A4556;
  border: none;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.55) inset,
    0 0 6px 2px rgba(255, 255, 255, 0.35),
    0 10px 18px rgba(80, 120, 180, 0.14),
    0 3px 6px rgba(80, 120, 180, 0.08);
  overflow: hidden;
}

.member-info-card--member::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(
    125deg,
    transparent 0%,
    transparent 36%,
    rgba(255, 255, 255, 0.45) 46%,
    rgba(200, 220, 245, 0.2) 52%,
    transparent 62%,
    transparent 100%
  );
  opacity: 0.85;
}

.member-info-main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.member-info-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.member-info-level {
  display: inline-block;
  margin-top: 6px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.28);
}

.member-info-card--member .member-info-level {
  background: #6B9FD9;
  color: #fff;
}

.member-info-benefits {
  margin-top: 8px;
  font-size: 11px;
  opacity: 0.9;
  line-height: 1.4;
}

.member-info-card--member .member-info-benefits {
  opacity: 0.85;
  color: #5A6A80;
}

.member-info-card--member .member-info-title {
  color: #3A6BB5;
  background: linear-gradient(180deg, #5B8FD4 0%, #3A6BB5 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.member-cta {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  margin-top: 22px;
  padding: 7px 14px;
  background: #fff;
  color: var(--mine-accent, #5B7FEA);
  border: none;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.member-info-card--member .member-cta {
  background: #fff;
  color: #3A6BB5;
  border: none;
  box-shadow: 0 2px 8px rgba(90, 140, 200, 0.16);
}

.mine-card--outline {
  background: #ffffff !important;
  color: #1f2937 !important;
  border: 1px solid #f0f2f5 !important;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06) !important;
}

.mine-card--outline .member-info-level {
  background: #f1f5f9;
  color: #475569;
}

.mine-card--outline .member-info-benefits {
  opacity: 1;
  color: #64748b;
}

.mine-card--outline .member-cta {
  background: #fff;
  border: 1.5px solid var(--mine-accent, #334155);
  color: var(--mine-accent, #334155);
  box-shadow: none;
}

.order-card {
  margin: 12px;
  padding: 14px 12px 10px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
  border: 1px solid #f0f2f5;
}

.order-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.order-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.all-orders-link {
  font-size: 12px;
  color: #1769ff;
  white-space: nowrap;
}

.order-tabs {
  display: flex;
  gap: 4px;
}

.order-tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 2px 8px;
}

.order-tab-icon {
  line-height: 1;
}

.order-tab-label {
  font-size: 11px;
  color: #607187;
  text-align: center;
}

.menu-card {
  margin: 12px;
  padding: 0 12px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
  border: 1px solid #f0f2f5;
}

.preview-menu-list {
  display: flex;
  flex-direction: column;
}

.preview-menu-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 4px;
  border-bottom: 1px solid #f0f2f5;

  &:last-child {
    border-bottom: none;
  }
}

.preview-menu-row--clickable {
  cursor: pointer;
}

.menu-icon {
  flex-shrink: 0;
}

.menu-text {
  flex: 1;
  font-size: 14px;
  color: #1f2937;
  text-align: left;
}

.menu-chevron {
  flex-shrink: 0;
  font-size: 16px;
  color: #c0c4cc;
  line-height: 1;
}
</style>
