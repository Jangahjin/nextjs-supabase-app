-- =========================================================
-- event_participants를 Realtime publication에 추가
-- 이벤트 상세 페이지의 참석 확정 인원수를 실시간으로 갱신하기 위함(LiveParticipantCount 컴포넌트).
-- =========================================================

alter publication supabase_realtime add table public.event_participants;
