(function(){
  const U={id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',user_metadata:{full_name:'Test Foreman'},app_metadata:{}};
  const S={access_token:'x',refresh_token:'y',expires_at:Math.floor(Date.now()/1000)+86400,user:U};
  window.__rpcLog=[];window.__tableOne=Object.assign({subscriptions:{tier:'individual',status:'active'},company_members:null},window.__tableOne||{});window.__rpcOverride=window.__rpcOverride||{};
  const res=(data)=>Promise.resolve({data,error:null});
  const NET={data:null,error:{message:'TypeError: Failed to fetch'}};
  function qb(table){const q={_t:table};const chain=()=>q;
    ['select','eq','neq','in','is','gt','gte','lt','lte','order','limit','range','match','or','filter','not','ilike','like','contains','upsert','insert','update','delete','returns','abortSignal'].forEach(m=>q[m]=chain);
    const one=()=>navigator.onLine===false?Promise.resolve(NET):res((window.__tableOne||{})[table]||null);q.single=one;q.maybeSingle=one;q.then=(a,b)=>(navigator.onLine===false?Promise.resolve(NET):res([])).then(a,b);return q;}
  window.supabase={createClient(){return{
    auth:{get mfa(){return window.__mfaApi||undefined;},getSession:()=>res({session:S}),getUser:()=>res({user:U}),onAuthStateChange:(cb)=>{setTimeout(()=>cb('SIGNED_IN',S),0);return{data:{subscription:{unsubscribe(){}}}};},
      signInWithPassword:()=>res({session:S,user:U}),signOut:()=>res(null),setSession:()=>res({session:S}),updateUser:()=>res({user:U}),resetPasswordForEmail:()=>res(null),refreshSession:()=>res({session:S})},
    rpc:(n,a)=>{window.__rpcLog.push(n);(window.__rpcArgs=window.__rpcArgs||[]).push([n,a]);
      if(navigator.onLine===false)return Promise.resolve(NET);
      const o=window.__rpcOverride[n];let ov;try{ov=typeof o==='function'?o(a):o;}catch(e){ov=null;}
      if(ov&&ov.__err)return Promise.resolve({data:null,error:{message:ov.__err}});
      if(typeof window.__srvRpc==='function')return window.__srvRpc(n,a===undefined?null:JSON.parse(JSON.stringify(a)),ov===undefined?null:ov).then(r=>navigator.onLine===false?NET:r);
      return res(ov===undefined?null:ov);},
    from:qb,functions:{invoke:()=>res(null)},
    storage:{from:(b)=>({upload:async(path,blob)=>{if(navigator.onLine===false)return NET;window.__uploads=window.__uploads||{};
        const r=typeof window.__srvUp==='function'?await window.__srvUp(b,path,blob&&blob.size||0):{ok:true};if(r.error)return {data:null,error:{message:r.error}};window.__uploads[b+'/'+path]=blob;return {data:{path},error:null};},
      getPublicUrl:()=>({data:{publicUrl:''}}),createSignedUrl:()=>res({signedUrl:''}),remove:()=>res(null),download:(path)=>{const x=(window.__uploads||{})[b+'/'+path];return Promise.resolve(x?{data:x,error:null}:{data:null,error:{message:'nf'}});}})},
    channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}
  };}};
})();
