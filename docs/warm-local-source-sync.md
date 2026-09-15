# 暖阁本地源 → 服务器真源（P0）

## 已完成

1. **灌库迁移** `backend/.../V54__seed_warm_local_source.sql`  
   - 品牌「暖阁」、暖色主题、五 Tab、plugins、planet_config  
   - 内容 / 商品种子（`external_source=warm_seed`）

2. **关闭生产本地源** `miniapp/data/warm-source.js`  
   - `FORCE_LOCAL_DEMO = false` → `USE_LOCAL_SOURCE = false`  
   - 仅手动改 `FORCE_LOCAL_DEMO=true` 可本地无库演示  
   - 发现 / 星球 / 商城等走 API

3. **Tab 壳契约统一**  
   - Admin / 小程序：`首页 / 发现 / 星球 / 商城 / 我的`  
   - 旧壳 `content-list` / `knowledge-mall` / `tab-hub` 自动映射

4. **业态泄漏默认值清洗**  
   - 品牌默认「我的小程序」、组件/预览占位改为中性文案

## 部署时

```bash
# 后端启动 Flyway 自动执行 V54
# 或手动：
# mysql ... < backend/src/main/resources/db/migration/V54__seed_warm_local_source.sql
```

导出快照（可选）：

```bash
node scripts/export-warm-local-source.js
```

## 回滚演示模式

`miniapp/data/warm-source.js` 中设 `FORCE_LOCAL_DEMO = true`（勿用于生产包）。
