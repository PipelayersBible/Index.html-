// fails on r16.88 (dbg.html), passes on fix.html: check-shot entry on an architect rod + tolerance display
const mk=require('./mk');
(async()=>{const {b,p,H}=await mk({arch:true,pre:async(p)=>{await p.evaluate(()=>{document.getElementById('runSecMore').open=true;});/* r16.95: rod is under More settings */await p.click('#rodToggle button[data-val="architect"]');await p.waitForTimeout(300);}});
 let ok=true;const say=(n,c,x)=>{console.log((c?'ok   ':'FAIL ')+n+(x!==undefined?' :: '+x:''));if(!c)ok=false;};
 const near=(a,b)=>a!==null&&Math.abs(a-b)<1e-6;
 const P=await p.evaluate(()=>Object.fromEntries(['4.36','-4.36','.5','7-3 1/2',"7'-3 1/2\"",'7 3 1/2',"7' 3.5\"",'7-3-1/2',"7' 3-1/2\"","4.36'",'4.36 ft','94"','3 1/2"','7-13','7-3 1/0','abc','—','',"7'-11 15/16\"","0'-3\""].map(s=>[s,pbCsParse(s)])));
 say('old forms unchanged',near(P['4.36'],4.36)&&near(P['-4.36'],-4.36)&&near(P['.5'],0.5)&&near(P['7-3 1/2'],7+3.5/12)&&near(P["7'-3 1/2\""],7+3.5/12)&&near(P['7 3 1/2'],7+3.5/12)&&near(P["7' 3.5\""],7+3.5/12)&&near(P["7'-11 15/16\""],7+11.9375/12)&&near(P["0'-3\""],0.25)&&P['7-13']===null&&P['abc']===null&&P['—']===null&&P['']===null);
 say('7-3-1/2 and 7\' 3-1/2" are read',near(P['7-3-1/2'],7+3.5/12)&&near(P["7' 3-1/2\""],7+3.5/12),P['7-3-1/2']);
 say("4.36' and 4.36 ft are read",near(P["4.36'"],4.36)&&near(P['4.36 ft'],4.36),P["4.36'"]);
 say('inches only are inches',near(P['94"'],94/12)&&near(P['3 1/2"'],3.5/12),P['94"']+' / '+P['3 1/2"']);
 say('a zero denominator is refused',P['7-3 1/0']===null,P['7-3 1/0']);
 await p.evaluate(()=>window.pbCsOpen(3));await p.waitForTimeout(400);
 say('architect field has the full keyboard',await p.evaluate(()=>document.getElementById('pbCsRod').getAttribute('inputmode'))==='text');
 await p.click('#pbCsRefs [data-ref="inv"]');await p.fill('#pbCsRod','7-10-1/8');
 say('7-10-1/8 gives a live result',/grade|HIGH|LOW/.test(await p.evaluate(()=>document.getElementById('pbCsOut').textContent)));
 await p.fill('#pbCsRod','7 ft and a bit');await p.click('#pbCsSave');await p.waitForTimeout(200);
 const msg=await p.evaluate(()=>document.getElementById('pbCsOut').textContent);say('unreadable text is called unreadable',/can.t be read/.test(msg),msg);
 // double Enter saves once
 await p.fill('#pbCsRod','7-10');await p.evaluate(()=>{const i=document.getElementById('pbCsRod');const k=()=>i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));k();k();});await p.waitForTimeout(1200);
 await H.modalClick('OK').catch(()=>{});
 const n=await p.evaluate(()=>(window.__pbCsEntry().checkShots||[]).length);say('Enter twice saves one shot',n===1,n);
 const R=await p.evaluate(()=>[-0.0208,-0.02,0.0249,0.0251,0.0312].map(d=>[pbCsResult(d).ok,pbCsResult(d).txt]));
 say('what prints as 0.02 ft is on grade; 0.03 is not',R[0][0]&&R[1][0]&&R[2][0]&&!R[3][0]&&!R[4][0]&&/3\/8"/.test(R[4][1]),JSON.stringify(R));
 console.log('errs',p.errs.slice(0,3));console.log(ok&&!p.errs.length?'PASS':'FAIL');await b.close();process.exit(ok?0:1);})();
