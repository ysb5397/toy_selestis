/* Validate code cases on a real JDK 21; conceptual documents are audited separately. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),sandbox={window:{}};
for(const file of ['cases.js','curriculum.js'])vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox);
const {cases,javaRelease}=sandbox.window.JavaInspectorData;
const executable=name=>process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin',name+(process.platform==='win32'?'.exe':'')):name;
const run=(exe,args)=>{const r=spawnSync(executable(exe),args,{encoding:'utf8',timeout:20000,maxBuffer:1024*1024});if(r.error)throw r.error;if(r.signal)throw Error(`${exe}: ${r.signal}`);return r;};
const version=run('java',['-version']),runtime=version.stdout+version.stderr;
if(version.status!==0||Number(runtime.match(/version "(\d+)/)?.[1])!==javaRelease)throw Error('JAVA_HOME must point to a JDK 21 runtime.');
const compiler=run('javac',['-version']);
if(compiler.status!==0||!/^javac 21\./.test((compiler.stdout+compiler.stderr).trim()))throw Error('Use a JDK 21 compiler.');
const outputRoot=path.join(__dirname,'results');fs.mkdirSync(outputRoot,{recursive:true});
const out=fs.mkdtempSync(path.join(outputRoot,'jdk21-'));
const codeCases=cases.filter(c=>c.kind==='code');
function source(c){
 let declarations='',body=c.code;const marker='// main 내부',i=body.indexOf(marker);
 if(i>=0){declarations=body.slice(0,i);body=body.slice(i+marker.length);}
 const file=path.join(out,c.id+'.java');
 fs.writeFileSync(file,`package inspector.${c.id};\n${declarations}\nclass Probe { public static void main(String[] args) {\n${body}\n} }\n`);return file;
}
const regular=codeCases.filter(c=>c.expectedStatus==='NORMAL');
const compiled=run('javac',['--release','21','-encoding','UTF-8','-d',out,...regular.map(source)]);
if(compiled.status!==0)throw Error(compiled.stderr);
const results=[];
for(const c of codeCases){
 if(c.expectedStatus==='COMPILE_ERROR'){
  const r=run('javac',['--release','21','-encoding','UTF-8','-d',out,source(c)]);
  if(r.status===0||!r.stderr.includes('error:'))throw Error(`${c.id}: expected a source compilation error.`);
  if(c.actualOutput!=='컴파일 오류'||c.stdout!=='')throw Error(`${c.id}: invalid compile-error result.`);
  results.push({id:c.id,status:'COMPILE_ERROR',stdout:''});
 }else{
  const r=run('java',['-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-cp',out,`inspector.${c.id}.Probe`]);
  if(r.status!==0||r.stdout!==c.stdout||r.stdout!==c.actualOutput)throw Error(`${c.id}: output mismatch ${JSON.stringify(r.stdout)}; ${r.stderr}`);
  results.push({id:c.id,status:'NORMAL',stdout:r.stdout});
 }
 if(c.valid!==(c.claim===c.actualOutput))throw Error(`${c.id}: incorrect decision.`);
}
const report={javaRelease,runtime:runtime.trim(),passed:results.length,conceptualNotExecuted:cases.filter(c=>c.kind==='concept').map(c=>c.id),results};
fs.writeFileSync(path.join(outputRoot,'latest.json'),JSON.stringify(report,null,2)+'\n');
console.log(`${results.length}/${codeCases.length} code cases verified on JDK 21 (${regular.length} outputs, ${codeCases.length-regular.length} compilation errors). ${report.conceptualNotExecuted.length} conceptual documents require specification review, not Java execution.`);
