<template>
  <div class="industry-modules-page">
    <div class="ph">
      <div class="pt">行业模块</div>
      <div class="ps">针对不同行业特点，提供专属的装修模板与功能模块组合，快速搭建行业化商城页面</div>
    </div>

    <div class="industry-selector-bar">
      <button
        v-for="ind in allIndustries"
        :key="ind.code"
        class="ind-select-btn"
        :class="{ active: activeIndustry === ind.code }"
        :style="activeIndustry === ind.code ? { background: ind.colors[0], borderColor: ind.colors[0] } : {}"
        @click="activeIndustry = ind.code"
      >
        <span class="ind-btn-icon">{{ ind.icon }}</span>
        <span class="ind-btn-label">{{ ind.label }}</span>
      </button>
    </div>

    <div v-if="activeIndustry" class="industry-detail">
      <div class="ind-header">
        <div class="ind-header-info">
          <span class="ind-header-icon">{{ currentIndustry?.icon }}</span>
          <div>
            <h2>{{ currentIndustry?.label }}行业装修方案</h2>
            <p>{{ industryDescription }}</p>
          </div>
        </div>
        <el-button type="primary" @click="goCreateWithIndustry">
          <el-icon><Plus /></el-icon>
          使用此方案创建页面
        </el-button>
      </div>

      <div class="content-panels">
        <div class="panel panel-left">
          <div class="panel-head">
            <h3>📋 推荐组件组合</h3>
          </div>
          <div class="comp-combo-list">
            <div v-for="(combo, idx) in currentCombos" :key="idx" class="combo-item">
              <div class="combo-num">{{ idx + 1 }}</div>
              <div class="combo-info">
                <strong>{{ combo.name }}</strong>
                <p>{{ combo.desc }}</p>
                <div class="combo-comps">
                  <span v-for="comp in combo.components" :key="comp">{{ comp }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel panel-right">
          <div class="panel-head">
            <h3>🎨 推荐模板</h3>
            <el-button link type="primary" @click="router.push('/shop-decoration/template-market')">模板市场 →</el-button>
          </div>
          <div v-if="industryTemplates.length > 0" class="ind-tpl-list">
            <div v-for="tpl in industryTemplates" :key="tpl.id" class="ind-tpl-item" @click="handleUseIndustryTemplate(tpl)">
              <div class="ind-tpl-cover" :style="{ background: `linear-gradient(135deg, ${tpl.colorsParsed[0]}, ${tpl.colorsParsed[1]})` }">
                <div class="mini-phone">
                  <div class="mini-top"></div>
                  <div class="mini-bars">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
              <div class="ind-tpl-info">
                <strong>{{ tpl.name }}</strong>
                <p>{{ tpl.description || '行业专属模板' }}</p>
                <span class="ind-tpl-count">{{ tpl.componentCount }} 组件</span>
              </div>
            </div>
          </div>
          <div v-else class="no-templates">
            <p>该行业暂无专属模板</p>
            <span>可在模板市场中查看更多通用模板</span>
          </div>
        </div>
      </div>

      <div class="panel mt-16">
        <div class="panel-head">
          <h3>📊 行业特性配置</h3>
        </div>
        <div class="feature-grid">
          <div v-for="feature in currentFeatures" :key="feature.title" class="feature-card">
            <div class="feature-icon">{{ feature.icon }}</div>
            <strong>{{ feature.title }}</strong>
            <p>{{ feature.desc }}</p>
            <div class="feature-status" :class="{ enabled: feature.enabled, disabled: !feature.enabled }">
              {{ feature.enabled ? '已启用' : '可选配' }}
            </div>
          </div>
        </div>
      </div>

      <div class="panel mt-16">
        <div class="panel-head">
          <h3>🔧 行业专属集成</h3>
        </div>
        <div class="integration-list">
          <div v-for="item in currentIntegrations" :key="item.title" class="integration-item">
            <div class="int-icon">{{ item.icon }}</div>
            <div class="int-body">
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
            <el-switch v-model="item.active" @change="handleIntegrationToggle(activeIndustry, item)" />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="no-industry-selected">
      <div class="no-ind-icon">🏭</div>
      <h2>请选择一个行业</h2>
      <p>选择行业后，将展示该行业的推荐装修方案、组件组合和专属模板</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getTemplatesByIndustry, createPage } from '@/api/page'
import { updateConfigs } from '@/api/system'
import { IndustryLabels, IndustryColors } from '@/types/page'

interface IndustryTemplateUI {
  id: number
  name: string
  description?: string
  colorsParsed: [string, string]
  componentCount: number
  dslContent?: string
  dsl?: any
  category?: string
}

const router = useRouter()
const route = useRoute()

const activeIndustry = ref('')
const industryTemplates = ref<IndustryTemplateUI[]>([])

const allIndustries = Object.entries(IndustryLabels).map(([code, label]) => ({
  code,
  label,
  icon: getIndustryIcon(code),
  colors: IndustryColors[code] || ['#1769ff', '#20b7ff'],
}))

const currentIndustry = computed(() => {
  return allIndustries.find(ind => ind.code === activeIndustry.value)
})

const industryDescription = computed(() => {
  const descs: Record<string, string> = {
    clothing: '专注服饰展示与穿搭引导，通过轮播Banner展示最新款式，分类导航引导用户快速找到目标品类，结合限时秒杀与优惠券促进转化，会员卡体系提升复购率。',
    food: '以商品搜索和公告栏为核心入口，结合商品分类导航和品牌介绍增强信任感，优惠券与AI导购助手提升成交转化，适合食品饮料行业的小程序商城。',
    digital: '突出限时秒杀与产品视频展示，通过分类导航和搜索组件降低用户决策成本，会员卡与AI导购助手提供个性化推荐，优惠券促进高客单价转化。',
    home: '以品牌故事和商品展示为核心，结合预约服务提供到店体验，图片组件展示产品实拍图，优惠券促进线上成交与线下引流。',
    beauty: '以品牌介绍建立信任，通过会员卡体系锁定用户，图文组合展示产品功效，限时秒杀制造紧迫感，AI导购提供个性化护肤方案推荐。',
    education: '以课程展示为核心，图文组合介绍课程详情，视频组件展示教学场景，预约服务提供试听体验，表单入口收集线索，联系方式方便咨询。',
    sports: '以品牌故事建立运动调性，限时秒杀打造爆款单品，活动列表展示赛事与挑战，视频组件呈现运动场景，优惠券刺激装备购买。',
    travel: '以Banner展示热门目的地，图文组合介绍线路详情，预约服务提供定制游咨询，活动列表展示限时优惠线路，视频展示目的地风光。',
    furniture: '以Banner展示样板间效果，品牌介绍建立品质认知，预约服务提供量房设计体验，图片组件展示产品细节，优惠券促进大额订单转化。',
    medical: '以品牌介绍建立专业形象，预约服务实现在线挂号，图文组合介绍诊疗项目，视频展示医疗环境，联系方式方便患者咨询，资质证书增强信任。',
    wedding: '以Banner展示婚礼案例，品牌介绍建立服务认知，预约服务提供免费咨询，表单入口收集新人需求，视频组件展示婚礼现场，资质证书增强可信度，联系方式方便沟通。',
    pet: '以商品搜索帮助用户快速找到宠物用品，分类导航按宠物类型分类展示，会员卡提供宠物建档服务，优惠券刺激用品囤货，AI导购提供养宠建议。',
  }
  return descs[activeIndustry.value] || '针对该行业特点，配置专属的页面组件和营销模块，快速搭建行业化商城。'
})

const industryCombos: Record<string, Array<{ name: string; desc: string; components: string[] }>> = {
  clothing: [
    { name: '新品首发组合', desc: 'Banner展示 + 分类导航 + 限时秒杀，适合新品推广场景', components: ['轮播Banner', '分类导航', '限时秒杀', '商品列表'] },
    { name: '会员专享组合', desc: '会员卡 + 专属优惠券 + 商品推荐，提升会员复购', components: ['会员卡', '优惠券', '商品列表', '品牌介绍'] },
    { name: '穿搭推荐组合', desc: '图文组合 + 商品列表 + AI导购，提供穿搭灵感', components: ['图文组合', '商品列表', 'AI导购', '视频'] },
    { name: '活动促销组合', desc: '公告栏 + 倒计时 + 优惠券 + 商品列表，大促必备', components: ['公告栏', '倒计时', '优惠券', '限时秒杀', '商品列表'] },
  ],
  food: [
    { name: '搜索驱动组合', desc: '搜索 + 分类导航 + 商品列表，高效找商品', components: ['搜索', '分类导航', '商品列表', '优惠券'] },
    { name: '品牌故事组合', desc: '品牌介绍 + 公告栏 + 商品列表 + AI导购', components: ['品牌介绍', '公告栏', '商品列表', 'AI导购'] },
    { name: '礼盒专区组合', desc: 'Banner + 分类导航 + 商品列表 + 优惠券', components: ['轮播Banner', '分类导航', '商品列表', '优惠券'] },
  ],
  digital: [
    { name: '爆品秒杀组合', desc: '限时秒杀 + 倒计时 + 商品列表 + 优惠券', components: ['限时秒杀', '倒计时', '商品列表', '优惠券'] },
    { name: '视频种草组合', desc: '视频 + 图文组合 + 商品列表 + AI导购', components: ['视频', '图文组合', '商品列表', 'AI导购'] },
    { name: '会员俱乐部组合', desc: '会员卡 + AI导购 + 商品列表 + 优惠券', components: ['会员卡', 'AI导购', '商品列表', '优惠券'] },
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
    { name: '促销转化组合', desc: '优惠券 + 商品列表 + 限时秒杀 + 联系方式', components: ['优惠券', '商品列表', '限时秒杀', '联系方式'] },
  ],
  medical: [
    { name: '科室展示组合', desc: '品牌介绍 + 图文组合 + 预约服务 + 资质证书', components: ['品牌介绍', '图文组合', '预约服务', '资质证书'] },
    { name: '在线问诊组合', desc: '预约服务 + 视频 + 联系方式 + 表单入口', components: ['预约服务', '视频', '联系方式', '表单入口'] },
  ],
  wedding: [
    { name: '案例展示组合', desc: 'Banner + 视频 + 图文组合 + 预约服务', components: ['轮播Banner', '视频', '图文组合', '预约服务'] },
    { name: '一站式服务组合', desc: '预约服务 + 表单入口 + 联系方式 + 资质证书', components: ['预约服务', '表单入口', '联系方式', '资质证书'] },
  ],
  pet: [
    { name: '宠物用品组合', desc: '搜索 + 分类导航 + 商品列表 + 优惠券', components: ['搜索', '分类导航', '商品列表', '优惠券'] },
    { name: '养宠指南组合', desc: '图文组合 + 视频 + AI导购 + 预约服务', components: ['图文组合', '视频', 'AI导购', '预约服务'] },
  ],
}

const industryFeatures: Record<string, Array<{ icon: string; title: string; desc: string; enabled: boolean }>> = {
  clothing: [
    { icon: '📏', title: '尺码助手', desc: '智能尺码推荐与试穿指南', enabled: true },
    { icon: '🔄', title: '退换无忧', desc: '7天无理由退换货展示', enabled: true },
    { icon: '⭐', title: '用户评价', desc: '商品评价与买家秀展示', enabled: true },
    { icon: '🎯', title: '搭配推荐', desc: 'AI搭配推荐与套装组合', enabled: false },
  ],
  food: [
    { icon: '📦', title: '冷链配送', desc: '冷链物流配送信息展示', enabled: true },
    { icon: '🏷️', title: '产地溯源', desc: '产地信息与溯源展示', enabled: true },
    { icon: '📋', title: '营养成分', desc: '营养成分表展示', enabled: true },
    { icon: '🔥', title: '热销排行', desc: '热销商品排行榜', enabled: false },
  ],
  digital: [
    { icon: '📊', title: '参数对比', desc: '商品参数对比功能', enabled: true },
    { icon: '🎬', title: '开箱视频', desc: '商品开箱与评测视频', enabled: true },
    { icon: '🛡️', title: '延保服务', desc: '延长保修服务入口', enabled: false },
    { icon: '💬', title: '在线客服', desc: '售前售后在线咨询', enabled: true },
  ],
}

const industryIntegrations: Record<string, Array<{ icon: string; title: string; desc: string; active: boolean }>> = {
  clothing: [
    { icon: '📸', title: '穿搭社区', desc: '用户UGC穿搭分享社区', active: false },
    { icon: '🎥', title: '直播带货', desc: '小程序直播功能集成', active: false },
    { icon: '📱', title: '尺码测量工具', desc: 'AR尺码测量小程序', active: false },
  ],
  food: [
    { icon: '🗺️', title: '门店导航', desc: '附近门店地图导航', active: false },
    { icon: '🏪', title: '到店自提', desc: '线上下单到店自提', active: false },
    { icon: '📊', title: '食安公示', desc: '食品安全信息公示', active: true },
  ],
  digital: [
    { icon: '🔄', title: '以旧换新', desc: '以旧换新服务入口', active: false },
    { icon: '📦', title: '上门回收', desc: '电子产品上门回收', active: false },
    { icon: '🔧', title: '维修预约', desc: '产品维修在线预约', active: true },
  ],
}

const currentCombos = computed(() => industryCombos[activeIndustry.value] || [
  { name: '基础展示组合', desc: 'Banner + 品牌介绍 + 商品列表，基础商城展示', components: ['轮播Banner', '品牌介绍', '商品列表'] },
  { name: '营销转化组合', desc: '限时秒杀 + 优惠券 + 商品列表，促进成交', components: ['限时秒杀', '优惠券', '商品列表'] },
  { name: '信任建立组合', desc: '品牌介绍 + 资质证书 + 联系方式 + AI导购', components: ['品牌介绍', '资质证书', '联系方式', 'AI导购'] },
])

const currentFeatures = computed(() => industryFeatures[activeIndustry.value] || [
  { icon: '📋', title: '基础展示', desc: '商品展示与分类导航', enabled: true },
  { icon: '🎯', title: '营销工具', desc: '优惠券与秒杀活动', enabled: true },
  { icon: '📞', title: '客服沟通', desc: '联系方式与在线客服', enabled: true },
  { icon: '📊', title: '数据分析', desc: '用户行为与转化分析', enabled: false },
])

const currentIntegrations = computed(() => industryIntegrations[activeIndustry.value] || [
  { icon: '🔗', title: '第三方对接', desc: '对接ERP/CRM系统', active: false },
  { icon: '📡', title: '消息推送', desc: '订单与活动消息推送', active: true },
  { icon: '🎥', title: '直播功能', desc: '小程序直播带货', active: false },
])

function getIndustryIcon(code: string): string {
  const icons: Record<string, string> = {
    clothing: '👗', food: '🍜', digital: '📱', home: '🏠',
    beauty: '💄', education: '📚', sports: '⚽', travel: '✈️',
    furniture: '🪑', medical: '🏥', wedding: '💒', pet: '🐾',
  }
  return icons[code] || '🏪'
}

async function loadIndustryTemplates() {
  if (!activeIndustry.value) return
  try {
    const res = await getTemplatesByIndustry(activeIndustry.value)
    const data = res.data as any
    const rows = Array.isArray(data) ? data : (data?.records || [])
    industryTemplates.value = rows.map((item: any) => {
      let dsl: any = undefined
      const rawDsl = item.dslContent || item.dsl_content
      if (rawDsl) {
        try { dsl = typeof rawDsl === 'string' ? JSON.parse(rawDsl) : rawDsl } catch { }
      }
      return {
        id: item.id,
        name: item.name || '未命名模板',
        description: item.description || '',
        colorsParsed: parseColors(item.colors),
        componentCount: dsl?.components?.length || 0,
        dslContent: item.dslContent || item.dsl_content,
        dsl,
        category: item.category,
      }
    })
  } catch {
    industryTemplates.value = []
  }
}

function parseColors(colorsStr?: string): [string, string] {
  if (!colorsStr) return ['#1769ff', '#20b7ff']
  const parts = colorsStr.split(',')
  return [parts[0]?.trim() || '#1769ff', parts[1]?.trim() || '#20b7ff']
}

async function handleUseIndustryTemplate(tpl: IndustryTemplateUI) {
  try {
    await ElMessageBox.confirm(
      `确认使用「${tpl.name}」模板创建页面并进入装修器？`,
      '应用模板',
      { confirmButtonText: '创建并装修', cancelButtonText: '取消', type: 'info' },
    )

    const basePathMap: Record<string, string> = {
      home: '/pages/index/index',
      activity: '/pages/activity/topic',
      shop: '/pages/shop/index',
      member: '/pages/member/index',
      content: '/pages/content/index',
      booking: '/pages/booking/index',
    }
    const PAGE_TYPE_MAP: Record<string, number> = { home: 1, activity: 2, custom: 3 }
    const defaultPath = `/pages/custom/tpl-${Date.now().toString().slice(-6)}`

    const pageTypeStr = tpl.dsl?.page?.type || 'custom'
    const payload: Record<string, unknown> = {
      name: `${tpl.name}-${Date.now().toString().slice(-4)}`,
      type: PAGE_TYPE_MAP[pageTypeStr] ?? 3,
      path: basePathMap[tpl.category || ''] || defaultPath,
      shareTitle: tpl.dsl?.page?.share_title || tpl.name,
      background_color: tpl.dsl?.page?.background_color || '#f6f8fb',
    }

    if (tpl.dslContent) {
      payload.dslContent = tpl.dslContent
    } else if (tpl.dsl) {
      payload.dsl = tpl.dsl
    }

    const res = await createPage(payload as any)
    const newPageId = (res.data as any)?.id || (res.data as any)?.pageId
    ElMessage.success('模板已应用，即将进入装修器')
    if (newPageId) {
      router.push({ name: 'PageBuilderEditor', params: { id: String(newPageId) } })
    } else {
      router.push({ name: 'PageBuilderList' })
    }
  } catch {
    // canceled
  }
}

function goCreateWithIndustry() {
  router.push({ path: '/shop-decoration/template-market', query: { industry: activeIndustry.value } })
}

async function handleIntegrationToggle(industryCode: string, item: { icon: string; title: string; desc: string; active: boolean }) {
  try {
    await updateConfigs([{
      configKey: `industry_integration_${industryCode}_${item.title}`,
      configValue: String(item.active),
      configGroup: 'industry_integration',
      description: `行业集成-${industryCode}-${item.title}`,
    }] as any)
  } catch {
    item.active = !item.active
    ElMessage.error('保存失败')
  }
}

let industryLoadTimer: ReturnType<typeof setTimeout> | null = null

watch(activeIndustry, () => {
  if (industryLoadTimer) clearTimeout(industryLoadTimer)
  industryLoadTimer = setTimeout(() => {
    loadIndustryTemplates()
  }, 300)
})

onMounted(() => {
  if (route.query.industry) {
    activeIndustry.value = route.query.industry as string
  }
})
</script>

<style lang="scss" scoped>
.industry-modules-page {
  color: #172033;
}

.ph {
  margin-bottom: 16px;
}

.pt {
  font-size: 24px;
  font-weight: 800;
}

.ps {
  margin-top: 4px;
  color: #7b8798;
  font-size: 13px;
  max-width: 640px;
}

.industry-selector-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.ind-select-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  color: #607187;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  border: 1px solid #d9e2ef;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.14s;

  &:hover {
    border-color: #a0b4d0;
  }

  &.active {
    color: #fff;
  }
}

.ind-btn-icon {
  font-size: 16px;
}

.ind-btn-label {
  font-weight: 600;
}

.industry-detail {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.ind-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  margin-bottom: 16px;
}

.ind-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ind-header-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.ind-header-info {
  h2 {
    font-size: 18px;
    font-weight: 800;
  }

  p {
    margin-top: 4px;
    color: #7b8798;
    font-size: 13px;
    max-width: 500px;
  }
}

.content-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.panel {
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  padding: 16px;
}

.mt-16 {
  margin-top: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;

  h3 {
    font-size: 15px;
    font-weight: 700;
  }
}

.comp-combo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.combo-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
  transition: 0.14s;

  &:hover {
    border-color: #bfdbfe;
    background: #f8faff;
  }
}

.combo-num {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #1769ff;
  flex-shrink: 0;
}

.combo-info {
  flex: 1;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 700;
  }

  p {
    color: #7b8798;
    font-size: 12px;
    margin-top: 4px;
  }
}

.combo-comps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;

  span {
    padding: 2px 8px;
    color: #1769ff;
    font-size: 11px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
  }
}

.ind-tpl-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ind-tpl-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.14s;

  &:hover {
    border-color: #1769ff;
    background: #f8faff;
  }
}

.ind-tpl-cover {
  width: 56px;
  height: 72px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-phone {
  width: 36px;
  height: 52px;
  background: #fff;
  border-radius: 7px;
  box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.88);
  overflow: hidden;
}

.mini-top {
  height: 6px;
  background: #111827;
}

.mini-bars {
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    height: 3px;
    background: #d9e2ef;
    border-radius: 2px;
  }
}

.ind-tpl-info {
  flex: 1;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 700;
  }

  p {
    color: #7b8798;
    font-size: 11px;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ind-tpl-count {
  display: inline-block;
  margin-top: 4px;
  color: #1769ff;
  font-size: 10px;
  font-weight: 600;
}

.no-templates {
  text-align: center;
  padding: 24px 0;
  color: #7b8798;

  p {
    font-size: 13px;
    font-weight: 600;
  }

  span {
    font-size: 12px;
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.feature-card {
  padding: 14px;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
  text-align: center;
}

.feature-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.feature-card {
  strong {
    display: block;
    font-size: 13px;
    font-weight: 700;
  }

  p {
    color: #7b8798;
    font-size: 11px;
    margin-top: 4px;
  }
}

.feature-status {
  margin-top: 8px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 99px;
  display: inline-block;

  &.enabled {
    color: #0faa6e;
    background: #ecfdf5;
  }

  &.disabled {
    color: #7b8798;
    background: #f3f4f6;
  }
}

.integration-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.integration-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.int-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.int-body {
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    font-size: 13px;
    font-weight: 600;
  }

  p {
    color: #7b8798;
    font-size: 12px;
    margin-top: 2px;
  }
}

.no-industry-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;

  .no-ind-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 20px;
    font-weight: 800;
  }

  p {
    margin-top: 8px;
    color: #7b8798;
    font-size: 14px;
    max-width: 360px;
  }
}

@media (max-width: 1200px) {
  .content-panels {
    grid-template-columns: 1fr;
  }

  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .ind-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
