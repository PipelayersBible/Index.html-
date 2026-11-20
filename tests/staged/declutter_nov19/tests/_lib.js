// shared bits for the declutter tests. PB_URL = patched page, PB_BASE = r17.10 _src/index.html.
const R=__dirname+'/../../../rig/';const boot=require(R+'boot');const co=require(R+'co');const co3=require(R+'co3');const co_pl=require(R+'co_pl');const mgr=require(R+'mgr');const F=require(R+'flow');
const PORT=process.env.PB_PORT||9350;
const CUR=process.env.PB_URL||`http://127.0.0.1:${PORT}/cur.html`, BASE=process.env.PB_BASE||`http://127.0.0.1:${PORT}/base.html`;
const BETA=`;(function(){window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_my_plan:()=>({ok:true,plan:'trial',days_left:23,expired:false})});})();`;
// a PM / superintendent: a company member with the pm role who is a listed manager
const PM=`;(function(){const d=window.__rpcOverride.pb_prod_access;window.__rpcOverride.pb_prod_access=()=>Object.assign(d(),{member:true,company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:'pm'});window.__tableOne=Object.assign(window.__tableOne||{},{company_members:{company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:'pm',title:'PM',companies:{name:'Test Co',status:'active'}}});})();`;
const ROLES={pl:co_pl+BETA, fm:co3+BETA, pm:co+mgr+PM+BETA, owner:co+mgr+BETA};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;return c;};
const start=async(url,init,vp)=>{const {b,p}=await boot(url,{init,wait:3500});await p.setViewportSize(vp||{width:390,height:844});await p.waitForTimeout(700);return {b,p,H:F(p)};};
// what a screen shows: blocks (cards / rows / notices), how many are on the first screen, fonts
const measure=(p,screen)=>p.evaluate((screen)=>{
  const s=document.getElementById('screen-'+(screen||'home'));const vis=e=>{if(!e||!e.getClientRects().length)return false;const c=getComputedStyle(e);return c.visibility!=='hidden'&&c.display!=='none'&&+c.opacity>0.05;};
  const nav=document.querySelector('.pb-tabbar,#pbTabBar,nav[aria-label]');const wide=innerWidth>=1000;const navTop=(!wide&&nav&&vis(nav))?nav.getBoundingClientRect().top:innerHeight;
  // text sizes
  const sizes=[];const w=document.createTreeWalker(s,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.nodeValue.trim();if(!t)continue;const e=n.parentElement;if(!vis(e)||e.closest('.pb-sr,[hidden],[inert]'))continue;const r=e.getBoundingClientRect();const px0=parseFloat(getComputedStyle(e).fontSize);if(r.width<2||r.height<2||px0<2)continue;sizes.push({t:t.slice(0,40),px:parseFloat(getComputedStyle(e).fontSize),y:Math.round(r.top+scrollY),id:(e.closest('[id]')||{}).id||''});}
  // tappable things
  const taps=[...s.querySelectorAll('button,a[href],[role=button],input,select,textarea')].filter(e=>vis(e)&&!e.closest('[inert]')&&e.getBoundingClientRect().width>2);
  const fold=taps.filter(e=>{const r=e.getBoundingClientRect();return r.top<navTop&&r.bottom>0;});
  // cards: bordered / shadowed boxes that are not inside another counted box
  const boxes=[...s.querySelectorAll('*')].filter(e=>{if(!vis(e))return false;const c=getComputedStyle(e);const r=e.getBoundingClientRect();if(r.width<120||r.height<30)return false;return (parseFloat(c.borderTopWidth)>0&&c.borderTopStyle!=='none'&&parseFloat(c.borderLeftWidth)>0)||c.boxShadow!=='none';});
  const top=boxes.filter(e=>!boxes.some(o=>o!==e&&o.contains(e)));
  const heads=[...s.querySelectorAll('h2,.pb-home-sec,.pb-edu-h,.pbx-h')].filter(vis).map(e=>e.textContent.trim());
  const small=sizes.filter(x=>x.px<14);
  return {height:s.scrollHeight,navTop:Math.round(navTop),taps:taps.length,tapsFold:fold.length,cards:top.length,cardsFold:top.filter(e=>{const r=e.getBoundingClientRect();return r.top<navTop&&r.bottom>0;}).length,
    cardIds:top.map(e=>(e.id||e.className.toString().split(' ')[0])+'@'+Math.round(e.getBoundingClientRect().top+scrollY)),heads,texts:sizes.length,minFont:sizes.length?Math.min(...sizes.map(x=>x.px)):null,under14:small.length,smallList:small.map(x=>x.px+':'+x.t+' #'+x.id),
    words:s.innerText.split(/\s+/).filter(Boolean).length, tapList:taps.map(e=>(e.id||'')+':'+(e.innerText||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,40))};
},screen);
module.exports={R,boot,F,ROLES,BETA,CUR,BASE,PORT,ok,start,measure,fails:()=>fails,done:(b)=>{console.log(fails?fails+' FAILED':'ALL PASS');return (b?b.close():Promise.resolve()).then(()=>process.exit(fails?1:0));}};
