// A run flagged at the 4 ft rule (caveFt 4, deepest cut 3.83 ft + bedding) must not be recorded as "5 ft or deeper". FAIL r16.97, PASS patched.
const P=require('./plib');const fs=require('fs');
(async()=>{const T=await P.open();const a=JSON.parse(fs.readFileSync(__dirname+'/../../bughunt_nov17/pdfs/fixtures/arch2a.json'));console.log('caveFt',a[0].caveFt,'flag',a[0].depthFlagged);await P.load(T,a);
 const f=P.flat((await P.recPdf(T,0,((process.env.PB_OUT||'/tmp/claude-0/pdfout')+'/t07.pdf'))).txt);console.log((f.match(/WARNING: .{0,160}/)||[''])[0]);
 await P.hook(T);await T.p.evaluate(()=>window.pbDownloadJobSummaryPDF('24-017'));const g=P.flat((await P.grab(T,((process.env.PB_OUT||'/tmp/claude-0/pdfout')+'/t07j.pdf'))).txt);console.log((g.match(/report\(s\) had a trench depth flag .{0,60}/)||[''])[0]);
 const ok=!/trench 5 ft or deeper indicated/.test(f)&&/4 ft or deeper/.test(f)&&!/depth flag \(5 ft or deeper\)/.test(g);console.log(ok?'PASS':'FAIL','errs',T.p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
