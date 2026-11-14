// r16.24: spec books: home card for the office, spec card in Documents, several files at once
const boot=require('./boot');(async()=>{
const base=require('./pm_plans');
const extra=`window.__docCalls=[];let __n=0;Object.assign(window.__rpcOverride,{pb_docs_mine:()=>({ok:true,docs:(window.__docsList||[])}),pb_docs_begin:(a)=>{window.__docCalls.push(['begin',a.p_title,a.p_pages]);__n++;return {ok:true,doc_id:'D'+__n,storage_path:'D'+__n+'.pdf',bucket:'ask-docs'};},pb_docs_put_pages:(a)=>{window.__docCalls.push(['pages',a.p_doc,a.p_pages.length]);return {ok:true};},pb_docs_set_area:(a)=>({ok:true,area:a.p_area}),pb_docs_set_jobs:()=>({ok:true})});`;
const {b,p}=await boot(process.argv[2],{init:{content:'('+base.toString()+')();'+extra},wait:1000});
await p.route(/functions\/v1\/docs/,async r=>{let j={};try{j=JSON.parse(r.request().postData()||'{}')}catch(e){};const body=j.action==='verify_file'?{ok:true,pages:3}:j.action==='finish'?{ok:true,line:'Added.'}:j.action==='extract'?{ok:true,skipped:true}:{ok:true};await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await p.setViewportSize({width:390,height:844});
await p.evaluate(()=>{try{window.pbDocsQuiet()}catch(e){}});await p.waitForTimeout(2500);
await p.evaluate(()=>{try{pbHideModal()}catch(e){};pbGoto('home');});await p.waitForTimeout(1500);
console.log('HOME card:',await p.evaluate(()=>{const e=document.getElementById('homeAttention_specBooks');return e?e.innerText.replace(/\s+/g,' '):null;}));
await p.screenshot({path:'spec1.png'});
await p.click('#homeSpecBooksBtn').catch(e=>console.log('no home btn'));await p.waitForTimeout(1200);
console.log('screen',await p.evaluate(()=>(document.querySelector('.pb-screen.active')||{}).id),'specCard',await p.evaluate(()=>!document.getElementById('docsSpecCard').hidden),'addWrap hidden',await p.evaluate(()=>document.getElementById('docsAddWrap').hidden));
await p.screenshot({path:'spec2.png'});
const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#docsSpecBtn')]);await fc.setFiles(['/tmp/claude-0/spec1.pdf','/tmp/claude-0/spec2.pdf','/tmp/claude-0/spec3.pdf']);await p.waitForTimeout(800);
console.log('form:',await p.evaluate(()=>[document.getElementById('docsFileName').textContent,document.getElementById('docsTitleWrap').hidden]));
await p.fill('#docsState','CA');await p.fill('#docsAgency','City of Wildomar');
await p.screenshot({path:'spec3.png'});
await p.click('#docsUploadBtn');
let line='';for(let i=0;i<40;i++){await p.waitForTimeout(500);line=await p.evaluate(()=>document.getElementById('docsLine').textContent);if(/added/i.test(line))break;}
console.log('line:',line);console.log('calls:',JSON.stringify(await p.evaluate(()=>window.__docCalls)));
// single file still works with a title
await p.evaluate(()=>{window.__docsList=[{id:'D1',title:'spec1',state:'live',scope:'private',can_manage:true}];});await p.evaluate(()=>window.pbDocsLoad());await p.waitForTimeout(800);
console.log('after list: specCard hidden',await p.evaluate(()=>document.getElementById('docsSpecCard').hidden),'add shown',await p.evaluate(()=>!document.getElementById('docsAddWrap').hidden));
const [fc2]=await Promise.all([p.waitForEvent('filechooser'),p.click('#docsAddBtn')]);await fc2.setFiles(['/tmp/claude-0/spec1.pdf']);await p.waitForTimeout(500);
console.log('single:',await p.evaluate(()=>[document.getElementById('docsFileName').textContent,document.getElementById('docsTitleWrap').hidden,document.getElementById('docsTitle').value]));
await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(800);
console.log('HOME card after docs:',await p.evaluate(()=>!!document.getElementById('homeAttention_specBooks')));
console.log('errs',p.errs);await b.close();})();
