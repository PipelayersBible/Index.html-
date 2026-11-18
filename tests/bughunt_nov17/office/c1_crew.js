const L=require('./lib');
const init=L.co+L.mgr+`;(function(){const now=new Date().toISOString();
window.__crew={company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',company_name:'Acme Pipeline & Underground Construction Incorporated',me:'00000000-0000-4000-8000-000000000001',is_owner:true,can_manage_pms:true,invites_today:2,invite_limit:30,seats:6,seats_included:5,server_at:now,
 members:[{user_id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',name:'Tommy Fontaine',role:null,member:false,owner:true,manager:false,me:true,status:'active',last_sign_in_at:now},
  {user_id:'u2',email:'averyveryverylongemailaddress.foreman@some-long-company-domain-name.example.com',name:'Bartholomew Montgomery-Fitzgerald the Third',names:{label:'Bart',own_name:'Bartholomew'},role:'foreman',member:true,joined_at:now,manager:true,status:'active',last_sign_in_at:now},
  {user_id:'u3',email:'pl@x.com',name:null,role:'pipelayer',member:true,joined_at:now,status:'invited'},
  {user_id:'u4',email:'pm@x.com',name:'Pat PM',role:'pm',title:'project_manager',member:true,joined_at:now,manager:true,status:'active'},
  {user_id:'u5',email:'sup@x.com',name:'Sue Super',role:'pm',title:'superintendent',member:true,joined_at:now,manager:true,status:'not_signed_in'}],
 invitations:[{id:'i1',email:'inv@x.com',label:'Invited Guy',role:'pm',title:'superintendent',created_at:now,expires_at:now,expired:false},{id:'i2',email:'old@x.com',role:'foreman',created_at:now,expired:true}]};
window.__rpcOverride.pb_crew_list=()=>window.__crew;
window.__rpcOverride.pb_report_access=()=>({member:false,manager:true,company_id:null,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'});
window.__fnOverride={'crew-admin':(b)=>{return (window.__fnReply||(()=>({ok:true})))(b);}};})();`;
(async()=>{const {b,p}=await L.boot(L.URL,{init});
 await p.evaluate(()=>window.pbOpenCrewMembers());await p.waitForTimeout(1500);
 console.log('screen',await L.scr(p),'ovf',JSON.stringify(await L.ovf(p)));
 console.log((await L.txt(p,'#screen-crewMembers')).slice(0,2500));
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/bughunt/office/shots')+'/c1_crew.png'),fullPage:true});
 // actions
 const act=async(uid,a)=>{await p.evaluate(([uid,a])=>{document.querySelector('[data-uid="'+uid+'"] [data-crew-act="'+a+'"]').click();},[uid,a]);await p.waitForTimeout(400);return L.modal(p);};
 for(const [uid,a,yes] of [['u2','role','Make Pipelayer'],['u2','manager','Remove Manager'],['u2','pm','Make Project manager'],['u2','super','Make Superintendent'],['u4','role','Make Foreman'],['u4','role-pipelayer','Make Pipelayer'],['u4','super','Make Superintendent'],['u5','pm','Make Project manager'],['u5','role','Make Foreman'],['u3','resend','Resend Invite'],['u2','remove','Remove from Company']]){
  let m;try{m=await act(uid,a);}catch(e){console.log(uid,a,'NO BUTTON');continue;}
  console.log('\n',uid,a,'=>',m);
  try{await L.modalClick(p,yes);}catch(e){console.log('  !! no button',yes);await p.keyboard.press('Escape');continue;}
  await p.waitForTimeout(600);
  console.log('  sent:',JSON.stringify(await p.evaluate(()=>window.__fnLog[window.__fnLog.length-1])),'| status:',await L.txt(p,'#crStatus'));
 }
 // invite
 await p.fill('#crEmail','new@x.com');await p.fill('#crName','New Guy');await p.click('#crAddBtn');await p.waitForTimeout(700);
 console.log('invite sent:',JSON.stringify(await p.evaluate(()=>window.__fnLog[window.__fnLog.length-1])),'|',await L.txt(p,'#crStatus'));
 await p.evaluate(()=>{window.__fnReply=()=>({ok:false,code:'pb:trial_seats'});});
 await p.fill('#crEmail','new2@x.com');await p.click('#crAddBtn');await p.waitForTimeout(700);
 console.log('trial seats:',await L.txt(p,'#crStatus'),'| err:',await L.txt(p,'#crAddErr'),'| email kept:',await p.evaluate(()=>document.getElementById('crEmail').value));
 console.log('errs',p.errs);await b.close();})();
