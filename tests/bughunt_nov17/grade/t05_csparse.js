// Check-shot parser: inch-marked values are inches; everything else as before.
const L=require('./lib');
(async()=>{const T=await L();const {p}=T;
 const want=[['7"',7/12],['7 1/2"',7.5/12],['0.5"',0.5/12],['3/4"',0.75/12],['11 in',11/12],
  ['7-3 1/2',7+3.5/12],["7'-3 1/2\"",7+3.5/12],["7'3\"",7.25],['7ft 3in',7.25],['7 3',7.25],["3' 2 1/2\"",3+2.5/12],['4.36',4.36],["7'",7],['7-13',null],['—',null],['0-7 1/2',7.5/12]];
 const got=await p.evaluate(w=>w.map(x=>window.pbCsParse(x[0])),want);
 const bad=want.map((x,i)=>[x[0],x[1],got[i]]).filter(x=>x[1]===null?x[2]!==null:(x[2]===null||Math.abs(x[2]-x[1])>1e-9));
 console.log('wrong:',JSON.stringify(bad));const ok=!bad.length;console.log(ok?'PASS':'FAIL');await T.b.close();process.exit(ok?0:1);})();
