// Ask: Retry on a "Not finished" card while there is no signal must keep the question
const L=require('./lib');
(async()=>{const {b,p}=await L.boot(L.URL,{init:L.co+`;try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}`});
 await p.route('**/functions/v1/ai**',async r=>{await r.fulfill({status:200,contentType:'text/event-stream',body:'event: delta\ndata: {"t":"Partial words"}\n\n'});});
 await p.evaluate(()=>window.pbOpenAiAsk());await p.waitForTimeout(600);
 await p.fill('#aiAskBox','what slope for 8 inch sewer');await p.click('#aiAskBtn');await p.waitForTimeout(1200);
 const hist=()=>L.txt(p,'#aiAskHistory');
 console.log('after dropped:',await hist(),'| box:',JSON.stringify(await p.evaluate(()=>document.getElementById('aiAskBox').value)));
 await p.fill('#aiAskBox',''); // the box was cleared (or used for something else) meanwhile
 await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});});
 await p.evaluate(()=>{const bt=[...document.querySelectorAll('#aiAskHistory button')].find(x=>x.textContent.trim()==='Retry');bt.click();});await p.waitForTimeout(1000);
 const h=await hist(),bx=await p.evaluate(()=>document.getElementById('aiAskBox').value);
 console.log('after offline retry: hist=',JSON.stringify(h),'| box:',JSON.stringify(bx),'| status:',await L.txt(p,'#aiAskStatus'));
 const kept=/what slope for 8 inch sewer/.test(h||'')&&/Retry/.test(h||'');
 console.log(kept?'PASS: the card and its Retry are still there':'FAIL: question lost after Retry with no signal');
 await b.close();process.exit(kept?0:1);})();
