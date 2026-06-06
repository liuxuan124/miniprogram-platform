<template>
  <div class="shop-decoration-dashboard">
    <section class="page-head">
      <div>
        <h1>商城装修仪表盘</h1>
        <p>可视化拖拽搭建小程序商城页面，支持多行业模板一键应用</p>
      </div>
      <div class="head-actions">
        <el-button type="primary" size="large" @click="router.push('/page-builder/list')">
          <el-icon><Plus /></el-icon>
          新建装修页面
        </el-button>
        <el-button size="large" @click="router.push('/shop-decoration/template-market')">
          <el-icon><Shop /></el-icon>
          浏览模板市场
        </el-button>
      </div>
    </section>

    <section class="stats-row">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-icon" :style="{ background: stat.bg }">{{ stat.icon }}</div>
      </div>
    </section>

    <section class="industry-section">
      <div class="section-head">
        <h2>行业装修方案</h2>
        <span class="section-desc">选择一个行业，快速获取预设的页面模板与模块组合</span>
      </div>
      <div class="industry-grid">
        <button
          v-for="industry in industries"
          :key="industry.code"
          class="industry-card"
          :style="{ '--industry-color': industry.colors[0], '--industry-color2': industry.colors[1] }"
          @click="goIndustry(industry.code)"
        >
          <div class="industry-cover" :style="{ background: `linear-gradient(135deg, ${industry.colors[0]}, ${industry.colors[1]})` }">
            <span class="industry-icon">{{ industry.icon }}</span>
          </div>
          <div class="industry-body">
            <strong>{{ industry.label }}</strong>
            <span>{{ industry.templateCount }} 套模板</span>
          </div>
        </button>
      </div>
    </section>

    <section class="content-grid">
      <div class="panel">
        <div class="panel-head">
          <h2>装修流程指引</h2>
        </div>
        <div class="flow-steps">
          <div v-for="(step, idx) in flowSteps" :key="step.title" class="flow-step">
            <div class="flow-num" :class="{ done: idx < 0 }">{{ idx + 1 }}</div>
            <div class="flow-info">
              <strong>{{ step.title }}</strong>
              <p>{{ step.desc }}</p>
            </div>
            <el-button v-if="step.action" link type="primary" @click="router.push(step.path)">{{ step.action }}</el-button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h2>快速入口</h2>
        </div>
        <div class="quick-entries">
          <button v-for="entry in quickEntries" :key="entry.title" class="quick-entry" @click="router.push(entry.path)">
            <span class="entry-icon">{{ entry.icon }}</span>
            <div class="entry-info">
              <strong>{{ entry.title }}</strong>
              <small>{{ entry.desc }}</small>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>热门推荐模板</h2>
        <el-button link type="primary" @click="router.push('/shop-decoration/template-market')">查看全部 →</el-button>
      </div>
      <div class="hot-templates">
        <div v-for="tpl in hotTemplates" :key="tpl.name" class="hot-tpl-card" @click="handleApplyTemplate(tpl)">
          <div class="hot-tpl-cover" :style="{ background: `linear-gradient(135deg, ${tpl.colors[0]}, ${tpl.colors[1]})` }">
            <div class="mini-phone">
              <div class="mini-phone-top"></div>
              <div class="mini-phone-lines">
                <span></span><span></span><span></span>
              </div>
            </div>
            <span class="hot-tpl-badge">{{ tpl.industry }}</span>
          </div>
          <div class="hot-tpl-body">
            <strong>{{ tpl.name }}</strong>
            <p>{{ tpl.desc }}</p>
            <div class="hot-tpl-tags">
              <span v-for="tag in tpl.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>装修组件库预览</h2>
        <span class="section-desc">共 26 种可拖拽组件，覆盖媒体、商品、内容、营销、布局五大类</span>
      </div>
      <div class="component-preview-grid">
        <div v-for="cat in componentCategories" :key="cat.name" class="comp-cat">
          <div class="comp-cat-header">{{ cat.icon }} {{ cat.name }}</div>
          <div class="comp-cat-items">
            <span v-for="comp in cat.items" :key="comp">{{ comp }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Shop, ArrowRight } from '@element-plus/icons-vue'
import { getPageTemplates } from '@/api/page'
import { IndustryLabels, IndustryColors } from '@/types/page'

const router = useRouter()

const stats = ref([
  { label: '装修页面数', value: '-', icon: '📄', bg: '#eff6ff' },
  { label: '可用模板', value: '-', icon: '🎨', bg: '#fef3c7' },
  { label: '行业方案', value: '12', icon: '🏭', bg: '#ecfdf5' },
  { label: '组件类型', value: '26', icon: '🧩', bg: '#fdf2f8' },
])

const flowSteps = [
  { title: '选择行业模板', desc: '从模板市场挑选适合行业的预设模板', action: '去选择', path: '/shop-decoration/template-market' },
  { title: '拖拽装修页面', desc: '可视化添加、删除、排序、配置组件', action: '去装修', path: '/page-builder/list' },
  { title: '实时预览效果', desc: '手机模拟预览，支持真实/演示数据切换', action: '', path: '' },
  { title: '发布上线', desc: '一键发布到小程序，支持版本管理和回滚', action: '', path: '' },
]

const quickEntries = [
  { title: '页面列表', desc: '管理所有装修页面', icon: '📄', path: '/page-builder/list' },
  { title: '模板市场', desc: '浏览行业模板', icon: '🎨', path: '/shop-decoration/template-market' },
  { title: '行业模块', desc: '按行业配置模块', icon: '🏭', path: '/shop-decoration/industry-modules' },
  { title: '小程序搭建', desc: '导航与TabBar', icon: '📱', path: '/page-builder/miniapp' },
  { title: '素材库', desc: '管理图片素材', icon: '🖼️', path: '/asset/list' },
  { title: '商品管理', desc: '管理商品数据', icon: '🛍️', path: '/commerce/product' },
]

const hotTemplates = ref<any[]>([])

const componentCategories = [
  { name: '媒体组件', icon: '🖼️', items: ['轮播图', '图片', '视频', '标题栏'] },
  { name: '商品组件', icon: '🛒', items: ['搜索', '分类导航', '商品列表', '限时秒杀', '优惠券'] },
  { name: '内容组件', icon: '📝', items: ['文章列表', '富文本', '品牌介绍', '资质证书', '图文组合'] },
  { name: '营销组件', icon: '📢', items: ['公告栏', '活动入口', '活动列表', '预约服务', '会员卡', '倒计时', '悬浮按钮', '表单入口', 'AI入口', '联系方式'] },
  { name: '布局组件', icon: '📐', items: ['宫格导航', '分割线', '间距'] },
]

const industries = Object.entries(IndustryLabels).map(([code, label]) => ({
  code,
  label,
  icon: getIndustryIcon(code),
  colors: IndustryColors[code] || ['#1769ff', '#20b7ff'],
  templateCount: '-',
}))

function getIndustryIcon(code: string): string {
  const icons: Record<string, string> = {
    clothing: '👗', food: '🍜', digital: '📱', home: '🏠',
    beauty: '💄', education: '📚', sports: '⚽', travel: '✈️',
    furniture: '🪑', medical: '🏥', wedding: '💒', pet: '🐾',
  }
  return icons[code] || '🏪'
}

function goIndustry(code: string) {
  router.push({ path: '/shop-decoration/industry-modules', query: { industry: code } })
}

async function loadStats() {
  try {
    const res = await getPageTemplates({ current: 1, size: 100 })
    const data = res.data as any
    const rows = data?.records || data || []
    const count = Array.isArray(rows) ? rows.length : 0
    stats.value[1].value = String(count)

    const tplList = Array.isArray(rows) ? rows : []
    const topTemplates = tplList.slice(0, 4).map((item: any) => ({
      name: item.name || '未命名模板',
      desc: item.description || item.category || '行业专属模板',
      industry: IndustryLabels[item.industryCode || item.industry_code] || item.category || '通用',
      tags: parseTags(item.tags),
      colors: parseColors(item.colors),
    }))
    hotTemplates.value = topTemplates.length > 0 ? topTemplates : [
      { name: '服装鞋包首页', desc: '轮播+分类+秒杀+会员卡', industry: '服装鞋包', tags: ['轮播', '秒杀', '优惠券'], colors: ['#e11d48', '#ec4899'] },
      { name: '食品饮料首页', desc: '搜索+公告+商品+品牌+优惠券', industry: '食品饮料', tags: ['搜索', '品牌', '优惠券'], colors: ['#f97316', '#fbbf24'] },
      { name: '数码家电首页', desc: '分类+秒杀+视频+会员+AI', industry: '数码家电', tags: ['秒杀', '视频', 'AI'], colors: ['#2563eb', '#06b6d4'] },
      { name: '美妆护肤首页', desc: '品牌+秒杀+会员卡+图文', industry: '美妆护肤', tags: ['品牌', '会员卡', '秒杀'], colors: ['#d946ef', '#f472b6'] },
    ]
  } catch {
    // fallback values remain
  }
}

function parseTags(tagsStr?: string): string[] {
  if (!tagsStr) return ['通用']
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean)
}

function parseColors(colorsStr?: string): [string, string] {
  if (!colorsStr) return ['#1769ff', '#20b7ff']
  const parts = colorsStr.split(',')
  return [parts[0]?.trim() || '#1769ff', parts[1]?.trim() || '#20b7ff']
}

function handleApplyTemplate(tpl: any) {
  ElMessage.info(`即将使用「${tpl.name}」模板，请前往模板市场操作`)
  router.push('/shop-decoration/template-market')
}

onMounted(() => {
  loadStats()
})
</script>

<style lang="scss" scoped>
.shop-decoration-dashboard {
  color: #172033;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;

  h1 {
    font-size: 24px;
    font-weight: 800;
  }

  p {
    margin-top: 4px;
    color: #7b8798;
    font-size: 13px;
  }
}

.head-actions {
  display: flex;
  gap: 8px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  position: relative;
  padding: 18px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
}

.stat-label {
  margin-top: 4px;
  color: #7b8798;
  font-size: 12px;
}

.stat-icon {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 18px;
}

.industry-section {
  margin-bottom: 20px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  h2 {
    font-size: 16px;
    font-weight: 700;
  }
}

.section-desc {
  color: #7b8798;
  font-size: 12px;
}

.industry-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.industry-card {
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: 0.16s;
  text-align: left;
  padding: 0;

  &:hover {
    border-color: var(--industry-color);
    box-shadow: 0 6px 20px rgba(23, 105, 255, 0.12);
    transform: translateY(-2px);
  }
}

.industry-cover {
  height: 64px;
  display: grid;
  place-items: center;
}

.industry-icon {
  font-size: 28px;
}

.industry-body {
  padding: 10px 12px;

  strong {
    display: block;
    font-size: 13px;
    font-weight: 700;
  }

  span {
    display: block;
    margin-top: 2px;
    color: #7b8798;
    font-size: 11px;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.panel {
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;

  h2 {
    font-size: 15px;
    font-weight: 700;
  }
}

.flow-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e3e8f0;
  border-radius: 10px;
}

.flow-num {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  background: #f0f4ff;
  color: #1769ff;
  flex-shrink: 0;

  &.done {
    background: #0faa6e;
    color: #fff;
  }
}

.flow-info {
  flex: 1;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 700;
  }

  p {
    color: #7b8798;
    font-size: 12px;
    margin-top: 2px;
  }
}

.quick-entries {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: 0.14s;
  text-align: left;

  &:hover {
    border-color: #1769ff;
    background: #f8faff;
  }
}

.entry-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.entry-info {
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    font-size: 13px;
    font-weight: 600;
  }

  small {
    display: block;
    color: #7b8798;
    font-size: 11px;
    margin-top: 2px;
  }
}

.hot-templates {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.hot-tpl-card {
  border: 1px solid #e3e8f0;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: 0.16s;

  &:hover {
    border-color: #1769ff;
    box-shadow: 0 6px 20px rgba(23, 105, 255, 0.1);
    transform: translateY(-2px);
  }
}

.hot-tpl-cover {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.mini-phone {
  width: 56px;
  height: 74px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.88);
  overflow: hidden;
}

.mini-phone-top {
  height: 8px;
  background: #111827;
}

.mini-phone-lines {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;

  span {
    height: 4px;
    background: #d9e2ef;
    border-radius: 3px;
  }
}

.hot-tpl-badge {
  position: absolute;
  right: 8px;
  top: 8px;
  padding: 2px 8px;
  color: #fff;
  font-size: 10px;
  background: rgba(15, 23, 42, 0.35);
  border-radius: 99px;
}

.hot-tpl-body {
  padding: 10px;

  strong {
    font-size: 13px;
    font-weight: 700;
  }

  p {
    color: #7b8798;
    font-size: 11px;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.hot-tpl-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;

  span {
    padding: 1px 6px;
    color: #607187;
    font-size: 10px;
    background: #f8faff;
    border: 1px solid #d9e2ef;
    border-radius: 99px;
  }
}

.component-preview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.comp-cat {
  padding: 12px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
}

.comp-cat-header {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.comp-cat-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  span {
    padding: 2px 8px;
    font-size: 11px;
    color: #607187;
    background: #f8faff;
    border: 1px solid #d9e2ef;
    border-radius: 4px;
  }
}

@media (max-width: 1400px) {
  .industry-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .hot-templates {
    grid-template-columns: repeat(2, 1fr);
  }

  .component-preview-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .industry-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .component-preview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
