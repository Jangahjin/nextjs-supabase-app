-- =========================================================
-- events + event_participants: 모임 내 일정 및 참석 현황 관리
-- =========================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  capacity int,
  rsvp_deadline timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.events is
  '모임 내 일정. group_id의 approved 멤버만 조회 가능, admin만 생성/수정/삭제 가능.';

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'applied'
    check (status in ('applied', 'approved', 'rejected', 'cancelled', 'attended', 'absent')),
  applied_at timestamptz not null default now(),
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

comment on table public.event_participants is
  '이벤트별 참석 신청/승인/출석 현황. status=applied가 기본이며 admin이 승인/거절/출석 처리한다.';

create index events_group_id_start_at_idx on public.events (group_id, start_at);
create index event_participants_event_id_status_idx on public.event_participants (event_id, status);
create index event_participants_user_id_idx on public.event_participants (user_id);

-- ---------------------------------------------------------
-- RLS: events (그룹 멤버는 조회만, 관리자만 쓰기)
-- ---------------------------------------------------------
alter table public.events enable row level security;

create policy "events_select_group_member"
  on public.events for select
  to authenticated
  using ( public.is_group_member(group_id) );

create policy "events_insert_group_admin"
  on public.events for insert
  to authenticated
  with check ( public.is_group_admin(group_id) );

create policy "events_update_group_admin"
  on public.events for update
  to authenticated
  using ( public.is_group_admin(group_id) )
  with check ( public.is_group_admin(group_id) );

create policy "events_delete_group_admin"
  on public.events for delete
  to authenticated
  using ( public.is_group_admin(group_id) );

-- ---------------------------------------------------------
-- RLS: event_participants
-- events.group_id를 경유하는 서브쿼리는 재귀가 아니라 정상적인 테이블 간 참조이며,
-- is_group_member/is_group_admin이 self-select만 필요로 하므로 문제없이 평가된다.
-- ---------------------------------------------------------
alter table public.event_participants enable row level security;

create policy "event_participants_select_group_member"
  on public.event_participants for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and public.is_group_member(e.group_id)
    )
  );

create policy "event_participants_insert_self_applied"
  on public.event_participants for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'applied'
    and exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and public.is_group_member(e.group_id)
    )
  );

create policy "event_participants_update_admin_or_self_cancel"
  on public.event_participants for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and public.is_group_admin(e.group_id)
    )
  )
  with check (
    (user_id = (select auth.uid()) and status = 'cancelled')
    or exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and public.is_group_admin(e.group_id)
    )
  );

create policy "event_participants_delete_self_applied_or_admin"
  on public.event_participants for delete
  to authenticated
  using (
    (user_id = (select auth.uid()) and status = 'applied')
    or exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and public.is_group_admin(e.group_id)
    )
  );

-- ---------------------------------------------------------
-- updated_at 자동 갱신
-- ---------------------------------------------------------
create trigger set_events_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

create trigger set_event_participants_updated_at
  before update on public.event_participants
  for each row
  execute function public.set_updated_at();
