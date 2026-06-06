<template>
  <div class="pc-templates-page">
    <div class="page-header">
      <div class="header-left">
        <h1>👤 个人中心模板</h1>
        <p class="header-desc">6套精心设计的个人中心页面模板，支持预览、定制、一键应用</p>
      </div>
      <div class="header-right">
        <el-button v-if="selectedTemplate" type="primary" @click="enterCustomize">
          ✨ 进入装修 →
        </el-button>
      </div>
    </div>

    <div class="mode-toggle-bar">
      <div class="mode-tabs">
        <div
          v-for="m in modes"
          :key="m.key"
          class="mode-tab"
          :class="{ active: currentMode === m.key }"
          @click="currentMode = m.key"
        >
          <span class="mode-icon">{{ m.icon }}</span>
          <span class="mode-label">{{ m.label }}</span>
        </div>
      </div>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索模板名称或特性..."
        prefix-icon="Search"
        size="default"
        clearable
        style="width: 260px"
      />
    </div>

    <div v-if="currentMode === 'select'" class="template-gallery">
      <TransitionGroup name="pc-card" tag="div" class="gallery-grid">
        <div
          v-for="tpl in filteredTemplates"
          :key="tpl.key"
          class="pc-template-card"
          :class="{ selected: selectedTemplate?.key === tpl.key }"
          @click="selectTemplate(tpl)"
        >
          <div class="card-cover" :style="coverStyle(tpl)">
            <div class="cover-overlay">
              <span class="cover-icon">{{ tpl.icon }}</span>
              <span class="cover-name">{{ tpl.name }}</span>
            </div>
            <div class="card-badges">
              <span class="badge badge-style">{{ tpl.styleName }}</span>
            </div>
            <div v-if="selectedTemplate?.key === tpl.key" class="check-mark">✓</div>
          </div>
          <div class="card-body">
            <h4 class="card-title">{{ tpl.name }}</h4>
            <p class="card-desc">{{ tpl.description.slice(0, 60) }}{{ tpl.description.length > 60 ? '...' : '' }}</p>
            <div class="card-features">
              <span v-for="(feat, fi) in tpl.features.slice(0, 4)" :key="fi" class="feature-tag">
                {{ feat }}
              </span>
            </div>
            <div class="card-actions">
              <el-button size="small" text @click.stop="openPreview(tpl)">👁 预览</el-button>
              <el-button size="small" text type="primary" @click.stop="quickApply(tpl)">✨ 使用</el-button>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <div v-if="filteredTemplates.length === 0" class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>没有匹配的模板</p>
        <el-button text type="primary" @click="searchKeyword = ''">清除搜索</el-button>
      </div>
    </div>

    <div v-else-if="currentMode === 'customize'" class="customize-view">
      <div v-if="!selectedTemplate && !customDsl" class="customize-empty">
        <span class="empty-icon">🎨</span>
        <p>请先选择一个模板开始定制</p>
        <el-button type="primary" @click="currentMode = 'select'">← 返回选择</el-button>
      </div>
      <PersonalCenterCustomizer
        v-else
        :template-dsl="customDsl || selectedTemplate?.dsl"
        :template-fields="selectedTemplate?.editableFields || []"
        @update:dsl="onDslUpdate"
        @save="handleSave"
        @export="handleExport"
      />
    </div>

    <div v-else-if="currentMode === 'history'" class="history-view">
      <div class="history-list">
        <div v-if="savedConfigs.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <p>暂无保存的配置记录</p>
          <p class="empty-sub">选择并保存模板后，记录将显示在这里</p>
        </div>
        <div v-for="(cfg, idx) in savedConfigs" :key="idx" class="history-item">
          <div class="history-info">
            <span class="history-name">{{ cfg.templateName }}</span>
            <span class="history-time">{{ cfg.savedAt }}</span>
          </div>
          <div class="history-preview-thumb" :style="{ background: cfg.primaryColor }"></div>
          <div class="history-actions">
            <el-button size="small" text @click="loadFromHistory(cfg)">加载</el-button>
            <el-button size="small" text type="danger" @click="removeHistory(idx)">删除</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Dialog -->
    <el-dialog
      v-model="previewVisible"
      :title="'📱 预览：' + (previewTpl?.name || '')"
      width="920px"
      destroy-on-close
      class="pc-preview-dialog"
    >
      <div class="preview-layout">
        <div class="preview-info-panel">
          <div class="preview-title-row">
            <span class="tpl-icon-lg">{{ previewTpl?.icon }}</span>
            <div>
              <h3>{{ previewTpl?.name }}</h3>
              <span class="style-badge">{{ previewTpl?.styleName }}</span>
            </div>
          </div>
          <p class="preview-desc">{{ previewTpl?.description }}</p>
          <div class="preview-structure">
            <strong>布局结构：</strong>
            <p>{{ previewTpl?.previewDescription }}</p>
          </div>
          <div class="preview-colors">
            <strong>配色方案：</strong>
            <div class="color-swatches">
              <div class="swatch" :style="{ background: previewTpl?.primaryColor }" :title="'主色 ' + previewTpl?.primaryColor"></div>
              <div class="swatch" :style="{ background: previewTpl?.secondaryColor }" :title="'辅助色 ' + previewTpl?.secondaryColor"></div>
              <div class="swatch" :style="{ background: previewTpl?.backgroundColor }" :title="'背景色 ' + previewTpl?.backgroundColor"></div>
              <div class="swatch" :style="{ background: previewTpl?.textColor }" :title="'文字色 ' + previewTpl?.textColor"></div>
            </div>
          </div>
          <div class="preview-feature-list">
            <span v-for="(f, i) in previewTpl?.features" :key="i" class="feat-chip">{{ f }}</span>
          </div>
          <div class="editable-count">
            <el-tag size="small" type="info" effect="plain">
              📝 {{ previewTpl?.editableFields.length }} 个可编辑字段
            </el-tag>
          </div>
        </div>
        <div class="preview-phone-area">
          <div class="phone-mockup">
            <div class="phone-notch"></div>
            <div class="phone-screen" :style="{ background: previewDsl?.page?.background_color || '#f6f8fb' }">
              <div class="screen-scroll">
                <div v-for="(comp, _cIdx) in (previewDsl?.components || [])" :key="comp.id" class="prev-comp" :style="compStyle(comp)">
                  <div v-html="renderComponentPreview(comp)"></div>
                </div>
                <div v-if="!previewDsl?.components?.length" class="prev-empty">暂无组件数据</div>
              </div>
            </div>
            <div class="phone-home-indicator"></div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="applyFromPreview">✨ 使用此模板</el-button>
      </template>
    </el-dialog>

    <!-- Quick Apply Confirm -->
    <el-dialog v-model="applyConfirmVisible" title="确认使用模板" width="480px">
      <div class="apply-confirm-body">
        <div class="confirm-icon-wrap">
          <span class="confirm-icon">{{ applyingTpl?.icon }}</span>
        </div>
        <h3>应用「{{ applyingTpl?.name }}」模板</h3>
        <p>将使用此模板作为个人中心页面的基础配置</p>
        <p class="confirm-hint">您可以在后续步骤中进一步调整颜色、布局、内容等</p>
      </div>
      <template #footer>
        <el-button @click="applyConfirmVisible = false">取消</el-button>
        <el-button type="primary" :loading="applying" @click="confirmQuickApply">确认使用</el-button>
      </template>
    </el-dialog>

    <!-- Save Success Toast Area -->
    <div class="save-status-bar" :class="{ visible: showSaveStatus }">
      <span class="status-icon">{{ saveSuccess ? '✅' : '⚠️' }}</span>
      <span>{{ saveMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import PersonalCenterCustomizer from '@/components/personal-center/PersonalCenterCustomizer.vue'
import { getPersonalCenterTemplates, getPersonalCenterTemplateByKey, type PersonalCenterTemplate } from '@/data/personalCenterTemplates'
import { updateConfigs, getConfigs } from '@/api/system'

const modes = [
  { key: 'select', icon: '🎴', label: '选择模板' },
  { key: 'customize', icon: '🎨', label: '装修定制' },
  { key: 'history', icon: '📋', label: '历史记录' },
]

const currentMode = ref('select')
const searchKeyword = ref('')
const allTemplates = ref<PersonalCenterTemplate[]>(getPersonalCenterTemplates())
const selectedTemplate = ref<PersonalCenterTemplate | null>(null)
const customDsl = ref<any>(null)

const previewVisible = ref(false)
const previewTpl = ref<PersonalCenterTemplate | null>(null)
const previewDsl = ref<any>(null)

const applyConfirmVisible = ref(false)
const applyingTpl = ref<PersonalCenterTemplate | null>(null)
const applying = ref(false)

const savedConfigs = ref<any[]>([])
const showSaveStatus = ref(false)
const saveSuccess = ref(false)
const saveMessage = ref('')

const filteredTemplates = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return allTemplates.value
  return allTemplates.value.filter(t =>
    t.name.toLowerCase().includes(kw) ||
    t.description.toLowerCase().includes(kw) ||
    t.styleName.toLowerCase().includes(kw) ||
    t.features.some(f => f.toLowerCase().includes(kw))
  )
})

function coverStyle(tpl: PersonalCenterTemplate) {
  return {
    background: `linear-gradient(135deg, ${tpl.primaryColor}, ${tpl.secondaryColor})`,
  }
}

function selectTemplate(tpl: PersonalCenterTemplate) {
  selectedTemplate.value = tpl
  customDsl.value = null
}

function enterCustomize() {
  if (!selectedTemplate.value) {
    ElMessage.warning('请先选择一个模板')
    return
  }
  customDsl.value = JSON.parse(JSON.stringify(selectedTemplate.value.dsl))
  currentMode.value = 'customize'
}

function openPreview(tpl: PersonalCenterTemplate) {
  previewTpl.value = tpl
  previewDsl.value = JSON.parse(JSON.stringify(tpl.dsl))
  previewVisible.value = true
}

function quickApply(tpl: PersonalCenterTemplate) {
  applyingTpl.value = tpl
  applyConfirmVisible.value = true
}

function applyFromPreview() {
  if (previewTpl.value) {
    quickApply(previewTpl.value)
    previewVisible.value = false
  }
}

async function confirmQuickApply() {
  const tpl = applyingTpl.value
  if (!tpl) return
  applying.value = true
  try {
    selectedTemplate.value = tpl
    customDsl.value = JSON.parse(JSON.stringify(tpl.dsl))
    applyConfirmVisible.value = false
    currentMode.value = 'customize'
    ElMessage.success(`已加载「${tpl.name}」模板，开始定制吧！`)
  } catch (e: any) {
    ElMessage.error('操作失败：' + (e.message || '未知错误'))
  } finally {
    applying.value = false
  }
}

function onDslUpdate(dsl: any) {
  customDsl.value = dsl
}

async function handleSave() {
  if (!customDsl.value || !selectedTemplate.value) {
    ElMessage.warning('没有可保存的配置')
    return
  }

  try {
    const configPayload = {
      templateKey: selectedTemplate.value.key,
      templateName: selectedTemplate.value.name,
      dsl: customDsl.value,
      savedAt: new Date().toLocaleString('zh-CN'),
      primaryColor: selectedTemplate.value.primaryColor,
    }

    await updateConfigs([
      { configKey: 'personalCenterConfig', configValue: JSON.stringify(configPayload), configGroup: 'miniapp', description: '个人中心页面配置' },
    ] as any)

    savedConfigs.value.unshift({
      ...configPayload,
      id: Date.now(),
    })
    if (savedConfigs.value.length > 10) savedConfigs.value.length = 10

    showSaveStatusMessage(true, '配置已成功保存到系统！')
    ElMessage.success('个人中心配置已保存')
  } catch (e: any) {
    showSaveStatusMessage(false, '保存失败：' + (e.message || '未知错误'))
    ElMessage.error('保存失败')
  }
}

function handleExport(data: any) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `personal-center-${selectedTemplate.value?.key}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

function loadFromHistory(cfg: any) {
  const tpl = getPersonalCenterTemplateByKey(cfg.templateKey)
  if (tpl) {
    selectedTemplate.value = tpl
  }
  customDsl.value = JSON.parse(JSON.stringify(cfg.dsl))
  currentMode.value = 'customize'
  ElMessage.success(`已加载历史配置：${cfg.templateName}`)
}

function removeHistory(idx: number) {
  savedConfigs.value.splice(idx, 1)
  ElMessage.info('已删除记录')
}

function showSaveStatusMessage(success: boolean, msg: string) {
  saveSuccess.value = success
  saveMessage.value = msg
  showSaveStatus.value = true
  setTimeout(() => { showSaveStatus.value = false }, 3000)
}

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderComponentPreview(comp: any): string {
  const type = comp.type
  const props = comp.props || {}

  switch (type) {
    case 'image_text': {
      const items = props.items || []
      const bg = props.background_gradient
        ? `background:linear-gradient(135deg,${props.background_gradient[0]},${props.background_gradient[1]});`
        : props.background_color
          ? `background-color:${props.background_color};`
          : 'background:#eee;'
      let html = `<div style="${bg}padding:14px;border-radius:10px;overflow:hidden;color:${props.title_color||'#333'};">`
      for (const item of items) {
        html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">`
        if (item.image) html += `<div style="width:40px;height:40px;border-radius:50%;background:#ddd;flex-shrink:0;overflow:hidden;"><img src="${item.image}" style="width:100%;height:100%;object-fit:cover;display:block"/></div>`
        html += `<div><div style="font-size:14px;font-weight:600">${escapeHtml(item.title||'')}</div><div style="font-size:11px;color:#999">${escapeHtml(item.desc||'')}</div></div></div>`
      }
      html += '</div>'
      return html
    }
    case 'member_card': {
      const grad = props.background_gradient
        ? `background:linear-gradient(135deg,${props.background_gradient[0]},${props.background_gradient[1]});`
        : 'background:linear-gradient(135deg,#667eea,#764ba2);'
      const benefits = props.benefits || []
      let bHtml = benefits.map((b: string) => `<span style="font-size:10px;background:rgba(255,255,255,0.18);padding:2px 8px;border-radius:99px;margin-right:4px;">${escapeHtml(b)}</span>`).join('')
      return `<div style="${grad}border-radius:12px;padding:14px;color:#fff;">
        <div style="font-size:15px;font-weight:bold">${escapeHtml(props.title||'会员卡')}</div>
        <div style="font-size:11px;opacity:0.75;margin-top:2px">${escapeHtml(props.level||'GOLD')} · 积分 ${escapeHtml(String(props.points||'0'))}</div>
        <div style="margin-top:8px">${bHtml}</div>
      </div>`
    }
    case 'nav': {
      const items = props.items || []
      const cols = props.columns || 4
      const isWide = props.wide_button_mode
      if (isWide) {
        return items.map((it: any) => `<div style="background:#f5f5f5;border-radius:10px;padding:12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px">${it.icon}</span><div><div style="font-weight:600;font-size:13px">${escapeHtml(it.title)}</div><div style="font-size:11px;color:#888">${escapeHtml(it.desc||'')}</div></div>
        </div>`).join('')
      }
      const gap = Math.max(4, Math.floor((300 - cols * 44) / (cols + 1)))
      let html = `<div style="display:flex;flex-wrap:wrap;gap:${gap}px;padding:8px;">`
      for (const it of items) {
        html += `<div style="width:calc(${100/cols}% - ${(cols-1)*gap/cols}px);display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="width:38px;height:38px;border-radius:10px;background:${props.icon_bg_color||'#f0f0f0'};display:flex;align-items:center;justify-content:center;font-size:18px;">${it.icon}</div>
          <div style="font-size:10px;color:${props.text_color||'#333'};text-align:center">${escapeHtml(it.title)}</div>
        </div>`
      }
      html += '</div>'
      return html
    }
    case 'product_list':
      return `<div style="padding:4px;"><div style="font-size:14px;font-weight:700;color:#333;padding:6px 0;">${escapeHtml(props.title||'列表区域')}</div><div style="background:#fff;border-radius:8px;padding:10px;margin-bottom:6px;">列表项占位...</div></div>`
    case 'rich_text':
      return `<div style="padding:8px;line-height:1.6;font-size:13px;">${props.content||''}</div>`
    case 'notice_bar':
      return `<div style="background:${props.background_color||'#fffbeb'};border-radius:6px;padding:8px 12px;display:flex;align-items:center;gap:6px;font-size:11px;color:${props.text_color||'#b45309'};">
        <span>${props.icon||'📢'}</span><span>${props.text||''}</span>
      </div>`
    case 'image':
      return `<div style="width:100%;border-radius:${props.radius||0}px;overflow:hidden;height:140px;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;">图片区域</div>`
    case 'banner':
      return `<div style="width:100%;height:180px;border-radius:${props.border_radius||0}px;overflow:hidden;background:linear-gradient(135deg,#ccc,#999);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;">横幅/Banner</div>`
    case 'divider':
      return `<div style="display:flex;align-items:center;gap:8px;padding:10px 0;"><div style="flex:1;height:1px;background:${props.color||'#eee'};"></div>${props.text?`<span style="font-size:11px;color:#bbb">${props.text}</span>`:''}<div style="flex:1;height:1px;background:${props.color||'#eee'};"></div></div>`
    case 'spacer':
      return `<div style="height:${props.height||20}px;"></div>`
    default:
      return `<div style="padding:16px;text-align:center;background:#fafafa;border-radius:8px;border:1px dashed #ddd;color:#999;font-size:12px;">[${type}]</div>`
  }
}

function compStyle(comp: any): Record<string, string> {
  const s = comp.style || {}
  const style: Record<string, string> = {}
  if (s.margin_top != null) style.marginTop = `${s.margin_top}px`
  if (s.margin_bottom != null) style.marginBottom = `${s.margin_bottom}px`
  if (s.margin_left != null) style.marginLeft = `${s.margin_left}px`
  if (s.margin_right != null) style.marginRight = `${s.margin_right}px`
  if (s.padding_top != null) style.paddingTop = `${s.padding_top}px`
  if (s.padding_bottom != null) style.paddingBottom = `${s.padding_bottom}px`
  if (s.padding_left != null) style.paddingLeft = `${s.padding_left}px`
  if (s.padding_right != null) style.paddingRight = `${s.padding_right}px`
  if (s.border_radius != null) style.borderRadius = `${s.border_radius}px`
  if (s.background_color) style.backgroundColor = s.background_color
  style.transition = 'all 0.2s ease'
  return style
}

onMounted(async () => {
  try {
    const res = await getConfigs()
    const groups: any[] = Array.isArray(res) ? res : (res as any).data || []
    let pcCfg: any = undefined
    for (const group of groups) {
      const found = (group.configs || []).find((c: any) => c.key === 'personalCenterConfig')
      if (found) {
        pcCfg = found
        break
      }
    }
    if (pcCfg?.value) {
      try {
        const parsed = JSON.parse(pcCfg.value)
        savedConfigs.value = [parsed].filter(Boolean)
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
})
</script>

<style scoped>
.pc-templates-page { padding: 20px 24px; max-width: 1440px; margin: 0 auto; min-height: calc(100vh - 120px); }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.header-left h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; color: #1a1a2e; }
.header-desc { color: #7b8798; font-size: 14px; margin: 0; }
.header-right { padding-top: 4px; }

.mode-toggle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  padding: 6px;
}
.mode-tabs { display: flex; gap: 4px; }
.mode-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: 8px;
  cursor: pointer; transition: all 0.2s;
  user-select: none; font-size: 13px; color: #60687a;
}
.mode-tab:hover { background: #f5f7fa; }
.mode-tab.active { background: #1769ff; color: #fff; font-weight: 600; box-shadow: 0 2px 8px rgba(23,105,255,0.25); }
.mode-icon { font-size: 16px; }

/* Template Gallery */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.pc-template-card {
  background: #fff;
  border: 2px solid transparent;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.28s ease;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.pc-template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  border-color: rgba(23,105,255,0.2);
}
.pc-template-card.selected {
  border-color: #1769ff;
  box-shadow: 0 0 0 3px rgba(23,105,255,0.12), 0 12px 32px rgba(0,0,0,0.1);
}

.card-cover {
  height: 160px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cover-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 1;
}
.cover-icon { font-size: 42px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
.cover-name { color: #fff; font-size: 16px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,0.3); }

.card-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
}
.badge {
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(4px);
}

.check-mark {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  background: #1769ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  z-index: 2;
  animation: popIn 0.25s ease;
}
@keyframes popIn { 0% { transform: scale(0); } 70% { transform: scale(1.15); } 100% { transform: scale(1); } }

.card-body { padding: 16px; }
.card-title { font-size: 15px; font-weight: 700; margin: 0 0 6px; color: #1a1a2e; }
.card-desc { font-size: 12px; color: #7b8798; line-height: 1.5; margin: 0 0 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.card-features { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.feature-tag {
  padding: 2px 8px;
  background: #f0f4ff;
  border-radius: 99px;
  font-size: 11px;
  color: #1769ff;
}

.card-actions { display: flex; gap: 4px; justify-content: flex-end; }

/* Card transitions */
.pc-card-enter-active { transition: all 0.35s ease; }
.pc-card-leave-active { transition: all 0.2s ease; }
.pc-card-enter-from { opacity: 0; transform: translateY(16px) scale(0.96); }
.pc-card-leave-to { opacity: 0; transform: scale(0.95); }
.pc-card-move { transition: transform 0.35s ease; }

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
  color: #a0b4d0;
}
.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
.empty-sub { font-size: 12px; color: #c0c4cc; margin-top: 4px; }

/* Customize View */
.customize-view { min-height: 600px; }
.customize-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 400px; gap: 16px; color: #a0b4d0;
}
.customize-empty .empty-icon { font-size: 64px; }

/* History View */
.history-list { max-width: 720px; }
.history-item {
  display: flex; align-items: center; gap: 16px;
  background: #fff; border: 1px solid #e4e7ec; border-radius: 12px;
  padding: 14px 18px; margin-bottom: 10px;
  transition: all 0.2s;
}
.history-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-color: #d1d5db; }
.history-info { flex: 1; }
.history-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.history-time { font-size: 11px; color: #a0b4d0; }
.history-preview-thumb { width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; }
.history-actions { display: flex; gap: 4px; }

/* Preview Dialog */
.preview-layout { display: flex; gap: 28px; }
.preview-info-panel { flex: 1; min-width: 280px; }
.preview-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.tpl-icon-lg { font-size: 36px; }
.preview-title-row h3 { margin: 0; font-size: 18px; }
.style-badge { font-size: 11px; background: #f0f4ff; color: #1769ff; padding: 2px 10px; border-radius: 99px; }
.preview-desc { color: #7b8798; font-size: 13px; line-height: 1.6; margin: 0 0 12px; }
.preview-structure { margin-bottom: 12px; }
.preview-structure strong { font-size: 12px; color: #4b5563; }
.preview-structure p { font-size: 12px; color: #7b8798; margin: 4px 0 0; line-height: 1.5; }
.preview-colors { margin-bottom: 12px; }
.preview-colors strong { font-size: 12px; color: #4b5563; display: block; margin-bottom: 6px; }
.color-swatches { display: flex; gap: 8px; }
.swatch { width: 32px; height: 32px; border-radius: 8px; cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.12); transition: transform 0.15s; }
.swatch:hover { transform: scale(1.15); }
.preview-feature-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.feat-chip { padding: 2px 10px; background: #f0fdf4; border-radius: 99px; font-size: 11px; color: #059669; }
.editable-count { margin-top: 8px; }

.preview-phone-area { flex-shrink: 0; }
.phone-mockup {
  width: 340px; min-height: 640px; max-height: 700px;
  background: #111827; border-radius: 36px; padding: 10px;
  box-shadow: 0 0 0 2px #333, 0 20px 60px rgba(0,0,0,0.25), inset 0 0 4px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
}
.phone-notch { width: 120px; height: 26px; background: #111827; border-radius: 0 0 16px 16px; margin: 0 auto; flex-shrink: 0; }
.phone-screen { flex: 1; border-radius: 28px; overflow: hidden; overflow-y: auto; scrollbar-width: none; }
.phone-screen::-webkit-scrollbar { display: none; }
.screen-scroll { padding: 6px; min-height: 100%; }
.prev-comp { margin-bottom: 4px; border-radius: 8px; overflow: hidden; }
.prev-empty { text-align: center; padding: 60px 20px; color: #c0c4cc; font-size: 13px; }
.phone-home-indicator { width: 110px; height: 4px; background: #555; border-radius: 2px; margin: 6px auto 4px; flex-shrink: 0; }

/* Apply Confirm */
.apply-confirm-body { text-align: center; padding: 16px 0; }
.confirm-icon-wrap { margin-bottom: 10px; }
.confirm-icon { font-size: 52px; }
.apply-confirm-body h3 { margin: 0 0 6px; font-size: 17px; }
.apply-confirm-body p { color: #7b8798; font-size: 13px; margin: 2px 0; }
.confirm-hint { color: #a0b4d0 !important; font-size: 12px !important; }

/* Save Status Bar */
.save-status-bar {
  position: fixed; bottom: 24px; right: 24px;
  display: flex; align-items: center; gap: 8px;
  background: #fff; border: 1px solid #e4e7ec; border-radius: 10px;
  padding: 12px 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  z-index: 2000; transform: translateY(100px); opacity: 0;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px; font-weight: 500;
}
.save-status-bar.visible { transform: translateY(0); opacity: 1; }
.status-icon { font-size: 18px; }

@media (max-width: 900px) {
  .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .preview-layout { flex-direction: column; }
  .phone-mockup { width: 300px; margin: 0 auto; }
  .mode-toggle-bar { flex-direction: column; gap: 10px; }
  .mode-tabs { width: 100%; justify-content: center; }
}

@media (max-width: 640px) {
  .pc-templates-page { padding: 12px; }
  .gallery-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 10px; }
}
</style>
