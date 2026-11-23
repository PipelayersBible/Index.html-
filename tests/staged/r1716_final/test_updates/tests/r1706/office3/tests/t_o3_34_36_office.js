// office3 #34 (expired / expiring 811 tickets on the office's Home and job cards) and #36 (production by day and crew
// hours for payroll as spreadsheets). Company account (rig co.js + mgr.js, dash.json jobs 26014 and 26043).
const L = require('./lib');
const fx = `;(function(){const D=${L.fs.readFileSync(L.RIG + '/dash.json', 'utf8')};
const day=(n)=>{const x=new Date(Date.now()+n*864e5);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
const T=(id,job,no,called,exp)=>({id:'11111111-2222-4333-8444-55555555555'+id,job_key:job,job_number:job,ticket_no:no,called_at:day(called),expires_at:day(exp),closed:false,version:1});
window.__locs=[T(1,'26014','A253100123',-29,-1),T(2,'26014','A253100456',-26,2),T(3,'26043','B1',-22,6),T(4,'26043','B2',-8,20)];
window.__rpcOverride.pb_prod_locates_mine=()=>({ok:true,server_at:new Date().toISOString(),locate_days:28,locates:window.__locs});
window.__rpcOverride.pb_prod_job_detail=(a)=>{const k=String(a.p_job_number).trim().toLowerCase();const j=D.jobs.find(x=>x.job_key===k)||D.jobs[1];return Object.assign({},j,{today:a.p_today,server_at:new Date().toISOString(),
  days:[{date:day(-1),key:'pipe',unit:'LF',qty:300},{date:day(-1),key:'excavation',unit:'LF',qty:300},{date:day(-2),key:'pipe',unit:'LF',qty:120.5}],reporters:[],recent:[],crew:[],locates:window.__locs.filter(l=>l.job_key===k),locate_days:28,daily_eq:[]});};
window.__rpcOverride.pb_prod_export_days=(a)=>{window.__expArgs=a;return {ok:true,job_key:'26014',from:a.p_from,to:a.p_to,plan:null,rows:[{date:day(-3),key:'pipe',unit:'LF',qty:250,entries:2},{date:day(-3),key:'_equiphours',unit:'h',qty:16,entries:1},{date:day(-2),key:'pipe',unit:'LF',qty:120.5,entries:1},{date:day(-2),key:'structures',unit:'EA',qty:1,entries:1}]};};
window.__rpcOverride.pb_prod_export_hours=(a)=>{window.__hrsArgs=a;return {ok:true,from:a.p_from,to:a.p_to,reports:2,rows:[{date:day(-2),job_number:'26014',jobsite:'Sundance',foreman:'Brandon Jones',name:'Mike Smith',hours:8,version:1,signed_at:new Date().toISOString(),linked:true},{date:day(-2),job_number:'26014',jobsite:'Sundance',foreman:'Brandon Jones',name:'=HYPERLINK("x")',hours:7.5,version:2,signed_at:new Date().toISOString(),linked:false}]};};
window.__csv=[];window.__debugCsvSink=(n,r)=>window.__csv.push({n,r});
})();`;
(async () => {
  for (const dark of [false, true]) {
    process.env.DARK = dark ? '1' : '';
    const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + fx, wait: 5000 });
    const ev = (s) => p.evaluate(s);
    await ev("pbGoto('home')"); await p.waitForTimeout(2500);
    await ev("window.pbRenderHome && window.pbRenderHome()"); await p.waitForTimeout(800);
    const att = await ev("(()=>{const e=document.getElementById('homeAttention_locates');return e?e.innerText:''})()");
    console.log('  home (' + (dark ? 'dark' : 'light') + '):', att.replace(/\n/g, ' | '));
    if (!dark) {
      L.ok(!!att, '#34 office Home: a Needs attention line for locate tickets');
      L.ok(/3 locate tickets expired or expiring/.test(att) && /A253100123 expired 1 day ago/.test(att) && /A253100456 2 days left/.test(att) && /B1 6 days left/.test(att) && !/B2/.test(att), '#34 it lists the expired one, the 2-day one and the 6-day one (not the 20-day ticket)');
      L.ok(/Don.t dig on an expired ticket until a new one is valid/.test(att), '#34 it says not to dig on the expired ticket');
      L.ok(await ev("!!document.querySelector('#homeAttention_locates #homeLocBtn0')"), '#34 a button opens that job\'s Locates');
      L.ok(await ev("typeof window.pbLocExpiry==='function' && window.pbLocExpiry({expires_at:'2000-01-01',closed:false}).left < 0 && window.pbLocExpiry({expires_at:'2000-01-01',closed:true})===null"), '#34 one expiry function (pbLocExpiry): days left, closed tickets left out');
      L.ok((await L.rpcs(p, 'pb_prod_locates_mine')).length >= 1, '#34 the office asked pb_prod_locates_mine (it was foreman-only)');
    }
    // job cards on Company production
    await ev("pbGoto('prodDashboard')"); await p.waitForTimeout(2000);
    const flags = await ev("[...document.querySelectorAll('.pbx-job')].map(e=>e.dataset.job+': '+[...e.querySelectorAll('.pbx-flag')].map(f=>f.className.replace('pbx-flag ','')+'='+f.innerText.trim()).join('; '))");
    console.log('  cards:', JSON.stringify(flags));
    if (!dark) {
      L.ok(flags.some(f => /^26014: .*emerg=811 ticket expired/.test(f)), '#34 job card 26014: red "811 ticket expired"');
      L.ok(flags.some(f => /^26043: .*wait=811 ticket: 6 days left/.test(f)), '#34 job card 26043: amber "811 ticket: 6 days left"');
    }
    L.ok((await L.overflow(p)).length === 0, (dark ? 'dark' : 'light') + ' 390-400 px Company production: nothing off the side ' + JSON.stringify(await L.overflow(p)));
    await p.screenshot({ path: L.OUT + '/o3_34_cards_' + (dark ? 'dark' : 'light') + '.png' });
    // ---- #36 on the job page
    await ev("window.pbCxOpenJob('26014')"); await p.waitForTimeout(2200);
    const panel = await ev("(()=>{const e=document.getElementById('pjCxExport');return e?e.innerText:''})()");
    if (!dark) L.ok(/Spreadsheets/.test(panel) && /Production by day/.test(panel) && /Crew hours by day/.test(panel), '#36 job page: Spreadsheets panel with both exports');
    await p.evaluate(() => document.getElementById('pjCxExport') && document.getElementById('pjCxExport').scrollIntoView());
    await p.screenshot({ path: L.OUT + '/o3_36_panel_' + (dark ? 'dark' : 'light') + '.png' });
    L.ok((await L.overflow(p)).length === 0, (dark ? 'dark' : 'light') + ' job page with the panel: nothing off the side ' + JSON.stringify(await L.overflow(p)));
    if (dark) { L.ok(p.errs.length === 0, 'dark: no page errors ' + JSON.stringify(p.errs.slice(0, 3))); await b.close(); continue; }
    await ev("pbCxExportOpen('days')"); await p.waitForTimeout(400);
    const from = await ev("document.getElementById('cxExpFrom').value"), to = await ev("document.getElementById('cxExpTo').value");
    L.ok(/^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from < to, '#36 the date form opens with the last 30 days (' + from + ' to ' + to + ')');
    await L.clickModal(p, 'Make Spreadsheet'); await p.waitForTimeout(1500);
    let csv = await ev('window.__csv'), c = csv[csv.length - 1];
    console.log('  days csv:', c && c.n, JSON.stringify(c && c.r));
    L.ok(c && /^production-26014-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/.test(c.n), '#36 file name production-<job>-<from>-to-<to>.csv');
    L.ok(c && c.r[0].join('|') === 'Job number|Job name|Date|Item|Unit|Quantity|Entries' && c.r.length === 5, '#36 headings and one row per day and item');
    L.ok(c && c.r[1][1] === 'Sundance Sewer Improvement' && c.r.some(r => r[3] === 'Equipment hours' && r[5] === '16') && c.r.some(r => r[5] === '120.5' && r[6] === '1') && !c.r.some(r => /^_/.test(r[3])), '#36 job name, items by name (never a raw key), quantities and entry counts');
    const ea = await ev('window.__expArgs'); L.ok(ea && ea.p_job_number === '26014' && ea.p_from === from && ea.p_to === to, '#36 asked the server for that job and range');
    let al = await L.modal(p); console.log('  days alert:', al.replace(/\n/g, ' ').slice(0, 260));
    L.ok(/4 rows/.test(al) && /24-hour hold/.test(al), '#36 the alert gives the row count and the 24-hour hold');
    await L.clickModal(p, 'OK'); await p.waitForTimeout(300);
    // bad range
    await ev("pbCxExportRun('days','2026-11-10','2026-11-01')"); await p.waitForTimeout(400);
    L.ok(/The To date is before the From date/.test(await L.modal(p)), '#36 a To date before From is caught');
    await L.clickModal(p, 'Cancel'); await p.waitForTimeout(300);
    // payroll hours
    await ev("pbCxExportOpen('hours')"); await p.waitForTimeout(400); await L.clickModal(p, 'Make Spreadsheet'); await p.waitForTimeout(1500);
    csv = await ev('window.__csv'); c = csv[csv.length - 1];
    console.log('  hours csv:', c && c.n, JSON.stringify(c && c.r));
    L.ok(c && /^crew-hours-by-day-26014-/.test(c.n) && c.r[0].join('|') === 'Date|Job number|Jobsite|Foreman (signed)|Person|Hours|Report version|Signed at' && c.r.length === 3 && c.r[1][4] === 'Mike Smith' && c.r[1][5] === '8' && c.r[2][5] === '7.5', '#36 crew hours: headings, one row per person, hours as signed');
    al = await L.modal(p); console.log('  hours alert:', al.replace(/\n/g, ' ').slice(0, 200));
    L.ok(/2 rows from 2 signed daily reports/.test(al), '#36 the hours alert counts rows and reports');
    await L.clickModal(p, 'OK'); await p.waitForTimeout(300);
    // the CSV writer keeps a typed formula as text (the existing escape)
    const esc = await ev("(()=>{let got=null;const o=window.__debugCsvSink;window.__debugCsvSink=null;const B=window.Blob;window.Blob=function(parts,o2){got=parts.join('');return new B(parts,o2);};try{window.pbDownloadCSV('x.csv',[['=HYPERLINK(\"x\")','8']]);}finally{window.Blob=B;window.__debugCsvSink=o;}return got;})()");
    L.ok(/'=HYPERLINK/.test(esc || ''), '#36 a cell typed as a formula is written as text (existing CSV escape)');
    // offline: production from what the phone holds (the job page's 14 days); hours need signal
    await p.context().setOffline(true); await p.waitForTimeout(400);
    await ev("pbCxExportRun('days', '2026-01-01', document.getElementById('cxExpTo') ? document.getElementById('cxExpTo').value : '" + to + "')"); await p.waitForTimeout(1200);
    csv = await ev('window.__csv'); c = csv[csv.length - 1]; al = await L.modal(p);
    console.log('  offline days:', c && c.n, c && c.r.length, al.replace(/\n/g, ' ').slice(0, 260));
    L.ok(c && /-phone-copy\.csv$/.test(c.n) && c.r.length === 4 && /No signal: this has only what this phone holds/.test(al), '#36 offline: production from the phone\'s copy (3 rows), and it says so');
    await L.clickModal(p, 'OK'); await p.waitForTimeout(300);
    await ev("pbCxExportRun('hours','2026-01-01','" + to + "')"); await p.waitForTimeout(800);
    L.ok(/Try again with signal/.test(await L.modal(p)), '#36 offline: crew hours say they need signal');
    await p.context().setOffline(false);
    L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
    await b.close();
  }
  await L.done({ close: async () => {} });
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
