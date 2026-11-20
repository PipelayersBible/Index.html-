const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');
(async()=>{const {b,p}=await boot('http://127.0.0.1:9250/cur.html',{init:co,wait:3500});await p.setViewportSize({width:+(process.env.VW||375),height:667});await p.waitForTimeout(500);
 const look=()=>p.evaluate(()=>{const h=document.querySelector('.pb-screen.active > .pb-header'),f=document.getElementById('pbFbPill'),t=h.querySelector('.pb-title');return {cls:f.className,hh:h.getBoundingClientRect().height,tf:getComputedStyle(t).fontSize,tw:t.offsetWidth,kids:[...h.children].map(c=>c.className.slice(0,18)+':'+c.offsetWidth),ts:h.style.cssText,sc:document.documentElement.classList.contains('pb-scrolled')};});
 for(const id of (process.argv[2]||'flowCalc,home,flowCalc,settings,flowCalc').split(',')){await p.evaluate(s=>pbGoto(s),id);for(const w of [30,200,500]){await p.waitForTimeout(w);console.log(id,w,JSON.stringify(await look()));}
  if(process.env.SCROLL){await p.evaluate(()=>window.scrollTo(0,300));await p.waitForTimeout(400);console.log(id,'scrolled',JSON.stringify(await look()));}}
 await b.close();})();
