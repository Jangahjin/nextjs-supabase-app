-- =========================================================
-- run_carpool_matching() + 카풀 매칭 확정 알림 트리거
-- =========================================================

-- ---------------------------------------------------------
-- notifications.type check 제약에 'carpool_match_confirmed' 추가
-- ---------------------------------------------------------
alter table public.notifications
  drop constraint notifications_type_check,
  add constraint notifications_type_check
    check (
      type in (
        'announcement',
        'group_join_approved',
        'event_rsvp_approved',
        'event_rsvp_rejected',
        'carpool_match_confirmed'
      )
    );

-- ---------------------------------------------------------
-- 카풀 자동 매칭: 동일 지역 우선 배정 → 지역 무관 폴백 배정.
-- 재실행 시 proposed 매치만 삭제 후 재계산(confirmed는 보존)하는 멱등적 함수.
-- 관리자만 호출 가능하도록 함수 내부에서 is_group_admin을 재검증한다
-- (carpool_matches의 insert RLS 정책과 이중 방어).
-- ---------------------------------------------------------
create or replace function public.run_carpool_matching(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  r record;
  v_offer_id uuid;
begin
  select group_id into v_group_id from public.events where id = p_event_id;

  if v_group_id is null then
    raise exception 'event not found';
  end if;

  if not public.is_group_admin(v_group_id) then
    raise exception 'only group admin can run carpool matching';
  end if;

  delete from public.carpool_matches m
  using public.carpool_offers o
  where m.offer_id = o.id
    and o.event_id = p_event_id
    and m.status = 'proposed';

  -- 1차 패스: 동일 지역(departure_area_norm) 우선, 등록순으로 좌석 한도 내 배정
  for r in (
    select cr.id, cr.departure_area_norm
    from public.carpool_requests cr
    where cr.event_id = p_event_id
      and cr.id not in (select request_id from public.carpool_matches)
    order by cr.created_at
  ) loop
    select o.id into v_offer_id
    from public.carpool_offers o
    where o.event_id = p_event_id
      and o.departure_area_norm = r.departure_area_norm
      and (select count(*) from public.carpool_matches m where m.offer_id = o.id) < o.seats_available
    order by o.created_at
    limit 1;

    if v_offer_id is not null then
      insert into public.carpool_matches (offer_id, request_id, status)
      values (v_offer_id, r.id, 'proposed');
    end if;
  end loop;

  -- 2차 폴백: 지역 매칭 실패한 request를 좌석 남은 아무 offer에 등록순 배정
  for r in (
    select cr.id
    from public.carpool_requests cr
    where cr.event_id = p_event_id
      and cr.id not in (select request_id from public.carpool_matches)
    order by cr.created_at
  ) loop
    select o.id into v_offer_id
    from public.carpool_offers o
    where o.event_id = p_event_id
      and (select count(*) from public.carpool_matches m where m.offer_id = o.id) < o.seats_available
    order by o.created_at
    limit 1;

    if v_offer_id is not null then
      insert into public.carpool_matches (offer_id, request_id, status)
      values (v_offer_id, r.id, 'proposed');
    end if;
  end loop;
end;
$$;

grant execute on function public.run_carpool_matching(uuid) to authenticated;
revoke execute on function public.run_carpool_matching(uuid) from public, anon;

-- ---------------------------------------------------------
-- 알림 팬아웃 트리거: 카풀 매칭이 confirmed로 바뀌면 운전자/탑승자 양쪽에 알림
-- ---------------------------------------------------------
create or replace function public.notify_on_carpool_match_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver_id uuid;
  v_rider_id uuid;
  v_group_id uuid;
  v_event_id uuid;
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    select o.driver_id, o.event_id, e.group_id
      into v_driver_id, v_event_id, v_group_id
    from public.carpool_offers o
    join public.events e on e.id = o.event_id
    where o.id = new.offer_id;

    select r.rider_id into v_rider_id
    from public.carpool_requests r
    where r.id = new.request_id;

    insert into public.notifications (user_id, type, title, link_path, related_group_id, related_event_id)
    values
      (v_driver_id, 'carpool_match_confirmed', '카풀 매칭이 확정되었습니다.',
        '/groups/' || v_group_id || '/events/' || v_event_id || '/carpool', v_group_id, v_event_id),
      (v_rider_id, 'carpool_match_confirmed', '카풀 매칭이 확정되었습니다.',
        '/groups/' || v_group_id || '/events/' || v_event_id || '/carpool', v_group_id, v_event_id);
  end if;

  return new;
end;
$$;

create trigger on_carpool_match_confirmed
  after update of status on public.carpool_matches
  for each row
  execute function public.notify_on_carpool_match_confirmed();

revoke execute on function public.notify_on_carpool_match_confirmed() from public, anon, authenticated;
