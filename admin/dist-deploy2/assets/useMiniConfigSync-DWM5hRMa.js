import{aE as B,S as g,aN as P,al as M,am as S,E as c,k as x}from"./index-DNpzQiR7.js";function k(){const r=x(!1);async function b(e){var f,h,d,w,m;if(r.value)return null;r.value=!0;try{let n=((f=e==null?void 0:e.changeIds)==null?void 0:f.filter(Boolean))||[],i=n.length>0;if(!n.length){const l=await B();n=(l.items||[]).map(v=>String(v.changeId||"")).filter(Boolean);const I=l.siteDraftChanged??l.siteDirty??!1;i=n.length>0||I===!0}if(!i&&!((h=e==null?void 0:e.pageIds)!=null&&h.length))return await g.alert(`当前没有待发布的改动，所以没有内容可以同步到线上。

如果后台看起来和小程序不一致，通常是改动被直接写进了数据库（例如迁移脚本），没有经过后台保存，变更检测因此认为「无改动」。
解决办法：在后台任意做一处真实改动并保存草稿，再点一次同步即可。`,"没有可同步的改动",{type:"info",confirmButtonText:"知道了"}),null;const t=n.length?await P(n):await P([]),s=t.blocking||[];if(s.length)return await g.alert(s.join(`
`),"无法同步到线上",{type:"warning"}),null;if(t.canPublish===!1)return await g.alert(`后台判定当前配置不能发布，但没有给出具体的阻断项。

最常见的原因是没有待发布的改动。可以在后台做一处真实改动并保存草稿后重试；若仍然如此，请查看后端预检日志。`,"暂时无法同步",{type:"warning"}),null;const u=t.warnings||[];if(u.length){const l=u.slice(0,10).join(`
`);try{await g.confirm(`${l}${u.length>10?`
…`:""}

仍要写入线上配置？`,"同步前提醒",{type:"warning",confirmButtonText:"确认同步",cancelButtonText:"返回"})}catch{return null}}const C=(e==null?void 0:e.includeSite)??!((d=e==null?void 0:e.pageIds)!=null&&d.length),a=await M({includeSite:C,pageIds:e==null?void 0:e.pageIds,notes:(e==null?void 0:e.notes)||"后台保存并同步"});await S(!0);const y=a.liveReleaseNo;return a.deduplicated?(c.info(a.message||"刚刚已同步过同一批改动，本次无需重复提交"),a):a.siteConfigPromoted===!1&&!(a.publishedPages||a.publishedPageCount)?(c.warning("本次没有任何内容被写入线上配置（后台判定无改动）。请先在后台做一处真实改动并保存草稿，再同步。"),a):(c.success(y!=null?`已写入线上配置（内容版本 ${y}）`:a.message||"已写入线上配置"),a)}catch(n){const i=(m=(w=n==null?void 0:n.response)==null?void 0:w.data)==null?void 0:m.message,t=n instanceof Error?n.message:"",s=t&&!/^Request failed with status code/i.test(t)?t:"同步失败，请稍后重试";return c.error(i||s),null}finally{r.value=!1}}return{syncing:r,syncToLive:b}}export{k as u};
