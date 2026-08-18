# Signal Ledger Vercel 외부 배포 수정 가이드

작성일: 2026-08-18  
작성자: Manus AI

## 결론

현재 `https://hyperscaler-ssd.vercel.app`는 **정상적인 웹 페이지가 아니라 Express 서버 번들**을 정적 JavaScript 파일로 반환하고 있습니다. 재확인 결과 루트 요청은 `200 OK`이지만 `Content-Type: application/javascript; charset=utf-8`이고, 본문은 `server/_core/index.ts`에서 생성된 `dist/index.js` 번들로 시작합니다. 따라서 브라우저가 대시보드 HTML을 렌더링하지 못하는 것이 정상적인 결과입니다.

원인은 Vercel 프로젝트가 **Vite 프레임워크의 기본 출력 경로인 `dist`**를 사용하고 있기 때문입니다. 이 저장소의 빌드는 프런트엔드를 `dist/public/`에, Express 서버 번들을 `dist/index.js`에 각각 생성합니다. Vercel은 `dist`를 정적 산출물로 보아 `index.js`를 루트 엔트리로 제공했고, Express는 Vercel Function으로 등록되지 않았습니다.

> **권장 경로:** 외부 Vercel URL을 계속 운영해야 한다면, 단순한 `vercel.json` 한 파일 추가가 아니라 **Express용 Vercel Function 어댑터**와 `public/` 정적 산출물 분리를 함께 적용해야 합니다. 즉, `app.ts`가 Express 앱을 기본 내보내고, Vite 빌드는 Vercel 표준 정적 디렉터리인 `public/`을 생성하도록 구조를 바꿔야 합니다. Vercel은 Express 앱을 단일 Function으로 실행하며, `express.static()` 기반 정적 제공은 무시하므로 자산은 `public/**`에 둬야 합니다.[1]

| 확인 항목 | 실제 확인값 | 판단 |
|---|---|---|
| Vercel 프로젝트 | `Tychess / hyperscaler-ssd` | GitHub `tychess7/hyperscaler-ssd`의 `main` 브랜치와 연결됨 |
| 최신 배포 | `dpl_CHvFmjMqqckNygyCLGH86c2n4D2z`, 상태 `Ready` | 배포 성공은 빌드 성공일 뿐, 앱 런타임 성공을 보장하지 않음 |
| Framework Preset | `Vite` | 현재 문제의 직접 원인 |
| 명시 Build / Output 설정 | 없음; Vite 기본값 사용 | `pnpm build` 결과의 `dist`를 정적 결과물로 처리 |
| HTTP 루트 응답 | `200`, `application/javascript` | `dist/index.js`가 루트에서 직접 제공됨 |
| Function Invocations | `0` | Express 서버가 Function으로 실행되지 않음 |
| Runtime Logs | 요청 로그 없음, 오류 0건 | 서버 오류가 아니라 정적 산출물 라우팅 문제 |
| Project 환경 변수 | `No Environment Variables Added` | 정적 루트 문제를 해결한 뒤에도 DB·세션·OAuth·Forge 기능은 환경 변수 등록 전까지 동작하지 않음 |

## 왜 단순한 Output Directory 변경만으로는 부족한가

Vercel의 Output Directory를 `dist/public`으로 바꾸면, 최소한 루트에서 React 정적 화면은 HTML로 보일 수 있습니다. 그러나 이 앱의 로그인, 사용자별 SSD·서버 후보 저장, tRPC API, OAuth 콜백은 Express 서버에 구현되어 있습니다. 정적 배포만으로는 `/api/trpc`와 `/api/oauth/*`가 실행되지 않으므로 로그인과 영속 저장 기능은 동작하지 않습니다.

반대로 기존 `dist/index.js`를 Vercel Function 목적지로 직접 지정하는 방식도 권장하지 않습니다. 이 파일은 현재 앱을 생성하는 동시에 포트를 찾아 `server.listen()`하는 **전통적인 상주 서버 번들**이며, Vercel이 권장하는 기본 내보내기 방식의 Express Function이 아닙니다. 공식 문서는 프로젝트 루트의 `app.ts`·`index.ts`·`server.ts` 등에서 Express 앱을 기본 내보내거나 포트 리스너를 사용할 수 있다고 명시하지만, 정적 자산은 Express가 아닌 `public/**`으로 분리해야 한다고 안내합니다.[1] 또한 현대 `vercel.json`에서는 `functions`와 레거시 `builds` 설정을 함께 쓰지 않도록 권고합니다.[3]

## 권장 수정안: Express Function + Vite 정적 자산 분리

아래 변경은 **Manus 배포를 유지하면서 Vercel용 진입점만 추가하는 방식**입니다. 현재 Manus 런타임의 `server/_core/index.ts`를 그대로 Vercel에서 실행하지 않고, HTTP 앱 구성과 로컬 서버 기동을 분리합니다. 이 변경은 아직 적용하지 않았습니다.

| 변경 대상 | 수행 내용 | 목적 |
|---|---|---|
| `server/app.ts` 신규 | Express 앱, OAuth, tRPC, Storage Proxy 등록만 수행하는 `createApp()` 함수 생성 | 상주 포트 없이 재사용 가능한 HTTP 앱 구성 |
| 프로젝트 루트 `app.ts` 신규 | `export default createApp()` | Vercel이 감지하는 Express Function 진입점 |
| `server/_core/index.ts` 수정 | 기존 개발/Manus 기동용 `createServer()`와 `listen()`은 유지하되, `createApp()`을 가져와 사용 | Manus 개발·배포 동작 보존 |
| `vite.config.ts` 수정 | Vercel 빌드 시 산출물을 루트 `public/`으로, 그 외에는 기존 `dist/public/`으로 출력 | Vercel CDN 정적 자산 규칙 충족 |
| `vercel.json` 신규 | Framework·install·build·output 경로를 소스에서 고정 | 대시보드 기본값과 코드 산출물 불일치 제거 |

### 1. Express 앱을 기동 코드와 분리

`server/app.ts`를 만들고 현재 `startServer()` 안의 미들웨어 등록 부분을 옮깁니다. 여기에는 `app.listen()` 또는 포트 탐색 로직을 넣지 않습니다.

```ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  return app;
}
```

프로젝트 루트에 Vercel용 진입점 `app.ts`를 추가합니다. Vercel의 Express 문서는 루트 `app.ts`와 기본 내보내기 패턴을 지원합니다.[1]

```ts
import { createApp } from "./server/app";

export default createApp();
```

그 다음 `server/_core/index.ts`의 `startServer()`는 `const app = createApp()`을 사용한 뒤에만 기존 `setupVite()`, `serveStatic()`, `server.listen()` 흐름을 계속 실행하도록 바꿉니다. 이렇게 하면 Manus용 상주 Express 프로세스와 Vercel용 요청 단위 Function이 서로의 실행 모델을 침범하지 않습니다.

### 2. Vite의 Vercel 산출물을 `public/`에 생성

현재 Vite 설정의 `outDir`은 `dist/public`입니다. Vercel 빌드 환경에서만 프로젝트 루트 `public/`으로 전환합니다. Vercel의 Express 문서는 `express.static()`이 정적 자산을 제공하지 않으며 `public/**` 디렉터리를 사용해야 한다고 명시합니다.[1]

```ts
const isVercelBuild = Boolean(process.env.VERCEL);

export default defineConfig({
  // 기존 plugins, aliases, root, publicDir 유지
  build: {
    outDir: path.resolve(
      import.meta.dirname,
      isVercelBuild ? "public" : "dist/public"
    ),
    emptyOutDir: true,
  },
});
```

`client/public/`은 Vite의 입력용 정적 디렉터리로 계속 유지합니다. 위의 루트 `public/`은 Vercel 빌드가 생성하는 배포용 산출물입니다. 저장소에 빌드 산출물 `public/`을 커밋하지 않도록 `.gitignore`에 추가해야 합니다.

### 3. `vercel.json`으로 빌드 계약 고정

프로젝트 루트에 다음 파일을 추가합니다. 이 구성은 대시보드에 남아 있는 Vite 기본 `dist` 해석을 코드 차원에서 덮어씁니다. `vercel.json`의 `framework`, `buildCommand`, `installCommand`, `outputDirectory`는 프로젝트 설정을 재정의할 수 있습니다.[3]

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "express",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build",
  "outputDirectory": "public"
}
```

이 구성에는 `builds`를 추가하지 않습니다. `builds`는 레거시 방식이며, `functions` 설정과 병용할 수 없습니다.[3] 또한 SPA 전체를 무조건 `/index.html`로 rewrite하면 `/api/trpc`와 OAuth 콜백까지 React HTML로 바뀔 수 있으므로, 이 풀스택 앱에서는 API 경로를 확인하지 않은 포괄 rewrite를 먼저 추가하면 안 됩니다.

### 4. Vercel 대시보드와 환경 변수 반영

소스를 푸시한 뒤 Vercel은 `app.ts`를 Express Function으로 감지하고, `public/`을 CDN 정적 자산으로 사용해야 합니다. 대시보드의 Framework Preset도 `Express`로 보이는지 확인합니다. 소스의 `vercel.json`이 우선이지만, 대시보드에서 남아 있는 값이 있다면 Build Command는 `pnpm build`, Output Directory는 `public`, Install Command는 `pnpm install --frozen-lockfile`인지 일치시킵니다.

현재 Vercel Project 환경 변수는 **0개**입니다. Vercel에는 비밀값을 채팅이나 Git에 넣지 말고 **Production** 범위로 다음 변수를 등록해야 합니다. `VITE_` 접두어가 붙은 값은 Vite 빌드에 포함되므로 빌드 전에 등록해야 하며, 서버 전용 값은 Function 런타임에서 필요합니다.[2]

| 범주 | Vercel에 필요한 변수 이름 | 주의 사항 |
|---|---|---|
| 데이터베이스·세션 | `DATABASE_URL`, `JWT_SECRET` | Vercel Function에서 TiDB/MySQL에 네트워크 연결 가능한지 별도 확인 필요 |
| OAuth 서버 | `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME` | OAuth 공급자에 `https://hyperscaler-ssd.vercel.app/api/oauth/callback` 허용 여부를 확인 |
| Forge 서버 기능 | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Manus 전용 발급값의 외부 Vercel 사용 권한·수명은 별도 검증 필요 |
| Forge 브라우저 기능 | `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` | 브라우저에 노출되는 접두어이므로 최소 권한·도메인 제한 확인 필요 |
| 분석 | `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | 사용 중인 경우에만 등록 |

## 선택지 비교

| 선택지 | 구현 범위 | 로그인·DB 저장 | 권장도 | 적합한 경우 |
|---|---|---:|---:|---|
| **A. Vercel Function 어댑터** | 위의 Express 진입점·정적 자산 분리·환경 변수 구성 | 가능, 단 외부 DB/OAuth 연결 검증 필요 | 높음 | Vercel URL을 정식 서비스 URL로 유지해야 할 때 |
| B. 정적 화면만 Vercel에 배포 | Framework `Vite`, Build `pnpm build`, Output `dist/public` | 불가 | 제한적 | 공개 프로파일 조회만 제공하는 데모일 때 |
| **C. 현재 Manus 배포 유지** | 변경 없음 | 가능 | 가장 안전한 즉시 조치 | 모든 기능을 지금 바로 정상 운영해야 할 때 |
| D. Railway·Render·Fly.io로 이전 | Docker/Node 웹 서비스 설정 | 가능 | 높음 | 장시간 실행 프로세스나 더 직접적인 Node 운영 제어가 필요할 때 |

현재 정식 기능은 **Manus 배포 URL `https://hyperssd-rzlr2xse.manus.space`를 유지**하는 것이 가장 안전합니다. Vercel Function 어댑터는 외부 배포 요건이 있을 때 별도 브랜치에서 Preview로 검증한 다음 Production에 반영하는 것이 좋습니다. Vercel Function은 요청에 따라 확장·축소되는 서버리스 실행 환경이므로, DB 연결은 풀링 또는 서버리스 친화적인 구성으로 검증해야 합니다.[4]

## 재배포 및 검증 절차

먼저 별도 브랜치에서 위 소스 변경을 커밋하고 Pull Request 또는 Preview 배포를 만듭니다. Preview에서 아래 표를 순서대로 확인한 후에만 `main`에 병합합니다.

| 검증 단계 | 기대 결과 | 실패 시 확인할 항목 |
|---|---|---|
| 1. 빌드 | Vercel Build Logs가 `pnpm build`를 실행하고 `public/index.html` 생성 | `VERCEL` 환경 감지, Vite `outDir`, pnpm lockfile |
| 2. Function 감지 | Deployment Resources에서 Express Function 1개 이상 표시, Function Invocations 증가 | 루트 `app.ts`의 기본 내보내기, Framework가 `express`인지 확인 |
| 3. 루트 페이지 | `curl -I https://…vercel.app/`가 `Content-Type: text/html` | Output Directory가 `public`인지 확인 |
| 4. 정적 자산 | 브라우저 Network에서 CSS·JS 자산이 200으로 로드 | `public/assets/*` 생성, 자산 경로 확인 |
| 5. tRPC | `/api/trpc` 요청이 HTML이 아닌 tRPC 응답을 반환 | Express 앱 등록 순서, Function 로그 확인 |
| 6. OAuth | `/api/oauth/start`가 리디렉션하고 콜백 후 로그인 유지 | Vercel 콜백 URL 허용, `__Host-` 쿠키 Secure/HTTPS, Production 환경 변수 |
| 7. 저장 기능 | SSD·서버 후보 추가 후 새로고침해도 데이터 유지 | `DATABASE_URL` 접근성, DB 연결 제한·풀링 |
| 8. 회귀 테스트 | `pnpm test`, `pnpm check`, `pnpm build` 통과 | 소스 분리로 인한 import 경로·환경 변수 오류 |

이번 점검에서 로컬 자동 검증은 **14개 테스트 통과**, TypeScript 검사 통과, 프로덕션 빌드 통과를 확인했습니다. 다만 위 Vercel 어댑터 소스 변경과 Vercel 환경 변수 추가는 아직 적용하지 않았으므로, Vercel Production 동작 여부를 승인 없이 단정할 수 없습니다.

## 참고 문헌

[1] [Vercel, *Express on Vercel*](https://vercel.com/docs/frameworks/backend/express)  
[2] [Vercel, *Vite on Vercel*](https://vercel.com/docs/frameworks/frontend/vite)  
[3] [Vercel, *Static Configuration with vercel.json*](https://vercel.com/docs/project-configuration/vercel-json)  
[4] [Vercel, *Using Express.js with Vercel*](https://vercel.com/kb/guide/using-express-with-vercel)
