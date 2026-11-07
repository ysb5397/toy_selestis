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
  ysb/
    quiz.html                 # /ysb/quiz · 제작자 ysb
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

Node.js 20 이상에서 실행한다. 목록 생성과 미리보기에는 외부 패키지가 필요 없다.

```powershell
npm run build  # 목록만 갱신
npm run dev    # http://127.0.0.1:4192/ 로 미리보기
npm test       # 자동 수집과 카드 렌더링 검사
```

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
