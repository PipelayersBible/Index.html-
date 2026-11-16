const boot=require('/home/claude/rig/boot');const F=require('/home/claude/rig/flow');const fs=require('fs');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:require('/home/claude/rig/co')});const H=F(p);
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num||'',conf:num?'high':'low'},station:{value:sta||'',conf:sta?'high':'low'},offset:{value:'10/SD',conf:'high'},line_label:{value:line||'',conf:'high'},cut_fill:cf==null?{conf:'low'}:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:el==null?{conf:'low'}:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 const R=[S('1+50',103.4,3.61,'MH-1','3860'),S('4+51',104.26,3.83,'MH-2','3863'),S('2+12',null,3.69,'AP 22.5','3861'),S('',103.7,null,'','3861'),S('3+39',104.0,3.73,'WYE','3862')];
 let n=0;await p.route('**/functions/v1/ai**',async r=>{const k=n++;await new Promise(z=>setTimeout(z,300+100*k));await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(R[k]),used:k+1,limit:20})});});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.sel('runIdSel','8"');
 const img=['p12','p13','p12','p13','p12'].map((x,i)=>({name:'s'+i+'.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('/tmp/claude-0/evimg/'+x+'.jpg')}));
 try{localStorage.setItem('pbAiPrivacyAck','1');}catch(e){}
 await p.evaluate(()=>{try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}});
 await p.setInputFiles('#pbBatchInput',img);await p.waitForTimeout(9000);
 console.log(await p.evaluate(()=>{const v=id=>{const e=document.getElementById(id);return e?e.value:'-';};const hubs=[...document.querySelectorAll('[id^=hub][id$=StakeElev]')].map(e=>e.id.replace('StakeElev',''));
  return 'status: '+document.getElementById('pbBatchStatus').innerText.replace(/\s+/g,' ')+'\nstart '+v('startStaTxt')+' '+v('startStakeElev')+' '+v('startLabel')+'\n'+hubs.map(h=>h+' '+v(h+'StaTxt')+' '+v(h+'StakeElev')+' cf='+v(h+'CutFillVal')+' '+v(h+'Label')+' ph='+((window._pbPhotos[h]||[]).length)).join('\n')+'\nend '+v('endStaTxt')+' '+v('endStakeElev')+' '+v('endLabel')+' total='+v('totalDist');}));
 await (await p.$('#pbBatchBox')).screenshot({path:'/tmp/claude-0/walk/batch.png'});
 console.log('errs',errs);await b.close();})();
