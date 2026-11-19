// Busy office Home for the website hero: demo company with several active jobs (made-up names and numbers).
const R='/home/claude/index.html-/tests/rig';
const boot=require('./boot2');const co=require(R+'/co');
const OUT=process.env.OUT||'/tmp/claude-0/site/tools/raw';const URL=process.env.APP||'http://127.0.0.1:8851/index.html';
const T=process.env.TODAY||'2026-11-18';
const ago=(min)=>new Date(Date.parse(T+'T17:30:00Z')-min*60000).toISOString();
function plan(lf, mh, lat){return {categories:[
 {key:'excavation',name:'Excavation',unit:'LF',hours:120,planned:lf},{key:'pipe',name:'Pipe Installed',unit:'LF',hours:60,planned:lf},
 {key:'backfill',name:'Backfill',unit:'LF',hours:40,planned:lf},{key:'structures',name:'Manholes',unit:'EA',hours:80,planned:mh},
 {key:'laterals',name:'Laterals',unit:'EA',hours:30,planned:lat}]};}
function cats(p){return p.map(([key,unit,done,today,week])=>({key,unit,done,today,week,n:4}));}
const jobs=[
 {n:'24-117',name:'Main St Sewer Replacement',pl:plan(2400,8,36),c:cats([['excavation','LF',1980,220,860],['pipe','LF',1860,200,820],['backfill','LF',1720,180,760],['structures','EA',6,1,2],['laterals','EA',27,4,12]]),rt:3,min:12},
 {n:'24-121',name:'Oak Ave Storm Drain',pl:plan(1650,5,0),c:cats([['excavation','LF',1180,160,540],['pipe','LF',1100,150,500],['backfill','LF',960,120,430],['structures','EA',3,0,1]]),rt:2,min:25},
 {n:'24-126',name:'Desert View Water Main',pl:plan(3200,0,42),c:cats([['excavation','LF',940,260,940],['pipe','LF',880,240,880],['backfill','LF',700,220,700],['laterals','EA',9,3,9]]),rt:2,min:8},
 {n:'24-109',name:'Cherry Valley Lift Station',pl:plan(900,3,4),c:cats([['excavation','LF',860,40,180],['pipe','LF',840,40,180],['backfill','LF',820,60,200],['structures','EA',3,0,1],['laterals','EA',4,0,0]]),rt:1,min:47},
 {n:'24-131',name:'Pennsylvania Ave Sewer Lateral',pl:plan(600,2,18),c:cats([['excavation','LF',120,120,120],['pipe','LF',80,80,80],['laterals','EA',2,2,2]]),rt:1,min:63},
];
const dash={jobs:jobs.map(j=>({pms:2,cats:j.c,plan:j.pl,address:'',entries:24,job_key:j.n,jobsite:j.name,last_at:ago(j.min),waiting:0,end_date:null,pace_week:null,reporters:4,job_number:j.n,milestones:null,start_date:null,plan_version:1,project_name:j.name,schedule_ver:0,edits_waiting:0,last_work_date:T,schedule_muted:false,schedule_state:null,reporters_today:j.rt})),today:T,holidays:[],server_at:ago(1),checkpoints:'25',holidays_ver:0,can_set_company:true};
const mgr=`(function(){window.__tableOne=Object.assign(window.__tableOne||{},{subscriptions:{tier:'contractor',status:'active'},companies:{name:'Your Company',status:'active'}});const now=()=>new Date().toISOString();
window.__rpcOverride=Object.assign(window.__rpcOverride||{},{
 pb_prod_access:()=>({member:false,company_id:null,manager:true,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:null,server_at:now()}),
 pb_report_access:()=>({member:false,manager:true,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'}),
 pb_prod_company_dashboard:()=>(${JSON.stringify(dash)}),
 pb_my_name_get:()=>({ok:true,name:'Office'}),
});})();`;
(async()=>{
 const {b,p}=await boot(URL,{init:co.replace('Tommy Fontaine','Office')+mgr,wait:6000});
 await p.evaluate(()=>{[...document.querySelectorAll('button,a')].filter(x=>x.textContent.trim()==='Feedback').forEach(x=>x.style.display='none');});
 await p.waitForTimeout(500);
 // the tiles above the jobs come from other live feeds the rig doesn't fake: fill them with demo numbers that match the jobs
 await p.evaluate(()=>{
  const set=(id,n,lbl,sub,hot)=>{const b=document.getElementById(id);if(!b)return;const q=s=>b.querySelector(s);if(q('.pbx-num'))q('.pbx-num').textContent=n;if(lbl&&q('.pbx-lbl'))q('.pbx-lbl').textContent=lbl;if(q('.pbx-sub'))q('.pbx-sub').textContent=sub;b.classList.toggle('hot',!!hot);};
  const live=document.getElementById('homeCxLive');
  if(live){const h=live.querySelector('.pbx-now-h').outerHTML;live.innerHTML=h+'<span class="pbx-now-n"><span class="pbx-num">4</span><span class="pbx-lbl">active runs</span></span><span class="pbx-now-n"><span class="pbx-num">1</span><span class="pbx-lbl">active permit</span></span><span class="pbx-sub">Last sent 9:28 AM</span>';}
  set('homeCxInbox','2','Management inbox','2 unread',true);
  set('homeCxMat','1','Material alert','Near or over what’s ordered',true);
  set('homeCxWait','2','Waiting on foremen','2 runs',true);
  const pair=document.querySelector('.pbx-pair');
  if(pair){const bs=pair.querySelectorAll('button');
   const f=(b,n,sub)=>{if(!b)return;const a=b.querySelector('.pbx-num'),c=b.querySelector('.pbx-sub');if(a)a.textContent=n;if(c)c.textContent=sub;};
   f(bs[0],'5','Signed today');f(bs[1],'3','Today: 2 delays, 1 extra work');}
  const cn=document.getElementById('homeCoName');if(cn)cn.textContent='Your Company';
  const st=document.getElementById('homeCxStatus');if(st)st.textContent='5 jobs · Updated 9:29 AM.';
 });
 await p.waitForTimeout(150);
 await p.screenshot({path:OUT+'/busy.png'});await p.screenshot({path:OUT+'/busy_full.png',fullPage:true});
 const txt=await p.evaluate(()=>document.body.innerText);if(/Tommy|Fontaine|DIG|Sundance|Wildomar/i.test(txt))console.log('WARN real name on page');
 console.log('errs',p.errs);await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
