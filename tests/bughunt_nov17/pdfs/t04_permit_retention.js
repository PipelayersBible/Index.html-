// Permit closeout PDF must not promise the app keeps permits "indefinitely". FAIL r16.97, PASS patched.
const P=require('./plib');const fs=require('fs');
(async()=>{const T=await P.open();await P.load(T,JSON.parse(fs.readFileSync('/home/claude/index.html-/tests/bughunt_nov17/pdfs/fixtures/archp.json')));
 const f=P.flat((await P.recPdf(T,0,'/tmp/claude-0/pdfout/t04.pdf')).txt);
 console.log((f.match(/Permit retention .{0,200}/)||[''])[0]);
 const ok=!/indefinitely/.test(f)&&/company’s responsibility/.test(f);console.log(ok?'PASS':'FAIL','errs',T.p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
