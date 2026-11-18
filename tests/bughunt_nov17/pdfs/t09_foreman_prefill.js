// Run PDF must not call pre-filled excavation/backfill feet "typed by the foreman" (rig typed only pipe installed). FAIL r16.97, PASS patched.
const P=require('./plib');const fs=require('fs');
(async()=>{const T=await P.open();await P.load(T,JSON.parse(fs.readFileSync('/home/claude/index.html-/tests/bughunt_nov17/pdfs/fixtures/arch2a.json')));
 const f=P.flat((await P.recPdf(T,0,'/tmp/claude-0/pdfout/t09.pdf')).txt);console.log((f.match(/Foreman production Quantities .{0,140}/)||[''])[0]);
 const ok=!/Quantities typed by the foreman/.test(f)&&/pre-filled/.test(f);console.log(ok?'PASS':'FAIL','errs',T.p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
