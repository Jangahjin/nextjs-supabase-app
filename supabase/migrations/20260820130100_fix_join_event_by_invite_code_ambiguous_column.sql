-- =========================================================
-- join_event_by_invite_code 수정: RETURNS TABLE(event_id, group_id)이
-- plpgsql OUT 변수를 만들어 on conflict (group_id, user_id) / (event_id, user_id)의
-- 컬럼명과 충돌("column reference ... is ambiguous")하던 문제를 고친다.
-- 컬럼 목록 대신 실제 유니크 제약조건 이름을 사용해 모호성을 없앤다.
-- =========================================================

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
  on conflict on constraint group_members_group_id_user_id_key do nothing;

  insert into public.event_participants (event_id, user_id, status)
  values (v_event_id, (select auth.uid()), 'applied')
  on conflict on constraint event_participants_event_id_user_id_key do nothing;

  return query select v_event_id, v_group_id;
end;
$$;

grant execute on function public.join_event_by_invite_code(text) to authenticated;
revoke execute on function public.join_event_by_invite_code(text) from public, anon;
