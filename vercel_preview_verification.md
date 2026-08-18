# Vercel Function Preview 검증 기록

## 대상

Vercel Function 어댑터는 `feat/vercel-function-preview` 브랜치의 커밋 `0c1e12a`에 적용했다. 이 브랜치는 `main`에서 분리됐으며, Vercel Production 배포에는 반영되지 않았다.

## 초기 Preview 배포

Vercel은 `https://hyperscaler-ssd-git-feat-vercel-function-preview-tychess.vercel.app` 브랜치 별칭과 `https://hyperscaler-5fwgr4k7s-tychess.vercel.app` Preview URL을 생성했다. 배포 초기 확인 시 상태는 `Building`이었으며, 완료 후 빌드 로그와 HTTP 응답을 재검증한다.

## 1차 배포 오류와 수정

커밋 `0c1e12a`의 첫 Preview는 `No entrypoint found in output directory: "public"` 오류로 실패했다. `outputDirectory: "public"`을 지정하면 Vercel이 빌드 산출물만 배포 루트로 취급해 프로젝트 루트의 `app.ts` Function 진입점을 찾지 못한다. Express 배포에서 `public/**`은 정적 자산 디렉터리로 자동 처리되므로, 수정 커밋에서는 `outputDirectory`를 제거하고 Vercel이 루트 `app.ts`와 생성된 `public/`을 함께 감지하도록 변경한다.
