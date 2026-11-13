const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
function app(saved,look){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'http://localhost/ysb5397/compile-please/',runScripts:'outside-only'});
 dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
 if(saved)dom.window.localStorage.setItem('java-inspector:v1',saved);
 if(look)dom.window.localStorage.setItem('java-inspector:look:v1',look);
 for(const file of ['cases.js','curriculum.js','visitors.js','comparison.js','handbook.js','game.js'])dom.window.eval(fs.readFileSync(path.join(root,file),'utf8'));
 const $=id=>dom.window.document.getElementById(id);
 const read=()=>JSON.parse(dom.window.localStorage.getItem('java-inspector:v1'));
 return {dom,$,read};
}
function fixedApp(ids=['t2','t1']){const a=app(JSON.stringify({deck:ids,topics:['types'],index:0,answers:[],pending:false,practice:false}));a.$('resume').click();return a;}
function inspect(a,ruleId,documentId){
 const state=a.read(),c=a.dom.window.JavaInspectorData.cases.find(c=>c.id===state.deck[state.index]);
 const rule=a.dom.window.JavaComparison.ruleFor(ruleId||c.comparison.ruleIds[0]);
 a.dom.window.JavaHandbook.reveal(rule.id);
 a.dom.window.document.querySelector(`[data-compare-document="${documentId||'code:'+c.comparison.lines[0]}"]`).click();
 a.dom.window.document.querySelector(`[data-compare-rule="${rule.id}"]`).click();a.$('compare').click();
}
test('multiple topic selection controls the deck and empty selection blocks starting',()=>{
 const {dom,$,read}=app();const boxes=[...dom.window.document.querySelectorAll('#topics input')];
 boxes.forEach(b=>b.click());assert.equal($('start').disabled,true);
 const chosen=['types','objects'];boxes.filter(b=>chosen.includes(b.value)).forEach(b=>b.click());$('start').click();
 assert.equal(read().deck.length,dom.window.JavaInspectorData.cases.filter(c=>chosen.includes(c.topic)).length);assert.deepEqual(read().topics,chosen);dom.window.close();
});
test('a full shift scores once per case, restores a stamped document, and supports wrong-answer practice',()=>{
 let a=app();a.$('start').click();const deck=a.read().deck;let wrong=false,wrongId;
 for(let i=0;i<deck.length;i++){
  const c=a.dom.window.JavaInspectorData.cases.find(c=>c.id===deck[i]);
  if(!c.valid&&!wrong){a.$('approve').click();wrong=true;wrongId=c.id;}else{if(!c.valid)inspect(a);a.$(c.valid?'approve':'deny').click();}
  a.$('approve').click(); // A second verdict must not score the document again.
  assert.equal(a.read().answers.length,i+1);
  if(i===0||i===deck.length-1){const saved=a.dom.window.localStorage.getItem('java-inspector:v1');a.dom.window.close();a=app(saved);a.$('resume').click();assert.equal(a.$('code').textContent,c.code);assert.equal(a.$('stamp').hidden,false);}
  a.$('next').click();
 }
 assert.equal(a.$('report').hidden,false);assert.ok(a.$('report').textContent.includes(Math.round((deck.length-1)/deck.length*100)+'%'));
 a.$('retry').click();assert.equal(a.read().deck.length,1);assert.equal(a.read().deck[0],wrongId);
 const c=a.dom.window.JavaInspectorData.cases.find(c=>c.id===a.read().deck[0]);if(!c.valid)inspect(a);a.$(c.valid?'approve':'deny').click();a.$('next').click();assert.match(a.$('report').textContent,/100%/);a.dom.window.close();
});
test('invalid saved progress is ignored without preventing a new game',()=>{
 const a=app(JSON.stringify({deck:['missing'],index:99,answers:[]}));assert.equal(a.$('resume').hidden,true);a.$('start').click();assert.equal(a.read().deck.length,a.dom.window.JavaInspectorData.cases.length);a.dom.window.close();
});
test('proven rejection and mistaken approval retain distinct verdicts and reset on the next case',()=>{
 const a=fixedApp(['t2','t3']);inspect(a);a.$('deny').click();
 assert.equal(a.$('stamp').querySelector('img').alt,'반려');
 assert.match(a.$('stamp').querySelector('img').src,/stamp-reject-v1\.png$/);
 assert.equal(a.$('feedback').classList.contains('wrong'),false);
 assert.equal(a.$('deny').getAttribute('aria-pressed'),'true');
 assert.equal(a.$('approve').disabled,true);assert.equal(a.$('deny').disabled,true);
 assert.equal(a.$('stampStatus').textContent,'반려 처리 완료');
 a.$('next').click();assert.equal(a.$('stamp').hidden,true);assert.equal(a.$('stampPlaceholder').hidden,false);
 assert.equal(a.$('approve').disabled,false);assert.equal(a.$('deny').getAttribute('aria-pressed'),'false');
 a.$('approve').click();assert.match(a.$('stamp').querySelector('img').src,/stamp-approve-v1\.png$/);
 assert.equal(a.$('feedback').classList.contains('wrong'),true);a.dom.window.close();
});
test('image load and error events switch between the artwork and readable text fallback',()=>{
 const a=app();a.$('start').click();a.$('approve').click();
 const img=a.$('stamp').querySelector('img');
 img.dispatchEvent(new a.dom.window.Event('load'));assert.equal(a.$('stamp').classList.contains('asset-ready'),true);
 img.dispatchEvent(new a.dom.window.Event('error'));assert.equal(a.$('stamp').classList.contains('asset-ready'),false);
 assert.equal(a.$('stamp').classList.contains('asset-failed'),true);assert.equal(a.$('stamp').querySelector('.stamp-fallback').textContent,'승인');
 for(const image of a.dom.window.document.querySelectorAll('.tool-visual img, .stamp img'))assert.equal(fs.existsSync(path.join(root,image.getAttribute('src'))),true);
 const tool=a.$('deny').querySelector('img');tool.dispatchEvent(new a.dom.window.Event('error'));
 assert.equal(tool.parentElement.classList.contains('asset-failed'),true);assert.equal(a.$('deny').getAttribute('aria-label'),'반려');a.dom.window.close();
});
function motionHarness(a,reduced=false){
 const timers=new Map(),animations=[];let id=0;
 a.dom.window.matchMedia=()=>({matches:reduced});
 a.dom.window.setTimeout=(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key;};
 a.dom.window.clearTimeout=key=>timers.delete(key);
 a.dom.window.Element.prototype.animate=function(frames,options){const animation={frames,options,cancel(){this.cancelled=true;},onfinish:null};animations.push(animation);return animation;};
 for(const img of a.dom.window.document.querySelectorAll('.tool-visual img'))img.dispatchEvent(new a.dom.window.Event('load'));
 return {timers,animations};
}
test('animation saves and locks the decision, stamps at impact, and reveals feedback after retraction',()=>{
 const a=app();const h=motionHarness(a);a.$('start').click();a.$('approve').click();
 assert.equal(a.read().answers.length,1);assert.equal(a.read().pending,true);
 assert.equal(a.$('play').getAttribute('aria-busy'),'true');assert.equal(a.$('stamp').hidden,true);assert.equal(a.$('feedback').hidden,true);
 assert.equal(a.$('approve').disabled,true);assert.equal(a.$('deny').disabled,true);
 a.$('deny').click();assert.equal(a.read().answers.length,1);
 const impact=[...h.timers.values()].find(t=>t.ms===440);impact.fn();
 assert.equal(a.$('stamp').hidden,false);assert.equal(a.$('feedback').hidden,true);
 assert.equal(a.$('stamp').querySelector('img').alt,'승인');
 h.animations[0].onfinish();
 assert.equal(a.$('feedback').hidden,false);assert.equal(a.$('play').hasAttribute('aria-busy'),false);
 assert.equal(a.dom.window.document.querySelector('.stamp-flight'),null);assert.equal(h.timers.size,0);
 assert.equal(a.dom.window.document.activeElement,a.$('next'));a.dom.window.close();
});
test('leaving during a stamp cancels transient motion while keeping a restorable verdict',()=>{
 const a=fixedApp();const h=motionHarness(a);inspect(a);a.$('deny').click();const stale=[...h.timers.values()].map(t=>t.fn);
 a.$('backToSetup').click();assert.equal(h.animations[0].cancelled,true);assert.equal(a.dom.window.document.querySelector('.stamp-flight'),null);
 for(const callback of stale)callback();assert.equal(a.$('welcome').hidden,false);
 a.$('resume').click();assert.equal(a.$('stamp').querySelector('img').alt,'반려');assert.equal(a.$('feedback').hidden,false);
 assert.equal(h.animations.length,1);assert.equal(a.read().answers.length,1);a.dom.window.close();
});
test('reduced motion skips the flight and timing, and a missing finish event still completes',()=>{
 const a=app();const reduced=motionHarness(a,true);a.$('start').click();a.$('approve').click();
 assert.equal(reduced.animations.length,0);assert.equal(a.$('feedback').hidden,false);a.dom.window.close();
 const b=fixedApp();const h=motionHarness(b);inspect(b);b.$('deny').click();
 [...h.timers.values()].find(t=>t.ms===900).fn();
 assert.equal(b.$('stamp').querySelector('img').alt,'반려');assert.equal(b.$('feedback').hidden,false);
 assert.equal(b.dom.window.document.querySelector('.stamp-flight'),null);b.dom.window.close();
});
test('visitor parts are deterministic, valid, varied, and unrelated to inspection outcomes',()=>{
 const a=app(),api=a.dom.window.JavaVisitor;
 const seen=new Set();for(let i=0;i<100;i++){const c=api.createConfig(713,`person-${i}`);assert.equal(JSON.stringify(api.normalizeConfig(c)),JSON.stringify(c));seen.add(JSON.stringify(c));}
 assert.ok(seen.size>90);assert.equal(JSON.stringify(api.createConfig(713,'t1')),JSON.stringify(api.createConfig(713,'t1')));
 assert.notEqual(JSON.stringify(api.createConfig(713,'t1')),JSON.stringify(api.createConfig(714,'t1')));
 assert.equal(api.normalizeConfig({hair:'unknown'}),null);a.dom.window.close();
});
test('the same applicant retains all parts after judgment and after restoring saved progress',()=>{
 let a=app();a.$('start').click();const before=a.$('visitorRig').dataset.look;
 a.$('approve').click();assert.equal(a.$('visitorRig').dataset.look,before);assert.equal(a.$('visitorRig').classList.contains('is-nodding'),true);
 const saved=a.dom.window.localStorage.getItem('java-inspector:v1');a.dom.window.close();a=app(saved);a.$('resume').click();
 assert.equal(a.$('visitorRig').dataset.look,before);a.$('next').click();assert.equal(a.$('visitorRig').classList.contains('is-entering'),true);a.dom.window.close();
});
test('the appearance workshop is absent and obsolete pinned looks no longer override visitors',()=>{
 const a=app();assert.equal(a.$('appearanceLab'),null);a.$('start').click();
 const config=JSON.parse(a.$('visitorRig').dataset.look),saved=a.dom.window.localStorage.getItem('java-inspector:v1');a.dom.window.close();
 const look={...config,hair:config.hair==='long'?'crop':'long'};
 const b=app(saved,JSON.stringify(look));b.$('resume').click();assert.equal(b.$('visitorRig').dataset.look,JSON.stringify(config));b.dom.window.close();
});
test('every case has real rule IDs and line anchors, and only relevant pairs can determine a result',()=>{
 const a=app(),api=a.dom.window.JavaComparison;
 assert.equal(new Set(api.rules.map(r=>r.id)).size,api.rules.length);
 for(const c of a.dom.window.JavaInspectorData.cases){
  assert.equal(c.claim===c.actualOutput,c.valid);
  for(const line of c.comparison.lines)assert.ok(api.documentFor(c,`code:${line}`));
  for(const id of c.comparison.ruleIds)assert.ok(api.ruleFor(id));
  for(const rule of api.rules){const result=api.compare(c,`code:${c.comparison.lines[0]}`,rule.id);assert.equal(result.status,c.comparison.ruleIds.includes(rule.id)?c.valid?'match':'contradiction':'unrelated');}
  assert.equal(api.compare(c,'code:999',c.comparison.ruleIds[0]).status,'unrelated');
  assert.equal(api.compare(c,'claim',c.comparison.ruleIds[0]).status,c.valid?'match':'contradiction');
 }
 a.dom.window.close();
});
test('an unproven rejection is blocked for clicks and keyboard input without changing the score',()=>{
 const a=fixedApp();assert.equal(a.$('deny').disabled,true);a.$('deny').click();
 a.dom.window.document.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'d',bubbles:true}));
 assert.equal(a.read().answers.length,0);assert.equal(a.read().index,0);
 inspect(a,'objects-this','claim');assert.match(a.$('comparisonResult').textContent,/비교 대상 아님/);assert.equal(a.$('deny').disabled,true);
 assert.equal(a.read().answers.length,0);a.dom.window.close();
});
test('matching evidence never unlocks rejection and irrelevant lines do not disclose results',()=>{
 const a=fixedApp(['t1']);inspect(a);assert.match(a.$('comparisonResult').textContent,/일치/);assert.equal(a.$('deny').disabled,true);assert.equal(a.$('evidence').hidden,true);a.dom.window.close();
 const b=fixedApp(['f1']);inspect(b,'flow-for','code:5');assert.match(b.$('comparisonResult').textContent,/비교 대상 아님/);assert.equal(b.$('deny').disabled,true);b.dom.window.close();
});
test('confirmed evidence survives selection changes and reload, then resets for the next applicant',()=>{
 let a=fixedApp();inspect(a);assert.equal(a.$('deny').disabled,false);assert.equal(a.$('evidence').hidden,false);
 const proof=JSON.stringify(a.read().inspection.proof);a.$('clearComparison').click();assert.equal(a.$('deny').disabled,false);assert.equal(JSON.stringify(a.read().inspection.proof),proof);
 const saved=a.dom.window.localStorage.getItem('java-inspector:v1');a.dom.window.close();a=app(saved);a.$('resume').click();
 assert.equal(a.$('deny').disabled,false);assert.equal(a.$('evidence').hidden,false);
 a.$('deny').click();assert.equal(a.read().answers[0].evidence.caseId,'t2');
 a.$('next').click();assert.equal(a.$('deny').disabled,true);assert.equal(a.$('evidence').hidden,true);assert.equal(a.$('compare').disabled,true);a.dom.window.close();
});
test('stale or fabricated saved evidence cannot unlock a valid application',()=>{
 const a=fixedApp();inspect(a);const s=a.read();s.deck=['t1'];s.inspection.caseId='t1';
 a.dom.window.close();let b=app(JSON.stringify(s));b.$('resume').click();assert.equal(b.$('deny').disabled,true);b.dom.window.close();
 const c=fixedApp(['t1']);const forged=c.read();forged.inspection={fingerprint:c.dom.window.JavaComparison.fingerprint(c.dom.window.JavaInspectorData.cases.find(x=>x.id==='t1')),checked:true,proof:{documentId:'claim',ruleId:'types-division'}};c.dom.window.close();
 b=app(JSON.stringify(forged));b.$('resume').click();assert.equal(b.$('deny').disabled,true);assert.equal(b.$('evidence').hidden,true);b.dom.window.close();
});
test('the entire handbook is available before work and help blocks verdict shortcuts',()=>{
 const a=app();a.$('openHandbook').click();assert.equal(a.$('handbookDialog').open,true);
 assert.equal(a.$('bookTopic').options.length,12);assert.match(a.$('handbookContent').textContent,/JVM/);
 a.$('bookTopic').value='arrays';a.$('bookTopic').dispatchEvent(new a.dom.window.Event('change'));
 assert.match(a.$('handbookContent').textContent,/깊은 복사/);assert.equal(a.$('useRule').disabled,true);
 a.$('closeHandbook').click();a.$('start').click();a.$('openHandbookPlay').click();
 assert.equal(a.$('helpDialog').open,true);
 a.dom.window.document.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'a',bubbles:true}));
 assert.equal(a.read().answers.length,0);a.$('closeHelp').click();a.dom.window.close();
});
test('concept and compile-error applications both use evidence-gated rejection and survive reload',()=>{
 for(const id of ['b1','v3']){
  let a=fixedApp([id]);assert.equal(a.$('deny').disabled,true);
  if(id==='b1'){assert.match(a.$('documentLabel').textContent,/개념 심사/);assert.match(a.$('paperFoot').textContent,/실행 출력이 아니라/);}
  inspect(a);assert.equal(a.$('deny').disabled,false);
  const saved=a.dom.window.localStorage.getItem('java-inspector:v1');a.dom.window.close();
  a=app(saved);a.$('resume').click();assert.equal(a.$('deny').disabled,false);
  a.$('deny').click();assert.equal(a.$('feedback').classList.contains('wrong'),false);a.$('next').click();assert.match(a.$('report').textContent,/100%/);a.dom.window.close();
 }
});
test('browsing, symbols and bookmarks do not select evidence or unlock rejection',()=>{
 const a=fixedApp();
 a.dom.window.document.querySelector('[data-symbol="논리"]').click();
 assert.equal(a.$('bookTopic').value,'all');assert.ok(a.$('ruleList').textContent.includes('단락 평가'));
 assert.equal(a.read().inspection.ruleId,null);assert.equal(a.$('deny').disabled,true);
 a.$('bookmarkRule').click();assert.equal(a.$('bookmarkRule').getAttribute('aria-pressed'),'true');
 a.$('bookmarkFilter').click();assert.match(a.$('bookCount').textContent,/1개 조항/);
 assert.equal(a.read().inspection.ruleId,null);a.dom.window.close();
});
test('the same handbook filters return for different cases and empty searches recover',()=>{
 const list=[];
 for(const id of ['t1','h4']){
  const a=fixedApp([id]);a.$('bookSearch').value='clone';a.$('bookSearch').dispatchEvent(new a.dom.window.Event('input'));
  list.push(a.$('ruleList').textContent);assert.equal(a.read().inspection.ruleId,null);
  a.$('bookSearch').value='no-such-rule-xyz';a.$('bookSearch').dispatchEvent(new a.dom.window.Event('input'));
  assert.match(a.$('bookCount').textContent,/0개/);assert.equal(a.$('useRule').disabled,true);
  a.$('resetBook').click();assert.match(a.$('bookCount').textContent,/48개/);a.dom.window.close();
 }
 assert.equal(list[0],list[1]);
});
test('feedback and rulebook switches preserve the viewed rule, query, bookmark and scroll',()=>{
 const a=fixedApp();inspect(a);a.$('deny').click();assert.equal(a.$('feedback').hidden,false);assert.equal(a.$('play').dataset.pane,'book');
 a.$('showRules').click();a.$('bookSearch').value='나눗셈';a.$('bookSearch').dispatchEvent(new a.dom.window.Event('input'));
 a.$('bookmarkRule').click();a.$('ruleBody').scrollTop=73;
 const viewed=a.dom.window.JavaHandbook.viewedId,nav=a.$('ruleList').innerHTML;
 a.$('showFeedback').click();assert.equal(a.$('rulebook').hidden,true);
 a.$('showRules').click();assert.equal(a.$('bookSearch').value,'나눗셈');assert.equal(a.dom.window.JavaHandbook.viewedId,viewed);
 assert.equal(a.$('ruleList').innerHTML,nav);assert.equal(a.$('ruleBody').scrollTop,73);assert.equal(a.$('bookmarkRule').getAttribute('aria-pressed'),'true');
 assert.equal(a.$('code').textContent,a.dom.window.JavaInspectorData.cases.find(c=>c.id==='t2').code);a.dom.window.close();
});
test('handbook preferences restore independently of work progress',()=>{
 const a=app();a.$('openHandbook').click();a.dom.window.JavaHandbook.reveal('arrays-deep');a.$('bookmarkRule').click();
 a.$('bookSearch').value='clone';a.$('bookSearch').dispatchEvent(new a.dom.window.Event('input'));
 const savedBook=a.dom.window.localStorage.getItem('compile-please:handbook:v1');a.dom.window.close();
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'http://localhost/ysb5397/compile-please/',runScripts:'outside-only'});
 dom.window.localStorage.setItem('compile-please:handbook:v1',savedBook);dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
 for(const f of ['cases.js','curriculum.js','visitors.js','comparison.js','handbook.js','game.js'])dom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));
 assert.equal(dom.window.document.getElementById('bookSearch').value,'clone');
 assert.equal(dom.window.document.querySelector('[data-read-rule="arrays-deep"]').textContent.includes('★'),true);dom.window.close();
});
