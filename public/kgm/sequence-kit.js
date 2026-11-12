/* Vertical two-rail relay trainer. Contact networks are separate from their drawing. */
(function(root){
 const contact=(id,source,type='NO')=>({kind:'contact',id,source,type});
 const series=(...children)=>({kind:'series',children}),parallel=(...children)=>({kind:'parallel',children});
 const presets=[
  {id:'example',title:'그림 속 회로 · 병렬과 직렬',description:'PB1과 R2 접점을 병렬로, 그 아래 R1 접점을 직렬로 연결했어. 접점 종류는 그림만으로 확정하지 않고, 기본값을 모두 a 접점으로 두었어.',steps:['외부 릴레이 R1을 켜서 직렬 접점을 닫아 봐.','PB1을 누르는 동안 R 코일과 부하가 켜지는지 확인해.','PB1을 놓고 R2를 켜 봐. 병렬 경로로 R이 켜져.','R1을 끄면 어느 병렬 경로가 닫혀 있어도 R은 꺼져.'],buttons:[['PB1','동작']],externals:['R1','R2']},
  {id:'momentary',title:'기본 동작 · 누르는 동안 켜짐',description:'PB1의 a 접점을 통해 R 코일을 여자해. R의 a 접점이 닫히면 오른쪽 부하도 동작해.',steps:['PB1을 누르면 R 코일이 켜져.','R 접점이 닫히면서 부하가 동작해.','PB1을 놓으면 코일과 부하가 함께 꺼져.'],buttons:[['PB1','동작']],externals:[]},
  {id:'holding',title:'자기유지 · 기동과 정지',description:'기동 PB1과 R의 a 접점을 병렬로 연결했어. 정지 PB0의 b 접점은 두 경로에 공통으로 직렬 연결돼.',steps:['PB1을 잠깐 눌렀다가 놓아 봐.','R의 a 접점이 기동 버튼을 대신해서 도통을 유지해.','PB0을 누르면 공통 경로가 끊겨 R이 꺼져.','PB0을 놓아도 PB1이 눌려 있지 않다면 다시 켜지지 않아.'],buttons:[['PB1','기동'],['PB0','정지']],externals:[]},
  {id:'interlock',title:'인터록 · 두 릴레이의 상호 차단',description:'각 자기유지 경로에 상대 릴레이의 b 접점을 넣었어. 한쪽이 켜지면 다른 쪽은 기동할 수 없어.',steps:['PB1으로 R1을 기동한 뒤 버튼을 놓아 봐.','R1이 켜진 동안 PB2를 눌러도 R2는 켜지지 않아.','PB0으로 정지하고, PB2로 R2를 기동해 봐.','이제 R2의 b 접점이 R1의 기동을 차단해.'],buttons:[['PB1','R1 기동'],['PB2','R2 기동'],['PB0','공통 정지']],externals:[]}
 ];
 function build(id,{load='lamp',seriesType='NO',parallelType='NO'}={}){const preset=presets.find(p=>p.id===id);if(!preset)throw Error('Unknown sequence circuit');const loadId={lamp:'L',motor:'M',relay:'K'}[load];if(!loadId)throw Error('Unknown load');let rungs=[];
 if(id==='example')rungs=[{id:'r',label:'병렬 조건 + 직렬 조건',network:series(parallel(contact('pb1','PB1'),contact('r2','R2',parallelType)),contact('r1','R1',seriesType)),coil:'R'}];
 if(id==='momentary')rungs=[{id:'r',label:'버튼으로 코일 동작',network:contact('pb1','PB1'),coil:'R'}];
 if(id==='holding')rungs=[{id:'r',label:'정지 → 기동 / 자기유지',network:series(contact('stop','PB0','NC'),parallel(contact('start','PB1'),contact('hold','R'))),coil:'R'}];
 if(id==='interlock')rungs=[
  {id:'r1',label:'R1 자기유지 + R2 차단',network:series(contact('stop1','PB0','NC'),parallel(contact('start1','PB1'),contact('hold1','R1')),contact('lock2','R2','NC')),coil:'R1'},
  {id:'r2',label:'R2 자기유지 + R1 차단',network:series(contact('stop2','PB0','NC'),parallel(contact('start2','PB2'),contact('hold2','R2')),contact('lock1','R1','NC')),coil:'R2'}
 ];
 const loadNetwork=id==='interlock'?parallel(contact('load1','R1'),contact('load2','R2')):contact('load','R');
 rungs.push({id:'load',label:id==='interlock'?'어느 릴레이든 켜지면 동작':'R 접점으로 부하 동작',network:loadNetwork,coil:loadId,load});
 return {...preset,rungs,load,loadId};
 }
 function closed(node,values){return node.type==='NC'?!values[node.source]:Boolean(values[node.source]);}
 function conduct(node,values){return node.kind==='contact'?closed(node,values):node.kind==='parallel'?node.children.some(c=>conduct(c,values)):node.children.every(c=>conduct(c,values));}
 function settle(circuit,previous={},buttons={},externals={},power=true){const state=Object.fromEntries(circuit.rungs.map(r=>[r.coil,power&&Boolean(previous[r.coil])])),sources=Object.fromEntries([...Object.keys(buttons),...circuit.externals].map(id=>[id,power&&Boolean(buttons[id]||externals[id])]));
 if(!power)return {state:Object.fromEntries(circuit.rungs.map(r=>[r.coil,false])),values:{...sources,...Object.fromEntries(circuit.rungs.map(r=>[r.coil,false]))},power:false};
 let stable=false;for(let pass=0;pass<32;pass++){let changed=false;for(const rung of circuit.rungs){const next=conduct(rung.network,{...sources,...state});if(next!==state[rung.coil]){state[rung.coil]=next;changed=true;}}if(!changed){stable=true;break;}}
 if(!stable)throw Error('회로가 안정되지 않았어. 입력을 초기화해 줘.');
 return {state,values:{...sources,...state},power:true};
 }
 function contacts(node){return node.kind==='contact'?[node]:node.children.flatMap(contacts);}
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function measure(node){if(node.kind==='contact')return {w:128,h:78};const sizes=node.children.map(measure);return node.kind==='parallel'?{w:sizes.reduce((n,s)=>n+s.w,0)+28*(sizes.length-1),h:Math.max(...sizes.map(s=>s.h))+44}:{w:Math.max(...sizes.map(s=>s.w)),h:sizes.reduce((n,s)=>n+s.h,0)+12*(sizes.length-1)};}
 function render(circuit,result,{labels=true}={}){const {values,power}=result,sizes=circuit.rungs.map(r=>measure(r.network)),maxH=Math.max(...sizes.map(s=>s.h)),top=116,coilY=top+maxH+82,bottom=coilY+75,height=bottom+65,width=Math.max(880,sizes.reduce((n,s)=>n+Math.max(240,s.w+85),0)+130);let parts=[];
 const path=(d,on)=>`<path class="wire ${on?'flow':''}" d="${d}"/>`;
 const draw=(node,x,y,active)=>{const s=measure(node);if(node.kind==='contact'){const c=closed(node,values),on=active&&c,cy=y+s.h/2;parts.push(path(`M ${x} ${y} V ${cy-19}`,on),path(`M ${x} ${cy+19} V ${y+s.h}`,on));parts.push(`<g class="contact ${on?'energized':''}"><title>${esc(node.source)} · ${node.type==='NC'?'b 접점':'a 접점'} · ${c?'닫힘':'열림'}</title><circle class="terminal" cx="${x}" cy="${cy-19}" r="4"/><circle class="terminal" cx="${x}" cy="${cy+19}" r="4"/><path class="blade" d="M ${x} ${cy+15} L ${c?x:x+17} ${c?cy-15:cy-10}"/>${node.source.startsWith('PB')?`<path class="actuator" d="M ${x-24} ${cy-12} V ${cy+12} M ${x-24} ${cy} H ${x-10}"/>`:''}<text class="part-name" x="${x+29}" y="${cy-5}">${node.source}</text><text class="part-type" x="${x+29}" y="${cy+12}">${node.type==='NC'?'b':'a'}</text>${labels?`<text class="contact-state" x="${x+29}" y="${cy+28}">${c?'닫힘':'열림'}</text>`:''}</g>`);return;}
 if(node.kind==='series'){let cy=y;for(let i=0;i<node.children.length;i++){const child=node.children[i],m=measure(child);draw(child,x,cy,active);cy+=m.h;if(i<node.children.length-1){parts.push(path(`M ${x} ${cy} V ${cy+12}`,active));cy+=12;}}return;}
 const childSizes=node.children.map(measure);let start=x-s.w/2;const centers=childSizes.map(m=>{const cx=start+m.w/2;start+=m.w+28;return cx;});const first=centers[0],last=centers.at(-1),busY=y+16,endY=y+s.h-16;
 parts.push(path(`M ${x} ${y} V ${busY} M ${x} ${endY} V ${y+s.h}`,active));
 node.children.forEach((child,i)=>{const cx=centers[i],m=childSizes[i],on=active&&conduct(child,values);parts.push(path(`M ${x} ${busY} H ${cx} V ${y+22}`,on));draw(child,cx,y+22,on);parts.push(path(`M ${cx} ${y+22+m.h} V ${endY} H ${x}`,on));});
 for(const cy of [busY,endY])parts.push(`<circle class="junction ${active?'hot':''}" cx="${x}" cy="${cy}" r="3.5"/>`);
 };
 parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="sequence-title sequence-desc"><title id="sequence-title">${esc(circuit.title)}</title><desc id="sequence-desc">위쪽 전원선과 아래쪽 귀로 사이에 접점과 코일을 세로로 배치한 회로. ${power?'전원 켜짐':'전원 꺼짐'}. ${circuit.rungs.map(r=>`${r.coil} ${values[r.coil]?'ON':'OFF'}`).join(', ')}.</desc><style>
 .wire{fill:none;stroke:#666671;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.wire.flow{stroke:#75c79a;stroke-width:3}.rail{fill:none;stroke-width:4;stroke-linecap:round}.supply{stroke:${power?'#dd7770':'#62626c'}}.return{stroke:${power?'#73b5dc':'#62626c'}}.rail-label{font:600 12px system-ui,sans-serif;fill:#a3a3ae}.part-name{font:600 14px system-ui,sans-serif;fill:#e2e2ea}.part-type{font:11px system-ui,sans-serif;fill:#aaaab4}.contact-state{font:10px system-ui,sans-serif;fill:#9898a4}.terminal{fill:#161618;stroke:#9999a5;stroke-width:2}.blade{fill:none;stroke:#c5c5d0;stroke-width:2.5;stroke-linecap:round}.actuator{fill:none;stroke:#888894;stroke-width:1.5}.energized .blade,.energized .terminal{stroke:#75c79a}.junction{fill:#666671}.junction.hot{fill:#75c79a}.coil{fill:#161618;stroke:#8c8c98;stroke-width:2.3}.coil.on{fill:#29432e;stroke:#81be93}.coil-name{font:600 16px system-ui,sans-serif;fill:#e4f0e6}.coil-status{font:11px ui-monospace,monospace;fill:#9696a1}.coil-status.on{fill:#9ed6ad}.branch-label{font:11px system-ui,sans-serif;fill:#a3a3af}.rail-dot{fill:${power?'#dd7770':'#62626c'}}.cross{fill:none;stroke:#a9c9b1;stroke-width:2}
 </style><text class="rail-label" x="45" y="34">전원선</text><path class="rail supply" d="M 45 56 H ${width-45}"/><path class="rail return" d="M 45 ${bottom} H ${width-45}"/><text class="rail-label" x="45" y="${bottom+30}">귀로</text>`);
 const widths=sizes.map(s=>Math.max(240,s.w+85)),total=widths.reduce((a,b)=>a+b,0),offset=(width-total)/2;let acc=offset;
 circuit.rungs.forEach((r,i)=>{const x=acc+widths[i]/2;acc+=widths[i];const active=power&&conduct(r.network,values),size=sizes[i];parts.push(`<text class="branch-label" x="${x+18}" y="91" text-anchor="start">${esc(r.label)}</text>`,path(`M ${x} 56 V ${top}`,active),`<circle class="rail-dot" cx="${x}" cy="56" r="4"/>`);draw(r.network,x,top,active);parts.push(path(`M ${x} ${top+size.h} V ${coilY-24}`,active),path(`M ${x} ${coilY+24} V ${bottom}`,active));parts.push(`<circle class="coil ${values[r.coil]?'on':''}" cx="${x}" cy="${coilY}" r="24"/>`);if(r.load==='lamp')parts.push(`<path class="cross" d="M ${x-15} ${coilY-15} L ${x+15} ${coilY+15} M ${x+15} ${coilY-15} L ${x-15} ${coilY+15}"/>`);else parts.push(`<text class="coil-name" x="${x}" y="${coilY+6}" text-anchor="middle">${r.coil}</text>`);parts.push(`<text class="part-name" x="${x+35}" y="${coilY-3}">${r.coil}</text><text class="part-type" x="${x+35}" y="${coilY+14}">${r.load?{lamp:'램프',motor:'모터 표시',relay:'릴레이'}[r.load]:'릴레이 코일'}</text><text class="coil-status ${values[r.coil]?'on':''}" x="${x}" y="${coilY+44}" text-anchor="middle">${values[r.coil]?'ON':'OFF'}</text>`);});
 parts.push('</svg>');return parts.join('');
 }
 const api={presets,build,closed,conduct,settle,contacts,measure,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SequenceKit=api;
})(globalThis);
