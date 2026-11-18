const {chromium}=require('playwright');const fs=require('fs');
module.exports=async function boot(url,opts={}){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:400,height:850},colorScheme:(process.env.DARK?'dark':'light'),serviceWorkers:'block'});
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/fakesb.js','utf8')}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 if(opts.init)await ctx.addInitScript(opts.init);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
 await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(opts.wait||3000);return {b,p};};
