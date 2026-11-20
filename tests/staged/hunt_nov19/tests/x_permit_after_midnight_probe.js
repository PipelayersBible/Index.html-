// hunt_nov19 probe (not a pass/fail test): a permit written after midnight with a window that began before midnight.
// node x_permit_after_midnight_probe.js 2026-11-20T00:30:00 22:00 02:00   (serve the page as base.html on PB_ROOT)
process.env.PB_ROOT=process.env.PB_ROOT||"http://127.0.0.1:9000/";process.env.PB_FAKE_NOW=process.argv[2]||"2026-11-20T00:30:00";
const L=require('/home/claude/index.html-/tests/bughunt_nov17/cs2/lib.js');(async()=>{const {b,p,H}=await L({file:'base.html',v:true});
await p.setViewportSize({width:390,height:844});
console.log('now',await p.evaluate(()=>new Date().toString()));
const r=await H.lock({cpStart:process.argv[3]||'22:00',cpEnd:process.argv[4]||'02:00'});console.log('lock',JSON.stringify(r));
console.log('modal',await H.modal());
const st=await p.evaluate(()=>{try{return {permit:confinedPermit&&{date:confinedPermit.date,start:confinedPermit.start,end:confinedPermit.end,exp:confinedPermit.expiresAt||confinedPermit.endAt||null},keys:confinedPermit&&Object.keys(confinedPermit).join(',')};}catch(e){return String(e);}});console.log(JSON.stringify(st));
const txt=await p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s.innerText.replace(/\s+/g,' ').slice(0,700);});console.log(txt);
const rd=await H.read(20.9,0,0,0);console.log('read',JSON.stringify(rd));
await p.screenshot({path:'/tmp/claude-0/cs_night.png'});
console.log(p.errs);await b.close();})();
