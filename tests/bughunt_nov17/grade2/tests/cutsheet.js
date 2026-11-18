// Cut-sheet import (both directions, engineer and architect): rows go in through pbFinishCutsheetImport (the import's
// last step), then the pipe is set and the grade compared with the sheet: invert = stake - cut (+ fill), stations = the
// sheet's, distances = |station - first station|.
const L=require('./lib');const {compute,staText}=require('../ref/refcalc');
(async()=>{const T=await L();const fails=[];const p=T.p;
 const sheets={
  up:[[1245.30,2589.06,'cut',3.25,'MH-1'],[1310.55,2589.40,'cut',3.33,'AP'],[1390.00,2590.10,'fill',0.40,'WYE'],[1550.30,2591.90,'cut',4.10,'MH-2']],
  down:[[1550.30,2591.90,'cut',4.10,'MH-2'],[1390.00,2590.10,'fill',0.40,'WYE'],[1310.55,2589.40,'cut',3.33,'AP'],[1245.30,2589.06,'cut',3.25,'MH-1']],
 };
 for(const rod of ['engineer','architect','lenker'])for(const [k,rows] of Object.entries(sheets)){
  const a=await p.evaluate(([rod,rows])=>window.__ev(`(function(rod,rows){
    pbOpenNewRun({ask:false});
    const b=document.querySelector('#rodToggle button[data-val="'+rod+'"]'); if(!b.classList.contains('active')) b.click();
    const checked=rows.map((r,i)=>({station:r[0],stakeElev:r[1],cfType:r[2],cfVal:r[3],description:r[4],stakeNum:String(100+i)}));
    pbFinishCutsheetImport(checked);
    document.querySelectorAll('#pbModalButtons button').forEach(x=>x.click());
    const pt=document.getElementById('runPipeType'); pt.value='PVC SDR 35'; pt.dispatchEvent(new Event('change',{bubbles:true}));
    const s=document.getElementById('runIdSel'); s.value='8'; s.dispatchEvent(new Event('change',{bubbles:true}));
    document.getElementById('runWT').value='0.02'; document.getElementById('interval').value='25';
    if(rod!=='lenker'){ const h=document.querySelector('#hiToggle button[data-val="direct"]'); h.click(); setElevFieldValue('hiDirect', 2600, rod==='architect'); }
    __g2settle(); return __g2calc(); })`)(rod,rows),[rod,rows]);
  if(a.errors){fails.push(rod+'/'+k+' errors '+a.errors.join('|'));continue;}
  const pts=a.points.map(q=>q.st.toFixed(2)+':'+q.pi.toFixed(4));
  rows.forEach((r,i)=>{const inv=r[2]==='cut'?r[1]-r[3]:r[1]+r[3];const d=Math.abs(r[0]-rows[0][0]);const q=a.points.find(x=>Math.abs(x.st-d)<0.006);
   if(!q)fails.push(rod+'/'+k+': no point at '+d.toFixed(2));else if(Math.abs(q.pi-inv)>0.005)fails.push(rod+'/'+k+': invert at '+staText(r[0])+' '+q.pi.toFixed(4)+' sheet '+inv.toFixed(4)+' (off '+(q.pi-inv).toFixed(4)+')');
   const row=a.rows.find(x=>Math.abs(x.st-d)<0.006&&x.hub);if(row&&row.sta!==staText(r[0]))fails.push(rod+'/'+k+': station '+row.sta+' sheet '+staText(r[0]));});
  console.log(rod.padEnd(9),k.padEnd(5),'points',pts.join(' '),'| stations',a.rows.filter(x=>x.hub).map(x=>x.sta).join(' '));
 }
 await T.done(fails);})();
