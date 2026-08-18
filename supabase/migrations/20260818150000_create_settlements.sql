-- =========================================================
-- settlements + settlement_items: 이벤트 비용 N빵 정산 및 입금 확인
-- =========================================================

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete set null,
  title text not null,
  total_amount numeric(12, 0) not null check (total_amount > 0),
  split_method text not null default 'equal' check (split_method in ('equal', 'custom')),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);

comment on table public.settlements is
  '이벤트당 하나의 정산. 참여자 수 기준 N빵 계산 후 settlement_items로 개별 분담액을 기록한다.';

create table public.settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 0) not null check (amount >= 0),
  is_paid boolean not null default false,
  paid_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (settlement_id, user_id)
);

comment on table public.settlement_items is
  '정산 참여자별 분담액과 입금 확인 상태. 본인은 is_paid/paid_at만 변경 가능(트리거로 컬럼 제한).';

alter table public.settlements enable row level security;

create policy "settlements_select_group_member"
  on public.settlements for select
  to authenticated
  using ( public.is_group_member(group_id) );

create policy "settlements_insert_group_admin"
  on public.settlements for insert
  to authenticated
  with check ( public.is_group_admin(group_id) );

create policy "settlements_update_group_admin"
  on public.settlements for update
  to authenticated
  using ( public.is_group_admin(group_id) )
  with check ( public.is_group_admin(group_id) );

create policy "settlements_delete_group_admin"
  on public.settlements for delete
  to authenticated
  using ( public.is_group_admin(group_id) );

alter table public.settlement_items enable row level security;

create policy "settlement_items_select_group_member"
  on public.settlement_items for select
  to authenticated
  using (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_items.settlement_id
        and public.is_group_member(s.group_id)
    )
  );

create policy "settlement_items_insert_group_admin"
  on public.settlement_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_items.settlement_id
        and public.is_group_admin(s.group_id)
    )
  );

create policy "settlement_items_update_admin_or_self"
  on public.settlement_items for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.settlements s
      where s.id = settlement_items.settlement_id
        and public.is_group_admin(s.group_id)
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.settlements s
      where s.id = settlement_items.settlement_id
        and public.is_group_admin(s.group_id)
    )
  );

create policy "settlement_items_delete_group_admin"
  on public.settlement_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_items.settlement_id
        and public.is_group_admin(s.group_id)
    )
  );

create trigger set_settlements_updated_at
  before update on public.settlements
  for each row
  execute function public.set_updated_at();

create trigger set_settlement_items_updated_at
  before update on public.settlement_items
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 컬럼 단위 방어: RLS는 행 단위까지만 제한 가능하므로, 본인이 자기 행을
-- 업데이트할 때 amount/user_id/settlement_id를 바꾸지 못하도록 트리거로 막는다.
-- (관리자는 컬럼 제한 없이 갱신 가능)
-- ---------------------------------------------------------
create or replace function public.guard_settlement_item_self_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.settlements s
    where s.id = new.settlement_id
      and public.is_group_admin(s.group_id)
  ) then
    return new;
  end if;

  if new.settlement_id != old.settlement_id
     or new.user_id != old.user_id
     or new.amount != old.amount then
    raise exception 'only is_paid/paid_at can be self-updated on settlement_items';
  end if;

  return new;
end;
$$;

create trigger guard_settlement_item_self_update_trigger
  before update on public.settlement_items
  for each row
  execute function public.guard_settlement_item_self_update();

revoke execute on function public.guard_settlement_item_self_update() from public, anon, authenticated;
