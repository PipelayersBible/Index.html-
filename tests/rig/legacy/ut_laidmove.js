const fs=require('fs');const s=fs.readFileSync('m_a.html','utf8');
const grab=(start,endMark)=>{const i=s.indexOf(start);const j=s.indexOf(endMark,i);return s.slice(i,j);};
let code='';
code+=grab('  const pbLaidKey = (r)','\n')+'\n';
code+=grab('  const pbPlainOwnStart =','  // EXTRA')+'\n';
code+=grab('  function pbPlainRunEnd(','  // The end of its own run when')+'\n';
code+=grab('  function pbLaidRekeyAfterCorrection(','  window.__pbLaidRekey')+'\n';
const window={};const pbLaidEarlier=()=>({reach:null});
eval(code+';global.R=pbLaidRekeyAfterCorrection;');
const row=(ft,pid)=>({stationFt:ft,station:ft.toFixed(1),pointId:pid||null});
const k=r=>r.pointId?'p:'+r.pointId:'sta:'+r.stationFt.toFixed(2);
function run(name,oldRows,newRows,points,total,laidUpto,expect){
  const marks={};oldRows.forEach((r,i)=>{if(i<=laidUpto)marks[k(r)]=1000+i;});
  const e={laid:{v:1,marks,log:[]},intervalRows:newRows};
  const ch=R(e,oldRows,{points,totalDist:total});
  const got=newRows.map(r=>typeof e.laid.marks[k(r)]==='number'?'L':'.').join('');
  console.log((got===expect?'PASS ':'FAIL ')+name+' got '+got+' want '+expect+' changed='+ch);
}
// single run 0..100 every 10, hub at 50
const mk=(stas,hubs,end)=>stas.map(f=>row(f,f===0?'start':f===end?'end':hubs[f]||null));
let o=mk([0,10,20,30,40,50,60,70,80,90,100],{50:'h1'},100);
// hub corrected 50 -> 75: hub laid (laid to 50) => everything before 75 laid
let n=mk([0,10,20,30,40,60,70,75,80,90,100],{75:'h1'},100);
run('hub moved forward, laid',o,n,[{id:'start',station:0},{id:'h1',station:75},{id:'end',station:100}],100,5,'LLLLLLLL...');
// laid to 40 (hub at 50 not laid), hub corrected back to 25 => hub gap filled
n=mk([0,10,20,25,30,40,60,70,80,90,100],{25:'h1'},100);
run('hub moved back behind laid rows',o,n,[{id:'start',station:0},{id:'h1',station:25},{id:'end',station:100}],100,4,'LLLLLL.....');
// distance shortened 100 -> 60 while laid to 80 => laid to end
n=mk([0,10,20,30,40,50,60],{50:'h1'},60);
run('shortened past laid',o,n,[{id:'start',station:0},{id:'h1',station:50},{id:'end',station:60}],60,8,'LLLLLLL');
// distance extended, laid to 40 only => no change
n=mk([0,10,20,30,40,50,60,70,80,90,100,110,120],{50:'h1'},120);
run('extended, partial laid',o,n,[{id:'start',station:0},{id:'h1',station:50},{id:'end',station:120}],120,4,'LLLLL........');
// multi-run: run1 0..50 (end), run2 starts at 50 (seg2start) to 100 (seg2end). run1 shortened to 40 => run2 shifts -10
const m=(list)=>list.map(([f,p])=>row(f,p));
o=m([[0,'start'],[10],[20],[30],[40],[50,'end'],[50,'seg2start'],[60],[70],[80],[90],[100,'seg2end']]);
n=m([[0,'start'],[10],[20],[30],[40,'end'],[40,'seg2start'],[50],[60],[70],[80],[90,'seg2end']]);
// laid to 70 (index 8) in run2
run('multi-run shift',o,n,[{id:'start',station:0},{id:'end',station:40},{id:'seg2start',station:40},{id:'seg2end',station:90}],90,8,'LLLLLLLL...');
