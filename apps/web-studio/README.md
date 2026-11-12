# Web Studio · toy.

원본 로컬 프로젝트 `C:\web_dashboard`를 공개 웹용으로 옮긴 소스다. 원본의 서버·작업 기록·OAuth 토큰·API Key는 복사하지 않았다.

- 배포 폴더: `public/ysb5397/web-studio/`
- 접속 경로: `/ysb5397/web-studio/`
- 예정 공개 주소: `https://toy.selestis.workers.dev/ysb5397/web-studio/`
- UI 테마: `public/shared/theme.css`와 `src/toy-theme.css`. 메인 index와 같은 검정·회색 배경, 흰색 주요 버튼, 시스템 글꼴이다. 캔버스에 편집 중인 웹페이지의 CSS는 독립적이다.

## 개발·빌드

저장소 루트 `C:\toy`에서 Node.js 22.12 이상을 사용한다.

```powershell
npm ci
npm run build
npm test
npm run dev
```

로컬 주소는 `http://127.0.0.1:4192/ysb5397/web-studio/`다. build는 타입 검사 → Vite 정적 빌드 → 프로젝트 목록과 업데이트 버전 생성 순서로 실행한다. `public/ysb5397/web-studio`는 생성물이며 원본은 `apps/web-studio/src`에서 편집한다. `npm run build:studio`는 편집기만 빌드하므로 실제 배포 전에는 전체 build도 실행한다.

`wrangler.jsonc`는 기존 toy assets에 `worker/index.mjs`를 더한다. `/ysb5397/web-studio/api/*`만 Worker 우선으로 처리하며, 다른 프로젝트는 기존 정적 경로를 유지한다. 기존 배포 방식에서 `npx wrangler deploy`를 실행하면 build가 포함된다. 이번 작업에서는 배포하지 않았다.

## 보존한 기능

HTML/CSS/JS 편집, 부모·자식 트리, 블록 추가·이동·삭제, 속성 편집, 실행 미리보기, JSON 기록 백업·복원, HTML 가져오기·내보내기, 가상 커서 데모, 모션 타임라인과 클릭 동작 연결을 포함한다.

## 브라우저 저장

웹 서버에서 모든 방문자가 같은 로컬 파일을 공유하지 않도록, 문서·되돌리기 기록·대화를 브라우저 IndexedDB에 저장한다. 새로고침·다시 열기 후 복원하고 여러 탭의 오래된 저장이 새 기록을 덮어쓰지 않도록 revision을 비교한다. 기존 브라우저 복구 캐시는 보조 수단으로 유지한다.

기록은 기기·브라우저·출처마다 별개다. 로컬 미리보기와 공개 서버의 저장소도 서로 다르다. 사이트 데이터를 삭제하면 기록도 사라지므로 중요한 문서는 **기록 백업**이나 **내보내기**로 따로 보관한다. 로컬 버전의 기존 작업은 로컬에서 기록 백업을 받은 다음 웹 버전의 **열기**로 가져올 수 있다.

## GPT

공개 웹 버전에서는 **API 사용량 결제**를 선택해 본인의 API Key를 연결한다. Key는 현재 탭의 모듈 메모리에만 보관하며 새로고침하면 사라진다. 연결 상태·브라우저 작업 기록·대화·배포 파일에 Key를 저장하지 않는다.

요청을 보낼 때만 HTTPS Authorization 헤더로 이 사이트의 Worker에 전달하고, Worker가 고정 OpenAI API 주소로 전달한다. 사이트 운영자 Key나 공유 Key는 사용하지 않으며, 방문자 Key를 서버에 저장하지 않는다. 문서와 최근 대화를 OpenAI로 보내고 해당 Key의 API 사용 요금이 발생한다. 자동 재시도나 플랜 → API 결제 전환은 없다.

Worker 코드가 포함되지 않은 정적 파일 호스팅에서도 편집·저장은 가능하지만 GPT 요청은 사용할 수 없다. 일반 `npm run dev` 미리보기에도 같은 API 처리기를 연결해 두었다. 실제 OpenAI 호출과 공개 서버 동작은 아직 검증하지 않았다.

## OAuth 범위

앞서 구현한 OAuth는 로컬 앱용이다. 공개 웹의 원격 서버로 토큰·콜백을 그대로 옮기지 않는다. 이 버전의 플랜 탭에는 미지원 안내를 표시하고 로그인 버튼을 비활성화한다. 로컬 OAuth 버전은 원래 프로젝트에 남아 있다. 공개 호스팅 앱의 공식 OAuth 등록·지원 조건을 갖춘 다음 별도로 연결해야 한다. [공식 지원 범위](https://developers.openai.com/siwc/token-sharing-open-source)

## 검증

`npm test`는 기존 카탈로그·페이지 회귀 검사, 편집기 문서·명령·타임라인·클릭 연결 검사, IndexedDB 재열기·동시 쓰기 충돌·Key 비저장·경로·Worker 스트리밍·출처 검사를 포함한다. 테스트용 OpenAI 응답을 사용하며 실제 사용자의 Key는 사용하지 않는다.

2026-11-12 확인: 테스트 79개 통과·플랫폼 제약으로 심볼릭 링크 검사 1개 건너뜀, 프로덕션 빌드 통과, `wrangler deploy --dry-run`으로 ASSETS 바인딩과 Worker 묶음 검증 완료. 실제 업로드는 하지 않았다. 브라우저에서 메인 카드 → 하위 경로 진입, 블록 추가·저장 → 새로고침 복원 → 실행 취소를 확인했다.
