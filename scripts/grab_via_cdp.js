/**
 * 通过 CDP 接管已登录 Chrome，抓取 ima 全部图片签名 URL。
 *
 * 真实 API（抓包实测 2026-10-02）：
 *   POST /cgi-bin/knowledge_tab_reader/get_knowledge_base_home_page
 *   body: {knowledge_base_id, knowledge_list_req:{knowledge_base_id, folder_id, sort_type:9,
 *         need_default_cover:true, version}}
 *   resp: data.list_rsp.current_path / data.list_rsp.list
 *   code:0=成功，code:41=缺鉴权头
 *
 * 必需请求头（缺任一即 code:41）：
 *   from_browser_ima: 1
 *   x-ima-bkn: <从页面请求抓>
 *   x-ima-cookie: <含 IMA-GUID>
 *   extension_version: 999.999.999
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/xhs-images';
const LOG = (...a) => console.log(...a);

(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9222/');
  const ctx = b.contexts()[0];
  let page = ctx.pages().find(p => p.url().includes('ima.qq.com'));
  if (!page) { page = await ctx.newPage(); await page.goto('https://ima.qq.com/wikis'); }

  // 1) 让页面自己发一次请求，抄下完整 headers（含动态 bkn / cookie）
  let realHdrs = null;
  const onReq = r => {
    if (r.url().includes('get_knowledge_base_home_page')) realHdrs = r.headers();
  };
  page.on('request', onReq);
  await page.goto('https://ima.qq.com/wikis');
  await page.waitForTimeout(6500);
  page.off('request', onReq);
  if (!realHdrs) { LOG('✗ 没抓到页面请求头'); process.exit(1); }
  LOG('✓ 抓到鉴权头: from_browser_ima / x-ima-bkn / x-ima-cookie');

  // 2) 在页面上下文里跑 BFS（复用页面 cookie + 我们抄到的头）
  const result = await page.evaluate(async (hdr) => {
    const a = JSON.parse(localStorage.getItem('itema-universal-local-storage-accountInfo') || '{}');
    const H = {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'from_browser_ima': hdr['from_browser_ima'] || '1',
      'x-ima-bkn': hdr['x-ima-bkn'] || '',
      'x-ima-cookie': hdr['x-ima-cookie'] || '',
      'extension_version': hdr['extension_version'] || '999.999.999',
      'referer': 'https://ima.qq.com/wikis'
    };
    const kbId = a.uid;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = [];
    const queue = [{ id: kbId, name: '根目录' }];
    const seen = new Set();
    // version 必须非空：抓包实测首页请求带的是知识库级版本号，
    // 传空字符串会返回 code:51 参数错误。
    let version = '1789194637815178932000846810000';
    let firstErr = '';

    while (queue.length) {
      const cur = queue.shift();
      if (seen.has(cur.id)) continue;
      seen.add(cur.id);

      const r = await fetch('/cgi-bin/knowledge_tab_reader/get_knowledge_base_home_page', {
        method: 'POST', headers: H,
        body: JSON.stringify({
          knowledge_base_id: kbId,
          knowledge_list_req: {
            knowledge_base_id: kbId, folder_id: cur.id, sort_type: 9,
            need_default_cover: true, version: version
          }
        })
      });
      const j = await r.json();
      if (j.code !== 0) {
        if (!firstErr) firstErr = cur.name + ' -> code ' + j.code + ' ' + (j.msg || '');
        continue;
      }
      if (j.data && j.data.version) version = j.data.version;

      const rsp = j.data.list_rsp || {};
      const list = rsp.list || [];
      const pname = (rsp.current_path || []).map(x => x.name).join('/');
      let imgCnt = 0;

      for (const it of list) {
        if (it.media_type === 99 || it.folder_info) {
          queue.push({
            id: it.folder_id || it.folder_info?.folder_id || it.media_id,
            name: it.title
          });
        } else {
          const urls = (it.img_urls || []).map(u =>
            u.replace(/&imageMogr2\/[^&]*/, '').replace(/\?imageMogr2\/[^&]*/, '')
          );
          if (urls.length) {
            imgCnt++;
            out.push({
              folder: pname || cur.name, folderId: cur.id,
              title: it.title, mediaId: it.media_id,
              mediaType: it.media_type, size: it.file_size,
              imgUrls: urls
            });
          }
        }
      }
      console.log('  📁 ' + (pname || cur.name).slice(-46) + ' → ' + list.length + ' 项, 带图 ' + imgCnt);
      await sleep(150);
    }
    return { out, firstErr, uid: kbId, nick: a.nickName };
  }, realHdrs);

  const items = result.out;
  const totalUrls = items.reduce((s, x) => s + x.imgUrls.length, 0);
  LOG('\n✓ 账号:', result.nick, '| 带图文件:', items.length, '| 总 URL:', totalUrls);
  if (result.firstErr) LOG('⚠ 首个错误:', result.firstErr);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const f = path.join(OUT_DIR, 'ima_images.json');
  fs.writeFileSync(f, JSON.stringify({
    kbId: result.uid, nick: result.nick,
    capturedAt: new Date().toISOString(), items
  }, null, 2));
  LOG('📦', f);
  items.slice(0, 10).forEach(x =>
    LOG('   · [' + x.folder.slice(-26) + '] ' + String(x.title).slice(0, 30) + ' → ' + x.imgUrls.length));
  await b.close();
})();
