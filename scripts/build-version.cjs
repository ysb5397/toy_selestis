const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const clean=html=>html.replace(/<meta name="toy:build" content="[^"]*">/g,'');
function buildVersion(root) {
  const files=[];
  function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(e.name.startsWith('.')||e.isSymbolicLink())continue;const full=path.join(dir,e.name);if(e.isDirectory())walk(full);else if(e.isFile()&&e.name!=='version.json')files.push(full);}}
  walk(root);
  const pages={};
  for(const file of files.filter(f=>f.endsWith('.html'))){
    let html=clean(fs.readFileSync(file,'utf8'));
    if(!html.includes('src="/shared/runtime.js"'))html=html.replace(/<head[^>]*>/i,'$&\n<link rel="stylesheet" href="/shared/runtime.css"><script src="/shared/runtime.js" defer></script>\n');
    if(!html.includes('name="toy:state-version"'))html=html.replace(/<head[^>]*>/i,'$&<meta name="toy:state-version" content="1">');
    const schema=Number(html.match(/<meta name="toy:state-version" content="(\d+)">/)?.[1] || 1);
    if(!Number.isInteger(schema)||schema<1)throw Error(`Invalid state version: ${file}`);
    const route=('/'+path.relative(root,file).replaceAll('\\','/')).replace(/\/index\.html$/,'/').replace(/\.html$/,'').replace(/\/$/,'')||'/';
    pages[route]={schema};
    fs.writeFileSync(file,html);
  }
  const hash=createHash('sha256');
  for(const file of files){hash.update(path.relative(root,file).replaceAll('\\','/'));const data=fs.readFileSync(file);hash.update(file.endsWith('.html')?clean(data.toString()):data);}
  const release=hash.digest('hex').slice(0,20);
  for(const file of files.filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(file,'utf8');fs.writeFileSync(file,html.replace(/<head[^>]*>/i,`$&<meta name="toy:build" content="${release}">`));}
  const manifest={release,pages};fs.writeFileSync(path.join(root,'version.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
module.exports={buildVersion};
