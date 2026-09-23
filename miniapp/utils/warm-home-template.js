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

const HOME_BLOCKS_JSON = require('../data/warm-home-blocks.json')

function cloneBlock(block, over) {
  const o = over || {}
  const next = {
    id: block.id,
    type: block.type,
    props: Object.assign({}, block.props || {}),
  }
  if (block.type === 'warm_greet' && o.greetTemplate) {
    next.props.greet_template = o.greetTemplate
  }
  if (block.type === 'warm_authors' && o.authorsTitle) {
    next.props.title = o.authorsTitle
  }
  if (block.type === 'warm_columns' && o.columnsTitle) {
    next.props.title = o.columnsTitle
  }
  if (block.type === 'warm_planet_rec' && o.planetTitle) {
    next.props.title = o.planetTitle
  }
  return next
}

function defaultHomeBlocks(over) {
  const list = (HOME_BLOCKS_JSON && HOME_BLOCKS_JSON.blocks) || []
  return list.map((b) => cloneBlock(b, over))
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
