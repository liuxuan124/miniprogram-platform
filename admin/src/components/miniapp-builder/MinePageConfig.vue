<template>
  <div class="mine-page-config">
    <div class="config-label">我的页面配置</div>

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
            placeholder="跟随全局"
            @update:model-value="(v: string) => updateField('pageBackgroundColor', v)"
          />
          <span class="color-hint">{{ modelValue.pageBackgroundColor || '跟随全局页面底色' }}</span>
          <el-button
            v-if="modelValue.pageBackgroundColor"
            text
            size="small"
            @click="updateField('pageBackgroundColor', '')"
          >清除</el-button>
        </el-form-item>
        <el-form-item label="头部样式">
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
        <div v-for="key in MINE_MODULE_KEYS" :key="key" class="module-cell">
          <el-switch
            :model-value="modules[key]"
            size="small"
            @update:model-value="(v: any) => setModule(key, v !== false)"
          />
          <span class="module-cell__label">{{ MINE_MODULE_LABELS[key] }}</span>
        </div>
      </div>
      <p class="module-note">
        会员卡开关与上方「显示会员卡片」联动；用户头部关闭后未登录态将没有登录入口，
        建议保留。
      </p>
    </div>

    <div class="config-block">
      <div class="block-title">装饰背景区</div>
      <el-form label-width="100px" size="small" class="compact-form">
        <el-form-item label="显示装饰背景">
          <el-switch
            :model-value="modelValue.showDecorBackground !== false"
            @update:model-value="(v) => updateField('showDecorBackground', v !== false)"
          />
        </el-form-item>
        <el-form-item label="显示会员卡片">
          <el-switch
            :model-value="modules.memberCard && modelValue.showMemberCard !== false"
            @update:model-value="(v) => setModule('memberCard', v !== false)"
          />
        </el-form-item>
      </el-form>
    </div>

    <!-- 登录区域 -->
    <div class="config-block">
      <div class="block-title">登录提示区</div>
      <el-form label-width="80px" size="small">
        <el-form-item label="登录标题">
          <el-input :model-value="modelValue.loginTitle" @input="(v: string) => updateField('loginTitle', v)" placeholder="点击登录，解锁会员权益" />
        </el-form-item>
        <el-form-item label="登录副标">
          <el-input :model-value="modelValue.loginSubtitle" @input="(v: string) => updateField('loginSubtitle', v)" placeholder="登录后查看订单、优惠券、积分等个人信息" />
        </el-form-item>
        <el-form-item label="按钮文字">
          <el-input :model-value="modelValue.loginButtonText" @input="(v: string) => updateField('loginButtonText', v)" placeholder="微信一键登录" />
        </el-form-item>
        <el-form-item label="会员卡名">
          <el-input :model-value="modelValue.memberCardTitle" @input="(v: string) => updateField('memberCardTitle', v)" placeholder="我的会员中心" />
        </el-form-item>
      </el-form>
    </div>

    <!-- 用户信息区 -->
    <div class="config-block">
      <div class="block-title">用户信息区</div>
      <el-form label-width="100px" size="small" class="compact-form">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="显示头像">
              <el-switch :model-value="modelValue.userProfile.showAvatar" @change="(v: boolean) => updateNested('userProfile', 'showAvatar', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="显示昵称">
              <el-switch :model-value="modelValue.userProfile.showNickname" @change="(v: boolean) => updateNested('userProfile', 'showNickname', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="显示等级">
              <el-switch :model-value="modelValue.userProfile.showMemberLevel" @change="(v: boolean) => updateNested('userProfile', 'showMemberLevel', v)" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="允许编辑资料">
              <el-switch :model-value="modelValue.userProfile.allowEditProfile" @change="(v: boolean) => updateNested('userProfile', 'allowEditProfile', v)" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="等级标签文字">
              <el-input :model-value="modelValue.userProfile.memberLevelLabel" @input="(v: string) => updateNested('userProfile', 'memberLevelLabel', v)" placeholder="会员等级" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="预览昵称" :error="previewNicknameError || undefined">
          <el-input
            :model-value="modelValue.previewNickname ?? '微信用户'"
            @input="(v: string) => updateField('previewNickname', v)"
            placeholder="微信用户"
            maxlength="10"
            show-word-limit
          />
          <div v-if="previewNicknameError" class="field-error">{{ previewNicknameError }}</div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 订单快捷入口 -->
    <div class="config-block">
      <div class="block-title">
        订单快捷入口
        <el-switch :model-value="modelValue.orderQuickAccess.showOrderTabs" @change="(v: boolean) => updateNested('orderQuickAccess', 'showOrderTabs', v)" style="margin-left:auto" />
      </div>
      <template v-if="modelValue.orderQuickAccess.showOrderTabs">
        <el-form label-width="70px" size="small" class="compact-form">
          <el-row :gutter="10">
            <el-col :span="6">
              <el-form-item label="待付款">
                <el-input :model-value="modelValue.orderQuickAccess.tabLabels.pending" @input="(v: string) => updateTabLabel('pending', v)" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="待发货">
                <el-input :model-value="modelValue.orderQuickAccess.tabLabels.paid" @input="(v: string) => updateTabLabel('paid', v)" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="待收货">
                <el-input :model-value="modelValue.orderQuickAccess.tabLabels.shipped" @input="(v: string) => updateTabLabel('shipped', v)" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="已完成">
                <el-input :model-value="modelValue.orderQuickAccess.tabLabels.completed" @input="(v: string) => updateTabLabel('completed', v)" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="全部订单">
            <el-switch :model-value="modelValue.orderQuickAccess.showAllOrdersBtn" @change="(v: boolean) => updateNested('orderQuickAccess', 'showAllOrdersBtn', v)" />
          </el-form-item>
        </el-form>
      </template>
    </div>

    <!-- 菜单项 -->
    <div class="config-block">
      <div class="block-title">
        功能菜单
        <span class="block-tip">每项可独立设置跳转目标</span>
        <el-button text type="primary" size="small" @click="openLib">
          <el-icon><Plus /></el-icon> 添加菜单
        </el-button>
      </div>

      <el-form label-width="100px" size="small" class="compact-form" style="margin-bottom: 8px">
        <el-form-item label="菜单显示图标">
          <el-switch
            :model-value="modelValue.showMenuIcons === true"
            @change="(v: boolean) => updateField('showMenuIcons', v)"
          />
        </el-form-item>
      </el-form>

      <draggable v-model="menuItems" item-key="id" handle=".drag-handle" @update:modelValue="emitUpdate" class="menu-list">
        <template #item="{ element: item, index }">
          <div class="menu-item" :class="{ hidden: !item.enabled }">
            <div class="drag-handle">⠿</div>
            <span class="menu-icon" @click="editMenuIcon(index)">
              <MenuIconDisplay :icon="item.icon" :size="26" />
            </span>
            <div class="menu-fields">
              <el-input v-model="item.title" placeholder="菜单名称" size="small" @input="emitUpdate" />
              <MineTargetPicker
                v-model="item.url"
                :need-login="item.needLogin"
                :menu-title="item.title"
                @update:modelValue="emitUpdate"
                @update:needLogin="(v: boolean) => onNeedLogin(index, v)"
              />
              <div class="menu-sub">
                <el-select
                  v-model="item.group"
                  size="small"
                  filterable
                  allow-create
                  default-first-option
                  placeholder="分组名（同组显示在同一张卡）"
                  @change="emitUpdate"
                >
                  <el-option v-for="g in groupOptions" :key="g" :label="g" :value="g" />
                </el-select>
                <el-select
                  v-model="item.visibleOn"
                  size="small"
                  placeholder="显示条件"
                  @change="onVisibleOn(index, $event)"
                >
                  <el-option
                    v-for="opt in VISIBLE_ON_OPTIONS"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </div>
            </div>
            <div class="menu-actions">
              <el-switch v-model="item.enabled" size="small" @change="emitUpdate" />
              <el-button text size="small" type="danger" @click="removeMenuItem(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </template>
      </draggable>

      <el-dialog v-model="libDialogVisible" title="从菜单库添加" width="480px" destroy-on-close>
        <p class="lib-hint">菜单库收录小程序内真实存在的功能入口，勾选后一次性追加到列表末尾，之后仍可改名称与目标。</p>
        <el-checkbox-group v-model="pickedLib" class="lib-list">
          <label v-for="s in MINE_MENU_LIBRARY" :key="s.key" class="lib-row">
            <el-checkbox :label="s.key">{{ s.title }}</el-checkbox>
            <span class="lib-meta">{{ s.group }}</span>
            <span class="lib-url">{{ s.url }}</span>
          </label>
        </el-checkbox-group>
        <p v-if="libConflict" class="lib-conflict">已勾选的 {{ libConflict }} 项在列表里已存在，将被忽略。</p>
        <template #footer>
          <el-button @click="addBlankItem">新建空白项</el-button>
          <el-button type="primary" :disabled="!pickedLib.length" @click="confirmLibAdd">
            添加选中{{ pickedLib.length ? `（${pickedLib.length}）` : '' }}
          </el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="iconDialogVisible" title="选择图标" width="440px" destroy-on-close>
        <div class="icon-tabs">
          <button
            type="button"
            class="icon-tab"
            :class="{ active: iconTab === 'line' }"
            @click="iconTab = 'line'"
          >线条</button>
          <button
            type="button"
            class="icon-tab"
            :class="{ active: iconTab === 'color' }"
            @click="iconTab = 'color'"
          >彩色</button>
        </div>
        <div v-if="iconTab === 'line'" class="icon-grid">
          <button
            v-for="ic in MENU_LINE_ICONS"
            :key="ic.id"
            type="button"
            class="icon-opt icon-opt--line"
            :class="{ active: pickedIcon === ic.id }"
            :title="ic.name"
            @click="pickedIcon = ic.id"
          >
            <span class="icon-opt-svg" v-html="ic.svg" />
          </button>
        </div>
        <div v-else class="icon-grid">
          <button
            v-for="icon in MENU_COLOR_ICONS"
            :key="icon"
            type="button"
            class="icon-opt"
            :class="{ active: pickedIcon === icon }"
            @click="pickedIcon = icon"
          >{{ icon }}</button>
        </div>
        <template #footer>
          <el-button @click="iconDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmMenuIcon">确认</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import type { MineMenuItem, MinePageConfig, MineModuleKey, MineThemeSource } from '@/types/miniapp'
import {
  MINE_MODULE_KEYS,
  MINE_MODULE_LABELS,
  MINE_VISIBLE_ON_LABELS,
  resolveMineModules,
  normalizeMineVisibleOn,
  normalizeMineHeaderStyle,
  normalizeMineCardStyle,
  DEFAULT_THEME,
} from '@/types/miniapp'
import MineTargetPicker from './MineTargetPicker.vue'
import { MINE_MENU_LIBRARY, seedToMenuItem } from './mineTemplates'
import MenuIconDisplay from './MenuIconDisplay.vue'
import {
  DEFAULT_MENU_LINE_ICON,
  MENU_COLOR_ICONS,
  MENU_LINE_ICONS,
  isMenuLineIcon,
} from './menuLineIcons'

const NICKNAME_MAX_LEN = 10

const props = defineProps<{
  modelValue: MinePageConfig
  /** 全局品牌色：仅用于「继承全局」时展示当前实际生效值 */
  globalTheme?: { primaryColor?: string; secondaryColor?: string }
}>()
const emit = defineEmits<{ 'update:modelValue': [value: MinePageConfig] }>()

/** 条件显示下拉的可选项 */
const VISIBLE_ON_OPTIONS = (Object.keys(MINE_VISIBLE_ON_LABELS) as Array<keyof typeof MINE_VISIBLE_ON_LABELS>)
  .map((value) => ({ value, label: MINE_VISIBLE_ON_LABELS[value] }))

const globalTheme = computed(() => props.globalTheme || DEFAULT_THEME)

const menuItems = ref<MineMenuItem[]>([...props.modelValue.menuItems])
watch(() => props.modelValue.menuItems, (v) => { menuItems.value = [...v] }, { deep: true })

/** 模块显隐（缺字段按 true，= 线上现状） */
const modules = computed(() => resolveMineModules(props.modelValue.modules))

const themeSource = computed<MineThemeSource>(() =>
  String(props.modelValue.themeSource) === 'page' ? 'page' : 'inherit')

const headerStyle = computed(() => normalizeMineHeaderStyle(props.modelValue.headerStyle))
const cardStyle = computed(() => normalizeMineCardStyle(props.modelValue.cardStyle))

function setThemeSource(value: unknown) {
  updateField('themeSource', value === 'page' ? 'page' : 'inherit')
}

/** 恢复继承：清掉显式开关，主题色值保留但不再生效（小程序端同语义） */
function restoreThemeInherit() {
  updateField('themeSource', 'inherit')
}

function setModule(key: MineModuleKey, value: boolean) {
  const next = resolveMineModules(props.modelValue.modules)
  next[key] = value
  // 会员卡是双写字段：showMemberCard 是历史字段，端上老逻辑仍读它，
  // 这里一起改，避免出现「模块关了但 showMemberCard 还是 true」的错位。
  const patch: Record<string, unknown> = { modules: next }
  if (key === 'memberCard') patch.showMemberCard = value
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

const previewNicknameError = computed(() => {
  const nick = String(props.modelValue.previewNickname ?? '')
  if (nick.length > NICKNAME_MAX_LEN) return `昵称不能超过${NICKNAME_MAX_LEN}个字`
  return ''
})

function updateField(key: string, value: any) {
  // 就地写入 + 新对象发射，避免开关状态与预览不同步
  const current = props.modelValue as unknown as Record<string, unknown>
  current[key] = value
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function updateNested(parent: string, key: string, value: any) {
  const current = props.modelValue
  if (parent === 'orderQuickAccess') {
    emit('update:modelValue', { ...current, orderQuickAccess: { ...current.orderQuickAccess, [key]: value } })
  } else if (parent === 'userProfile') {
    emit('update:modelValue', { ...current, userProfile: { ...current.userProfile, [key]: value } })
  }
}

function updateTabLabel(key: string, value: string) {
  const current = props.modelValue
  emit('update:modelValue', {
    ...current,
    orderQuickAccess: {
      ...current.orderQuickAccess,
      tabLabels: { ...current.orderQuickAccess.tabLabels, [key]: value },
    },
  })
}

const groupOptions = computed(() => {
  const set = new Set<string>(['内容与订单', '会员与服务', '常用工具'])
  for (const it of menuItems.value) {
    const g = String(it.group || '').trim()
    if (g) set.add(g)
  }
  return Array.from(set)
})

function emitUpdate() {
  emit('update:modelValue', { ...props.modelValue, menuItems: [...menuItems.value] })
}

function onNeedLogin(index: number, value: boolean) {
  if (!menuItems.value[index]) return
  menuItems.value[index].needLogin = value === true
  emitUpdate()
}

/**
 * 条件显示（始终/登录后/会员可见）。
 * 归一化后写回，非法值一律落 always —— 避免端上拿到没定义过的字符串。
 * 注意：这**不是**权限开关，needLogin 仍然独立生效。
 */
function onVisibleOn(index: number, value: unknown) {
  if (!menuItems.value[index]) return
  menuItems.value[index].visibleOn = normalizeMineVisibleOn(value)
  emitUpdate()
}

function addMenuItem() {
  menuItems.value.push({
    id: `mine-${Date.now()}`,
    icon: DEFAULT_MENU_LINE_ICON,
    title: '新菜单',
    url: '',
    needLogin: false,
    enabled: true,
    group: '',
    visibleOn: 'always',
  })
  emitUpdate()
}

const libDialogVisible = ref(false)
const pickedLib = ref<string[]>([])

function openLib() {
  pickedLib.value = []
  libDialogVisible.value = true
}

const pendingLibKeys = computed(() => pickedLib.value.filter((key) => {
  const seed = MINE_MENU_LIBRARY.find((s) => s.key === key)
  if (!seed) return false
  return !menuItems.value.some((m) => m.url === seed.url || m.title === seed.title)
}))

const libConflict = computed(() => pickedLib.value.length - pendingLibKeys.value.length)

function confirmLibAdd() {
  pendingLibKeys.value.forEach((key, i) => {
    const seed = MINE_MENU_LIBRARY.find((s) => s.key === key)
    if (!seed) return
    menuItems.value.push(seedToMenuItem(seed, i))
  })
  emitUpdate()
  libDialogVisible.value = false
}

function addBlankItem() {
  addMenuItem()
  libDialogVisible.value = false
}

function removeMenuItem(index: number) {
  menuItems.value.splice(index, 1)
  emitUpdate()
}

const iconDialogVisible = ref(false)
const editingMenuIdx = ref(-1)
const pickedIcon = ref('')
const iconTab = ref<'line' | 'color'>('line')

function editMenuIcon(index: number) {
  editingMenuIdx.value = index
  const current = menuItems.value[index].icon
  pickedIcon.value = current
  iconTab.value = isMenuLineIcon(current) ? 'line' : 'color'
  iconDialogVisible.value = true
}

function confirmMenuIcon() {
  if (editingMenuIdx.value >= 0) {
    menuItems.value[editingMenuIdx.value].icon = pickedIcon.value
    emitUpdate()
  }
  iconDialogVisible.value = false
}
</script>

<style scoped>
.mine-page-config { margin-bottom: 20px; }
.config-label { font-size: 14px; font-weight: 700; color: #172033; margin-bottom: 14px; }
.config-block { background: #fafbfc; border: 1px solid #e3e8f0; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
.block-title { display: flex; align-items: center; font-size: 13px; font-weight: 700; color: #4a5568; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eef0f4; }
.compact-form .el-form-item { margin-bottom: 8px; }
.compact-form .el-form-item__label { font-size: 12px; }

.menu-list { display: flex; flex-direction: column; gap: 6px; }
.menu-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border: 1px solid #e3e8f0; border-radius: 8px; background: #fff; transition: 0.14s; }
.menu-item:hover { border-color: #a0b4d0; }
.menu-item.hidden { opacity: 0.5; }
.block-tip { margin-left: 8px; font-size: 12px; font-weight: 400; color: #9aa3b2; }
.lib-hint { margin: 0 0 10px; font-size: 12px; color: #7b8493; line-height: 1.5; }
.lib-list { display: flex; flex-direction: column; gap: 2px; max-height: 320px; overflow-y: auto; }
.lib-row { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 6px; cursor: pointer; }
.lib-row:hover { background: #f5f7fa; }
.lib-row :deep(.el-checkbox) { margin-right: 0; }
.lib-meta { font-size: 11px; color: #8b93a7; flex-shrink: 0; }
.lib-url { margin-left: auto; font-size: 11px; color: #b3bac6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lib-conflict { margin: 8px 0 0; font-size: 12px; color: #e6a23c; }
.drag-handle { cursor: grab; color: #a0b4d0; font-size: 14px; }
.drag-handle:active { cursor: grabbing; }
.menu-icon { width: 40px; height: 40px; display: grid; place-items: center; font-size: 22px; cursor: pointer; border-radius: 8px; background: #f0f4ff; }
.menu-icon:hover { background: #e0e7ff; }
.menu-fields { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.menu-actions { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.icon-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
.icon-tab {
  flex: 1;
  height: 32px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: 0.14s;
}
.icon-tab:hover { border-color: var(--color-primary); color: var(--color-primary); }
.icon-tab.active { border-color: var(--color-primary); background: #eff6ff; color: var(--color-primary); font-weight: 600; }
.icon-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.icon-opt { width: 44px; height: 44px; display: grid; place-items: center; font-size: 22px; border: 1px solid #e3e8f0; border-radius: 8px; background: #fff; cursor: pointer; transition: 0.14s; padding: 0; }
.icon-opt:hover { border-color: var(--color-primary); }
.icon-opt.active { border-color: var(--color-primary); background: #eff6ff; box-shadow: 0 0 0 2px rgba(23,105,255,0.2); }
.icon-opt--line { padding: 8px; }
.icon-opt-svg { width: 26px; height: 26px; display: grid; place-items: center; }
.icon-opt-svg :deep(svg) { width: 100%; height: 100%; display: block; }
.field-error { margin-top: 4px; color: #f56c6c; font-size: 12px; line-height: 1.4; }

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
.theme-source--inherit {
  background: #f0f9eb;
  border: 1px solid #c6e5b3;
  color: #3f6f21;
}
.theme-source--page {
  background: #fff7e8;
  border: 1px solid #f5dab0;
  color: #92400e;
}
.theme-source__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}
.theme-source__text b { font-weight: 700; }
.theme-source .el-button { margin-left: auto; }

.color-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  vertical-align: middle;
  margin-right: 6px;
}
.color-hint {
  font-size: 12px;
  color: #6b7280;
  margin-left: 8px;
}
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

/* 菜单行：分组名 + 显示条件并排 */
.menu-sub {
  display: grid;
  grid-template-columns: 1fr 116px;
  gap: 6px;
}
</style>
