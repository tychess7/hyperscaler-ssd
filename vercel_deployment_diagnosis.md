# Vercel 외부 배포 진단 기록

## 2026-08-18: 프로젝트 식별

- 사용자 로그인 후 Vercel 팀 대시보드에서 **Tychess Hobby** 범위의 `hyperscaler-ssd` 프로젝트를 확인했다.
- 프로젝트는 GitHub 저장소 `tychess7/hyperscaler-ssd`와 연결되어 있으며, 공개 프로덕션 도메인은 `https://hyperscaler-ssd.vercel.app`이다.
- 최신 프로덕션 배포 식별자는 대시보드 URL 기준 `dpl_CHvFmjMqqckNygyCLGH86c2n4D2z`로 표시된다.
- 최신 프로덕션 배포는 `main` 브랜치의 커밋 `22ef231`에서 생성됐으며 상태는 `Ready`다. 그러나 관측 지표는 Edge Requests 22건, Function Invocations 0건으로, Express 서버 번들이 Vercel Function으로 실행되지 않았음을 뒷받침한다.
- 프로젝트 런타임은 Node.js 24.x, Fluid Compute 활성화, `iad1` 리전으로 표시된다. 이는 플랫폼 런타임의 기본 설정이며, 앱이 Serverless Function으로 구성됐다는 증거는 아니다.
- **Build and Deployment** 설정에서 Framework Preset은 `Vite`이며 Root Directory는 `./`다. Build Command, Output Directory, Install Command, Development Command에는 각각 기본 안내문만 보이고 명시적 재정의가 표시되지 않았다. 따라서 Vercel의 Vite 기본값(`npm run build`, `dist`)이 적용되는 구성으로 판단된다.
- 이 저장소의 `build` 스크립트는 프론트엔드 결과물 `dist/public/`과 Express 서버 번들 `dist/index.js`를 함께 만든다. Vercel의 Vite 기본 출력 경로 `dist`가 두 산출물을 구분하지 못해, 루트 요청에서 `dist/index.js`를 정적 JavaScript로 제공하는 현재 증상과 일치한다.
- 프로덕션 배포의 Runtime Logs에는 같은 기간의 요청 로그가 없고 Warning/Error/Fatal도 0건이다. Vercel Function 요청이 생성되지 않았다는 관측 결과와 일치하며, 이는 서버 런타임 오류가 아니라 정적 산출물 라우팅·출력 경로 구성 문제라는 결론을 보강한다.
- Environment Variables 설정 화면을 재확인한 결과, 프로젝트 범위에는 **등록된 환경 변수가 전혀 없다**. 따라서 `DATABASE_URL`, `JWT_SECRET`, OAuth·Forge 관련 필수 값은 현재 Vercel Production에 주입되지 않는다.
- 이전 연결 조회에서 팀 API 프로젝트 목록이 비어 있었으므로, 후속 확인은 로그인된 Vercel 대시보드에서 프로젝트 설정·배포 세부정보·빌드 로그를 직접 확인한다.
