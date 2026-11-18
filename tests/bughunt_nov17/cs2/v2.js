const L=require('./lib2');(async()=>{const {b,p,H}=await L({});
 await H.lock({cpCommInterval:'5'});await H.read(20.9,0,0,0);await H.addPerson('Ed Entrant');await H.checkin('Ed Entrant');
 await H.D("pbShowReminder('comm','Communication check due — check in with the entrant(s) now. If an entrant doesn\\u2019t answer, tap EMERGENCY.','Communication Check')");await p.waitForTimeout(400);
 await p.screenshot({path:'/tmp/claude-0/audit/cs2/t/v2_'+(process.env.DARK?'dark':'light')+'.png'});
 console.log('errs',p.errs);await b.close();})();
