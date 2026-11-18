const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const mgr=require(__dirname+'/../../rig/mgr');
const PAGE=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
async function open(extra='',opts={}){const {b,p}=await boot(PAGE,{init:co+mgr+extra,wait:opts.wait||3500});
 if(opts.w)await p.setViewportSize({width:opts.w,height:opts.h||900});return {b,p};}
async function shot(p,name){await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/audit/office2/shots')+'/')+name+'.png',fullPage:false});}
async function overflow(p){return p.evaluate(()=>{const W=document.documentElement.clientWidth;const s=document.querySelector('.pb-screen.active');if(!s)return [];return [...s.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&getComputedStyle(e).position!=='fixed'}).slice(0,8).map(e=>(e.id||e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().right)+' '+(e.innerText||'').slice(0,40));});}
async function txt(p){return p.evaluate(()=>{const s=document.querySelector('.pb-screen.active');return s?s.id+'\n'+s.innerText:'none';});}
async function modal(p){return p.evaluate(()=>{const o=document.getElementById('pbModalOverlay');return o&&getComputedStyle(o).display!=='none'?o.innerText:'';});}
module.exports={open,shot,overflow,txt,modal,PAGE};
