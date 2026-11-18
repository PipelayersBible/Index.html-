// fails on r16.88, passes on fix.html: the daily export's certificate only states what the ZIP holds
const X=require('./exp');
(async()=>{let ok=true;const say=(n,c,x)=>{console.log((c?'ok   ':'FAIL ')+n+(x?' :: '+x:''));if(!c)ok=false;};
 let o=await X('base');say('base still exports with signature + 2 photos + v1',o.zip&&o.files.includes('./signature.png')&&o.files.includes('./earlier/daily-report-v1.json')&&/2 photographs and the signature image/.test(o.cert)&&!/NOT in this export/.test(o.cert));
 o=await X('nosig');say('no signature: p10 does not claim signature.png',o.zip&&!o.files.includes('./signature.png')&&!/included as signature\.png/.test(o.cert),(o.cert.split('\n').find(l=>/^10\. /.test(l))||'').slice(0,160));
 o=await X('chainfail');say('earlier version unreadable: no export, no "no earlier version" claim',!o.zip&&/Not Exported/.test(o.modal||''),o.modal);
 o=await X('photofail');say('photos not downloaded: said so',o.zip&&/2 more photographs listed in the report could not be downloaded/.test(o.cert)&&/NOT in this export/.test(o.manifest),(o.cert.split('\n').find(l=>/^4\. The Records/.test(l))||'').slice(0,260));
 o=await X('many');say('40 versions: all 39 earlier ones exported',o.zip&&o.files.filter(f=>/earlier\//.test(f)).length===39,String(o.files.filter(f=>/earlier\//.test(f)).length)+' earlier files; '+(o.modal||'').slice(0,80));
 console.log(ok?'PASS':'FAIL');process.exit(ok?0:1);})();
