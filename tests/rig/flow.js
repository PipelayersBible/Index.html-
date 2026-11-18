// shared helpers for walk scripts
const fs=require('fs');const E=require('./env');
module.exports=(p)=>{
 const H={};
 H.f=async(id,v)=>{await p.click('#'+id);await p.fill('#'+id,String(v));await p.keyboard.press('Tab');await p.waitForTimeout(150);};
 H.sel=async(id,label)=>{await p.selectOption('#'+id,{label});await p.waitForTimeout(150);};
 H.modal=()=>p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?d.innerText.replace(/\s+/g,' ').slice(0,400):null;});
 H.modalBtns=()=>p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?[...d.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()):[];});
 H.modalClick=async(txt)=>{await p.evaluate(t=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());const b=d&&[...d.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()===t);if(!b)throw new Error('no modal button '+t);b.click();},txt);await p.waitForTimeout(500);};
 H.click=async(txt)=>{await p.evaluate(t=>{const b=[...document.querySelectorAll('button,a,[role=button]')].find(b=>b.offsetParent&&b.textContent.trim()===t);if(!b)throw new Error('no button '+t);b.click();},txt);await p.waitForTimeout(600);};
 H.screen=()=>p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s&&s.id;});
 H.shot=async(name,full=true)=>{await p.screenshot({path:E.out('/tmp/claude-0/walk')+'/'+name+'.png',fullPage:full});};
 H.img=n=>({name:n+'.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync(E.FIX+'/evimg/'+n+'.jpg')});
 H.btns=()=>p.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim().slice(0,30)).filter(Boolean));
 return H;};
module.exports.setup=async(p,H)=>{
 let stake=null;
 await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num||'',conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line||'',conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Wildomar Sewer Ph 2');
 await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12'),H.img('p13')]);await p.waitForTimeout(1800);
 await H.f('startStakeReading','4.36');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
 stake=S('2+12',103.7,3.69,'AP','3861');await p.setInputFiles('#hub0AiStakePhoto',[H.img('p12'),H.img('p13')]);await p.waitForTimeout(1800);
 await H.sel('hub0FitAng','22.5°');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
 stake=S('3+39',104.0,3.73,'WYE','3862');await p.setInputFiles('#hub1AiStakePhoto',[H.img('p12'),H.img('p13')]);await p.waitForTimeout(1800);
 await H.sel('hub1FitBr','6"');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p12'),H.img('p13')]);await p.waitForTimeout(1800);
 return {setStake:(v)=>{stake=v;},S};
};
