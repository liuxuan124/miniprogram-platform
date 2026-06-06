<template>
  <div class="template-center">
    <div class="ph">
      <div class="pt">模板中心</div>
      <div class="ps">选择预设模板快速创建页面，支持按行业、场景、风格筛选</div>
    </div>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="inp"
        placeholder="搜索模板名称"
      />
      <select v-model="selectedCategory" class="sel">
        <option value="">分类：全部</option>
        <option value="home">首页</option>
        <option value="activity">活动</option>
        <option value="content">内容</option>
        <option value="shop">商城</option>
        <option value="member">会员</option>
        <option value="booking">预约</option>
      </select>
      <select v-model="selectedIndustry" class="sel">
        <option value="">行业：全部</option>
        <option v-for="ind in industryOptions" :key="ind.code" :value="ind.code">{{ ind.label }}</option>
      </select>
      <select v-model="selectedScene" class="sel">
        <option value="">场景：全部</option>
        <option value="default">默认首页</option>
        <option value="campaign">营销活动</option>
        <option value="publish">内容发布</option>
        <option value="sales">商品销售</option>
        <option value="retention">会员运营</option>
        <option value="service">预约服务</option>
      </select>
      <select v-model="selectedStyle" class="sel">
        <option value="">风格：全部</option>
        <option value="minimal">简约</option>
        <option value="business">商务</option>
        <option value="vibrant">活力</option>
        <option value="premium">高端</option>
      </select>
      <button class="btn" @click="resetFilters">重置</button>
      <div class="mla actions">
        <button class="btn btn-p" @click="openCreateTemplateHint">+ 空白页</button>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="tab in categoryTabs"
        :key="tab.value"
        class="tab-btn"
        :class="{ active: selectedCategory === tab.value }"
        @click="selectedCategory = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="grid-wrap" v-loading="loading">
      <div class="template-grid">
        <article
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          class="template-card"
          @click="handlePreviewTemplate(tpl)"
        >
          <div class="cover" :style="coverStyle(tpl)">
            <div class="cover-phone">
              <div class="cover-top"></div>
              <div class="cover-lines">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="cover-blocks">
                <i></i>
                <i></i>
                <i></i>
              </div>
            </div>
            <span class="cover-badge">{{ tpl.sceneLabel }}</span>
          </div>

          <div class="card-body">
            <div class="card-title-row">
              <h3>{{ tpl.name }}</h3>
              <span class="priority">{{ tpl.priority }}</span>
            </div>
            <p class="desc">{{ tpl.description }}</p>
            <div class="tags">
              <span v-for="tag in tpl.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div class="meta">{{ tpl.dsl.components.length }} 个组件 · 推荐{{ tpl.recommendation }}</div>
          </div>

          <div class="card-actions">
            <button class="btn xs" @click.stop="handlePreviewTemplate(tpl)">预览</button>
            <button class="btn xs" @click.stop="openEditor(tpl)">编辑</button>
            <button class="btn xs btn-p" @click.stop="handleUseTemplate(tpl)">使用模板</button>
          </div>
        </article>
      </div>
      <div v-if="!loading && filteredTemplates.length === 0" class="empty-state">暂无匹配模板</div>
    </div>

    <div class="summary">共 {{ filteredTemplates.length }} 套模板</div>

    <!-- Preview dialog -->
    <el-dialog
      v-model="previewVisible"
      :title="`模板预览 - ${previewingTemplate?.name || ''}`"
      width="920px"
      destroy-on-close
      class="preview-dialog"
    >
      <div v-if="previewingTemplate" class="preview-dialog-body">
        <div class="preview-left">
          <PreviewPhone
            :page-title="previewingTemplate.dsl.page.name"
            :page-bg-color="previewingTemplate.dsl.page.background_color || '#f6f8fb'"
          >
            <ComponentItem
              v-for="(comp, index) in previewingTemplate.dsl.components"
              :key="comp.id"
              :component="comp"
              :index="index"
              :selected="false"
              @select="() => {}"
            />
          </PreviewPhone>
        </div>
        <div class="preview-right">
          <div class="info-item">
            <label>模板名称</label>
            <p>{{ previewingTemplate.name }}</p>
          </div>
          <div class="info-item">
            <label>适用场景</label>
            <p>{{ previewingTemplate.sceneLabel }}</p>
          </div>
          <div class="info-item">
            <label>包含组件</label>
            <p>{{ componentSummary(previewingTemplate) }}</p>
          </div>
          <div class="info-item">
            <label>推荐用途</label>
            <p>{{ previewingTemplate.recommendation }}</p>
          </div>
          <div class="info-item">
            <label>设计说明</label>
            <p>{{ previewingTemplate.description }}</p>
          </div>
          <div v-if="industryCombos[previewingTemplate.industryCode || '']" class="info-item">
            <label>行业推荐组件组合</label>
            <div class="combo-list">
              <div v-for="(combo, idx) in industryCombos[previewingTemplate.industryCode || '']" :key="idx" class="combo-chip">
                <span class="combo-num">{{ idx + 1 }}</span>
                <span>{{ combo.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button @click="handleExport(previewingTemplate?.dsl)">导出配置</el-button>
        <el-button type="primary" @click="confirmFromPreview">使用此模板</el-button>
      </template>
    </el-dialog>

    <!-- Quick editor dialog -->
    <el-dialog
      v-model="editorVisible"
      :title="'快速编辑：' + (editingTemplate?.name || '')"
      width="1200px"
      fullscreen
      destroy-on-close
      class="editor-dialog"
    >
      <TemplateQuickEditor
        v-if="editorVisible && editorDsl"
        :dsl="editorDsl"
        :editable-fields="editingTemplate?.editableFields || []"
        @save="onEditorSave"
        @export="handleExport"
      />
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button @click="handleExport(editorDsl)">导出配置</el-button>
        <el-button type="primary" @click="handleSaveAndApply">保存并应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createPage, getPageTemplates } from '@/api/page'
import type { ComponentInstance, PageDSL, PageTemplate } from '@/types/page'
import { ComponentType, IndustryLabels, IndustryColors } from '@/types/page'
import { getComponentDef, getDefaultProps, getDefaultStyle } from '@/components/page-builder/componentRegistry'
import PreviewPhone from '@/components/page-builder/PreviewPhone.vue'
import ComponentItem from '@/components/page-builder/ComponentItem.vue'
import TemplateQuickEditor from '@/components/page-templates/TemplateQuickEditor.vue'

type TemplateUI = Omit<PageTemplate, 'tags' | 'colors'> & {
  priority: 'P0' | 'P1'
  scene: 'default' | 'campaign' | 'publish' | 'sales' | 'retention' | 'service'
  sceneLabel: string
  tags: string[]
  recommendation: string
  colors: [string, string]
  style?: string
  editableFields?: any[]
  industryCode?: string
}

const router = useRouter()
const loading = ref(false)
const keyword = ref('')
const selectedCategory = ref('')
const selectedIndustry = ref('')
const selectedScene = ref('')
const selectedStyle = ref('')
const templates = ref<TemplateUI[]>([])

const previewVisible = ref(false)
const previewingTemplate = ref<TemplateUI | null>(null)

const editorVisible = ref(false)
const editingTemplate = ref<TemplateUI | null>(null)
const editorDsl = ref<any>(null)

const categoryTabs = [
  { value: '', label: '全部' },
  { value: 'home', label: '首页' },
  { value: 'activity', label: '活动' },
  { value: 'content', label: '内容' },
  { value: 'shop', label: '商城' },
  { value: 'member', label: '会员' },
  { value: 'booking', label: '预约' },
]

const industryOptions = Object.entries(IndustryLabels).map(([code, label]) => ({ code, label }))

const industryCombos: Record<string, Array<{ name: string; desc: string; components: string[] }>> = {
  clothing: [
    { name: '新品首发组合', desc: 'Banner展示 + 分类导航 + 限时秒杀', components: ['轮播Banner', '分类导航', '限时秒杀', '商品列表'] },
    { name: '会员专享组合', desc: '会员卡 + 专属优惠券 + 商品推荐', components: ['会员卡', '优惠券', '商品列表', '品牌介绍'] },
    { name: '穿搭推荐组合', desc: '图文组合 + 商品列表 + AI导购', components: ['图文组合', '商品列表', 'AI导购', '视频'] },
  ],
  food: [
    { name: '搜索驱动组合', desc: '搜索 + 分类导航 + 商品列表', components: ['搜索', '分类导航', '商品列表', '优惠券'] },
    { name: '品牌故事组合', desc: '品牌介绍 + 公告栏 + 商品列表 + AI导购', components: ['品牌介绍', '公告栏', '商品列表', 'AI导购'] },
  ],
  digital: [
    { name: '爆品秒杀组合', desc: '限时秒杀 + 倒计时 + 商品列表 + 优惠券', components: ['限时秒杀', '倒计时', '商品列表', '优惠券'] },
    { name: '视频种草组合', desc: '视频 + 图文组合 + 商品列表 + AI导购', components: ['视频', '图文组合', '商品列表', 'AI导购'] },
  ],
  home: [
    { name: '品牌展示组合', desc: '品牌介绍 + 图片 + 商品列表 + 优惠券', components: ['品牌介绍', '图片', '商品列表', '优惠券'] },
    { name: '预约体验组合', desc: '预约服务 + Banner + 品牌介绍 + 联系方式', components: ['预约服务', '轮播Banner', '品牌介绍', '联系方式'] },
  ],
  beauty: [
    { name: '品牌种草组合', desc: '品牌介绍 + 图文组合 + 商品列表 + AI导购', components: ['品牌介绍', '图文组合', '商品列表', 'AI导购'] },
    { name: '会员福利组合', desc: '会员卡 + 限时秒杀 + 优惠券 + 商品列表', components: ['会员卡', '限时秒杀', '优惠券', '商品列表'] },
  ],
  education: [
    { name: '课程展示组合', desc: '图文组合 + 视频 + 分类导航 + 预约服务', components: ['图文组合', '视频', '分类导航', '预约服务'] },
    { name: '招生转化组合', desc: 'Banner + 预约服务 + 表单入口 + 联系方式', components: ['轮播Banner', '预约服务', '表单入口', '联系方式'] },
  ],
  sports: [
    { name: '品牌运动组合', desc: '品牌介绍 + 视频 + 限时秒杀 + 商品列表', components: ['品牌介绍', '视频', '限时秒杀', '商品列表'] },
    { name: '赛事活动组合', desc: '活动列表 + Banner + 商品列表 + 优惠券', components: ['活动列表', '轮播Banner', '商品列表', '优惠券'] },
  ],
  travel: [
    { name: '目的地种草组合', desc: 'Banner + 图文组合 + 视频 + 活动列表', components: ['轮播Banner', '图文组合', '视频', '活动列表'] },
    { name: '定制咨询组合', desc: '预约服务 + 图文组合 + 联系方式 + 表单入口', components: ['预约服务', '图文组合', '联系方式', '表单入口'] },
  ],
  furniture: [
    { name: '样板间展示组合', desc: 'Banner + 图片 + 品牌介绍 + 预约服务', components: ['轮播Banner', '图片', '品牌介绍', '预约服务'] },
  ],
  medical: [
    { name: '科室展示组合', desc: '品牌介绍 + 图文组合 + 预约服务 + 资质证书', components: ['品牌介绍', '图文组合', '预约服务', '资质证书'] },
  ],
  wedding: [
    { name: '案例展示组合', desc: 'Banner + 视频 + 图文组合 + 预约服务', components: ['轮播Banner', '视频', '图文组合', '预约服务'] },
  ],
  pet: [
    { name: '宠物用品组合', desc: '搜索 + 分类导航 + 商品列表 + 优惠券', components: ['搜索', '分类导航', '商品列表', '优惠券'] },
  ],
}

const filteredTemplates = computed(() => {
  return templates.value.filter((tpl) => {
    const byName = !keyword.value || tpl.name.includes(keyword.value.trim())
    const byCategory = !selectedCategory.value || tpl.category === selectedCategory.value
    const byScene = !selectedScene.value || tpl.scene === selectedScene.value
    const byIndustry = !selectedIndustry.value || tpl.industryCode === selectedIndustry.value || (tpl as any).industry_code === selectedIndustry.value
    const byStyle = !selectedStyle.value || (tpl as any).style === selectedStyle.value
    return byName && byCategory && byScene && byIndustry && byStyle
  })
})

function makeComp(id: string, type: ComponentType, propsOverride?: Record<string, any>, styleOverride?: Record<string, any>): ComponentInstance {
  return {
    id,
    type,
    props: { ...getDefaultProps(type), ...propsOverride },
    style: { ...getDefaultStyle(type), ...styleOverride },
  }
}

function makeDsl(name: string, type: string, path: string, components: ComponentInstance[], bgColor = '#f6f8fb'): PageDSL {
  return {
    schema_version: '1.0',
    page: { id: `tpl_${name}`, name, type, path, background_color: bgColor },
    components,
    global_config: { pull_refresh: false, reach_bottom_load: false },
  }
}

function fallbackTemplates(): TemplateUI[] {
  return [
    {
      id: 2001,
      name: '电商增长首页模板',
      description: '搜索、公告、分类、秒杀、券、商品、内容与 AI 一体化首页，面向成交转化。',
      category: 'home',
      created_at: '',
      priority: 'P0',
      scene: 'sales',
      sceneLabel: '商品销售',
      tags: ['搜索', '秒杀', '优惠券', '商品转化'],
      recommendation: '成交优先',
      colors: ['#1d4ed8', '#06b6d4'],
      style: 'business',
      dsl: makeDsl('首页', 'home', 'pages/index/index', [
        makeComp('s1', ComponentType.Search, { placeholder: '搜索商品 / 文章 / 活动', scope: 'all' }),
        makeComp('nbar1', ComponentType.NoticeBar, { items: ['618大促满199减30', '新会员领券立减10元', '全国顺丰包邮活动进行中'] }),
        makeComp('b1', ComponentType.Banner, { images: [{ title: '全球优品限时专享', link_url: '/pages/activity-list/activity-list' }] }),
        makeComp('cat1', ComponentType.CategoryNav, { items: [{ icon: '🥩', title: '黑猪菜品', link_url: '/pages/product-list/product-list' }, { icon: '🌿', title: '药食同源', link_url: '/pages/product-list/product-list' }, { icon: '🎁', title: '礼盒专区', link_url: '/pages/product-list/product-list' }] }),
        makeComp('flash1', ComponentType.FlashSale),
        makeComp('coupon1', ComponentType.Coupon),
        makeComp('pt1', ComponentType.SectionTitle, { title: '推荐商品', subtitle: '精选好物，持续上新' }),
        makeComp('p1', ComponentType.ProductList, { title: '人气商品', columns: 2, limit: 6 }),
        makeComp('at1', ComponentType.SectionTitle, { title: '精选内容', subtitle: '品牌故事与选品指南' }),
        makeComp('a1', ComponentType.ArticleList, { title: '热门文章', limit: 3, columns: 1 }),
        makeComp('ai1', ComponentType.AIEntry, { title: 'AI导购助手', description: '可推荐商品、文章、活动' }),
      ]),
    },
    {
      id: 2002,
      name: '活动裂变专题模板',
      description: '活动列表 + 预约服务 + 倒计时 + 图文种草，适合拉新报名与线下转化。',
      category: 'activity',
      created_at: '',
      priority: 'P0',
      scene: 'campaign',
      sceneLabel: '营销活动',
      tags: ['活动列表', '报名预约', '倒计时', '裂变转化'],
      recommendation: '报名优先',
      colors: ['#0ea5e9', '#22c55e'],
      style: 'vibrant',
      dsl: makeDsl('活动专题', 'activity', 'pages/activity/topic', [
        makeComp('nbar2', ComponentType.NoticeBar, { title: '活动通知', items: ['报名名额有限，先到先得', '到场可领专属礼包', '支持扫码签到核销'] }),
        makeComp('b2', ComponentType.Banner, { images: [{ title: '年度品牌开放日', link_url: '/pages/activity-detail/activity-detail?id=1' }] }),
        makeComp('cd2', ComponentType.Countdown),
        makeComp('alist2', ComponentType.ActivityList),
        makeComp('service2', ComponentType.AppointmentService, { services: [{ name: '活动报名', desc: '快速提交报名信息', link_url: '/pages/activity-list/activity-list' }, { name: '到店体验', desc: '预约门店专属体验', link_url: '/pages/appointment-list/appointment-list' }] }),
        makeComp('imgtxt2', ComponentType.ImageText, { title: '活动亮点', content: '报名预约、签到核销、活动内容一站式展示。' }),
        makeComp('f2', ComponentType.FormEntry, { title: '填写报名信息', buttonText: '立即报名' }),
      ]),
    },
    {
      id: 2003,
      name: '品牌馆展示模板',
      description: '品牌介绍、资质证书、图文组合、联系方式、视频增强，适合产业馆和品牌馆展示。',
      category: 'member',
      created_at: '',
      priority: 'P0',
      scene: 'retention',
      sceneLabel: '会员运营',
      tags: ['品牌故事', '证书资质', '联系方式', '视频'],
      recommendation: '品牌信任',
      colors: ['#0f172a', '#1d4ed8'],
      style: 'premium',
      dsl: makeDsl('品牌馆', 'custom', 'pages/brand/index', [
        makeComp('brand3', ComponentType.BrandIntro, { title: 'RCEP国家馆全球优品库运营中心', subtitle: '湖南"湘品甄选-药食同源"产业联合体', desc: '围绕品牌内容、优品交易、活动运营与会员服务，构建全链路数字化运营体系。' }),
        makeComp('cert3', ComponentType.Certificate, { items: [{ name: '有机认证证书' }, { name: '质量检测报告' }, { name: '授权合作证明' }] }),
        makeComp('imgtxt3', ComponentType.ImageText, { title: '药食同源产业带', content: '聚焦地标产品与药食同源优品，打造从产地到门店的标准化体系。' }),
        makeComp('video3', ComponentType.Video, { title: '品牌馆介绍视频' }),
        makeComp('contact3', ComponentType.ContactInfo, { phone: '400-888-0000', address: '湖南省长沙市品牌中心', service_time: '周一至周日 09:00-21:00' }),
        makeComp('ai3', ComponentType.AIEntry, { title: 'AI品牌顾问', description: '咨询商品、文章与活动推荐' }),
      ]),
    },
  ]
}

function normalizeRemoteTemplate(item: PageTemplate): TemplateUI {
  const rawDsl = (item as any).dsl || (item as any).dslContent || (item as any).dsl_content
  let parsedDsl = rawDsl as PageDSL | undefined
  if (typeof rawDsl === 'string') {
    try {
      parsedDsl = JSON.parse(rawDsl) as PageDSL
    } catch {
      parsedDsl = undefined
    }
  }
  const fallback = fallbackTemplates().find((tpl) => tpl.name === item.name || tpl.category === item.category)
  return {
    ...item,
    priority: fallback?.priority || 'P1',
    scene: (item as any).scene || fallback?.scene || 'default',
    sceneLabel: fallback?.sceneLabel || '默认首页',
    tags: fallback?.tags || ['通用'],
    recommendation: fallback?.recommendation || '快速搭建',
    colors: fallback?.colors || ['#1769ff', '#20b7ff'],
    style: (item as any).style || fallback?.style || 'minimal',
    description: item.description || fallback?.description || '预设组件与样式',
    dsl: parsedDsl || fallback?.dsl || fallbackTemplates()[0].dsl,
    industryCode: (item as any).industryCode || (item as any).industry_code || '',
  }
}

async function fetchTemplates() {
  loading.value = true
  try {
    const res = await getPageTemplates()
    const payload = res.data as any
    const rows = Array.isArray(payload)
      ? (payload as any[])
      : ((payload?.records || []) as any[])
    const remote = rows
      .filter((item) => !!(item?.dsl || item?.dslContent || item?.dsl_content))
      .map((item) => normalizeRemoteTemplate(item as PageTemplate))
    templates.value = remote.length > 0 ? remote : fallbackTemplates()
  } catch {
    templates.value = fallbackTemplates()
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  keyword.value = ''
  selectedCategory.value = ''
  selectedIndustry.value = ''
  selectedScene.value = ''
  selectedStyle.value = ''
}

function coverStyle(tpl: TemplateUI) {
  return {
    background: `linear-gradient(135deg, ${tpl.colors[0]}, ${tpl.colors[1]})`,
  }
}

function componentSummary(tpl: TemplateUI) {
  return tpl.dsl.components.map((comp) => getComponentDef(comp.type as ComponentType)?.label || comp.type).join(' / ')
}

function openCreateTemplateHint() {
  ElMessageBox.confirm(
    '将创建一个空白自定义页面并进入装修器，是否继续？',
    '新建空白页面',
    { confirmButtonText: '继续', cancelButtonText: '取消', type: 'info' },
  ).then(async () => {
    const suffix = Date.now().toString().slice(-6)
    const payload = {
      name: `自定义页面-${suffix}`,
      type: 3,
      path: `/pages/custom/page-${suffix}`,
      shareTitle: `自定义页面-${suffix}`,
      background_color: '#f6f8fb',
    }
    const res = await createPage(payload as any)
    const newPageId = (res.data as any)?.id || (res.data as any)?.pageId
    ElMessage.success('已创建空白页面，正在进入装修器')
    if (newPageId) {
      router.push({ name: 'PageBuilderEditor', params: { id: newPageId } })
    } else {
      router.push({ name: 'PageBuilderList' })
    }
  }).catch(() => {})
}

function handlePreviewTemplate(tpl: TemplateUI) {
  previewingTemplate.value = tpl
  previewVisible.value = true
}

async function handleUseTemplate(tpl: TemplateUI) {
  try {
    await ElMessageBox.confirm(
      `确认使用「${tpl.name}」创建页面并进入装修器？`,
      '使用模板',
      {
        confirmButtonText: '创建并进入装修器',
        cancelButtonText: '取消',
        type: 'info',
      },
    )

    const PAGE_TYPE_MAP: Record<string, number> = { home: 1, topic: 2, activity: 2, custom: 3 }
    const basePathMap: Record<string, string> = {
      home: '/pages/index/index',
      activity: '/pages/activity/topic',
      content: '/pages/content/index',
      shop: '/pages/shop/index',
      member: '/pages/member/index',
      booking: '/pages/booking/index',
    }
    const pageTypeStr = tpl.dsl.page.type || 'custom'
    const payload = {
      name: `${tpl.name}-${Date.now().toString().slice(-4)}`,
      type: PAGE_TYPE_MAP[pageTypeStr] ?? 3,
      path: basePathMap[tpl.category || ''] || `/pages/custom/${Date.now()}`,
      shareTitle: tpl.dsl.page.share_title || tpl.name,
      background_color: tpl.dsl.page.background_color || '#f6f8fb',
      dsl: tpl.dsl,
    }

    const res = await createPage(payload)
    const newPageId = (res.data as any)?.id || (res.data as any)?.pageId
    ElMessage.success('模板已应用，正在进入装修器')
    if (newPageId) {
      router.push({ name: 'PageBuilderEditor', params: { id: newPageId } })
    } else {
      router.push({ name: 'PageBuilderList' })
    }
  } catch {
    // user canceled
  }
}

function confirmFromPreview() {
  if (!previewingTemplate.value) return
  const tpl = previewingTemplate.value
  previewVisible.value = false
  handleUseTemplate(tpl)
}

function openEditor(tpl: TemplateUI) {
  editingTemplate.value = tpl
  editorDsl.value = JSON.parse(JSON.stringify(tpl.dsl))
  editorVisible.value = true
}

function onEditorSave(updatedDsl: any) {
  editorDsl.value = updatedDsl
  ElMessage.success('修改已暂存')
}

function handleExport(dsl: any) {
  if (!dsl) return
  const blob = new Blob([JSON.stringify(dsl, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template-config.json'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

async function handleSaveAndApply() {
  if (editingTemplate.value && editorDsl.value) {
    // 使用编辑后的 DSL 创建页面
    const tplWithEditedDsl = { ...editingTemplate.value, dsl: editorDsl.value }
    handleUseTemplate(tplWithEditedDsl)
    editorVisible.value = false
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>

<style lang="scss" scoped>
.template-center {
  color: #172033;
}

.ph {
  margin-bottom: 12px;
}

.pt {
  font-size: 24px;
  font-weight: 800;
}

.ps {
  margin-top: 4px;
  color: #7b8798;
  font-size: 13px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.inp,
.sel {
  height: 36px;
  padding: 0 10px;
  color: #172033;
  font-size: 13px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  outline: none;
}

.inp {
  width: 200px;
}

.sel {
  min-width: 140px;
}

.mla {
  margin-left: auto;
}

.actions {
  display: flex;
  gap: 8px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.tab-btn {
  height: 32px;
  padding: 0 12px;
  color: #607187;
  font-size: 12px;
  background: #fff;
  border: 1px solid #d9e2ef;
  border-radius: 99px;
  cursor: pointer;

  &.active {
    color: #fff;
    background: #1769ff;
    border-color: #1769ff;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 14px;
  color: #172033;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  cursor: pointer;
}

.btn-p {
  color: #fff;
  background: #1769ff;
  border-color: #1769ff;
}

.xs {
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
}

.grid-wrap {
  padding: 12px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.template-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.16s;

  &:hover {
    border-color: #1769ff;
    box-shadow: 0 8px 24px rgba(23, 105, 255, 0.1);
    transform: translateY(-2px);
  }
}

.cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 168px;
}

.cover-phone {
  width: 115px;
  height: 148px;
  overflow: hidden;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 0 0 5px rgba(17, 24, 39, 0.88), 0 8px 18px rgba(17, 24, 39, 0.28);
}

.cover-top {
  height: 16px;
  background: #111827;
}

.cover-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;

  span {
    height: 6px;
    background: #d9e2ef;
    border-radius: 4px;
  }
}

.cover-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 8px 8px;

  i {
    display: block;
    height: 30px;
    background: #eff4fb;
    border-radius: 6px;
  }

  i:last-child {
    grid-column: span 2;
  }
}

.cover-badge {
  position: absolute;
  right: 10px;
  top: 10px;
  padding: 3px 8px;
  color: #fff;
  font-size: 11px;
  background: rgba(15, 23, 42, 0.35);
  border-radius: 99px;
}

.card-body {
  padding: 12px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  h3 {
    font-size: 15px;
    font-weight: 800;
  }
}

.priority {
  color: #1769ff;
  font-size: 11px;
  font-weight: 700;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 99px;
  padding: 2px 8px;
}

.desc {
  min-height: 36px;
  margin-top: 8px;
  color: #607187;
  font-size: 12px;
  line-height: 1.5;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag {
  padding: 2px 8px;
  color: #607187;
  font-size: 11px;
  border: 1px solid #d9e2ef;
  border-radius: 99px;
  background: #f8faff;
}

.meta {
  margin-top: 8px;
  color: #7b8798;
  font-size: 11px;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 0 12px 12px;
}

.empty-state {
  padding: 24px 0;
  color: #7b8798;
  font-size: 13px;
  text-align: center;
}

.summary {
  margin-top: 10px;
  color: #7b8798;
  font-size: 12px;
}

.preview-dialog-body {
  display: grid;
  grid-template-columns: 430px 1fr;
  gap: 12px;
}

.preview-left {
  overflow: auto;
  max-height: 640px;
  padding: 8px;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  background: #f8faff;
}

.preview-right {
  padding: 8px 4px;
}

.info-item {
  margin-bottom: 14px;

  label {
    display: block;
    margin-bottom: 6px;
    color: #7b8798;
    font-size: 12px;
    font-weight: 700;
  }

  p {
    color: #172033;
    font-size: 13px;
    line-height: 1.6;
  }
}

.combo-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.combo-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  font-size: 12px;
  color: #172033;
}

.combo-num {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #1769ff;
  flex-shrink: 0;
}

.editor-dialog :deep(.el-dialog__body) {
  padding: 0 !important;
  height: calc(90vh - 110px);
  overflow: hidden;
}

@media (max-width: 1320px) {
  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .mla {
    margin-left: 0;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .preview-dialog-body {
    grid-template-columns: 1fr;
  }
}
</style>
