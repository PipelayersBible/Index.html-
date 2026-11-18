const L=require('./lib');
(async()=>{const {b,p}=await L.boot(L.URL,{init:L.co+`;try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}`});const H=L.F(p);
 let mode={status:200,body:{ok:true,v:2,text:'Answer one.',used:1,limit:20}};let calls=0;
 await p.route('**/functions/v1/ai**',async r=>{calls++;if(mode.abort)return r.abort();await r.fulfill({status:mode.status,contentType:'application/json',body:JSON.stringify(mode.body)});});
 await p.evaluate(()=>window.pbOpenAiAsk());await p.waitForTimeout(600);
 const ask=async(q)=>{await p.fill('#aiAskBox',q);await p.click('#aiAskBtn');await p.waitForTimeout(900);};
 const st=()=>L.txt(p,'#aiAskStatus');const hist=()=>L.txt(p,'#aiAskHistory');const box=()=>p.evaluate(()=>document.getElementById('aiAskBox').value);
 for(const [name,m] of [['ok',{status:200,body:{ok:true,v:2,text:'Answer one.',used:1,limit:20}}],['429',{status:429,body:{error:'daily_limit',limit:20}}],['403',{status:403,body:{error:'no_plan'}}],['502busy',{status:502,body:{error:'ai_busy'}}],['500',{status:500,body:{}}],['abort',{abort:true}],['401',{status:401,body:{}}],['200bad',{status:200,body:{ok:true}}]]){
  mode=m;await ask('how deep is a trench '+name);console.log(name,'| status:',await st(),'| box:',JSON.stringify(await box()));}
 console.log('hist:',(await hist()||'').slice(0,300));
 // offline
 await p.context().setOffline(true);await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});});
 await ask('offline question about slope');console.log('offline | status:',await st(),'| box:',JSON.stringify(await box()),'calls',calls);
 await ask('my buddy passed out in the manhole');console.log('emergency offline | ',(await hist()||'').slice(-400));
 console.log('errs',p.errs);await b.close();})();
