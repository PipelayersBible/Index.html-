// firstweek_web_nov22: website before/after at phone (390) and desktop (1280). BEFORE=http://127.0.0.1:10822/ AFTER=http://127.0.0.1:10823/
const {chromium}=require('playwright');const path=require('path');
const OUT=process.env.OUT||path.resolve(__dirname,'../shots');
const SITES={before:process.env.BEFORE||'http://127.0.0.1:10822/',after:process.env.AFTER||'http://127.0.0.1:10823/'};
(async()=>{const b=await chromium.launch();
 for(const [tag,base] of Object.entries(SITES)) for(const [w,h,name,mobile] of [[390,844,'phone',true],[1280,900,'desktop',false]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  await ctx.route(/gc\.zgo\.at|goatcounter|supabase\.co/,r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(base,{waitUntil:'load'});await p.waitForTimeout(600);
  await p.screenshot({path:`${OUT}/web_${tag}_${name}_top.png`});
  await p.screenshot({path:`${OUT}/web_${tag}_${name}_full.png`,fullPage:true});
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth);
  console.log(tag,name,'scrollWidth',sw,'errs',JSON.stringify(errs));
  await p.goto(base+'tools/pipe-grade-calculator/',{waitUntil:'load'});await p.waitForTimeout(400);
  const cta=await p.$('.cta-band');if(cta){await cta.scrollIntoViewIfNeeded();await cta.screenshot({path:`${OUT}/web_${tag}_${name}_tool_cta.png`});}
  await ctx.close();}
 await b.close();})();
