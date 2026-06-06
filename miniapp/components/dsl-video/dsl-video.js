// components/dsl-video/dsl-video.js — 视频组件
Component({
  properties: {
    /** 组件配置 */
    config: {
      type: Object,
      value: {},
    },
    /** 自定义样式 */
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    isPlaying: false,
  },

  methods: {
    /** 视频播放 */
    onPlay() {
      this.setData({ isPlaying: true })
    },

    /** 视频暂停 */
    onPause() {
      this.setData({ isPlaying: false })
    },

    /** 视频播放结束 */
    onEnded() {
      this.setData({ isPlaying: false })
    },

    /** 视频播放错误 */
    onError(e) {
      console.warn('[DslVideo] 视频播放错误:', e.detail)
    },
  },
})
