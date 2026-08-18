# Development Guidelines (AI Agent 전용)

이 문서는 AI Coding Agent가 이 저장소에서 작업할 때 지켜야 할 **프로젝트 고유 규칙**만 담는다. 일반적인 Next.js/React/TypeScript/Tailwind 지식이나 `docs/guides/*.md`에 이미 상세히 문서화된 컨벤션(케밥케이스 파일명, import 순서, Tailwind 클래스 정렬 등)은 반복하지 않는다 — 해당 내용이 필요하면 `docs/guides/project-structure.md`, `docs/guides/component-patterns.md`, `docs/guides/styling-guide.md`, `docs/guides/forms-react-hook-form.md`, `docs/guides/nextjs-16.md`를 직접 참조하라.

## 프로젝트 개요

- Next.js 16(App Router, `cacheComponents: true`) + Supabase(`@supabase/ssr`) 기반 **모임(그룹) 관리 앱**.
- 도메인 확장 순서: `profiles`(1:1 auth 확장) → `groups`/`group_members`(모임/가입) → `events`/`event_participants`(일정/참석) → `announcements`(공지) / `settlements`/`settlement_items`(정산) → `notifications`(인앱 알림).
- 원격 Supabase 프로젝트(`dmsinrvnbznvipmmntho`)에 MCP로 직접 마이그레이션을 적용하는 구조이며 로컬 `supabase start` 스택은 없다.

## RLS 헬퍼 함수 재사용 (필수)

- `public.is_group_member(p_group_id uuid)`, `public.is_group_admin(p_group_id uuid)`는 `supabase/migrations/20260818120000_create_groups_and_members.sql`에 정의된 `security definer` 함수로, `group_members` 자기참조 재귀를 피하는 **유일한 안전 경로**다.
- **해야 할 것**: 그룹에 종속된 새 테이블의 RLS 정책을 작성할 때 반드시 이 두 함수를 재사용한다. 예: `using ( public.is_group_member(group_id) )`.
- **하지 말아야 할 것**: `exists (select 1 from group_members where ...)` 형태의 멤버십 서브쿼리를 새로 작성하지 않는다 — 재귀/중복 로직이 발생한다.
- 새 테이블이 그룹에 직접 속하지 않고 그룹 종속 테이블(예: `events`, `settlements`)을 경유할 때는 `settlement_items`, `event_participants` 정책처럼 `exists (select 1 from <부모테이블> p where p.id = <자식>.parent_id and public.is_group_member(p.group_id))` 형태로 연결한다.

## 마이그레이션 작성 템플릿 (필수 순서)

새 `supabase/migrations/*.sql` 파일은 기존 8개 마이그레이션과 동일한 순서를 따른다:

1. 파일명: `YYYYMMDDHHmmss_설명.sql` (UTC 타임스탬프 오름차순 필수, 예: `20260818150000_create_settlements.sql`).
2. `create table` 직후 `comment on table ... is '한글 설명';`으로 테이블 용도를 남긴다.
3. `alter table ... enable row level security;` 후 정책은 항상 `to authenticated`로 제한한다(익명/공개 접근 정책 금지).
4. 정책 조건에서 `auth.uid()`를 직접 쓰지 않고 `(select auth.uid())`로 감싼다(플래너 재평가 방지 패턴, 전 마이그레이션에서 일관됨).
5. `security definer` 함수는 반드시 `set search_path = ''`를 지정하고, 내부 테이블 참조는 `public.` 접두사를 명시한다.
6. 트리거 전용 함수(앱에서 직접 호출되면 안 되는 함수, 예: `handle_new_group`, `notify_*`, `guard_settlement_item_self_update`)는 마지막에 `revoke execute on function ... from public, anon, authenticated;`를 추가한다. RPC로 노출할 함수(`get_group_by_invite_code`, `is_group_member` 등)만 `grant execute ... to authenticated;`를 쓴다.
7. `updated_at` 컬럼이 있는 테이블은 새 트리거 함수를 만들지 말고 `public.set_updated_at`(profiles 마이그레이션에서 정의) 트리거를 재사용한다.

## Mutation 구현 위치 결정 규칙

이 코드베이스에는 두 가지 mutation 경로가 공존하며, 선택 기준은 다음과 같다(임의로 섞지 말 것):

- **단일 테이블 단순 insert/update** → Client Component에서 `@/lib/supabase/client`의 `createClient()`를 직접 호출한다. `components/groups/group-form.tsx`, `components/events/event-form.tsx`, `components/events/participant-row.tsx`, `components/notifications/notification-bell.tsx`가 이 패턴이다. 성공 시 `sonner`의 `toast.success(...)`, 실패 시 `toast.error(...)` 또는 로컬 `error` state로 표시하고, 이동은 `router.push`, 같은 화면 갱신은 `router.refresh()`를 쓴다.
- **여러 테이블에 걸친 파생 계산/트랜잭션 성격의 로직**(예: N빵 분배 금액 계산 후 `settlements` + `settlement_items` 두 테이블에 insert)만 `"use server"` Server Action으로 구현한다. `app/groups/[groupId]/events/[eventId]/settlement/actions.ts`가 유일하고 유일해야 하는 참조 예시다. 새 Server Action은 해당 라우트 폴더에 `actions.ts`로 co-locate하고, 화면 갱신은 `router.refresh()`가 아니라 `revalidatePath(...)`를 쓴다.
- 새 기능을 추가할 때 "이게 단일 테이블 CRUD인가, 파생 계산이 필요한가"를 먼저 판단하고 그에 맞는 경로만 사용한다. 단순 CRUD에 Server Action을 도입하거나, 파생 계산 로직을 클라이언트에서 직접 계산해 insert하는 것 모두 금지한다.

## 그룹 스코프 페이지의 인증/권한 체크 (중앙화되어 있지 않음)

- `proxy.ts`(`lib/supabase/proxy.ts`의 `updateSession`)는 경로가 `/`, `/login*`, `/auth*`가 아닐 때 미인증 사용자를 `/auth/login`으로 리다이렉트하는 **전역 체크만** 담당한다. 그룹/이벤트 단위의 멤버십·권한 판단은 하지 않는다.
- `app/groups/[groupId]/layout.tsx`, `events/[eventId]/page.tsx`, `settlement/page.tsx` 등은 각각 독립적으로 `supabase.auth.getClaims()` → 미인증 시 `redirect("/auth/login")` → `group_members`에서 `role`/`status` 조회 → `isAdmin` 계산을 **반복**한다(부모 레이아웃이 계산한 값을 context 등으로 공유하지 않음).
- **새 그룹/이벤트 스코프 페이지를 추가할 때도 동일하게 자체 체크를 반복**한다. 부모 `layout.tsx`가 인증이나 관리자 권한을 이미 검증했다고 가정하고 자식 페이지에서 체크를 생략하지 않는다.
- `isAdmin` 판정식은 항상 `membership?.status === "approved" && (membership.role === "owner" || membership.role === "admin")` 형태를 그대로 재사용한다.

## notifications 테이블은 앱 코드에서 직접 insert 금지

- `notifications` 테이블 RLS는 `select`/`update`(본인 행만)만 허용하며 `insert` 정책이 없다 — 클라이언트/서버 코드에서 `.from("notifications").insert(...)`를 호출하면 실패한다.
- 새로운 알림이 필요하면 `supabase/migrations/20260818140000_create_announcements_and_notifications.sql`의 `notify_group_members_on_announcement` / `notify_on_group_join_approved` / `notify_on_event_rsvp_response` 패턴을 따라 **`security definer` 트리거 함수**를 새 마이그레이션에 추가하고, `revoke execute ... from public, anon, authenticated;`를 반드시 붙인다.
- 앱 코드에서 허용되는 것은 `read_at` 갱신(`notification-bell.tsx` 참고)과 Supabase Realtime 구독(`postgres_changes` on `notifications`, `filter: user_id=eq.<uid>`)뿐이다.

## PostgREST 임베드 시 FK 힌트

- 같은 테이블(`profiles`)을 여러 FK로 참조하거나 모호성이 발생할 수 있는 select에서는 `settlement/page.tsx`의 `profile:profiles!settlement_items_user_id_fkey(full_name, email, avatar_url)`처럼 `!<제약조건이름>` 힌트를 명시한다. 힌트 없이 `profiles(...)`만 쓰면 PostgREST가 어떤 FK를 쓸지 모호할 수 있는 테이블에는 반드시 명시할 것.

## 스키마 변경 시 페어 파일 (필수)

- `supabase/migrations/*.sql`을 새로 추가하거나 원격에 `mcp__supabase__apply_migration`으로 적용했다면, 같은 작업 내에서 `mcp__supabase__generate_typescript_types`를 호출해 `lib/supabase/database.types.ts`를 재생성한다. 타입 파일을 갱신하지 않은 채 새 컬럼/테이블을 코드에서 사용하지 않는다.

## 문서 드리프트 주의 (다중 파일 연동)

- `docs/guides/project-structure.md`는 현재 `app/protected/`, `app/instruments/`를 예시 구조로 들고 있으나, 실제 저장소에는 `app/protected/`가 존재하지 않는다(커밋 `446a26e`에서 제거됨) — 이 문서는 이미 실제 상태와 어긋나 있다.
- 최상위 `app/*` 라우트를 추가/삭제하거나 `components/`, `lib/`의 최상위 폴더 구조를 바꿀 때는 반드시 `docs/guides/project-structure.md`의 구조 예시(트리, 폴더 설명)를 같은 작업에서 함께 갱신한다. 코드만 바꾸고 문서를 방치하지 않는다.
- `CLAUDE.md`(루트)의 "아키텍처" 절이 실제 라우트/디렉토리 구조와 어긋나게 되는 변경(예: Supabase 클라이언트 3분할 패턴 변경, `proxy.ts` 리다이렉트 matcher 변경)을 할 때도 해당 절을 함께 갱신한다.

## 파일 배치 규칙 (도메인 기능 추가 시)

새 도메인 기능(예: `settlements`)을 추가할 때는 기존 4개 기능(`announcements`, `events`, `groups`, `notifications`, `settlements`)과 동일한 배치를 따른다:

- 라우트: `app/groups/[groupId]/events/[eventId]/<feature>/page.tsx` (필요시 `new/page.tsx`, `[id]/page.tsx`, `actions.ts` co-location).
- 프레젠테이션/폼 컴포넌트: `components/<feature-plural>/<feature>-form.tsx`, `<feature>-item-row.tsx` 등 kebab-case로 `components/` 하위 전용 폴더에 배치한다(`components/settlements/settlement-form.tsx`, `components/settlements/settlement-item-row.tsx` 참고). 페이지 전용이 아닌 이상 `app/` 디렉토리에 컴포넌트를 두지 않는다.

## 금지 사항 요약

- 그룹 멤버십/권한 서브쿼리를 `is_group_member`/`is_group_admin` 대신 직접 재작성하는 것.
- `security definer` 트리거 전용 함수에 `revoke execute` 구문을 누락하는 것.
- 단순 단일 테이블 CRUD에 Server Action(`"use server"`)을 도입하거나, 다중 테이블 파생 계산을 클라이언트 컴포넌트에서 직접 처리하는 것.
- `notifications` 테이블에 앱 코드(Client Component, Server Action 등)에서 직접 `insert`하는 것 — 반드시 DB 트리거 경유.
- 그룹/이벤트 스코프 새 페이지에서 부모 레이아웃이 인증·권한을 이미 검증했다고 가정하고 자체 `auth.getClaims()`/`group_members` 조회를 생략하는 것.
- 마이그레이션 적용 후 `database.types.ts` 재생성을 생략하는 것.
- `docs/guides/project-structure.md` 등 구조 문서를 실제 변경과 별개로 방치해 드리프트를 늘리는 것.
