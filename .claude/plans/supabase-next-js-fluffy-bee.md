# 회원 프로필(profiles) 테이블 생성

## Context

이 프로젝트는 공식 Supabase Next.js 스타터 템플릿 구조로, 회원가입/로그인(`app/auth/*`, `components/sign-up-form.tsx`, `components/login-form.tsx`)은 이미 구현되어 있지만, 가입한 사용자의 부가 정보(이름, 아바타 등)를 저장·관리할 테이블이 아직 없다. `auth.users`는 Supabase Auth가 관리하는 내부 스키마라 앱에서 자유롭게 컬럼을 추가하거나 클라이언트에서 직접 조회하기에 적합하지 않으므로, `public.profiles` 테이블을 별도로 두고 `auth.users`와 1:1로 연결하는 표준 패턴을 적용한다.

원격 Supabase 프로젝트(`dmsinrvnbznvipmmntho`, ap-southeast-1, Postgres 17)를 조사한 결과 마이그레이션 이력이 전혀 없고, 로컬에도 `supabase/` 디렉터리나 CLI가 없어 로컬 Docker 스택을 쓸 수 없는 상태다. 따라서 이번 작업에서는 `supabase/migrations/`에 SQL 파일을 만들어 버전관리하는 동시에, Supabase MCP의 `apply_migration`으로 원격에 직접 적용한다.

사용자와 논의해 확정한 범위:

- **공개 범위**: 본인만 열람/수정 가능(비공개 프로필). SELECT/INSERT/UPDATE 모두 `auth.uid() = id` 조건.
- **필드**: 기본형만 — `id, email, full_name, avatar_url, created_at, updated_at`.
- **회원가입 폼 변경 없음**: `sign-up-form.tsx`는 건드리지 않는다. `full_name`은 트리거 실행 시 `NULL`로 채워지며, 추후 별도 프로필 수정 기능에서 채우는 구조로 남겨둔다.

## Approach

### 1. 마이그레이션 SQL 작성 (로컬 파일)

`supabase/migrations/20260813120000_create_profiles.sql` 신규 생성. 내용:

- `public.profiles` 테이블: `id uuid primary key references auth.users(id) on delete cascade`, `email text not null`, `full_name text`, `avatar_url text`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- RLS 활성화 + 정책 3개 (`profiles_select_own`, `profiles_insert_own`, `profiles_update_own`), 모두 `to authenticated using/with check ((select auth.uid()) = id)`. DELETE 정책은 만들지 않음(탈퇴 시 `auth.users` 삭제에 따른 CASCADE에만 의존).
- `handle_new_user()` 함수 + `on_auth_user_created` 트리거(`after insert on auth.users`): 신규 가입 시 `profiles` row를 자동 생성. `security definer`, `set search_path = ''`로 스키마 하이재킹 방지, `on conflict (id) do nothing`으로 안전하게.
- `handle_user_email_update()` 함수 + `on_auth_user_email_updated` 트리거(`after update of email on auth.users`): 이메일 변경 시 `profiles.email` 동기화.
- `set_updated_at()` 함수 + `set_profiles_updated_at` 트리거(`before update on profiles`): `updated_at` 자동 갱신.

전체 SQL 초안은 Plan 단계에서 확정했으며 그대로 사용한다 (트리거 3개 + 정책 3개 + 테이블 1개).

### 2. 원격 적용

`mcp__supabase__apply_migration`으로 project_id `dmsinrvnbznvipmmntho`에 위 SQL을 `name: "create_profiles"`로 적용. 로컬 파일명의 타임스탬프/이름과 일치시켜 추후 CLI 연동 시 이력이 어긋나지 않게 한다.

### 3. 검증

- `mcp__supabase__list_tables` (verbose)로 `public.profiles` 컬럼/PK/FK 확인.
- `mcp__supabase__get_advisors(type: "security")`로 RLS 누락, `search_path` 미고정 등 새 경고가 없는지 확인.
- `mcp__supabase__execute_sql`로 `pg_policies`, `pg_trigger`를 조회해 정책 3개·트리거 3개가 정상 등록됐는지 확인.
- 이미 `auth.users`에 존재하는 기존 사용자 1명에 대해서도 `profiles` row가 없을 것이므로(트리거는 신규 INSERT부터 적용), 필요 시 `insert into public.profiles select id, email, null, null, now(), now() from auth.users where id not in (select id from public.profiles)` 형태의 백필을 함께 실행할지 검토(기존 사용자 1명 처리).

### 4. TypeScript 타입 반영

- `mcp__supabase__generate_typescript_types`(project_id: `dmsinrvnbznvipmmntho`)로 타입 생성 후 `lib/supabase/database.types.ts`로 저장.
- `lib/supabase/client.ts`, `lib/supabase/server.ts`를 `createBrowserClient<Database>(...)`, `createServerClient<Database>(...)` 형태로 수정해 `Database` 타입을 import·적용(제네릭 추가). `lib/supabase/proxy.ts`는 테이블 쿼리를 하지 않으므로 변경 불필요.

## Critical Files

- `supabase/migrations/20260813120000_create_profiles.sql` — 신규 생성 (마이그레이션 본문)
- `lib/supabase/database.types.ts` — 신규 생성 (생성된 TS 타입)
- `lib/supabase/client.ts` — `Database` 제네릭 추가
- `lib/supabase/server.ts` — `Database` 제네릭 추가

## Verification

1. `list_tables(verbose: true)`로 `public.profiles` 스키마가 설계대로인지 확인.
2. `get_advisors(type: "security")` 실행해 새로운 WARN/ERROR 없는지 확인 (기존 `auth_leaked_password_protection` WARN은 이번 작업과 무관하므로 무시).
3. 실제 앱에서 `/auth/sign-up`으로 신규 가입 → `execute_sql`로 `select * from public.profiles where id = '<new-user-id>'` 조회해 트리거가 정상적으로 row를 생성했는지 확인.
4. `npx tsc --noEmit` (또는 `npm run build`)로 `Database` 제네릭 적용 후 타입 에러 없는지 확인.
