<template>
  <div class="personal-center-customizer">
    <div class="customizer-left">
      <div class="customizer-header">
        <h3>🎨 个人中心装修</h3>
        <div class="header-actions">
          <el-button text size="small" @click="handleReset" type="danger">↺ 重置</el-button>
          <el-button text size="small" @click="handleExport">📤 导出JSON</el-button>
          <el-button type="primary" size="small" @click="$emit('save')">💾 保存</el-button>
        </div>
      </div>

      <div class="customizer-scroll">
        <SectionBlock title="🎨 主题配色" :defaultOpen="true">
          <div class="field-row">
            <label class="field-label">主色调</label>
            <div class="color-picker-row">
              <el-color-picker v-model="themeColors.primary" size="small" @change="applyThemeColors" />
              <span class="color-hex">{{ themeColors.primary }}</span>
            </div>
          </div>
          <div class="field-row">
            <label class="field-label">辅助色</label>
            <div class="color-picker-row">
              <el-color-picker v-model="themeColors.secondary" size="small" @change="applyThemeColors" />
              <span class="color-hex">{{ themeColors.secondary }}</span>
            </div>
          </div>
          <div class="field-row">
            <label class="field-label">背景色</label>
            <div class="color-picker-row">
              <el-color-picker v-model="themeColors.background" size="small" @change="applyThemeColors" />
              <span class="color-hex">{{ themeColors.background }}</span>
            </div>
          </div>
          <div class="field-row">
            <label class="field-label">文字色</label>
            <div class="color-picker-row">
              <el-color-picker v-model="themeColors.text" size="small" @change="applyThemeColors" />
              <span class="color-hex">{{ themeColors.text }}</span>
            </div>
          </div>
          <div class="field-row">
            <label class="field-label">强调色（按钮/高亮）</label>
            <div class="color-picker-row">
              <el-color-picker v-model="themeColors.accent" size="small" @change="applyThemeColors" />
              <span class="color-hex">{{ themeColors.accent }}</span>
            </div>
          </div>
          <div class="preset-colors">
            <span class="preset-label">预设方案：</span>
            <div
              v-for="preset in colorPresets"
              :key="preset.name"
              class="preset-chip"
              :style="{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }"
              :title="preset.name"
              @click="applyColorPreset(preset)"
            ></div>
          </div>
        </SectionBlock>

        <SectionBlock title="📐 布局布局">
          <div class="field-row">
            <label class="field-label">头部样式</label>
            <el-select v-model="layout.headerStyle" size="small" @change="applyLayout" style="flex:1">
              <el-option label="卡片式" value="card" />
              <el-option label="全宽横幅" value="banner" />
              <el-option label="居中圆形" value="circle" />
              <el-option label="紧凑左对齐" value="compact" />
            </el-select>
          </div>
          <div class="field-row">
            <label class="field-label">头像尺寸</label>
            <div class="slider-with-labels">
              <el-slider v-model="layout.avatarSize" :min="40" :max="120" :step="8" show-stops size="small" @change="applyLayout" style="flex:1;margin:0 10px;" />
              <span class="slider-value">{{ layout.avatarSize }}px</span>
            </div>
            <div class="size-presets">
              <el-tag size="small" :type="layout.avatarSize <= 48 ? 'primary' : 'info'" effect="plain" @click="layout.avatarSize = 48; applyLayout()">小</el-tag>
              <el-tag size="small" :type="layout.avatarSize > 48 && layout.avatarSize <= 72 ? 'primary' : 'info'" effect="plain" @click="layout.avatarSize = 64; applyLayout()">中</el-tag>
              <el-tag size="small" :type="layout.avatarSize > 72 && layout.avatarSize <= 96 ? 'primary' : 'info'" effect="plain" @click="layout.avatarSize = 88; applyLayout()">大</el-tag>
              <el-tag size="small" :type="layout.avatarSize > 96 ? 'primary' : 'info'" effect="plain" @click="layout.avatarSize = 112; applyLayout()">超大</el-tag>
            </div>
          </div>
          <div class="field-row">
            <label class="field-label">菜单列数</label>
            <el-select v-model="layout.menuColumns" size="small" @change="applyLayout" style="flex:1">
              <el-option label="2 列" :value="2" />
              <el-option label="3 列" :value="3" />
              <el-option label="4 列" :value="4" />
              <el-option label="横向滚动" :value="-1" />
            </el-select>
          </div>
          <div class="field-row">
            <label class="field-label">菜单项尺寸</label>
            <el-select v-model="layout.menuItemSize" size="small" @change="applyLayout" style="flex:1">
              <el-option label="紧凑" value="compact" />
              <el-option label="标准" value="standard" />
              <el-option label="宽松" value="relaxed" />
            </el-select>
          </div>
          <div class="field-row">
            <label class="field-label">区块间距</label>
            <div class="slider-with-labels">
              <el-slider v-model="layout.sectionSpacing" :min="0" :max="30" :step="2" size="small" @change="applyLayout" style="flex:1;margin:0 10px;" />
              <span class="slider-value">{{ layout.sectionSpacing }}px</span>
            </div>
          </div>
        </SectionBlock>

        <SectionBlock title="✏️ 内容编辑" :defaultOpen="true">
          <div v-if="Object.keys(groupedFields).length === 0" class="empty-fields-hint">
            <p>当前模板无可编辑字段，请先选择一个模板。</p>
          </div>
          <div v-for="(fields, groupKey) in groupedFields" :key="groupKey" class="content-group">
            <div class="group-sub-header" @click="toggleContentGroup(groupKey)">
              <span>{{ fieldGroupLabels[groupKey] || groupKey }}</span>
              <span class="sub-arrow" :class="{ collapsed: !expandedGroups.has(groupKey) }">▸</span>
            </div>
            <div v-show="expandedGroups.has(groupKey)" class="group-sub-fields">
              <div v-for="field in fields" :key="field.path" class="field-row">
                <label class="field-label">{{ field.label }}</label>
                <div class="field-control">
                  <template v-if="field.type === 'text'">
                    <el-input
                      :model-value="getFieldValue(field.path)"
                      :placeholder="field.placeholder || `请输入${field.label}`"
                      :maxlength="field.maxLength"
                      show-word-limit
                      size="small"
                      @update:model-value="(val: string) => setFieldValue(field.path, val)"
                    />
                  </template>
                  <template v-else-if="field.type === 'image'">
                    <div class="image-control">
                      <div v-if="getFieldValue(field.path)" class="image-preview-small">
                        <img :src="getFieldValue(field.path)" alt="" />
                        <el-icon class="remove-img-icon" @click="setFieldValue(field.path, '')"><Close /></el-icon>
                      </div>
                      <el-button v-else size="small" @click="triggerImageUpload(field)">📷 上传图片</el-button>
                    </div>
                  </template>
                  <template v-else-if="field.type === 'color'">
                    <el-color-picker
                      :model-value="getFieldValue(field.path) || '#1769ff'"
                      size="small"
                      @update:model-value="(val: string) => setFieldValue(field.path, val)"
                    />
                  </template>
                  <template v-else-if="field.type === 'switch'">
                    <el-switch
                      :model-value="!!getFieldValue(field.path)"
                      @update:model-value="(val: boolean) => setFieldValue(field.path, val)"
                    />
                  </template>
                  <template v-else-if="field.type === 'number'">
                    <el-input-number
                      :model-value="Number(getFieldValue(field.path) ?? 0)"
                      controls-position="right"
                      size="small"
                      @update:model-value="(val: number | undefined) => setFieldValue(field.path, val ?? 0)"
                    />
                  </template>
                  <template v-else-if="field.type === 'select'">
                    <el-select
                      :model-value="getFieldValue(field.path)"
                      placeholder="请选择"
                      size="small"
                      style="width:100%"
                      @change="(val: string) => setFieldValue(field.path, val)"
                    >
                      <el-option
                        v-for="opt in (field.options || [])"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                      />
                    </el-select>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </SectionBlock>

        <SectionBlock title="👁 元素显隐">
          <div v-for="vis in visibilityItems" :key="vis.key" class="visibility-row">
            <div class="visibility-info">
              <span class="vis-icon">{{ vis.icon }}</span>
              <span class="vis-label">{{ vis.label }}</span>
            </div>
            <el-switch
              :model-value="visibility[vis.key]"
              active-color="#8B5CF6"
              inactive-color="#dcdfe6"
              @change="(val: boolean) => toggleVisibility(vis.key, val)"
            />
            <transition name="fade-hint">
              <span v-if="!visibility[vis.key]" class="visibility-hint">已隐藏</span>
            </transition>
          </div>
        </SectionBlock>

        <SectionBlock title="🖼️ 背景设置">
          <div class="field-row">
            <label class="field-label">背景类型</label>
            <el-select v-model="bgSettings.type" size="small" @change="applyBackground" style="flex:1">
              <el-option label="纯色" value="solid" />
              <el-option label="渐变" value="gradient" />
              <el-option label="图片" value="image" />
            </el-select>
          </div>
          <template v-if="bgSettings.type === 'image'">
            <div class="field-row">
              <label class="field-label">背景图</label>
              <div class="image-control">
                <div v-if="bgSettings.imageUrl" class="bg-image-preview">
                  <img :src="bgSettings.imageUrl" alt="" />
                  <el-icon class="remove-img-icon" @click="bgSettings.imageUrl=''; applyBackground()"><Close /></el-icon>
                </div>
                <el-button v-else size="small" @click="triggerBgImageUpload">📷 选择背景图</el-button>
              </div>
            </div>
          </template>
          <template v-if="bgSettings.type === 'gradient'">
            <div class="field-row">
              <label class="field-label">起始色</label>
              <div class="color-picker-row">
                <el-color-picker v-model="bgSettings.gradientStart" size="small" @change="applyBackground" />
                <span class="color-hex">{{ bgSettings.gradientStart }}</span>
              </div>
            </div>
            <div class="field-row">
              <label class="field-label">结束色</label>
              <div class="color-picker-row">
                <el-color-picker v-model="bgSettings.gradientEnd" size="small" @change="applyBackground" />
                <span class="color-hex">{{ bgSettings.gradientEnd }}</span>
              </div>
            </div>
            <div class="field-row">
              <label class="field-label">渐变角度</label>
              <div class="slider-with-labels">
                <el-slider v-model="bgSettings.gradientAngle" :min="0" :max="360" :step="15" size="small" @change="applyBackground" style="flex:1;margin:0 10px;" />
                <span class="slider-value">{{ bgSettings.gradientAngle }}°</span>
              </div>
            </div>
          </template>
          <template v-if="bgSettings.type === 'solid'">
            <div class="field-row">
              <label class="field-label">背景颜色</label>
              <div class="color-picker-row">
                <el-color-picker v-model="bgSettings.solidColor" size="small" @change="applyBackground" />
                <span class="color-hex">{{ bgSettings.solidColor }}</span>
              </div>
            </div>
          </template>
          <div class="field-row">
            <label class="field-label">模糊度</label>
            <div class="slider-with-labels">
              <el-slider v-model="bgSettings.blur" :min="0" :max="20" :step="1" size="small" @change="applyBackground" style="flex:1;margin:0 10px;" />
              <span class="slider-value">{{ bgSettings.blur }}px</span>
            </div>
          </div>
          <div class="field-row">
            <label class="field-label">透明度</label>
            <div class="slider-with-labels">
              <el-slider v-model="bgSettings.opacity" :min="30" :max="100" :step="5" size="small" @change="applyBackground" style="flex:1;margin:0 10px;" />
              <span class="slider-value">{{ bgSettings.opacity }}%</span>
            </div>
          </div>
        </SectionBlock>
      </div>
    </div>

    <div class="customizer-right">
      <div class="preview-header-bar">
        <span class="preview-title">📱 实时预览 — 我的页面</span>
        <div class="preview-actions">
          <el-tooltip content="刷新预览" placement="top">
            <el-button text size="small" @click="forceUpdatePreview">⟳</el-button>
          </el-tooltip>
        </div>
      </div>
      <div class="phone-mockup-wrapper">
        <div class="phone-frame">
          <div class="phone-notch"></div>
          <div class="phone-screen" :style="previewBgStyle">
            <div class="screen-content" ref="screenRef">
              <template v-if="workingDsl.components.length > 0">
                <div
                  v-for="(comp, index) in visibleComponents"
                  :key="comp.id"
                  class="component-render"
                  :style="getComponentStyle(comp, index)"
                  :class="{ 'component-hidden': isComponentHidden(index) }"
                >
                  <ComponentRenderer :component="comp" :index="index" :theme="themeColors" :layout="layout" />
                </div>
              </template>
              <div v-else class="empty-dsl-hint">
                <p>暂无组件数据</p>
                <p class="hint-sub">请从左侧面板选择模板开始编辑</p>
              </div>
            </div>
          </div>
          <div class="phone-home-indicator"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { EditableField } from '@/types/pageTemplate'

const props = defineProps<{
  templateDsl: any
  templateFields?: EditableField[]
}>()

const emit = defineEmits<{
  'update:dsl': [value: any]
  save: []
  export: [data: any]
}>()

const screenRef = ref<HTMLElement | null>(null)

const workingDsl = reactive<any>(props.templateDsl ? JSON.parse(JSON.stringify(props.templateDsl)) : {
  schema_version: '1.0',
  page: { id: '', name: '未命名', type: 'mine', path: '/pages/mine/index', background_color: '#f6f8fb' },
  components: [],
  global_config: { pull_refresh: false, reach_bottom_load: false },
})

watch(() => props.templateDsl, (val) => {
  if (val) {
    Object.assign(workingDsl, JSON.parse(JSON.stringify(val)))
    initFromTemplate()
  }
}, { deep: true })

const themeColors = reactive({
  primary: '#FF6B35',
  secondary: '#FF9F1C',
  background: '#FFF5EE',
  text: '#333333',
  accent: '#FF6B35',
})

const layout = reactive({
  headerStyle: 'card' as string,
  avatarSize: 64,
  menuColumns: 4,
  menuItemSize: 'standard' as string,
  sectionSpacing: 14,
})

const visibility = reactive<Record<string, boolean>>({
  userHeader: true,
  memberCard: true,
  orderTabs: true,
  menuGrid: true,
  contactInfo: true,
  noticeBar: true,
})

const bgSettings = reactive({
  type: 'solid' as 'solid' | 'gradient' | 'image',
  solidColor: '#FFF5EE',
  gradientStart: '#FFE4D6',
  gradientEnd: '#FFF5EE',
  gradientAngle: 180,
  imageUrl: '',
  blur: 0,
  opacity: 100,
})

const expandedGroups = ref<Set<string>>(new Set())

const colorPresets = [
  { name: '温暖橙', primary: '#FF6B35', secondary: '#FF9F1C', background: '#FFF5EE', text: '#333333', accent: '#FF6B35' },
  { name: '极简灰', primary: '#1A1A2E', secondary: '#6B7280', background: '#F7F8FA', text: '#1A1A2E', accent: '#374151' },
  { name: '奢华金', primary: '#D4AF37', secondary: '#1A1A2E', background: '#1A1A2E', text: '#E5E5E5', accent: '#D4AF37' },
  { name: '自然绿', primary: '#10B981', secondary: '#34D399', background: '#F0FDF4', text: '#1F2937', accent: '#10B981' },
  { name: '科技蓝', primary: '#0EA5E9', secondary: '#3B82F6', background: '#F0F9FF', text: '#1E293B', accent: '#0EA5E9' },
  { name: '艺术紫', primary: '#8B5CF6', secondary: '#EC4899', background: '#FAF5FF', text: '#3B0764', accent: '#8B5CF6' },
]

const visibilityItems = [
  { key: 'userHeader', icon: '👤', label: '用户头像区' },
  { key: 'memberCard', icon: '💳', label: '会员卡区域' },
  { key: 'orderTabs', icon: '📋', label: '订单快捷入口' },
  { key: 'menuGrid', icon: '⊞', label: '菜单网格' },
  { key: 'contactInfo', icon: '📞', label: '联系客服' },
  { key: 'noticeBar', icon: '📢', label: '公告栏' },
]

const fieldGroupLabels: Record<string, string> = {
  '登录区': '登录区域',
  '会员卡': '会员卡设置',
  '公告栏': '公告栏设置',
  '订单入口': '订单入口配置',
  '菜单网格': '菜单网格配置',
  '联系客服': '联系方式',
  '个人信息': '个人信息',
  '图标菜单': '图标菜单',
  '其他': '其他设置',
  '头部区域': '头部区域',
  'VIP信息': 'VIP信息设置',
  '权益列表': '权益列表',
  '管家服务': '管家服务',
  '封面区域': '封面区域',
  '用户信息': '用户信息',
  '数据统计': '数据统计',
  '活动动态': '活动动态',
  '好友展示': '好友展示',
  '数据卡片': '数据卡片',
  '订单列表': '订单列表',
  '快捷操作': '快捷操作',
  '资料卡片': '资料卡片',
  '右侧小部件': '右侧小部件',
  '布局': '布局参数',
  '功能按钮': '功能按钮',
  '标签区': '标签区',
}

const fields = computed(() => props.templateFields || [])

const groupedFields = computed(() => {
  const map: Record<string, EditableField[]> = {}
  for (const f of fields.value) {
    const g = f.group || '其他'
    if (!map[g]) map[g] = []
    map[g].push(f)
  }
  return map
})

function initFromTemplate() {
  if (!props.templateDsl) return
  const bgColor = props.templateDsl.page?.background_color || '#f6f8fb'
  bgSettings.solidColor = bgColor
  themeColors.background = bgColor
  expandedGroups.value = new Set(Object.keys(groupedFields.value))
}

initFromTemplate()

function getFieldValue(path: string): any {
  return path.split('.').reduce((obj: any, key: string) => obj?.[key], workingDsl)
}

function setFieldValue(path: string, value: any) {
  const keys = path.split('.')
  let target: any = workingDsl
  for (let i = 0; i < keys.length - 1; i++) {
    if (target[keys[i]] == null) target[keys[i]] = {}
    target = target[keys[i]]
  }
  target[keys[keys.length - 1]] = value
  emit('update:dsl', JSON.parse(JSON.stringify(workingDsl)))
}

function toggleContentGroup(key: string) {
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key)
  } else {
    expandedGroups.value.add(key)
  }
  expandedGroups.value = new Set(expandedGroups.value)
}

function applyThemeColors() {
  workingDsl.page.background_color = themeColors.background
  emit('update:dsl', JSON.parse(JSON.stringify(workingDsl)))
}

function applyLayout() {
  for (let i = 0; i < workingDsl.components.length; i++) {
    const comp = workingDsl.components[i]
    if (!comp.style) comp.style = {}
    comp.style.margin_bottom = layout.sectionSpacing
    if (comp.type === 'nav') {
      if (comp.props.columns !== undefined) {
        if (layout.menuColumns === -1) {
          comp.props.scrollable = true
        } else {
          comp.props.columns = layout.menuColumns
        }
      }
      const sizeMap: Record<string, number> = { compact: 44, standard: 52, relaxed: 64 }
      if (comp.props.item_size !== undefined) {
        comp.props.item_size = sizeMap[layout.menuItemSize] || 52
      }
    }
    if ((comp.type === 'image_text' || comp.type === 'member_card') && comp.props.avatar_size !== undefined) {
      comp.props.avatar_size = layout.avatarSize
    }
  }
  emit('update:dsl', JSON.parse(JSON.stringify(workingDsl)))
}

function applyBackground() {
  let bgColor = bgSettings.solidColor
  if (bgSettings.type === 'gradient') {
    bgColor = `linear-gradient(${bgSettings.gradientAngle}deg, ${bgSettings.gradientStart}, ${bgSettings.gradientEnd})`
  }
  workingDsl.page.background_color = bgColor
  if (bgSettings.type === 'image' && bgSettings.imageUrl) {
    workingDsl.page._bg_image = bgSettings.imageUrl
  } else {
    delete workingDsl.page._bg_image
  }
  workingDsl.page._bg_blur = bgSettings.blur
  workingDsl.page._bg_opacity = bgSettings.opacity / 100
  emit('update:dsl', JSON.parse(JSON.stringify(workingDsl)))
}

function applyColorPreset(preset: typeof colorPresets[0]) {
  Object.assign(themeColors, preset)
  bgSettings.solidColor = preset.background
  applyThemeColors()
  applyBackground()
  ElMessage.success(`已应用「${preset.name}」配色方案`)
}

function toggleVisibility(key: string, val: boolean) {
  visibility[key] = val
}

const componentVisibilityMap: Record<string, number[]> = {
  userHeader: [0],
  memberCard: [1],
  orderTabs: [3],
  menuGrid: [4],
  noticeBar: [2],
  contactInfo: [5],
}

function isComponentHidden(index: number): boolean {
  for (const [, indices] of Object.entries(componentVisibilityMap)) {
    if (indices.includes(index)) {
      const key = Object.keys(componentVisibilityMap).find(k => componentVisibilityMap[k].includes(index))
      if (key && !visibility[key]) return true
    }
  }
  return false
}

const visibleComponents = computed(() => workingDsl.components)

function getComponentStyle(comp: any, index: number): any {
  const baseStyle: any = {
    transition: 'all 0.3s ease',
  }
  if (isComponentHidden(index)) {
    return { ...baseStyle, opacity: 0.15, height: '0px', overflow: 'hidden', margin: '0', padding: '0', pointerEvents: 'none' }
  }
  return { ...baseStyle, ...(comp.style || {}) }
}

const previewBgStyle = computed(() => {
  const bg = workingDsl.page?.background_color || '#f6f8fb'
  const img = workingDsl.page?._bg_image
  const blur = workingDsl.page?._bg_blur || 0
  const opacity = workingDsl.page?._bg_opacity ?? 1
  const style: any = { backgroundColor: typeof bg === 'string' && bg.startsWith('linear') ? 'transparent' : bg }
  if (typeof bg === 'string' && bg.startsWith('linear')) {
    style.background = bg
  }
  if (img) {
    style.backgroundImage = `url(${img})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  }
  if (blur > 0) {
    style.filter = `blur(${blur}px)`
  }
  style.opacity = opacity
  return style
})

function handleReset() {
  if (props.templateDsl) {
    Object.assign(workingDsl, JSON.parse(JSON.stringify(props.templateDsl)))
  }
  Object.assign(themeColors, { primary: '#FF6B35', secondary: '#FF9F1C', background: '#FFF5EE', text: '#333333', accent: '#FF6B35' })
  Object.assign(layout, { headerStyle: 'card', avatarSize: 64, menuColumns: 4, menuItemSize: 'standard', sectionSpacing: 14 })
  Object.assign(visibility, { userHeader: true, memberCard: true, orderTabs: true, menuGrid: true, contactInfo: true, noticeBar: true })
  Object.assign(bgSettings, { type: 'solid', solidColor: '#FFF5EE', gradientStart: '#FFE4D6', gradientEnd: '#FFF5EE', gradientAngle: 180, imageUrl: '', blur: 0, opacity: 100 })
  ElMessage.success('已重置为默认值')
  emit('update:dsl', JSON.parse(JSON.stringify(workingDsl)))
}

function handleExport() {
  emit('export', JSON.parse(JSON.stringify(workingDsl)))
}

function triggerImageUpload(field: EditableField) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setFieldValue(field.path, reader.result as string)
    reader.readAsDataURL(file)
  }
  input.click()
}

function triggerBgImageUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      bgSettings.imageUrl = reader.result as string
      applyBackground()
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

function forceUpdatePreview() {
  emit('update:dsl', JSON.parse(JSON.stringify(workingDsl)))
}
</script>

<script lang="ts">
function renderImageText(c: any): string {
  const items = c.props?.items || []
  const bg = c.props?.background_gradient
    ? `background: linear-gradient(135deg, ${c.props.background_gradient[0]}, ${c.props.background_gradient[1]});`
    : c.props?.background_color
    ? `background-color: ${c.props.background_color};`
    : ''
  const padding = Array.isArray(c.props?.padding) ? `padding:${c.props.padding[0]}px ${c.props.padding[1]}px ${c.props.padding[2]}px ${c.props.padding[3]}px;` : ''
  const radius = c.props?.border_radius != null ? `border-radius:${c.props.border_radius}px;` : ''
  const titleColor = c.props?.title_color || '#333'
  const descColor = c.props?.desc_color || '#999'

  let html = `<div style="${bg}${padding}${radius}overflow:hidden;">`
  for (const item of items) {
    const avatarHtml = item.image ? `<div style="width:${c.props?.avatar_size || 56}px;height:${c.props?.avatar_size || 56}px;border-radius:50%;background:#ddd;margin-right:12px;flex-shrink:0;overflow:hidden;"><img src="${item.image}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''
    html += `<div style="display:flex;align-items:center;">
      ${avatarHtml}
      <div style="flex:1;min-width:0;">
        <div style="font-size:16px;font-weight:600;color:${titleColor};margin-bottom:2px;">${item.title || ''}</div>
        <div style="font-size:12px;color:${descColor};">${item.desc || ''}</div>
      </div>
      ${c.props?.show_arrow ? '<span style="color:#ccc;font-size:14px;">›</span>' : ''}
    </div>`
  }
  html += '</div>'
  return html
}

function renderMemberCard(c: any): string {
  const gradient = c.props?.background_gradient
    ? `background: linear-gradient(135deg, ${c.props.background_gradient[0]}, ${c.props.background_gradient[1]});`
    : 'background: linear-gradient(135deg,#667eea,#764ba2);'
  const accent = c.props?.accent_color || '#ffd700'
  const textColor = c.props?.text_color || '#fff'
  const benefits = c.props?.benefits || []
  const level = c.props?.level || 'GOLD'
  const points = c.props?.points || '0'

  let benefitHtml = '<div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">'
  for (const b of benefits) {
    benefitHtml += `<span style="font-size:11px;color:${accent};background:rgba(255,255,255,0.15);padding:3px 10px;border-radius:20px;">${b}</span>`
  }
  benefitHtml += '</div>'

  const progressHtml = c.props?.show_progress
    ? `<div style="margin-top:10px;background:rgba(255,255,255,0.2);border-radius:4px;height:6px;overflow:hidden;"><div style="width:${c.props.progress || 70}%;height:100%;background:${accent};border-radius:4px;"></div></div>`
    : ''

  return `<div style="${gradient}border-radius:12px;padding:18px;color:${textColor};">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:17px;font-weight:bold;">${c.props?.title || '会员卡'}</div>
        <div style="font-size:12px;opacity:0.75;margin-top:2px;">${level} · 积分 ${points}</div>
      </div>
      <div style="width:44px;height:44px;border-radius:50%;border:2px solid ${accent};overflow:hidden;background:#fff;"><img src="${c.props?.avatar_placeholder || ''}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>
    </div>
    ${benefitHtml}
    ${progressHtml}
  </div>`
}

function renderNav(c: any): string {
  const items = c.props?.items || []
  const cols = c.props?.columns || 4
  const itemSize = c.props?.item_size || 52
  const txtColor = c.props?.text_color || '#333'
  const iconBg = c.props?.icon_bg_color || '#f0f0f0'
  const hideLabel = c.props?.hide_label

  const gap = Math.max(4, Math.floor((340 - cols * itemSize) / (cols + 1)))

  let html = `<div style="display:flex;flex-wrap:wrap;gap:${gap}px;padding:8px 4px;justify-content:${cols === -1 ? 'flex-start' : 'center'};">`
  for (const item of items) {
    const wideBtn = c.props?.wide_button_mode
    if (wideBtn) {
      const grad = item.button_gradient ? `background: linear-gradient(135deg, ${item.button_gradient[0]}, ${item.button_gradient[1]});` : `background:#f5f5f5;`
      html += `<div style="width:100%;${grad}border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:22px;">${item.icon}</span>
        <div><div style="font-weight:600;font-size:14px;color:#333;">${item.title}</div><div style="font-size:11px;color:#888;">${item.desc || ''}</div></div></div>`
      continue
    }

    const w = cols === -1 ? itemSize + 24 : `calc(${100 / cols}% - ${(cols - 1) * gap / cols}px)`
    html += `<div style="width:${w};display:flex;flex-direction:column;align-items:center;gap:5px;padding:4px 0;">
      <div style="width:${Math.min(itemSize, 48)}px;height:${Math.min(itemSize, 48)}px;border-radius:12px;background:${iconBg};display:flex;align-items:center;justify-content:center;font-size:${Math.min(itemSize * 0.42, 22)}px;">${item.icon}</div>`
    if (!hideLabel) {
      if (item.desc && c.props?.show_desc_as_number) {
        html += `<div style="font-size:11px;color:${txtColor};font-weight:600;">${item.desc}</div>`
      }
      html += `<div style="font-size:11px;color:${txtColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center;">${item.title}</div>`
    }
    html += '</div>'
  }
  html += '</div>'
  return html
}

function renderProductList(c: any): string {
  const title = c.props?.title || ''
  const customItems = c.props?.custom_items || []
  const orderItems = c.props?.order_items || []

  let html = ''
  if (title) {
    html += `<div style="font-size:15px;font-weight:700;color:#333;padding:12px 4px 4px;">${title}</div>`
  }

  if (orderItems.length > 0) {
    for (const oi of orderItems) {
      const sc = oi.status_color || '#0ea5e9'
      html += `<div style="background:#fff;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;gap:10px;align-items:center;">
        <div style="width:52px;height:52px;border-radius:8px;background:#f0f0f0;flex-shrink:0;overflow:hidden;"><img src="${oi.image}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#333;font-weight:500;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${oi.title}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;color:${sc};background:${sc}15;padding:1px 6px;border-radius:4px;">${oi.status}</span>
            <span style="font-size:11px;color:#999;">${oi.time || ''}</span>
          </div>
        </div>
        <div style="font-size:14px;font-weight:700;color:${sc};flex-shrink:0;">${oi.price || ''}</div>
      </div>`
    }
  }

  if (customItems.length > 0) {
    for (const ci of customItems) {
      html += `<div style="background:#fff;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;gap:10px;align-items:center;">
        ${ci.image ? `<div style="width:60px;height:40px;border-radius:6px;background:#f0f0f0;flex-shrink:0;overflow:hidden;"><img src="${ci.image}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#333;font-weight:500;">${ci.title}</div>
          <div style="font-size:11px;color:#999;margin-top:2px;">${ci.desc || ''}</div>
        </div>
        ${ci.icon ? `<span style="font-size:18px;flex-shrink:0;">${ci.icon}</span>` : ''}
      </div>`
    }
  }

  return html || '<div style="padding:20px;text-align:center;color:#ccc;font-size:13px;">商品列表占位</div>'
}

function renderRichText(c: any): string {
  return `<div style="line-height:1.6;">${c.props?.content || ''}</div>`
}

function renderNoticeBar(c: any): string {
  const bg = c.props?.background_color || '#fffbeb'
  const tc = c.props?.text_color || '#b45309'
  return `<div style="background:${bg};border-radius:6px;padding:8px 12px;display:flex;align-items:center;gap:6px;font-size:12px;color:${tc};overflow:hidden;">
    <span style="flex-shrink:0;">${c.props?.icon || '📢'}</span>
    <div style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${c.props?.text || ''}</div>
  </div>`
}

function renderImage(c: any): string {
  return `<div style="width:100%;overflow:hidden;border-radius:${c.props?.radius || 0}px;">
    <img src="${c.props?.src || ''}" style="width:100%;display:block;object-fit:cover;" alt="" />
  </div>`
}

function renderBanner(c: any): string {
  const items = c.props?.items || []
  const h = c.props?.height || 200
  if (items.length === 0) return `<div style="height:${h}px;background:#eee;border-radius:${c.props?.border_radius || 0}px;display:flex;align-items:center;justify-content:center;color:#999;">轮播图</div>`
  return `<div style="position:relative;width:100%;height:${h}px;border-radius:${c.props?.border_radius || 0}px;overflow:hidden;">
    <img src="${items[0].image}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="" />
    <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 16px;background:linear-gradient(transparent,rgba(0,0,0,0.5));color:#fff;font-size:13px;">${items[0].title || ''}</div>
  </div>`
}

function renderDivider(c: any): string {
  return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;">
    <div style="flex:1;height:1px;background:${c.props?.color || '#eee'};${c.props?.style === 'dashed' ? 'border-top:1px dashed;' : ''}"></div>
    ${c.props?.text ? `<span style="font-size:12px;color:#bbb;white-space:nowrap;">${c.props.text}</span>` : ''}
    <div style="flex:1;height:1px;background:${c.props?.color || '#eee'};${c.props?.style === 'dashed' ? 'border-top:1px dashed;' : ''}"></div>
  </div>`
}

function renderSpacer(c: any): string {
  return `<div style="height:${c.props?.height || 20}px;"></div>`
}

function renderFallback(c: any): string {
  return `<div style="padding:16px;text-align:center;background:#fafafa;border-radius:8px;border:1px dashed #ddd;color:#999;font-size:12px;">[${c.type}] 组件占位</div>`
}

export default {
  components: {
    SectionBlock: {
      props: { title: { type: String, required: true }, defaultOpen: { type: Boolean, default: false } },
      emits: ['toggle'],
      data() { return { open: this.defaultOpen } },
      template: `
        <div class="section-block" :class="{ open }">
          <div class="section-header" @click="open = !open">
            <span class="section-title">{{ title }}</span>
            <span class="section-arrow" :class="{ collapsed: open }">▾</span>
          </div>
          <transition name="section-slide">
            <div v-show="open" class="section-body"><slot /></div>
          </transition>
        </div>
      `,
    },
    ComponentRenderer: {
      props: { component: { type: Object, required: true }, index: { type: Number, required: true }, theme: { type: Object, default: () => ({}) }, layout: { type: Object, default: () => ({}) } },
      setup(props: any) {
        const renderMap: Record<string, () => any> = {
          image_text: () => renderImageText(props.component),
          member_card: () => renderMemberCard(props.component),
          nav: () => renderNav(props.component),
          product_list: () => renderProductList(props.component),
          rich_text: () => renderRichText(props.component),
          notice_bar: () => renderNoticeBar(props.component),
          image: () => renderImage(props.component),
          banner: () => renderBanner(props.component),
          divider: () => renderDivider(props.component),
          spacer: () => renderSpacer(props.component),
        }
        return { renderFn: renderMap[props.component.type] || (() => renderFallback(props.component)) }
      },
      template: `<div class="comp-inner" v-html="renderFn()"></div>`,
    },
  }
}
</script>

<style scoped>
.personal-center-customizer {
  display: flex;
  gap: 20px;
  height: 100%;
  min-height: 680px;
}

.customizer-left {
  flex: 1;
  min-width: 380px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.customizer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #f0f2f5;
  flex-shrink: 0;
  background: #fafbff;
}

.customizer-header h3 {
  margin: 0;
  font-size: 15px;
  color: #1a1a2e;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.customizer-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 12px;
}

.customizer-scroll::-webkit-scrollbar {
  width: 4px;
}

.customizer-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.customizer-right {
  flex: 1.3;
  min-width: 400px;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.preview-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid #f0f2f5;
  flex-shrink: 0;
  background: #fafbff;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.preview-actions {
  display: flex;
  gap: 4px;
}

.phone-mockup-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  background: #f0f2f5;
  overflow: auto;
}

.phone-frame {
  width: 375px;
  min-height: 720px;
  max-height: 800px;
  background: #1a1a1a;
  border-radius: 36px;
  padding: 10px;
  box-shadow:
    0 0 0 2px #333,
    0 20px 60px rgba(0,0,0,0.25),
    inset 0 0 4px rgba(0,0,0,0.4);
  position: relative;
  display: flex;
  flex-direction: column;
}

.phone-notch {
  width: 130px;
  height: 26px;
  background: #1a1a1a;
  border-radius: 0 0 16px 16px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.phone-screen {
  flex: 1;
  border-radius: 28px;
  overflow: hidden;
  position: relative;
}

.screen-content {
  min-height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
}

.screen-content::-webkit-scrollbar {
  display: none;
}

.phone-home-indicator {
  width: 120px;
  height: 4px;
  background: #555;
  border-radius: 2px;
  margin: 6px auto 4px;
  flex-shrink: 0;
}

.component-render {
  animation: fadeInUp 0.3s ease both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.component-hidden {
  pointer-events: none;
}

.comp-inner {
  line-height: 1.4;
}

.empty-dsl-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #c0c4cc;
}

.empty-dsl-hint p {
  margin: 4px 0;
  font-size: 14px;
}

.hint-sub {
  font-size: 12px !important;
  color: #dcdfe6 !important;
}

.empty-fields-hint {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.field-label {
  font-size: 12px;
  color: #60687a;
  white-space: nowrap;
  min-width: 80px;
  flex-shrink: 0;
  font-weight: 500;
}

.field-control {
  flex: 1;
  min-width: 0;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.color-hex {
  font-size: 11px;
  color: #8b95a5;
  font-family: 'SF Mono', Consolas, monospace;
  letter-spacing: -0.3px;
}

.preset-colors {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 11px;
  color: #8b95a5;
  flex-shrink: 0;
}

.preset-chip {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.preset-chip:hover {
  transform: scale(1.15);
  border-color: rgba(139,92,246,0.5);
  box-shadow: 0 2px 8px rgba(139,92,246,0.25);
}

.slider-with-labels {
  display: flex;
  align-items: center;
  flex: 1;
}

.slider-value {
  font-size: 11px;
  color: #8b95a5;
  min-width: 38px;
  text-align: right;
  font-family: 'SF Mono', Consolas, monospace;
}

.size-presets {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  padding-left: 90px;
}

.size-presets .el-tag {
  cursor: pointer;
  transition: all 0.15s;
}

.image-control {
  display: flex;
  align-items: center;
}

.image-preview-small {
  position: relative;
  width: 72px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e4e7ec;
}

.image-preview-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.remove-img-icon {
  position: absolute;
  top: -5px;
  right: -5px;
  cursor: pointer;
  color: #f56c6c;
  background: #fff;
  border-radius: 50%;
  font-size: 12px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-image-preview {
  position: relative;
  width: 140px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ec;
}

.bg-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.visibility-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f7f8fa;
}

.visibility-row:last-child {
  border-bottom: none;
}

.visibility-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.vis-icon {
  font-size: 16px;
}

.vis-label {
  font-size: 13px;
  color: #3d4a5c;
  font-weight: 500;
}

.visibility-hint {
  font-size: 10px;
  color: #c0c4cc;
  background: #f5f7fa;
  padding: 1px 6px;
  border-radius: 4px;
}

.fade-hint-enter-active,
.fade-hint-leave-active {
  transition: all 0.25s ease;
}

.fade-hint-enter-from,
.fade-hint-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

.content-group {
  margin-bottom: 4px;
}

.group-sub-header {
  display: flex;
  align-items: center;
  padding: 9px 4px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  font-weight: 600;
  color: #4b5563;
  border-bottom: 1px solid #f0f2f5;
  transition: background 0.14s;
}

.group-sub-header:hover {
  background: #f8faff;
}

.sub-arrow {
  margin-left: auto;
  font-size: 10px;
  color: #a0b4d0;
  transition: transform 0.2s;
}

.sub-arrow.collapsed {
  transform: rotate(-90deg);
}

.group-sub-fields {
  padding: 6px 4px 10px;
}

.section-block {
  border-bottom: 1px solid #f0f2f5;
  transition: background 0.15s;
}

.section-block.open {
  background: #fff;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.14s;
}

.section-header:hover {
  background: #f8faff;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #3d4a5c;
}

.section-arrow {
  font-size: 10px;
  color: #a0b4d0;
  transition: transform 0.25s ease;
}

.section-arrow.collapsed {
  transform: rotate(-90deg);
}

.section-body {
  padding: 4px 16px 14px;
}

.section-slide-enter-active,
.section-slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.section-slide-enter-from,
.section-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
