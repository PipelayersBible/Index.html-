// A fake supabase-js for the one-device tests (from tests/fakesb_ob.js): sessions live on the shared Node "server"
// (window.__d1 binding, srv1dev.js) and in localStorage (so a reload keeps the session, as supabase-js does); the access
// token is a JWT-shaped string carrying session_id; every rpc passes the server's gate first; __fakeRefresh() is a token
// refresh (SIGNED_OUT when the server has ended the session). Other RPCs: window.__rpcOverride.
(function(){
  const LS='fake-sb-session';let cur=null,sid=null;
  try{const v=JSON.parse(localStorage.getItem(LS)||'null');if(v){cur=v.user;sid=v.sid;}}catch(e){}
  const save=()=>{try{if(cur)localStorage.setItem(LS,JSON.stringify({user:cur,sid}));else localStorage.removeItem(LS);}catch(e){}};
  const b64=(o)=>btoa(JSON.stringify(o)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const S=()=>cur?{access_token:'h.'+b64({session_id:sid,sub:cur.id,role:'authenticated'})+'.s',refresh_token:'y',expires_at:Math.floor(Date.now()/1000)+3600,user:cur}:null;
  window.__rpcLog=[];window.__tableOne=Object.assign({subscriptions:{tier:'individual',status:'active'},company_members:null},window.__tableOne||{});window.__rpcOverride=window.__rpcOverride||{};
  const tables=(m)=>{window.__tableOne.company_members=m?{company_id:m.company_id,role:m.role,companies:{name:m.company_name,status:'active'}}:null;window.__tableOne.subscriptions={tier:'contractor',status:'active'};};
  const res=(data)=>Promise.resolve({data,error:null});
  const cbs=[];const fire=(ev,s)=>setTimeout(()=>cbs.forEach(cb=>{try{cb(ev,s);}catch(e){}}),0);
  const ready=(async()=>{try{
    if(!cur&&window.__d1Start&&!localStorage.getItem('fake-sb-started')){localStorage.setItem('fake-sb-started','1');const r=await window.__d1('auth:start',null,{user:window.__d1Start});cur=window.__d1Start;sid=r.sid;save();tables(r.member);localStorage.setItem('fake-sb-member',JSON.stringify(r.member||null));}
    else if(cur){try{tables(JSON.parse(localStorage.getItem('fake-sb-member')||'null'));}catch(e){}}
  }catch(e){}})();
  const signedIn=(r)=>{cur=r.user;sid=r.sid;save();tables(r.member);try{localStorage.setItem('fake-sb-member',JSON.stringify(r.member||null));}catch(e){}fire('SIGNED_IN',S());return{data:{user:cur,session:S()},error:null};};
  function qb(table){const q={_t:table};const chain=()=>q;
    ['select','eq','neq','in','is','gt','gte','lt','lte','order','limit','range','match','or','filter','not','ilike','like','contains','upsert','insert','update','delete','returns','abortSignal'].forEach(m=>q[m]=chain);
    const one=()=>res((window.__tableOne||{})[table]||null);q.single=one;q.maybeSingle=one;q.then=(a,b)=>res([]).then(a,b);return q;}
  window.__fakeRefresh=async()=>{await ready;if(!sid)return'none';const ok=await window.__d1('auth:alive',sid);if(!ok){cur=null;sid=null;save();fire('SIGNED_OUT',null);return'signed_out';}fire('TOKEN_REFRESHED',S());return'ok';};
  window.__fakeSid=()=>sid;
  window.supabase={createClient(){return{
    auth:{get mfa(){return window.__mfaApi||undefined;},getSession:async()=>{await ready;return{data:{session:S()},error:null};},getUser:async()=>{await ready;return{data:{user:cur},error:null};},
      onAuthStateChange:(cb)=>{cbs.push(cb);ready.then(()=>setTimeout(()=>cb(cur?'SIGNED_IN':'INITIAL_SESSION',S()),0));return{data:{subscription:{unsubscribe(){}}}};},
      signInWithPassword:async(a)=>{await ready;const r=await window.__d1('auth:password',null,a);if(!r||!r.user)return{data:{user:null,session:null},error:{message:'Invalid login credentials'}};return signedIn(r);},
      signOut:async(o)=>{await ready;(window.__signOuts=window.__signOuts||[]).push((o&&o.scope)||'global');if(sid&&!(o&&o.scope==='local'))await window.__d1('auth:signout',sid);const had=!!cur;cur=null;sid=null;save();if(had)fire('SIGNED_OUT',null);return{error:null};},
      setSession:()=>res({session:S()}),updateUser:()=>res({user:cur}),resetPasswordForEmail:()=>res(null),refreshSession:()=>res({session:S()}),
      verifyOtp:async(a)=>{await ready;window.__verifyArgs=a;const r=await window.__d1('auth:verify',null,a);if(!r||!r.user)return{data:{user:null,session:null},error:{message:'Token has expired or is invalid'}};return signedIn(r);}},
    rpc:(n,a)=>(async()=>{await ready;window.__rpcLog.push(n);(window.__rpcArgs=window.__rpcArgs||[]).push([n,a]);const o=window.__rpcOverride[n];
      const r=await window.__d1('rpc',sid,{n,a:a||{},has:o!==undefined});
      if(r&&r.__error)return{data:null,error:{message:r.__error,details:r.__details||null,code:r.__code||null}};
      if(o!==undefined)return{data:typeof o==='function'?o(a):o,error:null};
      return{data:(!r||r.__pass)?null:r,error:null};})(),
    from:qb,functions:{invoke:async(name,opt)=>{await ready;(window.__fnLog=window.__fnLog||[]).push([name,opt&&opt.body]);const r=await window.__d1('fn',sid,{name,body:(opt&&opt.body)||{}});return{data:r,error:null};}},
    storage:{from:(b)=>({upload:()=>res({path:''}),getPublicUrl:()=>({data:{publicUrl:''}}),createSignedUrl:()=>res({signedUrl:''}),remove:()=>res(null),download:()=>Promise.resolve({data:null,error:{message:'nf'}})})},
    channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}
  };}};
})();
