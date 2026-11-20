// hunt_nov19 02: a DAY crew leaves Monday's run open (End Run never tapped). Tuesday 7:15 AM they start a new run.
// The night-shift rule (r17.06 #47) must not move Tuesday's run onto Monday's report: Monday's shift started 24 h earlier.
// A real night shift (19:00 start, a run still open, the next run at 00:30) must still stay on the shift's day.
process.env.PB_ROOT=process.env.PB_ROOT||'http://127.0.0.1:9000/';process.env.PG=process.env.PG||'hk.html' /* a page with the runner hooks: node mkhk.js in.html hk.html */;process.env.PB_OUT=process.env.PB_OUT||'/tmp/claude-0/hunt19/out';require('fs').mkdirSync(process.env.PB_OUT,{recursive:true});
const L=require(require('path').resolve(__dirname,'../../../r1706/daily3/tests/lib3.js'));const at=(s)=>Date.parse(s);
(async()=>{
  const {b,p}=await L.boot2('',{time:'2026-11-16T07:00:00-08:00',tz:'America/Los_Angeles'});
  await L.capSubmit(p);
  await L.mkrun(p,{job:'24-017',dist:100});
  await L.prod(p,{by:'Tommy',pipe:100});
  // the crew goes home without tapping End Run; next morning 7:15 a new run on the same job, ended 11:30
  await p.clock.fastForward('24:15:00');await p.waitForTimeout(500);
  await L.mkrun(p,{job:'24-017',dist:100});
  await L.prod(p,{by:'Tommy',pipe:60});
  await p.clock.fastForward('04:15:00');await p.waitForTimeout(300);
  await L.endRun(p);
  const days=await L.ev(p,`runArchive.slice().sort((a,b)=>a.id-b.id).map(e=>pbFmDay(e.runStartTime)+'>'+__pbDlyRunDay(e)+(e.completed||e.incomplete?' ended':' open'))`);console.log('days',JSON.stringify(days));
  L.ok(days.length===2&&/^2026-11-16>2026-11-16 open/.test(days[0]),'Monday’s run is on Monday and still open');
  L.ok(/^2026-11-17>2026-11-17/.test(days[1]),'the run started Tuesday 7:15 AM is reported on Tuesday (got '+days[1]+')');
  await L.daily(p,{job:'24-017',date:'2026-11-17'});
  const tue=await L.ev(p,`pbDlyView.snap&&{runs:pbDlyView.snap.runs.items.length,ft:pbDlyView.snap.runs.totals.pipe&&pbDlyView.snap.runs.totals.pipe.qty}`);console.log('Tue',JSON.stringify(tue));
  L.ok(tue&&tue.runs===1&&tue.ft===60,'Tuesday’s daily report has Tuesday’s run (60 LF)');
  await L.daily(p,{job:'24-017',date:'2026-11-16'});
  const mon=await L.ev(p,`pbDlyView.snap&&{runs:pbDlyView.snap.runs.items.length,ft:pbDlyView.snap.runs.totals.pipe&&pbDlyView.snap.runs.totals.pipe.qty}`);console.log('Mon',JSON.stringify(mon));
  L.ok(mon&&mon.runs===1&&mon.ft===100,'Monday’s daily report has only Monday’s run (100 LF)');
  // control: a real night shift with a run still open keeps its after-midnight run
  const night=await L.ev(p,`(()=>{const keep=runArchive.slice();runArchive.length=0;const T=(s)=>Date.parse(s);
    const a={kind:'run',id:1,jobNumber:'24-017',runStartTime:T('2026-11-18T19:00:00-08:00'),runEndTime:null};
    const c={kind:'run',id:2,jobNumber:'24-017',runStartTime:T('2026-11-19T00:30:00-08:00'),runEndTime:T('2026-11-19T03:00:00-08:00'),completed:true};
    const d={kind:'run',id:3,jobNumber:'24-017',runStartTime:T('2026-11-19T05:30:00-08:00'),runEndTime:T('2026-11-19T06:00:00-08:00'),completed:true};
    runArchive.push(a,c,d);const r=[__pbDlyRunDay(a),__pbDlyRunDay(c),__pbDlyRunDay(d)];runArchive.length=0;keep.forEach(e=>runArchive.push(e));return r;})()`);
  L.ok(night.join()==='2026-11-18,2026-11-18,2026-11-18','a night shift (19:00, a run still open, runs at 00:30 and 05:30) stays on the shift’s day: '+night.join());
  // a day crew whose FIRST run of the day started in the afternoon (2:30 PM) and stayed open; next morning 6:15 AM
  const pm=await L.ev(p,`(()=>{const keep=runArchive.slice();runArchive.length=0;const T=(s)=>Date.parse(s);
    const a={kind:'run',id:1,jobNumber:'24-017',runStartTime:T('2026-11-18T14:30:00-08:00'),runEndTime:null};
    const c={kind:'run',id:2,jobNumber:'24-017',runStartTime:T('2026-11-19T06:15:00-08:00'),runEndTime:T('2026-11-19T10:00:00-08:00'),completed:true};
    runArchive.push(a,c);const r=[__pbDlyRunDay(a),__pbDlyRunDay(c)];runArchive.length=0;keep.forEach(e=>runArchive.push(e));return r;})()`);
  L.ok(pm.join()==='2026-11-18,2026-11-19','a day crew’s open 2:30 PM run does not catch the next morning’s 6:15 AM run: '+pm.join());
  // a 6 PM night shift whose first run is still open: a run at 7:30 AM (13.5 h in) is still the shift’s
  const n2=await L.ev(p,`(()=>{const keep=runArchive.slice();runArchive.length=0;const T=(s)=>Date.parse(s);
    const a={kind:'run',id:1,jobNumber:'24-017',runStartTime:T('2026-11-18T18:00:00-08:00'),runEndTime:null};
    const c={kind:'run',id:2,jobNumber:'24-017',runStartTime:T('2026-11-19T07:30:00-08:00'),runEndTime:T('2026-11-19T08:00:00-08:00'),completed:true};
    runArchive.push(a,c);const r=[__pbDlyRunDay(a),__pbDlyRunDay(c)];runArchive.length=0;keep.forEach(e=>runArchive.push(e));return r;})()`);
  L.ok(n2.join()==='2026-11-18,2026-11-18','a 6 PM night shift (first run still open) keeps its 7:30 AM run: '+n2.join());
  await L.done(b,p);
})().catch(e=>{console.log('FAIL exception',e&&e.stack||e);process.exit(1);});
