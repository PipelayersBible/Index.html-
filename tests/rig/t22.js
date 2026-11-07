const boot=require('./boot');(async()=>{const {b,p}=await boot('http://localhost:8814/',{init:require('./pm'),wait:4000});
await p.context().setOffline(true);await p.evaluate(()=>window.dispatchEvent(new Event('offline')));await p.waitForTimeout(800);
await p.context().setOffline(false);await p.evaluate(()=>window.dispatchEvent(new Event('online')));await p.waitForTimeout(800);
console.log(await p.evaluate(()=>[document.documentElement.classList.contains('pb-nosig'),!!document.querySelector('.pb-nosig-line')&&getComputedStyle(document.querySelector('.pb-nosig-line')).display]));console.log(p.errs);await b.close();})();
