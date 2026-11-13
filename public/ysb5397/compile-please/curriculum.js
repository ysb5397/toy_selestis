/* School curriculum. Small examples, explicit rules, and independently verifiable results. */
(() => {
'use strict';
const previous=window.JavaInspectorData;
const topic=(id,name,en,description,entries)=>({id,name,en,description,rules:entries.map(r=>r.slice(1)),ruleIds:entries.map(r=>r[0])});
const topics=[
 topic('basics','자바 기본 개념','JAVA FOUNDATIONS','소스·바이트코드, JVM, GC',[
  ['basics-files','소스에서 실행까지','.java는 사람이 작성한 자바 소스 파일입니다. javac는 소스를 컴파일하여 .class 형식의 바이트코드를 만듭니다. JVM은 이 클래스 형식을 읽어 실행합니다. 소스 파일과 컴파일 결과를 구분하십시오.'],
  ['basics-jvm','JVM과 이식성','JVM은 자바 가상 머신입니다. 같은 바이트코드라도 해당 환경에 맞는 JVM과 필요한 라이브러리가 있어야 실행할 수 있습니다. JVM 자체가 모든 운영체제에서 동일한 실행 파일이라는 뜻은 아닙니다.'],
  ['basics-gc','GC와 객체의 수명','GC는 더 이상 도달할 수 없는 객체의 메모리를 자동으로 회수할 수 있게 하는 메커니즘입니다. 참조에 null을 대입하면 그 참조만 끊어집니다. 다른 참조가 남을 수 있고, 참조가 모두 사라져도 즉시 회수된다고 보장하지 않습니다. System.gc()도 즉시 회수 완료를 보장하지 않습니다.'],
  ['basics-tools','JDK의 역할','JDK는 자바 개발 도구 모음으로 컴파일러 javac와 실행에 필요한 도구를 제공합니다. 일반적인 명령은 javac Hello.java로 컴파일한 뒤 java Hello로 클래스를 실행하는 순서입니다.']
 ]),
 topic('types','자료형','TYPES & LITERALS','정수·실수·문자·논리, 형 변환·래퍼',[
  ['types-division','정수와 실수의 나눗셈','byte·short·int·long은 정수를 표현하고 float·double은 실수를 표현합니다. 정수끼리 /로 나누면 소수 부분을 0 방향으로 버립니다. 9 / 2는 4, 9 / 2.0은 4.5입니다.'],
  ['types-cast','형 변환의 시점','(double) 값은 값을 double로 변환합니다. 괄호 안 연산이 먼저 끝나면 변환해도 잃어버린 소수 부분은 복구되지 않습니다. (double) (9 / 2)는 4.0입니다. 반대로 (double) 9 / 2는 4.5입니다. 실수를 int로 명시적 변환하면 이 예시 범위에서는 소수 부분을 0 방향으로 버립니다.'],
  ['types-text','char와 String','char는 작은따옴표로 적는 하나의 UTF-16 코드 단위이고 String은 큰따옴표로 적는 문자열 객체입니다. \'A\'는 char, "A"는 String입니다. String은 기본형이 아닙니다. char를 int로 변환하면 해당 코드 단위의 정숫값이 됩니다. 예를 들어 \'A\'는 65입니다.'],
  ['types-literal','리터럴 표기','리터럴은 코드에 직접 적은 값입니다. 정수의 0b 접두사는 2진수, 0x는 16진수, 앞의 0은 8진수를 나타냅니다. 0b11은 십진수 3입니다. L은 long, F는 float 접미사이며 소수 리터럴은 기본적으로 double입니다. 숫자 사이의 _는 자릿수 구분이며 값에 영향을 주지 않습니다.'],
  ['types-bool','논리형','boolean 값은 true와 false 두 가지입니다. !는 참과 거짓을 뒤집습니다. <, >, <=, >=, ==, != 같은 비교식의 결과도 boolean입니다. 숫자를 boolean 대신 조건으로 사용할 수 없습니다.'],
  ['types-wrapper','래퍼 클래스','Integer는 int 값을 객체로 다루는 래퍼 클래스입니다. Integer n = 4는 자동 박싱, int x = n은 자동 언박싱입니다. Integer.parseInt("12")는 문자열을 정수 12로 바꿉니다. null인 래퍼를 기본형으로 언박싱하면 NullPointerException이 발생합니다.']
 ]),
 topic('variables','변수','VARIABLES','선언·대입, 범위·수명, final',[
  ['variables-assign','선언·초기화·대입','int n;은 정수 변수 선언, int n = 3;은 선언과 초기화입니다. =는 오른쪽 값을 왼쪽 변수에 저장하는 대입입니다. n = n + 2;는 기존 n에 2를 더한 결과를 저장합니다. 기본형 변수끼리 대입하면 값이 복사됩니다.'],
  ['variables-scope','지역 변수의 범위와 수명','지역 변수는 선언한 블록의 선언 지점부터 블록 끝까지 이름을 사용할 수 있습니다. 블록 밖에서는 그 이름으로 접근할 수 없습니다. 메서드를 새로 호출하면 지역 변수도 새로 만들어집니다. 지역 변수가 사라지는 시점과 참조하던 객체가 GC로 회수되는 시점은 별개입니다.'],
  ['variables-init','지역 변수와 필드의 초기화','클래스에 선언한 필드와 배열 요소에는 기본값이 있습니다. int는 0, boolean은 false, 참조형은 null입니다. 메서드 안의 지역 변수는 자동으로 읽을 수 있는 기본값이 주어지지 않으므로 사용 전에 반드시 값을 대입해야 합니다.'],
  ['variables-final','final 변수','final 변수에는 초기화 후 다른 값을 다시 대입할 수 없습니다. final int n = 3; 뒤의 n = 4;는 컴파일 오류입니다. final 참조는 다른 객체를 가리키게 바꿀 수 없지만 그 객체 내부의 변경까지 금지하지는 않습니다.']
 ]),
 topic('operators','연산자','OPERATORS','산술·비교, 증감·단락 평가·삼항',[
  ['types-string','문자열 연결의 순서','+는 숫자끼리 만나면 덧셈, 한쪽이 문자열이면 문자열 연결입니다. 같은 우선순위의 +는 왼쪽부터 묶입니다. 4 + 1 + "개"는 "5개", "개" + 4 + 1은 "개41"입니다.'],
  ['types-increment','증감 연산자','n++는 증가 전 값을 식에서 사용한 뒤 n을 1 증가시킵니다. ++n은 먼저 증가한 값을 사용합니다. --는 같은 방식으로 1 감소시킵니다. System.out.print를 연속 호출하면 출력이 줄바꿈 없이 이어집니다.'],
  ['types-remainder','산술·대입 연산자','+는 덧셈, -는 뺄셈, *는 곱셈, /는 나눗셈, %는 나머지입니다. 14 % 4는 2입니다. n += 2는 이 예시의 int 변수에서 n = n + 2와 같은 결과를 냅니다.'],
  ['flow-logic','빠른 평가 / 단락 평가','&&는 양쪽 모두 참일 때 참이고 ||는 한쪽만 참이어도 참입니다. &&의 왼쪽이 false이면 오른쪽은 평가하지 않습니다. ||의 왼쪽이 true여도 오른쪽은 평가하지 않습니다. 따라서 실행하지 않은 식의 증감도 일어나지 않습니다.'],
  ['operators-order','식과 우선순위','식은 값으로 계산할 수 있는 코드입니다. 괄호 안을 먼저 계산하고, * / %는 + -보다 먼저 계산합니다. 산술 연산 다음에 비교, &&, || 순서로 결합합니다. 2 + 3 * 4는 14이고 (2 + 3) * 4는 20입니다. =는 비교가 아니라 대입이며 같은지 비교하려면 ==를 사용합니다.'],
  ['operators-ternary','삼항 연산자','조건 ? 참일 때 값 : 거짓일 때 값은 조건에 따라 두 값 중 하나만 선택합니다. int n = 2;에서 n > 0 ? "양수" : "그 외"는 "양수"입니다. 선택하지 않은 쪽의 식은 실행하지 않습니다.'],
  ['operators-bit','비트 연산자','정수의 &는 각 비트가 모두 1인 자리에 1을, |는 하나라도 1인 자리에 1을, ^는 서로 다른 자리에 1을 만듭니다. 6(110) & 3(011)은 2(010)입니다. <<는 왼쪽으로 비트를 이동합니다. 작은 양수의 1 << 2는 4입니다. boolean의 &와 |는 단락 평가 없이 양쪽을 평가합니다.']
 ]),
 topic('conditions','조건문','CONDITIONS','if·else if·else, switch·case',[
  ['flow-if','if / else if / else','if의 괄호 속 boolean 조건이 true이면 해당 블록을 실행합니다. else if는 앞 조건들이 거짓일 때 순서대로 검사합니다. 처음 참이 된 블록 하나만 실행하고 나머지는 건너뜁니다. 모두 거짓이면 else를 실행합니다. >=는 경계값을 포함합니다.'],
  ['conditions-switch','switch와 break','switch는 값에 맞는 case에서 실행을 시작합니다. case 값: 형식에서는 break가 없으면 아래 case의 문장도 이어서 실행합니다. break는 switch를 끝냅니다. 맞는 case가 없으면 default로 이동합니다. case 값 -> 형식은 선택한 가지 하나만 실행합니다.']
 ]),
 topic('flow','반복문','LOOPS','for·향상된 for, while·do-while',[
  ['flow-for','for 반복 순서','for (초기화; 조건; 증감)은 초기화 → 조건 검사 → 본문 → 증감 순서를 따릅니다. 조건이 참인 동안 반복하고 거짓이면 종료합니다. i < 3은 3을 포함하지 않고 i <= 3은 3을 포함합니다. sum += i는 sum에 i를 더해 저장합니다.'],
  ['flow-do','while과 do-while','while은 본문 전에 조건을 검사하므로 처음부터 거짓이면 한 번도 실행하지 않습니다. do { 본문 } while (조건);은 본문을 먼저 실행하므로 적어도 한 번 실행합니다.'],
  ['flow-jump','continue와 break','continue는 현재 회차의 남은 본문을 생략하고 다음 회차로 넘어갑니다. for에서는 증감식으로 이동한 뒤 조건을 검사합니다. break는 가장 가까운 반복문 또는 switch를 끝냅니다.'],
  ['flow-each','향상된 for','for (int value : 배열)은 배열의 요소를 처음부터 하나씩 value에 복사하며 반복합니다. value는 인덱스가 아니라 요소의 값입니다. 기본형 배열에서 value를 바꿔도 원래 배열 요소는 바뀌지 않습니다.']
 ]),
 topic('arrays','배열','ARRAYS','인덱스·2차원, 참조·얕은/깊은 복사',[
  ['arrays-index','선언·초기화·인덱스','int[] a = {4, 7};은 두 정수의 배열입니다. 인덱스는 0부터 시작하므로 a[0]은 4이고 a[1]은 7입니다. a.length는 요소 수 2입니다. new int[3]의 요소는 모두 0입니다. 범위를 벗어난 인덱스를 읽으면 ArrayIndexOutOfBoundsException이 발생합니다.'],
  ['arrays-matrix','2차원 배열','int[][]는 행 배열을 요소로 가지는 배열입니다. a[행][열] 순서로 읽습니다. {{2, 4}, {6, 8}}에서 a[1][0]은 6입니다. 행마다 길이가 다를 수 있으므로 a.length는 행 수, a[0].length는 첫 행의 열 수입니다.'],
  ['objects-ref','참조 대입','배열 변수는 배열 객체를 가리키는 참조를 저장합니다. int[] b = a;는 새 배열을 만들지 않고 같은 배열의 참조를 복사합니다. b[0]을 변경하면 a[0]에서도 바뀐 값이 보입니다.'],
  ['arrays-shallow','얕은 복사','clone()은 배열 객체를 하나 새로 만들고 각 요소를 복사합니다. 1차원 int[]의 요소는 정숫값이므로 원본과 독립적입니다. 2차원 int[][]의 요소는 행 배열의 참조이므로 바깥 배열만 clone()하면 내부 행은 원본과 공유합니다.'],
  ['arrays-deep','깊은 복사','2차원 int 배열을 원본과 독립적으로 만들려면 바깥 배열뿐 아니라 각 행도 새로 만들고 값을 복사해야 합니다. 각 행에 clone()을 적용하면 이 int[][] 예시에서는 깊은 복사가 됩니다. 객체 배열의 경우 객체 내부 구조도 고려해야 합니다.']
 ]),
 topic('objects','클래스·객체·메서드','CLASSES & METHODS','필드·호출·반환, 오버로딩',[
  ['objects-instance','클래스와 객체','클래스는 객체의 필드와 메서드를 정의합니다. new 클래스명()은 새 객체를 만듭니다. static이 아닌 인스턴스 필드는 객체마다 별도로 존재하므로 한 객체의 필드를 바꿔도 다른 객체의 필드는 그대로입니다.'],
  ['objects-string','문자열의 동일성과 내용','참조형에서 ==는 같은 객체를 가리키는지 비교합니다. new String("hi")를 두 번 호출하면 내용은 같아도 서로 다른 객체입니다. String.equals는 문자열 내용을 비교합니다.'],
  ['objects-this','this와 지역 변수','같은 이름의 지역 변수가 있으면 그 이름만 쓸 때는 지역 변수를 뜻합니다. this는 현재 객체를 가리키므로 this.id는 현재 객체의 id 필드입니다.'],
  ['objects-fields','필드 기본값','int 인스턴스 필드는 명시적으로 초기화하지 않으면 0입니다. 이는 사용 전에 값을 대입해야 하는 지역 변수와 다른 규칙입니다.'],
  ['objects-return','메서드 호출과 반환','메서드를 호출하면 인자 값이 매개변수에 전달됩니다. return 식;은 식의 값을 호출한 곳에 돌려줍니다. return 자체는 화면에 출력하지 않습니다. System.out.print(호출식)은 반환된 값을 줄바꿈 없이 출력합니다.'],
  ['objects-overload','오버로딩 / 오버로드','한 클래스 안에서 같은 이름에 매개변수의 타입 또는 개수가 다른 메서드를 정의할 수 있습니다. 이를 오버로딩이라고 합니다. 호출 시 인자의 타입과 개수로 대상을 선택합니다. 반환 타입만 다르고 매개변수가 같으면 오버로딩할 수 없습니다.']
 ]),
 topic('inheritance','생성자·상속','CONSTRUCTION & INHERITANCE','생성자·super, 오버라이딩',[
  ['inheritance-ctor','생성자','생성자는 클래스와 이름이 같고 반환 타입을 쓰지 않습니다. new로 객체를 만들 때 실행하며 필드를 초기화할 수 있습니다. 생성자를 하나라도 직접 선언하면 인자 없는 기본 생성자를 컴파일러가 자동으로 추가하지 않습니다.'],
  ['inheritance-super','상속과 super','class Child extends Parent는 Child가 Parent를 상속한다는 뜻입니다. 객체를 만들 때 부모 생성자가 먼저 실행되고 자식 생성자 본문이 실행됩니다. Java 21에서 super(...)는 생성자의 첫 문장에 둡니다. 생성자는 상속되지 않습니다.'],
  ['inheritance-override','오버라이딩 / 오버라이드','자식이 상속받은 인스턴스 메서드를 같은 시그니처로 다시 정의하면 오버라이딩입니다. Parent p = new Child();에서 p의 인스턴스 메서드를 호출하면 실제 객체인 Child의 재정의가 실행됩니다. 매개변수가 달라지는 오버로딩과 구분하십시오.']
 ]),
 topic('polymorphism','final·static·다형성','ABSTRACTION & POLYMORPHISM','추상 클래스·인터페이스, 공유·재정의',[
  ['polymorphism-static','static 멤버','static 필드는 객체별로 따로 생기는 필드가 아니라 클래스에 속하는 공유 필드입니다. static 메서드는 객체 없이 클래스명.메서드명()으로 호출할 수 있습니다. 반대로 인스턴스 메서드는 객체가 필요합니다.'],
  ['polymorphism-final','final 클래스와 메서드','final 클래스는 상속할 수 없고 final 메서드는 자식이 오버라이딩할 수 없습니다. final 변수의 재대입 금지와 구분하십시오.'],
  ['polymorphism-abstract','추상 클래스','abstract 클래스는 new로 직접 객체를 만들 수 없습니다. abstract 메서드는 구현 본문이 없으며, 추상 클래스에는 일반 메서드도 있을 수 있습니다. 구체적인 자식 클래스는 상속받은 추상 메서드를 구현해야 합니다.'],
  ['polymorphism-interface','인터페이스와 다형성','인터페이스는 구현 클래스가 제공할 메서드의 약속을 정의합니다. class Bell implements Sound는 Bell이 Sound를 구현한다는 뜻입니다. 인터페이스의 일반적인 본문 없는 메서드는 public abstract이고 구현 시 public을 사용합니다. 인터페이스 타입 변수로 구현 객체를 가리킬 수 있으며 호출은 실제 객체의 구현으로 이어집니다. 인터페이스 자체는 new로 직접 만들 수 없습니다.']
 ]),
 topic('packages','패키지·접근 제어','PACKAGES & ACCESS','package·import, public·private',[
  ['packages-name','패키지와 import','package school;은 현재 파일의 클래스가 school 패키지에 속함을 선언합니다. import는 다른 패키지의 접근 가능한 타입을 짧은 이름으로 사용할 수 있게 합니다. java.util.*는 java.util 패키지의 타입을 대상으로 하며 하위 패키지의 타입까지 가져오지 않습니다. import가 접근 제한을 없애지는 않습니다.'],
  ['packages-lang','java.lang과 완전한 이름','String·System·Integer 등 java.lang의 public 타입은 별도 import 없이 사용할 수 있습니다. 다른 타입은 java.util.Arrays처럼 완전한 이름을 쓰거나 import java.util.Arrays;로 짧은 이름을 사용할 수 있습니다. Arrays.toString(int 배열)은 [1, 2] 형태의 문자열을 반환합니다.'],
  ['packages-access','접근 제어','이 문제들은 모듈을 사용하지 않습니다. public 멤버는 접근 가능한 클래스라면 외부에서도 사용할 수 있습니다. private 멤버는 선언한 최상위 클래스와 그 내부에서만 접근할 수 있어 별개의 최상위 클래스는 같은 패키지여도 직접 접근할 수 없습니다. 접근 제어자를 생략하면 같은 패키지에서 접근할 수 있습니다. protected는 같은 패키지 또는 상속 관계에서 접근하며, 다른 패키지의 자식에서는 대상 참조에 추가 제한이 있습니다.']
 ])
];
topics.forEach((t,i)=>t.icon=String(i+1).padStart(2,'0'));
const explanations=[
 '정수끼리 나누므로 7 / 2의 소수 부분을 버린 결과는 3입니다.',
 '5 / 2를 먼저 계산하면 정수 2입니다. 그다음 double로 변환하므로 출력은 2.0입니다.',
 '"J" + 2는 "J2"입니다. 이어서 3을 연결하므로 출력은 J23입니다.',
 'n++는 증가 전 값 4를 출력하고 n을 5로 바꿉니다. 다음 print의 5가 줄바꿈 없이 이어져 45입니다.',
 '17은 5 × 3 + 2이므로 나머지는 2입니다. 몫 3과 구분하십시오.',
 '2 + 3을 먼저 숫자로 더한 뒤 "번"을 연결하므로 5번입니다.',
 'i는 1, 2, 3일 때만 반복합니다. 1 + 2 + 3은 6입니다.',
 '80 >= 90은 거짓이고 80 >= 80은 참입니다. else if의 B만 출력합니다.',
 'i가 2인 회차만 continue로 건너뜁니다. 1, 3, 4가 줄바꿈 없이 이어져 134입니다.',
 'i가 3일 때 break로 반복을 끝냅니다. 3과 4는 출력하지 않으므로 결과는 12입니다.',
 '&&의 왼쪽이 false이므로 오른쪽 ++n은 실행하지 않습니다. n은 0입니다.',
 'do의 본문을 먼저 실행하므로 n은 6이 됩니다. 이후 조건이 거짓이 되어 종료합니다.',
 'b와 a는 같은 배열을 가리킵니다. b[0]을 9로 바꾸면 a[0]도 9입니다.',
 'new String을 각각 호출하여 만든 서로 다른 객체입니다. ==의 결과는 false입니다.',
 'String.equals는 내용을 비교합니다. 두 문자열의 내용이 java로 같으므로 true입니다.',
 'int 인스턴스 필드는 초기값을 적지 않아도 0으로 초기화됩니다.',
 'this.id는 지역 변수 id가 아니라 현재 객체의 필드입니다. 필드의 값 7을 반환합니다.',
 'twice의 매개변수 n에 4가 전달됩니다. 4 × 2인 8을 반환하여 출력합니다.'
];
const cases=previous.cases.map((c,i)=>({...c,explanation:explanations[i],kind:'code',expectedStatus:'NORMAL',stdout:c.actualOutput,context:c.context?'클래스 선언은 main 바깥에, // main 내부 아래의 코드는 main 안에 있다고 가정합니다.':''}));
const moves={t3:'operators',t4:'operators',t5:'operators',t6:'operators',f2:'conditions',f5:'operators',o1:'arrays'};
cases.forEach(c=>{c.topic=moves[c.id]||c.topic;});
// The cast rule explains both the integer division and the later conversion.
cases.find(c=>c.id==='t2').comparison={ruleIds:['types-cast'],lines:[1]};
const add=(id,category,title,code,actual,claim,rule,explanation,options={})=>{
 const c={id,topic:category,name:'신청자 '+String(cases.length+1).padStart(2,'0'),title,code,actualOutput:actual,claim,valid:actual===claim,concept:title,explanation,kind:'code',expectedStatus:'NORMAL',stdout:actual,context:code.includes('// main 내부')?'클래스 선언은 main 바깥에, // main 내부 아래의 코드는 main 안에 있다고 가정합니다.':'',...options};
 c.comparison={ruleIds:[rule],lines:options.lines||[1]};cases.push(c);
};
const concept=(id,category,title,document,actual,claim,rule,explanation)=>add(id,category,title,document,actual,claim,rule,explanation,{kind:'concept',expectedStatus:null,stdout:null});
const error=(id,category,title,code,claim,rule,explanation)=>add(id,category,title,code,'컴파일 오류',claim,rule,explanation,{expectedStatus:'COMPILE_ERROR',stdout:''});
concept('b1','basics','소스 파일의 역할','파일: Hello.java\n내용: 사람이 작성한 자바 소스','자바 소스 파일','컴파일된 바이트코드 파일','basics-files','.java는 소스 파일입니다. 컴파일 결과의 .class와 역할이 다릅니다.');
concept('b2','basics','실행 환경 확인','대상: Hello.class\n실행 환경: 해당 운영체제용 JVM과 필요한 라이브러리','JVM이 클래스 형식을 읽어 실행','JVM이 클래스 형식을 읽어 실행','basics-jvm','JVM은 클래스 형식을 실행하며 해당 환경에 맞는 JVM이 필요합니다.');
concept('b3','basics','GC 회수 시점','상황: 객체를 가리키던 마지막 참조에 null 대입','즉시 회수는 보장되지 않음','즉시 회수가 보장됨','basics-gc','참조를 끊는 것과 실제 메모리 회수 완료는 다릅니다. 마지막 참조가 사라져도 회수 시점은 보장되지 않습니다.');
concept('b4','basics','개발 도구 확인','도구: javac\n입력 파일: Hello.java','자바 소스를 컴파일하는 도구','자바 소스를 컴파일하는 도구','basics-tools','JDK의 javac가 소스를 컴파일합니다. 일반적인 클래스 실행 명령 java와 구분합니다.');
add('t7','types','문자와 문자열','char letter = \'A\';\nSystem.out.print((int) letter);','65','A','types-text','char를 int로 변환하면 문자의 코드 단위 정숫값입니다. A는 65입니다.');
add('t8','types','진법 리터럴','System.out.print(0b1010 + 0xA);','20','20','types-literal','0b1010과 0xA는 모두 십진수 10입니다. 두 값의 합은 20입니다.');
add('t9','types','논리값 뒤집기','boolean ready = false;\nSystem.out.print(!ready);','true','false','types-bool','!는 논리값을 뒤집으므로 !false는 true입니다.');
add('t10','types','래퍼와 언박싱','Integer count = 4;\nint next = count + 1;\nSystem.out.print(next);','5','5','types-wrapper','Integer의 값 4가 연산 중 int로 언박싱됩니다. 1을 더해 5입니다.');
add('t11','types','실수에서 정수로','System.out.print((int) 3.9);','3','4','types-cast','이 범위의 실수를 int로 변환하면 반올림하지 않고 소수 부분을 버립니다. 결과는 3입니다.');
add('v1','variables','값 대입과 복사','int a = 3;\nint b = a;\na = 8;\nSystem.out.print(b);','3','8','variables-assign','b에는 대입 당시 a의 정숫값 3이 복사됩니다. 이후 a를 바꿔도 b는 3입니다.');
error('v2','variables','블록 밖의 이름','{\n    int n = 3;\n}\nSystem.out.print(n);','3','variables-scope','지역 변수 n의 범위는 선언된 블록 안입니다. 블록 밖에서 n을 읽으므로 컴파일 오류입니다.');
error('v3','variables','초기화 전 읽기','int n;\nSystem.out.print(n);','0','variables-init','지역 변수는 읽기 전에 값을 대입해야 합니다. int 필드의 기본값 규칙을 적용할 수 없습니다.');
error('v4','variables','상수의 재대입','final int LIMIT = 3;\nLIMIT = 4;','정상 종료 · 출력 없음','variables-final','final 변수 LIMIT을 초기화한 뒤 다시 대입하므로 컴파일 오류입니다.');
add('v5','variables','호출마다 생기는 지역 변수','class Counter {\n    int next() { int n = 0; return ++n; }\n}\n// main 내부\nCounter c = new Counter();\nSystem.out.print(c.next());\nSystem.out.print(c.next());','11','12','variables-scope','next를 호출할 때마다 지역 변수 n이 새로 만들어져 0으로 초기화됩니다. 두 호출 모두 1을 반환합니다.');
add('v6','variables','final 참조의 내부 변경','final int[] a = {2};\na[0] = 7;\nSystem.out.print(a[0]);','7','7','variables-final','a에 다른 배열을 대입하지 않고 기존 배열 내부만 바꿨습니다. final 참조에서도 가능한 변경입니다.');
add('op1','operators','곱셈의 우선순위','System.out.print(2 + 3 * 4);','14','20','operators-order','곱셈을 먼저 계산하여 2 + 12가 되므로 14입니다.');
add('op2','operators','삼항 연산의 선택','int age = 17;\nSystem.out.print(age >= 18 ? "성인" : "미성년");','미성년','미성년','operators-ternary','17 >= 18은 거짓이므로 콜론 뒤의 미성년을 선택합니다.');
add('op3','operators','OR의 단락 평가','int n = 0;\nboolean ok = true || (++n > 0);\nSystem.out.print(n);','0','1','flow-logic','||의 왼쪽이 true이므로 오른쪽 ++n을 실행하지 않습니다.');
add('op4','operators','비트 AND','System.out.print(6 & 3);','2','2','operators-bit','110과 011에서 두 비트가 모두 1인 자리는 010입니다. 십진수 2입니다.');
add('c1','conditions','break 없는 case','int n = 1;\nswitch (n) {\n    case 1: System.out.print("A");\n    case 2: System.out.print("B"); break;\n    default: System.out.print("C");\n}','AB','A','conditions-switch','case 1에서 A를 출력한 뒤 break가 없어 case 2도 실행합니다. B 뒤의 break에서 종료합니다.',{lines:[3,4]});
add('c2','conditions','일치하지 않는 case','int n = 4;\nswitch (n) {\n    case 1: System.out.print("A"); break;\n    default: System.out.print("D");\n}','D','D','conditions-switch','4와 일치하는 case가 없으므로 default의 D를 출력합니다.',{lines:[2,4]});
add('l1','flow','처음부터 거짓인 while','int n = 5;\nwhile (n < 3) { n++; }\nSystem.out.print(n);','5','6','flow-do','첫 조건 검사에서 거짓이므로 본문을 한 번도 실행하지 않습니다. n은 5입니다.',{lines:[2]});
add('l2','flow','향상된 for의 값','int[] a = {2, 4};\nint sum = 0;\nfor (int value : a) { sum += value; }\nSystem.out.print(sum);','6','6','flow-each','value에는 인덱스가 아니라 요소 2와 4가 차례로 들어갑니다. 합은 6입니다.',{lines:[3]});
add('l3','flow','반복 변수의 대입','int[] a = {2, 4};\nfor (int value : a) { value = 9; }\nSystem.out.print(a[0]);','2','9','flow-each','기본형 요소의 값이 반복 변수에 복사됩니다. value를 바꿔도 a[0]은 2입니다.',{lines:[2]});
add('a1','arrays','인덱스의 시작','int[] a = {4, 7};\nSystem.out.print(a[1]);','7','7','arrays-index','배열의 인덱스는 0부터이므로 두 번째 요소 a[1]은 7입니다.');
add('a2','arrays','2차원 배열의 행과 열','int[][] a = {{2, 4}, {6, 8}};\nSystem.out.print(a[1][0]);','6','4','arrays-matrix','행 인덱스 1은 {6, 8}이고 그 행의 열 인덱스 0은 6입니다.');
add('a3','arrays','바깥 배열만 복사','int[][] a = {{1, 2}};\nint[][] b = a.clone();\nb[0][0] = 9;\nSystem.out.print(a[0][0]);','9','1','arrays-shallow','바깥 배열만 새로 만들었고 내부 행은 공유합니다. b의 행을 통해 바꾼 값이 a에도 보입니다.',{lines:[2,3]});
add('a4','arrays','각 행까지 복사','int[][] a = {{1, 2}};\nint[][] b = new int[a.length][];\nfor (int i = 0; i < a.length; i++) {\n    b[i] = a[i].clone();\n}\nb[0][0] = 9;\nSystem.out.print(a[0][0]);','1','1','arrays-deep','모든 행을 clone하여 int 요소가 독립적으로 복사되었습니다. b를 바꿔도 a의 값은 1입니다.',{lines:[4]});
add('a5','arrays','새 배열의 기본값','int[] a = new int[3];\nSystem.out.print(a[2]);','0','0','arrays-index','new int[3]은 int 요소 3개를 모두 0으로 초기화합니다.');
add('o7','objects','객체마다 다른 필드','class Box { int n = 1; }\n// main 내부\nBox a = new Box();\nBox b = new Box();\na.n = 7;\nSystem.out.print(b.n);','1','7','objects-instance','a와 b는 new로 각각 만든 객체입니다. a의 인스턴스 필드를 바꿔도 b.n은 1입니다.');
add('o8','objects','인자 타입에 따른 오버로딩','class Label {\n    String read(int n) { return "정수"; }\n    String read(String s) { return "문자열"; }\n}\n// main 내부\nSystem.out.print(new Label().read("3"));','문자열','문자열','objects-overload','큰따옴표의 "3"은 String이므로 String 매개변수의 메서드를 선택합니다.',{lines:[3,6]});
error('o9','objects','반환 타입만 다른 메서드','class Label {\n    int read(int n) { return n; }\n    double read(int n) { return n; }\n}\n// main 내부\nSystem.out.print(new Label().read(3));','3','objects-overload','메서드 이름과 매개변수 타입이 같습니다. 반환 타입만 다르므로 오버로딩할 수 없습니다.');
add('h1','inheritance','생성자의 초기화','class Ticket {\n    int n;\n    Ticket(int value) { n = value; }\n}\n// main 내부\nSystem.out.print(new Ticket(7).n);','7','0','inheritance-ctor','new Ticket(7)이 생성자를 호출하여 필드 n에 7을 대입합니다. 기본값 0은 이 대입으로 바뀝니다.',{lines:[3]});
error('h2','inheritance','기본 생성자의 조건','class Ticket {\n    Ticket(int value) {}\n}\n// main 내부\nnew Ticket();','정상 종료 · 출력 없음','inheritance-ctor','인자 있는 생성자를 직접 선언했으므로 인자 없는 생성자가 자동으로 추가되지 않습니다.');
add('h3','inheritance','부모와 자식의 생성 순서','class Parent { Parent() { System.out.print("P"); } }\nclass Child extends Parent {\n    Child() { super(); System.out.print("C"); }\n}\n// main 내부\nnew Child();','PC','PC','inheritance-super','부모 생성자가 P를 출력한 뒤 자식 생성자 본문에서 C를 출력합니다.',{lines:[3]});
add('h4','inheritance','재정의된 메서드','class Parent { String name() { return "부모"; } }\nclass Child extends Parent {\n    @Override String name() { return "자식"; }\n}\n// main 내부\nParent p = new Child();\nSystem.out.print(p.name());','자식','부모','inheritance-override','변수 타입은 Parent이지만 실제 객체는 Child입니다. Child가 재정의한 name이 실행됩니다.',{lines:[3,7]});
add('p1','polymorphism','클래스가 공유하는 필드','class Count {\n    static int n = 0;\n    Count() { n++; }\n}\n// main 내부\nnew Count();\nnew Count();\nSystem.out.print(Count.n);','2','1','polymorphism-static','static 필드 n은 두 객체가 공유합니다. 생성자에서 두 번 증가하여 2입니다.',{lines:[2,3]});
error('p2','polymorphism','final 클래스의 상속','final class Parent {}\nclass Child extends Parent {}\n// main 내부\nSystem.out.print("OK");','OK','polymorphism-final','final 클래스 Parent를 상속하려고 했으므로 컴파일 오류입니다.');
error('p3','polymorphism','추상 클래스의 직접 생성','abstract class Shape {\n    abstract int size();\n}\n// main 내부\nnew Shape();','정상 종료 · 출력 없음','polymorphism-abstract','추상 클래스는 직접 인스턴스화할 수 없습니다. 구체적인 자식 클래스가 필요합니다.');
add('p4','polymorphism','인터페이스 타입으로 호출','interface Sound { String play(); }\nclass Bell implements Sound {\n    public String play() { return "딩"; }\n}\n// main 내부\nSound s = new Bell();\nSystem.out.print(s.play());','딩','딩','polymorphism-interface','Sound 타입 변수가 Bell 객체를 가리킵니다. 실제 Bell의 public play 구현을 호출합니다.',{lines:[3,7]});
add('p5','polymorphism','추상 메서드 구현','abstract class Shape { abstract int size(); }\nclass Square extends Shape {\n    int size() { return 4; }\n}\n// main 내부\nShape s = new Square();\nSystem.out.print(s.size());','4','4','polymorphism-abstract','구체 클래스 Square가 추상 메서드 size를 구현했습니다. 그 구현의 반환값 4를 출력합니다.',{lines:[3,7]});
concept('pk1','packages','import의 하위 패키지','선언: import java.util.*;\n검토 대상: java.util.concurrent의 타입','하위 패키지 타입은 포함하지 않음','하위 패키지 타입도 포함함','packages-name','와일드카드 import는 지정한 패키지의 타입을 대상으로 하며 하위 패키지까지 포함하지 않습니다.');
add('pk2','packages','완전한 이름 사용','int[] a = {1, 2};\nSystem.out.print(java.util.Arrays.toString(a));','[1, 2]','[1, 2]','packages-lang','완전한 이름 java.util.Arrays를 사용하므로 import 없이 해당 클래스를 지정할 수 있습니다.');
error('pk3','packages','다른 클래스의 private 필드','class Vault { private int code = 7; }\n// main 내부\nSystem.out.print(new Vault().code);','7','packages-access','Vault와 실행용 클래스는 별개의 최상위 클래스입니다. 같은 패키지라도 private 필드를 직접 읽을 수 없습니다.');
add('pk4','packages','접근 제어자 생략','class Note { int n = 7; }\n// main 내부\nSystem.out.print(new Note().n);','7','7','packages-access','Note와 실행용 클래스는 같은 패키지입니다. 접근 제어자를 생략한 필드 n에 접근할 수 있습니다.');
window.JavaInspectorData={javaRelease:21,curriculumVersion:2,topics,cases};
})();
