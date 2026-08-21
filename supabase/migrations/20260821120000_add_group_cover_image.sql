-- =========================================================
-- groups.cover_image_url + group-covers Storage 버킷: 모임 대표 사진(커버 이미지)
-- =========================================================

alter table public.groups
  add column cover_image_url text;

comment on column public.groups.cover_image_url is
  '모임 대표 사진(커버 이미지) public URL. group-covers 버킷의 {group_id}/cover 객체를 가리킨다.';

-- ---------------------------------------------------------
-- Storage 버킷: 모임당 1장, 고정 경로({group_id}/cover)로 upsert
-- public 버킷이므로 getPublicUrl로 얻은 URL은 RLS 없이 읽을 수 있다.
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-covers', 'group-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- RLS: storage.objects — group-covers 버킷 쓰기(insert/update/delete)는
-- 해당 group_id의 관리자만 가능. 기존 is_group_admin(uuid) 헬퍼를 재사용해
-- 새 서브쿼리를 작성하지 않는다. 경로 규칙은 '{group_id}/cover'이므로
-- storage.foldername(name)의 첫 세그먼트가 group_id다.
-- ---------------------------------------------------------
create policy "group_covers_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'group-covers'
    and public.is_group_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "group_covers_update_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'group-covers'
    and public.is_group_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'group-covers'
    and public.is_group_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "group_covers_delete_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'group-covers'
    and public.is_group_admin(((storage.foldername(name))[1])::uuid)
  );

-- select 정책은 의도적으로 추가하지 않는다: public 버킷이므로
-- /storage/v1/object/public/... 경로(= supabase-js getPublicUrl())로의
-- 읽기는 storage.objects RLS를 우회한다(버킷의 public 플래그만 확인).
-- 인증된 사용자 전용 다운로드(예: supabase.storage.download())가
-- 필요해지면 그때 is_group_member(...) 기반 select 정책을 별도로 추가한다.
