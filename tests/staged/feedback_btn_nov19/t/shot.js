// screenshots of chosen screens. args: prefix screen[:scrollY] ...   env PB_URL VW VH MGR
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const mgr=require(R+'/mgr');
const URL=process.env.PB_URL||'http://127.0.0.1:9250/cur.html';const VW=+(process.env.VW||390),VH=+(process.env.VH||844);const SH=__dirname+'/../shots/';
(async()=>{const {b,p}=await boot(URL,{init:process.env.MGR?co+mgr:co,wait:3500});await p.setViewportSize({width:VW,height:VH});await p.waitForTimeout(400);
 const pre=process.argv[2];
 for(const a of process.argv.slice(3)){const [id,y]=a.split(':');
  if(id==='results'){await require('./mkresults')(p);}else await p.evaluate(s=>pbGoto(s),id);
  await p.waitForTimeout(500);if(y==='end')await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));else if(y)await p.evaluate(y=>window.scrollTo(0,+y),y);await p.waitForTimeout(250);
  await p.screenshot({path:SH+pre+'_'+id+(y?'_'+y:'')+'.png'});}
 console.log('errs',p.errs.slice(0,3));await b.close();})();
