-- =========================================================
-- Trigger-only functions must not be directly callable via the
-- PostgREST RPC surface (/rest/v1/rpc/handle_new_user etc).
-- Trigger invocation does not require EXECUTE grants, so revoking
-- them from PUBLIC/anon/authenticated only removes the RPC exposure.
-- =========================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_update() from public, anon, authenticated;
