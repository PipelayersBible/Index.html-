// simplify 04: an empty simple calculator opens with the cursor in its first box (one tap less to an answer).
const L=require('./_lib');const {ok}=L;
const ae=(p)=>p.evaluate(()=>document.activeElement.id||document.activeElement.tagName);
const open=async(p,name)=>{await p.click('#pbTabCalculators');await p.waitForTimeout(500);await p.locator('#screen-calcHub button:visible',{hasText:name}).first().click();await p.waitForTimeout(600);};
const trenchAnswer=(p)=>p.evaluate(()=>document.getElementById('trenchResult').innerText.replace(/\s+/g,' ').slice(0,60));
(async()=>{
 // before: Calculators, Trench Sloping, tap the depth box, type = 3 taps
 let {b,p}=await L.start(L.BASE);await open(p,'Trench Sloping');
 const f0=await ae(p);await p.keyboard.type('6');await p.waitForTimeout(400);const a0=await trenchAnswer(p);
 ok(f0!=='trenchDepth'&&!/1:1/.test(a0),'before: typing right after opening does nothing (cursor on '+f0+'), a 3rd tap on the box is needed');
 await p.click('#trenchDepth');await p.keyboard.type('6');await p.waitForTimeout(400);ok(/1:1/.test(await trenchAnswer(p)),'before: 3 taps + typing gives the answer');await b.close();
 // after: Calculators, Trench Sloping, type = 2 taps
 ({b,p}=await L.start(L.CUR));await open(p,'Trench Sloping');
 ok(await ae(p)==='trenchDepth','after: cursor is in Trench depth on opening');
 ok(await p.evaluate(()=>scrollY===0&&document.querySelector('#screen-trenchCalc .pb-warn').getBoundingClientRect().top>0),'the competent-person warning above the box is still on screen (no scroll)');
 await p.keyboard.type('6');await p.waitForTimeout(400);const a1=await trenchAnswer(p);ok(/1:1/.test(a1),'after: 2 taps + typing gives the answer: "'+a1+'"');
 console.log('Trench Sloping from Home: taps before 3, after 2');
 // a value already there: no cursor (the answer stays readable, no keyboard)
 await p.evaluate(()=>document.activeElement.blur());await open(p,'Trench Sloping');ok(await ae(p)!=='trenchDepth'&&await p.inputValue('#trenchDepth')==='6','reopened with a depth kept: no cursor, value kept');
 // the others
 for(const [name,id] of [['Slope / Grade Converter','slopeConvVal'],['Tenths','fracDecIn'],['Bend Offset','bendOffset'],['Backfill Lift Count','liftDepth'],['Manhole Rim-to-Invert','mhRim'],['Pipe Weight','pwID'],['Manning','manDia']]){await p.evaluate(()=>document.activeElement.blur());await open(p,name);ok(await ae(p)===id,name+': cursor in '+id);}
 // left alone on purpose
 for(const [name,scr] of [['Confined Space Ventilation','ventCalc'],['Material Volume','volumeCalc'],['Rod Reading','rodElevCalc']]){await p.evaluate(()=>document.activeElement.blur());await open(p,name);const a=await ae(p);ok(await p.evaluate(s=>document.getElementById('screen-'+s).classList.contains('active'),scr)&&!/^(vent|vol|rodElev)/.test(a),name+': no cursor placed ('+a+')');}
 // Back onto a calculator: no cursor
 await p.evaluate(()=>document.activeElement.blur());await open(p,'Bend Offset');await p.evaluate(()=>document.activeElement.blur());await p.evaluate(()=>pbGoto('refBends'));await p.waitForTimeout(300);await p.evaluate(()=>pbGoto('bendCalc',true));await p.waitForTimeout(300);
 ok(await ae(p)!=='bendOffset','Back onto a calculator: no cursor');
 // opened for a run (Review's deep-trench button fills the depth): no cursor, depth filled
 await p.evaluate(()=>pbGoto('home',false,true));await p.waitForTimeout(300);await L.mkrun(p,100);
 await p.locator('#screen-review button:visible',{hasText:'Check Trench Sloping Calculator'}).first().click();await p.waitForTimeout(900);
 const dv=await p.inputValue('#trenchDepth');ok(dv!==''&&await ae(p)!=='trenchDepth','opened from a run: depth filled in ('+dv+'), no cursor');
 ok(p.errs.length===0,'no page errors '+p.errs.join('|'));await L.done(b);
})();
