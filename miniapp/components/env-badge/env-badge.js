const { get } = require('../../utils/request')
const contentView = require('../../utils/content-view')

Component({
  data: {
    visible: false,
    label: '',
  },
  lifetimes: {
    attached() {
      this.refresh()
    },
  },
  pageLifetimes: {
    show() {
      this.refresh()
    },
  },
  methods: {
    refresh() {
      if (contentView.isReleaseEnv() && !contentView.isDraftPreviewActive()) {
        this.setData({ visible: false, label: '' })
        return
      }
      get('/api/v1/mp/runtime/env-badge', {}, { auth: false, showError: false })
        .then((badge) => {
          const preview = badge && badge.preview_active
          const releaseNo = (badge && badge.live_release_no) || '0'
          const wxVer = (badge && badge.wx_version) || ''
          const label = preview
            ? `草稿预览 · 线上第${releaseNo}次${wxVer ? ' · 代码' + wxVer : ''}`
            : ''
          this.setData({ visible: !!label, label })
        })
        .catch(() => {
          this.setData({ visible: contentView.isDraftPreviewActive(), label: '草稿预览' })
        })
    },
  },
})
