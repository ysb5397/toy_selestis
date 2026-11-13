/* Browsing is independent of inspection evidence and never inspects the current case. */
(() => {
'use strict';
const {topics}=window.JavaInspectorData,{rules,ruleFor}=window.JavaComparison;
const $=id=>document.getElementById(id),key='compile-please:handbook:v1';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Examples intentionally use independent values; they do not depend on a submitted case.
const cards={
 'basics-files':['.java .class javac','javac Greeting.java\n→ Greeting.class','소스와 컴파일 결과는 역할이 다릅니다.'],
 'basics-jvm':['JVM .class','Greeting.class → 해당 환경의 JVM → 실행','운영체제에 맞는 JVM과 필요한 라이브러리를 확인합니다.'],
 'basics-gc':['GC null new','Object a = new Object();\nObject b = a;\na = null;\n// b는 여전히 객체를 가리킵니다.','참조를 끊는 것과 객체의 메모리 회수 완료는 다릅니다.'],
 'basics-tools':['JDK javac java','javac Greeting.java\njava Greeting','일반적인 컴파일 후 클래스 실행의 명령 예시입니다.'],
 'types-division':['/ int double','System.out.print(13 / 4);\n// 출력: 3','음수도 0 방향으로 버립니다. -13 / 4는 -3입니다.'],
 'types-cast':['(int) (double) /','System.out.print((double) 13 / 4);\n// 출력: 3.25','변환하기 전에 어떤 연산이 끝나는지 확인합니다.'],
 'types-text':['char String \' "','char c = \'B\';\nString word = "BC";','String은 문자열 객체이며 기본형 char와 구분합니다.'],
 'types-literal':['0b 0x L F _','int n = 0x10;  // 십진수 16\nlong total = 2_000L;','리터럴 접두사·접미사와 자릿수 구분을 확인합니다.'],
 'types-bool':['boolean true false ! ==','boolean ready = 3 < 8;\nSystem.out.print(!ready);\n// 출력: false','논리값은 숫자 0이나 1로 대신하지 않습니다.'],
 'types-wrapper':['Integer int null','Integer n = 6;\nint value = n;\n// 언박싱된 정숫값은 6입니다.','null의 언박싱은 정상적인 정숫값을 만들지 않습니다.'],
 'variables-assign':['= int 변수','int n = 6;\nn = n + 2;\n// 저장된 n은 8입니다.','=는 값 저장이고 ==는 값 비교입니다.'],
 'variables-scope':['{ } 변수 범위','{ int local = 6; }\n// 이 블록 밖에서는 local을 사용할 수 없습니다.','지역 변수의 수명과 참조 대상 객체의 회수 시점을 구분합니다.'],
 'variables-init':['int boolean null 초기화','class Flag { boolean ready; }\n// 새 Flag 객체의 ready는 false입니다.','필드와 달리 지역 변수는 읽기 전에 값을 대입해야 합니다.'],
 'variables-final':['final = []','final int LIMIT = 8;\n// 이후 LIMIT에 다른 값을 대입할 수 없습니다.','final 참조여도 가리키는 객체의 내용은 바뀔 수 있습니다.'],
 'types-string':['+ String "','System.out.print("합" + 6 + 1);\n// 출력: 합61','문자열 연결이 시작된 위치와 계산 순서를 확인합니다.'],
 'types-increment':['++ --','int n = 6;\nSystem.out.print(++n);\n// 출력: 7','앞에 붙이는 증감과 뒤에 붙이는 증감을 구분합니다.'],
 'types-remainder':['+ - * / % +=','int n = 14 % 4;\n// n은 나머지 2입니다.','%는 몫을 구하는 연산자가 아닙니다.'],
 'flow-logic':['&& || ++ !','int n = 6;\nboolean b = true || (++n > 0);\n// n은 그대로 6입니다.','오른쪽을 평가하지 않으면 오른쪽의 증감도 실행하지 않습니다.'],
 'operators-order':['+ - * / % = == ( )','System.out.print((1 + 3) * 2);\n// 출력: 8','괄호를 먼저 계산하고 연산자 우선순위를 적용합니다.'],
 'operators-ternary':['? :','int n = 6;\nSystem.out.print(n > 4 ? "큼" : "작음");\n// 출력: 큼','선택되지 않은 쪽의 식은 실행하지 않습니다.'],
 'operators-bit':['& | ^ << >>','System.out.print(5 & 3);\n// 101 & 011 → 001, 출력: 1','비트 연산 &와 단락 평가 &&는 다릅니다.'],
 'flow-if':['if else >= <=','int n = 6;\nif (n > 4) System.out.print("A");\nelse System.out.print("B");\n// 출력: A','else if 사슬에서는 처음 참인 블록 하나만 실행합니다.'],
 'conditions-switch':['switch case break ->','switch (2) {\n case 2: System.out.print("둘"); break;\n default: System.out.print("기타");\n}\n// 출력: 둘','콜론 형식에서 break가 빠지면 다음 case 문장으로 이어질 수 있습니다.'],
 'flow-for':['for < <= ++ +=','for (int i = 0; i < 2; i++) {\n    System.out.print(i);\n}\n// 출력: 01','조건의 경계값과 증감식이 실행되는 순서를 확인합니다.'],
 'flow-do':['while do','int n = 1;\nwhile (n < 3) { n++; }\n// 반복 종료 후 n은 3입니다.','do-while은 조건을 검사하기 전에 본문을 한 번 실행합니다.'],
 'flow-jump':['continue break for','for (int i = 0; i < 3; i++) {\n    if (i == 1) continue;\n    System.out.print(i);\n}\n// 출력: 02','continue는 현재 회차를, break는 반복 자체를 끝냅니다.'],
 'flow-each':['for : []','int[] a = {3, 5};\nfor (int value : a) { System.out.print(value); }\n// 출력: 35','반복 변수는 인덱스가 아니라 요소의 값입니다.'],
 'arrays-index':['[] new length','int[] a = {3, 5, 7};\nSystem.out.print(a[0]);\n// 출력: 3','마지막으로 사용할 수 있는 인덱스는 length - 1입니다.'],
 'arrays-matrix':['[][] length','int[][] a = {{3}, {5, 7}};\nSystem.out.print(a[1].length);\n// 출력: 2','행 수와 각 행의 길이는 별개입니다.'],
 'objects-ref':['[] = 참조','int[] a = {3};\nint[] b = a;\n// a와 b는 같은 배열을 가리킵니다.','참조 대입은 새 배열을 만드는 복사가 아닙니다.'],
 'arrays-shallow':['clone [] 얕은','int[] a = {3};\nint[] b = a.clone();\n// 정수 요소를 담은 새 배열입니다.','2차원 배열의 clone은 바깥 배열만 복사하여 행을 공유합니다.'],
 'arrays-deep':['clone [][] 깊은','int[][] a = {{3}, {5}};\nint[][] b = {a[0].clone(), a[1].clone()};','이 예시의 모든 int 행을 각각 새로 만들면 원본과 독립적입니다.'],
 'objects-instance':['class new .','class Box { int n = 3; }\n// new Box()마다 별도의 인스턴스 필드가 생깁니다.','인스턴스 필드와 클래스가 공유하는 static 필드를 구분합니다.'],
 'objects-string':['String == equals new','String a = new String("hi");\nString b = new String("hi");\n// a.equals(b)는 true입니다.','내용이 같다는 것과 같은 객체라는 것은 다릅니다.'],
 'objects-this':['this .','class Badge {\n int id = 6;\n int read() { int id = 9; return this.id; }\n}\n// read()는 필드의 6을 반환합니다.','같은 이름을 가진 필드와 지역 변수를 구분합니다.'],
 'objects-fields':['class int 초기화','class Box { int count; }\n// 새 객체의 count는 0입니다.','지역 변수에는 이 필드 초기화 규칙을 적용하지 않습니다.'],
 'objects-return':['return . ()','class Calc {\n int add(int n) { return n + 3; }\n}\n// add(6)의 반환값은 9입니다.','값을 반환하는 것과 화면에 출력하는 것은 다릅니다.'],
 'objects-overload':['class () 오버로딩','void read(int n) {}\nvoid read(String s) {}\n// 매개변수 타입이 다른 오버로딩입니다.','반환 타입만 바꾸어서는 오버로딩할 수 없습니다.'],
 'inheritance-ctor':['new 생성자 ()','class Box {\n int n;\n Box(int value) { n = value; }\n}\n// new Box(6)은 n을 6으로 초기화합니다.','생성자를 직접 선언하면 인자 없는 기본 생성자가 자동 추가되지 않습니다.'],
 'inheritance-super':['extends super ()','class Parent { Parent(int n) {} }\nclass Child extends Parent {\n Child() { super(6); }\n}','생성자를 상속하는 것이 아니라 부모 생성자를 호출합니다.'],
 'inheritance-override':['extends Override .','class A { int value() { return 3; } }\nclass B extends A { int value() { return 6; } }\n// A 타입으로 B 객체를 가리켜 호출해도 6을 반환합니다.','인스턴스 메서드 재정의와 매개변수가 다른 오버로딩을 구분합니다.'],
 'polymorphism-static':['static .','class MathBox {\n static int twice(int n) { return n * 2; }\n}\n// MathBox.twice(3)은 6입니다.','static 멤버는 특정 객체에 속한 인스턴스 멤버가 아닙니다.'],
 'polymorphism-final':['final extends Override','class A { final int read() { return 6; } }\n// 자식 클래스는 read()를 오버라이딩할 수 없습니다.','final을 변수·메서드·클래스 중 어디에 붙였는지 확인합니다.'],
 'polymorphism-abstract':['abstract extends new','abstract class Tool { abstract int read(); }\nclass Pen extends Tool { int read() { return 6; } }','추상 클래스는 직접 생성하지 않고 구체적인 구현을 사용합니다.'],
 'polymorphism-interface':['interface implements public','interface Readable { int read(); }\nclass Note implements Readable {\n public int read() { return 6; }\n}','구현 메서드는 인터페이스의 public 접근 범위를 줄이지 않습니다.'],
 'packages-name':['package import .*','package school;\nimport java.util.Arrays;','import는 접근 제한을 없애거나 하위 패키지까지 가져오지 않습니다.'],
 'packages-lang':['import String System Integer .','String word = "hi";\n// java.lang.String은 별도 import 없이 사용할 수 있습니다.','완전한 이름을 적는 방법과 import로 짧은 이름을 쓰는 방법을 구분합니다.'],
 'packages-access':['public private protected package','class Vault {\n private int n = 6;\n public int read() { return n; }\n}','다른 최상위 클래스는 private 필드를 직접 읽을 수 없습니다.']
};
const groups=[['산술','+ - * / %'],['증감','++ --'],['비교','== != >= <='],['논리','&& || !'],['삼항','? :'],['배열','[]'],['분기','if switch'],['반복','for while'],['객체','class new this'],['선언','final static abstract interface'],['패키지','package import public private']];
let view={topic:'all',query:'',symbol:'',bookmarked:false,id:rules[0].id,bookmarks:[],scroll:0,navScroll:0};
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&typeof saved==='object')view={...view,topic:topics.some(t=>t.id===saved.topic)?saved.topic:'all',query:typeof saved.query==='string'?saved.query.slice(0,120):'',symbol:groups.some(g=>g[0]===saved.symbol)?saved.symbol:'',bookmarked:saved.bookmarked===true,id:ruleFor(saved.id)?saved.id:rules[0].id,bookmarks:Array.isArray(saved.bookmarks)?saved.bookmarks.filter(id=>ruleFor(id)):[],scroll:Number.isFinite(saved.scroll)?Math.max(0,saved.scroll):0,navScroll:Number.isFinite(saved.navScroll)?Math.max(0,saved.navScroll):0};}catch{}
let matches=[],onChange=()=>{},timer;
const topicFor=id=>topics.find(t=>t.id===id);
function remember(){try{localStorage.setItem(key,JSON.stringify(view));}catch{}}
function capture(){if($('ruleBody').closest('[hidden],dialog:not([open])'))return;view.scroll=$('ruleBody').scrollTop;view.navScroll=$('ruleList').parentElement.scrollTop;remember();}
function filtered(){const q=view.query.trim().toLocaleLowerCase(),tokens=groups.find(g=>g[0]===view.symbol)?.[1].split(' ');return rules.filter(r=>(view.topic==='all'||r.topic===view.topic)&&(!view.bookmarked||view.bookmarks.includes(r.id))&&(!q||[r.title,r.text,...cards[r.id]].join(' ').toLocaleLowerCase().includes(q))&&(!tokens||tokens.some(t=>cards[r.id][0].split(' ').includes(t))));}
function render(){
 matches=filtered();if(!matches.some(r=>r.id===view.id)){view.id=matches[0]?.id||null;view.scroll=0;}
 $('bookTopic').value=view.topic;$('bookSearch').value=view.query;$('bookmarkFilter').setAttribute('aria-pressed',String(view.bookmarked));
 $('symbolIndex').innerHTML=groups.map(([label,tokens])=>`<button type="button" data-symbol="${escape(label)}" aria-pressed="${view.symbol===label}" title="${escape(label)}">${escape(tokens)}</button>`).join('');
 $('bookCount').textContent=`${matches.length}개 조항${view.bookmarked?' · 책갈피':''}`;
 $('ruleList').innerHTML=matches.map(r=>`<button type="button" data-read-rule="${r.id}" aria-current="${r.id===view.id?'page':'false'}"><small>${escape(topicFor(r.topic).name)}</small>${view.bookmarks.includes(r.id)?'★ ':''}${escape(r.title)}</button>`).join('')||'<p class="book-empty">해당하는 조항이 없습니다. 검색 조건을 변경하거나 전체 보기를 선택하십시오.</p>';
 const r=ruleFor(view.id),index=matches.findIndex(r=>r.id===view.id);
 $('rulePosition').textContent=r?`${index+1} / ${matches.length}`:'0 / 0';$('previousRule').disabled=index<=0;$('nextRule').disabled=index<0||index>=matches.length-1;
 $('bookmarkRule').disabled=!r;$('bookmarkRule').textContent=view.bookmarks.includes(view.id)?'★':'☆';$('bookmarkRule').setAttribute('aria-pressed',String(view.bookmarks.includes(view.id)));$('bookmarkRule').setAttribute('aria-label',view.bookmarks.includes(view.id)?'현재 조항 책갈피 해제':'현재 조항 책갈피 지정');
 const select=$('useRule');select.disabled=!r;select.hidden=!r;select.dataset.compareRule=r?.id||'';select.setAttribute('aria-label',r?`규정 선택: ${r.title}`:'규정 선택');select.setAttribute('aria-pressed','false');
 if(r){const [tags,example,note]=cards[r.id];$('ruleBody').innerHTML=`<p class="eyebrow">${escape(topicFor(r.topic).name)} / JAVA 21</p><h2>${escape(r.title)}</h2><h3>01 / 규칙</h3><p>${escape(r.text)}</p><h3>02 / 일반 예시</h3><pre>${escape(example)}</pre><div class="rule-note"><h3>03 / 주의</h3><p>${escape(note)}</p></div>`;}
 else $('ruleBody').innerHTML='<h2>검색 결과 없음</h2><p>다른 단어 또는 기호를 선택하십시오. 전체 보기에서 모든 규정을 다시 열 수 있습니다.</p>';
 $('ruleBody').scrollTop=view.scroll;$('ruleList').parentElement.scrollTop=view.navScroll;remember();onChange();
}
function read(id){if(!ruleFor(id))return;capture();view.id=id;view.scroll=0;render();}
function setTopic(id){capture();view.topic=topicFor(id)?id:'all';view.query='';view.symbol='';view.bookmarked=false;view.scroll=0;view.navScroll=0;render();}
function reveal(id){const r=ruleFor(id);if(!r)return;capture();view.topic=r.topic;view.query='';view.symbol='';view.bookmarked=false;view.id=id;view.scroll=0;render();}
$('bookTopic').innerHTML='<option value="all">전체 주제</option>'+topics.map(t=>`<option value="${t.id}">${t.icon} ${escape(t.name)}</option>`).join('');
$('bookTopic').onchange=()=>setTopic($('bookTopic').value);
$('bookSearch').oninput=()=>{capture();view.query=$('bookSearch').value.slice(0,120);view.scroll=0;view.navScroll=0;render();};
$('symbolIndex').onclick=e=>{const b=e.target.closest('[data-symbol]');if(!b)return;capture();view.symbol=view.symbol===b.dataset.symbol?'':b.dataset.symbol;view.topic='all';view.query='';view.bookmarked=false;view.scroll=0;view.navScroll=0;render();};
$('ruleList').onclick=e=>{const b=e.target.closest('[data-read-rule]');if(b)read(b.dataset.readRule);};
$('bookmarkFilter').onclick=()=>{capture();view.bookmarked=!view.bookmarked;view.scroll=0;render();};
$('bookmarkRule').onclick=()=>{if(!view.id)return;capture();view.bookmarks=view.bookmarks.includes(view.id)?view.bookmarks.filter(id=>id!==view.id):[...view.bookmarks,view.id];render();};
$('resetBook').onclick=()=>{capture();view={...view,topic:'all',query:'',symbol:'',bookmarked:false,scroll:0,navScroll:0};render();};
for(const [id,delta] of [['previousRule',-1],['nextRule',1]])$(id).onclick=()=>{const index=matches.findIndex(r=>r.id===view.id),next=matches[index+delta];if(next)read(next.id);};
for(const element of [$('ruleBody'),$('ruleList').parentElement])element.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(capture,120);});
window.addEventListener('pagehide',capture);
window.JavaHandbook={setTopic,reveal,render,capture,set onChange(fn){onChange=fn;},get viewedId(){return view.id;}};render();
})();
