// beta audit 01: an expired invite link tells the invited person how to set a password (not "if you were resetting")
const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');
const f=process.argv[2]||'cur.html';
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/'+f+'#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',{init:co,wait:5000});
 const t=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?d.innerText.replace(/\s+/g,' '):'';});
 const pass=/Link Expired/.test(t)&&/To set your password/.test(t)&&!/If you were resetting/.test(t);
 console.log(pass?'PASS':'FAIL','|',t.slice(0,260),'| url hash cleared:',await p.evaluate(()=>location.hash===''),'errs',p.errs);
 await b.close();process.exit(pass?0:1);})();
