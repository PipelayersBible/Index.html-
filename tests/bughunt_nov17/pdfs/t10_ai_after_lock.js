// AI section on a run with a correction after lock (AI-read hub moved 2 ft) must not say "None changed by hand after the AI read". FAIL r16.97, PASS patched.
const P=require('./plib');const fs=require('fs');
(async()=>{const T=await P.open();await P.load(T,JSON.parse(fs.readFileSync(__dirname+'/../../bughunt_nov17/pdfs/fixtures/arch2a.json')));
 const f=P.flat((await P.recPdf(T,0,((process.env.PB_OUT||'/tmp/claude-0/pdfout')+'/t10.pdf'))).txt);console.log((f.match(/cross-check could not test these values\..{0,240}/)||[''])[0]);
 const ok=!/None changed by hand after the AI read/.test(f)&&/made after lock/.test(f);console.log(ok?'PASS':'FAIL','errs',T.p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
