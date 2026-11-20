// node harvest.js <scenario> [selector]   -> the English on that screen that has no Spanish yet (and a screenshot)
const L=require('./lib');const fs=require('fs');
(async()=>{const b=await L.chromium.launch();const names=process.argv[2].split(',');const sel=process.argv[3]||null;const all=process.argv[4]==='all';
 for(const name of names){const dump=(r,title,p)=>{const seen=new Set();console.log('== '+title+' ('+r.length+' pieces, '+r.filter(x=>!x.hit).length+' without Spanish)'+(p.errs.length?' ERRS '+p.errs.join('|'):''));for(const x of r){if(x.hit&&!all)continue;const key=x.kind+x.k;if(seen.has(key))continue;seen.add(key);console.log((x.hit?'  ok ':'')+'['+x.kind+'] '+x.k);}};
  let p;try{p=await L.SC[name](b,{lang:process.env.LANGX||'',onStep:async(p,label)=>{dump(await L.scan(p,'#pbModalOverlay'),name+'/'+label,p);if(process.env.SHOT)await p.screenshot({path:process.env.SHOT+'/'+name+'_'+label+'.png'});}});}catch(e){console.log('== '+name+' SCENARIO FAILED '+String(e).slice(0,300));continue;}
  const r=await L.scan(p,sel);dump(r,name,p);if(p.mods)console.log('   mods: '+p.mods.join('\n   mods: '));
  if(process.env.SHOT)await p.screenshot({path:process.env.SHOT+'/'+name+(process.env.LANGX?'_'+process.env.LANGX:'')+'.png',fullPage:false});
  await p.context().close();}
 await b.close();})();
