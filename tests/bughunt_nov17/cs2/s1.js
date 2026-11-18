const L=require('./lib');(async()=>{const {b,p,H}=await L({v:1});
 await p.setViewportSize({width:390,height:844});
 console.log(await H.lock({cpJobNumber:'24-017'}));
 for(const r of [[20.9,0,0,0],[19.4,0,0,0]]){const x=await H.read(...r);console.log(JSON.stringify(r),JSON.stringify(x));}
 console.log(await p.evaluate(()=>document.getElementById('screen-confinedActive').innerText.slice(0,3000)));
 console.log('errs',p.errs);await b.close();})();
