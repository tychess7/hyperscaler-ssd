# Vercel Function Preview 검증 기록

## 대상

Vercel Function 어댑터는 `feat/vercel-function-preview` 브랜치의 커밋 `0c1e12a`에 적용했다. 이 브랜치는 `main`에서 분리됐으며, Vercel Production 배포에는 반영되지 않았다.

## 초기 Preview 배포

Vercel은 `https://hyperscaler-ssd-git-feat-vercel-function-preview-tychess.vercel.app` 브랜치 별칭과 `https://hyperscaler-5fwgr4k7s-tychess.vercel.app` Preview URL을 생성했다. 배포 초기 확인 시 상태는 `Building`이었으며, 완료 후 빌드 로그와 HTTP 응답을 재검증한다.

## 1차 배포 오류와 수정

커밋 `0c1e12a`의 첫 Preview는 `No entrypoint found in output directory: "public"` 오류로 실패했다. `outputDirectory: "public"`을 지정하면 Vercel이 빌드 산출물만 배포 루트로 취급해 프로젝트 루트의 `app.ts` Function 진입점을 찾지 못한다. Express 배포에서 `public/**`은 정적 자산 디렉터리로 자동 처리되므로, 수정 커밋에서는 `outputDirectory`를 제거하고 Vercel이 루트 `app.ts`와 생성된 `public/`을 함께 감지하도록 변경한다.

커밋 `925a9a1`의 두 번째 Preview는 별도 URL `https://hyperscaler-2r21s8a78-tychess.vercel.app`로 생성됐고, 초기 확인 시 `Building` 상태였다. 완료 시 Function 감지와 HTTP 응답을 확인한다.

## 2차 배포 오류와 수정

두 번째 Preview는 `No entrypoint found which imports express. Found possible entrypoint: app.ts` 오류로 실패했다. `app.ts`가 `createApp()`만 간접 호출했기 때문에 Vercel Express 프레임워크 감지기가 루트 파일 자체에서 Express 가져오기를 식별하지 못했다. 다음 수정에서는 `app.ts`가 `express`를 직접 가져오고 `configureApp(express())`로 Function 앱을 생성하도록 변경한다.

## 3차 Preview 상태

커밋 `0e2f817`은 Vercel에서 `Ready`로 빌드됐고 Preview URL은 `https://hyperscaler-jhulxgkwg-tychess.vercel.app`이다. 그러나 루트 요청은 `500 FUNCTION_INVOCATION_FAILED`로 실패했다. 이는 Function 감지는 성공했지만 런타임 초기화 또는 요청 처리 중 예외가 발생했음을 뜻하므로, Production 반영 전에 Runtime Logs에서 원인을 해결해야 한다.

Runtime Logs는 `/var/task/app.js`가 확장자 없는 `./server/app`을 가져오려다 `ERR_MODULE_NOT_FOUND`가 발생했음을 보여 줬다. Vercel Node Function이 TypeScript 내부 모듈을 `.js`로 내보내지만 원본 확장자 없는 ESM 가져오기를 자동 변환하지 않기 때문이다. 커밋 `7eec75a`에서 Function이 따라가는 서버 내부 상대 경로에 명시적 `.js` 확장자를 적용했고, 새 Preview URL `https://hyperscaler-mkfqdmre7-tychess.vercel.app`의 빌드 완료와 HTTP 응답을 재확인한다.

커밋 `7eec75a`의 Preview는 Vercel에서 `Ready`로 빌드 완료됐다. 다음 단계는 해당 URL의 루트 HTML, 정적 자산, tRPC 및 OAuth 시작 엔드포인트를 실제 요청으로 검증하는 것이다.

로그인된 Vercel 브라우저 세션으로도 최신 Preview의 루트가 `500 FUNCTION_INVOCATION_FAILED`를 반환하는 것을 재현했다. 해당 배포의 Runtime Logs가 초기 로딩 상태이므로, 로그 완성 후 남은 초기화 예외를 확인한다. Preview 보호는 명령행 요청을 Vercel SSO로 리디렉션하지만, 브라우저 세션에서는 실제 Function 500을 확인할 수 있다.

최신 Runtime Logs는 `server/routers.js`가 TypeScript 경로 별칭 `@shared/const`를 Node 패키지로 해석하려다 실패한 것을 보여 줬다. Vercel Function의 Node ESM 런타임은 이 별칭을 알지 못하므로, Function 실행 경로의 `@shared/*` 가져오기를 명시적 `shared/*.js` 상대 경로로 전환한다.

커밋 `6b02119`는 새 Preview URL `https://hyperscaler-6sbppmuz9-tychess.vercel.app`로 생성됐다. 이후 Vercel 대시보드 브라우저 세션이 `about:blank`로 전환돼 상태는 HTTP 요청과 재접속으로 확인한다.

최신 Preview URL은 브라우저 확인 시 계속 `Deployment is building` 상태였다. 배포가 완료된 후 Function 런타임과 환경 변수 의존 경로를 재검증한다.

커밋 `6b02119`의 Function은 더 이상 모듈 오류 없이 기동됐지만 루트에서 `Cannot GET /`를 반환했다. 이는 Express Function이 정상 실행되는 반면, Vite가 생성한 `public/index.html`을 Function이 제공하지 못한다는 뜻이다. 다음 수정에서는 `public/**`을 Function 포함 파일로 명시하고, API 라우트 등록 뒤에 `express.static(publicDir)` 및 SPA 폴백을 추가한다.

정적 자산 제공 보완 커밋 `0a42617`은 새 Preview URL `https://hyperscaler-h92wrax9k-tychess.vercel.app`로 생성됐으며, 초기 확인 시 `Building` 상태였다. 빌드 완료 후 루트와 API 경로를 검증한다.

Vercel 배포 목록을 재확인한 결과, `0a42617`은 계속 빌드 중이었다. 이전 Function 어댑터 커밋들은 모두 Ready 상태이므로, 이 배포의 완료 이후 HTTP 응답만 확인하면 된다.

커밋 `0a42617`의 Preview는 Vercel에서 `Ready`로 빌드 완료됐다. 이제 `https://hyperscaler-h92wrax9k-tychess.vercel.app`에서 루트 페이지 및 API 경로를 실제로 검증한다.

실제 검증에서 루트는 `Signal Ledger · Hyperscaler SSD Intelligence` 대시보드 HTML을 정상 렌더링했고, 정적 CSS·JavaScript가 로드돼 전체 UI가 표시됐다. `/api/trpc/auth.me`는 HTML이 아닌 `{"result":{"data":{"json":null}}}` JSON을 반환했다. 즉, Function·SPA·tRPC 공개 경로는 Preview에서 정상 동작한다. OAuth 시작과 사용자 저장 기능은 Vercel 환경 변수와 OAuth 콜백 허용 구성이 없으므로 Production 환경 설정 후에 검증한다.

GitHub `main`은 커밋 `a78a4bf`까지 fast-forward로 반영됐고, Vercel은 `https://hyperscaler-q5tabmw3h-tychess.vercel.app`에서 새 **Production** 배포를 생성했다. 확인 시 상태는 `Building`이었으며, 기존 `https://hyperscaler-ssd.vercel.app`은 이전 배포의 서버 번들을 아직 제공하고 있었다. 새 Production 빌드가 준비된 뒤 고정 도메인의 응답을 재검증한다.

커밋 `a78a4bf`의 Vercel Production 배포는 `Ready` 상태로 완료됐다. 이제 고정 Production 도메인의 웹 및 API 응답을 확인한다.

고정 Production 도메인 `https://hyperscaler-ssd.vercel.app`은 이제 JavaScript 서버 번들이 아니라 Signal Ledger 대시보드 HTML을 정상 렌더링한다. 정적 자산과 인터랙티브 필터 UI도 로드됐고, `/api/trpc/auth.me`는 비로그인 상태에 맞는 `{"result":{"data":{"json":null}}}` JSON을 반환했다.

`/api/oauth/start`는 `{"error":"OAuth start is not configured"}`를 반환했다. 이는 Vercel Production Project 환경 변수가 0개인 상태와 일치한다. 따라서 공개 대시보드·tRPC 공개 경로의 배포는 정상이나, 로그인·후보 저장 기능은 `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `JWT_SECRET`, `DATABASE_URL` 및 Forge 관련 Vercel 환경 변수와 Production 콜백 URL 등록 전까지 비활성 상태다.

검증 기록 커밋 `a11a9d2`로 인해 Vercel은 최종 Production 배포 `https://hyperscaler-kr4rl9e4s-tychess.vercel.app`를 추가로 생성했다. 해당 배포는 확인 시 `Building` 상태였으며, 코드 변경이 없는 기록 커밋이므로 준비 완료 상태만 확인한다.

최종 Production 배포는 재확인 시에도 빌드 진행 중이었다. 이전 Production 커밋 `a78a4bf`는 이미 Ready이며, 고정 도메인에서 대시보드와 tRPC 응답을 검증했다.
