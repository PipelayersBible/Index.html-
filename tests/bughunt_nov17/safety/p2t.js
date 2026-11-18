// Unfinished Permits text: outside-range tests marked, local times, emergency number, unlogged hazards.
const L=require('./lib');(async()=>{const {b,p,H}=await L({file:process.env.FILE||'cur.html'});
 await H.lock({cpJobNumber:'24-017'});
 await H.read(20.9,0,0,0);await H.read(19.4,11,12,30);await H.read(19.5,10,10,25);await H.read(15,null,null,null);
 await p.evaluate(()=>{document.getElementById('cpRosterName').value='Ed Entrant';document.getElementById('cpRosterRole').value='Entrant';return pbAddRosterPerson();});await p.waitForTimeout(600);
 await p.waitForTimeout(800);
 const t=await p.evaluate(async()=>{const raw=await window.__dbg('pbGetCriticalFor(confinedSessionOwnerUid,"activeConfinedSession")');const d=JSON.parse(raw);return window.__dbg('pbOpenSnapText')(window.__dbg('pbOpenSnapStrip')(d),Date.now());});
 console.log(t);
 const lines=t.split('\n');const air=lines.slice(lines.indexOf('AIR TESTS')+1,lines.indexOf('ROSTER'));
 const checks={emergencyNumber:/Emergency number: 911/.test(t),badMarked:air.some(l=>/O2: 19\.4%/.test(l)&&/OUTSIDE ACCEPTABLE RANGE/.test(l)),limitNotMarked:air.some(l=>/O2: 19\.5%.*CO: 25 ppm/.test(l)&&!/OUTSIDE/.test(l)),goodNotMarked:air.some(l=>/O2: 20\.9%/.test(l)&&!/OUTSIDE/.test(l)),noIso:!/\d{4}-\d\d-\d\dT\d\d:\d\d/.test(air.join('\n')),noInternals:!/order: |by: /.test(air.join('\n')),unlogged:/NOT in the log/.test(t)&&/O2: 15%/.test(t),count:/outside the acceptable range: 2 of 4/.test(t)};
 console.log(checks);const ok=Object.values(checks).every(Boolean);console.log(ok?'PASS':'FAIL','errs',p.errs);await b.close();process.exit(ok?0:1);})();
