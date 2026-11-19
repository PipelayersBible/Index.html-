// r17.09: Text a Join Link is one tap on a phone: "Text Join Link" makes the link AND opens Messages with it.
// A computer keeps "Make Join Link" (it can't text). Run like t130 (needs boot_ob.js, obsrv.js beside it).
const {chromium}=require('playwright');const boot=require('./boot_ob');
const BASE=(process.env.PB_URL||'http://127.0.0.1:8931/cur.html');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CONTRACTOR=`window.__tableOne={subscriptions:{tier:'contractor',status:'active'}};`;
const sheet=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return d?d.innerText.replace(/\s+/g,' '):'';});
(async()=>{
 const b=await chromium.launch();
 for(const [ua,label] of [[IOS,'iPhone'],[undefined,'computer']]){
  const srv=require('./obsrv')({paid:5,interval:'year'});
  const {p}=await boot(b,BASE,srv,{init:CONTRACTOR+'window.__pbObNoNav=true;',ua});
  p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.evaluate(()=>pbOpenCrewMembers());await p.waitForTimeout(1500);
  await p.click('#crJoinLinkBtn');await p.waitForTimeout(900);
  const btn=await p.evaluate(()=>document.getElementById('pbObMakeBtn').textContent.trim());
  ok(btn===(label==='iPhone'?'Text Join Link':'Make Join Link'),label+': the button says "'+btn+'"');
  await p.fill('#pbObInvName','Nate');await p.click('#pbObMakeBtn');await p.waitForTimeout(1200);
  const st=await p.evaluate(()=>({opened:window.__pbObSmsOpened||null,href:(document.getElementById('pbObTextIt')||{}).getAttribute&&document.getElementById('pbObTextIt').getAttribute('href'),again:(document.getElementById('pbObTextIt')||{}).textContent,next:document.getElementById('pbObMakeBtn').textContent.trim(),name:document.getElementById('pbObInvName').value}));
  if(label==='iPhone'){
    ok(!!st.opened&&/^sms:\?&body=/.test(st.opened)&&/#join=[A-Za-z0-9_-]{32}/.test(decodeURIComponent(st.opened))&&/as Pipelayer/.test(decodeURIComponent(st.opened)),'iPhone: ONE tap opened Messages with the join link');
    ok(st.href===st.opened&&st.again==='Text It Again','iPhone: the card keeps "Text It Again" with the same link');
    ok(/Messages opened with the link in it/.test(await sheet(p)),'iPhone: says Messages opened');
  } else {
    ok(!st.opened&&/^sms:/.test(st.href||'')&&st.again==='Text It','computer: no Messages opened; the card offers Text It / Share / Copy Link');
  }
  ok(st.next===btn&&st.name==='','ready for the next person (button "'+st.next+'", name cleared)');
  ok(p.errs.length===0,label+': no page errors '+JSON.stringify(p.errs));
  await p.context().close();
 }
 await b.close();
 console.log('t133 done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
