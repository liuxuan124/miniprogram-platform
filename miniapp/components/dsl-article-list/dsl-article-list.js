// components/dsl-article-list/dsl-article-list.js — 文章列表组件
const { executeAction } = require('../../utils/render')

function stripHtml(value) {
  if (value == null) return ''
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatArticleMeta(item) {
  const summary = stripHtml(item.summary || item.description || item.meta)
  if (summary) return summary.length > 48 ? `${summary.slice(0, 48)}…` : summary
  const date = item.publishedAt || item.publish_time || item.created_at || item.createTime || item.createdAt
  if (date) return String(date).slice(0, 10)
  return '品牌内容'
}

function normalizeArticleItem(item, index) {
  return {
    id: item.id || `local_${index + 1}`,
    title: item.title || item.name || '文章标题',
    name: item.name || item.title || '文章标题',
    summary: stripHtml(item.summary || item.description || item.meta),
    description: stripHtml(item.description || item.summary || item.meta),
    cover_url: item.cover_url || item.cover || item.image || item.coverUrl || '',
    image: item.image || item.cover || item.cover_url || item.coverUrl || '',
    link_url: item.link_url || '',
    created_at: formatArticleMeta(item),
    publish_time: formatArticleMeta(item),
  }
}

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
    'runtimeData, config': function (runtimeData, config) {
      const list = this._normalizeDisplayData(runtimeData, config)
      this.setData({ displayData: list })
    },
  },

  methods: {
    _normalizeDisplayData(runtimeData, config) {
      if (Array.isArray(runtimeData) && runtimeData.length > 0) {
        return runtimeData.map((item, index) => normalizeArticleItem(item, index))
      }

      const items = Array.isArray(config && config.items) ? config.items : []
      const source = items.length ? items : [
        { title: '品牌故事：从内容到交易闭环', meta: '品牌内容 · 1280阅读' },
        { title: '选品指南：活动与商品联动', meta: '品牌内容 · 1280阅读' },
      ]
      const limit = Math.max(Number((config && config.limit) || source.length), 1)
      return source.slice(0, limit).map((item, index) => normalizeArticleItem(item, index))
    },

    /** 点击文章 */
    onTapArticle(e) {
      const id = e.currentTarget.dataset.id
      const article = this.data.displayData.find((a) => a.id === id)

      if (article && article.action) {
        executeAction(article.action)
      } else if (article && article.link_url) {
        executeAction({
          type: 'page',
          path: article.link_url,
        })
      } else {
        executeAction({
          type: 'page',
          path: '/pages/content-detail/content-detail?id=' + id,
        })
      }
    },
  },
})
