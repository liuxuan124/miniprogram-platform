# 暖阁 Tab DSL 与预览契约

## 首页块模板单源

- 文件：`miniapp/data/warm-home-blocks.json`
- 小程序：`miniapp/utils/warm-home-template.js` → `defaultHomeBlocks()`
- 管理端：`admin/src/utils/warmHomeBlocks.ts` → `createWarmHomeTemplateComponents()`
- 壳组件 `warm_home` 发布后在真机与管理端均通过「展开为六块」逻辑渲染，仅 props 覆盖标题等字段。

## 数据真源

- 暖阁首页列表/精选/专栏/星球/信息流：`GET /api/v1/mp/home/warm`（与 C 端一致）
- 发现 Tab 列表：`GET /api/v1/mp/contents` + DSL `warm_discover.tabs` / `article_layout`
- 星球/商城/我的 Tab：各走现有 mp 接口；管理端 `WarmTabPreview` 拉同源公开接口

## 管理端预览

- 暖阁六块：`DslWarmBlock.vue` + `useWarmHomePreview`（画布 / 全屏预览 inject）
- 固定 Tab 壳：`WarmTabPreview.vue`（单组件 warm_discover 等）
- 通用装修组件：`hydratePreviewDsl`（`useCanvasHydratedPreview`）

## 禁止

- 生产包长期 `FORCE_LOCAL_DEMO=true` 作为线上预览标准
- 将 API 返回的长列表写入 DSL 持久化
