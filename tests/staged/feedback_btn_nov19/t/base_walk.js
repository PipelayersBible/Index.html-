// what the Feedback button covers on every screen, top / middle / bottom of the page. PB_URL, VW, VH, INIT (co|co+mgr)
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const mgr=require(R+'/mgr');const {probe}=require('./lib');
const URL=process.env.PB_URL||'http://127.0.0.1:9250/cur.html';const VW=+(process.env.VW||390),VH=+(process.env.VH||844);
(async()=>{const {b,p}=await boot(URL,{init:process.env.MGR?co+mgr:co,wait:3500});await p.setViewportSize({width:VW,height:VH});await p.waitForTimeout(400);
 const ids=await p.evaluate(()=>[...document.querySelectorAll('.pb-screen')].map(x=>x.id.replace('screen-','')));
 let bad=0,hid=[],wrong=[];
 for(const id of ids){await p.evaluate(s=>{try{pbGoto(s)}catch(e){}},id);await p.waitForTimeout(250);
  const H=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);const res=[];
  for(const y of [0,Math.round(H/2),H]){await p.evaluate(y=>window.scrollTo(0,y),y);await p.waitForTimeout(80);const m=await probe(p);m.y=y;res.push(m);}
  const on=res[0].screen;if(on!==id)wrong.push(id+'->'+on);
  if(!res.every(m=>m.shown)){hid.push(id);}
  const c=[...new Set(res.flatMap(m=>m.covers))],t=[...new Set(res.flatMap(m=>m.text))];
  if(c.length||t.length){bad++;console.log(id,'COVERS',JSON.stringify(c),'TEXT',JSON.stringify(t.slice(0,4)));}
  if(process.env.RECT)console.log(id,JSON.stringify(res.map(m=>m.rect)),res.map(m=>m.onTop+'/'+m.inView).join(' '));
 }
 console.log('screens',ids.length,'with something covered',bad,'| button not shown on',JSON.stringify(hid),'| could not open',JSON.stringify(wrong),'| errs',p.errs.slice(0,3));
 await b.close();})();
