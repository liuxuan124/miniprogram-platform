// components/dsl-audio/dsl-audio.js — 音频卡片组件
const { resolveMediaUrl } = require('../../utils/media-url')

function fmtTime(sec) {
  const s = Math.floor(Number(sec) || 0)
  const m = Math.floor(s / 60)
  const r = s % 60
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r
}

Component({
  properties: {
    config: { type: Object, value: {} },
    styleString: { type: String, value: '' },
  },
  data: {
    isPlaying: false,
    progress: 0,
    currentTimeText: '00:00',
    durationText: '00:00',
    audioSrc: '',
  },
  lifetimes: {
    attached() {
      this._initAudio()
    },
    detached() {
      this._destroyAudio()
    },
  },
  observers: {
    'config': function (config) {
      if (config && (config.src || config.url || config.audio_url)) {
        this._initAudio()
      }
    },
  },
  methods: {
    _initAudio() {
      const cfg = this.data.config || {}
      const rawSrc = cfg.src || cfg.url || cfg.audio_url || ''
      const src = resolveMediaUrl(rawSrc)
      if (this._audio) {
        try { this._audio.destroy() } catch (e) {}
      }
      const audio = wx.createInnerAudioContext()
      audio.src = src
      audio.onTimeUpdate(() => {
        const cur = audio.currentTime || 0
        const dur = audio.duration || 0
        this.setData({
          progress: dur > 0 ? (cur / dur) * 100 : 0,
          currentTimeText: fmtTime(cur),
          durationText: fmtTime(dur),
        })
      })
      audio.onPlay(() => this.setData({ isPlaying: true }))
      audio.onPause(() => this.setData({ isPlaying: false }))
      audio.onEnded(() => this.setData({ isPlaying: false, progress: 0, currentTimeText: '00:00' }))
      audio.onError((e) => {
        console.warn('[DslAudio] 播放错误:', e)
        this.setData({ isPlaying: false })
      })
      this._audio = audio
      this.setData({ audioSrc: src, durationText: fmtTime(cfg.duration || 0) })
    },
    _destroyAudio() {
      if (this._audio) {
        try { this._audio.destroy() } catch (e) {}
        this._audio = null
      }
    },
    onTogglePlay() {
      if (!this._audio) return
      if (this.data.isPlaying) {
        this._audio.pause()
      } else {
        this._audio.play()
      }
    },
    onSliderChange(e) {
      if (!this._audio) return
      const v = Number(e.detail.value) || 0
      const dur = this._audio.duration || 0
      try { this._audio.seek(dur * v / 100) } catch (err) {}
    },
  },
})