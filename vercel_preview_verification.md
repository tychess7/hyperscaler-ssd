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
