// Job Summary field notes must print the note's station (run starts at 1+50; note 20 ft in = 1+70.00), not 0+20.00. FAIL r16.97, PASS patched.
const P=require('./plib');const fs=require('fs');
(async()=>{const T=await P.open();await P.load(T,JSON.parse(fs.readFileSync(__dirname+'/../../bughunt_nov17/pdfs/fixtures/archall.json')));
 await P.hook(T);await T.p.evaluate(()=>window.pbDownloadJobSummaryPDF('24-017'));const f=P.flat((await P.grab(T,((process.env.PB_OUT||'/tmp/claude-0/pdfout')+'/t06.pdf'))).txt);
 const m=(f.match(/MH-1 to MH-2 \S+ Note 1:/)||[''])[0];console.log('job summary:',m);
 const scr=await T.E(()=>{const s=computeJobSummary('24-017');return s.fieldNotes.map(n=>n.staTxt||n.station).slice(0,2).join(' | ');});console.log('screen data:',scr);
 const ok=/MH-1 to MH-2 1\+70\.00 Note 1:/.test(f)&&/^1\+70\.00/.test(scr);console.log(ok?'PASS':'FAIL','errs',T.p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
