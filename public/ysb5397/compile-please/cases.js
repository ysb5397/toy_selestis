/* Original, deterministic Java 21 LTS exercises. Claims refer to stdout unless stated. */
(() => {
const topics = [
 {id:'types',name:'자료형·연산',en:'TYPES & OPERATORS',icon:'01',description:'정수 나눗셈, 문자열, 형 변환',rules:[['정수끼리 나누면 정수','5 / 2는 2야. 소수 부분은 0 방향으로 버려. 5 / 2.0은 실수 연산이라 2.5가 돼.'],['문자열 +는 왼쪽부터','1 + 2 + "점"은 "3점", "점" + 1 + 2는 "점12"가 돼.'],['형 변환의 순서','(double) (5 / 2)는 2.0이야. 정수 나눗셈을 끝낸 다음 double로 바꿔.'],['증가 연산과 나머지','x++는 현재 값을 사용한 뒤 1 증가해. ++x는 먼저 증가해. %는 나눗셈의 나머지야.']]},
 {id:'flow',name:'조건문·반복문',en:'CONDITIONS & LOOPS',icon:'02',description:'분기 조건, 반복 범위, break',rules:[['조건을 통과한 블록만 실행','if / else if / else는 위에서부터 검사해서 처음 일치한 한 블록을 실행해.'],['for의 실행 순서','초기화 → 조건 검사 → 본문 → 증감 → 조건 검사. i < 3이면 3은 포함하지 않아.'],['do-while은 본문부터','while은 조건을 먼저 검사해. do-while은 본문을 먼저 실행하므로 조건이 처음부터 거짓이어도 본문을 한 번 실행해.'],['continue와 break','continue는 이번 회차의 남은 본문을 건너뛰어. break는 가장 가까운 반복문을 끝내.'],['논리 연산과 단락 평가','&&는 양쪽이 모두 참이어야 참. ||는 하나라도 참이면 참. &&의 왼쪽이 거짓이면 오른쪽은 실행하지 않아.']]},
 {id:'objects',name:'클래스·객체',en:'CLASSES & OBJECTS',icon:'03',description:'참조, 문자열 비교, 필드와 메서드',rules:[['참조를 복사하면 같은 객체','int[] b = a는 배열을 복제하지 않아. b[0]을 바꾸면 a[0]도 같은 값을 보여.'],['문자열 내용은 equals','String의 ==는 같은 객체를 가리키는지 비교해. new String으로 각각 만든 객체의 내용 비교에는 equals를 써.'],['필드와 지역 변수','지역 변수는 같은 이름의 필드를 가려. this.name은 현재 객체의 필드를 가리켜.'],['메서드와 기본값','메서드의 return 값과 출력은 달라. int 인스턴스 필드의 기본값은 0이지만, 지역 변수는 사용 전에 초기화해야 해.']]}
];
const cases = [
 ['t1','types','민서','첫 번째 정수 계산','System.out.print(7 / 2);','3',true,'정수 / 정수는 정수 연산이야. 7을 2로 나눈 몫에서 소수 부분을 버리면 3이 남아.','정수 나눗셈'],
 ['t2','types','도윤','나누고 나서 바꾸기','System.out.print((double) (5 / 2));','2.5',false,'괄호 안의 5 / 2가 먼저 정수 2가 돼. 그다음 double로 바꾸므로 실제 출력은 2.0이야.','형 변환 순서'],
 ['t3','types','서아','문자열 운송 허가','System.out.print("J" + 2 + 3);','J5',false,'왼쪽부터 계산해. "J" + 2가 "J2"가 되고, 여기에 3을 붙여 실제로는 J23을 출력해.','문자열 연결'],
 ['t4','types','지호','증가 연산 신고','int n = 4;\nSystem.out.print(n++);\nSystem.out.print(n);','45',true,'n++는 기존 값 4를 출력에 사용한 뒤 n을 5로 바꿔. 두 번째 print는 5를 출력해. 줄바꿈은 없어서 45야.','후위 증가'],
 ['t5','types','하린','나머지 계산 확인','System.out.print(17 % 5);','3',false,'17 = 5 × 3 + 2야. %는 몫 3이 아니라 나머지 2를 구하므로 실제 출력은 2야.','나머지 연산'],
 ['t6','types','준우','문자열 앞의 덧셈','System.out.print(2 + 3 + "번");','5번',true,'왼쪽의 2 + 3은 둘 다 정수라 5로 더해져. 그다음 문자열 "번"과 연결돼서 5번을 출력해.','연산 순서'],
 ['f1','flow','유진','반복 횟수 신고','int sum = 0;\nfor (int i = 1; i < 4; i++) {\n    sum += i;\n}\nSystem.out.print(sum);','10',false,'i < 4이므로 i는 1, 2, 3일 때만 본문을 실행해. 1 + 2 + 3 = 6이 실제 출력이야.','반복 범위'],
 ['f2','flow','시온','조건 분기 허가','int score = 80;\nif (score >= 90) {\n    System.out.print("A");\n} else if (score >= 80) {\n    System.out.print("B");\n} else {\n    System.out.print("C");\n}','B',true,'80 >= 90은 거짓, 80 >= 80은 참이야. 처음 일치한 else if 블록만 실행해서 B를 출력해.','조건 경계'],
 ['f3','flow','수빈','한 회차 건너뛰기','for (int i = 1; i <= 4; i++) {\n    if (i == 2) continue;\n    System.out.print(i);\n}','134',true,'i가 2인 회차만 print를 건너뛰어. 반복문 전체를 끝내는 건 아니므로 1, 3, 4를 이어서 출력해.','continue'],
 ['f4','flow','이준','비상 정지 신청','for (int i = 1; i <= 4; i++) {\n    if (i == 3) break;\n    System.out.print(i);\n}','124',false,'i가 3이 되면 break로 반복문 자체를 끝내. 3도 4도 출력하지 않아서 실제 출력은 12야.','break'],
 ['f5','flow','다은','단락 평가 점검','int n = 0;\nboolean ok = false && (++n > 0);\nSystem.out.print(n);','0',true,'&&의 왼쪽이 이미 false라 오른쪽의 ++n은 실행하지 않아. 따라서 n은 그대로 0이야.','단락 평가'],
 ['f6','flow','태오','최소 한 번의 반복','int n = 5;\ndo {\n    n++;\n} while (n < 3);\nSystem.out.print(n);','5',false,'do-while은 본문을 한 번 실행한 다음 조건을 검사해. n이 6이 된 뒤 조건이 거짓이 되므로 실제 출력은 6이야.','do-while'],
 ['o1','objects','채원','배열 참조 이전','int[] a = {1, 2};\nint[] b = a;\nb[0] = 9;\nSystem.out.print(a[0]);','1',false,'b = a는 배열의 참조를 복사해. 둘 다 같은 배열을 가리키므로 b[0]을 바꾸면 a[0]도 9야.','참조 공유'],
 ['o2','objects','건우','문자열 신원 확인','String a = new String("java");\nString b = new String("java");\nSystem.out.print(a == b);','true',false,'각각 new로 만든 서로 다른 String 객체야. ==는 객체의 동일성을 비교하므로 false를 출력해.','객체 동일성'],
 ['o3','objects','예린','내용 일치 증명','String a = new String("java");\nString b = new String("java");\nSystem.out.print(a.equals(b));','true',true,'String.equals는 문자열의 내용을 비교해. 두 객체의 내용이 모두 java이므로 true야.','문자열 내용 비교'],
 ['o4','objects','현우','필드 초기값 신고','class Ticket {\n    int count;\n}\n// main 내부\nTicket t = new Ticket();\nSystem.out.print(t.count);','0',true,'int 인스턴스 필드에는 기본값 0이 들어가. 이 규칙은 초기화하지 않은 지역 변수에는 적용되지 않아.','필드 기본값'],
 ['o5','objects','나연','필드와 이름표','class Badge {\n    int id = 7;\n    int read() {\n        int id = 2;\n        return this.id;\n    }\n}\n// main 내부\nSystem.out.print(new Badge().read());','2',false,'this.id는 지역 변수 id가 아니라 현재 객체의 필드야. 필드에 저장된 7을 반환해서 실제 출력은 7이야.','this와 지역 변수'],
 ['o6','objects','우진','메서드 반환 확인','class Calculator {\n    int twice(int n) {\n        return n * 2;\n    }\n}\n// main 내부\nCalculator c = new Calculator();\nSystem.out.print(c.twice(4));','8',true,'인자 4가 매개변수 n에 전달돼. 메서드가 4 × 2를 반환하고 print가 그 값 8을 출력해.','메서드 반환']
].map(([id,topic,name,title,code,claim,valid,explanation,concept])=>({id,topic,name,title,code,claim,valid,explanation,concept,context:topic==='objects' && ['o4','o5','o6'].includes(id)?'클래스 선언은 main 바깥, // main 내부 아래 코드는 main 안에 있다고 가정해.':''}));
// Stable rule IDs decouple saved evidence from rulebook display order.
topics[0].rules[3]=['증가 연산의 순서','x++는 현재 값을 사용한 뒤 1 증가해. ++x는 먼저 증가한 값을 사용해.'];
topics[0].rules.push(['나머지 연산','a % b는 정수 나눗셈의 나머지야. 17 % 5는 2가 돼.']);
topics[2].rules[3]=['필드의 기본값','int 인스턴스 필드의 기본값은 0이야. 지역 변수는 사용 전에 초기화해야 해.'];
topics[2].rules.push(['메서드의 반환','메서드 호출의 인자가 매개변수에 전달되고, return으로 돌려준 값을 호출한 곳에서 사용해. 반환 자체가 출력은 아니야.']);
topics[0].ruleIds=['types-division','types-string','types-cast','types-increment','types-remainder'];
topics[1].ruleIds=['flow-if','flow-for','flow-do','flow-jump','flow-logic'];
topics[2].ruleIds=['objects-ref','objects-string','objects-this','objects-fields','objects-return'];
// Each line is an anchor into the full program context, not an isolated expression evaluator.
const comparisons={
 t1:['3',['types-division'],[1]],t2:['2.0',['types-cast','types-division'],[1]],
 t3:['J23',['types-string'],[1]],t4:['45',['types-increment'],[2,3]],
 t5:['2',['types-remainder'],[1]],t6:['5번',['types-string'],[1]],
 f1:['6',['flow-for'],[2]],f2:['B',['flow-if'],[2,4]],
 f3:['134',['flow-jump'],[2]],f4:['12',['flow-jump'],[2]],
 f5:['0',['flow-logic'],[2]],f6:['6',['flow-do'],[2,4]],
 o1:['9',['objects-ref'],[2,3]],o2:['false',['objects-string'],[3]],
 o3:['true',['objects-string'],[3]],o4:['0',['objects-fields'],[2,6]],
 o5:['7',['objects-this'],[5]],o6:['8',['objects-return'],[3,8]]
};
for(const c of cases){const [actualOutput,ruleIds,lines]=comparisons[c.id];c.actualOutput=actualOutput;c.comparison={ruleIds,lines};}
window.JavaInspectorData = {javaRelease:21,topics,cases};
})();
