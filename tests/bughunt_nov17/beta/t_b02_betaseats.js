// beta audit 02: a beta company's Crew members says the beta's number of people (6), not the paid plan's 5
const boot=require(__dirname+'/../../rig/boot');const ci=require('./coinit');
const f=process.argv[2]||'cur.html';const CO='c0ffee00-0000-4000-8000-000000000001';
const mem=(i,r)=>({user_id:'0000000'+i+'-0000-4000-8000-00000000000'+i,email:'p'+i+'@sandoval.test',name:'Person '+i,role:r,member:true,status:'active',joined_at:new Date().toISOString()});
const init=ci()+`;window.__rpcOverride.pb_crew_list=()=>({company_id:'${CO}',company_name:'Sandoval Pipeline',is_owner:true,invites_today:6,invite_limit:30,seats:6,seats_included:5,can_manage_pms:true,members:[{user_id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',owner:true,me:true,member:false,status:'active'}].concat(${JSON.stringify([1,2,3,4,5,6].map(i=>mem(i,i<3?'foreman':'pipelayer')))}),invitations:[]});`;
(async()=>{const {b,p}=await boot((process.env.PB_ROOT||'http://127.0.0.1:8843/')+f,{init,wait:6000});await p.setViewportSize({width:390,height:844});
 await p.evaluate(()=>pbOpenCrewMembers());await p.waitForTimeout(1500);
 const t=await p.evaluate(()=>document.getElementById('crSeats').textContent);
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/audit/beta/shots')+'/b02_')+f.replace('.html','')+'.png'});
 const pass=/6 of 6 people in the beta/.test(t)&&!/includes 5/.test(t);
 console.log(pass?'PASS':'FAIL','|',t,'| errs',p.errs);await b.close();process.exit(pass?0:1);})();
