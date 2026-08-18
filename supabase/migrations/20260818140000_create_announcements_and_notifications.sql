-- =========================================================
-- announcements + notifications: 모임 공지와 인앱 알림
-- =========================================================

-- ---------------------------------------------------------
-- notifications (알림 수신함)
-- 클라이언트가 직접 insert/delete할 수 없고, 아래 security definer 트리거들만
-- 채워 넣는다. 본인 알림의 select/read_at update만 허용한다.
-- ---------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null
    check (type in ('announcement', 'group_join_approved', 'event_rsvp_approved', 'event_rsvp_rejected')),
  title text not null,
  body text,
  link_path text,
  related_group_id uuid references public.groups(id) on delete cascade,
  related_event_id uuid references public.events(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is
  '인앱 알림. security definer 트리거로만 생성되며, 사용자는 본인 알림 조회와 읽음 처리만 가능하다.';

create index notifications_user_id_read_at_idx on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using ( user_id = (select auth.uid()) );

create policy "notifications_update_own_read"
  on public.notifications for update
  to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );

alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------
-- announcements (공지)
-- ---------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete set null,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.announcements is
  '모임 공지. group_id의 approved 멤버만 조회, admin만 작성/수정/삭제 가능.';

create index announcements_group_id_created_at_idx on public.announcements (group_id, created_at desc);

alter table public.announcements enable row level security;

create policy "announcements_select_group_member"
  on public.announcements for select
  to authenticated
  using ( public.is_group_member(group_id) );

create policy "announcements_insert_group_admin"
  on public.announcements for insert
  to authenticated
  with check ( public.is_group_admin(group_id) );

create policy "announcements_update_group_admin"
  on public.announcements for update
  to authenticated
  using ( public.is_group_admin(group_id) )
  with check ( public.is_group_admin(group_id) );

create policy "announcements_delete_group_admin"
  on public.announcements for delete
  to authenticated
  using ( public.is_group_admin(group_id) );

create trigger set_announcements_updated_at
  before update on public.announcements
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 알림 팬아웃 트리거 1: 공지 작성 시 작성자를 제외한 approved 멤버 전원에게 알림
-- ---------------------------------------------------------
create or replace function public.notify_group_members_on_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, link_path, related_group_id)
  select gm.user_id,
         'announcement',
         '새 공지: ' || new.title,
         left(new.content, 100),
         '/groups/' || new.group_id || '/announcements/' || new.id,
         new.group_id
  from public.group_members gm
  where gm.group_id = new.group_id
    and gm.status = 'approved'
    and gm.user_id != new.author_id;
  return new;
end;
$$;

create trigger on_announcement_created
  after insert on public.announcements
  for each row
  execute function public.notify_group_members_on_announcement();

revoke execute on function public.notify_group_members_on_announcement() from public, anon, authenticated;

-- ---------------------------------------------------------
-- 알림 팬아웃 트리거 2: 모임 가입 승인 시 본인에게 알림
-- ---------------------------------------------------------
create or replace function public.notify_on_group_join_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.notifications (user_id, type, title, link_path, related_group_id)
    values (
      new.user_id,
      'group_join_approved',
      '모임 가입이 승인되었습니다.',
      '/groups/' || new.group_id,
      new.group_id
    );
  end if;
  return new;
end;
$$;

create trigger on_group_member_status_changed
  after update of status on public.group_members
  for each row
  execute function public.notify_on_group_join_approved();

revoke execute on function public.notify_on_group_join_approved() from public, anon, authenticated;

-- ---------------------------------------------------------
-- 알림 팬아웃 트리거 3: 이벤트 참석 신청 승인/거절 시 본인에게 알림
-- ---------------------------------------------------------
create or replace function public.notify_on_event_rsvp_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_title text;
  v_group_id uuid;
begin
  if new.status in ('approved', 'rejected') and old.status is distinct from new.status then
    select title, group_id into v_event_title, v_group_id
    from public.events where id = new.event_id;

    insert into public.notifications (user_id, type, title, link_path, related_group_id, related_event_id)
    values (
      new.user_id,
      case when new.status = 'approved' then 'event_rsvp_approved' else 'event_rsvp_rejected' end,
      case when new.status = 'approved'
        then '참석 신청이 승인되었습니다: ' || v_event_title
        else '참석 신청이 거절되었습니다: ' || v_event_title
      end,
      '/groups/' || v_group_id || '/events/' || new.event_id,
      v_group_id,
      new.event_id
    );
  end if;
  return new;
end;
$$;

create trigger on_event_participant_status_changed
  after update of status on public.event_participants
  for each row
  execute function public.notify_on_event_rsvp_response();

revoke execute on function public.notify_on_event_rsvp_response() from public, anon, authenticated;
