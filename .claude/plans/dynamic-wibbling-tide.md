# 모임 이벤트 관리 웹 MVP 기획

## Context

수영/헬스 클럽, 친구 모임 등 소규모(5~30명) 정기 모임의 주최자는 공지 전달, 참여자 관리, 카풀 매칭, 비용 정산을 대부분 카카오톡 대화방과 수동 엑셀/메모로 처리하고 있다. 이 과정에서 "누가 오는지 파악 안 됨", "공지가 대화에 묻힘", "누가 입금했는지 헷갈림", "카풀 조율에 시간 낭비" 같은 반복적인 운영 부담이 발생한다. 이 MVP는 이런 소규모 정기 모임 주최자를 위한 카카오톡 대체 포지셔닝의 운영 툴로, **모임/이벤트 관리, 공지, 정산(계산+수동 확인), 카풀(자동 매칭)** 4가지 핵심 기능을 한 번에 제공한다.

현재 `D:\claude\nextjs-supabase-app`은 Next.js 16(App Router) + Supabase 공식 스타터킷이며, 인증(`app/auth/*`)과 `profiles` 테이블(`supabase/migrations/20260813120000_create_profiles.sql`) 외 도메인 기능은 전무한 빈 상태다(Explore 조사 결과 확인됨). 따라서 이번 기획은 데이터 모델부터 전부 새로 설계한다.

**확정된 MVP 범위** (사용자 확인):

- 정산: 자동 계산 + 각자 수동 "입금 확인" 체크만. 실제 PG 결제 연동 없음.
- 타겟: 소규모 정기 모임(5~30명, 반복 모임 위주).
- 카풀: 자동 매칭까지 포함(지도 API 없이 텍스트 기반 매칭).
- 4대 기능(모임/참여자 관리, 공지, 정산, 카풀) 모두 이번 MVP에 포함.

## 핵심 설계 원칙 (기존 패턴 계승)

- **3분할 Supabase 클라이언트 유지**: `lib/supabase/client.ts`(브라우저) / `server.ts`(서버, 매 호출 재생성) / `proxy.ts`(세션 갱신). `service_role` 키는 쓰지 않으므로 모든 신규 테이블에 RLS를 건다.
- **`profiles` 마이그레이션 패턴 계승**: `security definer` + `set search_path = ''` 트리거 함수로 자동 생성/동기화 로직을 구현하고, 트리거 전용 함수는 `20260813120100_revoke_trigger_function_execute.sql`처럼 `revoke execute ... from public, anon, authenticated`로 RPC 노출을 차단한다.
- **RLS 재귀 회피**: `group_members`를 참조하는 정책이 자기 자신을 재귀 조회하지 않도록, `public.is_group_member(p_group_id uuid)` / `public.is_group_admin(p_group_id uuid)` `security definer` 헬퍼 함수를 통해 우회 조회한다. 인자는 `auth.uid()`만 내부에서 쓰고 임의 유저 조회는 막는다.
- **쓰기 방식 구분**: 단순 단일 테이블 CRUD(모임/이벤트/공지 생성)는 기존 인증 폼과 동일하게 클라이언트에서 Supabase 직접 호출. 원자성이 필요한 다단계 쓰기(정산 항목 일괄 생성, 카풀 매칭)는 Server Action 또는 Postgres `security definer` 함수로 처리.
- **알림은 인앱으로 한정**: 이메일/SMS/PG 프로바이더가 전혀 설치돼 있지 않으므로(`supabase/functions` 없음, config.toml 없음), MVP는 `notifications` 테이블 + Supabase Realtime(`postgres_changes`, 신규 패키지 불필요)로 헤더 벨 뱃지만 구현. 이메일 알림은 Phase 6 이후 과제로 명시적으로 미룬다.

## 데이터 모델

신규 테이블 9개, `supabase/migrations/`에 Phase별로 분리해 SQL 작성 후 `mcp__supabase__apply_migration`으로 원격 프로젝트(`dmsinrvnbznvipmmntho`)에 적용. 적용 후 매번 `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성.

| 테이블                                                    | 역할          | 핵심 컬럼                                                                                                                                                |
| --------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groups`                                                  | 모임          | `owner_id`, `name`, `invite_code`(unique, 랜덤 생성), `member_limit`                                                                                     |
| `group_members`                                           | 가입/역할     | `group_id`, `user_id`, `role`(owner/admin/member), `status`(pending/approved/rejected/left), unique(group_id,user_id)                                    |
| `events`                                                  | 일정          | `group_id`, `title`, `start_at`, `capacity`, `rsvp_deadline`, `status`                                                                                   |
| `event_participants`                                      | 참석 현황     | `event_id`, `user_id`, `status`(applied/approved/rejected/cancelled/attended/absent)                                                                     |
| `announcements`                                           | 공지          | `group_id`, `event_id`(nullable), `author_id`, `title`, `content`, `pinned`                                                                              |
| `notifications`                                           | 인앱 알림     | `user_id`(수신자), `type`, `title`, `link_path`, `read_at`                                                                                               |
| `settlements`                                             | 정산 헤더     | `group_id`, `event_id`, `total_amount`, `split_method`(equal/custom), `status`                                                                           |
| `settlement_items`                                        | 참여자별 분담 | `settlement_id`, `user_id`, `amount`, `is_paid`, `paid_at`, unique(settlement_id,user_id)                                                                |
| `carpool_offers` / `carpool_requests` / `carpool_matches` | 카풀          | offer: `driver_id`,`departure_area`,`seats_available`; request: `rider_id`,`departure_area`; match: `offer_id`,`request_id`,`status`(proposed/confirmed) |

**RLS 정책 패턴**: select는 `is_group_member(group_id)`(정산/공지는 그룹 멤버 전체 공개로 투명성 확보), insert/update/delete 중 관리 액션은 `is_group_admin(group_id)`, 본인 관련 행(참여 신청, 카풀 offer/request, 정산 입금 체크)은 `user_id = auth.uid()`로 본인만 허용. `groups` insert 시 owner를 `group_members`에 자동 삽입하는 트리거를 `handle_new_user`와 동일한 패턴으로 추가.

## 카풀 자동 매칭 로직

지도 API 없이 텍스트 기반 매칭: `departure_area`를 `lower(trim())`한 generated 컬럼으로 정규화 →

1. **1차 패스**: 동일 지역(`departure_area_norm`) offer/request끼리 등록순(FIFO)으로 좌석 채움.
2. **2차 폴백**: 지역 매칭 실패한 request는 이벤트 내 좌석 남은 아무 offer에나 등록순 배정(소규모 모임 특성상 "그 지역 차 없으면 아무 차나"가 현실적).
3. 그래도 남으면 `pending` 유지 → 관리자 수동 매칭 UI.

`public.run_carpool_matching(p_event_id uuid)` Postgres `security definer` 함수로 구현(원자성 확보 + 함수 내부에서 `is_group_admin` 재검증). 재실행 시 기존 `proposed` 매치만 삭제 후 재계산(멱등적), `confirmed`는 보존.

## 정산 로직

균등분배(`split_method='equal'`): 대상 참여자(`event_participants.status in ('approved','attended')`) 조회 → `floor(total/n)`을 기본액으로, 나머지(`total % n`)는 등록순 상위 N명에게 1원씩 추가해 합계를 정확히 맞춤. Server Action(`createSettlement`)에서 일괄 insert. 커스텀 분담은 별도 스키마 추가 없이 관리자가 각 `settlement_items.amount`를 수정하고 저장 시 `sum(amount) = total_amount` 검증 후 `split_method='custom'`으로 전환. 입금 체크는 본인 행만 RLS로 update 가능, 관리자는 전원 대신 체크 가능.

## 라우트 구조

```
app/groups/
  page.tsx, new/page.tsx, join/[code]/page.tsx
  [groupId]/
    layout.tsx, page.tsx(대시보드), settings/page.tsx, members/page.tsx
    announcements/{page.tsx, new/page.tsx, [id]/page.tsx}
    events/
      page.tsx, new/page.tsx
      [eventId]/
        layout.tsx, page.tsx, edit/page.tsx, participants/page.tsx
        settlement/page.tsx, carpool/page.tsx
app/notifications/page.tsx
```

목록/상세는 Server Component + `<Suspense>`(`cacheComponents: true` 대응, `app/protected/page.tsx`의 기존 패턴 계승). 폼/체크박스/실시간 벨만 `"use client"`.

**기존 데모 라우트 정리**: `app/instruments/*`(Supabase 공식 데모, 도메인 무관) 삭제. `app/protected/*` 삭제하고 `app/groups/`가 로그인 후 랜딩이 됨. `app/page.tsx`의 CTA 링크를 `/protected` → `/groups`로 변경. `lib/supabase/proxy.ts`의 리다이렉트 로직은 그대로 유지(수정 불필요).

## 컴포넌트

`components/ui/`(기존 shadcn) 외 `dialog`, `tabs`, `select`, `textarea`, `table`, `avatar`, `sonner`, `alert-dialog`를 shadcn MCP로 추가. 도메인 컴포넌트는 `components/{groups,events,announcements,settlements,carpool,notifications}/` 하위에 kebab-case로 구성(예: `group-form.tsx`, `settlement-item-row.tsx`, `notification-bell.tsx`).

## 구현 단계

1. **Phase 0 — 정리**: `app/instruments/*`, `app/protected/*` 삭제, 필요 shadcn 컴포넌트 선설치.
2. **Phase 1 — 모임**: `groups`/`group_members` 마이그레이션+RLS+헬퍼함수, `app/groups/*`. 검증: 모임 생성→초대코드 가입 신청→승인, 비멤버 계정에서 RLS로 조회 차단 확인.
3. **Phase 2 — 이벤트/참여자**: `events`/`event_participants`. 검증: 이벤트 생성→RSVP→승인→참석 현황 정확히 표시.
4. **Phase 3 — 공지/알림**: `announcements`/`notifications`+트리거, Realtime 벨. 검증: 공지 작성 시 멤버 전원 알림 생성, 뱃지 카운트 정확.
5. **Phase 4 — 정산**: `settlements`/`settlement_items`, N빵 Server Action. 검증: 총액 나머지까지 정확히 배분, 본인 행만 체크 가능.
6. **Phase 5 — 카풀**: `carpool_offers/requests/matches`, `run_carpool_matching()`. 검증: 동일지역 우선+폴백 배정, 재실행 멱등성.
7. **Phase 6 — 마감**: 정산/카풀 이벤트 알림 연결, `CLAUDE.md`/`docs/guides/project-structure.md`에 신규 라우트·테이블 반영.

## 참고 파일

- `supabase/migrations/20260813120000_create_profiles.sql` — RLS+트리거 패턴 원본
- `supabase/migrations/20260813120100_revoke_trigger_function_execute.sql` — RPC 차단 패턴
- `lib/supabase/server.ts`, `lib/supabase/proxy.ts` — 클라이언트 팩토리 패턴
- `lib/supabase/database.types.ts` — 스키마 변경 시 재생성 대상
- `app/protected/layout.tsx` — 삭제 대상, 헤더 네비게이션은 재활용

## 검증 방법

각 Phase 완료 시 Supabase MCP로 마이그레이션 적용 → `npm run type-check` / `npm run lint` → 두 개의 테스트 계정으로 실제 플로우(모임 생성/가입/이벤트/정산/카풀)를 수동 실행해 RLS가 의도대로 교차 접근을 차단하는지 확인. UI 변경은 `npm run dev`로 브라우저에서 골든 패스 확인.
