module.exports=`(function(){try{localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-000000000001','3');}catch(e){}window.__tableOne=Object.assign(window.__tableOne||{},{subscriptions:{tier:'contractor',status:'active'}});const now=()=>new Date().toISOString();
window.__rpcOverride=Object.assign(window.__rpcOverride||{},{
 pb_prod_access:()=>({member:true,company_id:'11111111-1111-4111-8111-111111111111',manager:false,role:'foreman',server_at:now()}),
 pb_prod_run_record_put:()=>({ok:true}),
 pb_my_name_get:()=>({ok:true,name:'Tommy Fontaine'}),
 pb_terms_status:()=>({terms:'1.0',privacy:'1.0',at:now()}),
});})();`;
