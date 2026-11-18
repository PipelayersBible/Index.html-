// A fake supabase-js for t125 (onboarding): like /home/claude/rig/fakesb.js, plus a signed-out start
// (window.__obStart = null), verifyOtp, functions.invoke and a shared "server" in Node (window.__obSrv binding) for the
// pb_onboard_* RPCs, the crew-join function, pb_prod_access, Terms and notice records. Other RPCs: window.__rpcOverride.
(function(){
  const U0={id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',user_metadata:{full_name:'Test Office'},app_metadata:{}};
  let cur = ('__obStart' in window) ? window.__obStart : U0;
  const S=(u)=>u?{access_token:'x',refresh_token:'y',expires_at:Math.floor(Date.now()/1000)+86400,user:u}:null;
  window.__rpcLog=[];window.__tableOne=Object.assign({subscriptions:{tier:'individual',status:'active'},company_members:null},window.__tableOne||{});window.__rpcOverride=window.__rpcOverride||{};
  const res=(data)=>Promise.resolve({data,error:null});
  const SRV=['pb_onboard_link_make','pb_onboard_links','pb_onboard_link_revoke','pb_onboard_peek','pb_onboard_join','pb_onboard_handoff_make','pb_prod_access','pb_terms_accept','pb_terms_status','pb_notice_ack','pb_my_name_get'];
  const srv=async(op,args)=>{const r=await window.__obSrv(op,cur&&cur.id,args||{});if(r&&r.__error)return{data:null,error:{message:r.__error}};return{data:r===undefined?null:r,error:null};};
  function qb(table){const q={_t:table};const chain=()=>q;
    ['select','eq','neq','in','is','gt','gte','lt','lte','order','limit','range','match','or','filter','not','ilike','like','contains','upsert','insert','update','delete','returns','abortSignal'].forEach(m=>q[m]=chain);
    const one=()=>res((window.__tableOne||{})[table]||null);q.single=one;q.maybeSingle=one;q.then=(a,b)=>res([]).then(a,b);return q;}
  const cbs=[];
  window.supabase={createClient(){return{
    auth:{get mfa(){return window.__mfaApi||undefined;},getSession:()=>res({session:S(cur)}),getUser:()=>res({user:cur}),
      onAuthStateChange:(cb)=>{cbs.push(cb);setTimeout(()=>cb(cur?'SIGNED_IN':'INITIAL_SESSION',S(cur)),0);return{data:{subscription:{unsubscribe(){}}}};},
      signInWithPassword:()=>res({session:S(U0),user:U0}),signOut:()=>{cur=null;return res(null);},setSession:()=>res({session:S(cur)}),updateUser:()=>res({user:cur}),resetPasswordForEmail:()=>res(null),refreshSession:()=>res({session:S(cur)}),
      verifyOtp:async(a)=>{window.__verifyArgs=a;const r=await window.__obSrv('verify',null,a);if(!r||!r.user)return{data:{user:null,session:null},error:{message:'Token has expired or is invalid'}};cur=r.user;
        window.__tableOne.company_members=r.member?{company_id:r.member.company_id,role:r.member.role,companies:{name:r.member.company_name,status:'active'}}:null;window.__tableOne.subscriptions={tier:'contractor',status:'active'};
        setTimeout(()=>cbs.forEach(cb=>cb('SIGNED_IN',S(cur))),0);return{data:{user:cur,session:S(cur)},error:null};}},
    rpc:(n,a)=>{window.__rpcLog.push(n);(window.__rpcArgs=window.__rpcArgs||[]).push([n,a]);const o=window.__rpcOverride[n];if(o!==undefined)return res(typeof o==='function'?o(a):o);if(SRV.includes(n))return srv(n,a);return res(null);},
    from:qb,functions:{invoke:async(name,opt)=>{(window.__fnLog=window.__fnLog||[]).push([name,opt&&opt.body]);const r=await window.__obSrv('fn:'+name,cur&&cur.id,(opt&&opt.body)||{});return{data:r,error:null};}},
    storage:{from:(b)=>({upload:()=>res({path:''}),getPublicUrl:()=>({data:{publicUrl:''}}),createSignedUrl:()=>res({signedUrl:''}),remove:()=>res(null),download:()=>Promise.resolve({data:null,error:{message:'nf'}})})},
    channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}
  };}};
})();
