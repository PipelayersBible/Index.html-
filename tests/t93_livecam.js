const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});const ctx=await b.newContext({viewport:{width:400,height:850},serviceWorkers:'block',permissions:['camera']});await require(__dirname+'/rig/env').applyClock(ctx);
 const p=await ctx.newPage();await p.addInitScript({content:fs.readFileSync(__dirname+'/rig/fakesb.js','utf8')});await p.addInitScript({content:require(__dirname+'/rig/co')});
 await p.route('**/fonts.googleapis.com/**',r=>r.abort());await p.route('**/nominatim**',r=>r.abort());
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const S=(sta,el,cf,num)=>({is_stake:true,stake_number:{value:num||'',conf:num?'high':'low'},station:{value:sta||'',conf:sta?'high':'low'},offset:{value:'10/SD',conf:'high'},line_label:{value:'',conf:'uncertain'},cut_fill:cf==null?{conf:'uncertain'}:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:el==null?{conf:'uncertain'}:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 const R=[S('0+50',88.1,5.66,'101'),S('1+00',88.6,5.2,'102'),S('1+50',89.0,5.0,'103'),S('2+00',89.5,4.8,'104')];let n=0,imgs=[];
 await p.route('**/functions/v1/ai**',async r=>{const k=n++;imgs.push(JSON.parse(r.request().postData()).images.filter(x=>x.side==='back').length);await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(R[k]),used:k+1,limit:20})});});
 await p.goto((process.env.PB_URL||'http://127.0.0.1:8843/cur.html'));await p.waitForTimeout(2500);
 await p.evaluate(()=>{try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await p.evaluate(()=>pbStakeAiPick('start'));await p.waitForTimeout(1500);
 console.log('cam open:',await p.evaluate(()=>!!document.querySelector('.pb-lc')+' vw='+(document.querySelector('.pb-lc video')||{}).videoWidth));
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/walk')+'/livecam.png')});
 await p.click('.pb-lc-shot');await p.waitForTimeout(800);console.log('review btns:',await p.evaluate(()=>[...document.querySelectorAll('.pb-lc-rv button')].map(b=>b.textContent).join('|')));
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/walk')+'/livecam_review.png')});
 await p.click('.pb-lc-re');await p.waitForTimeout(300);await p.click('.pb-lc-shot');await p.waitForTimeout(800);
 await p.click('.pb-lc-more');await p.waitForTimeout(300);console.log('title:',await p.evaluate(()=>document.querySelector('.pb-lc-t').textContent));
 await p.click('.pb-lc-shot');await p.waitForTimeout(800);console.log('review2:',await p.evaluate(()=>[...document.querySelectorAll('.pb-lc-rv button')].map(b=>b.textContent).join('|')));
 await p.click('.pb-lc-use');await p.waitForTimeout(3000);
 console.log('after 2 shots: open=',await p.evaluate(()=>!!document.querySelector('.pb-lc')),'status=',await p.evaluate(()=>document.getElementById('startAiStakeStatus').innerText.replace(/\s+/g,' ')),'elev=',await p.evaluate(()=>document.getElementById('startStakeElev').value),'backs sent',imgs);
 // batch
 await p.click('#pbBatchBtn');await p.waitForTimeout(1500);
 for(let i=0;i<3;i++){await p.click('.pb-lc-shot');await p.waitForTimeout(500);}
 await p.click('.pb-lc-done');await p.waitForTimeout(5000);
 console.log('batch:',await p.evaluate(()=>document.getElementById('pbBatchStatus').innerText.replace(/\s+/g,' ')),'reqs',n);
 console.log('errs',errs);await b.close();})();
