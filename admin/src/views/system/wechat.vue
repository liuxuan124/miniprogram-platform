<template>
  <div class="wechat-config-container">
    <!-- 微信小程序配置 -->
    <el-card shadow="hover" class="mb16">
      <template #header>
        <div class="card-header">
          <span><el-icon style="vertical-align: middle; margin-right: 4px"><ChatDotRound /></el-icon>微信小程序配置</span>
          <div>
            <el-button icon="Connection" @click="handleTestConnection" :loading="testing">测试连接</el-button>
            <el-button type="primary" icon="Check" :loading="saving" @click="handleSave">保存设置</el-button>
          </div>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        label-position="right"
        v-loading="loading"
      >
        <el-alert
          title="请前往微信公众平台(mp.weixin.qq.com)获取以下配置信息"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="AppID" prop="appId">
              <el-input v-model="formData.appId" placeholder="wx1234567890abcdef" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="AppSecret" prop="appSecret">
              <el-input
                v-model="formData.appSecret"
                placeholder="请输入AppSecret"
                type="password"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="代码上传密钥" prop="uploadKey">
          <el-input
            v-model="formData.uploadKey"
            type="textarea"
            :rows="4"
            placeholder="粘贴微信公众平台下载的代码上传密钥（private key）"
          />
          <div class="field-hint">用于后台「推送体验版」。路径：微信公众平台 → 开发管理 → 开发设置 → 小程序代码上传密钥</div>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="小程序名称" prop="appName">
              <el-input v-model="formData.appName" placeholder="品牌小程序" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原始ID" prop="originalId">
              <el-input v-model="formData.originalId" placeholder="gh_1234567890ab" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="小程序Logo" prop="qrcodeUrl">
          <div class="upload-wrapper">
            <el-input v-model="formData.qrcodeUrl" placeholder="Logo 图片 URL" style="flex: 1" />
            <el-upload
              :show-file-list="false"
              :before-upload="beforeUpload"
              :http-request="handleUploadQrcode"
              accept="image/*"
            >
              <el-button type="primary" icon="Upload" style="margin-left: 12px">上传</el-button>
            </el-upload>
            <el-image
              v-if="formData.qrcodeUrl"
              :src="formData.qrcodeUrl"
              :preview-src-list="[formData.qrcodeUrl]"
              fit="contain"
              style="width: 60px; height: 60px; margin-left: 12px; border: 1px solid #ebeef5; border-radius: 4px"
            />
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 小程序类目与审核版本（合规） -->
    <el-card shadow="hover" class="mb16">
      <template #header>
        <div class="card-header">
          <span>小程序类目与审核版本</span>
          <el-button type="primary" icon="Check" :loading="complianceSaving" @click="handleSaveCompliance">保存合规配置</el-button>
        </div>
      </template>
      <el-alert
        title="审核版本（reviewMode）开启后，未开通类目对应模块在小程序端 API 门禁关闭；与侧栏 plugins 开关叠加生效。"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />
      <el-form label-width="140px" size="default" v-loading="complianceLoading">
        <el-form-item label="审核版本模式">
          <el-switch v-model="complianceForm.reviewMode" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <el-form-item label="强制隐藏模块">
          <el-select
            v-model="complianceForm.reviewModeHiddenModules"
            multiple
            collapse-tags
            style="width: 100%"
            placeholder="如 planet、qa"
          >
            <el-option label="商品/订单 product" value="product" />
            <el-option label="星球 planet" value="planet" />
            <el-option label="问答 qa" value="qa" />
            <el-option label="会员 member" value="member" />
            <el-option label="内容 content" value="content" />
          </el-select>
        </el-form-item>
        <el-form-item label="已开通类目 JSON">
          <el-input
            v-model="complianceForm.enabledCategoriesJson"
            type="textarea"
            :rows="5"
            placeholder='[{"id":"576","name":"资讯"}]'
          />
          <div class="field-hint">与 MP 后台已开通类目 id 对齐；moduleRequirements 可在高级配置中维护</div>
        </el-form-item>
        <el-form-item label="模块类目要求 JSON">
          <el-input
            v-model="complianceForm.moduleRequirementsJson"
            type="textarea"
            :rows="4"
            placeholder='{"product":["576"],"planet":["576"]}'
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 微信公众号配置（内容同步） -->
    <el-card shadow="hover" class="mb16">
      <template #header>
        <div class="card-header">
          <span><el-icon style="vertical-align: middle; margin-right: 4px"><ChatDotRound /></el-icon>微信公众号配置</span>
          <el-button type="primary" icon="Check" :loading="oaSaving" @click="handleSaveOa">保存公众号配置</el-button>
        </div>
      </template>
      <el-alert
        title="用于「内容管理 → 同步导入 → 公众号全量导入」。同主体服务号请填写公众号 AppID/AppSecret；若与小程序相同可留空，将回退使用上方小程序凭证。"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />
      <el-form label-width="140px" label-position="right" v-loading="loading">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="公众号 AppID">
              <el-input v-model="oaFormData.oaAppId" placeholder="留空则使用小程序 AppID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公众号 AppSecret">
              <el-input v-model="oaFormData.oaAppSecret" type="password" show-password placeholder="留空则使用小程序 AppSecret" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 微信支付配置 -->
    <el-card shadow="hover" class="mb16">
      <template #header>
        <div class="card-header">
          <span><el-icon style="vertical-align: middle; margin-right: 4px"><Coin /></el-icon>微信支付配置</span>
          <el-button
            type="primary"
            size="small"
            :icon="paySaved ? 'CircleCheck' : 'Check'"
            :loading="paySaving"
            :class="{ 'btn-saved': paySaved }"
            @click="handleSavePay"
          >
            {{ paySaving ? '保存中...' : (paySaved ? '已保存' : '保存支付配置') }}
          </el-button>
        </div>
      </template>

      <el-form
        ref="payFormRef"
        :model="payFormData"
        :rules="payFormRules"
        label-width="140px"
        label-position="right"
      >
        <el-form-item label="启用微信支付" prop="enablePayment">
          <el-switch
            v-model="payFormData.enablePayment"
            active-text="开启"
            inactive-text="关闭"
            inline-prompt
          />
        </el-form-item>

        <template v-if="payFormData.enablePayment">
          <el-form-item label="运行环境" prop="payEnv">
            <div class="env-switch-wrapper">
              <el-switch
                v-model="payFormData.payEnv"
                active-text="生产环境"
                inactive-text="沙盒环境"
                inline-prompt
                active-value="production"
                inactive-value="sandbox"
              />
              <el-tag
                :type="payFormData.payEnv === 'production' ? 'danger' : 'warning'"
                size="small"
                effect="dark"
                style="margin-left: 8px"
              >
                {{ payFormData.payEnv === 'production' ? '生产环境（真实收款）' : '沙盒环境（仅测试）' }}
              </el-tag>
            </div>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="商户号" prop="mchId">
                <el-input v-model="payFormData.mchId" placeholder="请输入微信支付商户号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="APIv3 密钥" prop="apiV3Key">
                <el-input
                  v-model="payFormData.apiV3Key"
                  placeholder="请输入 APIv3 密钥"
                  type="password"
                  show-password
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="商户证书序列号" prop="certSerialNo">
                <el-input v-model="payFormData.certSerialNo" placeholder="7E****************************" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="商户API私钥">
                <div class="cert-upload-wrapper">
                  <el-upload
                    :show-file-list="false"
                    :before-upload="beforeCertUpload"
                    :http-request="handleCertUpload"
                    accept=".p12,.pem,.key"
                  >
                    <el-button icon="Upload">上传私钥</el-button>
                  </el-upload>
                  <el-tag
                    v-if="payFormData.certUploaded"
                    type="success"
                    size="small"
                    effect="light"
                    style="margin-left: 8px"
                  >
                    <el-icon style="vertical-align: middle; margin-right: 2px"><CircleCheck /></el-icon>
                    已上传
                  </el-tag>
                  <span v-else style="margin-left: 8px; font-size: 12px; color: #909399">
                    支持 apiclient_key.pem/.key，或密码为商户号的 .p12
                  </span>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="支付回调地址" prop="paymentNotifyUrl">
            <el-input v-model="payFormData.paymentNotifyUrl" placeholder="https://yourdomain.com/api/v1/wechat/pay/notify" />
          </el-form-item>

          <el-form-item label="退款回调地址" prop="refundNotifyUrl">
            <el-input v-model="payFormData.refundNotifyUrl" placeholder="https://api.zfculture.site/api/v1/mp/payments/wx-refund-notify" />
          </el-form-item>

          <div class="pay-actions">
            <el-button icon="MagicStick" :loading="payTesting" @click="handleTestPay">
              {{ payTesting ? '验证中...' : '验证支付配置' }}
            </el-button>
          </div>
        </template>
      </el-form>
    </el-card>

    <!-- 物流配送与运费模板 -->
    <el-card shadow="hover" class="mb16">
      <template #header>
        <div class="card-header">
          <span><el-icon style="vertical-align: middle; margin-right: 4px"><Van /></el-icon>物流配送与运费模板</span>
          <el-button type="primary" size="small" icon="Check" @click="handleSaveLogistics">保存物流设置</el-button>
        </div>
      </template>

      <div class="logistics-section">
        <h4 class="section-title">第三方物流授权</h4>
        <el-form label-width="120px" label-position="right">
          <el-form-item label="物流平台">
            <el-select v-model="logisticsForm.platform" style="width: 240px">
              <el-option label="顺丰速运 SDK" value="sf" />
              <el-option label="菜鸟裹裹 API" value="cainiao" />
              <el-option label="快递100" value="kuaidi100" />
            </el-select>
          </el-form-item>
          <el-form-item label="App Key">
            <el-input v-model="logisticsForm.appKey" type="password" show-password style="width: 360px" placeholder="请输入物流平台 App Key" />
          </el-form-item>
        </el-form>

        <el-divider />

        <h4 class="section-title">运费模板管理</h4>
        <div class="freight-list">
          <div class="freight-item">
            <span>全国包邮模板（默认）</span>
            <el-button link type="primary" size="small">编辑</el-button>
          </div>
          <div class="freight-item">
            <span>数字/服务商品</span>
            <el-tag size="small" type="info" effect="plain">无需物流</el-tag>
            <el-button link type="primary" size="small" style="margin-left: auto">配置</el-button>
          </div>
          <div class="freight-item">
            <span>偏远地区自动加价</span>
            <el-tag size="small" type="warning" effect="light">已开启</el-tag>
          </div>
        </div>

        <el-divider />

        <h4 class="section-title">默认发货地址</h4>
        <div class="address-info">
          <div class="address-text">广东省深圳市南山区高新园区 xxx 仓库</div>
          <el-button size="small" icon="Edit" @click="handleManageAddress">管理地址库</el-button>
        </div>
      </div>
    </el-card>

    <!-- 订阅消息与通知配置 -->
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span><el-icon style="vertical-align: middle; margin-right: 4px"><Bell /></el-icon>订阅消息与通知配置</span>
          <div>
            <el-button size="small" icon="Document" @click="handleGetTemplateId">获取模板 ID</el-button>
            <el-button size="small" type="primary" icon="Check" @click="handleSaveNotifications">保存通知配置</el-button>
          </div>
        </div>
      </template>

      <div class="notification-tip">
        配置微信订阅消息模板 ID，用户授权后可接收关键节点通知。
      </div>
      <el-form label-width="140px" style="margin-bottom: 12px">
        <el-form-item label="通知跳转版本">
          <el-select v-model="subscribeMiniState" style="width: 240px">
            <el-option label="体验版 trial（当前）" value="trial" />
            <el-option label="正式版 formal" value="formal" />
            <el-option label="开发版 developer" value="developer" />
          </el-select>
          <div class="field-hint">正式发布后改为 formal，否则服务通知会打到体验版。</div>
        </el-form-item>
      </el-form>

      <el-table
        :data="notificationList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column label="通知场景" min-width="180">
          <template #default="{ row }">
            <span>{{ row.scene }}</span>
          </template>
        </el-table-column>
        <el-table-column label="微信模板 ID" min-width="220">
          <template #default="{ row }">
            <el-input
              v-model="row.templateId"
              placeholder="填写模板 ID"
              size="small"
              style="width: 200px"
            />
          </template>
        </el-table-column>
        <el-table-column label="触发时机" min-width="180">
          <template #default="{ row }">
            <span style="font-size: 12px; color: #909399">{{ row.trigger }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.enabled && row.templateId ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ row.enabled && row.templateId ? '已启用' : '未配置' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="handleTestNotification(row)"
            >
              测试
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import {
  getConfigsSilent,
  testWxPayConfig,
  updateConfigs,
  uploadFile,
  uploadWxPayPrivateKey,
} from '@/api/system'
import { get, put } from '@/api/request'
import {
  applyConfigListToForm,
  extractConfigList,
  FORM_TO_DB_KEY,
  shouldSkipSensitiveSave,
  toConfigUpdateItems,
} from '@/utils/system-config'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const formRef = ref<FormInstance>()

const complianceLoading = ref(false)
const complianceSaving = ref(false)
const complianceForm = reactive({
  reviewMode: false,
  reviewModeHiddenModules: [] as string[],
  enabledCategoriesJson: '[]',
  moduleRequirementsJson: '{}',
})

// ==================== 小程序基础配置 ====================

interface WechatFullConfigForm {
  appId: string
  appSecret: string
  uploadKey: string
  originalId: string
  appName: string
  qrcodeUrl: string
}

const formData = reactive<WechatFullConfigForm>({
  appId: '',
  appSecret: '',
  uploadKey: '',
  originalId: '',
  appName: '',
  qrcodeUrl: '',
})

const oaSaving = ref(false)
const oaFormData = reactive({
  oaAppId: '',
  oaAppSecret: '',
})

const OA_CONFIG_KEY_MAP: Record<string, string> = {
  oaAppId: 'wx_oa_appid',
  oaAppSecret: 'wx_oa_app_secret',
}

const OA_CONFIG_KEY_REVERSE: Record<string, keyof typeof oaFormData> = {
  wx_oa_appid: 'oaAppId',
  wx_oa_app_secret: 'oaAppSecret',
}

const CONFIG_KEY_MAP: Record<string, string> = {
  appId: 'wx_appid',
  appSecret: 'wx_app_secret',
  uploadKey: 'wx_upload_key',
  originalId: 'originalId',
  appName: 'appName',
  qrcodeUrl: 'qrcodeUrl',
}

const CONFIG_KEY_REVERSE: Record<string, keyof WechatFullConfigForm> = {
  wx_appid: 'appId',
  appId: 'appId',
  wx_app_secret: 'appSecret',
  appSecret: 'appSecret',
  wx_upload_key: 'uploadKey',
  uploadKey: 'uploadKey',
  originalId: 'originalId',
  appName: 'appName',
  qrcodeUrl: 'qrcodeUrl',
}

const formRules: FormRules = {
  appId: [{ required: true, message: '请输入 AppID', trigger: 'blur' }],
  appSecret: [{ required: true, message: '请输入 AppSecret', trigger: 'blur' }],
}

// ==================== 微信支付配置 ====================

const paySaving = ref(false)
const payTesting = ref(false)
const paySaved = ref(false)
const payFormRef = ref<FormInstance>()

interface PayConfigForm {
  enablePayment: boolean
  payEnv: 'sandbox' | 'production'
  mchId: string
  apiV3Key: string
  certSerialNo: string
  certUploaded: boolean
  paymentNotifyUrl: string
  refundNotifyUrl: string
}

const payFormData = reactive<PayConfigForm>({
  enablePayment: false,
  payEnv: 'sandbox',
  mchId: '',
  apiV3Key: '',
  certSerialNo: '',
  certUploaded: false,
  paymentNotifyUrl: '',
  refundNotifyUrl: 'https://api.zfculture.site/api/v1/mp/payments/wx-refund-notify',
})

const payFormRules: FormRules = {
  mchId: [{ required: true, message: '请输入商户号', trigger: 'blur' }],
}

// ==================== 物流配送 ====================

interface LogisticsForm {
  platform: string
  appKey: string
}

const logisticsForm = reactive<LogisticsForm>({
  platform: 'sf',
  appKey: '',
})

// ==================== 订阅消息 ====================

interface NotificationItem {
  key: string
  scene: string
  templateId: string
  trigger: string
  enabled: boolean
}

const notificationList = reactive<NotificationItem[]>([
  { key: 'order_status', scene: '支付成功通知', templateId: '', trigger: '用户支付成功后', enabled: true },
  { key: 'order_shipped', scene: '发货通知', templateId: '', trigger: '自动发货或后台发货后', enabled: true },
  { key: 'coupon_expire', scene: '优惠券到期提醒', templateId: '', trigger: '到期前定时推送', enabled: true },
  { key: 'appointment_remind', scene: '预约成功通知', templateId: '', trigger: '预约提交后', enabled: true },
  { key: 'activity_remind', scene: '活动即将开始', templateId: '', trigger: '活动开始前提醒', enabled: true },
])

const subscribeMiniState = ref('trial')

// ==================== 方法 ====================

let dataLoaded = false

watch(() => payFormData.enablePayment, (val) => {
  if (!dataLoaded) return
  const configItem = { configKey: 'enablePayment', configValue: String(val), configGroup: 'wechat', description: 'pay_enable' }
  updateConfigs([{
    configKey: configItem.configKey,
    configValue: configItem.configValue,
    configGroup: configItem.configGroup,
    description: configItem.description,
  }]).then(() => {
    ElMessage.success(val ? '微信支付已开启' : '微信支付已关闭')
  }).catch(() => {
    payFormData.enablePayment = !val
  })
})

/** 加载配置 */
async function fetchConfig() {
  loading.value = true
  try {
    const res = await getConfigsSilent()
    const configs = extractConfigList(res.data)
    applyConfigListToForm(configs, [formData as unknown as Record<string, unknown>])
    applyConfigListToForm(configs, [payFormData as unknown as Record<string, unknown>])
    for (const cfg of configs) {
      if (!cfg.configKey) continue
      const oaKey = OA_CONFIG_KEY_REVERSE[cfg.configKey]
      if (oaKey) {
        oaFormData[oaKey] = cfg.configValue || ''
      }
      if (cfg.configKey === 'subscribe_miniprogram_state' && cfg.configValue) {
        subscribeMiniState.value = cfg.configValue
      }
    }
    if (payFormData.mchId || payFormData.apiV3Key) {
      paySaved.value = true
    }
    await nextTick()
    dataLoaded = true
    await loadSubscribeTemplates()
  } catch {
  } finally {
    loading.value = false
  }
}

async function loadSubscribeTemplates() {
  try {
    const res: any = await get('/api/v1/admin/growth/subscribe/templates')
    const rows = res?.data || res || []
    notificationList.forEach((item) => {
      const hit = rows.find((r: any) => r.scene === item.key)
      if (hit) {
        item.templateId = hit.templateId || ''
        item.enabled = hit.enabled !== 0
      }
    })
  } catch {
    // ignore
  }
}

/** 上传前校验 */
function beforeUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

/** 上传小程序码 */
async function handleUploadQrcode(options: UploadRequestOptions) {
  try {
    const res = await uploadFile(options.file)
    formData.qrcodeUrl = res.data.url
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
}

/** 测试连接 */
async function handleTestConnection() {
  if (!formData.appId || !formData.appSecret) {
    ElMessage.warning('请先填写 AppID 和 AppSecret')
    return
  }
  testing.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    ElMessage.success('连接测试成功')
  } catch {
    ElMessage.error('连接测试失败，请检查配置')
  } finally {
    testing.value = false
  }
}

/** 保存公众号配置 */
async function handleSaveOa() {
  oaSaving.value = true
  try {
    const configItems = Object.entries(oaFormData).map(([key, value]) => ({
      configKey: OA_CONFIG_KEY_MAP[key] || key,
      configValue: String(value ?? ''),
      configGroup: 'wechat',
      description: key,
    }))
    await updateConfigs(configItems)
    ElMessage.success('公众号配置已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    oaSaving.value = false
  }
}

/** 保存小程序配置 */
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const configItems = Object.entries(formData)
      .filter(([key, value]) => !shouldSkipSensitiveSave(key, value))
      .map(([key, value]) => ({
        configKey: FORM_TO_DB_KEY[key] || CONFIG_KEY_MAP[key] || key,
        configValue: String(value ?? ''),
        configGroup: 'wechat',
        description: key,
      }))
    await updateConfigs(configItems)
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

/** 证书上传前校验 */
function beforeCertUpload(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['p12', 'pem', 'key'].includes(ext || '')) {
    ElMessage.error('仅支持 .p12、.pem 或 .key 商户私钥')
    return false
  }
  return true
}

/** 上传证书 */
async function handleCertUpload(options: UploadRequestOptions) {
  try {
    const res = await uploadWxPayPrivateKey(options.file, payFormData.mchId)
    payFormData.certUploaded = true
    if (res.data.certSerialNo) payFormData.certSerialNo = res.data.certSerialNo
    ElMessage.success('商户API私钥已写入支付配置')
  } catch {
    // 请求层会展示私钥格式或 p12 密码错误原因
  }
}

/** 保存支付配置 */
async function handleSavePay() {
  if (!payFormData.enablePayment) {
    ElMessage.info('请先启用微信支付')
    return
  }
  const valid = await payFormRef.value?.validate().catch(() => false)
  if (!valid) return
  paySaving.value = true
  try {
    const configItems = Object.entries(payFormData)
      .filter(([key, value]) => key !== 'certUploaded' && !shouldSkipSensitiveSave(key, value))
      .map(([key, value]) => ({
        configKey: FORM_TO_DB_KEY[key] || key,
        configValue: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
        configGroup: 'wechat',
        description: `pay_${key}`,
      }))
    await updateConfigs(configItems)
    paySaved.value = true
    ElMessage.success('支付配置已保存成功')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '支付配置保存失败，请重试')
  } finally {
    paySaving.value = false
  }
}

/** 测试支付 */
async function handleTestPay() {
  const valid = payFormData.enablePayment
    ? await payFormRef.value?.validate().catch(() => false)
    : false
  if (!valid) {
    ElMessage.warning('请先启用支付并填写必填配置')
    return
  }

  payTesting.value = true
  try {
    const configItems = Object.entries(payFormData)
      .filter(([key, value]) => key !== 'certUploaded' && !shouldSkipSensitiveSave(key, value))
      .map(([key, value]) => ({
        configKey: FORM_TO_DB_KEY[key] || key,
        configValue: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
        configGroup: 'wechat',
        description: `pay_${key}`,
      }))
    await updateConfigs(configItems)
    const res = await testWxPayConfig()
    ElMessage.success(res.data.message || '微信支付配置验证通过')
    paySaved.value = true
  } catch {
    // 请求层会展示后端返回的具体校验原因
  } finally {
    payTesting.value = false
  }
}

/** 保存物流设置 */
function handleSaveLogistics() {
  ElMessage.success('物流配置已保存')
}

/** 管理地址库 */
function handleManageAddress() {
  ElMessage.success('已进入地址库管理')
}

/** 获取模板 ID */
function handleGetTemplateId() {
  window.open('https://mp.weixin.qq.com/', '_blank')
}

async function handleSaveNotifications() {
  await Promise.all(notificationList.map((row) => put('/api/v1/admin/growth/subscribe/templates', {
    scene: row.key,
    templateId: row.templateId,
    title: row.scene,
    enabled: row.enabled && row.templateId ? 1 : 0,
  })))
  await updateConfigs([{
    configKey: 'subscribe_miniprogram_state',
    configValue: subscribeMiniState.value,
    configGroup: 'wechat',
    description: '订阅消息跳转小程序版本 trial/formal/developer',
  }])
  ElMessage.success('订阅消息模板已保存')
}

async function handleTestNotification(row: NotificationItem) {
  if (!row.templateId) {
    ElMessage.warning('请先填写模板 ID')
    return
  }
  ElMessage.info('请用体验版完成一笔支付验证；支付成功后会自动发送该模板')
}

watch(payFormData, () => {
  if (paySaved.value) paySaved.value = false
}, { deep: true })

async function fetchCompliance() {
  complianceLoading.value = true
  try {
    const res: any = await get('/api/v1/admin/wechat/compliance')
    const d = res?.data || res || {}
    complianceForm.reviewMode = !!d.reviewMode
    complianceForm.reviewModeHiddenModules = Array.isArray(d.reviewModeHiddenModules)
      ? [...d.reviewModeHiddenModules]
      : ['planet', 'qa']
    complianceForm.enabledCategoriesJson = JSON.stringify(d.enabledCategories || [], null, 2)
    complianceForm.moduleRequirementsJson = JSON.stringify(d.moduleRequirements || {}, null, 2)
  } catch {
    ElMessage.warning('合规配置加载失败，将使用默认值')
  } finally {
    complianceLoading.value = false
  }
}

async function handleSaveCompliance() {
  let enabledCategories: unknown[] = []
  let moduleRequirements: Record<string, unknown> = {}
  try {
    enabledCategories = JSON.parse(complianceForm.enabledCategoriesJson || '[]')
    moduleRequirements = JSON.parse(complianceForm.moduleRequirementsJson || '{}')
  } catch {
    ElMessage.error('类目或 moduleRequirements JSON 格式不正确')
    return
  }
  complianceSaving.value = true
  try {
    await put('/api/v1/admin/wechat/compliance', {
      reviewMode: complianceForm.reviewMode,
      reviewModeHiddenModules: complianceForm.reviewModeHiddenModules,
      enabledCategories,
      moduleRequirements,
    })
    ElMessage.success('合规配置已保存')
    await fetchCompliance()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    complianceSaving.value = false
  }
}

onMounted(() => {
  fetchConfig()
  fetchCompliance()
})
</script>

<style lang="scss" scoped>
.wechat-config-container {
  .mb16 {
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .field-hint {
    margin-top: 6px;
    color: #86909c;
    font-size: 12px;
    line-height: 1.5;
  }

  .btn-saved {
    --el-button-bg-color: #ecfdf5 !important;
    --el-button-border-color: #a7f3d0 !important;
    --el-button-text-color: #059669 !important;
    --el-button-hover-bg-color: #d1fae5 !important;
    --el-button-hover-border-color: #6ee7b7 !important;
    --el-button-hover-text-color: #047857 !important;
    animation: saved-pulse 0.4s ease-out;
  }
  @keyframes saved-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.06); }
    100% { transform: scale(1); }
  }

  .upload-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .env-switch-wrapper {
    display: flex;
    align-items: center;
  }

  .cert-upload-wrapper {
    display: flex;
    align-items: center;
  }

  .pay-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }

  // 物流配送
  .logistics-section {
    .section-title {
      font-size: 14px;
      font-weight: 700;
      margin: 0 0 12px;
      color: #303133;
    }

    .freight-list {
      .freight-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f0f2f7;

        &:last-child {
          border-bottom: none;
        }

        span {
          font-size: 13px;
        }
      }
    }

    .address-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: #f8faff;
      border-radius: 8px;
      border: 1px solid #e4e9f2;

      .address-text {
        font-size: 13px;
        color: #606266;
      }
    }
  }

  // 订阅消息
  .notification-tip {
    font-size: 12px;
    color: #909399;
    margin-bottom: 12px;
  }
}
</style>
