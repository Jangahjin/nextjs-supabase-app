-- event_participants_update_admin_or_self_cancel의 with check가 본인의 status 변경을
-- 'cancelled'로만 허용해, 취소 후 재신청('applied'로 되돌리기)이 막히는 문제를 수정한다.
drop policy "event_participants_update_admin_or_self_cancel" on public.event_participants;

create policy "event_participants_update_admin_or_self_toggle"
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
    (user_id = (select auth.uid()) and status in ('applied', 'cancelled'))
    or exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and public.is_group_admin(e.group_id)
    )
  );
