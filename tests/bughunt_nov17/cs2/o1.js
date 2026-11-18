const L=require('./lib2');(async()=>{const {b,p,H}=await L({});
 await H.lock();
 for(const r of [[20.9,0,0,0],['209',0,0,0],['-1',0,0,0],[20.9,'150',0,0],[20.9,0,'-3',0],['20,9',0,0,0],['',0,0,0],[20.9,'',0,0],['',' ','',''],[' 20.9 ','0','',''],['1e1',0,0,0],['20.9.1',0,0,0],[100,0,0,0],[0,0,0,0],[20.9,0,0,'abc']]){const x=await H.read(...r);console.log(JSON.stringify(r),'=>',(x.modal||'-').slice(0,150),'| banner:',!!x.banner);}
 console.log(JSON.stringify(await H.D('confinedAtmoLog.map(r=>[r.o2,r.lel,r.h2s,r.co])')));
 console.log('errs',p.errs);await b.close();})();
