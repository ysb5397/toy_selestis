/* Verify the repository's trusted, fixed exercises against the target JDK. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'public/ysb5397/compile-please/cases.js'),'utf8'),sandbox);
const {javaRelease,cases}=sandbox.window.JavaInspectorData;
const run=(exe,args)=>execFileSync(exe,args,{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
// java -version normally writes to stderr; capture both output streams.
const {spawnSync}=require('node:child_process');
const version=spawnSync('java',['-version'],{encoding:'utf8',timeout:15000});
if(version.error)throw version.error;
if(version.status!==0)throw Error('Could not inspect Java runtime.');
const runtimeText=version.stderr+version.stdout;
const major=Number(runtimeText.match(/version "(\d+)/)?.[1]);
if(major!==javaRelease)throw Error(`Use a JDK ${javaRelease} runtime for this check; detected ${major||'unknown'}.`);
const out=path.join(root,'outputs',`compile-please-validation-${javaRelease}`);
fs.mkdirSync(out,{recursive:true});
const sources=cases.map(c=>{
 if(!/^[a-z][a-z0-9]*$/i.test(c.id))throw Error('Invalid case identifier.');
 let declarations='',body=c.code;
 if(c.context){const marker='// main 내부',index=c.code.indexOf(marker);if(index<0)throw Error(`Missing main marker: ${c.id}`);declarations=c.code.slice(0,index);body=c.code.slice(index+marker.length);}
 const file=path.join(out,`${c.id}.java`);
 fs.writeFileSync(file,`package inspector.${c.id};\n${declarations}\nclass Probe { public static void main(String[] args) {\n${body}\n} }\n`);
 return file;
});
run('javac',['--release',String(javaRelease),'-encoding','UTF-8','-d',out,...sources]);
const results=cases.map(c=>{
 const stdout=run('java',['-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-cp',out,`inspector.${c.id}.Probe`]);
 if(stdout!==c.actualOutput)throw Error(`Case ${c.id}: comparison evidence output disagrees with JDK ${javaRelease}.`);
 if((stdout===c.claim)!==c.valid)throw Error(`Case ${c.id}: actual output ${JSON.stringify(stdout)} disagrees with its approval decision.`);
 return {id:c.id,stdout,claim:c.claim,valid:c.valid};
});
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({javaRelease,runtime:runtimeText.trim(),results},null,2)+'\n');
console.log(`${results.length}/${cases.length} exercises compiled with --release ${javaRelease} and verified on JDK ${major}.`);
