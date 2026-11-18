const L=require('./lib');(async()=>{const {b,p,H}=await L({});
 const D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 console.log(await H.lock({cpJobNumber:'24-017',cpAtmoInterval:'15',cpCommInterval:'10'}));
 await H.read(20.9,0,0,0);await H.read(19.4,11,12,30);
 // check in entrant (add)
 await p.evaluate(()=>{document.getElementById('cpRosterName').value='Ed Entrant';document.getElementById('cpRosterRole').value='Entrant';return pbAddRosterPerson();});await p.waitForTimeout(600);
 await p.evaluate(()=>pbToggleRosterStatus(2));await p.waitForTimeout(800);
 let m=await H.modal();console.log('checkin modal:',m&&m.slice(0,400),await H.modalBtns());
 const raw=await D('pbGetCriticalFor(confinedSessionOwnerUid,"activeConfinedSession")');
 const snap=await p.evaluate(async()=>{const raw=await window.__dbg('pbGetCriticalFor(confinedSessionOwnerUid,"activeConfinedSession")');const d=JSON.parse(raw);return window.__dbg('pbOpenSnapText')(window.__dbg('pbOpenSnapStrip')(d),Date.now());});
 console.log(snap);
 console.log('errs',p.errs);await b.close();})();
