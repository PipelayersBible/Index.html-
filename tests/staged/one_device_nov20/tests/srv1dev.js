// The Node-side stand-in for the server in the one-device tests (v3): tests/obsrv.js (join links, hand-off codes,
// crew-join, Terms, notices) plus the rules of sql/01_one_device.sql, mirrored function by function:
//   sessions (auth.sessions rows: exists, end_reason), holder (the device that has the login: session, device, last check-in),
//   in_use_by, slots, take_over (sign-in: ok | in_use | full; a Home Screen code replaces the page that made it),
//   the gate (pb:signed_out + details other_device|moved|ended|in_use|full|locked, hint as in the SQL),
//   pb_device_seen (state active|locked), pb_session_why, pb_session_take_slot (app key), sign-out (local = this session,
//   global = all), overrides (D.allow: {devices, one}), an open permit (D.permit: saved within 2 h, not closed).
// D.gate=false: the trigger and functions are in, the gate is not on yet. installed:false: nothing installed.
const crypto=require('crypto');
module.exports=function(opt={}){
  const base=require(__dirname+'/../../../obsrv.js')(opt), st=base.st, OFFICE=base.OFFICE, FOREMAN=base.FOREMAN;
  const USERS={[OFFICE]:{id:OFFICE,email:'tester@example.com',user_metadata:{full_name:'Test Office'},app_metadata:{}},
               [FOREMAN]:{id:FOREMAN,email:'ray@example.com',user_metadata:{full_name:'Ray'},app_metadata:{}}};
  st.users.set(OFFICE,USERS[OFFICE]);st.users.set(FOREMAN,USERS[FOREMAN]);
  const D={sess:new Map(),holder:new Map(),devices:new Map(),flags:[],calls:[],refused:[],permit:new Set(),allow:new Map(),
    installed:opt.installed!==false,gate:opt.gate!==false,clock:0,anon:[]};
  const now=()=>Date.now()+D.clock, MIN=60000;
  const memberOf=(uid)=>{const m=st.members.get(uid);return m?Object.assign({company_name:'DIG Civil Construction'},m):null;};
  const allowed=(uid)=>(D.allow.get(uid)||{devices:2}).devices, oneAtATime=(uid)=>(D.allow.get(uid)||{one:true}).one;
  const S=(sid)=>{const s=D.sess.get(sid);return s&&s.exists?s:null;};
  const kindOf=(uid,dev)=>((D.devices.get(uid+'|'+dev)||{}).kind)||'phone';
  const inUseBy=(uid,except)=>{const h=D.holder.get(uid);if(!h||!h.sid||h.sid===except||!S(h.sid))return null;
    return (h.last>now()-5*MIN||D.permit.has(uid))&&oneAtATime(uid)?h.sid:null;};
  const slots=(uid,except)=>[...D.sess.entries()].filter(([k,s])=>s.exists&&s.uid===uid&&k!==except&&!['in_use','full'].includes(s.reason))
    .map(([k,s])=>({sid:k,kind:s.device?kindOf(uid,s.device):'phone',act:s.lastSeen||s.started})).sort((a,b)=>b.act-a.act);
  const end=(sid,reason,by)=>{const s=D.sess.get(sid);if(!s)return;if(!s.endedAt){s.reason=reason;s.endedAt=now();s.replacedBy=by||null;}s.exists=false;};
  const flag=(uid,kind,o)=>D.flags.push(Object.assign({uid,kind,at:now()},o||{}));
  function signin(uid){ // pb_auth.take_over
    const sid=crypto.randomUUID();D.sess.set(sid,{uid,exists:true,started:now(),device:null,lastSeen:null,reason:null});
    if(!D.installed)return sid;
    for(const [k,s] of D.sess)if(s.uid===uid&&k!==sid&&s.exists&&['in_use','full'].includes(s.reason)&&s.endedAt<now()-10*MIN)s.exists=false;
    if(st.links.some(l=>l.kind==='handoff'&&l.for_user===uid&&l.used_at&&l.used_at>Date.now()-180000)){
      const other=inUseBy(uid,sid)||((slots(uid,sid)[0]||{}).sid);
      if(other){end(other,'moved',sid);const h=D.holder.get(uid);if(h&&h.sid===other)Object.assign(h,{sid,device:null,last:now()});}
      return sid;}
    const why=inUseBy(uid,sid)?'in_use':slots(uid,sid).length>=allowed(uid)?'full':null;
    if(why){const s=D.sess.get(sid);s.reason=why;s.endedAt=now();flag(uid,'tried_'+why);}
    return sid;}
  function gate(sid){ // public.pb_session_gate (null = let it through)
    if(!sid||!D.installed||!D.gate)return null;const s=D.sess.get(sid);
    const no=(details,hint)=>({__error:'pb:signed_out',__details:details,__hint:hint==null?null:hint,__code:'PT401'});
    if(!s||!s.exists)return no((s&&s.reason)||'ended');
    if(s.reason==='in_use')return no('in_use');
    if(s.reason==='full')return no('full',slots(s.uid,sid).map(x=>x.kind+'|'+Math.floor(x.act/1000)).join(','));
    const h=D.holder.get(s.uid);if(!h||!h.sid||h.sid===sid||!S(h.sid)||!oneAtATime(s.uid))return null;
    if(h.last>now()-5*MIN)return no('locked',kindOf(s.uid,h.device)+'|'+Math.max(1,Math.ceil((h.last+5*MIN-now())/1000))+'|0');
    if(D.permit.has(s.uid))return no('locked',kindOf(s.uid,h.device)+'|0|1');
    return null;}
  const own={
    pb_device_seen(uid,a,sid){if(!uid)return{__error:'pb:signed_out'};if(!/^[A-Za-z0-9_-]{8,64}$/.test(a.p_device||''))return{ok:false,code:'pb:bad_device'};
      const kind=['phone','tablet','computer'].includes(a.p_kind)?a.p_kind:'phone';
      const key=uid+'|'+a.p_device,d=D.devices.get(key)||{uid,device:a.p_device};Object.assign(d,{kind,last:now(),build:a.p_build,lat:a.p_lat,lng:a.p_lng});D.devices.set(key,d);
      const me=D.sess.get(sid);if(!me)return{ok:true,state:'active'};
      if(['in_use','full'].includes(me.reason))return{__error:'pb:signed_out'};
      const h=D.holder.get(uid)||{};D.holder.set(uid,h);
      if(h.sid&&h.sid!==sid&&oneAtATime(uid)&&S(h.sid)){const permit=!(h.last>now()-5*MIN)&&D.permit.has(uid);
        if(h.last>now()-5*MIN||permit){me.device=a.p_device;return{ok:true,state:'locked',permit,other:kindOf(uid,h.device),wait_s:permit?0:Math.max(1,Math.ceil((h.last+5*MIN-now())/1000))};}}
      if(h.sid&&h.sid!==sid)D.handoffs=(D.handoffs||0)+1;
      Object.assign(h,{sid,device:a.p_device,last:now()});me.device=a.p_device;me.lastSeen=now();
      return{ok:true,state:'active'};},
    pb_session_why(uid,a){const s=D.sess.get(a.p_session);const r=s&&s.endedAt&&['other_device','moved','in_use','full'].includes(s.reason)?s.reason:null;
      if(r==='in_use'||r==='full'){s.exists=false;s.removed=true;}return{ok:true,reason:r};},
    pb_session_take_slot(uid,a){const s=D.sess.get(a.p_session);if(!s||!s.exists||s.reason!=='full')return{ok:false,code:'pb:not_found'};const u=s.uid;
      if(inUseBy(u,a.p_session))return{ok:false,code:'pb:in_use'};
      const L=slots(u,a.p_session);if(L.length>=allowed(u)){const o=L[Math.max(1,a.p_pick||2)-1]||L[L.length-1];end(o.sid,'other_device',a.p_session);flag(u,'took_place',{device_a:o.kind});}
      s.reason=null;s.endedAt=null;return{ok:true};},
  };
  function call(op,sid,args){args=args||{};
    if(op==='auth:start'){const sid2=signin(args.user.id);return{sid:sid2,member:memberOf(args.user.id)};}
    if(op==='auth:password'){const u=Object.values(USERS).find(x=>x.email===String(args.email||'').toLowerCase());if(!u)return{error:'Invalid login credentials'};return{user:u,sid:signin(u.id),member:memberOf(u.id)};}
    if(op==='auth:verify'){const r=base.call('verify',null,args);if(!r||!r.user)return{user:null};return{user:r.user,member:r.member,sid:signin(r.user.id)};}
    if(op==='auth:signout'){const s=D.sess.get(sid);if(!s)return true;
      if(args.scope==='local')end(sid,'ended');else for(const [k,x] of D.sess)if(x.uid===s.uid&&x.exists)end(k,'ended');
      return true;}
    if(op==='auth:alive')return !!S(sid);
    if(op==='anon'){D.anon.push([args.n,args.a]);if(!D.installed)return{__status:404,code:'PGRST202',message:'Could not find the function'};return own[args.n]?own[args.n](null,args.a||{},null):{__status:404};} // the app's own key, no session
    const s=sid?D.sess.get(sid):null;
    if(op==='rpc'){const n=args.n;
      const g=gate(sid);if(g){D.refused.push([n,s&&s.uid,g.__details]);return g;}
      const uid=s&&s.exists?s.uid:null;D.calls.push([n,uid,args.a,sid]);
      if(args.has)return{__pass:true};
      if(own[n]){if(!D.installed)return{__error:'Could not find the function public.'+n+' in the schema cache',__code:'PGRST202'};return own[n](uid,args.a||{},sid);}
      const r=base.call(n,uid,args.a);return r&&r.__error&&/^no op /.test(r.__error)?{__pass:true}:r;}
    if(op==='fn')return base.call('fn:'+args.name,s&&s.exists?s.uid:null,args.body||{});
    return{__error:'no op '+op};}
  return Object.assign({},base,{D,USERS,call,idle:(min)=>{D.clock+=(min||6)*MIN;},
    live:(uid)=>[...D.sess.values()].filter(x=>x.uid===uid&&x.exists&&!['in_use','full'].includes(x.reason)).length,
    holderOf:(uid)=>(D.holder.get(uid)||{}).sid||null});
};
