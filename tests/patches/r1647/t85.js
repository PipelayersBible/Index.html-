const boot=require('./boot');const fs=require('fs');
(async()=>{const which=process.argv[2]||'idx47b.html';const {b,p}=await boot('http://127.0.0.1:8843/'+which);
 let mode='ok',bodies=[];
 const R={is_stake:true,stake_number:{value:'3864',conf:'high'},station:{value:'2+12',conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:'',conf:'high'},cut_fill:{direction:'cut',feet:3.83,as_written:'C-3.83',to:'IE',conf:'high'},stake_elevation:{feet:103.83,as_written:'103.83',conf:'high'},other_text:'',uncertain:[]};
 await p.route('**/functions/v1/ai**', async r=>{const body=r.request().postData()||'';let j={};try{j=JSON.parse(body);}catch(e){}bodies.push({len:body.length,n:1+((j.images||[]).length),sides:(j.images||[]).map(x=>(x.side||'f')+'/'+(x.zoom||'')).join(',')});
   if(mode==='fail')return r.abort('failed');await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(R),used:1,limit:60})});});
 const img=f=>({name:'x.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync(f)});
 const st=h=>p.evaluate(h=>{const s=document.getElementById(h+'AiStakeStatus');return (s?s.innerText.replace(/\s+/g,' ').slice(0,140):'-')+' | photos='+((window._pbPhotos[h]||[]).length)+' | sta='+((document.getElementById(h+'StaTxt')||{}).value||'');},h);
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(300);
 // payload of one big camera pair
 await p.setInputFiles('#hub0AiStakePhoto',[img('/tmp/claude-0/big12.jpg'),img('/tmp/claude-0/big13.jpg')]);await p.waitForTimeout(4000);
 console.log('big pair request:',JSON.stringify(bodies.pop()));
 // front only, then reload
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(300);
 await p.setInputFiles('#hub1AiStakePhoto',[img('/tmp/claude-0/evimg/p12.jpg')]);await p.waitForTimeout(2500);
 console.log('front only:',await st('hub1'));
 await p.reload({waitUntil:'load'});await p.waitForTimeout(3000);
 await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()==='Resume');b.click();});await p.waitForTimeout(2500);
 console.log('after resume hub1:',await st('hub1'));
 mode='fail';
 await p.setInputFiles('#hub1AiStakePhoto',[img('/tmp/claude-0/evimg/p13.jpg')]);await p.waitForTimeout(3000);
 console.log('back, no signal:',await st('hub1'),' req=',JSON.stringify(bodies.pop()));
 mode='ok';
 await p.evaluate(()=>{const b=[...document.querySelectorAll('#hub1AiStakeStatus button')].find(b=>/Try Again/.test(b.textContent));b.click();});await p.waitForTimeout(3000);
 console.log('try again:',await st('hub1'),' req=',JSON.stringify(bodies.pop()));
 console.log('errs',p.errs.slice(0,3));await b.close();})();
