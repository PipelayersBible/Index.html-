// Weather race: the weather asked for one day must never land on (or be cached for) another day or job.
const L=require('./lib');const mkrun=require(__dirname+'/../../rig/mkrun');
(async()=>{const {b,p,H}=await L({file:process.env.FILE||'cur.html',init:require(__dirname+'/../../rig/co_fm.js')});
 const D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 await mkrun(p,100);
 await p.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}};s('saJobNumber','24-017');s('saJobsite','Test Sewer');});
 await mkrun.lock(p);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);}
 await p.evaluate(()=>{window.__wx=[];window.__dbg('sbClient').functions.invoke=(name,o)=>new Promise(res=>{const body=o.body;window.__wx.push(body);setTimeout(()=>res({data:{ok:true,weather:{station:'K'+body.work_date,complete:true,retrieved_at:new Date().toISOString(),data:{station:'K'+body.work_date,high_f:70,low_f:50,high_c:21,low_c:10,precip_in:0,precip_hours_reported:24,wind_max_mph:5,gust_max_mph:null,conditions:[{text:'WX of '+body.work_date+' job '+body.job_number,n:1}],obs_count:24,first_obs:body.work_date+'T08:00:00Z',last_obs:body.work_date+'T23:00:00Z',tz:'America/Los_Angeles'}}},error:null}),name==='weather'?2500:0);});});
 await p.evaluate(()=>window.pbOpenDailyReport({tab:'report'}));await p.waitForTimeout(1200);
 const today=await D('pbDlyView.date');
 console.log('today',today,'asked',JSON.stringify(await p.evaluate(()=>window.__wx)));
 // while today's weather is still being fetched, the foreman switches to yesterday
 const y=new Date(Date.parse(today+'T12:00:00Z')-86400000).toISOString().slice(0,10);
 await p.evaluate(d=>{document.getElementById('drDate').value=d;return window.pbDlyPick();},y);
 await p.waitForTimeout(4500);
 const v=await D('({date:pbDlyView.date,wx:pbDlyView.weather&&pbDlyView.weather.station,cache:Object.keys(pbDly.st.weather).map(k=>k+" => "+pbDly.st.weather[k].station)})');
 console.log('view',JSON.stringify(v));
 console.log('shown:',await p.evaluate(()=>{const e=document.getElementById('drWeatherText');return e?e.textContent:null;}));
 const wrongView=v.wx&&v.wx!=='K'+v.date, wrongCache=v.cache.some(s=>{const [k,st]=s.split(' => ');return st!=='K'+k.split('|')[1];});
 const ok=!wrongView&&!wrongCache;console.log(ok?'PASS':'FAIL',{wrongView,wrongCache},'errs',p.errs);await b.close();process.exit(ok?0:1);})();
