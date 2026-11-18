const L=require('./lib');
(async()=>{const T=await L();const {p}=T;
 console.log(JSON.stringify(await p.evaluate(()=>['7"','7 1/2"','11 1/2','0-7 1/2','7\'','7-3 1/2','7.5','7 3','3\' 2 1/2"','5.','-0.5','7-3-1/2','4,36','7\'3"','7ft 3in','0.5"','7 1/2'].map(t=>t+' => '+window.pbCsParse(t)))));
 console.log(JSON.stringify(await T.E(()=>[toArch(-0.001),toArch(0.9999),toArch(11.99999/12),fmt(62.25,1),fmt(188.75,1),fmt(0.005,2),fmt(-0.005,2),fmt(1.005,2),fmt(7.285,2),fmt(-0.0001,2),pbCutsheetStaText(199.999),pbCutsheetStaText(-50),pbCutsheetStaText(1250.3),pbStParse('1+50.25'),pbStParse('12+5'),pbStParse('STA 12+45.3'),pbStParse('-0+50'),pbStParse('1+50.'),pbStParse('10+100')])));
 await T.b.close();})();
