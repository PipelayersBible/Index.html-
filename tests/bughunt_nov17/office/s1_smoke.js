process.env.NODE_PATH='/opt/npm-tools/node_modules';require('module').Module._initPaths();
const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const mgr=require('/home/claude/rig/mgr');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8866/'+(process.argv[2]||'cur.html'),{init:co+mgr});
 p.on('console',m=>{if(m.type()==='error')console.log('  CONSOLE',m.text().slice(0,300));});
 await p.setViewportSize({width:390,height:800});
 const scr=()=>p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s&&s.id;});
 const ovf=()=>p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('[id^=screen-] *').forEach(e=>{if(!e.offsetParent)return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>w+2||r.left<-2)){let a=e,hid=false;while(a&&a!==document.body){const cs=getComputedStyle(a);if(a!==e&&/(auto|scroll|hidden)/.test(cs.overflowX)){hid=true;break;}a=a.parentElement;}if(!hid)bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.left)+'-'+Math.round(r.right));}});return bad.slice(0,6);});
 const modal=()=>p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?d.innerText.replace(/\s+/g,' ').slice(0,300):null;});
 for(const fn of ['pbOpenArchive','pbOpenCrewMembers','pbOpenReportsAll','pbOpenProdDashboard','pbOpenTicketsDashboard','pbOpenTickets','pbOpenNotifications','pbOpenAiAsk','pbOpenCompanyPermits','pbOpenReportsInbox','pbOpenJobs','pbOpenInspCompany','pbOpenLocates','pbOpenTalks','pbOpenWeekAhead','pbOpenStats','pbOpenCompanyLogo','pbOpenSettings']){
  const e0=p.errs.length;
  try{await p.evaluate(f=>window[f](),fn);}catch(e){console.log(fn,'THREW',e.message.slice(0,200));}
  await p.waitForTimeout(1500);
  const m=await modal();
  console.log(fn,'->',await scr(),m?'MODAL:'+m:'','ovf',JSON.stringify(await ovf()),'errs',JSON.stringify(p.errs.slice(e0)));
  await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/s1_'+fn+'.png',fullPage:true});
  if(m)await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay')].find(x=>x.offsetParent);const bs=d&&d.querySelectorAll('button');if(bs&&bs.length)bs[bs.length-1].click();});
 }
 console.log('rpcs:',await p.evaluate(()=>[...new Set(window.__rpcLog)].join(' ')));
 await b.close();})();
