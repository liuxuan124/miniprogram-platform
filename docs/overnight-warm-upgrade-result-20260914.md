# Overnight warm upgrade result — 2026-09-14

## Done (Round 3)

- Public content list (`listPublishedContents`) excludes `planetExclusive=1` (planet has own feed).
- Fixed double view-count: planet-exclusive detail redirects to `getPublishedPlanetContentDetail` **before** incrementing views.
- Smoke-checked pages: `share` / `resources` / `file-preview` / `discover` / `shop` / `contribute` / `planet` / `join` — syntax OK; requires resolve; `utils/share.js` exports `createSharePageConfig` / `buildSharePath` / etc.
- `MpFileController`: list `@GetMapping` vs `@GetMapping("/{id}")` mapping OK.
- V52 ↔ entities aligned: Product member/delivery fields, Content `authorRole`/`auditStatus`/`visibility`, FileItem `preview*`, `PurchaseEntitlement`, `InviteScene`, AgentKnowledge `citePolicy` (planetExclusive from V51).

## Remaining (morning)

- Run Flyway through V52 on target DB if not yet applied.
- Manual: planet feed vs public content list isolation; open planet-exclusive detail once and confirm view_count +1 only.
- Manual: resources / file-preview membership gate; share invite attribution; shop/contribute/join copy & paths.
- Backend compile / restart after overnight Java changes.

## How to verify

1. `GET /api/v1/mp/contents` — no items with `planetExclusive=1`.
2. `GET /api/v1/mp/planet/contents` — planet-exclusive moments appear (member gate as configured).
3. Open same planet content via public detail URL once → DB `view_count` +1 (not +2).
4. WeChat DevTools: open the 8 pages above; no white-screen / module-not-found.
5. `GET /api/v1/mp/files` and `GET /api/v1/mp/files/{id}` both return 200 (not mapping clash).
