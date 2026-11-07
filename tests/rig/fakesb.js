(function(){
  const U={id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',user_metadata:{full_name:'Test Foreman'},app_metadata:{}};
  const S={access_token:'x',refresh_token:'y',expires_at:Math.floor(Date.now()/1000)+86400,user:U};
  window.__rpcLog=[];window.__tableOne=Object.assign({subscriptions:{tier:'individual',status:'active'},company_members:null},window.__tableOne||{});window.__rpcOverride=window.__rpcOverride||{};
  const res=(data)=>Promise.resolve({data,error:null});
  function qb(table){const q={_t:table};const chain=()=>q;
    ['select','eq','neq','in','is','gt','gte','lt','lte','order','limit','range','match','or','filter','not','ilike','like','contains','upsert','insert','update','delete','returns','abortSignal'].forEach(m=>q[m]=chain);
    const one=()=>res((window.__tableOne||{})[table]||null);q.single=one;q.maybeSingle=one;q.then=(a,b)=>res([]).then(a,b);return q;}
  window.supabase={createClient(){return{
    auth:{getSession:()=>res({session:S}),getUser:()=>res({user:U}),onAuthStateChange:(cb)=>{setTimeout(()=>cb('SIGNED_IN',S),0);return{data:{subscription:{unsubscribe(){}}}};},
      signInWithPassword:()=>res({session:S,user:U}),signOut:()=>res(null),setSession:()=>res({session:S}),updateUser:()=>res({user:U}),resetPasswordForEmail:()=>res(null),refreshSession:()=>res({session:S})},
    rpc:(n,a)=>{window.__rpcLog.push(n);const o=window.__rpcOverride[n];return res(typeof o==='function'?o(a):o===undefined?null:o);},
    from:qb,functions:{invoke:()=>res(null)},
    storage:{from:()=>({upload:()=>res({path:'x'}),getPublicUrl:()=>({data:{publicUrl:''}}),createSignedUrl:()=>res({signedUrl:''}),remove:()=>res(null),download:()=>res(null)})},
    channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}
  };}};
})();
