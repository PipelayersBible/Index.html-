const L=require('./lib');(async()=>{const {b,p,H}=await L({v:1});
 console.log(await H.lock());
 for(const r of [[19.5,10,10,25],[19.4,0,0,0],[20.9,0,0,0],[23.5,0,null,null],[23.6,0,null,null],[20.9,10.1,null,null],[20.9,0,10.5,null],[20.9,0,null,null],[20.9,0,0,25.5],[20.9,0,0,null],[20.9,0,null,25]]){const x=await H.read(...r);console.log(JSON.stringify(r),'banner:',!!x.banner,'block:',x.block,'modal:',(x.modal||'').slice(0,70));}
 console.log('errs',p.errs);await b.close();})();
