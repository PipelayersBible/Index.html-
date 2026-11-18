const dash=require('fs').readFileSync(__dirname+'/dash.json','utf8');
module.exports=`(function(){window.__tableOne=Object.assign(window.__tableOne||{},{subscriptions:{tier:'contractor',status:'active'}});const now=()=>new Date().toISOString();
window.__rpcOverride=Object.assign(window.__rpcOverride||{},{
 pb_prod_access:()=>({member:false,company_id:null,manager:true,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:null,server_at:now()}),
 pb_prod_company_dashboard:()=>(${dash}),
 pb_my_name_get:()=>({ok:true,name:'Tommy Fontaine'}),
});})();`;
