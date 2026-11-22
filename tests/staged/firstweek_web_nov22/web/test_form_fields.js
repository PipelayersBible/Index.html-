// firstweek_web_nov22: the trial form when the server returns `fields` (and the state select is sent). AFTER=http://127.0.0.1:10823/
const {chromium}=require('playwright');const BASE=process.env.AFTER||'http://127.0.0.1:10823/';
let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
(async()=>{const b=await chromium.launch();
 for(const mode of ['fields','down']){
 const ctx=await b.newContext({viewport:{width:390,height:844}});let sent=null;
 await ctx.route(/gc\.zgo\.at/,r=>r.fulfill({body:''}));
 await ctx.route(/functions\/v1\/trial-request/,r=>{sent=JSON.parse(r.request().postData()||'null');
   return mode==='fields'?r.fulfill({status:400,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:false,error:'invalid',fields:['state']})})
     :r.fulfill({status:502,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:false,error:'server'})});});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(BASE+'#start',{waitUntil:'load'});await p.waitForTimeout(3200);
 await p.fill('#f-name','Joe');await p.fill('#f-company','Acme');await p.selectOption('#f-role','Superintendent');await p.fill('#f-email','joe@example.com');await p.selectOption('#f-state','Nevada');
 await p.click('#f-submit');await p.waitForTimeout(800);
 const st=await p.evaluate(()=>[document.getElementById('f-status').textContent,document.getElementById('e-state').textContent,document.getElementById('f-state').getAttribute('aria-invalid'),document.activeElement&&document.activeElement.id]);
 if(mode==='fields'){ok(sent&&sent.state==='Nevada','state sent with the form ('+(sent&&sent.state)+')');
  ok(st[0]==='Check the marked field and send again.'&&st[1]==='Check this field.'&&st[2]==='true'&&st[3]==='f-state','server fields: "Check the marked field and send again", the field marked and focused ('+JSON.stringify(st)+')');
  await p.screenshot({path:require('path').resolve(__dirname,'../shots/web_after_form_fields.png')});}
 else ok(/didn’t go through/.test(st[0])&&/909/.test(st[0]),'server down: the call/text/email message as before');
 ok(!errs.length,'no page errors '+JSON.stringify(errs));await ctx.close();}
 await b.close();process.exit(fail?1:0);})();
