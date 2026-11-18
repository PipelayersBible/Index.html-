const {launch}=require('./srv');const co=require(__dirname+'/../../../rig/co');
(async()=>{const {b,ctx,p,S}=await launch((process.env.PB_URL||'http://127.0.0.1:8877/cur.html'),{init:co});
 console.log(await p.evaluate(()=>({ls:localStorage.getItem('pbCrewNotice:00000000-0000-4000-8000-000000000001'),m:document.getElementById('pbModalMessage')&&document.getElementById('pbModalMessage').innerText.slice(0,80),vis:document.getElementById('pbModalOverlay').offsetParent!==null})));
 console.log(S.calls.map(c=>c.n).join(','));console.log(p.errs);await b.close();})();
