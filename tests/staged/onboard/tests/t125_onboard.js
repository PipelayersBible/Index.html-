// t125 feat onboard: "text him a link, he taps it, he's in".
// (A) the office makes a Pipelayer link for "Mike" on Crew members -> Text It is an sms: link with the #join= URL and the code.
// (B) the pipelayer taps it on an iPhone in Safari, signed out: the token leaves the address bar at once; Step 1 of 2 asks
//     for Add to Home Screen and copies the join code.
// (C) the Home Screen app (its own storage, standalone, signed out): Log In > Join a Crew or Use a Code > Paste Join Code >
//     the join sheet (company, role, inviter, name filled in, crew notice) > tick Terms > Join Crew -> a no-email account,
//     signed in, in the company as Pipelayer; Terms and notice recorded, neither pops up; the hidden address never shown.
// (D) the link can't be used twice; the office sees "Joined" with his name.
// (E) a foreman: Settings > Add a Pipelayer by Text, Pipelayer only; Android joins straight from the link (no Home Screen step).
// (F) the no-email account: Settings > Get a Code for the Home Screen App -> another screen signs in to the same account
//     with the typed code; Log Out warns first. (G) a cancelled link is refused. No page errors anywhere.
const {chromium}=require('/opt/npm-tools/node_modules/playwright');const boot=require('./boot_ob');
const BASE=(process.env.PB_URL||'http://127.0.0.1:8878/cur.html');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const sheet=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return d?d.innerText.replace(/\s+/g,' '):'';});
const toLocal=(url)=>BASE+url.slice(url.indexOf('#'));
(async()=>{
 const srv=require('./obsrv')();const b=await chromium.launch();const pages=[];
 const crewList=`window.__tableOne={subscriptions:{tier:'contractor',status:'active'}};window.__rpcOverride={pb_crew_list:()=>({company_id:'${srv.C}',company_name:'DIG Civil Construction',is_owner:true,can_manage_pms:true,seats:2,members:[],invitations:[]})};`;
 // ---------- A: the office ----------
 const O=(await boot(b,BASE,srv,{init:crewList})).p;pages.push(O);
 await O.evaluate(()=>pbOpenCrewMembers());await O.waitForTimeout(1200);
 ok(await O.evaluate(()=>{const x=document.getElementById('crJoinLinkBtn');return !!x&&x.offsetParent!==null;}),'A: Crew members shows Text a Join Link');
 await O.click('#crJoinLinkBtn');await O.waitForTimeout(600);
 ok(/Pipelayer/.test(await sheet(O))&&/Foreman/.test(await sheet(O))&&/DIG Civil Construction/.test(await sheet(O)),'A: the office can pick Pipelayer or Foreman; the company is named');
 await O.fill('#pbObInvName','Mike');await O.click('#pbObMakeBtn');await O.waitForTimeout(800);
 const sms=await O.evaluate(()=>document.getElementById('pbObTextIt').getAttribute('href'));const body=decodeURIComponent(sms.replace(/^sms:\?&body=/,''));
 const url=(/https:\/\/app\.pipelayersbible\.com\/#join=[A-Za-z0-9_-]{32}/.exec(body)||[])[0];
 ok(/^sms:\?&body=/.test(sms)&&!!url&&/as Pipelayer/.test(body)&&/works once, for 24 hours/.test(body),'A: Text It opens Messages with the link, the role and "works once, for 24 hours"');
 const code=(/Code to read out: ([A-Z0-9]{3} [A-Z0-9]{3})/.exec(await sheet(O))||[])[1];
 ok(!!code&&/Mike · Pipelayer Not opened yet/.test(await sheet(O)),'A: the code to read out is shown, and the list says "Mike · Pipelayer, not opened yet" ('+code+')');
 // ---------- B: Safari on the iPhone ----------
 const S=(await boot(b,toLocal(url),srv,{ua:IOS,signedOut:true,wait:4500})).p;pages.push(S);
 ok(await S.evaluate(()=>!/join=/.test(location.href)),'B: the token is gone from the address bar');
 let t=await sheet(S);
 ok(/Step 1 of 2/i.test(t)&&/Add to Home Screen/.test(t)&&/Tommy invited you to join DIG Civil Construction as Pipelayer/.test(t),'B: Step 1 of 2 asks for Add to Home Screen first, naming inviter, company and role');
 ok(t.includes(code),'B: the same code is shown to type in the Home Screen app');
 await S.click('#pbObCopyBtn');await S.waitForTimeout(300);
 const copied=await S.evaluate(()=>window.__pbObCopied);
 ok(copied==='PBJOIN:'+url.split('#join=')[1]&&/Copied/.test(await sheet(S)),'B: Copy Join Code puts the join token on the clipboard');
 ok(await S.evaluate(()=>!!document.getElementById('pbObHereBtn')),'B: "Skip: Join Here in Safari" is offered');
 // ---------- C: the Home Screen app (new storage, standalone, signed out) ----------
 const H=(await boot(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,clip:copied,wait:3500})).p;pages.push(H);
 await H.evaluate(()=>pbOpenLogin());await H.waitForTimeout(500);
 ok(await H.evaluate(()=>{const x=document.getElementById('loginJoinBtn');return !!x&&x.offsetParent!==null;}),'C: Log In shows "Join a Crew or Use a Code"');
 await H.click('#loginJoinBtn');await H.waitForTimeout(300);await H.click('#pbObPasteBtn');await H.waitForTimeout(1200);
 t=await sheet(H);
 ok(/Join DIG Civil Construction/.test(t)&&/Tommy invited you to join as Pipelayer/.test(t)&&/No email or password needed/.test(t),'C: Paste Join Code opens the join sheet (company, inviter, role, no email or password)');
 ok(/What your company sees/i.test(t)&&/doesn’t track where you go/.test(t),'C: the crew notice is on the join sheet');
 ok(await H.evaluate(()=>document.getElementById('pbObName').value)==='Mike','C: his name is filled in from what the office typed');
 ok(await H.evaluate(()=>document.getElementById('pbObJoinBtn').disabled),'C: Join Crew waits for the Terms box');
 await H.fill('#pbObName','Mike Rivera');await H.check('#pbObTerms');await H.click('#pbObJoinBtn');await H.waitForTimeout(3500);
 t=await sheet(H);
 const me=await H.evaluate(()=>window.__pbObMe());
 ok(/You’re In/.test(t)&&/You joined DIG Civil Construction as Pipelayer/.test(t),'C: "You\'re In: DIG Civil Construction as Pipelayer"');
 ok(!!me&&me.link&&/@crew\.pipelayersbible\.com$/.test(me.email),'C: signed in on this phone with a new no-email account');
 const fn=await H.evaluate(()=>window.__fnLog);
 ok(fn.length===1&&fn[0][0]==='crew-join'&&fn[0][1].action==='join'&&fn[0][1].token===url.split('#join=')[1]&&fn[0][1].name==='Mike Rivera'&&fn[0][1].terms.t==='1.0','C: one crew-join call with the token, his name and the Terms version');
 ok(await H.evaluate(()=>window.__verifyArgs&&window.__verifyArgs.type==='magiclink'&&/^h-/.test(window.__verifyArgs.token_hash)),'C: the phone signed in with the one-time hash (verifyOtp, magiclink)');
 const m=srv.st.members.get(me&&me.id);
 ok(!!m&&m.role==='pipelayer'&&m.company_id===srv.C,'C: server: he is a member of the company with the preset role Pipelayer');
 ok(srv.st.terms.some(x=>x[0]===me.id&&x[1]==='1.0'&&x[2]==='1.0'),'C: the Terms agreement was recorded (pb_terms_accept 1.0 / 1.0)');
 ok(srv.st.notices.some(x=>x[0]===me.id&&x[1]==='crew_notice'),'C: the crew notice was recorded (pb_notice_ack)');
 await H.click('#pbObStartBtn');await H.waitForTimeout(3000);
 ok(await H.evaluate(()=>!document.getElementById('pbTermsSheet')),'C: the Terms sheet does not pop up again');
 ok(await H.evaluate(()=>{const o=document.getElementById('pbModalOverlay');return !o||getComputedStyle(o).display==='none'||!/What Your Company Sees/.test(o.innerText);}),'C: the crew notice does not pop up again');
 const acc=await H.evaluate(()=>(window.__pbObMe()||{}).acc);
 ok(!!acc&&acc.member===true&&acc.role==='pipelayer','C: the app has him as a company member, role Pipelayer');
 const shown=await H.evaluate(()=>{const e=document.getElementById('loggedInAs');return e?e.textContent:'';});
 ok(!/crew\.pipelayersbible\.com/.test(shown)&&/Mike Rivera/.test(shown),'C: the account shows as "Mike Rivera", never the hidden address ('+shown.slice(0,70)+')');
 // ---------- D: used up; the office sees him ----------
 const X=(await boot(b,toLocal(url),srv,{ua:AND,signedOut:true,wait:4000})).p;pages.push(X);
 t=await sheet(X);
 ok(/already used/.test(t)&&!/Join Crew/.test(t),'D: the same link on another phone: "already used", no way in');
 await O.evaluate(()=>pbObInvLoad());await O.waitForTimeout(600);
 t=await sheet(O);
 ok(/Mike · Pipelayer Joined/.test(t)&&/Remove them in Crew members/.test(t),'D: the office list shows Mike joined, with where to remove him');
 // ---------- E: a foreman (Pipelayer only); Android joins straight from the link ----------
 const FM=(await boot(b,BASE,srv,{user:{id:srv.FOREMAN,email:'ray@example.com',user_metadata:{full_name:'Ray'},app_metadata:{}},init:`window.__tableOne={subscriptions:{tier:'contractor',status:'active'}};`})).p;pages.push(FM);
 await FM.evaluate(()=>pbOpenSettings());await FM.waitForTimeout(800);
 ok(await FM.evaluate(()=>{const w=document.getElementById('settingsJoinLinkWrap');return !!w&&!w.hidden;}),'E: a foreman has Settings > Add a Pipelayer by Text');
 await FM.click('#settingsJoinLinkBtn');await FM.waitForTimeout(600);
 ok(await FM.evaluate(()=>!document.querySelector('#pbObSheet [data-role=foreman]')&&!!document.querySelector('#pbObSheet [data-role=pipelayer]')),'E: the foreman can only make Pipelayer links');
 await FM.click('#pbObMakeBtn');await FM.waitForTimeout(800);
 const url2=(/https:\/\/app\.pipelayersbible\.com\/#join=[A-Za-z0-9_-]{32}/.exec(decodeURIComponent(await FM.evaluate(()=>document.getElementById('pbObTextIt').getAttribute('href'))))||[])[0];
 const A2=(await boot(b,toLocal(url2),srv,{ua:AND,signedOut:true,wait:4500})).p;pages.push(A2);
 t=await sheet(A2);
 ok(/Join DIG Civil Construction/.test(t)&&/Ray invited you to join as Pipelayer/.test(t)&&!/Step 1 of 2/i.test(t),'E: Android goes straight to the join sheet (no Home Screen step)');
 ok(await A2.evaluate(()=>document.getElementById('pbObName').value)==='','E: no name typed by the foreman: he types his own');
 await A2.fill('#pbObName','Dave');await A2.check('#pbObTerms');await A2.click('#pbObJoinBtn');await A2.waitForTimeout(3500);
 ok(/You joined DIG Civil Construction as Pipelayer/.test(await sheet(A2)),'E: joined in 4 taps (link, name, Terms, Join Crew)');
 // ---------- F: a code for the Home Screen app; Log Out warns ----------
 await H.evaluate(()=>pbOpenSettings());await H.waitForTimeout(800);
 ok(await H.evaluate(()=>{const x=document.getElementById('settingsHandoffBtn');return !!x&&!x.hidden;}),'F: Settings offers "Get a Code for the Home Screen App" to the no-email account');
 await H.click('#settingsHandoffBtn');await H.waitForTimeout(800);
 const hcode=(/([A-Z0-9]{3} [A-Z0-9]{3})/.exec((await sheet(H)).split('Code for the Home Screen App')[1]||'')||[])[1];
 ok(!!hcode&&/works once, for 15 minutes/.test(await sheet(H)),'F: a one-time code (15 minutes) is shown ('+hcode+')');
 await H.click('#pbObHandoffCopy');ok(/^PBCODE:/.test(await H.evaluate(()=>window.__pbObCopied)),'F: Copy Code copies the sign-in token');
 await H.evaluate(()=>pbObClose());
 const H2=(await boot(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,wait:3500})).p;pages.push(H2);
 await H2.evaluate(()=>pbObOpenCode());await H2.waitForTimeout(300);await H2.fill('#pbObCodeIn',hcode.toLowerCase());await H2.click('#pbObCodeGo');await H2.waitForTimeout(3500);
 const me2=await H2.evaluate(()=>(window.__pbObMe()||{}).id);
 ok(me2===me.id&&/Signed In/.test(await sheet(H2)),'F: the typed code signs the other screen in to the same account');
 const fn2=await H2.evaluate(()=>window.__fnLog);
 ok(fn2.some(x=>x[1].action==='signin'),'F: by crew-join signin (no new account)');
 await H2.evaluate(()=>pbObClose());await H2.evaluate(()=>pbLogout());await H2.waitForTimeout(500);
 ok(/No Email or Password/.test(await H2.evaluate(()=>document.getElementById('pbModalOverlay').innerText)),'F: Log Out on a no-email account warns first');
 // ---------- G: a cancelled link ----------
 await O.evaluate(()=>pbObClose());await O.evaluate(()=>pbObOpenInvite());await O.waitForTimeout(500);
 await O.click('#pbObMakeBtn');await O.waitForTimeout(800);
 const url3=(/https:\/\/app\.pipelayersbible\.com\/#join=[A-Za-z0-9_-]{32}/.exec(decodeURIComponent(await O.evaluate(()=>document.getElementById('pbObTextIt').getAttribute('href'))))||[])[0];
 await O.evaluate(()=>{const x=document.querySelector('#pbObSheet .pbob-item.waiting [data-act=revoke]');x.click();});await O.waitForTimeout(500);
 await O.evaluate(()=>{const d=document.getElementById('pbModalOverlay');const bt=[...d.querySelectorAll('button')].find(x=>x.textContent.trim()==='Cancel Link');bt.click();});await O.waitForTimeout(1000);
 const G=(await boot(b,toLocal(url3),srv,{ua:AND,signedOut:true,wait:4000})).p;pages.push(G);
 ok(/cancelled/.test(await sheet(G)),'G: a cancelled link is refused ("This link was cancelled")');
 // ---------- page errors ----------
 const errs=pages.flatMap(p=>p.errs);ok(!errs.length,'no page errors'+(errs.length?': '+errs.join(' | ').slice(0,300):''));
 await H.screenshot({path:__dirname+'/../shots/t125_done.png'});
 await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
