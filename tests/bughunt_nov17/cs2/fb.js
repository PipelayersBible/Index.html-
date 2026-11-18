const L=require('./lib2');(async()=>{const {b,p,H}=await L({});
 await H.lock();
 console.log(await p.evaluate(()=>{const e=[...document.querySelectorAll('*')].filter(x=>x.offsetParent!==undefined&&x.childElementCount<3&&/^Feedback$/.test(x.textContent.trim()));return e.map(x=>x.tagName+'#'+x.id+'.'+x.className+' pos='+getComputedStyle(x).position+' '+getComputedStyle(x.parentElement).position+' '+x.parentElement.id+'.'+x.parentElement.className);}));
 await b.close();})();
