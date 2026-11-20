const fs=require('fs');const {addHooks}=require('/home/claude/index.html-/tests/runner/hooks.js');
const [,,i,o]=process.argv;const r=addHooks(fs.readFileSync(i,'utf8'));console.log(r.warnings);fs.writeFileSync(o,r.html);
