-- =========================================================
-- group-covers 버킷에 select 정책 추가 (20260821120000의 누락 보완)
-- =========================================================

-- group-covers 버킷의 public 플래그는 /storage/v1/object/public/... 다운로드 엔드포인트에만
-- 적용되고, Storage API가 업로드 후 방금 쓴 행을 내부적으로 다시 읽어오는 등
-- storage.objects 테이블 자체에 대한 접근에는 별도 select 정책이 필요하다
-- (select 정책이 없으면 insert...returning류 내부 동작이 RLS 위반으로 실패한다 —
-- 실제로 업로드 API 호출 시 "new row violates row-level security policy" 403이 재현됨).
-- 커버 사진은 원래 공개로 보여줄 목적이므로 그룹 멤버십 제한 없이 인증된 사용자 전체에게 열어준다.
create policy "group_covers_select_authenticated"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'group-covers' );
