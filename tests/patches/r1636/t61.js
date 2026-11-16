const boot=require('./boot');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/idx36.html');
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1000);
 await p.evaluate(()=>pbAddHub());await p.evaluate(()=>{const e=document.getElementById('hub0FitOn');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));const t=document.getElementById('hub0FitType');t.value='bend';t.dispatchEvent(new Event('change',{bubbles:true}));});
 for (const id of ['hub0FitType','hub0FitAng','startCutFill','runIdSel']) console.log(id, await p.evaluate(id=>{const e=document.getElementById(id);if(!e)return 'none';const c=getComputedStyle(e);return c.backgroundImage.slice(0,40)+' | '+c.backgroundColor+' | pr='+c.paddingRight;},id));
 await p.evaluate(()=>{document.documentElement.classList.remove('pb-light');document.documentElement.classList.add('pb-dark');});await p.waitForTimeout(200);await p.locator('#hub0FitRow').screenshot({path:'/tmp/claude-0/fitrow.png'});
 await b.close();})();
