const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function data(){const scope={window:{}};for(const f of ['cases.js','curriculum.js','comparison.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),scope);return scope.window;}
test('eleven curriculum topics have both approval and rejection exercises',()=>{
 const {JavaInspectorData:d}=data();
 assert.equal(d.javaRelease,21);assert.equal(d.topics.length,11);
 assert.equal(new Set(d.cases.map(c=>c.id)).size,d.cases.length);
 for(const t of d.topics){const list=d.cases.filter(c=>c.topic===t.id);assert.ok(list.some(c=>c.valid),t.id);assert.ok(list.some(c=>!c.valid),t.id);assert.equal(t.rules.length,t.ruleIds.length);}
 for(const c of d.cases){assert.ok(d.topics.some(t=>t.id===c.topic));assert.equal(c.valid,c.claim===c.actualOutput);assert.ok(c.explanation);assert.ok(c.comparison.lines.length);}
});
test('concept documents never masquerade as Java execution results',()=>{
 const {JavaInspectorData:d}=data();
 for(const c of d.cases){
  if(c.kind==='concept'){assert.equal(c.expectedStatus,null);assert.equal(c.stdout,null);}
  else{assert.equal(c.kind,'code');assert.ok(['NORMAL','COMPILE_ERROR'].includes(c.expectedStatus));assert.equal(c.stdout,c.expectedStatus==='NORMAL'?c.actualOutput:'');}
 }
});
test('every registered evidence pair agrees with its decision; unrelated pairs disclose no result',()=>{
 const {JavaInspectorData:d,JavaComparison:api}=data();
 assert.equal(new Set(api.rules.map(r=>r.id)).size,api.rules.length);
 for(const c of d.cases){
  for(const id of c.comparison.ruleIds)assert.ok(api.ruleFor(id),c.id+':'+id);
  for(const n of c.comparison.lines)assert.ok(api.documentFor(c,'code:'+n),c.id+':'+n);
  for(const rule of api.rules){
   const result=api.compare(c,'claim',rule.id);
   assert.equal(result.status,c.comparison.ruleIds.includes(rule.id)?c.valid?'match':'contradiction':'unrelated',c.id+':'+rule.id);
   if(result.status==='unrelated')assert.equal('actualOutput' in result,false);
  }
 }
});
test('saved proof is recomputed and becomes invalid when a question changes',()=>{
 const {JavaInspectorData:d,JavaComparison:api}=data();
 for(const c of d.cases.filter(c=>!c.valid)){
  const selected={fingerprint:api.fingerprint(c),proof:{documentId:'claim',ruleId:c.comparison.ruleIds[0]}};
  assert.equal(api.evidence(c,selected).status,'contradiction');
  assert.equal(api.evidence({...c,claim:c.actualOutput},selected),null);
 }
});
