// screenshots of chosen screens. args: prefix screen[:scrollY|end] ...   env PB_URL VW VH MGR OPT(B|C|D mock-up) PL(pipelayer) 
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const mgr=require(R+'/mgr');
const URL=process.env.PB_URL||'http://127.0.0.1:9250/cur.html';const VW=+(process.env.VW||390),VH=+(process.env.VH||844);const SH=__dirname+'/../shots/';
const O=process.env.OPT?require('./proto')[process.env.OPT]:null;
(async()=>{const {b,p}=await boot(URL,{init:process.env.MGR?co+mgr:co,wait:3500});await p.setViewportSize({width:VW,height:VH});await p.waitForTimeout(400);
 if(O){await p.addStyleTag({content:O.css});await p.evaluate(O.js);}
 const pre=process.argv[2];
 for(const a of process.argv.slice(3)){const [id,y]=a.split(':');
  if(id==='results'){await require('./mkresults')(p);}else await p.evaluate(s=>pbGoto(s),id);
  if(O)await p.evaluate(O.js);
  await p.waitForTimeout(500);if(y==='end')await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));else if(y)await p.evaluate(y=>window.scrollTo(0,+y),y);await p.waitForTimeout(350);
  await p.screenshot({path:SH+pre+'_'+id+(y?'_'+y:'')+'.png'});}
 console.log('errs',p.errs.slice(0,3));await b.close();})();
