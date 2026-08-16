/**
 * 从商品详情归一化规格组 / SKU / 图片
 * 后端 SKU.specs 为 { 规格名: 规格值 }，没有独立 specs 数组
 */
function parseMaybeJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value
  if (typeof value !== 'string' || !value.trim()) return fallback
  try {
    return JSON.parse(value)
  } catch (e) {
    return fallback
  }
}

function buildSpecGroupsFromSkus(skus) {
  const order = []
  const map = {}
  ;(skus || []).forEach((sku) => {
    const specs = (sku && (sku.specs || sku.specMap)) || {}
    const keys = Object.keys(specs)
    if (keys.length) {
      keys.forEach((name) => {
        if (!map[name]) {
          map[name] = new Set()
          order.push(name)
        }
        map[name].add(String(specs[name]))
      })
      return
    }
    const label = (sku && (sku.skuName || sku.name)) || ''
    if (!label) return
    if (!map['规格']) {
      map['规格'] = new Set()
      order.push('规格')
    }
    map['规格'].add(String(label))
  })
  return order.map((name) => ({
    name,
    values: Array.from(map[name]),
  }))
}

function matchSkuBySpecs(skus, selectedValues, specList) {
  const list = skus || []
  if (!list.length) return null
  const names = (specList && specList.length)
    ? specList.map((s) => s.name)
    : Object.keys(selectedValues || {})
  if (!names.length) return list[0]

  for (const sku of list) {
    const specs = sku.specs || sku.specMap || {}
    let matched = true
    for (const name of names) {
      const want = selectedValues[name]
      if (want == null || want === '') {
        matched = false
        break
      }
      const got = specs[name] != null ? String(specs[name]) : ''
      if (got) {
        if (got !== String(want)) {
          matched = false
          break
        }
        continue
      }
      // 无 specs 时退回 skuName
      if (String(sku.skuName || sku.name || '') !== String(want)) {
        matched = false
        break
      }
    }
    if (matched) return sku
  }
  return null
}

function normalizeProductDetail(raw) {
  const product = { ...(raw || {}) }
  let images = parseMaybeJson(product.images, [])
  if (!Array.isArray(images)) images = []
  images = images.filter(Boolean)
  const mainImage = product.mainImage || product.main_image || product.cover_url || product.image || ''
  if (!images.length && mainImage) images = [mainImage]
  product.images = images
  product.image = images[0] || mainImage || ''
  product.mainImage = mainImage || images[0] || ''

  let skus = product.skus || product.sku_list || product.skuList || []
  if (!Array.isArray(skus)) skus = []
  skus = skus.map((sku) => {
    const specs = parseMaybeJson(sku.specs, sku.specs || {})
    return {
      ...sku,
      specs: specs && typeof specs === 'object' && !Array.isArray(specs) ? specs : {},
      price: sku.price != null ? sku.price : product.price,
      stock: sku.stock != null ? sku.stock : product.stock,
      skuName: sku.skuName || sku.name || '',
    }
  })

  // 无 SKU 时补一条默认，保证规格弹层有选项可点
  if (!skus.length) {
    skus = [{
      id: null,
      skuName: '标准规格',
      name: '标准规格',
      price: product.price,
      stock: product.stock || 0,
      specs: { 规格: '标准规格' },
      _virtual: true,
    }]
  }

  let specList = product.specs || product.spec_list || product.specList || []
  if (!Array.isArray(specList) || !specList.length) {
    specList = buildSpecGroupsFromSkus(skus)
  } else {
    specList = specList.map((spec) => ({
      name: spec.name || spec.specName || '规格',
      values: Array.isArray(spec.values)
        ? spec.values.map(String)
        : (Array.isArray(spec.options) ? spec.options.map(String) : []),
    })).filter((s) => s.values.length)
    if (!specList.length) specList = buildSpecGroupsFromSkus(skus)
  }

  product.skuList = skus
  product.specList = specList
  product.original_price = product.original_price != null
    ? product.original_price
    : product.originalPrice
  return product
}

function pickDefaultSelection(product) {
  const skus = product.skuList || []
  const specs = product.specList || []
  const selectedSku = skus[0] || null
  const selectedSkuValues = {}
  if (selectedSku && specs.length) {
    const skuSpecs = selectedSku.specs || {}
    specs.forEach((spec) => {
      if (skuSpecs[spec.name] != null) {
        selectedSkuValues[spec.name] = String(skuSpecs[spec.name])
      } else if (spec.values && spec.values.length) {
        selectedSkuValues[spec.name] = String(spec.values[0])
      }
    })
  } else if (selectedSku && (selectedSku.skuName || selectedSku.name)) {
    selectedSkuValues['规格'] = selectedSku.skuName || selectedSku.name
  }
  return { selectedSku, selectedSkuValues }
}

module.exports = {
  normalizeProductDetail,
  matchSkuBySpecs,
  pickDefaultSelection,
  buildSpecGroupsFromSkus,
}
