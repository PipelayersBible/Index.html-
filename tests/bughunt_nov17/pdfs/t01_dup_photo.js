// The same image attached at two points must not be reported as "not on this phone". FAIL on r16.97, PASS patched.
const P=require('./plib');const fs=require('fs');
(async()=>{const T=await P.open();const a=JSON.parse(fs.readFileSync('/home/claude/index.html-/tests/bughunt_nov17/pdfs/fixtures/arch2a.json'));const e=a[0];
 const r0=e.intervalRows.find(r=>(r.photos||[]).length);const r1=e.intervalRows.find(r=>r!==r0&&!(r.photos||[]).length&&r.pointId);
 (r1||e.intervalRows[1]).photos=[r0.photos[0]];e.photoCount+=1;await P.load(T,[e]);
 const {txt}=await P.recPdf(T,0,'/tmp/claude-0/pdfout/t01.pdf');const f=P.flat(txt);
 const bad=/Photos not included/.test(f)||/only \d+ are on this phone/.test(f);
 console.log('glance:',(f.match(/Pipe installed Photos .{0,80}/)||[''])[0]);console.log(bad?'FAIL':'PASS','errs',T.p.errs.slice(0,3));await T.b.close();process.exit(bad?1:0);})();
