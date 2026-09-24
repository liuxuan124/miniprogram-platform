import { describe, expect, it } from 'vitest'
import { demoMaterialItems, formatFileSize, mapMaterialRecord, resolveMaterialAccess } from './dsl-material'

describe('dsl-material', () => {
  it('formats file size', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(2048)).toContain('KB')
    expect(formatFileSize(5 * 1024 * 1024)).toContain('MB')
  })

  it('resolves access tags', () => {
    expect(resolveMaterialAccess({ canDownload: true }).type).toBe('free')
    expect(resolveMaterialAccess({ minDownloadLevelName: '年度会员' }).type).toBe('vip')
    expect(resolveMaterialAccess({ boundProductId: 1, price: '19' }).label).toContain('19')
  })

  it('maps demo list snapshot', () => {
    expect(demoMaterialItems(2)).toMatchInlineSnapshot(`
      [
        {
          "access": {
            "label": "免费",
            "type": "free",
          },
          "downloadCount": 1280,
          "fileColor": "#E74C3C",
          "fileIcon": "PDF",
          "fileType": "pdf",
          "id": 1,
          "link_url": "/pages/resource-detail/resource-detail?id=1",
          "metaLine": "48 页 · 2.3 MB",
          "sizeText": "2.3 MB",
          "title": "2026 跨境合规白皮书.pdf",
        },
        {
          "access": {
            "label": "VIP",
            "type": "vip",
          },
          "downloadCount": 860,
          "fileColor": "#27AE60",
          "fileIcon": "X",
          "fileType": "xlsx",
          "id": 2,
          "link_url": "/pages/resource-detail/resource-detail?id=2",
          "metaLine": "508 KB",
          "sizeText": "508 KB",
          "title": "关税测算表.xlsx",
        },
      ]
    `)
  })

  it('maps admin file record', () => {
    const item = mapMaterialRecord({ id: 9, name: '测试.pdf', fileType: 'pdf', size: 1024 })
    expect(item.title).toBe('测试.pdf')
    expect(item.fileIcon).toBe('PDF')
  })
})
