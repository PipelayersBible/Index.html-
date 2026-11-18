// The resumed session's run PDF must say its backfill/bedding is the whole run (already including the earlier part). FAIL r16.97, PASS patched.
const P=require('./plib');const fs=require('fs');
(async()=>{const T=await P.open();const a=JSON.parse(fs.readFileSync(__dirname+'/../../bughunt_nov17/pdfs/fixtures/arch2b.json'));await P.load(T,a);const i=a.findIndex(e=>e.resumedFromId);
 const f=P.flat((await P.recPdf(T,i,((process.env.PB_OUT||'/tmp/claude-0/pdfout')+'/t11.pdf'))).txt);console.log((f.match(/Est\. backfill .{0,170}/)||[''])[0]);
 const ok=/Est\. backfill 121\.3 cu yd \(calculated estimate\) \(whole/.test(f)&&/already includes the/.test(f);console.log(ok?'PASS':'FAIL','errs',T.p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
