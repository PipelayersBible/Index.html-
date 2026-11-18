(function(){
  const U={id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',user_metadata:{full_name:'Test Foreman'},app_metadata:{}};
  const S={access_token:'x',refresh_token:'y',expires_at:Math.floor(Date.now()/1000)+86400,user:U};
  window.__rpcLog=[];window.__tableOne=Object.assign({subscriptions:{tier:'individual',status:'active'},company_members:null},window.__tableOne||{});window.__rpcOverride=window.__rpcOverride||{};
  const res=(data)=>Promise.resolve({data,error:null});
  function qb(table){const q={_t:table};const chain=()=>q;
    ['select','eq','neq','in','is','gt','gte','lt','lte','order','limit','range','match','or','filter','not','ilike','like','contains','upsert','insert','update','delete','returns','abortSignal'].forEach(m=>q[m]=chain);
    const one=()=>res((window.__tableOne||{})[table]||null);q.single=one;q.maybeSingle=one;q.then=(a,b)=>res([]).then(a,b);return q;}
  window.supabase={createClient(){return{
    auth:{get mfa(){return window.__mfaApi||undefined;},getSession:()=>res({session:S}),getUser:()=>res({user:U}),onAuthStateChange:(cb)=>{setTimeout(()=>cb('SIGNED_IN',S),0);return{data:{subscription:{unsubscribe(){}}}};},
      signInWithPassword:()=>res({session:S,user:U}),signOut:()=>res(null),setSession:()=>res({session:S}),updateUser:()=>res({user:U}),resetPasswordForEmail:()=>res(null),refreshSession:()=>res({session:S})},
    rpc:(n,a)=>{window.__rpcLog.push(n);(window.__rpcArgs=window.__rpcArgs||[]).push([n,a]);const o=window.__rpcOverride[n];const v=typeof o==='function'?o(a):o===undefined?null:o;if(v&&typeof v==='object'&&typeof v.__error==='string')return Promise.resolve({data:null,error:{message:v.__error}});return res(v);},
    from:qb,functions:{invoke:(n,o)=>{(window.__fnLog=window.__fnLog||[]).push([n,o&&o.body]);const f=(window.__fnOverride||{})[n];return f?Promise.resolve(f(o&&o.body)).then(d=>({data:d,error:null})):res(null);}},
    storage:{from:(b)=>({upload:(path,blob)=>{window.__uploads=window.__uploads||{};if(window.__uploads[b+'/'+path])return Promise.resolve({data:null,error:{message:'The resource already exists'}});window.__uploads[b+'/'+path]=blob;return res({path});},getPublicUrl:()=>({data:{publicUrl:''}}),createSignedUrl:()=>res({signedUrl:''}),remove:()=>res(null),download:(path)=>{const x=(window.__uploads||{})[b+'/'+path];return Promise.resolve(x?{data:x,error:null}:{data:null,error:{message:'nf'}});}})},
    channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}
  };}};
})();
