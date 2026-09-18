/**
 * 暖阁首页默认模板：固定版式下的可组合区块。
 * warm_home 整页壳只作为「套用模板」入口，不作为内部积木。
 */

const NATIVE_HOME_TYPES = {
  warm_greet: true,
  warm_authors: true,
  warm_feature: true,
  warm_columns: true,
  warm_planet_rec: true,
  warm_feed: true,
}

function isNativeHomeType(type) {
  return !!NATIVE_HOME_TYPES[String(type || '')]
}

function defaultHomeBlocks(over) {
  const o = over || {}
  return [
    {
      id: 'wh-greet',
      type: 'warm_greet',
      props: {
        greet_template: o.greetTemplate || '你好',
        show_notice: true,
        show_search: true,
        search_placeholder: '搜索文章、笔记、专栏……',
        show_nav: true,
      },
    },
    {
      id: 'wh-authors',
      type: 'warm_authors',
      props: {
        title: o.authorsTitle || '暖阁出品',
        more_text: '全部作者 ›',
        more_url: '/pages/author-list/author-list',
        more_tab: false,
      },
    },
    {
      id: 'wh-feature',
      type: 'warm_feature',
      props: { empty_text: '暂无精选内容' },
    },
    {
      id: 'wh-columns',
      type: 'warm_columns',
      props: {
        title: o.columnsTitle || '精品专栏',
        more_text: '全部 ›',
        more_url: '/pages/shop/shop',
        more_tab: true,
      },
    },
    {
      id: 'wh-planet',
      type: 'warm_planet_rec',
      props: {
        title: o.planetTitle || '我的星球',
        more_text: '进入 ›',
        more_url: '/pages/planet-list/planet-list',
        more_tab: false,
        feed_url: '/pages/planet-feed/planet-feed?planetId=warm-main',
      },
    },
    {
      id: 'wh-feed',
      type: 'warm_feed',
      props: { footer: '暖阁 · 慢一点，也很好' },
    },
  ]
}

function shellOverrides(props) {
  const p = props || {}
  return {
    greetTemplate: p.greet_template || p.greetTemplate || '',
    authorsTitle: p.authors_title || p.authorsTitle || '',
    columnsTitle: p.columns_title || p.columnsTitle || '',
    planetTitle: p.planet_title || p.planetTitle || '',
  }
}

function isWarmHomeShellOnly(components) {
  const list = (components || []).filter((c) => c && c.type && c.type !== 'float_button')
  return list.length > 0 && list.every((c) => c.type === 'warm_home')
}

function normalizeWarmPlanetRecProps(props) {
  const p = Object.assign({}, props || {})
  const more = String(p.more_url || p.moreUrl || '').trim()
  // 旧装修仍指向星球 Tab 时，改到社区列表
  if (!more || /\/pages\/planet\/planet\/?$/.test(more) || more === '/pages/planet/planet') {
    p.more_url = '/pages/planet-list/planet-list'
  } else {
    p.more_url = more
  }
  p.more_tab = false
  p.more_text = p.more_text || p.moreText || '进入 ›'
  const feed = String(p.feed_url || p.feedUrl || '').trim()
  if (!feed || /\/pages\/planet\/planet\/?$/.test(feed)) {
    p.feed_url = '/pages/planet-feed/planet-feed?planetId=warm-main'
  } else {
    p.feed_url = feed
  }
  return p
}

function expandHomeComponents(components) {
  const raw = (components || []).filter((c) => c && c.type)
  const flow = raw.filter((c) => c.type !== 'float_button' && c.visible !== false)
  const floats = raw.filter((c) => c.type === 'float_button' && c.visible !== false)
  if (!flow.length || isWarmHomeShellOnly(flow)) {
    const over = flow[0] ? shellOverrides(flow[0].props) : {}
    return { flow: defaultHomeBlocks(over), floats }
  }
  return {
    flow: flow.map((c) => {
      if (!c || c.type !== 'warm_planet_rec') return c
      return Object.assign({}, c, { props: normalizeWarmPlanetRecProps(c.props) })
    }),
    floats,
  }
}

function annotateHomeBlocks(blocks) {
  return (blocks || []).map((c, i) => {
    const next = {
      ...c,
      id: c.id || `wh-${c.type}-${i}`,
      _native: isNativeHomeType(c.type),
    }
    if (next.type === 'warm_planet_rec') {
      next.props = normalizeWarmPlanetRecProps(next.props)
    }
    return next
  })
}

module.exports = {
  NATIVE_HOME_TYPES,
  isNativeHomeType,
  defaultHomeBlocks,
  isWarmHomeShellOnly,
  expandHomeComponents,
  annotateHomeBlocks,
  normalizeWarmPlanetRecProps,
}
