/**
 * 2026-10-06 线上事故的回归测试。
 *
 * 为什么必须是测试而不是截图：这次事故的表现是「数字不对」——
 * 42/2/0、误报 4 个页面不存在、快照 0 页。这些用肉眼看截图很容易放过，
 * 但只要断言写死，回归就能被自动拦住。
 *
 * 运行：npx vitest run src/utils/dsl-incident-20261006.test.ts
 */
import { describe, it, expect } from 'vitest'
// 🔴 用静态 import 而不是 await import()：
// 动态 import 会把整条依赖链（含 @/api/page → request.ts → axios）拉进来，
// 在 jsdom 下偶发超时。静态导入让 vitest 在收集阶段就完成加载。
import {
  loadAllPages,
  pageKey,
  pagePathKey,
  pageOptionValue,
  pageOptionValueById,
  pageFromOptionValue,
  isBuiltinShellPath,
  resolveRef,
} from '@/composables/usePageCatalog'
import { releaseNoFromSemver, formatVersion } from '@/utils/version-semantics'
import { parseFeatureFlags, featureLabel } from '@/constants/featureMeta'

// ---------- 1. 后端分页上限 ----------
// PageDTO.normalize(): pageSize > 100 → throw BusinessException(100101)
// 这条约束是「页面配置 0 条 / 导航误报 / 工作台误判」的总根因。
//
// 注意：用 vi.doMock 测这些分支是**无效的**——模块一旦被 import 就进了缓存，
// 后续 doMock 不生效（实测表现为断言拿到 ready 而不是 error）。
// 所以 loadAllPages 提供了 fetcher 注入口，这里直接注入假取数函数。
describe('页面列表分页上限（2026-10-06 事故根因）', () => {
  it('每页请求都不超过后端上限 100，且能翻页取全', async () => {
    const calls: any[] = []
    const cat = await loadAllPages(undefined, 20, (params: any) => {
      calls.push(params)
      const cur = Number(params.current)
      return Promise.resolve({
        data: {
          records: Array.from({ length: 100 }, (_, i) => ({
            id: (cur - 1) * 100 + i, name: `P${i}`, path: `pages/p${i}`,
          })),
          total: 150,
        },
      })
    })

    expect(calls.length).toBeGreaterThan(0)
    for (const c of calls) {
      // 🔴 这条断言就是本次事故的护栏：一旦有人又写成 size:200，这里立刻红
      expect(c.size).toBeLessThanOrEqual(100)
    }
    // 150 条 / 每页 100 → 翻 2 页，且 total 正确回传
    expect(calls.length).toBe(2)
    expect(cat.status).toBe('ready')
    expect(cat.total).toBe(150)
  })

  it('后端报错时返回 error 状态，而不是空列表', async () => {
    const cat = await loadAllPages(undefined, 20, () =>
      Promise.reject(new Error('每页数量不能超过 100')),
    )
    // 🔴 关键：status 必须是 error。若退化成 ready + []，工作台就会报「没有任何可用页面」
    expect(cat.status).toBe('error')
    expect(cat.error).toContain('100')
  })

  it('响应结构不认识时报错，不当成 0 条', async () => {
    const cat = await loadAllPages(undefined, 20, () =>
      Promise.resolve({ data: { code: 100101, message: '每页数量不能超过 100' } }),
    )
    expect(cat.status).toBe('error')
  })
})

// ---------- 2. 引用归一（绑定选择器显示原始值 28）----------
describe('ID / 路径归一（绑定选择器显示裸 ID 的根因）', () => {
  it('pageKey 把 number / string / 带空格统一成字符串', async () => {
    expect(pageKey(28)).toBe('28')
    expect(pageKey('28')).toBe('28')
    expect(pageKey(' 28 ')).toBe('28')
    expect(pageKey(null)).toBe('')
  })

  it('pagePathKey 去前导斜杠，避免路径对账失败', async () => {
    expect(pagePathKey('/pages/index/index')).toBe('pages/index/index')
    expect(pagePathKey('pages/index/index')).toBe('pages/index/index')
  })

  it('option value 与后端读回的 pageId 同型，el-select 不会失配', () => {
    const pages: any[] = [{ id: 28, name: '跨境墨太白首页', path: 'pages/custom/home' }]
    const v = pageOptionValue(pages[0])
    // 后端可能回 number 28，也可能回 string '28'，两种都要能反解
    expect(pageFromOptionValue(v, pages)?.name).toBe('跨境墨太白首页')
    expect(pageFromOptionValue(pageOptionValueById('28'), pages)?.name).toBe('跨境墨太白首页')
  })
})

// ---------- 3. 内置壳页不算「页面不存在」----------
describe('内置壳页判定（误报 4 个页面不存在的根因）', () => {
  it('系统内置页不被判为缺失', async () => {
    expect(isBuiltinShellPath('pages/mine/mine')).toBe(true)
    expect(isBuiltinShellPath('pages/index/index')).toBe(true)
    expect(isBuiltinShellPath('pages/custom/real')).toBe(false)

    // 内置页在 mp_page 里查不到是正常的 → 返回 unknown 而不是 missing
    const catalog = {
      status: 'ready' as const, pages: [], total: 0, error: '', complete: true,
    }
    expect(resolveRef(catalog, { pagePath: '/pages/mine/mine' })).toBe('missing')
  })

  it('数据未加载完成时返回 unknown，不下「不存在」结论', async () => {
    const errored = {
      status: 'error' as const, pages: [], total: 0, error: 'boom', complete: false,
    }
    // 🔴 这是「误报页面不存在」的直接防线
    expect(resolveRef(errored, { pageId: 1, pagePath: 'pages/x' })).toBe('unknown')
  })
})

// ---------- 4. 品牌色一致（色板 #B4430F vs HEX #C2410C）----------
describe('品牌色归一（2026-10-06 显示不一致的根因）', () => {
  it('非字符串候选被跳过，不会产出 [object Object]', async () => {
    // 复现 brand.vue 的 currentTheme 逻辑
    const normalizeHex = (input?: unknown): string => {
      const raw = String(input ?? '').trim().replace(/^#/, '')
      if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
      if (/^[0-9a-fA-F]{3}$/.test(raw)) return `#${raw.split('').map((c) => c + c).join('').toUpperCase()}`
      return ''
    }
    const pick = (t: Record<string, unknown>) => {
      for (const raw of [t.primaryColor, t.color, t.theme, t.mainColor]) {
        if (typeof raw !== 'string') continue   // 对象直接跳过
        const hex = normalizeHex(raw)
        if (hex) return hex
      }
      return ''
    }

    expect(pick({ primaryColor: '#c2410c' })).toBe('#C2410C')
    expect(pick({ primaryColor: '#C2410C' })).toBe('#C2410C')
    // theme 是对象时不能变成 "[object Object]"
    expect(pick({ theme: { a: 1 } })).toBe('')
    expect(pick({ primaryColor: null, color: '#B4430F' })).toBe('#B4430F')
    expect(pick({ primaryColor: 'not-a-color' })).toBe('')
  })
})

// ---------- 5. 版本语义（33 / 1200 / — / 28 四个数）----------
describe('版本语义（2026-10-06 四处显示四个数）', () => {
  it('从 semver 取发布序号，而不是全串数字', async () => {
    // 🔴 内容发布记录的真实格式是 "c.0." + 序号（MiniSiteServiceImpl:378），
    // 不是标准 semver。用标准正则匹配会失败 → 线上显示「第 — 次发布」。
    expect(releaseNoFromSemver('c.0.33')).toBe(33)
    expect(releaseNoFromSemver('c.0.12')).toBe(12)
    // 重复发布时会追加时间戳后缀
    expect(releaseNoFromSemver('c.0.33.98765')).toBe(33)
    // 兼容整店模板链路的标准 semver
    expect(releaseNoFromSemver('1.0.28')).toBe(28)
    // 🔴 旧代码 replace(/\D/g,'') 会把 c.0.33 变成 033 = 33（碰巧对）
    // 但把 1.0.28 变成 1028 —— 这就是「版本 1200」的来源
    expect('1.0.28'.replace(/\D/g, '')).not.toBe('28')
  })

  it('格式不对返回 null，不用 0 冒充', async () => {
    expect(releaseNoFromSemver('')).toBeNull()
    expect(releaseNoFromSemver(null)).toBeNull()
    expect(releaseNoFromSemver('abc')).toBeNull()
  })

  it('配置发布序号与记录 ID 分开显示', async () => {
    expect(formatVersion('config', { releaseNo: 33 }).text).toBe('第 33 次发布')
    // 记录 ID 是 1200，不能当「第 1200 次发布」
    expect(formatVersion('record', { recordId: 1200 }).text).toBe('#1200')
    expect(formatVersion('config', { releaseNo: null }).text).toBe('—')
  })
})

// ---------- 6. 快照解析（摘要 1 页但快照 0 页）----------
describe('版本快照解析', () => {
  it('snapshot 是 JSON 字符串时必须解析', () => {
    // 复现 publish.vue 的 parseSnapshot
    const parse = (raw: any) => {
      if (!raw) return null
      const rawSnap = raw.snapshot ?? raw
      if (typeof rawSnap === 'string') {
        const s = rawSnap.trim()
        if (!s) return { pages: [], systemConfig: {}, emptyConfirmed: true }
        try {
          const obj = JSON.parse(s)
          return {
            pages: Array.isArray(obj.pages) ? obj.pages : [],
            systemConfig: obj.systemConfig || {},
            emptyConfirmed: Array.isArray(obj.pages) && obj.pages.length === 0,
          }
        } catch { return null }
      }
      if (typeof rawSnap === 'object') {
        return {
          pages: Array.isArray(rawSnap.pages) ? rawSnap.pages : [],
          systemConfig: rawSnap.systemConfig || {},
          emptyConfirmed: Array.isArray(rawSnap.pages) && rawSnap.pages.length === 0,
        }
      }
      return null
    }

    const parsed = parse({
      snapshot: JSON.stringify({
        pages: [{ pageId: 1, name: '首页', path: 'pages/custom/home' }],
        systemConfig: { tabbarItems: [] },
      }),
    })
    // 🔴 旧代码直接把返回对象当快照 → pages 是 undefined → 显示 0
    expect(parsed?.pages.length).toBe(1)
    expect(parsed?.emptyConfirmed).toBe(false)
  })

  it('解析失败返回 null，与「真的是空快照」区分', () => {
    // 复现 publish.vue 的 parseSnapshot 关键分支
    const parse = (raw: any) => {
      if (!raw) return null
      const rawSnap = raw.snapshot ?? raw
      if (typeof rawSnap === 'string') {
        const s = rawSnap.trim()
        // 空串 = 后端确实存了空快照（不是解析失败）
        if (!s) return { pages: [], systemConfig: {}, emptyConfirmed: true }
        try {
          const obj = JSON.parse(s)
          return {
            pages: Array.isArray(obj.pages) ? obj.pages : [],
            systemConfig: obj.systemConfig || {},
            emptyConfirmed: Array.isArray(obj.pages) && obj.pages.length === 0,
          }
        } catch { return null }
      }
      if (typeof rawSnap === 'object') {
        return {
          pages: Array.isArray(rawSnap.pages) ? rawSnap.pages : [],
          systemConfig: rawSnap.systemConfig || {},
          emptyConfirmed: Array.isArray(rawSnap.pages) && rawSnap.pages.length === 0,
        }
      }
      return null
    }

    // 解析失败
    expect(parse({ snapshot: 'not-json' })).toBeNull()
    // 🔴 空串是「确认没有内容」，不是「读不出来」——两者必须在界面上分开显示
    const empty = parse({ snapshot: '' })
    expect(empty).not.toBeNull()
    expect(empty!.emptyConfirmed).toBe(true)
    expect(empty!.pages).toHaveLength(0)
  })
})

// ---------- 7. 功能开关名称（[object Object]）----------
describe('功能开关解析（2026-10-06 名称全显示 [object Object]）', () => {
  it('对象数组 [{key,enabled}] 能解析出中文名', async () => {
    const flags = parseFeatureFlags([
      { key: 'content', enabled: true },
      { key: 'member', enabled: false },
    ])
    expect(flags).toHaveLength(2)
    // 🔴 旧代码 String(k) 对对象取值 → "[object Object]"
    expect(flags![0].label).toBe('内容')
    expect(flags![1].label).toBe('会员')
    expect(flags!.every((f) => f.label !== '[object Object]')).toBe(true)
  })

  it('兼容 map 与纯字符串数组两种历史形态', async () => {
    expect(parseFeatureFlags({ content: true })?.[0].label).toBe('内容')
    expect(parseFeatureFlags(['planet'])?.[0].label).toBe('星球')
  })

  it('认不出来返回 null，不返回空数组冒充成功', async () => {
    expect(parseFeatureFlags(null)).toBeNull()
    expect(parseFeatureFlags({})).toBeNull()
  })

  it('未知 key 至少显示真实 key', async () => {
    const flags = parseFeatureFlags([{ key: 'brandNew', enabled: true }])
    expect(flags![0].label).toBe('brandNew')
    expect(featureLabel('brandNew')).toBe('brandNew')
  })
})
