// offline: a signed daily report waiting + a field ticket with a photo; signal returns with every response lost once
const {launch}=require('./srv');const co=require('./co_ok');const F=require('./flow');const L=require('./lib');
const UID='00000000-0000-4000-8000-000000000001';
const rep={cid:'dr-off-1',jobNumber:'24-017',jobsite:'Test Sewer',workDate:new Date(Date.now()-3600e3).toISOString().slice(0,10),snapshot:{v:1,job_number:'24-017',sections:{}},sha:'a'.repeat(64),signedName:'Test Foreman',signedAt:Date.now()-3600e3,tz:'America/Los_Angeles',signature:null,state:'waiting',why:'',clockOk:true,co:'11111111-1111-4111-8111-111111111111',version:1};
const init=co+`;try{if(!localStorage.getItem('${UID}:foremanDaily'))localStorage.setItem('${UID}:foremanDaily',JSON.stringify({v:1,checks:[],reports:[${JSON.stringify(rep)}],items:{},weather:{},co:'11111111-1111-4111-8111-111111111111'}));localStorage.setItem('pbAiPrivacyAck','1');}catch(e){}
window.__rpcOverride.pb_report_access=()=>({member:true,manager:false,company_id:'11111111-1111-4111-8111-111111111111'});`;
(async()=>{const {b,ctx,p,S,page}=await launch('http://127.0.0.1:8877/'+(process.env.PG||'cur.html'),{init});const H=F(p);
 // server: idempotent on the client ids, like the real functions
 const seen={};S.handlers.pb_daily_submit=(a)=>{if(seen[a.p_client_report_id])return Object.assign({again:true},seen[a.p_client_report_id]);return seen[a.p_client_report_id]={ok:true,id:'srv-'+Object.keys(seen).length,version:1,received_at:new Date().toISOString()};};
 const tks={};S.handlers.pb_ticket_save=(a)=>{tks[a.p_client_ticket_id]=(tks[a.p_client_ticket_id]||0)+1;return {ok:true,id:'tk-'+a.p_client_ticket_id,version:1};};
 await ctx.setOffline(true);
 await p.evaluate(()=>window.pbOpenTickets());await p.waitForTimeout(800);await p.evaluate(()=>window.pbNewTicket());await p.waitForTimeout(800);
 await p.setInputFiles('#tkPhotoInput',[H.img('p12')]);await p.waitForTimeout(1200);
 await p.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}};s('tkJobNumber','24-017');});
 console.log('ticket form fields:',await p.evaluate(()=>[...document.querySelectorAll('#screen-ticketForm input, #screen-ticketForm select')].filter(e=>e.offsetParent).map(e=>e.id||e.name).join(',')));
 await p.evaluate(()=>{const e=[...document.querySelectorAll('#screen-ticketForm input')].find(e=>/ticket ?no|ticket ?#/i.test((e.closest('label,.pb-field')||{}).innerText||''));if(e){e.value='T-555';e.dispatchEvent(new Event('input',{bubbles:true}));}});
 await p.evaluate(()=>window.pbTicketSave());await p.waitForTimeout(1500);console.log('save modal:',await H.modal(),'err',await p.evaluate(()=>{const e=document.getElementById('tkFormErr');return e&&e.textContent;}));await L.clearModals(p);
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(1500);
 console.log('home offline:',await p.evaluate(()=>{const x=window.pbUnsentHomeItem();return x&&x.html.replace(/<[^>]+>/g,' ').trim();}));
 S.opts.lose=new Set(['pb_daily_submit','pb_ticket_save']);
 await ctx.setOffline(false);await p.waitForTimeout(15000);
 S.opts.lose=new Set();
 await p.evaluate(()=>{window.dispatchEvent(new Event('online'));});await p.waitForTimeout(15000);
 await p.evaluate(()=>window.pbTicketsSyncNow());await p.waitForTimeout(6000);
 console.log('daily submits',S.calls.filter(c=>c.n==='pb_daily_submit').length,'server reports',Object.keys(seen).length,'| ticket saves',JSON.stringify(tks));
 console.log('daily state:',await p.evaluate((k)=>JSON.parse(localStorage.getItem(k)).reports.map(r=>r.state+' '+(r.serverId||'')).join(';'),UID+':foremanDaily'));
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(1500);
 console.log('home after:',await p.evaluate(()=>{const x=window.pbUnsentHomeItem();return x&&x.html.replace(/<[^>]+>/g,' ').trim();}));
 console.log(p.errs.filter(e=>!/subscription|sync failed/.test(e)).slice(0,4));await b.close();})();
