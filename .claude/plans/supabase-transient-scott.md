# Supabase MCP 인증 오류 해결

## Context

Supabase MCP 서버(`mcp__supabase__authenticate`)로 인증을 시도할 때 "귀하의 계정은 사전 선택된 조직의 회원이 아닙니다"라는 오류가 발생했습니다.

원인은 `.mcp.json`의 Supabase 서버 URL에 있습니다:

```
https://mcp.supabase.com/mcp?project_ref=pviqdmxduwvnjicsnypk
```

`project_ref` 쿼리 파라미터가 지정되어 있으면, Supabase MCP 서버는 OAuth 인증 화면에서 "이 project_ref가 속한 조직"을 미리 선택된 상태로 띄웁니다. 이때 브라우저에 로그인되어 있는 Supabase 계정이 그 조직의 멤버가 아니면 인증이 거부됩니다.

사용자는 "올바른 계정으로 재로그인" 방식을 선택했습니다. 이 방법은 `.mcp.json`을 전혀 수정하지 않고, Supabase 측 로그인 계정/브라우저 세션만 바로잡는 방법입니다. 따라서 이 작업은 **코드 변경이 필요 없는 순수 계정 조치**입니다.

## 진행 절차 (사용자가 직접 수행)

1. **어느 조직 소속 프로젝트인지 확인**
   - https://supabase.com/dashboard 에 (평소 쓰던 아무 계정으로) 로그인 후, 조직 전환 드롭다운(좌측 상단)에서 여러 조직을 확인
   - 또는 프로젝트 URL `https://supabase.com/dashboard/project/pviqdmxduwvnjicsnypk` 로 직접 접속해서, 리다이렉트되는 조직명을 확인
   - `pviqdmxduwvnjicsnypk` 프로젝트가 어느 조직(개인용 vs 팀/회사) 소속인지 특정

2. **브라우저 세션 정리**
   - 만약 다른 Supabase 계정으로 이미 로그인되어 있다면, 해당 세션에서 로그아웃 (또는 시크릿/프라이빗 창 사용)
   - `https://supabase.com/dashboard` 에서 1번 단계에서 확인한 조직 소속 계정으로 다시 로그인

3. **MCP 인증 재시도**
   - Claude Code에서 `mcp__supabase__authenticate` 흐름을 다시 실행 (또는 `/mcp` 로 supabase 서버 재연결)
   - 이번엔 사전 선택된 조직 화면에서 접근 권한 승인이 정상적으로 진행되는지 확인

4. **여러 조직에 동시 소속된 경우**
   - 만약 사용하려는 계정이 여러 조직에 속해 있고 그중 `pviqdmxduwvnjicsnypk`의 조직이 포함되어 있다면, 조직 선택 화면에서 해당 조직을 명시적으로 선택하면 됩니다.

## 검증

- 인증 완료 후 Claude Code에서 Supabase MCP 도구(`mcp__supabase__*`)가 정상적으로 프로젝트 정보를 조회할 수 있는지 확인 (예: 테이블 목록 조회 등 read-only 호출 1회)

## 참고 (선택 사항)

- 계정 재로그인으로 해결되지 않거나, 앞으로 프로젝트를 특정 조직에 고정하고 싶지 않다면, `.mcp.json`에서 `project_ref` 쿼리 파라미터를 제거하는 방법도 있습니다. 다만 이번 작업 범위에는 포함하지 않습니다.
