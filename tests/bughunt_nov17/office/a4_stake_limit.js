// A stake photo whose AI read is refused (daily limit, plan, login) stays on the point's photos, like a no-signal read.
const L=require('./lib');
(async()=>{const {b,p}=await L.boot(L.URL,{init:L.co+`;try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}`});const H=L.F(p);
 let mode=null;await p.route('**/functions/v1/ai**',async r=>{await r.fulfill({status:mode.status,contentType:'application/json',body:JSON.stringify(mode.body)});});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 const photos=()=>p.evaluate(()=>((window._pbPhotos||{}).start||[]).length);let ok=true,n=0;
 for(const [name,m] of [['429 daily limit',{status:429,body:{error:'daily_limit',limit:30}}],['403 plan',{status:403,body:{}}],['401 login',{status:401,body:{}}]]){
  mode=m;await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);n++;
  const got=await photos(),st=await L.txt(p,'#startAiStakeStatus');console.log(name,'| photos on the point:',got,'|',st);
  if(got!==n){ok=false;console.log('  FAIL: the photo was dropped');}
  if(/Nothing on this point was changed/.test(st)&&got===n){ok=false;console.log('  FAIL: wording says nothing changed though the photo was kept');}}
 console.log(ok?'PASS':'FAIL','errs',p.errs);await b.close();process.exit(ok?0:1);})();
