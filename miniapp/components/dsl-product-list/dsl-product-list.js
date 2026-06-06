// components/dsl-product-list/dsl-product-list.js — 商品列表组件
const { executeAction } = require('../../utils/render')

Component({
  properties: {
    /** 组件配置 */
    config: {
      type: Object,
      value: {},
    },
    /** 运行时数据（由数据源填充） */
    runtimeData: {
      type: Array,
      value: [],
    },
    /** 组件动作列表 */
    actions: {
      type: Array,
      value: [],
    },
    /** 自定义样式 */
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    displayData: [],
  },

  observers: {
    'runtimeData, config': function () {
      this._refreshDisplayData()
    },
  },

  lifetimes: {
    attached() {
      this._refreshDisplayData()
    },
  },

  methods: {
    _refreshDisplayData() {
      const runtimeData = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      const fallback = [
        { id: 'preview-1', name: '湘品甄选礼盒', price: '99.00' },
        { id: 'preview-2', name: '药食同源组合', price: '99.00' },
        { id: 'preview-3', name: '品牌文创礼盒', price: '99.00' },
        { id: 'preview-4', name: '品牌定制马克杯', price: '99.00' },
      ]
      const source = runtimeData.length ? runtimeData : fallback
      const limit = Math.max(Number(this.data.config.limit || source.length), 1)
      const displayData = source.slice(0, limit).map((item, index) => ({
        ...item,
        _key: item._key || `product_${item.id || index}_${index}`,
      }))
      this.setData({ displayData })
    },

    /** 点击商品 */
    onTapProduct(e) {
      const id = e.currentTarget.dataset.id
      const product = this.data.displayData.find((p) => p.id === id)

      if (product && product.action) {
        executeAction(product.action)
      } else {
        // 默认跳转商品详情
        executeAction({
          type: 'page',
          path: '/pages/product-detail/product-detail?id=' + id,
        })
      }
    },
  },
})
