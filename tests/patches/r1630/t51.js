const boot=require('./boot');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/idx30.html');
 await p.route('**/functions/v1/ai**', async r=>{const reply={is_stake:true,stake_number:{value:'3865',conf:'high'},station:{value:'02+12',conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:'AP',conf:'high'},cut_fill:{direction:'cut',feet:3.14,as_written:'C-3.14',to:'IE',conf:'high'},stake_elevation:{feet:104.26,as_written:'104.26',conf:'high'},other_text:'',uncertain:[]};
   await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(reply),used:1,limit:60})});});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 await p.evaluate(()=>{const e=document.getElementById('runIdSel');e.value=[...e.options].find(o=>o.text.trim()==='8"').value;e.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.evaluate(()=>pbAddHub());await p.evaluate(()=>pbAddHub());await p.waitForTimeout(600);
 const ids=await p.evaluate(()=>[...document.querySelectorAll('[id$="FitOn"]')].map(e=>e.id));console.log('fit boxes',ids);
 // manual tick on hub1: no wye assumed
 await p.evaluate(()=>{const e=document.getElementById('hub0FitOn');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(300);
 console.log('manual:',await p.evaluate(()=>[document.getElementById('hub0FitType').value||'(choose)',document.getElementById('hub0FitLay').value||'(blank)'].join(' | ')));
 // AI on hub1
 const fs=require('fs');await p.setInputFiles('#hub1AiStakePhoto',[{name:'a.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('/tmp/claude-0/evimg/p12.jpg')},{name:'b.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('/tmp/claude-0/evimg/p13.jpg')}]);await p.waitForTimeout(2500);
 console.log('ai:',await p.evaluate(()=>[document.getElementById('hub1FitOn').checked,document.getElementById('hub1FitType').value,document.getElementById('hub1FitInfo').value,document.getElementById('hub1FitLay').value,document.getElementById('hub1StakeElev').value,document.getElementById('hub1Label').value].join(' | ')));
 console.log('status:',await p.evaluate(()=>document.getElementById('hub1AiStakeStatus').innerText.replace(/\s+/g,' ')));
 console.log('errs',p.errs.length,p.errs.slice(0,3));await b.close();})();
