const { parseDSL } = require('../../utils/render')

let GOLDEN_BATCHES_ALL = null
try {
  GOLDEN_BATCHES_ALL = require('../../data/golden-batches-all.json')
} catch (e) {
  GOLDEN_BATCHES_ALL = null
}

Page({
  data: {
    loading: true,
    error: '',
    flowComponents: [],
    floatComponents: [],
  },

  onLoad(query) {
    const batch = String((query && query.batch) || '1').trim()
    if (!GOLDEN_BATCHES_ALL || !GOLDEN_BATCHES_ALL[batch]) {
      this.setData({ loading: false, error: `缺少黄金批次 ${batch}` })
      return
    }
    try {
      const parsed = parseDSL(GOLDEN_BATCHES_ALL[batch])
      const flowComponents = []
      const floatComponents = []
      ;(parsed.components || []).forEach((item) => {
        if (item && item.type === 'float_button') floatComponents.push(item)
        else flowComponents.push(item)
      })
      this.setData({
        loading: false,
        error: '',
        flowComponents,
        floatComponents,
      })
    } catch (e) {
      this.setData({
        loading: false,
        error: e.message || '解析失败',
        flowComponents: [],
        floatComponents: [],
      })
    }
  },
})
