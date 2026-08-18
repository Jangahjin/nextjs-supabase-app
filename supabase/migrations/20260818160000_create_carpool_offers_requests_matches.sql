-- =========================================================
-- carpool_offers + carpool_requests + carpool_matches: 이벤트 카풀 등록 및 매칭
-- =========================================================

create table public.carpool_offers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  driver_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  departure_area text not null,
  departure_area_norm text generated always as (lower(trim(departure_area))) stored,
  seats_available int not null check (seats_available > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, driver_id)
);

comment on table public.carpool_offers is
  '이벤트별 카풀 제공(운전자) 등록. 한 이벤트에 운전자당 하나의 offer만 등록 가능.';

create table public.carpool_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  rider_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  departure_area text not null,
  departure_area_norm text generated always as (lower(trim(departure_area))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, rider_id)
);

comment on table public.carpool_requests is
  '이벤트별 카풀 탑승 신청(탑승자) 등록. 한 이벤트에 탑승자당 하나의 request만 등록 가능.';

create table public.carpool_matches (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.carpool_offers(id) on delete cascade,
  request_id uuid not null references public.carpool_requests(id) on delete cascade,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id)
);

comment on table public.carpool_matches is
  '카풀 배정 결과. request_id는 유일 — 한 탑승자는 한 시점에 하나의 offer에만 배정된다. public.run_carpool_matching()이 채운다.';

create index carpool_offers_event_id_idx on public.carpool_offers (event_id);
create index carpool_requests_event_id_idx on public.carpool_requests (event_id);
create index carpool_matches_offer_id_idx on public.carpool_matches (offer_id);

-- ---------------------------------------------------------
-- RLS: carpool_offers (그룹 멤버는 조회, 본인만 등록/수정/삭제, admin도 관리 가능)
-- ---------------------------------------------------------
alter table public.carpool_offers enable row level security;

create policy "carpool_offers_select_group_member"
  on public.carpool_offers for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = carpool_offers.event_id
        and public.is_group_member(e.group_id)
    )
  );

create policy "carpool_offers_insert_self"
  on public.carpool_offers for insert
  to authenticated
  with check (
    driver_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_group_member(e.group_id)
    )
  );

create policy "carpool_offers_update_self_or_admin"
  on public.carpool_offers for update
  to authenticated
  using (
    driver_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = carpool_offers.event_id
        and public.is_group_admin(e.group_id)
    )
  )
  with check (
    driver_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = carpool_offers.event_id
        and public.is_group_admin(e.group_id)
    )
  );

create policy "carpool_offers_delete_self_or_admin"
  on public.carpool_offers for delete
  to authenticated
  using (
    driver_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = carpool_offers.event_id
        and public.is_group_admin(e.group_id)
    )
  );

-- ---------------------------------------------------------
-- RLS: carpool_requests (offers와 동일 구조)
-- ---------------------------------------------------------
alter table public.carpool_requests enable row level security;

create policy "carpool_requests_select_group_member"
  on public.carpool_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = carpool_requests.event_id
        and public.is_group_member(e.group_id)
    )
  );

create policy "carpool_requests_insert_self"
  on public.carpool_requests for insert
  to authenticated
  with check (
    rider_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and public.is_group_member(e.group_id)
    )
  );

create policy "carpool_requests_update_self_or_admin"
  on public.carpool_requests for update
  to authenticated
  using (
    rider_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = carpool_requests.event_id
        and public.is_group_admin(e.group_id)
    )
  )
  with check (
    rider_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = carpool_requests.event_id
        and public.is_group_admin(e.group_id)
    )
  );

create policy "carpool_requests_delete_self_or_admin"
  on public.carpool_requests for delete
  to authenticated
  using (
    rider_id = (select auth.uid())
    or exists (
      select 1 from public.events e
      where e.id = carpool_requests.event_id
        and public.is_group_admin(e.group_id)
    )
  );

-- ---------------------------------------------------------
-- RLS: carpool_matches (당사자(운전자/탑승자) 또는 admin만 조회, 쓰기는 admin 전용)
-- run_carpool_matching()이 security definer로 실제 배정을 수행하므로, 아래 쓰기 정책은
-- 관리자가 수동으로 개입(취소/확정)할 때를 위한 이중 방어선이다.
-- ---------------------------------------------------------
alter table public.carpool_matches enable row level security;

create policy "carpool_matches_select_party_or_admin"
  on public.carpool_matches for select
  to authenticated
  using (
    exists (
      select 1 from public.carpool_offers o
      where o.id = carpool_matches.offer_id
        and o.driver_id = (select auth.uid())
    )
    or exists (
      select 1 from public.carpool_requests r
      where r.id = carpool_matches.request_id
        and r.rider_id = (select auth.uid())
    )
    or exists (
      select 1 from public.carpool_offers o
      join public.events e on e.id = o.event_id
      where o.id = carpool_matches.offer_id
        and public.is_group_admin(e.group_id)
    )
  );

create policy "carpool_matches_insert_admin"
  on public.carpool_matches for insert
  to authenticated
  with check (
    exists (
      select 1 from public.carpool_offers o
      join public.events e on e.id = o.event_id
      where o.id = offer_id
        and public.is_group_admin(e.group_id)
    )
  );

create policy "carpool_matches_update_admin"
  on public.carpool_matches for update
  to authenticated
  using (
    exists (
      select 1 from public.carpool_offers o
      join public.events e on e.id = o.event_id
      where o.id = carpool_matches.offer_id
        and public.is_group_admin(e.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.carpool_offers o
      join public.events e on e.id = o.event_id
      where o.id = carpool_matches.offer_id
        and public.is_group_admin(e.group_id)
    )
  );

create policy "carpool_matches_delete_admin"
  on public.carpool_matches for delete
  to authenticated
  using (
    exists (
      select 1 from public.carpool_offers o
      join public.events e on e.id = o.event_id
      where o.id = carpool_matches.offer_id
        and public.is_group_admin(e.group_id)
    )
  );

-- ---------------------------------------------------------
-- updated_at 자동 갱신
-- ---------------------------------------------------------
create trigger set_carpool_offers_updated_at
  before update on public.carpool_offers
  for each row
  execute function public.set_updated_at();

create trigger set_carpool_requests_updated_at
  before update on public.carpool_requests
  for each row
  execute function public.set_updated_at();

create trigger set_carpool_matches_updated_at
  before update on public.carpool_matches
  for each row
  execute function public.set_updated_at();
