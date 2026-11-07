const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {buildVersion}=require('../scripts/build-version.cjs');
test('release is stable across builds, changes with assets, and lists schema versions and removed routes',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'toy-version-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'index.html'),'<html><head><title>Home</title></head><body></body></html>');
 fs.writeFileSync(path.join(root,'quiz.html'),'<head><meta name="toy:state-version" content="2"></head>');
 fs.writeFileSync(path.join(root,'app.js'),'one');
 const a=buildVersion(root);assert.equal(a.pages['/quiz'].schema,2);assert.equal(buildVersion(root).release,a.release);
 fs.writeFileSync(path.join(root,'app.js'),'two');assert.notEqual(buildVersion(root).release,a.release);
 fs.unlinkSync(path.join(root,'quiz.html'));assert.equal(buildVersion(root).pages['/quiz'],undefined);
});
function harness({saved,blocked=false,latest,pathname='/quiz',savedPath=pathname}={}){
 const values=new Map(saved?[[`toy:progress:${savedPath}`,JSON.stringify(saved)]]:[]),events={},windowEvents={},nodes=[];
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>{if(blocked)throw Error('storage blocked');values.set(k,v);},removeItem:k=>values.delete(k)};
 function el(){return {children:[],append(...items){this.children.push(...items);},setAttribute(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},remove(){},focus(){}};}
 const document={hidden:false,activeElement:el(),querySelector:q=>({content:q.includes('toy:build')?'old':'1'}),createElement:()=>{const e=el();nodes.push(e);return e;},body:el(),addEventListener:(n,f)=>events[n]=f};
 const location={pathname,reload(){this.reloaded=true;},replace(url){this.redirect=url;}};
 const window={addEventListener:(n,f)=>windowEvents[n]=f};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/shared/runtime.js'),'utf8'),{window,document,location,localStorage:storage,sessionStorage:storage,Date,setTimeout,clearTimeout,setInterval(){},fetch:async()=>({ok:true,json:async()=>latest||{release:'new',pages:{'/quiz':{schema:1}}}})});
 return {runtime:window.ToyRuntime,values,location,nodes,events};
}
test('progress restores, captures subsequent edits and handles blocked storage',async()=>{
 const h=harness({saved:{schema:1,data:{answer:'A'}}});let state;
 await h.runtime.register({restore:s=>state=s,capture:()=>state});assert.equal(state.answer,'A');state.answer='B';assert(h.runtime.save());assert.equal(JSON.parse(h.values.get('toy:progress:/quiz')).data.answer,'B');
 const b=harness({blocked:true});await b.runtime.register({restore(){},capture:()=>({})});assert.equal(b.runtime.save(),false);
});
test('incompatible or invalid state returns home and only clears this project',async()=>{
 const h=harness({saved:{schema:2,data:{}}});await h.runtime.register({restore(){assert.fail();},capture:()=>({})});assert.equal(h.location.redirect,'/');assert(!h.values.has('toy:progress:/quiz'));
 const bad=harness({saved:{schema:1,data:{}}});await bad.runtime.register({restore(){throw Error('invalid');},capture:()=>({})});assert.equal(bad.location.redirect,'/');
});
test('update modal saves before reload; removed routes return home',async()=>{
 const h=harness();await h.runtime.register({restore(){},capture:()=>({answer:42})});await h.runtime.check();
 const apply=h.nodes.find(n=>n.textContent==='저장하고 업데이트');assert(apply);await apply.onclick();assert(h.location.reloaded);assert.equal(JSON.parse(h.values.get('toy:progress:/quiz')).data.answer,42);
 const removed=harness({latest:{release:'new',pages:{'/':{schema:1}}}});await removed.runtime.check();await removed.nodes.find(n=>n.textContent==='메인으로 이동').onclick();assert.equal(removed.location.redirect,'/');
});
test('storage failure keeps update modal open without losing progress',async()=>{
 const h=harness({blocked:true});await h.runtime.register({restore(){},capture:()=>({answer:42})});await h.runtime.check();await h.nodes.find(n=>n.textContent==='저장하고 업데이트').onclick();assert(!h.location.reloaded);assert(h.nodes.some(n=>n.textContent?.includes('저장하지 못했어')));
});
test('author rename moves old progress once without overwriting newer progress',async()=>{
 const h=harness({pathname:'/ysb5397/quiz',savedPath:'/ysb/quiz',saved:{schema:1,data:{answer:'old'}}});let state;
 await h.runtime.register({restore:s=>state=s,capture:()=>state});assert.equal(state.answer,'old');assert(!h.values.has('toy:progress:/ysb/quiz'));assert(h.values.has('toy:progress:/ysb5397/quiz'));
});
