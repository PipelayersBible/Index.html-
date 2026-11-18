// A permit with a responder link: the PDF must not leave readers with a self-check that always fails. FAIL r16.97, PASS patched.
const P=require('./plib');const fs=require('fs');const crypto=require('crypto');
(async()=>{const T=await P.open();await P.load(T,JSON.parse(fs.readFileSync('/home/claude/index.html-/tests/bughunt_nov17/pdfs/fixtures/archp.json')));
 const r=await T.p.evaluate(()=>{let got=null;window.__debugJsonSink=(n,t)=>{got=t;};window.pbExportRecordJSON(0);return {t:got,fp:window.pbRptFingerprintOf(window.__ev('runArchive[0]'))};});
 const match=crypto.createHash('sha256').update(Buffer.from(r.t,'utf8')).digest('hex')===r.fp;
 const f=P.flat((await P.recPdf(T,0,'/tmp/claude-0/pdfout/t08.pdf')).txt);
 const warned=/will NOT equal the fingerprint above/.test(f);console.log('export sha matches fingerprint:',match,'| PDF explains the mismatch:',warned);
 const ok=match||warned;console.log(ok?'PASS':'FAIL','errs',T.p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
