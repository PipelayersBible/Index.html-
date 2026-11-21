// State audit Nov 21 patch 1: the water / sewer crossing rule follows the job's state.
// Our pipe: 12" ductile iron (a water main). A sewer crosses 20 in BELOW it, then 20 in ABOVE it.
//   below (water on top, 20 in): CA clear (1 ft), TX flagged (2 ft over gravity sewer), FL clear (6 in), OH clear (18 in), unknown clear
//   above (water underneath, 20 in): CA flagged (water must be on top), TX flagged, FL clear (12 in below), OH clear (18 in)
//   10 in below (the crossing's own Min. clearance box is 12 in and still applies): OH flagged with the Ten States line naming Ohio; unknown flagged "Job state not known"
const R=__dirname+'/../../../../rig/';const boot=require(R+'boot');const co=require(R+'co');const F=require(R+'flow');
const URL=process.env.PB_URL||'http://127.0.0.1:10580/cur.html';
(async()=>{const {b,p}=await boot(URL,{init:co});const H=F(p);const bad=[];
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Water');
 await p.selectOption('#runPipeType','Ductile Iron');await p.waitForTimeout(300);
 await H.sel('runIdSel','12"');await p.waitForTimeout(300);
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.f('endStakeReading','3.50');
 const g=await p.evaluate(()=>({wt:document.getElementById('runWT').value}));
 const inv=99.79+(100.43-99.79)*100/301, wt=parseFloat(g.wt), bop=inv-wt, top=inv-wt+13.2/12;
 await p.evaluate(()=>pbXingAdd(1));await p.waitForTimeout(300);
 const id=await p.evaluate(()=>document.querySelector('#screen-input .pb-xing-card').dataset.xingId);
 await H.f(id+'Sta','2+50');await H.f(id+'Util','Sewer');
 const live=async(st)=>{await p.evaluate(c=>{window.pbSrJobState=()=>c?{code:c,how:'picked'}:{code:'CA',how:'default'};window.pbXingLiveNow();},st);await p.waitForTimeout(150);
   return p.evaluate(()=>{const e=document.querySelector('#screen-input .pb-xing-card .pb-xing-live');return e&&!e.hidden?e.textContent:'(none)';});};
 const want=(lbl,t,re,ok)=>{const pass=re.test(t)===ok;console.log((pass?'ok  ':'BAD ')+lbl+': '+t);if(!pass)bad.push(lbl);};
 const setTop=async v=>{await H.f(id+'Bop','');await H.f(id+'Top',v.toFixed(3));await p.waitForTimeout(500);};
 const setBop=async v=>{await H.f(id+'Top','');await H.f(id+'Bop',v.toFixed(3));await p.waitForTimeout(500);};
 await setTop(bop-20/12); // sewer 20 in below our water main
 want('below CA',await live('CA'),/^Clear/,true);
 want('below TX',await live('TX'),/Texas rule \(TCEQ 290\.44\).*2 ft/,true);
 want('below FL',await live('FL'),/^Clear/,true);
 want('below OH',await live('OH'),/^Clear/,true);
 want('below unknown',await live(''),/^Clear/,true);
 await setBop(top+20/12); // sewer 20 in above our water main
 want('above CA',await live('CA'),/Title 22 \(California\).*Your water pipe is below it/,true);
 want('above TX',await live('TX'),/Texas rule.*Your water pipe is below it/,true);
 want('above FL',await live('FL'),/^Clear/,true);
 want('above OH',await live('OH'),/^Clear/,true);
 await setTop(bop-10/12); // sewer 10 in below
 want('10in OH',await live('OH'),/Ten States Standards: at least 18 in.*Check Ohio/,true);
 want('10in unknown',await live(''),/Job state not known/,true);
 want('10in FL (crossing box 12 in still wins)',await live('FL'),/\(min 1\.00 ft\)/,true);
 want('10in CA',await live('CA'),/Title 22 \(California\): water must cross at least 1 ft above/,true);
 const t=await live('NY');want('no Title 22 outside CA',t,/Title 22/,false);
 // gas crossing: no water/sewer rule in any state
 await H.f(id+'Util','Gas');want('gas TX 10in: box minimum only, no state rule',await live('TX'),/^Top of the gas.*\(min 1\.00 ft\)/,true);
 console.log(bad.length||p.errs.length?'FAIL':'PASS',bad,p.errs.slice(0,3));await b.close();process.exit(bad.length||p.errs.length?1:0);})();
