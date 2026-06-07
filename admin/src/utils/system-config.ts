/** 系统配置 API 与表单字段互转 */

export interface RawConfigItem {
  configKey?: string
  key?: string
  configValue?: string
  value?: string
  type?: string
}

const SENSITIVE_FORM_KEYS = new Set(['appSecret', 'apiV3Key', 'uploadKey', 'ossAccessKeySecret', 'cosSecretKey', 'qiniuSecretKey'])

/** 表单字段 -> 数据库 configKey */
export const FORM_TO_DB_KEY: Record<string, string> = {
  appName: 'appName',
  appId: 'wx_appid',
  appSecret: 'wx_app_secret',
  originalId: 'originalId',
  logoUrl: 'site_logo',
  shareGuide: 'miniappShareTitle',
  uploadKey: 'wx_upload_key',
  enablePayment: 'enablePayment',
  payEnv: 'payEnv',
  mchId: 'wx_mch_id',
  apiV3Key: 'wx_mch_key',
  certSerialNo: 'certSerialNo',
  certUploaded: 'certUploaded',
  paymentNotifyUrl: 'wx_pay_notify_url',
  refundNotifyUrl: 'wx_refund_notify_url',
  privacyPolicyUrl: 'privacy_policy_url',
  userAgreementUrl: 'user_agreement_url',
  servicePhone: 'service_phone',
}

/** 数据库 configKey -> 表单字段 */
export const DB_TO_FORM_KEY: Record<string, string> = {
  appName: 'appName',
  wx_appid: 'appId',
  appId: 'appId',
  wx_app_secret: 'appSecret',
  appSecret: 'appSecret',
  originalId: 'originalId',
  site_logo: 'logoUrl',
  logoUrl: 'logoUrl',
  miniappShareTitle: 'shareGuide',
  shareGuide: 'shareGuide',
  wx_upload_key: 'uploadKey',
  uploadKey: 'uploadKey',
  enablePayment: 'enablePayment',
  payEnv: 'payEnv',
  wx_mch_id: 'mchId',
  mchId: 'mchId',
  wx_mch_key: 'apiV3Key',
  apiV3Key: 'apiV3Key',
  certSerialNo: 'certSerialNo',
  certUploaded: 'certUploaded',
  wx_pay_notify_url: 'paymentNotifyUrl',
  paymentNotifyUrl: 'paymentNotifyUrl',
  wx_refund_notify_url: 'refundNotifyUrl',
  refundNotifyUrl: 'refundNotifyUrl',
  privacy_policy_url: 'privacyPolicyUrl',
  privacyPolicyUrl: 'privacyPolicyUrl',
  user_agreement_url: 'userAgreementUrl',
  userAgreementUrl: 'userAgreementUrl',
  service_phone: 'servicePhone',
  servicePhone: 'servicePhone',
}

export function extractConfigList(payload: unknown): RawConfigItem[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as RawConfigItem[]
  if (typeof payload === 'object' && Array.isArray((payload as { configs?: RawConfigItem[] }).configs)) {
    return (payload as { configs: RawConfigItem[] }).configs
  }
  return []
}

export function readConfigEntry(item: RawConfigItem): { key: string; value: string } {
  return {
    key: item.configKey || item.key || '',
    value: String(item.configValue ?? item.value ?? ''),
  }
}

export function isMaskedSensitiveValue(value: string): boolean {
  return value.includes('****')
}

export function shouldSkipSensitiveSave(formKey: string, value: unknown): boolean {
  if (!SENSITIVE_FORM_KEYS.has(formKey)) return false
  const text = String(value ?? '').trim()
  return !text || isMaskedSensitiveValue(text)
}

export function toConfigUpdateItems(data: Record<string, unknown>, group: string) {
  return Object.entries(data)
    .filter(([key, value]) => !shouldSkipSensitiveSave(key, value))
    .map(([key, value]) => ({
      configKey: FORM_TO_DB_KEY[key] || key,
      configValue: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
      configGroup: group,
      description: key,
    }))
}

/** 配置列表中是否已有上传密钥（脱敏值也算已配置） */
export function hasStoredUploadKey(configs: RawConfigItem[]): boolean {
  return configs.some((item) => {
    const { key, value } = readConfigEntry(item)
    if (key !== 'wx_upload_key' && key !== 'uploadKey') return false
    const text = String(value ?? '').trim()
    return !!text && (text.includes('PRIVATE KEY') || text.includes('****'))
  })
}

export function applyConfigListToForm(
  configs: RawConfigItem[],
  targets: Array<Record<string, unknown>>,
  keyMap: Record<string, string> = DB_TO_FORM_KEY,
) {
  configs.forEach((item) => {
    const { key: rawKey, value } = readConfigEntry(item)
    if (!rawKey) return

    const formKey = keyMap[rawKey] || rawKey
    if (shouldSkipSensitiveSave(formKey, value)) return

    targets.forEach((target) => {
      if (!(formKey in target)) return
      const current = target[formKey]
      if (typeof current === 'boolean') {
        target[formKey] = value === 'true'
      } else if (typeof current === 'number') {
        target[formKey] = Number(value) || 0
      } else {
        target[formKey] = value
      }
    })
  })
}
