// critic: Quick Run opened the real way (Home tile), first number in how many fields; Ask with a stubbed answer
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const F=require(R+'/flow');
const URL=process.env.PB_URL||'http://127.0.0.1:9150/cur.html';const SH=__dirname+'/../shots/';
(async()=>{const {b,p}=await boot(URL,{init:co,wait:3500});const H=F(p);await p.setViewportSize({width:390,height:664});
 await p.getByRole('button',{name:'Quick Run Basic grade'}).click();await p.waitForTimeout(1200);
 console.log('QR inputs',await p.evaluate(()=>[...document.querySelectorAll('#screen-quickrun input')].filter(e=>e.offsetParent).map(e=>e.id).join(' ')));
 console.log('QR nav active',await p.evaluate(()=>{const a=[...document.querySelectorAll('nav button,[class*=tab] button,.pb-shell-nav a')].filter(e=>e.offsetParent&&/active|current/.test(e.className+(e.getAttribute('aria-current')||'')));return a.map(e=>e.textContent.trim()).join(',')}));
 await p.screenshot({path:SH+'c_quick_real_fold.png'});await p.screenshot({path:SH+'c_quick_real_full.png',fullPage:true});
 console.log('errs',p.errs.slice(0,3));await b.close();})();
