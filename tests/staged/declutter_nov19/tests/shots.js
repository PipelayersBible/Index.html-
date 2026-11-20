// before/after screenshots + counts per role. node shots.js before|after [role]
const L=require('./_lib');const fs=require('fs');const which=process.argv[2]||'after';const only=process.argv[3];
const url=which==='before'?L.BASE:L.CUR;const SH=__dirname+'/../shots/';const out={};
(async()=>{for(const role of Object.keys(L.ROLES)){if(only&&only!==role)continue;
  const {b,p}=await L.start(url,L.ROLES[role]);
  try{
   await p.screenshot({path:SH+which+'_'+role+'_home_fold.png'});await p.screenshot({path:SH+which+'_'+role+'_home_full.png',fullPage:true});
   out[role+'_phone_home']=await L.measure(p,'home');
   await p.evaluate(()=>pbGoto('tools'));await p.waitForTimeout(700);await p.screenshot({path:SH+which+'_'+role+'_more_full.png',fullPage:true});out[role+'_phone_more']=await L.measure(p,'tools');
   await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(900);await p.screenshot({path:SH+which+'_'+role+'_settings_full.png',fullPage:true});out[role+'_phone_settings']=await L.measure(p,'settings');
   await p.evaluate(()=>pbGoto('home'));await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(1200);
   await p.screenshot({path:SH+which+'_'+role+'_desk_home.png'});out[role+'_desk_home']=await L.measure(p,'home');
  }catch(e){console.log(role,'ERR',e.message.slice(0,300));}
  console.log(role,'errs',JSON.stringify(p.errs.slice(0,3)));await b.close();}
 let all={};try{all=JSON.parse(fs.readFileSync(SH+'counts_'+which+'.json','utf8'));}catch(e){}Object.assign(all,out);
 fs.writeFileSync(SH+'counts_'+which+'.json',JSON.stringify(all,null,1));
 for(const k in out){const m=out[k];console.log(k,JSON.stringify({h:m.height,taps:m.taps,tapsFold:m.tapsFold,cards:m.cards,cardsFold:m.cardsFold,minFont:m.minFont,under14:m.under14,texts:m.texts,words:m.words,heads:m.heads}));}
})();
