// shared: boot the page (PG env, default cur.html) on port 8881, load the driver, fill a scenario, return the calc
const fs=require('fs'),path=require('path');
const boot=require('/home/claude/rig/boot'),co=require('/home/claude/rig/co');
module.exports=async()=>{const PG=process.env.PG||'cur.html';const {b,p}=await boot('http://127.0.0.1:8843/'+PG,{init:co});
 await p.evaluate(src=>window.__ev(src),fs.readFileSync(path.join(__dirname,'..','ref','driver.js'),'utf8'));
 const T={b,p,PG};
 T.run=sc=>p.evaluate(sc=>{window.__g2fill(sc);return window.__g2calc();},sc);
 T.E=(fn,...a)=>p.evaluate(([s,a])=>window.__ev('('+s+')(...'+JSON.stringify(a)+')'),[fn.toString(),a]);
 T.done=async(fails)=>{if(p.errs.length)fails.push('page errors: '+p.errs.slice(0,3).join(' | '));console.log(PG+': '+(fails.length?'FAIL\n  '+fails.join('\n  '):'PASS'));await b.close();process.exit(fails.length?1:0);};
 return T;};
// a stake point
module.exports.S=(se,cf,shot)=>({mode:'stake',stakeElev:se,cf:cf<0?'fill':'cut',cfVal:Math.abs(cf),shot:shot===undefined?null:shot});
