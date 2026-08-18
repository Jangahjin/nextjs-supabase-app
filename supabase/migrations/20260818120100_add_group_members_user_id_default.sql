-- group_members.user_id도 groups.owner_id와 동일하게 auth.uid()를 기본값으로 사용해
-- 클라이언트가 본인 user_id를 직접 채우지 않아도 가입 신청이 가능하게 한다.
alter table public.group_members
  alter column user_id set default auth.uid();
