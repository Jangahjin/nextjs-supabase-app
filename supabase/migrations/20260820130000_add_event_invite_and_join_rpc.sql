-- =========================================================
-- events.invite_code + 이벤트 단위 초대 미리보기/참여 RPC
-- 그룹 초대(groups.invite_code)와 별개로, 이벤트를 직접 공유해
-- 비멤버도 초대코드만으로 미리보기하고 참여 신청할 수 있게 한다.
-- =========================================================

alter table public.events
  add column invite_code text not null unique default substr(md5(random()::text), 1, 8);

comment on column public.events.invite_code is
  '이벤트 단위 공유용 초대코드. groups.invite_code와 동일한 패턴.';

-- ---------------------------------------------------------
-- 초대코드로 이벤트 미리보기: 비멤버도 정확한 invite_code를 알면
-- 최소 정보(제목/설명/장소/일시/정원/승인 인원)만 조회 가능하게 하는 RPC.
-- events 테이블 전체 select 권한을 열지 않기 위해 별도 함수로 분리한다.
-- ---------------------------------------------------------
create or replace function public.get_event_by_invite_code(p_invite_code text)
returns table (
  id uuid,
  group_id uuid,
  group_name text,
  title text,
  description text,
  location text,
  start_at timestamptz,
  capacity int,
  approved_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.group_id,
    g.name as group_name,
    e.title,
    e.description,
    e.location,
    e.start_at,
    e.capacity,
    (
      select count(*)
      from public.event_participants ep
      where ep.event_id = e.id
        and ep.status in ('approved', 'attended')
    ) as approved_count
  from public.events e
  join public.groups g on g.id = e.group_id
  where e.invite_code = p_invite_code;
$$;

grant execute on function public.get_event_by_invite_code(text) to authenticated;
revoke execute on function public.get_event_by_invite_code(text) from public, anon;

-- ---------------------------------------------------------
-- 초대코드로 이벤트 참여: 모임 비멤버라면 group_members에 pending으로
-- 가입 신청을 동시에 생성하고, event_participants에 applied로 신청한다.
-- 이미 존재하는 멤버십/참여 상태는 on conflict do nothing으로 보존한다.
-- ---------------------------------------------------------
create or replace function public.join_event_by_invite_code(p_invite_code text)
returns table (event_id uuid, group_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_group_id uuid;
begin
  select e.id, e.group_id into v_event_id, v_group_id
  from public.events e
  where e.invite_code = p_invite_code;

  if v_event_id is null then
    return;
  end if;

  insert into public.group_members (group_id, user_id, role, status)
  values (v_group_id, (select auth.uid()), 'member', 'pending')
  on conflict (group_id, user_id) do nothing;

  insert into public.event_participants (event_id, user_id, status)
  values (v_event_id, (select auth.uid()), 'applied')
  on conflict (event_id, user_id) do nothing;

  return query select v_event_id, v_group_id;
end;
$$;

grant execute on function public.join_event_by_invite_code(text) to authenticated;
revoke execute on function public.join_event_by_invite_code(text) from public, anon;
