# Supabase MCP 서버 설정 수정

## Context

사용자는 아래 명령어로 Supabase MCP 서버를 설치하려 했습니다.

```
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=dmsinrvnbznvipmmntho&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment"
```

하지만 실제 `.mcp.json`에는 `features` 쿼리 파라미터가 누락된 채로 등록되어 있습니다:

```json
"url": "https://mcp.supabase.com/mcp?project_ref=dmsinrvnbznvipmmntho"
```

`claude mcp list` 확인 결과도 동일한 URL(파라미터 누락)로 등록되어 있고, 상태는 `Needs authentication`으로 나타납니다. 즉:

1. URL에 `features` 파라미터가 빠져 있어 docs/account/database/debugging/development 기능이 활성화되지 않은 상태입니다.
2. 서버 등록 자체는 되었지만 OAuth 인증이 완료되지 않아 실제로 사용할 수 없는 상태입니다.

## 변경 사항

### 1. `.mcp.json` 수정

`url` 값을 원래 요청한 전체 URL로 교체합니다.

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=dmsinrvnbznvipmmntho&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment"
    }
  }
}
```

### 2. 인증 진행

URL 수정 후 `mcp__supabase__authenticate` 도구를 사용해 OAuth 인증을 진행합니다. (브라우저 인증 플로우가 필요할 수 있으며, 완료 후 `mcp__supabase__complete_authentication`으로 마무리)

## 검증

- `claude mcp list` 재실행 → `supabase` 서버 URL에 `features` 파라미터가 포함되어 있는지, 상태가 `Needs authentication`에서 정상(✓ Connected 등)으로 바뀌는지 확인
