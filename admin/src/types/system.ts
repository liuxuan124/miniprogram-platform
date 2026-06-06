/**
 * 系统设置相关类型定义
 */

/** 配置分组枚举 */
export type ConfigGroup = 'basic' | 'wechat' | 'storage'

/** 单个配置项 */
export interface ConfigItem {
  key: string
  label: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'json'
  group: ConfigGroup
  description?: string
  options?: { label: string; value: string }[]
  updatedAt?: string
}

/** 配置分组数据 */
export interface ConfigGroupData {
  group: ConfigGroup
  label: string
  configs: ConfigItem[]
}

/** 基础配置表单 */
export interface BasicConfigForm {
  siteName: string
  siteLogo: string
  siteDescription: string
  siteKeywords: string
  siteIcp: string
  contactEmail: string
  contactPhone: string
  enableRegistration: boolean
  enableSms: boolean
  defaultLanguage: string
}

/** 微信小程序配置表单 */
export interface WechatConfigForm {
  appId: string
  appSecret: string
  originalId: string
  mchId: string
  mchKey: string
  enablePayment: boolean
  paymentNotifyUrl: string
  refundNotifyUrl: string
  qrcodeUrl: string
}

/** 存储配置表单 */
export interface StorageConfigForm {
  storageType: 'local' | 'oss' | 'cos' | 'qiniu'
  /** 本地存储 */
  localPath: string
  localDomain: string
  /** 阿里云 OSS */
  ossEndpoint: string
  ossBucket: string
  ossAccessKeyId: string
  ossAccessKeySecret: string
  ossDomain: string
  /** 腾讯云 COS */
  cosRegion: string
  cosBucket: string
  cosSecretId: string
  cosSecretKey: string
  cosDomain: string
  /** 七牛云 */
  qiniuDomain: string
  qiniuBucket: string
  qiniuAccessKey: string
  qiniuSecretKey: string
  /** 上传限制 */
  maxFileSize: number
  allowedExtensions: string
}

/** 操作日志 */
export interface OperationLog {
  id: number
  userId: number
  username: string
  module: string
  action: string
  content?: string
  method: string
  url: string
  ip: string
  userAgent: string
  params?: string
  result?: string
  status: 'success' | 'fail'
  duration: number
  createdAt: string
}

/** 操作日志查询参数 */
export interface OperationLogParams {
  page: number
  pageSize: number
  username?: string
  module?: string
  action?: string
  status?: 'success' | 'fail'
  startTime?: string
  endTime?: string
}

/** 文件上传结果 */
export interface UploadResult {
  url: string
  filename: string
  originalName: string
  size: number
  mimeType: string
}
