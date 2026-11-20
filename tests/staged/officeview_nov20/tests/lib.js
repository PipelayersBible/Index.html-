// officeview tests: shared helpers and ONE fake company day (rig = tests/rig; page = PB_URL).
const path = require('path'), fs = require('fs');
// the page's clock: today at 2:30 PM (unless the runner set one), so the fake day's times all fall on today whenever this runs
if (!process.env.PB_FAKE_NOW) { const d = new Date(), z = (n) => String(n).padStart(2, '0'); process.env.PB_FAKE_NOW = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T14:30:00'; }
const RIG = path.resolve(__dirname, '../../../rig');
const boot = require(RIG + '/boot'), co = require(RIG + '/co'), mgr = require(RIG + '/mgr'), co_pl = require(RIG + '/co_pl');
const URL = process.env.PB_URL || 'http://127.0.0.1:9700/cur.html';
const OUT = (() => { const d = process.env.PB_OUT || path.resolve(__dirname, '../shots'); try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} return d; })();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const done = async (b) => { try { await b.close(); } catch (e) {} console.log(fail ? 'RESULT FAIL ' + fail : 'RESULT PASS ' + pass); process.exit(fail ? 1 : 0); };
// sideways overflow: the page itself, or anything past the right edge that no scroller holds
const overflow = (p) => p.evaluate(() => { const d = document.documentElement, W = d.clientWidth; const bad = []; if (d.scrollWidth > W + 1) bad.push('page scrolls sideways: ' + d.scrollWidth + ' > ' + W); const s = document.querySelector('.pb-screen.active') || document.body; [...s.querySelectorAll('*')].forEach(e => { if (bad.length > 5) return; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.right > W + 1) || getComputedStyle(e).position === 'fixed') return; let a = e.parentElement, clipped = false; while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { clipped = true; break; } a = a.parentElement; } if (!clipped) bad.push((e.id || e.className || e.tagName) + ':' + Math.round(r.right)); }); return bad; });
const waitFn = async (p, name) => { for (let i = 0; i < 30 && !(await p.evaluate((n) => typeof window[n] === 'function', name)); i++) await p.waitForTimeout(400); };
// The fake day. Two crews working, one foreman with nothing sent:
//   Ray Alvarez's crew, job 26014: Luis (a run in progress, 120 ft today; a run ended today, 80 ft), Marco (in progress, 60 ft)
//     -> 2 active, 1 ended, 260 ft; Luis has permit MH-4 open with 2 inside; Ray sent 2 field tickets; daily not signed.
//   Dana Whitley's crew, job 26043: Sam (a run ended today, 210 ft) -> 0 active, 1 ended, 210 ft; daily signed (3 fittings
//     counted on it, 6 MJ kits not counted as fittings); 1 delay of 1.5 h. Pat Ochoa: nothing sent today.
//   Not today's: Ray's daily for YESTERDAY signed this morning; Sam's permit closed. Records also lists older rows.
const DAY = `;(function(){
  const pad=(n)=>String(n).padStart(2,'0'), d=new Date(), day=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const y=new Date(d.getTime()-86400000), yday=y.getFullYear()+'-'+pad(y.getMonth()+1)+'-'+pad(y.getDate());
  const iso=(min)=>new Date(Date.now()-min*60000).toISOString(), ms=(min)=>Date.now()-min*60000;
  const F1='aaaaaaaa-0000-4000-8000-000000000001',F2='aaaaaaaa-0000-4000-8000-000000000002',F3='aaaaaaaa-0000-4000-8000-000000000003',P1='bbbbbbbb-0000-4000-8000-000000000001',P2='bbbbbbbb-0000-4000-8000-000000000002',P3='bbbbbbbb-0000-4000-8000-000000000003';
  const run=(ref,job,label,o)=>({session_ref:ref,run_ref:ref,job_number:job,work_date:o.date||day,ended:!!o.ended,updated_at:iso(o.upd),phone_at:iso(o.upd),status:Object.assign({sessionRef:ref,jobNumber:job,label,totalFt:o.total,laidFt:o.ft,laidToFt:o.ft,rowsTotal:20,rowsLaid:o.ft?10:0,lastLaidAt:ms(o.upd),pipeType:'PVC SDR 35',pipe:o.ft?[{in:8,ft:o.ft}]:[],startedAt:ms(300),ended:!!o.ended},o.ended?{endedAt:ms(o.upd)}:{})});
  const uu=(n)=>'cccccccc-0000-4000-8000-'+String(n).padStart(12,'0');
  const A=(id,name)=>({id,name,left:false});
  const today=[
    {key:'daily:'+uu(1),type:'daily',at:iso(20),id:uu(1),client_report_id:'d1',job_number:'26043',jobsite:'Wildomar Ridge',work_date:day,version:1,headcount:3,author:A(F2,'Dana Whitley'),events:1,bucket:'done',st:'signed'},
    {key:'event:'+uu(2),type:'event',at:iso(20),id:uu(2),report_id:uu(1),job_key:'26043',job_number:'26043',work_date:day,kind:'delay',reason:'weather',hours:1.5,author:A(F2,'Dana Whitley'),bucket:'review',st:'new'},
    {key:'ticket:'+uu(3),type:'ticket',at:iso(95),id:uu(3),client_ticket_id:'t1',job_number:'26014',ticket_type:'concrete',ticket_no:'88121',supplier:'Robertson’s',ticket_date:day,author:A(F1,'Ray Alvarez'),bucket:'done',st:'sent'},
    {key:'ticket:'+uu(4),type:'ticket',at:iso(60),id:uu(4),client_ticket_id:'t2',job_number:'26014',ticket_type:'material',ticket_no:'4410',supplier:'Ferguson',ticket_date:day,author:A(F1,'Ray Alvarez'),bucket:'done',st:'sent'},
    {key:'daily:'+uu(5),type:'daily',at:iso(240),id:uu(5),client_report_id:'d0',job_number:'26014',jobsite:'Sundance',work_date:yday,version:1,headcount:4,author:A(F1,'Ray Alvarez'),events:0,bucket:'done',st:'signed'}];
  const older=[
    {key:'run:'+uu(6),type:'run',at:iso(26*60),id:uu(6),pipelayer_id:P1,entry_id:uu(60),label:'MH 3 to MH 4',job_number:'26014',work_date:yday,distance_ft:400,laid_ft:400,photo_count:6,author:A(P1,'Luis Ortega'),foreman:A(F1,'Ray Alvarez'),office_only:false,bucket:'done',st:'approved'},
    {key:'permit:'+uu(7),type:'permit',at:iso(50*60),id:uu(7),client_permit_id:'p9',space:'MH-2',job_number:'26014',version:1,closed_at:iso(50*60),mine:false,emergency:false,author:A(P1,'Luis Ortega'),bucket:'done',st:'closed'},
    {key:'run:'+uu(8),type:'run',at:iso(28*60),id:uu(8),pipelayer_id:P3,entry_id:uu(80),label:'CO 1 to MH 1',job_number:'26043',work_date:yday,distance_ft:180,laid_ft:150,photo_count:2,author:A(P3,'Sam Reyes'),foreman:A(F2,'Dana Whitley'),office_only:false,bucket:'review',st:'needs_review'}];
  window.__ovDay={day,yday};
  window.__rpcOverride=Object.assign(window.__rpcOverride||{},{
    pb_reports_people:()=>({ok:true,tier:'company',people:[{id:F1,name:'Ray Alvarez',role:'foreman'},{id:F2,name:'Dana Whitley',role:'foreman'},{id:F3,name:'Pat Ochoa',role:'foreman'},{id:P1,name:'Luis Ortega',role:'pipelayer'},{id:P2,name:'Marco Diaz',role:'pipelayer'},{id:P3,name:'Sam Reyes',role:'pipelayer'}],jobs:[{job_number:'26014'},{job_number:'26043'}]}),
    pb_prod_company_live:()=>window.__ovFail?null:({server_at:new Date().toISOString(),today:day,people:[
      {id:F1,name:'Ray Alvarez',role:'foreman',foreman:null,runs:[]},
      {id:P1,name:'Luis Ortega',role:'pipelayer',foreman:'Ray Alvarez',runs:[run('r1','26014','MH 4 → MH 5',{total:400,ft:120,upd:6}),run('r2','26014','MH 3 → MH 4',{total:80,ft:80,upd:200,ended:true})]},
      {id:P2,name:'Marco Diaz',role:'pipelayer',foreman:'Ray Alvarez',runs:[run('r3','26014','Lateral 12',{total:90,ft:60,upd:14})]},
      {id:P3,name:'Sam Reyes',role:'pipelayer',foreman:'Dana Whitley',runs:[run('r4','26043','CO 2 → MH 1',{total:210,ft:210,upd:45,ended:true})]}]}),
    pb_prod_company_live_permits:()=>window.__ovFail?null:({server_at:new Date().toISOString(),permits:[
      {who:'Luis Ortega',permit_ref:'1795000000001',closed:false,updated_at:iso(3),status:{permitRef:'1795000000001',space:'MH-4',jobsite:'Sundance',jobNumber:'26014',inside:2,activeSince:ms(50),lastAirAt:ms(9),airOk:true}},
      {who:'Sam Reyes',permit_ref:'1795000000002',closed:true,updated_at:iso(120),status:{permitRef:'1795000000002',space:'MH-1',jobNumber:'26043',inside:0,closed:true}}]}),
    pb_reports_feed:(a)=>{ if(window.__ovFail)return null; const f=(a&&a.p_filters)||{}; let items=today.concat(older);
      if(f.from) items=items.filter(x=>Date.parse(x.at)>=new Date(f.from+'T00:00:00').getTime());
      if(Array.isArray(f.types)&&f.types.length) items=items.filter(x=>f.types.includes(x.type));
      if(f.job) items=items.filter(x=>String(x.job_number)===String(f.job));
      (window.__ovFeedAsks=window.__ovFeedAsks||[]).push(JSON.parse(JSON.stringify(a)));
      return {ok:true,server_at:new Date().toISOString(),tier:'company',tz:'UTC',items:items.slice().sort((p,q)=>Date.parse(q.at)-Date.parse(p.at)),next:null,partial:false}; },
    pb_daily_get:(a)=>a&&a.p_report_id===uu(1)?{ok:true,id:uu(1),version:1,snapshot:{materials:{used:[{what:'Pipe installed (8" pipe)',qty:210,unit:'LF',kind:'used'},{what:'8" 45° bend',qty:2,unit:'ea',kind:'counted'},{what:'8" wye',qty:1,unit:'ea',kind:'counted'},{what:'MJ accessory kits (gland, gasket, bolts)',qty:6,unit:'ea',kind:'counted'}]}}}:null,
  });})();`;
module.exports = { RIG, boot, co, mgr, co_pl, URL, OUT, ok, done, overflow, waitFn, DAY, fs, path };
