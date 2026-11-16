module.exports=`(function(){window.__tableOne=Object.assign(window.__tableOne||{},{subscriptions:{tier:'contractor',status:'active'}});const now=()=>new Date().toISOString();
window.__rpcOverride=Object.assign(window.__rpcOverride||{},{
 pb_prod_access:()=>({member:true,company_id:'11111111-1111-4111-8111-111111111111',manager:false,role:'foreman',server_at:now()}),
 pb_prod_run_record_put:()=>({ok:true}),
 pb_my_name_get:()=>({name:'Tommy Fontaine'}),
});})();`;
