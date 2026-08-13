# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js (App Router) + Supabase 기반 스타터킷. `@supabase/ssr`을 사용해 쿠키 기반 인증 세션을 App Router 전체(Client/Server Components, Route Handlers, Proxy)에서 공유한다. UI는 shadcn/ui(new-york style) + TailwindCSS. `next.config.ts`에서 `cacheComponents: true`가 활성화되어 있어 Next.js 16 기반 프로젝트다.

## 명령어

`package.json`에 정의된 스크립트는 다음 네 가지뿐이다:

```bash
npm run dev      # 개발 서버 (Turbopack)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint (next/core-web-vitals, next/typescript)
```

타입 체크 전용 스크립트는 없다 — 필요하면 `npx tsc --noEmit`을 직접 실행한다. 테스트 러너와 포맷터(Prettier)도 설정되어 있지 않다.

DB 마이그레이션은 `supabase/migrations/`에 SQL 파일로 존재하지만 `supabase/config.toml`이 없어 로컬 Supabase CLI 스택(`supabase start`)은 구성되어 있지 않다. `.mcp.json`에 연결된 Supabase MCP 서버(project_ref: `dmsinrvnbznvipmmntho`)의 `mcp__supabase__apply_migration` / `list_migrations` 등으로 원격 프로젝트에 직접 적용하는 워크플로우를 사용한다.

## 아키텍처

### 디렉토리 구조 (실제 — `src/` 없음)

`app/`, `components/`, `lib/`이 프로젝트 루트에 바로 위치한다. TS 경로 별칭은 `@/*` → `./*` (tsconfig.json), shadcn 별칭은 `components.json`에 `@/components`, `@/lib`, `@/components/ui`, `@/hooks`로 정의되어 있다(단 `hooks/` 폴더는 아직 없음).

- `app/` — 라우트. `app/auth/*`(login, sign-up, forgot-password, update-password, confirm route handler, error), `app/protected/*`(인증 필요 페이지, 자체 레이아웃 포함), `app/instruments/page.tsx`(Supabase 테이블 조회 예시)
- `components/` — `ui/`는 shadcn/ui 원시 컴포넌트, `tutorial/`은 스타터킷 온보딩용, 나머지는 auth/테마 관련 컴포넌트가 평평하게 위치
- `lib/supabase/` — Supabase 클라이언트 3종 (`client.ts`, `server.ts`, `proxy.ts`) + `database.types.ts`(자동 생성 타입)
- `supabase/migrations/` — SQL 마이그레이션

### Supabase 클라이언트 3분할 패턴

Server-rendering 환경(Fluid compute)에서는 클라이언트를 전역 변수에 두면 안 되므로, 컨텍스트별로 별도 팩토리 함수를 둔다:

- `lib/supabase/client.ts` — `createBrowserClient`, Client Component에서 사용
- `lib/supabase/server.ts` — `createServerClient` + `next/headers`의 `cookies()`, Server Component/Server Action에서 매 호출마다 새로 생성해서 사용
- `lib/supabase/proxy.ts` — `updateSession()`, 세션 쿠키를 갱신하고 미인증 사용자를 리다이렉트. 루트의 `proxy.ts`(Next.js 16의 `middleware.ts` 대체 — 파일명·함수명 모두 `proxy`로 변경됨)에서 호출됨

세 클라이언트 모두 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 환경변수를 사용한다(`.env.local`).

`lib/supabase/proxy.ts`의 리다이렉트 미체크 경로는 `/`, `/login`으로 시작하는 경로, `/auth`로 시작하는 경로다. 실제 로그인 페이지는 `app/auth/login`에 있으므로 `/auth` 프리픽스 체크가 실질적으로 적용되는 조건이고, `/login` 체크는 현재 라우트 구조상 도달하지 않는다 — 새 인증 관련 경로를 추가할 때 이 matcher 로직을 참고할 것.

### 데이터베이스 (Supabase Postgres)

`profiles` 테이블은 `auth.users`의 1:1 확장이며 `supabase/migrations/20260813120000_create_profiles.sql`에 전체 패턴이 정의되어 있다:
- RLS 활성화, `authenticated` 롤에 대해 본인 행만 select/insert/update 가능한 정책
- `on_auth_user_created` 트리거로 회원가입 시 프로필 행 자동 생성 (`security definer`, `set search_path = ''`)
- `on_auth_user_email_updated` 트리거로 이메일 변경 동기화
- 후속 마이그레이션(`20260813120100_...`)에서 트리거 전용 함수의 PostgREST RPC 노출(`/rest/v1/rpc/...`)을 `revoke execute`로 차단

새 테이블을 추가할 때는 이 RLS + trigger + RPC 노출 차단 패턴을 따르고, 스키마 변경 후에는 `mcp__supabase__generate_typescript_types`로 `database.types.ts`를 재생성해야 타입이 동기화된다.

### MCP 서버 연동 (`.mcp.json`)

이 프로젝트에는 `supabase`(원격 프로젝트 직결), `context7`(라이브러리 문서 조회), `playwright`, `sequential-thinking`, `shadcn`, `shrimp-task-manager`(작업 데이터는 `shrimp_data/`에 저장) MCP 서버가 구성되어 있다.

## `docs/` 폴더 — 참고 시 주의사항

`docs/`에는 상세한 패턴 가이드(`project-structure.md`, `component-patterns.md`, `styling-guide.md`, `forms-react-hook-form.md`, `nextjs-16.md`)가 있으나, **현재 설치된 상태와 다른 부분이 있어 그대로 신뢰하면 안 된다**:

- `project-structure.md`는 `src/` 하위 구조를 전제로 하지만 실제로는 `src/` 없이 루트 구조다.
- `styling-guide.md`는 "TailwindCSS v4"를 전제로 하지만 `package.json`에는 `tailwindcss: ^3.4.1`(v3)이 설치되어 있다.
- `forms-react-hook-form.md`는 `react-hook-form`, `zod`, `@hookform/resolvers` 사용을 전제로 하지만 이 패키지들은 `package.json`에 없다(미설치).
- `nextjs-16.md`가 언급하는 `npm run typecheck` / `format:check` / `check-all` 스크립트는 `package.json`에 존재하지 않는다.

즉 이 문서들은 "지향하는 패턴 가이드"이지 현재 코드베이스의 정확한 스냅샷이 아니다. 실제 설치 여부·구조는 `package.json`과 실제 디렉토리를 우선 확인할 것. 다만 Server/Client Component 경계, async request API(`params`/`searchParams`/`cookies`는 모두 `Promise`이므로 `await` 필요), Route Groups/Parallel/Intercepting Routes 같은 Next.js 16 자체의 규칙 설명은 유효하다.
