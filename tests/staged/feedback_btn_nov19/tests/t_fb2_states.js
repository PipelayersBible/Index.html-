// feedback_btn_nov19: the button in awkward states: keyboard open, a dialog open, Ask open, big text, phone on its side, signed out.
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const {probe}=require('../t/lib');
const URL=process.env.PB_URL||'http://127.0.0.1:9250/cur.html';const SH=__dirname+'/../shots/';
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;}else{fail++;console.log('  FAIL',m);}};
// header heights of every screen in the current state (r17.10 page = the reference), then the same walk on the patched page
const ids=p=>p.evaluate(()=>[...document.querySelectorAll('.pb-screen')].map(x=>x.id.replace('screen-','')));
const refH=async(p)=>{const o={};for(const id of await ids(p)){await p.evaluate(s=>{try{pbGoto(s)}catch(e){}},id);await p.waitForTimeout(200);
  const r=await p.evaluate(()=>{const s=[...document.querySelectorAll('.pb-screen')].find(x=>x.offsetParent),h=s&&s.querySelector(':scope > .pb-header');const t=h&&h.querySelector(':scope > .pb-title');let sp=0;if(t&&t.offsetParent){const g=document.createRange();g.selectNodeContents(t);sp=Math.max(0,Math.ceil(g.getBoundingClientRect().right-t.getBoundingClientRect().right));}return s?[s.id.replace('screen-',''),h?h.getBoundingClientRect().height:0,sp]:['',0,0];});if(r[0]===id){o[id]=r[1];if(r[2]>0)(o._spill=o._spill||{})[id]=r[2];}}return o;};
const walk=async(p,tag,ref)=>{let n=0,bad=[];const pre=ref._spill||{},known=[];
 for(const id of await ids(p)){await p.evaluate(s=>{try{pbGoto(s)}catch(e){}},id);await p.waitForTimeout(420);
  const r=await p.evaluate(()=>{const s=[...document.querySelectorAll('.pb-screen')].find(x=>x.offsetParent),f=document.getElementById('pbFbPill'),h=s&&s.querySelector(':scope > .pb-header');if(!s||!f||f.hidden||!h||f.parentNode!==h)return {on:s?s.id.replace('screen-',''):'',skip:!f||f.hidden?'hidden':'not in header'};
   const q=f.getBoundingClientRect();return {on:s.id.replace('screen-',''),a:h.getBoundingClientRect().height,in:q.left>=0&&q.right<=innerWidth+.5&&q.top>=0};});
  if(r.on!==id||id==='login'||id==='auth')continue;n++;if(r.skip){bad.push(id+' '+r.skip);continue;}if(ref[id]!==undefined&&r.a>ref[id]+1.5)(pre[id]?known:bad).push(id+' header +'+Math.round(r.a-ref[id]));if(!r.in)bad.push(id+' not in view');
  const m=await probe(p);if(!m.shown||m.covers.length||m.text.length)(pre[id]&&m.shown&&!m.covers.length?known:bad).push(id+' covers '+JSON.stringify(m.covers.concat(m.text).slice(0,2)));}
 if(Object.keys(pre).length)console.log(' r17.10 already has the title running under header buttons here on:',Object.keys(pre).join(' '),'| on those, patched:',known.join('; ')||'no change for the worse');
 ok(!bad.length,tag+': '+n+' screens, problems: '+bad.join('; '));console.log(tag,'screens',n,'problems',bad.length);};
const big=async(p,v)=>{await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(400);await p.evaluate(v=>document.querySelector('#textSizeToggle button[data-val="'+v+'"]').click(),v);await p.waitForTimeout(600);};
(async()=>{const ref={};{const BASE=process.env.PB_BASE||URL.replace(/[^/]+$/,'base.html');const {b,p}=await boot(BASE,{init:co,wait:3500});
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);await big(p,140);ref.big=await refH(p);await big(p,100);
  await p.setViewportSize({width:844,height:390});await p.waitForTimeout(500);ref.side=await refH(p);
  await p.setViewportSize({width:320,height:568});await p.waitForTimeout(500);ref.small=await refH(p);await b.close();}
 const {b,p}=await boot(URL,{init:co,wait:3500});await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);
 // 1. keyboard open on Run Setup (focus a field; the screen gets shorter like a phone with its keyboard up)
 await p.evaluate(()=>pbGoto('home'));await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 await p.click('#saJobNumber');await p.setViewportSize({width:390,height:480});await p.waitForTimeout(500);
 let m=await probe(p);const f=await p.evaluate(()=>{const a=document.activeElement.getBoundingClientRect(),q=document.getElementById('pbFbPill').getBoundingClientRect();return {kb:document.documentElement.classList.contains('pb-kb-open'),hit:!(a.right<=q.left||a.left>=q.right||a.bottom<=q.top||a.top>=q.bottom)};});
 ok(f.kb&&m.shown&&m.inView&&m.onTop,'keyboard open: button still shown in the header '+JSON.stringify(m.rect));ok(!f.hit&&!m.covers.length&&!m.text.length,'keyboard open: not over the field being typed in / anything '+JSON.stringify(m.covers));
 await p.screenshot({path:SH+'after_keyboard_runsetup.png'});
 await p.fill('#saJobNumber','24-017');m=await probe(p);ok(m.shown&&!m.covers.length,'typing: still clear');
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>document.activeElement.blur());await p.waitForTimeout(300);
 // 2. an app dialog open: the button is under the dialog's shade (cannot be tapped by mistake)
 await p.click('#screen-input > .pb-header > .pb-rc-cancel');await p.waitForTimeout(600);ok(await p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');return !!d&&d.style.display==='flex';}),'Cancel on Run Setup opens its dialog (button beside it did not get in the way)');
 m=await probe(p);ok(m.shown&&!m.onTop,'dialog open: button is under the dialog');await p.screenshot({path:SH+'after_dialog.png'});
 await p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');[...d.querySelectorAll('button')].filter(x=>x.offsetParent)[0].click();});await p.waitForTimeout(400);
 // 3. Ask open
 await p.click('#pbTabAsk');await p.waitForTimeout(900);m=await probe(p);const ask=await p.evaluate(()=>document.documentElement.classList.contains('pb-ask-open'));
 ok(ask&&(!m.onTop||!m.covers.length),'Ask open: the Ask sheet is over the header, button is under it or clear of it '+JSON.stringify(m.covers)+' onTop '+m.onTop);await p.screenshot({path:SH+'after_ask.png'});
 await p.evaluate(()=>{try{pbGotoTab('home')}catch(e){}});await p.waitForTimeout(500);await p.keyboard.press('Escape');await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(400);
 // 4. big text (130%), every screen: header no taller with the button than without, nothing covered
 await big(p,140);ok(await p.evaluate(()=>document.getElementById('pbApp').classList.contains('pb-text-big')),'big text is on');await walk(p,'big text 140% 390x844',ref.big);await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(300);await p.screenshot({path:SH+'after_bigtext_home.png'});await big(p,100);
 // 5. phone on its side
 await p.setViewportSize({width:844,height:390});await p.waitForTimeout(600);await walk(p,'sideways 844x390',ref.side);
 // 6. small old phone
 await p.setViewportSize({width:320,height:568});await p.waitForTimeout(600);await walk(p,'small 320x568',ref.small);await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(300);await p.screenshot({path:SH+'after_320_home.png'});
 console.log('PASS',pass,'FAIL',fail,'errs',p.errs.slice(0,3));await b.close();})();
