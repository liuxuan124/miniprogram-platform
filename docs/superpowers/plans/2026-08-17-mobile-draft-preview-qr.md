# Mobile Draft Preview QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 装修器预览弹窗可生成临时二维码，手机扫码看当前草稿；关预览即删除快照，下次重新生成。

**Architecture:** Admin POST 草稿 DSL → Redis 存快照（TTL 2h）返回 token → 前端画二维码指向 `/h5/draft-preview?token=` → 公开 GET 读 DSL 渲染；关弹窗 DELETE 清 Redis。

**Tech Stack:** Spring Boot + StringRedisTemplate；Vue3 + Element Plus；`qrcode` 前端库。

**Spec:** `docs/superpowers/specs/2026-08-17-mobile-draft-preview-qr-design.md`

## Global Constraints

- 关预览窗必须 DELETE，不占空间
- 生成时快照，不实时同步
- GET `/api/v1/mp/preview-drafts/{token}` permitAll
- DSL 体积上限约 2MB
- 本机 hostname 提示局域网/公网访问

## File Map

| File | Role |
|------|------|
| `backend/.../service/PreviewDraftService.java` | create/get/delete + Redis |
| `backend/.../controller/PreviewDraftController.java` | admin POST/DELETE |
| `backend/.../controller/MpPreviewDraftController.java` | public GET |
| `backend/.../dto/PreviewDraft*.java` | DTO/VO |
| `backend/.../config/SecurityConfig.java` | permit GET |
| `admin/src/api/preview-draft.ts` | API client |
| `admin/src/views/page-builder/MiniPreviewDialog.vue` | 扫码入口 + 作废 |
| `admin/src/views/page-builder/draft-preview.vue` | 手机 H5 页 |
| `admin/src/router/index.ts` + `guards.ts` | 白名单路由 |
| `admin/package.json` | 加 `qrcode` |

---

### Task 1: Backend preview draft store + APIs

**Files:**
- Create: service, DTOs, two controllers
- Modify: `SecurityConfig.java`
- Test: unit test create → get → delete → get 404

- [x] Implement Redis-backed service (key `preview:draft:{token}`, TTL 2h)
- [x] Admin create/delete; MP get
- [x] Security permitAll for GET
- [x] Verify with unit test

### Task 2: Admin API + QR in MiniPreviewDialog

**Files:**
- Create: `admin/src/api/preview-draft.ts`
- Modify: `MiniPreviewDialog.vue`
- Dep: `npm i qrcode` (+ types)

- [x] Button「手机扫码预览」→ create → show QR + link
- [x] Close/unmount → DELETE token
- [x] Localhost tip

### Task 3: Mobile H5 draft-preview page

**Files:**
- Create: `draft-preview.vue`
- Modify: router + guards

- [x] Load by token, render PreviewPhone
- [x] Invalid/expired empty state
- [ ] Manual smoke: generate → phone/new tab → close dialog → refresh fails
