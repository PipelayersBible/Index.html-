// The Node-side stand-in for the server in the one-device tests: tests/obsrv.js (join links, hand-off codes, crew-join,
// Terms, notices) plus the rules of sql/01_one_device.sql: a finished sign-in ends the login's other sessions (reason
// other_device, or moved after a Home Screen code), every RPC from an ended session is refused with pb:signed_out + the
// reason (the gate), check-ins, the "why" answer, the sharing flags and the two note lists. Shared by every browser
// context of a test.
const crypto=require('crypto');
module.exports=function(opt={}){
  const base=require(__dirname+'/../../../obsrv.js')(opt), st=base.st, OFFICE=base.OFFICE, FOREMAN=base.FOREMAN;
  const USERS={[OFFICE]:{id:OFFICE,email:'tester@example.com',user_metadata:{full_name:'Test Office'},app_metadata:{}},
               [FOREMAN]:{id:FOREMAN,email:'ray@example.com',user_metadata:{full_name:'Ray'},app_metadata:{}}};
  st.users.set(OFFICE,USERS[OFFICE]);st.users.set(FOREMAN,USERS[FOREMAN]);
  const D={sess:new Map(),devices:new Map(),flags:[],calls:[],refused:[],hold:new Set(),admins:new Set(),installed:opt.installed!==false,clock:0};
  const now=()=>Date.now()+D.clock;
  const memberOf=(uid)=>{const m=st.members.get(uid);return m?Object.assign({company_name:'DIG Civil Construction'},m):null;};
  function signin(uid){
    const moved=st.links.some(l=>l.kind==='handoff'&&l.for_user===uid&&l.used_at&&l.used_at>Date.now()-180000);
    const sid=crypto.randomUUID();
    if(D.installed&&!(D.hold.has(uid)&&!moved))for(const [k,s] of D.sess)if(s.uid===uid&&s.alive){s.alive=false;s.reason=moved?'moved':'other_device';s.replacedBy=sid;s.endedAt=now();}
    D.sess.set(sid,{uid,alive:true,started:now(),device:null,lastSeen:null});return sid;}
  const miles=(a,b)=>{const R=Math.PI/180,dl=(b.lat-a.lat)*R,dg=(b.lng-a.lng)*R,h=Math.sin(dl/2)**2+Math.cos(a.lat*R)*Math.cos(b.lat*R)*Math.sin(dg/2)**2;return Math.round(3959*2*Math.asin(Math.min(1,Math.sqrt(h))));};
  const flag=(uid,kind,dedupe,o)=>{const f=D.flags.find(x=>x.uid===uid&&x.kind===kind&&x.dedupe===dedupe);if(f){if(kind==='back_and_forth')Object.assign(f,o);return;}D.flags.push(Object.assign({uid,kind,dedupe,n:1},o));};
  const strongest=(list)=>{const best=new Map(),rank={far_apart:1,back_and_forth:2,minutes_apart:3};
    for(const f of list){const k=f.uid+':'+new Date(f.at).toISOString().slice(0,10),b=best.get(k);if(!b||rank[f.kind]<rank[b.kind])best.set(k,f);}return [...best.values()].sort((a,b)=>b.at-a.at);};
  const note=(f,who,extra)=>Object.assign({who,kind:f.kind,at:new Date(f.at).toISOString(),a:f.a||null,b:f.b||null,miles:f.miles==null?null:f.miles,minutes:f.minutes==null?null:f.minutes,n:f.n},extra||{});
  const own={
    pb_device_seen(uid,a,sid){if(!uid)return{__error:'pb:signed_out'};if(!/^[A-Za-z0-9_-]{8,64}$/.test(a.p_device||''))return{ok:false,code:'pb:bad_device'};
      const kind=['phone','tablet','computer'].includes(a.p_kind)?a.p_kind:'phone',fixOk=a.p_lat!=null&&a.p_lng!=null&&a.p_fix_at&&Math.abs(now()-Date.parse(a.p_fix_at))<=3600000;
      const key=uid+'|'+a.p_device,d=D.devices.get(key)||{uid,device:a.p_device,first:now()};Object.assign(d,{kind,last:now(),build:a.p_build});
      if(fixOk)Object.assign(d,{lat:Math.round(a.p_lat*100)/100,lng:Math.round(a.p_lng*100)/100,fixAt:Date.parse(a.p_fix_at)});D.devices.set(key,d);
      const me=D.sess.get(sid);me.device=a.p_device;me.lastSeen=now();
      const prev=[...D.sess.entries()].filter(([k,s])=>s.uid===uid&&s.replacedBy===sid&&s.reason==='other_device'&&s.device&&s.device!==a.p_device).sort((x,y)=>y[1].endedAt-x[1].endedAt)[0];
      if(prev){const [pk,p]=prev,pd=D.devices.get(uid+'|'+p.device)||{};
        if(p.lastSeen!=null&&p.endedAt-p.lastSeen<=15*60000)flag(uid,'minutes_apart',pk,{at:p.endedAt,a:pd.kind,b:kind,minutes:Math.max(0,Math.floor((p.endedAt-p.lastSeen)/60000))});
        if(fixOk&&pd.fixAt&&Math.abs(d.fixAt-pd.fixAt)<=3600000){const mi=miles(pd,d);if(mi>=10)flag(uid,'far_apart',pk,{at:Math.max(d.fixAt,pd.fixAt),a:pd.kind,b:kind,miles:mi,minutes:Math.round(Math.abs(d.fixAt-pd.fixAt)/60000)});}}
      const day=now()-864e5,ended=[...D.sess.entries()].filter(([k,s])=>s.uid===uid&&s.reason==='other_device'&&s.endedAt>day);
      if(ended.some(([k,s])=>s.device===a.p_device&&k!==sid)){const n=ended.filter(([k,s])=>{const r=D.sess.get(s.replacedBy);return s.device&&r&&r.device&&r.device!==s.device;}).length;
        if(n>=2)flag(uid,'back_and_forth',new Date(now()).toISOString().slice(0,10),{at:now(),a:kind,b:prev?(D.devices.get(uid+'|'+prev[1].device)||{}).kind:null,n});}
      return{ok:true};},
    pb_session_why(uid,a){const s=D.sess.get(a.p_session);return{ok:true,reason:s&&!s.alive&&['other_device','moved'].includes(s.reason)?s.reason:null};},
    pb_share_notes(uid){if(!uid)return{__error:'pb:signed_out'};if(uid!==OFFICE)return{ok:false,code:'pb:not_company_account'};
      return{ok:true,notes:strongest(D.flags.filter(f=>f.uid===OFFICE||st.members.has(f.uid))).slice(0,20).map(f=>note(f,f.uid===OFFICE?'The company account':(st.names.get(f.uid)||'A crew member')))};},
    pb_owner_share_notes(uid){if(!D.admins.has(uid))return{__error:'pb:not_allowed'};
      return{ok:true,notes:strongest(D.flags).slice(0,50).map(f=>note(f,f.uid===OFFICE?'The company account':(st.names.get(f.uid)||'A login'),{company:'DIG Civil Construction'}))};},
  };
  function call(op,sid,args){args=args||{};
    if(op==='auth:start'){const sid2=signin(args.user.id);return{sid:sid2,member:memberOf(args.user.id)};}
    if(op==='auth:password'){const u=Object.values(USERS).find(x=>x.email===String(args.email||'').toLowerCase());if(!u)return{error:'Invalid login credentials'};return{user:u,sid:signin(u.id),member:memberOf(u.id)};}
    if(op==='auth:verify'){const r=base.call('verify',null,args);if(!r||!r.user)return{user:null};return{user:r.user,member:r.member,sid:signin(r.user.id)};}
    if(op==='auth:signout'){const s=D.sess.get(sid);if(s&&s.alive){s.alive=false;s.reason='ended';s.endedAt=now();}return true;}
    if(op==='auth:alive'){const s=D.sess.get(sid);return !!(s&&s.alive);}
    const s=sid?D.sess.get(sid):null;
    if(op==='rpc'){const n=args.n;
      if(sid&&D.installed&&(!s||!s.alive)){D.refused.push([n,s&&s.uid]);return{__error:'pb:signed_out',__details:(s&&s.reason)||'ended',__code:'PT401'};} // the gate
      const uid=s&&s.alive?s.uid:null;D.calls.push([n,uid,args.a]);
      if(args.has)return{__pass:true};
      if(own[n]){if(!D.installed)return{__error:'Could not find the function public.'+n+' in the schema cache',__code:'PGRST202'};return own[n](uid,args.a||{},sid);}
      const r=base.call(n,uid,args.a);return r&&r.__error&&/^no op /.test(r.__error)?{__pass:true}:r;}
    if(op==='fn')return base.call('fn:'+args.name,s&&s.alive?s.uid:null,args.body||{});
    return{__error:'no op '+op};}
  return Object.assign({},base,{D,USERS,call,live:(uid)=>[...D.sess.values()].filter(x=>x.uid===uid&&x.alive).length});
};
