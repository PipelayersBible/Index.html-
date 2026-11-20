// shared bits for the permit-shortening tests. PB_URL = patched page, PB_BASE = the page before (r17.10 _src/index.html).
const R=__dirname+'/../../../rig/';const boot=require(R+'boot');const co=require(R+'co');const F=require(R+'flow');
const CUR=process.env.PB_URL||'http://127.0.0.1:9200/cur.html', BASE=process.env.PB_BASE||'http://127.0.0.1:9200/base.html';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const start=async(url,init)=>{const {b,p}=await boot(url,{init:init||co});await p.setViewportSize({width:390,height:844});return {b,p,H:F(p)};};
// what a person meets on the form: boxes (typing boxes, pickers, tick boxes that are on screen without opening a fold), words, height
const measure=(p,id)=>p.evaluate((id)=>{const s=document.getElementById(id||'screen-confinedPermit');
 const vis=e=>e.checkVisibility({checkVisibilityCSS:true})&&e.getClientRects().length>0;
 const all=[...s.querySelectorAll('input,textarea,select')].filter(e=>e.type!=='file'&&e.type!=='hidden');
 const boxes=all.filter(vis);const tick=boxes.filter(e=>e.type==='checkbox').length;
 const words=(s.innerText||'').trim().split(/\s+/).filter(Boolean).length;
 const h=Math.round(s.getBoundingClientRect().height);
 return {boxes:boxes.length,typing:boxes.length-tick,ticks:tick,allBoxes:all.length,words,px:h,screens:Math.round(h/844*10)/10,
  buttons:[...s.querySelectorAll('button')].filter(vis).length,folds:[...s.querySelectorAll('details')].filter(vis).length,ids:boxes.map(e=>e.id)};},id);
const today=(p)=>p.evaluate(()=>{const d=new Date();const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());});
const REQ={cpJobsite:'Test Sewer',cpAddress:'1 Main St',cpSpace:'MH-4',cpPurpose:'Inspect',cpStart:'00:01',cpEnd:'23:59',cpHazards:'H2S',cpControls:'Vent',cpVentFail:'Flag',cpRescue:'911',cpComms:'Voice',cpSupervisor:'Sam Sup',cpSupervisorInitials:'SS',cpAttendant:'Al Att'};
const fill=async(p,v)=>{v=Object.assign({cpDate:await today(p)},REQ,v||{});
 await p.evaluate(v=>{for(const k in v){const el=document.getElementById(k);if(!el)throw new Error('no field '+k);if(el.type==='checkbox')el.checked=!!v[k];else el.value=v[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},v);};
const openForm=async(p)=>{await p.click('#homeTileNewPermit');await p.waitForTimeout(1000);};
const lock=async(p,H)=>{await H.click('Lock & Activate Permit');await p.waitForTimeout(800);for(let i=0;i<3;i++){const bt=await H.modalBtns();if(!bt.length)break;await H.modalClick(bt.includes('I Understand')?'I Understand':bt[bt.length-1]);}await p.waitForTimeout(1200);};
module.exports={R,boot,co,F,CUR,BASE,ok,start,measure,fill,openForm,lock,REQ,today,fails:()=>fails,done:(b)=>{console.log(fails?fails+' FAILED':'ALL PASS');return b.close().then(()=>process.exit(fails?1:0));}};
