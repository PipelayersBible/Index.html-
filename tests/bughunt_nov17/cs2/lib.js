const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
module.exports=async function(opts={}){const {b,p}=await boot((process.env.PB_ROOT||'http://127.0.0.1:8843/')+(opts.file||'cur.html'),{init:(opts.init||co)+(opts.extra||'')});const H=F(p);
 H.lock=async(over={})=>{
  await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);
  // the page's own date (the runner may pin the page clock), not the node clock
  const date=await p.evaluate(()=>{const d=new Date();const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());});
  const vals=Object.assign({cpJobsite:'Test Sewer',cpAddress:'1 Main St',cpSpace:'MH-4',cpPurpose:'Inspect',cpDate:date,cpStart:'00:01',cpEnd:'23:59',cpHazards:'H2S',cpControls:'Vent',cpVentFail:'Flag',cpRescue:'911',cpComms:'Voice',cpSupervisor:'Sam Sup',cpSupervisorInitials:'SS',cpAttendant:'Al Att'},over);
  await p.evaluate(v=>{for(const k in v){const el=document.getElementById(k);el.value=v[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},vals);
  await p.evaluate(()=>window.pbLockConfinedPermit());await p.waitForTimeout(600);
  for(let i=0;i<6;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();if(opts.v)console.log('LOCK MODAL',m.slice(0,200),bt);const pick=bt.find(x=>/I Understand|OK|Lock|Yes|Continue/i.test(x))||bt[0];await H.modalClick(pick);await p.waitForTimeout(600);}
  return {screen:await H.screen(),err:await p.evaluate(()=>{const e=document.getElementById('cpError');return e&&e.offsetParent?e.textContent.slice(0,300):null;})};
 };
 H.read=async(o2,lel,h2s,co,tester='Tess')=>{
  await p.evaluate(v=>{const s=(id,x)=>{document.getElementById(id).value=(x===null||x===undefined)?'':String(x);};s('cpAtmoO2',v[0]);s('cpAtmoLEL',v[1]);s('cpAtmoH2S',v[2]);s('cpAtmoCO',v[3]);s('cpAtmoTester',v[4]);},[o2,lel,h2s,co,tester]);
  await p.evaluate(()=>window.pbSaveAtmoReading());await p.waitForTimeout(700);
  const m=await H.modal();if(m){const bt=await H.modalBtns();await H.modalClick(bt[0]);}
  return {modal:m,banner:await p.evaluate(()=>{const e=document.getElementById('cpUnsafeBanner');return e&&e.offsetParent?e.innerText.slice(0,200):null;}),block:await p.evaluate(()=>{try{const r=pbEntryBlockReason();return r?r[0].slice(0,120):null;}catch(e){return 'ERR '+e.message;}})};
 };
 return {b,p,H};};
