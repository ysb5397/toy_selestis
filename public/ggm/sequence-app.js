window.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id),K=SequenceKit;let circuit,buttons={},externals={},power=true,result={state:{},values:{}},logs=[];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 $('preset').innerHTML=K.presets.map(p=>`<option value="${p.id}">${p.title}</option>`).join('');
 function log(text){logs.unshift({text,time:new Date().toLocaleTimeString('ko-KR',{hour12:false})});logs=logs.slice(0,12);paintLog();}
 function paintLog(){$('log').innerHTML=logs.length?logs.map(l=>`<li><time>${l.time}</time><span>${esc(l.text)}</span></li>`).join(''):'<li>버튼이나 릴레이를 조작하면 여기에 기록돼.</li>';}
 function reason(){if(!power)return '전원이 꺼져 있어. 코일과 부하는 모두 꺼지고, 자기유지도 풀려.';const active=circuit.rungs.filter(r=>result.state[r.coil]).map(r=>r.coil);if(circuit.id==='holding'&&result.state.R&&!buttons.PB1)return 'PB1을 놓았지만 R의 a 접점이 병렬 경로를 이어 줘서 자기유지 중이야.';if(circuit.id==='interlock'&&(result.state.R1||result.state.R2)){const on=result.state.R1?'R1':'R2',off=on==='R1'?'R2':'R1';return `${on}이 켜져서 ${on}의 b 접점이 열렸어. 이 접점이 ${off}의 기동 경로를 차단하고 있어.`;}if(active.length)return `${active.join(', ')} 동작 중. 초록색 경로를 위 전원선부터 아래 귀로까지 따라가 봐.`;if(circuit.id==='example')return '먼저 외부 R1·R2와 PB1을 조작해 봐. 직렬 접점과 병렬 갈래의 조건을 함께 만족해야 R이 켜져.';return '아직 도통 경로가 완성되지 않았어. 기동 버튼을 눌러 봐.';}
 function paint(){
 $('diagram').innerHTML=K.render(circuit,result,{labels:$('labels').checked});$('diagram').style.minWidth=circuit.rungs.length>2?'1050px':'750px';$('power').textContent=power?'ON':'OFF';$('power').setAttribute('aria-checked',String(power));$('powerStatus').textContent=power?'POWER ON':'POWER OFF';$('powerStatus').className=power?'live':'live off';
 for(const el of $('buttons').querySelectorAll('[data-pb]')){const on=Boolean(buttons[el.dataset.pb]);el.setAttribute('aria-pressed',String(on));el.querySelector('small').textContent=on?'누르는 중':'놓인 상태';}
 for(const el of $('externals').querySelectorAll('[data-external]')){const on=Boolean(externals[el.dataset.external]);el.setAttribute('aria-pressed',String(on));el.querySelector('b').textContent=!power?'전원 OFF':on?'여자 ON':'여자 OFF';}
 $('statusParts').innerHTML=circuit.rungs.map(r=>`<span class="part ${result.state[r.coil]?'on':''}">${r.coil} ${result.state[r.coil]?'ON':'OFF'}</span>`).join('');$('stateReason').textContent=reason();
 }
 function update(label){const prev=result.state;result=K.settle(circuit,prev,buttons,externals,power);const changes=circuit.rungs.filter(r=>Boolean(prev[r.coil])!==result.state[r.coil]).map(r=>`${r.coil} ${result.state[r.coil]?'ON':'OFF'}`);if(label)log(label+(changes.length?' → '+changes.join(', '):' · 코일 상태 유지'));paint();}
 function setButton(id,on){if(!(id in buttons)||buttons[id]===on)return;buttons[id]=on;update(`${id} ${on?'누름':'놓음'}`);}
 function releaseAll(){let changed=false;for(const id in buttons)if(buttons[id]){buttons[id]=false;changed=true;}if(changed)update('모든 PB 놓음');}
 function setup(){
 circuit=K.build($('preset').value||'example',{load:$('load').value,seriesType:$('seriesType').value,parallelType:$('parallelType').value});buttons=Object.fromEntries(circuit.buttons.map(([id])=>[id,false]));externals=Object.fromEntries(circuit.externals.map(id=>[id,false]));result={state:{},values:{}};power=true;logs=[];
 $('boardTitle').textContent=circuit.title;$('presetDescription').textContent=circuit.description;$('contactOptions').hidden=circuit.id!=='example';$('externalsSection').hidden=!circuit.externals.length;$('steps').innerHTML=circuit.steps.map(s=>`<li>${esc(s)}</li>`).join('');
 if(circuit.id==='example'&&($('seriesType').value==='NC'||$('parallelType').value==='NC'))$('steps').innerHTML='<li>접점 종류를 바꾼 상태야. a 접점은 여자하면 닫히고, b 접점은 여자하면 열리는 차이를 확인해 봐.</li><li>PB1 또는 R2 갈래가 연결되고, 직렬 R1 접점도 닫혀 있을 때 R이 켜지는지 살펴봐.</li>';
 $('buttons').innerHTML=circuit.buttons.map(([id,name])=>`<button class="pb ${id==='PB0'?'stop':''}" data-pb="${id}" aria-label="${id} ${name}" aria-pressed="false"><span class="head" aria-hidden="true"></span><span class="pb-name">${id} · ${name}<small>놓인 상태</small></span></button>`).join('');
 $('externals').innerHTML=circuit.externals.map(id=>`<button class="external" data-external="${id}" aria-pressed="false" aria-label="외부 릴레이 ${id}"><span>${id}</span><b>여자 OFF</b></button>`).join('');
 for(const el of $('buttons').querySelectorAll('[data-pb]')){const id=el.dataset.pb;
  el.addEventListener('pointerdown',e=>{if($('latchMode').checked||e.button!==0)return;e.preventDefault();el.focus();el.setPointerCapture(e.pointerId);setButton(id,true);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>{if(!$('latchMode').checked)setButton(id,false);});
  el.addEventListener('keydown',e=>{if(!$('latchMode').checked&&[' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)setButton(id,true);}});
  el.addEventListener('keyup',e=>{if(!$('latchMode').checked&&[' ','Enter'].includes(e.key)){e.preventDefault();setButton(id,false);}});
  el.addEventListener('blur',()=>{if(!$('latchMode').checked)setButton(id,false);});
  el.addEventListener('click',()=>{if($('latchMode').checked)setButton(id,!buttons[id]);});
 }
 for(const el of $('externals').querySelectorAll('[data-external]'))el.onclick=()=>{const id=el.dataset.external;externals[id]=!externals[id];update(`${id} 외부 릴레이 ${externals[id]?'ON':'OFF'}`);};
 update('회로 준비');
 }
 for(const id of ['preset','load','seriesType','parallelType'])$(id).onchange=setup;
 $('labels').onchange=paint;$('latchMode').onchange=()=>{releaseAll();$('buttonHelp').textContent=$('latchMode').checked?'한 번 클릭하면 누른 상태를 유지하고, 다시 클릭하면 놓아. 여러 버튼을 함께 누르는 상황도 시험할 수 있어.':'마우스·손가락으로 누르는 동안 동작하고, 놓으면 돌아와. 키보드는 버튼에 초점을 맞춘 뒤 Space 또는 Enter를 눌러 줘.';};
 $('power').onclick=()=>{power=!power;update(`회로 전원 ${power?'ON':'OFF'}`);};$('reset').onclick=setup;$('clearLog').onclick=()=>{logs=[];paintLog();};
 window.addEventListener('blur',()=>{if(!$('latchMode').checked)releaseAll();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!$('latchMode').checked)releaseAll();});
 $('download').onclick=()=>{const blob=new Blob([K.render(circuit,result,{labels:$('labels').checked})],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sequence-'+circuit.id+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};setup();
});
