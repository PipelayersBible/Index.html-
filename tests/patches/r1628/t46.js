const fs=require('fs');const s=fs.readFileSync('/tmp/claude-0/idx28.html','utf8');
const a=s.indexOf('  function pbStakeAiParseStation('), b=s.indexOf('  function pbStakeAiLabel(');
const src=s.slice(a,b).replace(/function pbStakeAiSeg[\s\S]*?(?=  \/\/ The AI's JSON)/,'');
const F=new Function(src+';return {pbStakeAiWrittenFeet,pbStakeAiFromReply};')();
for (const w of ['F. 8 11 TW','C-3 83','F+1 90 (90 small, underlined)','C-11.20 INV','C-1 10 INV',"6'-01 1/8\"",'C 6.09','F 0.32','C-11 90 INV']) console.log(JSON.stringify(w),'=>',F.pbStakeAiWrittenFeet(w));
const r=F.pbStakeAiFromReply(JSON.stringify({is_stake:true,offset:{value:'5 / WALL / WF',conf:'high'},cut_fill:{direction:'fill',feet:8.11,as_written:'F. 8 11 TW',to:'TW',conf:'high'},stake_elevation:{feet:null,as_written:null,conf:'uncertain'}}));
console.log(JSON.stringify(r.vals), JSON.stringify(r.flags));
