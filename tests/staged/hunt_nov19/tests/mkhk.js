const fs=require('fs');const {addHooks}=require(require('path').resolve(__dirname,'../../../runner/hooks.js'));
const [,,i,o]=process.argv;const r=addHooks(fs.readFileSync(i,'utf8'));console.log(r.warnings);fs.writeFileSync(o,r.html);
