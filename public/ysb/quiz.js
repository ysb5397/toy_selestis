/* Exact two-level SOP minimization for 2–4 variables. */
(function(root){
const bits=(v,n)=>v.toString(2).padStart(n,'0');
function solve(n,ms){
 const target=ms.reduce((a,m)=>a|1<<m,0); if(!target)return {terms:['0'],patterns:[],literals:0};
 const cubes=[];
 function walk(p){if(p.length<n){for(const c of ['0','1','-'])walk(p+c);return;}
 let mask=0;for(let m=0;m<2**n;m++)if([...p].every((c,i)=>c==='-'||c===bits(m,n)[i]))mask|=1<<m;
 if(mask&&(mask&target)===mask)cubes.push({p,mask,l:[...p].filter(c=>c!=='-').length});}
 walk('');const primes=cubes.filter(c=>!cubes.some(d=>c!==d&&c.mask!==d.mask&&(c.mask&d.mask)===c.mask));
 let best=null;const seen=new Map();
 function search(covered,chosen,lits){if(covered===target){if(!best||chosen.length<best.length||chosen.length===best.length&&lits<best.lits){best=chosen.slice();best.lits=lits;}return;}
 if(best&&chosen.length>=best.length)return;
 const prev=seen.get(covered);if(prev&&(prev[0]<chosen.length||prev[0]===chosen.length&&prev[1]<=lits))return;seen.set(covered,[chosen.length,lits]);
 let opts=null;for(const m of ms)if(!(covered&1<<m)){const o=primes.filter(c=>c.mask&1<<m);if(!opts||o.length<opts.length)opts=o;}
 for(const c of opts)search(covered|c.mask,[...chosen,c],lits+c.l);
 }search(0,[],0);
 const patterns=best.map(c=>c.p).sort();return {patterns,terms:patterns.map(term),literals:best.lits};
}
function term(p){return [...p].map((c,i)=>c==='-'?'':(c==='0'?'^':'')+String.fromCharCode(65+i)).join('')||'1';}
function parse(s,n){
 s=s.toUpperCase().replace(/\s/g,'').replace(/[·*]/g,'');
 if(!s)throw Error('계산식을 먼저 입력해 줘.');
 if(s==='0'||s==='1')return {mask:s==='0'?0:(1<<(2**n))-1,count:s==='0'?0:1,literals:0,canonical:false};
 const terms=s.split('+');let mask=0,literals=0;let canonical=true;
 for(const t of terms){if(!t)throw Error('+ 사이에 AND 항을 입력해 줘.');let pos=0;const values=new Map();
 while(pos<t.length){let neg=false;if(t[pos]==='^'){neg=true;pos++;}const c=t[pos++];if(!c||c<'A'||c>=String.fromCharCode(65+n))throw Error(`A~${String.fromCharCode(64+n)}와 ^, +만 사용할 수 있어.`);if(values.has(c))throw Error('한 AND 항에 같은 변수를 두 번 넣을 수 없어.');values.set(c,neg?0:1);literals++;}
 canonical&&=values.size===n;
 for(let m=0;m<2**n;m++)if([...values].every(([c,v])=>Number(bits(m,n)[c.charCodeAt(0)-65])===v))mask|=1<<m;
 }return {mask,count:terms.length,literals,canonical};
}
const api={bits,solve,term,parse};if(typeof module!=='undefined')module.exports=api;else root.KLogic=api;
})(globalThis);

const $=id=>document.getElementById(id),{bits,solve,term,parse}=KLogic;
let n=3,ms=[],answer,truth=[],map=[],count=0,revealed=false,graded=false,activeGroup=-1,stats={solved:0,perfect:0};
try{stats=JSON.parse(localStorage.getItem('kmap-stats'))||stats;}catch{}
function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function format(s){return esc(s.toUpperCase()).replace(/\^([A-Z])/g,'<span class="not">$1</span>').replace(/\+/g,' + ');}
function updateStats(){$('stats').textContent=`채점한 문제 ${stats.solved} · 전체 정답 ${stats.perfect}`;}
function inputLabel(m){return [...bits(m,n)].map((b,i)=>`${'ABCD'[i]}=${b}`).join(', ');}
function start(custom){n=Number($('variables').value);ms=custom??Array.from({length:2**n},(_,i)=>i).filter(()=>Math.random()<.5);if(!custom&&(ms.length===0||ms.length===2**n))ms=[0,1];answer=solve(n,ms);truth=Array(2**n).fill(null);map=Array(2**n).fill(null);count++;revealed=false;graded=false;activeGroup=-1;$('feedback').innerHTML='';$('solution').hidden=true;$('canonical').value='';$('minimal').value='';preview();const vars='ABCD'.slice(0,n);$('question').textContent=`F(${[...vars].join(', ')})를 완성해 봐`;$('problemInstruction').textContent=`출력이 1인 입력 조합 · 왼쪽부터 ${[...vars].join(', ')} 순서로 읽어.`;$('givenInputs').innerHTML=ms.length?ms.map(m=>`<span class="input-chip" title="${inputLabel(m)}">${bits(m,n)}</span>`).join(''):'<span class="input-chip">없음 · 모든 출력이 0</span>';$('problemNum').textContent=`PROBLEM ${String(count).padStart(2,'0')}`;$('custom').value=ms.map(m=>bits(m,n)).join(', ');$('custom').placeholder=n===2?'예: 00, 10':n===3?'예: 000, 010, 101, 111':'예: 0000, 0010, 1010';$('customHint').textContent=`${vars} 순서의 ${n}자리 입력을 쉼표로 구분해 줘. 비워 두면 모든 출력이 0이야.`;$('customError').textContent='';render();}
function cell(kind,m){const arr=kind==='truth'?truth:map,v=arr[m];let cls=v===null?'':v?'one':'zero';if(graded&&v!==Number(ms.includes(m)))cls+=' wrong';else if(graded)cls+=' right';if(kind==='map'&&activeGroup>=0&&answer.patterns[activeGroup]&&matches(answer.patterns[activeGroup],m))cls+=' grouped';return `<button class="cell ${cls}" data-kind="${kind}" data-m="${m}" aria-label="${kind==='map'?'카르노 맵':'진리표'} ${inputLabel(m)}, 출력 ${v===null?'미입력':v}">${v===null?'?':v}</button>`;}
function matches(p,m){return [...p].every((c,i)=>c==='-'||c===bits(m,n)[i]);}
function render(){const vars='ABCD'.slice(0,n);$('truth').innerHTML=`<thead><tr>${[...vars].map(v=>`<th scope="col">${v}</th>`).join('')}<th scope="col">F</th></tr></thead><tbody>${truth.map((_,m)=>`<tr>${[...bits(m,n)].map(b=>`<td>${b}</td>`).join('')}<td>${cell('truth',m)}</td></tr>`).join('')}</tbody>`;
 const rbits=n===4?2:1,cbits=n-rbits,gray=k=>Array.from({length:2**k},(_,i)=>i^(i>>1));
 $('mapInstruction').textContent=`왼쪽 행에서 ${vars.slice(0,rbits)}, 위쪽 열에서 ${vars.slice(rbits)} 값을 읽어. 같은 입력의 F를 진리표에서 옮기면 돼.`;
 $('kmap').innerHTML=`<thead><tr><th scope="col">${vars.slice(0,rbits)} ＼ ${vars.slice(rbits)}</th>${gray(cbits).map(c=>`<th scope="col">${bits(c,cbits)}</th>`).join('')}</tr></thead><tbody>${gray(rbits).map(r=>`<tr><th scope="row">${bits(r,rbits)}</th>${gray(cbits).map(c=>`<td>${cell('map',(r<<cbits)|c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
 $('groups').innerHTML=revealed?answer.patterns.map((p,i)=>`<button class="group-chip ${activeGroup===i?'active':''}" data-group="${i}">묶음 ${i+1} · ${format(term(p))}</button>`).join(''):'';
}
document.addEventListener('click',e=>{const c=e.target.closest('[data-kind]');if(c){const arr=c.dataset.kind==='truth'?truth:map,m=Number(c.dataset.m);arr[m]=arr[m]===null?0:arr[m]===0?1:null;graded=false;render();}const g=e.target.closest('[data-group]');if(g){activeGroup=activeGroup===Number(g.dataset.group)?-1:Number(g.dataset.group);render();}});
function preview(){for(const id of ['canonical','minimal'])$(id+'Preview').innerHTML=$(id).value?format($(id).value):'<span style="font:11px sans-serif;color:#98a18f">입력한 식이 여기에 표시돼.</span>';}
for(const id of ['canonical','minimal'])$(id).addEventListener('input',preview);
$('new').onclick=()=>start();$('variables').onchange=()=>start();$('apply').onclick=()=>{const raw=$('custom').value.trim(),width=Number($('variables').value),parts=raw?raw.split(',').map(s=>s.trim()):[];if(parts.some(s=>!new RegExp(`^[01]{${width}}$`).test(s))){$('customError').textContent=`각 입력은 0과 1로 된 ${width}자리여야 해. 예: ${bits(0,width)}, ${bits(1,width)}. 쉼표로 구분해 줘.`;return;}start([...new Set(parts.map(s=>parseInt(s,2)))].sort((a,b)=>a-b));};
$('helpToggle').onclick=()=>{$('help').hidden=!$('help').hidden;$('helpToggle').setAttribute('aria-expanded',String(!$('help').hidden));};
function evalFormula(id){try{const p=parse($(id).value,n),target=ms.reduce((a,m)=>a|1<<m,0);if(p.mask!==target){const bad=Array.from({length:2**n},(_,i)=>i).find(m=>Boolean(p.mask&1<<m)!==Boolean(target&1<<m));return {ok:false,msg:`${inputLabel(bad)}일 때 정답의 F는 ${Number(ms.includes(bad))}인데, 입력한 식의 F는 ${Number(Boolean(p.mask&1<<bad))}이야. 이 입력을 식에 넣어 다시 계산해 봐.`};}if(id==='canonical'&&ms.length>0&&(!p.canonical||p.count!==ms.length))return {ok:false,msg:'출력값은 맞아! 전개식에는 F=1인 입력마다 모든 변수가 들어간 AND 항을 하나씩 써 줘. 0인 변수에는 ^를 붙이고, 각 항은 +로 연결하면 돼.'};if(id==='minimal'&&(p.count!==answer.terms.filter(t=>t!=='0').length||p.literals!==answer.literals))return {ok:false,msg:'출력값은 맞아! 맵에서 더 크게 묶거나 겹쳐 묶어서 AND 항 수를 먼저 줄이고, 그다음 변수 사용 수를 줄여 봐.'};return {ok:true,msg:'정답! 모든 입력에서 출력이 같고, 식의 형태도 맞아.'};}catch(e){return {ok:false,msg:e.message};}}
$('check').onclick=()=>{graded=true;const result=[['진리표',truth],['카르노 맵',map]].map(([name,a])=>{const missing=a.filter(v=>v===null).length,wrong=a.filter((v,m)=>v!==null&&v!==Number(ms.includes(m))).length;return {name,ok:!missing&&!wrong,msg:missing?`아직 ${missing}칸이 비어 있어.${wrong?` 입력한 값 중 ${wrong}칸도 다시 확인해 봐.`:''}`:wrong?`${wrong}칸을 다시 확인해 봐. 표시된 칸을 수정하면 돼.`:'모든 출력값이 정확해!'};});for(const [name,id] of [['입력별 전개식','canonical'],['최소화한 식','minimal']])result.push({name,...evalFormula(id)});$('feedback').innerHTML=result.map(r=>`<div class="result ${r.ok?'':'fail'}"><strong>${r.ok?'✓':'↳'} ${r.name}</strong> · ${esc(r.msg)}</div>`).join('');if(!revealed&&!start.recorded){stats.solved++;if(result.every(r=>r.ok))stats.perfect++;start.recorded=true;try{localStorage.setItem('kmap-stats',JSON.stringify(stats));}catch{}updateStats();}render();};
const originalStart=start;start=function(custom){originalStart(custom);start.recorded=false;};
function groupingExplanation(p,i){
 const vars='ABCD'.slice(0,n),covered=ms.filter(m=>matches(p,m));
 const fixed=[...p].flatMap((c,j)=>c==='-'?[]:[`${vars[j]}는 계속 ${c}이므로 ${format((c==='0'?'^':'')+vars[j])}를 남겨.`]);
 const changed=[...p].flatMap((c,j)=>c==='-'?[vars[j]]:[]);
 return `<article class="worked-group"><h4>묶음 ${i+1} · ${covered.length}칸 → <span class="math">${format(term(p))}</span></h4><p><strong>함께 묶는 입력:</strong> ${covered.map(m=>`<code>${bits(m,n)}</code>`).join(', ')}</p><ul>${fixed.map(s=>`<li>${s}</li>`).join('')}${changed.length?`<li>${changed.join(', ')}는 묶음 안에서 0과 1이 모두 나와. 어느 값이어도 이 묶음이 1을 만들므로 식에서 빼도 돼.</li>`:'<li>한 칸짜리 묶음이므로 모든 변수를 남겨야 해.</li>'}</ul><p>${fixed.length?`남은 변수들을 AND로 연결하면 <span class="math">${format(term(p))}</span>가 돼.`:'모든 변수가 바뀌는 묶음이야. 어떤 입력이든 1이므로 묶음의 식은 상수 1이야.'}</p></article>`;
}
$('reveal').onclick=()=>{
 revealed=true;const vars='ABCD'.slice(0,n),rbits=n===4?2:1,canonical=ms.length?ms.map(m=>term(bits(m,n))).join(' + '):'0';
 const example=ms[0];
 const transfer=example===undefined?'문제에 F=1인 입력이 없으니 진리표와 맵을 모두 0으로 채우면 돼.':`예를 들어 ${inputLabel(example)}인 행은 문제에 있는 입력 ${bits(example,n)}이므로 F=1이야. 맵에서는 ${vars.slice(0,rbits)}=${bits(example,n).slice(0,rbits)} 행과 ${vars.slice(rbits)}=${bits(example,n).slice(rbits)} 열이 만나는 칸에 같은 값 1을 넣어.`;
 $('solution').hidden=false;
 $('solution').innerHTML=`<div class="card-heading"><span class="step">✓</span><h2>이 문제를 푸는 과정</h2></div>
 <div class="walkthrough"><h3>1. 입력을 읽고 두 표에 옮기기</h3><p>${transfer}</p><p>F=1인 입력은 ${ms.length?ms.map(m=>`<code>${bits(m,n)}</code>`).join(', '):'없어'}. ${ms.length===2**n?'모든 입력에서 F=1이야.':'그 외 입력은 F=0이야.'} 진리표와 맵은 배치 순서만 다르고, 같은 입력에는 같은 F가 들어가야 해.</p><button id="fill" class="secondary">정답을 표와 맵에 채우기</button>
 <h3>2. F=1인 입력을 식으로 바꾸기</h3><p>각 입력에서 0인 변수에 부정을 붙이고, 1인 변수는 그대로 써서 AND로 연결해. 이 AND 항 중 하나라도 참이면 F=1이므로 항 사이는 OR 기호 +로 이어 줘.</p>
 ${ms.length?`<div class="table-scroll"><table class="derivation"><thead><tr><th scope="col">${vars} 입력</th><th scope="col">변수 값</th><th scope="col">AND 항</th></tr></thead><tbody>${ms.map(m=>`<tr><td><code>${bits(m,n)}</code></td><td>${inputLabel(m)}</td><td class="math">${format(term(bits(m,n)))}</td></tr>`).join('')}</tbody></table></div>`:'<p>F=1인 입력이 없으므로 연결할 AND 항도 없어. 이때 식은 0이야.</p>'}
 <div class="solution-line"><strong>입력별로 풀어 쓴 전개식</strong><div class="math">F = ${format(canonical)}</div></div>
 <h3>3. 맵의 1을 묶어서 불필요한 변수 없애기</h3><p>1만 포함하는 직사각형을 1·2·4·8·16칸씩 묶어. 양 끝도 이어져 있고, 필요한 경우 같은 칸을 여러 묶음에 써도 돼. 아래는 모든 1을 덮으면서 식을 최소로 만드는 묶음의 한 가지 정답이야.</p><p>맵 아래의 <strong>묶음 버튼</strong>을 누르면 해당 칸이 강조돼. 바뀌는 변수는 빼고, 계속 0인 변수는 부정으로, 계속 1인 변수는 원래 형태로 남겨 봐.</p>
 ${answer.patterns.length?answer.patterns.map(groupingExplanation).join(''):'<p>맵에 1이 없으니 묶음도 없어. 최소식은 그대로 0이야.</p>'}
 <h3>4. 묶음에서 얻은 식을 +로 연결하기</h3><p>${answer.terms[0]==='0'?'참이 되는 입력이 없으므로 F=0이야.':answer.terms[0]==='1'?'맵 전체가 하나의 묶음이므로 F=1이야.':answer.terms.length===1?'묶음 하나로 모든 1을 덮었으므로 그 묶음의 식이 곧 최종 정답이야.':'각 묶음 중 하나에만 해당해도 F=1이므로, 묶음의 식들을 +로 연결하면 돼.'}</p>
 <div class="solution-line"><strong>최소화한 식 · AND 항 ${answer.terms[0]==='0'?0:answer.terms.length}개 / 변수 사용 ${answer.literals}회</strong><div class="math">F = ${format(answer.terms.join(' + '))}</div></div><p>정답의 묶음이나 항 순서는 달라도 괜찮아. 모든 입력에서 출력이 같고, AND 항 수와 변수 사용 수가 같은 최소 크기면 정답으로 인정해.</p></div>`;
 $('fill').onclick=()=>{truth=truth.map((_,m)=>Number(ms.includes(m)));map=[...truth];graded=false;render();};render();$('solution').scrollIntoView({behavior:'smooth',block:'nearest'});
};
updateStats();start([0,2,5,7]);
