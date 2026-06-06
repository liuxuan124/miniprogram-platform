<template>
  <div class="enterprise-setting-page" v-loading="loading">
    <!-- ========== 页面头部（大厂标准） ========== -->
    <header class="page-header">
      <div class="header-left">
        <h1 class="page-title">系统设置</h1>
        <p class="page-subtitle">配置小程序基础信息、支付参数、功能模块及通知模板</p>
      </div>
      <div class="header-right">
        <el-button @click="fetchConfig">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="primary" :loading="savingAll" @click="handleSaveAll">
          {{ savingAll ? '保存中...' : '保存全部' }}
        </el-button>
      </div>
    </header>

    <!-- ========== 主内容区：Tab标签式布局（参考阿里云/腾讯云） ========== -->
    <main class="main-content">
      <el-tabs v-model="activeTab" type="border-card" class="setting-tabs">

        <!-- ==================== Tab 1: 基础配置 ==================== -->
        <el-tab-pane label="基础配置" name="basic">
          <div class="tab-content">

            <!-- 小程序信息卡片 -->
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">小程序基本信息</h3>
                <span class="section-desc">用于小程序展示、分享及身份验证</span>
              </div>

              <el-form ref="miniFormRef" :model="miniProgramForm" :rules="miniRules" label-width="120px" label-position="left" class="compact-form">
                <div class="form-grid-2col">
                  <el-form-item label="小程序名称" prop="appName">
                    <el-input v-model="miniProgramForm.appName" placeholder="请输入小程序名称" clearable />
                  </el-form-item>

                  <el-form-item label="原始ID">
                    <el-input v-model="miniProgramForm.originalId" placeholder="gh_xxxxxxxxxxxx" clearable />
                  </el-form-item>
                </div>

                <div class="form-grid-2col">
                  <el-form-item label="AppID" prop="appId">
                    <el-input v-model="miniProgramForm.appId" placeholder="wx1234567890abcdef" clearable />
                  </el-form-item>

                  <el-form-item label="AppSecret" prop="appSecret">
                    <el-input v-model="miniProgramForm.appSecret" type="password" show-password placeholder="请输入AppSecret" />
                  </el-form-item>
                </div>

                <el-form-item label="Logo图片">
                  <div class="logo-uploader">
                    <el-input v-model="miniProgramForm.logoUrl" placeholder="Logo URL或点击上传" clearable class="logo-input" />
                    <div class="upload-btns">
                      <el-upload :show-file-list="false" :before-upload="beforeImageUpload" :http-request="handleLogoUpload" accept="image/*">
                        <el-button>上传</el-button>
                      </el-upload>
                      <el-button @click="handlePickAsset">素材库</el-button>
                    </div>
                  </div>
                </el-form-item>

                <el-form-item label="分享引导语">
                  <el-input v-model="miniProgramForm.shareGuide" placeholder="用户分享时显示的文案" maxlength="50" show-word-limit />
                </el-form-item>
              </el-form>
            </div>

            <!-- 微信支付配置卡片 -->
            <div class="config-section section-spacing">
              <div class="section-header">
                <h3 class="section-title">微信支付配置</h3>
                <span class="section-desc">支持沙盒测试与生产环境切换</span>
                <el-switch v-model="paymentForm.enablePayment" active-text="已启用" inactive-text="未启用" class="enable-switch" />
              </div>

              <el-form v-if="paymentForm.enablePayment" ref="payFormRef" :model="paymentForm" :rules="paymentRules" label-width="110px" label-position="left" class="compact-form">
                <div class="env-toggle">
                  <span class="toggle-label">运行环境</span>
                  <el-radio-group v-model="paymentForm.payEnv" size="small">
                    <el-radio-button value="sandbox">沙盒环境</el-radio-button>
                    <el-radio-button value="production">生产环境</el-radio-button>
                  </el-radio-group>
                  <el-tag :type="paymentForm.payEnv === 'production' ? 'danger' : 'warning'" size="small" effect="light">
                    {{ paymentForm.payEnv === 'production' ? '正式收款' : '仅测试' }}
                  </el-tag>
                </div>

                <div class="form-grid-3col">
                  <el-form-item label="商户号" prop="mchId">
                    <el-input v-model="paymentForm.mchId" placeholder="微信支付商户号" clearable />
                  </el-form-item>

                  <el-form-item label="APIv3密钥">
                    <el-input v-model="paymentForm.apiV3Key" type="password" show-password placeholder="32位字符串" />
                  </el-form-item>

                  <el-form-item label="证书序列号">
                    <el-input v-model="paymentForm.certSerialNo" placeholder="7E**************" clearable />
                  </el-form-item>
                </div>

                <div class="form-grid-2col">
                  <el-form-item label="支付回调地址">
                    <el-input v-model="paymentForm.paymentNotifyUrl" placeholder="https://api.example.com/pay/notify" clearable />
                  </el-form-item>

                  <el-form-item label="退款回调地址">
                    <el-input v-model="paymentForm.refundNotifyUrl" placeholder="https://api.example.com/refund/notify" clearable />
                  </el-form-item>
                </div>

                <el-form-item label="API证书">
                  <div class="cert-upload-row">
                    <el-upload :show-file-list="false" :before-upload="beforeCertUpload" :http-request="handleCertUpload" accept=".p12,.pem">
                      <el-button icon="Upload" size="small">上传证书文件</el-button>
                    </el-upload>
                    <span class="upload-hint">支持 .p12 / .pem 格式</span>
                    <el-tag v-if="paymentForm.certUploaded" type="success" size="small" effect="light">
                      <el-icon><CircleCheck /></el-icon> 已上传
                    </el-tag>
                  </div>
                </el-form-item>

                <div class="action-bar">
                  <el-button icon="MagicStick" size="small" @click="handleTestPay">测试支付</el-button>
                  <el-button type="primary" size="small" :loading="paySaving" :class="{ 'btn-saved': paySaved }" @click="handleSavePayment">
                    {{ paySaved ? '✓ 已保存' : '保存支付配置' }}
                  </el-button>
                </div>
              </el-form>
            </div>

          </div>
        </el-tab-pane>

        <!-- ==================== Tab 2: 功能模块 ==================== -->
        <el-tab-pane label="功能模块" name="modules">
          <div class="tab-content">

            <!-- 模块分组：按业务场景分类 -->
            <div class="module-groups">

              <!-- 分组1: 核心交易模块 -->
              <div class="module-group">
                <div class="group-header">
                  <h4 class="group-title">
                    <el-icon><ShoppingCart /></el-icon>
                    核心交易模块
                  </h4>
                  <span class="group-desc">商品售卖与订单管理相关</span>
                </div>
                <div class="module-cards">
                  <div v-for="plugin in coreModules" :key="plugin.key" class="module-card" :class="{ disabled: !plugin.enabled }">
                    <div class="card-left">
                      <div class="card-icon">{{ plugin.icon }}</div>
                      <div class="card-info">
                        <div class="card-name">{{ plugin.name }}</div>
                        <div class="card-desc">{{ plugin.desc }}</div>
                      </div>
                    </div>
                    <el-switch v-model="plugin.enabled" inline-prompt active-text="开" inactive-text="关" @change="(val) => onModuleToggle(plugin, val)" />
                  </div>
                </div>
              </div>

              <!-- 分组2: 内容与互动模块 -->
              <div class="module-group">
                <div class="group-header">
                  <h4 class="group-title">
                    <el-icon><Document /></el-icon>
                    内容与互动模块
                  </h4>
                  <span class="group-desc">内容发布、活动运营及用户互动</span>
                </div>
                <div class="module-cards">
                  <div v-for="plugin in contentModules" :key="plugin.key" class="module-card" :class="{ disabled: !plugin.enabled }">
                    <div class="card-left">
                      <div class="card-icon">{{ plugin.icon }}</div>
                      <div class="card-info">
                        <div class="card-name">{{ plugin.name }}</div>
                        <div class="card-desc">{{ plugin.desc }}</div>
                      </div>
                    </div>
                    <el-switch v-model="plugin.enabled" inline-prompt active-text="开" inactive-text="关" @change="(val) => onModuleToggle(plugin, val)" />
                  </div>
                </div>
              </div>

              <!-- 分组3: 营销与增长模块 -->
              <div class="module-group">
                <div class="group-header">
                  <h4 class="group-title">
                    <el-icon><Promotion /></el-icon>
                    营销与增长模块
                  </h4>
                  <span class="group-desc">优惠券、会员体系及智能推荐</span>
                </div>
                <div class="module-cards">
                  <div v-for="plugin in marketingModules" :key="plugin.key" class="module-card" :class="{ disabled: !plugin.enabled }">
                    <div class="card-left">
                      <div class="card-icon">{{ plugin.icon }}</div>
                      <div class="card-info">
                        <div class="card-name">{{ plugin.name }}</div>
                        <div class="card-desc">{{ plugin.desc }}</div>
                      </div>
                    </div>
                    <el-switch v-model="plugin.enabled" inline-prompt active-text="开" inactive-text="关" @change="(val) => onModuleToggle(plugin, val)" />
                  </div>
                </div>
              </div>

            </div>

            <div class="action-bar action-bar-center">
              <el-button type="primary" :loading="pluginSaving" :class="{ 'btn-saved': pluginSaved }" @click="handleSavePlugins">
                {{ pluginSaved ? '✓ 已保存模块配置' : '保存模块设置' }}
              </el-button>
            </div>

          </div>
        </el-tab-pane>

        <!-- ==================== Tab 3: 物流配送 ==================== -->
        <el-tab-pane label="物流配送" name="logistics">
          <div class="tab-content">

            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">物流平台授权</h3>
                <span class="section-desc">对接第三方物流服务，实现自动查询与发货</span>
              </div>

              <el-form :model="logisticsForm" label-width="100px" label-position="left" class="compact-form">
                <div class="form-grid-2col">
                  <el-form-item label="物流平台">
                    <el-select v-model="logisticsForm.platform" placeholder="选择物流服务商">
                      <el-option label="顺丰速运 SDK" value="sf" />
                      <el-option label="菜鸟裹裹 API" value="cainiao" />
                      <el-option label="快递100" value="kuaidi100" />
                      <el-option label="京东物流" value="jd" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="AppKey">
                    <el-input v-model="logisticsForm.appKey" type="password" show-password placeholder="物流平台密钥" />
                  </el-form-item>
                </div>

                <el-form-item label="默认仓库地址">
                  <el-input v-model="logisticsForm.defaultAddress" type="textarea" :rows="2" placeholder="默认发货仓库的详细地址" />
                </el-form-item>
              </el-form>
            </div>

            <!-- 运费模板列表 -->
            <div class="config-section section-spacing">
              <div class="section-header">
                <h3 class="section-title">运费模板管理</h3>
                <el-button type="primary" plain size="small" icon="Plus">新建模板</el-button>
              </div>

              <el-table :data="freightTemplates" border stripe class="data-table">
                <el-table-column prop="name" label="模板名称" min-width="180" />
                <el-table-column prop="type" label="类型" width="120" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.type === 'default' ? '' : (row.type === 'free' ? 'success' : 'warning')" size="small">
                      {{ row.type === 'default' ? '默认' : (row.type === 'free' ? '包邮' : '按重') }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small" effect="plain">
                      {{ row.status === 'active' ? '使用中' : '已停用' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="160" align="center">
                  <template #default>
                    <el-button link type="primary" size="small">编辑</el-button>
                    <el-button link type="danger" size="small">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="action-bar">
              <el-button type="primary" :loading="logisticsSaving" :class="{ 'btn-saved': logisticsSaved }" @click="handleSaveLogistics">
                {{ logisticsSaved ? '✓ 已保存' : '保存物流配置' }}
              </el-button>
            </div>

          </div>
        </el-tab-pane>

        <!-- ==================== Tab 4: 权限角色 ==================== -->
        <el-tab-pane label="权限角色" name="roles">
          <div class="tab-content">

            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">角色权限矩阵</h3>
                <span class="section-desc">定义不同角色的功能访问范围</span>
                <el-button type="primary" plain size="small" icon="Plus" @click="handleAddRole">新建角色</el-button>
              </div>

              <div class="role-matrix">
                <div v-for="role in roleList" :key="role.name" class="role-card-enterprise">
                  <div class="role-main">
                    <div class="role-avatar">{{ role.icon }}</div>
                    <div class="role-detail">
                      <div class="role-meta">
                        <strong class="role-name">{{ role.name }}</strong>
                        <el-tag v-if="role.tag" type="danger" size="small" effect="dark" round>{{ role.tag }}</el-tag>
                      </div>
                      <p class="role-desc">{{ role.desc }}</p>
                    </div>
                  </div>
                  <div class="role-perms">
                    <el-tag v-for="perm in role.permissions" :key="perm" size="small" effect="plain" round>{{ perm }}</el-tag>
                  </div>
                  <div class="role-actions">
                    <el-button link type="primary" size="small">编辑权限</el-button>
                    <el-button link type="danger" size="small">删除角色</el-button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </el-tab-pane>

        <!-- ==================== Tab 5: 订阅消息 ==================== -->
        <el-tab-pane label="订阅消息" name="notifications">
          <div class="tab-content">

            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">消息模板配置</h3>
                <span class="section-desc">配置微信服务通知模板ID，用于关键节点提醒</span>
                <div class="header-actions">
                  <el-button size="small" icon="Document" @click="handleGetTemplateId">获取模板ID</el-button>
                  <el-button type="primary" size="small" :loading="notificationSaving" :class="{ 'btn-saved': notificationSaved }" @click="handleSaveNotifications">
                    {{ notificationSaved ? '✓ 已保存' : '保存通知配置' }}
                  </el-button>
                </div>
              </div>

              <el-table :data="notificationList" border stripe class="data-table">
                <el-table-column label="通知场景" min-width="200">
                  <template #default="{ row }">
                    <div class="scene-cell">
                      <span class="scene-icon">{{ row.scene.split(' ')[0] }}</span>
                      <span class="scene-text">{{ row.scene.split(' ').slice(1).join(' ') }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="微信模板ID" min-width="220">
                  <template #default="{ row }">
                    <el-input v-model="row.templateId" placeholder="请输入模板ID" size="small" clearable />
                  </template>
                </el-table-column>
                <el-table-column prop="trigger" label="触发时机" min-width="180" />
                <el-table-column label="状态" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.templateId ? 'success' : 'info'" size="small" effect="dark" round>
                      {{ row.templateId ? '已配置' : '待配置' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" align="center">
                  <template #default="{ row }">
                    <el-button link type="primary" size="small" :disabled="!row.templateId" @click="handleTestNotification(row)">测试发送</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

          </div>
        </el-tab-pane>

      </el-tabs>
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { Refresh, CircleCheck, ShoppingCart, Document, Promotion } from '@element-plus/icons-vue'
import { getConfigByGroup, updateConfigs, uploadFile, getConfigByGroupSilent } from '@/api/system'
import type { ConfigItem } from '@/types/system'

const loading = ref(false)
const savingAll = ref(false)
const miniSaving = ref(false)
const paySaving = ref(false)
const paySaved = ref(false)
const pluginSaving = ref(false)
const pluginSaved = ref(false)
const logisticsSaving = ref(false)
const logisticsSaved = ref(false)
const notificationSaving = ref(false)
const notificationSaved = ref(false)
const allSaved = ref(false)
const miniSaved = ref(false)
const miniProgramSavedSnapshot = ref('')
const miniProgramSavedAt = ref('')
const miniFormRef = ref<FormInstance>()
const payFormRef = ref<FormInstance>()

// 当前激活的Tab
const activeTab = ref('basic')

// ==================== 表单数据接口 ====================

interface MiniProgramForm {
  appName: string
  appId: string
  appSecret: string
  originalId: string
  logoUrl: string
  shareGuide: string
}

interface PaymentForm {
  enablePayment: boolean
  payEnv: 'sandbox' | 'production'
  mchId: string
  apiV3Key: string
  certSerialNo: string
  certUploaded: boolean
  paymentNotifyUrl: string
  refundNotifyUrl: string
}

interface LogisticsForm {
  platform: string
  appKey: string
  defaultAddress: string
}

interface PluginModule {
  key: string
  name: string
  desc: string
  icon: string
  enabled: boolean
}

interface NotificationItem {
  scene: string
  templateId: string
  trigger: string
}

interface RoleItem {
  icon: string
  name: string
  desc: string
  tag?: string
  permissions: string[]
}

interface FreightTemplate {
  name: string
  type: 'default' | 'free' | 'weight'
  status: 'active' | 'inactive'
}

// ==================== 响应式数据 ====================

const miniProgramForm = reactive<MiniProgramForm>({
  appName: '品牌小程序',
  appId: '',
  appSecret: '',
  originalId: '',
  logoUrl: '',
  shareGuide: '欢迎体验我们的品牌小程序',
})

const paymentForm = reactive<PaymentForm>({
  enablePayment: false,
  payEnv: 'sandbox',
  mchId: '',
  apiV3Key: '',
  certSerialNo: '',
  certUploaded: false,
  paymentNotifyUrl: 'https://api.example.com/pay/notify',
  refundNotifyUrl: 'https://api.example.com/refund/notify',
})

const logisticsForm = reactive<LogisticsForm>({
  platform: 'sf',
  appKey: '',
  defaultAddress: '广东省深圳市南山区高新园区',
})

// 模块分组数据
const allPlugins = reactive<PluginModule[]>([
  { key: 'product', name: '商品模块', desc: '商品管理、订单处理、在线支付', icon: '🛍️', enabled: true },
  { key: 'member', name: '会员模块', desc: '等级体系、积分权益、会员卡', icon: '👥', enabled: true },
  { key: 'order', name: '订单模块', desc: '订单全流程管理与售后', icon: '📦', enabled: true },
])

const contentModules = reactive<PluginModule[]>([
  { key: 'content', name: '内容模块', desc: '文章发布、图文编辑、视频管理', icon: '📝', enabled: true },
  { key: 'activity', name: '活动模块', desc: '沙龙课程、展会报名、签到核销', icon: '🎉', enabled: true },
  { key: 'form', name: '表单模块', desc: '报名登记、咨询问卷、数据收集', icon: '📋', enabled: true },
  { key: 'appointment', name: '预约模块', desc: '服务预约、时间管理、到店核销', icon: '📅', enabled: true },
])

const marketingModules = reactive<PluginModule[]>([
  { key: 'coupon', name: '营销模块', desc: '优惠券发放、满减活动、兑换码', icon: '🎟️', enabled: true },
  { key: 'agent', name: '智能Agent', desc: 'AI推荐引擎、智能对话、数据分析', icon: '🤖', enabled: true },
])

// 合并所有模块用于保存
const pluginModules = computed(() => [...allPlugins, ...contentModules, ...marketingModules])

// 核心交易模块
const coreModules = allPlugins

// 运费模板数据
const freightTemplates = ref<FreightTemplate[]>([
  { name: '全国包邮模板', type: 'default', status: 'active' },
  { name: '数字商品免运费', type: 'free', status: 'active' },
  { name: '偏远地区加价', type: 'weight', status: 'active' },
])

const notificationList = reactive<NotificationItem[]>([
  { scene: '📦 订单发货通知', templateId: 'OPENTM407913429', trigger: '填写运单后自动触发' },
  { scene: '✅ 报名成功通知', templateId: 'OPENTM814637211', trigger: '审核通过后推送' },
  { scene: '📅 预约提醒通知', templateId: 'OPENTM203748920', trigger: '预约前2小时触发' },
  { scene: '💰 支付成功确认', templateId: '', trigger: '支付回调后立即发送' },
  { scene: '🎟️ 优惠券到期提醒', templateId: '', trigger: '到期前3天定时推送' },
])

const roleList = reactive<RoleItem[]>([
  {
    icon: '👑',
    name: '超级管理员',
    desc: '拥有全部功能权限，可管理系统配置',
    tag: '系统内置',
    permissions: ['全部模块', '系统设置', '用户管理', '日志查看'],
  },
  {
    icon: '📝',
    name: '内容运营',
    desc: '负责内容发布、活动运营、表单管理',
    permissions: ['内容管理', '活动管理', '表单查看', '素材库'],
  },
  {
    icon: '🛍️',
    name: '商务运营',
    desc: '负责商品上架、订单处理、营销活动',
    permissions: ['商品管理', '订单管理', '营销工具', '会员查看'],
  },
])

// ==================== 验证规则 ====================

const miniRules: FormRules = {
  appName: [{ required: true, message: '请输入小程序名称', trigger: 'blur' }],
  appId: [{ required: true, message: '请输入AppID', trigger: 'blur' }],
  appSecret: [{ required: true, message: '请输入AppSecret', trigger: 'blur' }],
}

const paymentRules: FormRules = {
  mchId: [{ required: true, message: '请输入商户号', trigger: 'blur' }],
}

// ==================== 工具函数 ====================

function getMiniProgramSnapshot() {
  return JSON.stringify({
    appName: miniProgramForm.appName,
    appId: miniProgramForm.appId,
    appSecret: miniProgramForm.appSecret,
    originalId: miniProgramForm.originalId,
    logoUrl: miniProgramForm.logoUrl,
    shareGuide: miniProgramForm.shareGuide,
  })
}

function markMiniProgramSaved() {
  miniProgramSavedSnapshot.value = getMiniProgramSnapshot()
  miniProgramSavedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

const hasMiniProgramChanges = computed(() => {
  if (!miniProgramSavedSnapshot.value) return false
  return getMiniProgramSnapshot() !== miniProgramSavedSnapshot.value
})

const miniProgramSaveStatus = computed(() => {
  if (miniSaving.value) return '保存中...'
  if (hasMiniProgramChanges.value) return '有未保存更改'
  return miniProgramSavedAt.value ? `已保存 ${miniProgramSavedAt.value}` : '已保存'
})

// ==================== 数据加载 ====================

let dataLoaded = false

function applyConfigs(configs: Array<ConfigItem | any>) {
  configs.forEach((item) => {
    const key = item.configKey || item.key
    const value = item.configValue || item.value
    const type = item.type

    if (!key) return

    // 匹配到各个表单
    const targets = [miniProgramForm, paymentForm, logisticsForm] as Array<Record<string, any>>
    targets.forEach((target) => {
      if (key in target) {
        target[key] = type === 'boolean' || typeof target[key] === 'boolean' ? value === 'true' : value
      }
    })

    // 匹配插件状态
    const plugin = pluginModules.value.find(p => p.key === key)
    if (plugin && (value === 'true' || value === true)) {
      plugin.enabled = true
    }
  })
}

async function fetchConfig() {
  loading.value = true
  try {
    // 使用静默模式加载配置（不显示错误提示，失败时使用默认值）
    const groups = await Promise.allSettled([
      getConfigByGroupSilent('basic'),
      getConfigByGroupSilent('wechat'),
      getConfigByGroupSilent('storage'),
    ])

    let hasError = false
    groups.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        applyConfigs(result.value.data?.configs || [])
      } else {
        hasError = true
        console.warn(`配置组[${['basic', 'wechat', 'storage'][index]}]加载失败:`, result.reason)
      }
    })

    if (hasError) {
      console.warn('部分配置加载失败，使用默认值显示')
    }

    markMiniProgramSaved()
    await nextTick()
    markAllAsConfigured()
    dataLoaded = true
  } catch (e) {
    console.error('配置加载异常:', e)
    dataLoaded = true
  } finally {
    loading.value = false
  }
}

function markAllAsConfigured() {
  paySaved.value = !!(paymentForm.mchId?.trim() || paymentForm.apiV3Key?.trim())
  pluginSaved.value = true
  logisticsSaved.value = true
  notificationSaved.value = true
  allSaved.value = true
}

function toConfigItems(data: Record<string, unknown>, group: string) {
  return Object.entries(data).map(([key, value]) => ({
    configKey: key,
    configValue: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
    configGroup: group,
    description: key,
  }))
}

async function saveGroup(group: string, _label: string, data: Record<string, unknown>) {
  await updateConfigs({ configs: toConfigItems(data, group) } as any)
}

// ==================== 事件处理 ====================

async function handleSaveAll() {
  const miniValid = await miniFormRef.value?.validate().catch(() => false)
  const payValid = paymentForm.enablePayment ? await payFormRef.value?.validate().catch(() => false) : true

  if (!miniValid || !payValid) return

  savingAll.value = true
  try {
    await Promise.all([
      saveGroup('wechat', '微信小程序配置', miniProgramForm as unknown as Record<string, unknown>),
      saveGroup('wechat', '微信支付配置', paymentForm as unknown as Record<string, unknown>),
      saveGroup('basic', '插件开关', { plugins: pluginModules.value }),
      saveGroup('storage', '物流配置', logisticsForm),
      saveGroup('basic', '通知配置', { notifications: notificationList }),
    ])

    markMiniProgramSaved()
    miniSaved.value = true
    paySaved.value = true
    pluginSaved.value = true
    logisticsSaved.value = true
    notificationSaved.value = true
    allSaved.value = true

    ElMessage.success('全部配置已保存')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '部分配置保存失败')
  } finally {
    savingAll.value = false
  }
}

async function handleSaveMiniProgram() {
  if (!hasMiniProgramChanges.value) {
    ElMessage.info('当前没有需要保存的修改')
    return
  }

  const valid = await miniFormRef.value?.validate().catch(() => false)
  if (!valid) return

  miniSaving.value = true
  try {
    await saveGroup('wechat', '微信小程序配置', miniProgramForm as unknown as Record<string, unknown>)
    markMiniProgramSaved()
    miniSaved.value = true
    ElMessage.success('小程序配置已保存')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    miniSaving.value = false
  }
}

async function handleSavePayment() {
  const valid = paymentForm.enablePayment ? await payFormRef.value?.validate().catch(() => false) : true
  if (!valid) return

  paySaving.value = true
  try {
    await saveGroup('wechat', '支付配置', paymentForm as unknown as Record<string, unknown>)
    paySaved.value = true
    ElMessage.success('支付配置已保存')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    paySaving.value = false
  }
}

function handleTestPay() {
  const env = paymentForm.payEnv === 'production' ? '生产' : '沙盒'
  ElMessage.success(`[${env}环境] 模拟支付 ¥0.01 成功`)
}

function handleSavePlugins() {
  pluginSaving.value = true
  saveGroup('basic', '模块开关', { plugins: pluginModules.value }).then(() => {
    pluginSaved.value = true
    ElMessage.success('模块配置已保存')
  }).catch((e) => {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }).finally(() => {
    pluginSaving.value = false
  })
}

function handleSaveLogistics() {
  logisticsSaving.value = true
  saveGroup('storage', '物流配置', logisticsForm).then(() => {
    logisticsSaved.value = true
    ElMessage.success('物流配置已保存')
  }).catch((e) => {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }).finally(() => {
    logisticsSaving.value = false
  })
}

function handleSaveNotifications() {
  notificationSaving.value = true
  saveGroup('basic', '通知配置', { notifications: notificationList }).then(() => {
    notificationSaved.value = true
    ElMessage.success('通知配置已保存')
  }).catch((e) => {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }).finally(() => {
    notificationSaving.value = false
  })
}

function onModuleToggle(plugin: PluginModule, enabled: boolean) {
  ElMessage.success(`${plugin.name}已${enabled ? '启用' : '禁用'}`)
}

// 上传相关
function beforeImageUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片不能超过2MB')
    return false
  }
  return true
}

async function handleLogoUpload(options: UploadRequestOptions) {
  try {
    const res = await uploadFile(options.file)
    miniProgramForm.logoUrl = res.data.url
    ElMessage.success('Logo上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
}

function beforeCertUpload(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['p12', 'pem'].includes(ext || '')) {
    ElMessage.error('仅支持 .p12/.pem 证书')
    return false
  }
  return true
}

async function handleCertUpload(options: UploadRequestOptions) {
  try {
    await uploadFile(options.file)
    paymentForm.certUploaded = true
    ElMessage.success('证书上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
}

function handlePickAsset() {
  ElMessage.info('请从素材库选择Logo')
}

function handleAddRole() {
  ElMessage.info('新建角色')
}

function handleGetTemplateId() {
  ElMessage.info('请前往微信公众平台获取')
}

function handleTestNotification(row: NotificationItem) {
  if (!row.templateId) {
    ElMessage.warning('请先配置模板ID')
    return
  }
  ElMessage.success(`已发送测试「${row.scene}」`)
}

// 其他占位方法
function handleEditFreightTemplate() { ElMessage.info('编辑运费模板') }
function handleConfigNoLogistics() { ElMessage.info('数字商品无需物流') }

// Watchers
// 注意：不再在watch中自动调用API，避免API失败后回写值导致无限循环
// 支付开关状态变更由用户手动点击"保存支付配置"按钮提交
watch(paymentForm, () => { if (paySaved.value) { paySaved.value = false; allSaved.value = false } }, { deep: true })
watch(logisticsForm, () => { if (logisticsSaved.value) { logisticsSaved.value = false; allSaved.value = false } }, { deep: true })
watch(notificationList, () => { if (notificationSaved.value) { notificationSaved.value = false; allSaved.value = false } }, { deep: true })

onMounted(() => {
  fetchConfig()
})
</script>

<style lang="scss" scoped>
/* ============================================
   企业级系统设置页面 - 大厂UI规范版
   设计参考: 阿里云控制台 / 腾讯云后台 / 飞书管理后台
   核心特点: Tab布局 + 紧凑表单 + 卡片分组 + 无空白
   ============================================ */

.enterprise-setting-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* ========== 页面头部（大厂标准） ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.3px;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* ========== 主内容区 ========== */
.main-content {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
}

/* ========== Tab标签样式（大厂标准） ========== */
.setting-tabs {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

  :deep(.el-tabs__header) {
    margin: 0;
    background: #fafbfc;
    border-bottom: 1px solid #e5e7eb;
    border-radius: 12px 12px 0 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background: transparent;
  }

  :deep(.el-tabs__item) {
    height: 48px;
    line-height: 48px;
    padding: 0 28px;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    transition: all 0.25s ease;

    &.is-active {
      color: #2563eb;
      font-weight: 600;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 20px;
        right: 20px;
        height: 2px;
        background: #2563eb;
        border-radius: 2px 2px 0 0;
      }
    }

    &:hover {
      color: #374151;
      background: rgba(59, 130, 246, 0.04);
    }
  }
}

.tab-content {
  padding: 28px 32px;
  min-height: 400px;
}

/* ========== 配置区块 ========== */
.config-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.section-spacing {
  margin-top: 20px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.section-desc {
  font-size: 13px;
  color: #9ca3af;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

/* ========== 紧凑表单布局 ========== */
.compact-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    padding-right: 12px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    border-radius: 6px;
    
    &:hover {
      box-shadow: 0 0 0 1px #d1d5db inset;
    }
  }

  :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 2px #3b82f6 inset, 0 0 0 4px rgba(59, 130, 246, 0.08);
  }
}

.form-grid-2col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 24px;
}

.form-grid-3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0 20px;
}

/* 特殊组件样式 */
.logo-uploader {
  display: flex;
  gap: 10px;
  align-items: center;

  .logo-input {
    flex: 1;
  }

  .upload-btns {
    display: flex;
    gap: 8px;
  }
}

.env-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;

  .toggle-label {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
  }
}

.cert-upload-row {
  display: flex;
  align-items: center;
  gap: 12px;

  .upload-hint {
    font-size: 12px;
    color: #9ca3af;
  }
}

.enable-switch {
  margin-left: auto;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.action-bar-center {
  justify-content: center;
  padding: 24px 0 0;
  margin-top: 24px;
  border-top: none;
}

/* ========== 模块分组卡片 ========== */
.module-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.module-group {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border-bottom: 1px solid #dbeafe;
}

.group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 8px;

  .el-icon {
    font-size: 18px;
  }
}

.group-desc {
  font-size: 13px;
  color: #60a5fa;
  flex: 1;
}

.module-cards {
  display: grid;
  gap: 12px;
  padding: 16px 20px;
}

.module-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: white;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
    transform: translateY(-1px);
  }

  &.disabled {
    opacity: 0.65;
    background: #f9fafb;
  }
}

.card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.card-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f9ff;
  border-radius: 8px;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.card-desc {
  font-size: 12px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 数据表格 ========== */
.data-table {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;

  :deep(th.el-table__cell) {
    background: #f9fafb !important;
    color: #374151;
    font-weight: 600;
    font-size: 13px;
    padding: 12px 16px;
  }

  :deep(td.el-table__cell) {
    font-size: 13px;
    padding: 12px 16px;
  }

  :deep(.el-table__row--striped td) {
    background: #fafbfc;
  }
}

.scene-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .scene-icon {
    font-size: 16px;
  }

  .scene-text {
    font-size: 13px;
    color: #374151;
  }
}

/* ========== 角色卡片（企业版） ========== */
.role-matrix {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}

.role-card-enterprise {
  padding: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  transition: all 0.25s ease;

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    transform: translateY(-2px);
  }
}

.role-main {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.role-avatar {
  font-size: 32px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  flex-shrink: 0;
}

.role-detail {
  flex: 1;
  min-width: 0;
}

.role-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.role-name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.role-desc {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.role-perms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.role-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

/* ========== 通用按钮增强 ========== */
.btn-saved {
  --el-button-bg-color: #ecfdf5 !important;
  --el-button-border-color: #a7f3d0 !important;
  --el-button-text-color: #059669 !important;
  animation: saved-pulse 0.35s ease-out;
}

@keyframes saved-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* ========== 响应式适配 ========== */
@media (max-width: 1280px) {
  .main-content {
    padding: 20px;
  }

  .tab-content {
    padding: 24px;
  }

  .form-grid-3col {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .page-header {
    padding: 20px 24px;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-right {
    justify-content: stretch;

    .el-button {
      flex: 1;
    }
  }

  .form-grid-2col,
  .form-grid-3col {
    grid-template-columns: 1fr;
  }

  .role-matrix {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 16px 20px;
  }

  .main-content {
    padding: 16px;
  }

  .tab-content {
    padding: 20px;
  }

  .config-section {
    padding: 20px;
  }

  .section-header {
    flex-direction: column;
    gap: 8px;
  }

  .module-cards {
    grid-template-columns: 1fr;
  }

  .module-card {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}
</style>
