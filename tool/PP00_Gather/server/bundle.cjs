const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),dir=path.join(root,'supabase/functions/gather-season2');
const map={'service.mjs':'service.mjs','engine.mjs':'engine.mjs','assets.mjs':'assets.mjs'};
for(const [from,to]of Object.entries(map)){let text=fs.readFileSync(path.join(__dirname,from),'utf8');if(from==='engine.mjs')text=text.replace("../static/js/progression.js","./progression.js");fs.writeFileSync(path.join(dir,to),text);}
fs.copyFileSync(path.join(__dirname,'../static/js/progression.js'),path.join(dir,'progression.js'));
