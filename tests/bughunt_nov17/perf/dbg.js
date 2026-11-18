const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{for(const args of [['--host-resolver-rules=MAP app.pipelayersbible.com 127.0.0.1:8884','--ignore-certificate-errors','--no-proxy-server'],['--host-resolver-rules=MAP app.pipelayersbible.com:443 127.0.0.1:8884','--ignore-certificate-errors']]){
const b=await chromium.launch({args,proxy:{server:process.env.HTTPS_PROXY||'direct://',bypass:'app.pipelayersbible.com,127.0.0.1'}});const ctx=await b.newContext({ignoreHTTPSErrors:true});const p=await ctx.newPage();
try{const r=await p.goto('https://app.pipelayersbible.com/base/sw.js',{timeout:10000});console.log(args[0],r.status());}catch(e){console.log('fail',e.message.slice(0,200));}
await b.close();}})();
