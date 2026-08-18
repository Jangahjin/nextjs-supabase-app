-- =========================================================
-- groups + group_members: 모임(그룹) 및 가입/역할 관리
-- =========================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  category text,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  member_limit int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.groups is
  '모임(그룹). owner_id는 생성자이며 handle_new_group 트리거로 group_members에도 owner role로 자동 등록된다.';

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'left')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

comment on table public.group_members is
  '모임 가입/역할. status=approved인 행만 실제 활동 멤버로 취급한다.';

create index group_members_user_id_idx on public.group_members (user_id);
create index group_members_group_id_status_idx on public.group_members (group_id, status);

-- ---------------------------------------------------------
-- RLS 헬퍼 함수: group_members 자기참조 재귀를 피하기 위한 security definer 함수.
-- auth.uid()만 내부에서 사용해 임의 유저의 멤버십을 조회하는 용도로 악용되지 않게 한다.
-- ---------------------------------------------------------
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and status = 'approved'
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and status = 'approved'
      and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.is_group_admin(uuid) from public, anon;

-- ---------------------------------------------------------
-- RLS: groups
-- ---------------------------------------------------------
alter table public.groups enable row level security;

create policy "groups_select_member"
  on public.groups for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_group_member(id)
    or exists (
      select 1 from public.group_members
      where group_id = groups.id
        and user_id = (select auth.uid())
        and status = 'pending'
    )
  );

create policy "groups_insert_own"
  on public.groups for insert
  to authenticated
  with check ( owner_id = (select auth.uid()) );

create policy "groups_update_admin"
  on public.groups for update
  to authenticated
  using ( public.is_group_admin(id) )
  with check ( public.is_group_admin(id) );

create policy "groups_delete_owner"
  on public.groups for delete
  to authenticated
  using ( owner_id = (select auth.uid()) );

-- ---------------------------------------------------------
-- RLS: group_members
-- ---------------------------------------------------------
alter table public.group_members enable row level security;

create policy "group_members_select_self_or_member"
  on public.group_members for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (status = 'approved' and public.is_group_member(group_id))
    or public.is_group_admin(group_id)
  );

create policy "group_members_insert_self_pending"
  on public.group_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
  );

create policy "group_members_update_admin_or_self_leave"
  on public.group_members for update
  to authenticated
  using (
    public.is_group_admin(group_id)
    or user_id = (select auth.uid())
  )
  with check (
    public.is_group_admin(group_id)
    or (user_id = (select auth.uid()) and status = 'left')
  );

create policy "group_members_delete_self_pending"
  on public.group_members for delete
  to authenticated
  using ( user_id = (select auth.uid()) and status = 'pending' );

create policy "group_members_delete_admin"
  on public.group_members for delete
  to authenticated
  using ( public.is_group_admin(group_id) );

-- ---------------------------------------------------------
-- updated_at 자동 갱신 (profiles 마이그레이션에서 만든 public.set_updated_at 재사용)
-- ---------------------------------------------------------
create trigger set_groups_updated_at
  before update on public.groups
  for each row
  execute function public.set_updated_at();

create trigger set_group_members_updated_at
  before update on public.group_members
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 모임 생성 시 owner를 group_members에 approved 상태로 자동 등록
-- ---------------------------------------------------------
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role, status, joined_at)
  values (new.id, new.owner_id, 'owner', 'approved', now());
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row
  execute function public.handle_new_group();

revoke execute on function public.handle_new_group() from public, anon, authenticated;

-- ---------------------------------------------------------
-- 초대코드로 모임 미리보기: 비멤버도 정확한 invite_code를 알면
-- 최소 정보(이름/설명/카테고리/정원)만 조회 가능하게 하는 RPC.
-- groups 테이블 전체 select 권한을 열지 않기 위해 별도 함수로 분리한다.
-- ---------------------------------------------------------
create or replace function public.get_group_by_invite_code(p_invite_code text)
returns table (id uuid, name text, description text, category text, member_limit int)
language sql
stable
security definer
set search_path = ''
as $$
  select id, name, description, category, member_limit
  from public.groups
  where invite_code = p_invite_code;
$$;

grant execute on function public.get_group_by_invite_code(text) to authenticated;
revoke execute on function public.get_group_by_invite_code(text) from public, anon;
