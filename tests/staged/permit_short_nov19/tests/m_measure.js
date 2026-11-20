// before/after numbers for the permit form at 390x844. node m_measure.js [shots]
const L=require('./_lib');const fs=require('fs');
(async()=>{const out={};
 for(const [k,u] of [['before',L.BASE],['after',L.CUR]]){
  const {b,p}=await L.start(u);
  await p.evaluate(()=>pbOpenConfinedPermitForm?pbOpenConfinedPermitForm():pbGoto('confinedPermit'));await p.waitForTimeout(1200);
  const scr=await p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s&&s.id;});
  out[k]=await L.measure(p);out[k].screen=scr;out[k].errs=p.errs;
  if(process.argv[2]){await p.screenshot({path:__dirname+'/../shots/form_'+k+'_fold.png'});await p.screenshot({path:__dirname+'/../shots/form_'+k+'_full.png',fullPage:true});}
  await b.close();}
 const s=o=>({boxes:o.boxes,typing:o.typing,ticks:o.ticks,allBoxes:o.allBoxes,words:o.words,px:o.px,screens:o.screens,buttons:o.buttons,folds:o.folds,screen:o.screen,errs:o.errs});
 console.log(JSON.stringify({before:s(out.before),after:s(out.after)},null,1));console.log('before ids',out.before.ids.join(' '));console.log('after ids',out.after.ids.join(' '));
 fs.writeFileSync(__dirname+'/../shots/measure.json',JSON.stringify(out,null,1));process.exit(0);})();
