# BATCH-QA-023 UI FAIL 修复证据

时间：2026-08-16 13:15

## 修复项

| FP | 变更 |
| --- | --- |
| FP-UI-028 | `editor.vue` 加载失败提示条 + 重试/返回，移除静默 fallback |
| FP-UI-093 | `BannerProps.vue` 已有「裂图占位」；`BannerRenderer.vue` @error 切换占位图 |
| FP-UI-150/151 | `PropsPanel.vue` + `dataSourceValidation.ts` 展示 type/query 必填 |
| FP-UI-159 | `ArticleListProps.vue` 内容类型 query.type 筛选（article/image_text/video） |
| FP-UI-178 | `UnknownComponentRenderer.vue` + `ComponentItem.resolveRenderer` console.warn |

## 代码路径

- `admin/src/views/page-builder/editor.vue`
- `admin/src/components/page-builder/PropsPanel.vue`
- `admin/src/components/page-builder/dataSourceValidation.ts`
- `admin/src/components/page-builder/ComponentItem.vue`
- `admin/src/components/page-builder/renderers/UnknownComponentRenderer.vue`
- `admin/src/components/page-builder/props/BannerProps.vue`

## 台账

正式分母 268：**FAIL 6 → 0**（本批全部 PASS）
