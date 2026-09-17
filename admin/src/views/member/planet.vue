<template>
  <div class="planet-page" v-loading="loading">
    <div class="page-head">
      <div>
        <h2>知识星球</h2>
        <p>配置星球展示、未付费可见范围；会员等级与付费套餐均可在后台维护。</p>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存星球配置</el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
      title="星主发帖：内容管理 → 新建「动态」并勾选「星球专属」。用户购买套餐后写入对应会员等级，可看全文并下载资料。"
    />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="星球展示" name="planet">
        <el-form label-width="120px" class="planet-form">
          <el-form-item label="模块开关">
            <el-switch v-model="moduleEnabled" active-text="已开启" inactive-text="已关闭" @change="onToggleModule" />
            <span class="hint">关闭后小程序星球入口不可用</span>
          </el-form-item>
          <el-form-item label="星球名称">
            <el-input v-model="form.title" maxlength="40" show-word-limit placeholder="星球名称，如：创作者星球" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="form.subtitle" maxlength="80" show-word-limit placeholder="星主精选动态与资料" />
          </el-form-item>
          <el-form-item label="入口文案">
            <el-input v-model="form.entryLabel" maxlength="12" placeholder="星球" style="width: 200px" />
          </el-form-item>
          <el-form-item label="封面图 URL">
            <el-input v-model="form.coverImage" placeholder="可选" />
          </el-form-item>
          <el-form-item label="未付费可见">
            <el-radio-group v-model="form.unpaidViewMode">
              <el-radio-button value="hidden">完全隐藏</el-radio-button>
              <el-radio-button value="title">仅标题</el-radio-button>
              <el-radio-button value="summary">标题+摘要</el-radio-button>
              <el-radio-button value="preview_n">前 N 条可读</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="form.unpaidViewMode === 'preview_n'" label="可读条数 N">
            <el-input-number v-model="form.previewCount" :min="0" :max="50" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="会员等级" name="levels">
        <div class="toolbar">
          <span class="toolbar-desc">付费套餐开通后写入的等级在此维护（名称、积分门槛、折扣、权益）。</span>
          <el-button type="primary" @click="$router.push('/member/level')">管理会员等级</el-button>
        </div>
        <el-table :data="levels" empty-text="暂无等级，请先新增">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column label="积分门槛" width="110">
            <template #default="{ row }">{{ row.minPoints ?? row.min_points ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="折扣" width="90">
            <template #default="{ row }">
              {{ formatDiscount(row.discountRate ?? row.discount_rate) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'" size="small">
                {{ Number(row.status) === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="动态运营" name="ops">
        <el-form label-width="120px">
          <el-form-item label="成员数 KPI">
            <el-input v-model="opsForm.kpiMembers" placeholder="3241" style="width: 200px" />
          </el-form-item>
          <el-form-item label="沉淀内容 KPI">
            <el-input v-model="opsForm.kpiPosts" placeholder="128" style="width: 200px" />
          </el-form-item>
          <el-form-item label="今日提问 KPI">
            <el-input v-model="opsForm.kpiQuestions" placeholder="27" style="width: 200px" />
          </el-form-item>
          <el-form-item label="打卡入口">
            <el-switch v-model="opsForm.checkInEnabled" active-text="展示" inactive-text="隐藏" />
          </el-form-item>
          <el-form-item label="精华标记">
            <el-button type="primary" link @click="$router.push('/content/article?essence=1')">
              在内容管理中标记星球精华
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="话题预测" name="topics">
        <p class="hint" style="margin-bottom: 12px">发布到小程序星球页「本周话题预测」模块（与装修组件 planet_topics 一致）。</p>
        <el-form label-width="100px">
          <el-form-item label="模块标题">
            <el-input v-model="topicsForm.title" maxlength="40" />
          </el-form-item>
          <el-form-item label="说明文案">
            <el-input v-model="topicsForm.note" type="textarea" :rows="3" />
          </el-form-item>
          <div v-for="(item, i) in topicsForm.items" :key="i" class="topic-row">
            <el-input v-model="item.name" placeholder="话题名" style="width: 160px" />
            <el-input-number v-model="item.width" :min="10" :max="100" placeholder="条宽%" />
            <el-input v-model="item.pct" placeholder="趋势如 ↑ 12%" style="width: 100px" />
            <el-button text type="danger" @click="topicsForm.items.splice(i, 1)">删</el-button>
          </div>
          <el-button type="primary" link @click="topicsForm.items.push({ name: '', width: 50, pct: '↑ 0%' })">+ 添加话题</el-button>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="付费套餐" name="packages">
        <div class="toolbar">
          <span class="toolbar-desc">套餐=商品类型「会员」；可配价格、天数（0=终身）、开通等级。</span>
          <div>
            <el-button @click="load">刷新</el-button>
            <el-button type="primary" @click="goCreatePackage">新建会员套餐</el-button>
          </div>
        </div>
        <el-table :data="packages" empty-text="暂无上架套餐">
          <el-table-column prop="name" label="套餐名" min-width="160" />
          <el-table-column prop="price" label="价格" width="100" />
          <el-table-column label="有效期" width="120">
            <template #default="{ row }">
              {{ row.membershipDays === 0 || row.membershipDays == null ? '终身' : row.membershipDays + ' 天' }}
            </template>
          </el-table-column>
          <el-table-column prop="membershipLevelName" label="开通等级" width="120" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button link type="primary" @click="$router.push(`/product/edit/${row.productId}`)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { get, put } from '@/api/request'
import { getMemberLevelList } from '@/api/member'
import { useFeatureModulesStore } from '@/stores/feature-modules'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const activeTab = ref('planet')
const moduleEnabled = ref(false)
const packages = ref<any[]>([])
const levels = ref<any[]>([])
const form = reactive({
  title: '星球',
  subtitle: '星主精选动态与资料',
  coverImage: '',
  unpaidViewMode: 'summary',
  previewCount: 3,
  entryLabel: '星球',
})

const topicsForm = reactive({
  title: '本周星球话题预测',
  note: '',
  items: [] as Array<{ name: string; width: number; pct: string }>,
})

const opsForm = reactive({
  kpiMembers: '3241',
  kpiPosts: '128',
  kpiQuestions: '27',
  checkInEnabled: true,
})

const featureModules = useFeatureModulesStore()

function formatDiscount(rate: unknown) {
  const n = Number(rate)
  if (!Number.isFinite(n) || n <= 0) return '-'
  return `${(n * 10).toFixed(1)}折`
}

async function loadLevels() {
  try {
    const res = await getMemberLevelList()
    const data = (res as any)?.data ?? res
    levels.value = Array.isArray(data) ? data : []
  } catch {
    levels.value = []
  }
}

async function load() {
  loading.value = true
  try {
    await featureModules.load()
    moduleEnabled.value = featureModules.isEnabled('planet')
    const res = await get<any>('/api/v1/admin/planet/config')
    const data = (res as any)?.data ?? res
    if (data) {
      form.title = data.title || form.title
      form.subtitle = data.subtitle || ''
      form.coverImage = data.coverImage || ''
      form.unpaidViewMode = data.unpaidViewMode || 'summary'
      form.previewCount = data.previewCount ?? 3
      form.entryLabel = data.entryLabel || '星球'
      const topics = data.topics as any
      if (topics && typeof topics === 'object') {
        topicsForm.title = topics.title || topicsForm.title
        topicsForm.note = topics.note || ''
        topicsForm.items = Array.isArray(topics.items) ? topics.items.map((t: any) => ({
          name: t.name || '',
          width: Number(t.width ?? 50),
          pct: t.pct || '',
        })) : []
      }
      packages.value = data.packages || []
      if (typeof data.enabled === 'boolean') moduleEnabled.value = data.enabled
      const ops = data.ops as any
      if (ops && typeof ops === 'object') {
        opsForm.kpiMembers = ops.kpiMembers || opsForm.kpiMembers
        opsForm.kpiPosts = ops.kpiPosts || opsForm.kpiPosts
        opsForm.kpiQuestions = ops.kpiQuestions || opsForm.kpiQuestions
        opsForm.checkInEnabled = ops.checkInEnabled !== false
      }
    }
    await loadLevels()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await put('/api/v1/admin/planet/config', { ...form, topics: { ...topicsForm }, ops: { ...opsForm } })
    ElMessage.success('已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onToggleModule(val: boolean) {
  try {
    await featureModules.setEnabled('planet', val)
    ElMessage.success(val ? '星球模块已开启' : '星球模块已关闭')
  } catch (e: any) {
    moduleEnabled.value = !val
    ElMessage.error(e?.message || '切换失败')
  }
}

function goCreatePackage() {
  router.push({ path: '/product/edit', query: { type: 'membership' } })
}

onMounted(load)
</script>

<style scoped>
.planet-page { padding: 8px 4px 24px; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.page-head h2 { margin: 0 0 6px; font-size: 20px; }
.page-head p { margin: 0; color: #909399; font-size: 13px; max-width: 560px; }
.hint { margin-left: 12px; color: #909399; font-size: 12px; }
.planet-form { max-width: 720px; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar-desc { color: #909399; font-size: 13px; }
.topic-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
</style>
