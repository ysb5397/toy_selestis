# toy. 프로젝트 모음

`public` 아래에 제작자 이름으로 폴더를 만들고 HTML을 넣으면, 배포 전에 자동으로 프로젝트 카탈로그를 생성한다. 메인 화면은 이 목록을 불러와 카드와 제작자를 표시한다. 카드 HTML이나 중앙 목록을 직접 편집할 필요가 없다.

```text
public/
  index.html                  # 공통 메인
  catalog.js                  # 공통 카드 표시
  projects.json               # 자동 생성되는 목록
  ggm/
    prac_circuit.html         # /ggm/prac_circuit · 제작자 ggm
    prac_sequence.html        # /ggm/prac_sequence · 제작자 ggm
    sequence.css
    sequence-app.js
  ysb5397/
    quiz.html                 # /ysb5397/quiz · 제작자 ysb5397
```

## 프로젝트 추가

1. `public/개발자명/` 아래에 HTML과 필요한 파일을 넣는다. 하위 폴더를 더 만들어도 제작자는 첫 번째 폴더 이름이다.
2. HTML에 `<title>`과 `<meta name="description">`을 작성한다. 제목이 없으면 첫 번째 `h1`, 그것도 없으면 파일명을 사용한다. 설명이 없더라도 카드는 표시된다.
3. 기존처럼 `배포.bat` 또는 `npx wrangler deploy`를 실행한다. `wrangler.jsonc`의 build 명령이 목록을 먼저 갱신한다.

```html
<head>
  <title>나의 새 프로젝트</title>
  <meta name="description" content="무엇을 해볼 수 있는지 한 문장으로 소개해 줘.">
</head>
```

파일을 추가·수정·삭제하거나 개발자 폴더명을 바꾼 내용은 다음 목록 생성 때 반영된다. 브라우저가 서버 디렉터리를 직접 탐색하는 방식이 아니므로, 배포 시 목록 생성을 생략하지 않는다. ZIP을 직접 업로드할 때도 `npm run build`로 갱신한 `public` 전체를 사용한다.

`index.html`은 개발자 폴더 안에 있으면 그 폴더의 프로젝트로 등록된다. 공통 루트 `index.html`, `404.html`, 숨김 경로, 심볼릭 링크와 `node_modules`·`assets`·`vendor` 폴더는 목록에서 제외한다. 프로젝트의 CSS/JS는 같은 폴더에 두고 `src="app.js"`, `href="style.css"`처럼 상대 경로로 연결하면 된다.

## 선택 메타데이터

필수는 아니다. 설정하지 않으면 HTML의 제목과 설명을 그대로 사용하며 카드 표지는 내용에 맞춰 기본 도식으로 선택한다. 제작자는 메타데이터가 아닌 디렉터리 이름에서 가져온다.

```html
<meta name="toy:title" content="카드에만 쓸 짧은 제목">
<meta name="toy:tags" content="학습, 게임">
<meta name="toy:category" content="학습">
<meta name="toy:cover" content="code">
<meta name="toy:hidden" content="true">
```

`toy:cover`는 `code`, `grid`, `circuit`, `sequence`를 지원한다. `toy:hidden=true`는 보조 HTML이나 테스트 페이지를 카드 목록에서만 제외한다. 해당 페이지의 직접 접속을 막는 기능은 아니다.

## 로컬 확인

Web Studio 빌드를 포함하므로 Node.js 22.12 이상에서 처음에는 `npm ci`로 의존성을 설치한다. 목록 수집 자체는 계속 외부 패키지 없이 실행할 수 있다.

```powershell
npm run build  # Web Studio 빌드 후 목록·버전 갱신
npm run dev    # http://127.0.0.1:4192/ 로 미리보기
npm test       # 자동 수집과 카드 렌더링 검사
```

## Web Studio

`/ysb5397/web-studio/`에 코드·블록·캔버스 웹 편집기를 추가했다. 소스는 `apps/web-studio`, 배포 파일은 `public/ysb5397/web-studio`에 있다. 공통 index 테마를 적용하고 메인 프로젝트 목록에 자동 등록한다.

브라우저별 작업 저장·기록 복원과 개인 API Key를 사용하는 GPT Worker를 포함한다. Worker 설정은 기존 정적 프로젝트 경로를 유지하며 편집기 API 경로만 처리한다. 로컬 앱용 ChatGPT OAuth는 공개 웹에 그대로 이식하지 않았고 로컬 원본에 유지했다. 설치·배포 구성과 차이는 [Web Studio 안내](apps/web-studio/README.md)를 참고한다.

미리보기 중에는 메인을 새로고침하면 목록이 다시 생성되므로, 파일을 추가할 때마다 서버를 재시작할 필요가 없다.

## GitHub 연결 후 Cloudflare 설정

저장소 루트에 `package.json`, `scripts`, `public`, `wrangler.jsonc`를 함께 올린다. `.wrangler`, `work`, `outputs`, ZIP과 환경변수 파일은 `.gitignore`로 제외한다.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Cloudflare Workers Builds는 Wrangler의 custom build 설정만으로는 빌드를 실행하지 않으므로, GitHub 자동 배포에서는 Build command도 지정한다. [공식 문서](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)


## 공통 디자인

PICK+O를 기준으로 모든 페이지의 디자인을 통일했다. 공통 CSS와 정적 앱 파일 구성은 [DESIGN.md](DESIGN.md)를 참고한다. 카드 표지는 code, grid, circuit, sequence 외에 lotto도 지원한다.


## 검색과 카테고리

메인 검색은 제목·설명·제작자·태그·카테고리를 함께 찾는다. 대소문자와 이름의 기호 차이(PICK+O / picko)를 구분하지 않고, 여러 단어를 입력하면 모두 포함하는 프로젝트를 찾는다. 카테고리와 검색을 함께 사용할 수 있으며 필터 초기화로 전체 목록에 돌아온다.

카테고리는 HTML의 toy:category 메타데이터가 있으면 그 값을 사용한다. 없으면 기존 표지와 제목·설명을 기준으로 회로 실습, 퀴즈, 번호·통계, 게임, 도구, 기타로 자동 분류한다. 새 카테고리는 배포 시 목록에 자동으로 생긴다. 필터의 숫자는 전체 카탈로그 기준이며, 검색 결과 수는 별도로 표시한다.

## 업데이트 안내와 진행 상태 저장

빌드 시 scripts/build-version.cjs가 public의 파일 내용을 해시해 version.json과 각 HTML의 toy:build 값을 갱신한다. 파일이 바뀌지 않으면 버전도 바뀌지 않는다. 기존 npm run build / wrangler deploy 과정에 연결되어 있어 별도 명령은 필요 없다. HTML에 공통 runtime.js와 runtime.css가 자동 연결된다. _headers는 새 파일을 재검증하도록 설정한다.

열려 있는 페이지는 60초마다, 탭으로 돌아왔을 때 새 버전을 확인한다. 업데이트/나중에 모달을 표시하고, 적용 직전에 버전을 다시 확인한다. 오프라인에서는 기존 화면을 유지한다. 저장 실패 시 자동으로 새로고침하지 않는다. 처음 이 기능을 배포할 때 이미 열려 있던 이전 페이지에는 감지 코드가 없으므로 한 번 직접 새로고침해야 한다.

진행 상태는 localStorage의 toy:progress:<경로>에 저장된다. 메인 검색/카테고리, 퀴즈 문제/답안/채점 여부, 논리 회로 입력/표시 설정, 시퀀스 회로 전원/릴레이/기록, PICK+O 설정/추천 결과/입력 초안을 복원한다. 시퀀스 PB는 항상 놓은 상태로 복원하고 자기유지는 회로 조건에 따라 유지한다. PICK+O 계산 도중의 연산 자체는 재개하지 않으며 마지막 완료 결과를 보존한다. 저장은 입력 후와 페이지를 떠날 때 수행하고 비동기 결과도 주기적으로 확인한다. 같은 브라우저와 출처에서만 유지되며 여러 탭에서 같은 프로젝트를 편집하면 마지막 저장 상태가 남는다.

큰 변경으로 기존 진행 상태를 사용할 수 없을 때는 해당 HTML의 다음 숫자만 올린다. 배포 버전과 별도로 관리하며 일반적인 디자인 수정에는 올리지 않는다.

```html
<meta name="toy:state-version" content="2">
```

모달은 초기화 후 메인으로 이동한다고 미리 안내한다. 새 페이지는 저장 형식 버전 불일치 또는 복원 불가능한 데이터를 발견하면 해당 프로젝트의 진행 상태만 지우고 /로 이동해 안내한다. 페이지가 삭제된 경우에도 업데이트 모달에서 메인으로 이동한다. 새 프로젝트의 상태 저장은 ToyRuntime.register({capture, restore})로 연결한다. capture는 JSON으로 저장 가능한 데이터만 반환하고 restore는 검증 후 화면을 다시 그린다. 데이터 변환이 필요한 변경은 restore에 변환 로직을 추가하고 동일 형식 버전을 유지하거나 별도 마이그레이션을 설계한다.

## 제작자 카드 애니메이션

ysb5397 제작자의 PICK+O 번호 공과 카르노 맵 칸에 anime.js 4.5.0을 적용한다. 850ms 전진 → 850ms 복귀 → 1000ms 대기를 반복하고 호버 해제 시 220ms 동안 원상 복귀한다. 다른 제작자의 카드는 기존 표시를 유지한다. 모션 감소 설정 및 터치 입력에서는 반복을 실행하지 않는다. 필터로 카드를 제거하거나 탭을 숨기면 반복을 정리한다. anime.js 배포 파일과 MIT 라이선스는 public/shared/vendor에 포함한다.

제작자 폴더는 ysb5397이다. 이전 /ysb/quiz와 /ysb/pick_o는 같은 출처의 새 주소로 연결하고, 기존 localStorage 진행 상태를 새 경로로 한 번 가져온다.

PICK+O 카드 표지는 공 6개를 회전 없는 수평 기준선에 배치한다. 로또 카드만 왕복 시간을 1500ms씩으로 늘렸으며 공별 높이·시차·회전·입체 이동과 바닥 그림자가 같은 재생 위치를 따라 움직인다. 역재생 후 정확히 초기 배열로 복귀하고 1000ms 기다린다. 호버 해제 복귀는 420ms이며 퀴즈 카드의 기존 동작은 유지한다.
