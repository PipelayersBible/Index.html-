const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:400,height:850},serviceWorkers:'block',geolocation:{latitude:34.02688,longitude:-117.11804,accuracy:6},permissions:['geolocation']});
 const p=await ctx.newPage();await p.addInitScript({content:fs.readFileSync('/home/claude/rig/fakesb.js','utf8')});await p.addInitScript({content:require('/home/claude/rig/co')});
 let geoReq=0;await p.route('**/nominatim.openstreetmap.org/**',r=>{geoReq++;r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({address:{house_number:'31467',road:'Avenue E',city:'Yucaipa',state:'California','ISO3166-2-lvl4':'US-CA',postcode:'92399'}})});});
 await p.route('**/fonts.googleapis.com/**',r=>r.abort());
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
 const boot=fs.readFileSync('/home/claude/rig/boot.js','utf8');
 await p.goto('http://127.0.0.1:8843/cur.html');await p.waitForTimeout(2500);
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await p.evaluate(()=>{DeviceOrientationEvent.requestPermission=()=>Promise.resolve('granted');});
 await p.click('#saJobNumber');await p.waitForTimeout(1500);
 await p.setInputFiles('#startPhoto',{name:'IMG.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('/tmp/claude-0/evimg/p12.jpg')});await p.waitForTimeout(3500);
 console.log(await p.evaluate(()=>JSON.stringify({stamp:(window._pbPhotos.start||[])[0]&&window._pbPhotos.start[0].stamp,offer:!!document.getElementById('startCapOffer')})));
 await p.fill('#startCapOffer input','Blue booth at MH-1');await p.click('#startCapOffer button');await p.waitForTimeout(1500);
 const url=await p.evaluate(()=>window._pbPhotos.start[0].url+'|'+JSON.stringify(window._pbPhotos.start[0].stamp.caption)+'|offer='+!!document.getElementById('startCapOffer'));
 const [u,rest]=url.split('|',2);console.log('after caption:',url.slice(url.indexOf('|')),'geoReq',geoReq);
 fs.writeFileSync('/tmp/claude-0/walk/stamped.jpg',Buffer.from(u.split(',')[1],'base64'));
 console.log('ctx old:',await p.evaluate(()=>JSON.stringify(pbCam.ctxFor({lastModified:Date.now()-86400000}))));
 await p.evaluate(()=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:242,absolute:true})));
 console.log('in input?',await p.evaluate(()=>{const t=document.getElementById('saJobNumber');return !!t.closest('#screen-input, #screen-results')+' typeofReq='+typeof DeviceOrientationEvent.requestPermission;}));
 console.log('ori dbg',await p.evaluate(()=>{const e=new DeviceOrientationEvent('deviceorientation',{alpha:242,absolute:true});return JSON.stringify({ori:pbCam._g.ori,a:e.alpha,abs:e.absolute,head:pbCam._g.head});}));
 console.log('ctx head:',await p.evaluate(()=>{const c=pbCam.ctxFor({lastModified:Date.now()});return c.head;}));
 // library-type file (old lastModified)
 await p.setInputFiles('#endPhoto',{name:'old.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('/tmp/claude-0/evimg/p13.jpg'),lastModified:Date.now()-86400000}).catch(e=>console.log('lm opt',e.message));await p.waitForTimeout(2500);
 console.log('library photo stamp:',await p.evaluate(()=>JSON.stringify(((window._pbPhotos.end||[])[0]||{}).stamp||null)));
 // viewer caption button
 await p.click('#startPhotoList img');await p.waitForTimeout(500);console.log('viewer cap btn:',await p.evaluate(()=>!!document.querySelector('.pb-pv .cap')));
 console.log('errs',errs);await b.close();})();
