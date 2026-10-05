/**
 * components/global-resource —— 全局资源位（弹窗 / 顶部横条 / 悬浮球 / 公告）
 *
 * 逐页注册使用（不要挂 app.json 全局，避免主包膨胀 + 影响所有分包）：
 *   ① 页面 json： "global-resource": "/components/global-resource/global-resource"
 *   ② 页面 wxml：页面根节点下加一行 <global-resource />
 *
 * 逻辑全在 utils/global-resource.js（可纯 Node 单测，本文件只做生命周期与事件转发）
 */
const Runtime = require('../../utils/global-resource')

Component({
  data: {
    slots: { popup: null, bar: null, float: null, bulletin: null },
    floatOpen: false,
  },

  lifetimes: {
    attached() {
      Runtime.sync(this)
      // app.js 的 onLaunch 拉配置是异步的，首帧可能还没到缓存 → 补一次延迟同步
      setTimeout(() => Runtime.sync(this), 1200)
    },
  },

  pageLifetimes: {
    show() {
      Runtime.sync(this)
    },
  },

  methods: {
    onClose(e) {
      Runtime.onClose.call(this, e.currentTarget.dataset.type)
    },
    onOpen() {
      Runtime.onOpen.call(this)
    },
    onGo(e) {
      Runtime.onGo.call(this, e)
    },
    noop() {},
  },
})