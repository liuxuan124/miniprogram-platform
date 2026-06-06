// pages/form/form.js — 动态表单页
// 根据表单模板动态渲染不同字段类型，支持提交

const formService = require('../../services/form')

// 字段类型常量
const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  PHONE: 'phone',
  EMAIL: 'email',
  DATE: 'date',
  TIME: 'time',
  IMAGE: 'image',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  SELECT: 'select',
  DISTRICT: 'district',
}

Page({
  data: {
    // 模板信息
    templateId: '',
    templateTitle: '',
    templateDesc: '',
    fields: [],

    // 表单值 { fieldKey: value }
    formValues: {},

    // 图片临时路径 { fieldKey: [tempFilePath, ...] }
    imageTempPaths: {},

    // 图片已上传URL { fieldKey: [url, ...] }
    imageUrls: {},

    // 地区选择器值 { fieldKey: [province, city, district] }
    districtValues: {},

    // 提交状态
    submitting: false,
    submitted: false,
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ templateId: id })
    this._loadTemplate(id)
  },

  /** 加载表单模板 */
  _loadTemplate(id) {
    wx.showLoading({ title: '加载中...' })
    formService.getFormTemplate(id)
      .then((res) => {
        wx.hideLoading()
        const fields = res.fields || []
        // 初始化表单值
        const formValues = {}
        const imageTempPaths = {}
        const imageUrls = {}
        const districtValues = {}
        fields.forEach((field) => {
          const key = field.key || field.name
          if (field.type === FIELD_TYPES.CHECKBOX) {
            formValues[key] = []
          } else if (field.type === FIELD_TYPES.IMAGE) {
            formValues[key] = []
            imageTempPaths[key] = []
            imageUrls[key] = []
          } else if (field.type === FIELD_TYPES.DISTRICT) {
            formValues[key] = ''
            districtValues[key] = []
          } else {
            formValues[key] = ''
          }
        })
        this.setData({
          templateTitle: res.title || '表单填写',
          templateDesc: res.description || '',
          fields,
          formValues,
          imageTempPaths,
          imageUrls,
          districtValues,
        })
        // 动态设置导航栏标题
        if (res.title) {
          wx.setNavigationBarTitle({ title: res.title })
        }
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
      })
  },

  /** 输入类字段变更 */
  onFieldInput(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    this.setData({ [`formValues.${key}`]: value })
  },

  /** 单选变更 */
  onRadioChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    this.setData({ [`formValues.${key}`]: value })
  },

  /** 多选变更 */
  onCheckboxChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    this.setData({ [`formValues.${key}`]: value })
  },

  /** 下拉选择变更 */
  onSelectChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    this.setData({ [`formValues.${key}`]: value })
  },

  /** 日期变更 */
  onDateChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    this.setData({ [`formValues.${key}`]: value })
  },

  /** 时间变更 */
  onTimeChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    this.setData({ [`formValues.${key}`]: value })
  },

  /** 地区选择变更 */
  onDistrictChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    const code = e.detail.code
    this.setData({
      [`formValues.${key}`]: value.join(''),
      [`districtValues.${key}`]: value,
    })
  },

  /** 选择图片 */
  onChooseImage(e) {
    const key = e.currentTarget.dataset.key
    const field = this._getFieldByKey(key)
    const maxCount = (field && field.max_count) || field.maxCount || 9
    const currentCount = (this.data.imageTempPaths[key] || []).length
    const remainCount = maxCount - currentCount

    if (remainCount <= 0) {
      wx.showToast({ title: `最多上传${maxCount}张图片`, icon: 'none' })
      return
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths
        const newPaths = (this.data.imageTempPaths[key] || []).concat(tempFilePaths)
        this.setData({ [`imageTempPaths.${key}`]: newPaths })
      },
    })
  },

  /** 预览图片 */
  onPreviewImage(e) {
    const key = e.currentTarget.dataset.key
    const index = e.currentTarget.dataset.index
    const urls = this.data.imageTempPaths[key] || []
    wx.previewImage({
      current: urls[index],
      urls: urls,
    })
  },

  /** 删除图片 */
  onDeleteImage(e) {
    const key = e.currentTarget.dataset.key
    const index = e.currentTarget.dataset.index
    const paths = this.data.imageTempPaths[key] || []
    paths.splice(index, 1)
    this.setData({ [`imageTempPaths.${key}`]: paths })
  },

  /** 提交表单 */
  onSubmitForm() {
    if (this.data.submitting) return

    // 表单验证
    const validation = this._validateForm()
    if (!validation.valid) {
      wx.showToast({ title: validation.message, icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    // 先上传图片，再提交表单
    this._uploadImages()
      .then(() => {
        // 将图片URL写入表单值
        const formValues = { ...this.data.formValues }
        Object.keys(this.data.imageUrls).forEach((key) => {
          formValues[key] = this.data.imageUrls[key]
        })
        this.setData({ formValues })

        return formService.submitForm(this.data.templateId, { fields: formValues })
      })
      .then(() => {
        this.setData({ submitting: false, submitted: true })
        wx.showToast({ title: '提交成功', icon: 'success' })
      })
      .catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '提交失败', icon: 'none' })
      })
  },

  /** 返回 */
  onGoBack() {
    wx.navigateBack()
  },

  /** 上传所有图片 */
  _uploadImages() {
    const uploadPromises = []
    const imageTempPaths = this.data.imageTempPaths
    const request = require('../../utils/request')

    Object.keys(imageTempPaths).forEach((key) => {
      const paths = imageTempPaths[key]
      paths.forEach((filePath) => {
        // 只上传临时文件（以 http 或 wxfile 开头的）
        if (filePath.indexOf('http') === 0 || filePath.indexOf('wxfile') === 0 || filePath.indexOf('tmp') >= 0) {
          const p = request.upload(filePath, { name: 'file', url: '/api/v1/mp/upload' })
            .then((res) => {
              const url = res.url || res
              const urls = this.data.imageUrls[key] || []
              urls.push(url)
              this.setData({ [`imageUrls.${key}`]: urls })
            })
          uploadPromises.push(p)
        }
      })
    })

    if (uploadPromises.length === 0) {
      return Promise.resolve()
    }

    wx.showLoading({ title: '上传图片中...' })
    return Promise.all(uploadPromises)
      .then(() => {
        wx.hideLoading()
      })
      .catch(() => {
        wx.hideLoading()
        return Promise.reject(new Error('图片上传失败'))
      })
  },

  /** 表单验证 */
  _validateForm() {
    const fields = this.data.fields
    const formValues = this.data.formValues
    const imageTempPaths = this.data.imageTempPaths

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      const key = field.key || field.name
      const label = field.label || field.title || key
      const required = field.required !== false

      if (!required) continue

      if (field.type === FIELD_TYPES.IMAGE) {
        const images = imageTempPaths[key] || []
        if (images.length === 0) {
          return { valid: false, message: `请上传${label}` }
        }
      } else if (field.type === FIELD_TYPES.CHECKBOX) {
        const values = formValues[key] || []
        if (values.length === 0) {
          return { valid: false, message: `请选择${label}` }
        }
      } else if (field.type === FIELD_TYPES.DISTRICT) {
        const value = formValues[key] || ''
        if (!value) {
          return { valid: false, message: `请选择${label}` }
        }
      } else {
        const value = (formValues[key] || '').toString().trim()
        if (!value) {
          return { valid: false, message: `请填写${label}` }
        }
        // 手机号格式校验
        if (field.type === FIELD_TYPES.PHONE) {
          if (!/^1[3-9]\d{9}$/.test(value)) {
            return { valid: false, message: `${label}格式不正确` }
          }
        }
        // 邮箱格式校验
        if (field.type === FIELD_TYPES.EMAIL) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return { valid: false, message: `${label}格式不正确` }
          }
        }
      }
    }

    return { valid: true }
  },

  /** 根据 key 获取字段定义 */
  _getFieldByKey(key) {
    return this.data.fields.find((f) => (f.key || f.name) === key)
  },
})
