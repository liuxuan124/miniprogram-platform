const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const EVID = path.resolve(__dirname, '../evidence/note-feed-verify')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  fs.mkdirSync(EVID, { recursive: true })
  const report = { ok: false, shots: [], errors: [], meta: {} }

  let mp
  try {
    mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
    await sleep(2000)

    await mp.switchTab('/pages/content-list/content-list')
    await sleep(2500)

    report.shots.push(path.join(EVID, '01-content-list-all.png'))
    await mp.screenshot({ path: report.shots[0] })

    const page = await mp.currentPage()
    const data = await page.data()
    report.meta.initial = {
      path: page.path,
      dslMode: data.dslMode,
      notes: Array.isArray(data.notes) ? data.notes.length : 0,
      allArticles: Array.isArray(data.allArticles) ? data.allArticles.length : 0,
    }

    const chips = await page.$$('.fmt-chip')
    for (const chip of chips) {
      const t = await chip.text()
      if (t && t.includes('笔记')) {
        await chip.tap()
        break
      }
    }
    await sleep(1800)

    report.shots.push(path.join(EVID, '02-content-list-notes-filter.png'))
    await mp.screenshot({ path: report.shots[1] })

    const data2 = await page.data()
    report.meta.filtered = {
      notes: Array.isArray(data2.notes) ? data2.notes.length : 0,
      titles: (data2.notes || []).slice(0, 4).map((n) => n.title),
    }

    const cards = await page.$$('.c-note')
    if (cards.length) {
      await cards[0].tap()
      await sleep(2200)
      report.shots.push(path.join(EVID, '03-note-detail.png'))
      await mp.screenshot({ path: report.shots[2] })
      const detail = await mp.currentPage()
      const dd = await detail.data()
      report.meta.detail = {
        path: detail.path,
        isNote: dd.isNote,
        galleryCount: dd.galleryCount,
        title: dd.article && dd.article.title,
      }
    } else {
      report.errors.push('no note cards rendered')
    }

    report.ok = report.meta.filtered.notes >= 4 && report.shots.length >= 3
  } catch (e) {
    report.errors.push(String(e && e.message || e))
  } finally {
    if (mp) {
      try { await mp.disconnect() } catch (_) {}
    }
  }

  fs.writeFileSync(path.join(EVID, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.ok ? 0 : 1)
}

main()
