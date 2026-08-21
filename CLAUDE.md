# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js (App Router) + Supabase 기반 스타터킷. `@supabase/ssr`을 사용해 쿠키 기반 인증 세션을 App Router 전체(Client/Server Components, Route Handlers, Proxy)에서 공유한다. UI는 shadcn/ui(new-york style) + TailwindCSS. `next.config.ts`에서 `cacheComponents: true`가 활성화되어 있어 Next.js 16 기반 프로젝트다.

## 명령어

```bash
npm run dev          # 개발 서버 (Turbopack)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint (next/core-web-vitals, next/typescript, eslint-config-prettier)
npm run lint:fix      # ESLint --fix
npm run type-check    # tsc --noEmit (하이픈 포함 스크립트명에 주의)
npm run format        # Prettier --write . (prettier-plugin-tailwindcss로 className 자동 정렬)
npm run format:check  # Prettier --check .
```

테스트 러너는 설정되어 있지 않다. `.husky/pre-commit`이 `npx lint-staged`를 실행해 staged된 `*.{js,jsx,ts,tsx}`에는 `eslint --fix` + `prettier --write`를, `*.{json,md,mdx,css,yml,yaml}`에는 `prettier --write`를 커밋 전 자동 적용한다(`package.json`의 `lint-staged` 필드 참고). `.github/workflows/ci.yml`은 `main` 대상 push/PR에서 `lint` → `type-check` → `format:check` → `build`를 순서대로 실행하며, 빌드 단계에는 placeholder Supabase 환경변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)를 주입한다.

DB 마이그레이션은 `supabase/migrations/`에 SQL 파일로 존재하지만 `supabase/config.toml`이 없어 로컬 Supabase CLI 스택(`supabase start`)은 구성되어 있지 않다. `.mcp.json`에 연결된 Supabase MCP 서버(project_ref: `dmsinrvnbznvipmmntho`)의 `mcp__supabase__apply_migration` / `list_migrations` 등으로 원격 프로젝트에 직접 적용하는 워크플로우를 사용한다.

## 아키텍처

### 디렉토리 구조 (실제 — `src/` 없음)

`app/`, `components/`, `lib/`이 프로젝트 루트에 바로 위치한다. TS 경로 별칭은 `@/*` → `./*`(tsconfig.json), shadcn 별칭은 `components.json`에 `@/components`, `@/lib`, `@/components/ui`, `@/hooks`로 정의되어 있다(단 `hooks/` 폴더는 아직 없음).

- `app/` — 라우트. `app/auth/*`(login, sign-up, forgot-password, update-password, confirm route handler, error), `app/notifications/*`(인앱 알림 목록), `app/groups/*`(로그인 후 랜딩 — 모임 목록/생성/초대코드 가입 및 `[groupId]/`이하 대시보드·설정·멤버 관리·공지·`events/[eventId]/`하위의 참여자 관리·정산·카풀까지 전부 이 트리 아래에 중첩됨). `app/events/*`(그룹에 종속되지 않는 전역 "내 이벤트" 목록/상세 — 주최·참여 이벤트를 역할 배지와 함께 통합 조회), `app/join/[code]/*`(이벤트 단위 초대코드 미리보기+참여, `app/groups/join/[code]`의 그룹 단위 초대와는 별개 네임스페이스), `app/profile/*`(주최/참여 이벤트 수 통계)는 그룹 스코프 밖의 전역 라우트다. 초기 스타터킷에 있던 `app/protected/*`, `app/instruments/*`는 모임 기능 스캐폴딩 과정에서 삭제되었다(커밋 `446a26e`) — 남아있는 문서에 이 경로가 언급되어 있으면 드리프트이니 갱신할 것.
- `components/` — `ui/`는 shadcn/ui 원시 컴포넌트(badge, button, card, checkbox, dropdown-menu, input, label), `tutorial/`은 스타터킷 온보딩용, 나머지는 auth/테마 관련 컴포넌트가 평평하게 위치
- `lib/supabase/` — Supabase 클라이언트 3종(`client.ts`, `server.ts`, `proxy.ts`) + `database.types.ts`(자동 생성 타입) + `storage.ts`(Storage 업로드 헬퍼)
- `supabase/migrations/` — SQL 마이그레이션

### Supabase 클라이언트 3분할 패턴

Server-rendering 환경(Fluid compute)에서는 클라이언트를 전역 변수에 두면 안 되므로, 컨텍스트별로 별도 팩토리 함수를 둔다:

- `lib/supabase/client.ts` — `createBrowserClient`, Client Component에서 사용
- `lib/supabase/server.ts` — `createServerClient` + `next/headers`의 `cookies()`, Server Component/Server Action에서 매 호출마다 새로 생성해서 사용
- `lib/supabase/proxy.ts` — `updateSession()`, 세션 쿠키를 갱신하고 미인증 사용자를 리다이렉트. 루트의 `proxy.ts`(Next.js 16의 `middleware.ts` 대체 — 파일명·함수명 모두 `proxy`로 변경됨)에서 호출됨

세 클라이언트 모두 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 환경변수를 사용한다(`.env.local`).

`lib/supabase/proxy.ts`의 리다이렉트 미체크 경로는 `/`, `/login`으로 시작하는 경로, `/auth`로 시작하는 경로다. 실제 로그인 페이지는 `app/auth/login`에 있으므로 `/auth` 프리픽스 체크가 실질적으로 적용되는 조건이고, `/login` 체크는 현재 라우트 구조상 도달하지 않는다 — 새 인증 관련 경로를 추가할 때 이 matcher 로직을 참고할 것. `hasEnvVars`가 false면(환경변수 미설정) proxy 자체를 스킵한다.

### 데이터베이스 (Supabase Postgres)

`profiles` 테이블은 `auth.users`의 1:1 확장이며 `supabase/migrations/20260813120000_create_profiles.sql`에 전체 패턴이 정의되어 있다:

- RLS 활성화, `authenticated` 롤에 대해 본인 행만 select/insert/update 가능한 정책
- `on_auth_user_created` 트리거로 회원가입 시 프로필 행 자동 생성(`security definer`, `set search_path = ''`)
- `on_auth_user_email_updated` 트리거로 이메일 변경 동기화
- 후속 마이그레이션(`20260813120100_...`)에서 트리거 전용 함수의 PostgREST RPC 노출(`/rest/v1/rpc/...`)을 `revoke execute`로 차단

새 테이블을 추가할 때는 이 RLS + trigger + RPC 노출 차단 패턴을 따르고, 스키마 변경 후에는 `mcp__supabase__generate_typescript_types`로 `database.types.ts`를 재생성해야 타입이 동기화된다.

`profiles` 위에 모임 도메인 테이블이 `supabase/migrations/`에 순차적으로 쌓여 있다: `groups`/`group_members`(모임·가입/역할, `groups.cover_image_url`은 대표 사진 public URL), `events`/`event_participants`(일정·참석), `announcements`(공지), `notifications`(인앱 알림, `security definer` 트리거로만 생성), `settlements`/`settlement_items`(N빵 정산), `carpool_offers`/`carpool_requests`/`carpool_matches`(카풀 등록·매칭). 그룹 종속 테이블의 RLS는 전부 `public.is_group_member(group_id)` / `public.is_group_admin(group_id)`(`20260818120000_create_groups_and_members.sql`에서 정의된 재귀 회피용 `security definer` 헬퍼)를 재사용하며, `public.run_carpool_matching(event_id)`처럼 여러 행에 걸친 원자적 계산은 Postgres `security definer` 함수로 구현하고 함수 내부에서 `is_group_admin`을 재검증한다. Supabase Storage에는 `group-covers` 버킷(public, 모임당 `{group_id}/cover` 경로에 1장, `storage.objects` insert/update/delete는 `is_group_admin` 기반 RLS로 제한)이 있다. 버킷의 public 플래그는 `/storage/v1/object/public/...` 다운로드 엔드포인트에만 적용되고 Storage API 내부 동작(업로드 후 재조회 등)에는 적용되지 않으므로, `storage.objects`에 인증 사용자 전체 대상 select 정책(`group_covers_select_authenticated`)도 별도로 필요하다. 프로젝트 고유의 세부 규칙(마이그레이션 작성 순서, mutation 구현 위치 결정 등)은 `shrimp-rules.md`를 참고할 것.

### MCP 서버 연동 (`.mcp.json`)

이 프로젝트에는 `supabase`(원격 프로젝트 직결), `context7`(라이브러리 문서 조회), `playwright`, `sequential-thinking`, `shadcn`, `shrimp-task-manager`(작업 데이터는 `shrimp_data/`에 저장) MCP 서버가 구성되어 있다.

## `docs/guides/` 폴더

`docs/guides/`에는 상세한 패턴 가이드(`project-structure.md`, `component-patterns.md`, `styling-guide.md`, `forms-react-hook-form.md`, `nextjs-16.md`)가 있으며, 실제 설치 상태·디렉토리 구조·스크립트명과 맞도록 갱신되어 있다(예: `src/` 미사용, TailwindCSS v3, `react-hook-form` 미설치 — 폼은 `useState` + Supabase Auth 직접 호출 패턴, `type-check`/`check-all` 스크립트명 정정). 단, Next.js 16의 활성화 가능한 옵션(`typedRoutes`, `turbopack` 설정 등)처럼 "이 프로젝트에는 아직 없지만 필요시 켤 수 있는 기능"을 설명하는 부분은 각 문서 내에 "이 프로젝트에서는 아직 미사용"이라고 명시되어 있으니, 실제로 켜져 있는지는 항상 `next.config.ts`로 재확인할 것. 코드가 먼저 바뀌면 이 문서들도 함께 갱신해야 드리프트가 재발하지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
