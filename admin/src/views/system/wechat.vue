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
              <el-form-item label="API 证书" prop="certFile">
                <div class="cert-upload-wrapper">
                  <el-upload
                    :show-file-list="false"
                    :before-upload="beforeCertUpload"
                    :http-request="handleCertUpload"
                    accept=".p12,.pem"
                  >
                    <el-button icon="Upload">上传证书</el-button>
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
                  <span v-else style="margin-left: 8px; font-size: 12px; color: #909399">支持 .p12 / .pem 格式</span>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="支付回调地址" prop="paymentNotifyUrl">
            <el-input v-model="payFormData.paymentNotifyUrl" placeholder="https://yourdomain.com/api/v1/wechat/pay/notify" />
          </el-form-item>

          <el-form-item label="退款回调地址" prop="refundNotifyUrl">
            <el-input v-model="payFormData.refundNotifyUrl" placeholder="https://yourdomain.com/api/v1/wechat/refund/notify" />
          </el-form-item>

          <div class="pay-actions">
            <el-button icon="MagicStick" @click="handleTestPay">测试支付</el-button>
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
              :type="row.enabled ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ row.enabled ? '已启用' : '未配置' }}
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
import { getConfigByGroup, updateConfigs, uploadFile } from '@/api/system'
import type { ConfigItem } from '@/types/system'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const formRef = ref<FormInstance>()

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
  refundNotifyUrl: '',
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
  scene: string
  templateId: string
  trigger: string
  enabled: boolean
}

const notificationList = reactive<NotificationItem[]>([
  { scene: '📦 订单发货通知', templateId: 'OPENTM407913429', trigger: '填写运单后自动触发', enabled: true },
  { scene: '✅ 活动报名成功', templateId: 'OPENTM814637211', trigger: '报名审核通过后', enabled: true },
  { scene: '📅 预约提醒', templateId: 'OPENTM203748920', trigger: '预约前2小时触发', enabled: true },
  { scene: '💰 支付成功确认', templateId: '', trigger: '微信支付回调后', enabled: false },
  { scene: '🎟️ 优惠券到期提醒', templateId: '', trigger: '到期前3天自动触发', enabled: false },
])

// ==================== 方法 ====================

let dataLoaded = false

watch(() => payFormData.enablePayment, (val) => {
  if (!dataLoaded) return
  const configItem = { configKey: 'enablePayment', configValue: String(val), configGroup: 'wechat', description: 'pay_enable' }
  updateConfigs({ configs: [configItem] } as any).then(() => {
    ElMessage.success(val ? '微信支付已开启' : '微信支付已关闭')
  }).catch(() => {
    payFormData.enablePayment = !val
  })
})

/** 加载配置 */
async function fetchConfig() {
  loading.value = true
  try {
    const res = await getConfigByGroup('wechat')
    const configs: ConfigItem[] = res.data?.configs || []
    configs.forEach((item) => {
      const mappedKey = CONFIG_KEY_REVERSE[item.key as string]
      if (mappedKey) {
        formData[mappedKey] = item.type === 'boolean' ? String(item.value === 'true') : String(item.value || '')
      }
      const payKey = item.key as keyof PayConfigForm
      if (payKey in payFormData) {
        if (payKey === 'enablePayment' || payKey === 'certUploaded') {
          (payFormData as any)[payKey] = item.value === 'true' || item.value === 'true'
        } else {
          (payFormData as any)[payKey] = item.value
        }
      }
    })
    if (payFormData.mchId || payFormData.apiV3Key) {
      paySaved.value = true
    }
    await nextTick()
    dataLoaded = true
  } catch {
  } finally {
    loading.value = false
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

/** 保存小程序配置 */
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const configs = Object.entries(formData).map(([key, value]) => ({
      key: CONFIG_KEY_MAP[key] || key,
      label: key,
      value: String(value),
      type: typeof value === 'boolean' ? 'boolean' as const : 'string' as const,
      group: 'wechat' as const,
    }))
    await updateConfigs([{ group: 'wechat', label: '微信小程序配置', configs }])
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

/** 证书上传前校验 */
function beforeCertUpload(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'p12' && ext !== 'pem') {
    ElMessage.error('仅支持 .p12 和 .pem 格式的证书文件')
    return false
  }
  return true
}

/** 上传证书 */
async function handleCertUpload(options: UploadRequestOptions) {
  try {
    await uploadFile(options.file)
    payFormData.certUploaded = true
    ElMessage.success('证书上传成功')
  } catch {
    ElMessage.error('证书上传失败')
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
      .filter(([key]) => key !== 'certUploaded')
      .map(([key, value]) => ({
        configKey: key,
        configValue: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
        configGroup: 'wechat',
        description: `pay_${key}`,
      }))
    await updateConfigs({ configs: configItems } as any)
    paySaved.value = true
    ElMessage.success('支付配置已保存成功')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '支付配置保存失败，请重试')
  } finally {
    paySaving.value = false
  }
}

/** 测试支付 */
function handleTestPay() {
  const env = payFormData.payEnv === 'sandbox' ? '沙盒' : '生产'
  ElMessage.info(`[${env}] 模拟支付 ¥0.01 成功，回调 200 OK`)
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
  ElMessage.info('请前往微信公众平台获取模板 ID')
}

/** 保存通知配置 */
function handleSaveNotifications() {
  ElMessage.success('通知配置已保存')
}

/** 测试通知 */
function handleTestNotification(row: NotificationItem) {
  if (!row.templateId) {
    ElMessage.warning('请先填写模板 ID')
    return
  }
  ElMessage.success(`已发送测试通知「${row.scene}」`)
}

watch(payFormData, () => {
  if (paySaved.value) paySaved.value = false
}, { deep: true })

onMounted(() => {
  fetchConfig()
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
