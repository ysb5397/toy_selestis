const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const publicRoot=path.resolve(__dirname,'../public');
test('every project and the gallery share PICK+O design tokens and external page assets',()=>{
 const files=['index.html','ysb/quiz.html','ysb/pick_o.html','ggm/prac_circuit.html','ggm/prac_sequence.html'];
 for(const relative of files){const html=fs.readFileSync(path.join(publicRoot,relative),'utf8');assert(html.includes('shared/theme.css'),relative);assert(html.includes('data-project='),relative);assert(!/<style\b|<script\s*>/i.test(html),relative+' must use external CSS/JS');
  for(const [,attr,target] of html.matchAll(/\b(src|href)="([^"]+)"/g)){if(!target||target.startsWith('/')||target.startsWith('#')||/^[a-z]+:/i.test(target))continue;const dest=path.resolve(path.dirname(path.join(publicRoot,relative)),target);assert(fs.existsSync(dest)||fs.existsSync(dest+'.html'),relative+': missing '+attr+'='+target);}
 }
 const theme=fs.readFileSync(path.join(publicRoot,'shared/theme.css'),'utf8');assert(theme.includes('--bg:#0b0b0c'));assert(theme.includes('--card:#161618'));assert(theme.includes('prefers-reduced-motion'));
 const projects=require('../scripts/build-catalog.cjs').collect(publicRoot);assert.equal(projects.length,4);assert(projects.some(p=>p.url==='/ysb/pick_o'&&p.author==='ysb'&&p.cover==='lotto'));assert(!projects.some(p=>p.id.includes('server/')));
});
async function engineContext(){const bundle=fs.readFileSync(path.join(publicRoot,'ysb/pick_o.js'),'utf8'),boundary=bundle.lastIndexOf('window.PICKO = window.PICKO || {};'),calls=[],storage=new Map();const context={window:{},document:{currentScript:{src:'https://toy.test/ysb/pick_o.js'}},location:{href:'https://toy.test/ysb/pick_o'},URL,AbortController,setTimeout,clearTimeout,performance,console,localStorage:{getItem:key=>storage.get(key)||null,setItem:(k,v)=>storage.set(k,v)},fetch:async(url,options)=>{calls.push({url:String(url),options});const u=new URL(url);assert.equal(u.hostname,'toy.test','initial data must stay local');const relative=decodeURIComponent(u.pathname).slice(1);return {ok:true,text:async()=>fs.readFileSync(path.join(publicRoot,relative),'utf8')};}};vm.createContext(context);vm.runInContext(bundle.slice(0,boundary),context);return {api:context.window.PICKO.engine,context,calls};}
test('PICK+O boots from packaged CSVs and reports without posting to an AI server',async()=>{
 const {api,calls}=await engineContext(),data=await api.fetchCSVData();assert(data.lotto.length>1000);assert(data.pension.length>300);assert(data.lottoCheck.isValid);assert(data.pensionCheck.isValid);assert.equal(calls.length,2);
 const report=await api.requestStatisticsReport({meta:{mode:'all'}});assert(report.success);assert(report.report.includes('당첨 가능성이나 예측 정확도가 아니에요'));assert.equal(calls.length,2);assert(calls.every(c=>!c.options?.method));
});
test('lottery generation still respects six unique 1–45 numbers and pension digit ranges',async()=>{
 const {api}=await engineContext(),data=await api.fetchCSVData(),lotto=new api.PICKTOEngine.LottoEngine(data.lotto),pension=new api.PICKTOEngine.PensionEngine(data.pension);
 for(const track of ['A','B']){
  for(const row of lotto.generate(track,10)){assert.equal(row.nums.length,6);assert.equal(new Set(row.nums).size,6);assert(row.nums.every(n=>Number.isInteger(n)&&n>=1&&n<=45));assert(Number.isFinite(Number(row.fit)));}
  for(const row of pension.generate(track,10)){assert(/^[0-9]{6}$/.test(row.code));assert(row.group>=1&&row.group<=5);assert(Number.isFinite(Number(row.fit)));}
 }
 const result=await lotto.runEnsembleSimulations('A',20);assert.equal(result.length,5);assert(result.every(r=>r.nums.length===6));
});
test('logic and relay models preserve their truth/state behavior under the new palette',()=>{
 const C=require('../public/ggm/circuit-kit.js'),S=require('../public/ggm/sequence-kit.js');
 const xor=C.presets.find(p=>p.id==='nand-xor');for(let a=0;a<2;a++)for(let b=0;b<2;b++){const r=C.evaluate(xor,{A:a,B:b});assert.equal(r.output,a^b);assert(C.render(xor,{A:a,B:b}).includes('#161618'));}
 const holding=S.build('holding');let r=S.settle(holding,{}, {PB1:true});assert(r.state.R);r=S.settle(holding,r.state,{});assert(r.state.R);r=S.settle(holding,r.state,{PB0:true});assert(!r.state.R);assert(S.render(holding,r).includes('#161618'));
});
