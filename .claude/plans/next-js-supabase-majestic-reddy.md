# Next.js + Supabase 전문 서브 에이전트 생성

## Context

사용자는 Claude Code 환경에서 이 프로젝트(Next.js 16 App Router + Supabase `@supabase/ssr`)의 개발을 전담 지원할 서브 에이전트를 원한다. 프로젝트에는 이미 `.claude/agents/notion-api-database-expert.md`가 참고 포맷으로 존재하며, 시스템에 등록된 다른 에이전트 목록(`nextjs-app-developer`, `starter-cleaner` 등)은 이미 특정 역할(앱 구조 설계, 초기화 등)로 세분화되어 있으므로, 새 에이전트는 이들과 겹치지 않게 "Supabase 통합"에 집중된 Next.js 풀스택 전문가로 정의한다. 목표는 이 레포의 실제 아키텍처(3분할 Supabase 클라이언트, RLS+트리거 패턴, MCP 기반 원격 마이그레이션 워크플로우)를 정확히 반영하는 에이전트 프롬프트를 작성해, 향후 인증/DB/서버 컴포넌트 작업에서 일관되게 이 패턴을 따르도록 하는 것이다.

## 요구사항 (사용자 명시)

- 파일 경로: `.claude/agents/nextjs-supabase-expert.md`
- 역할: Next.js + Supabase 웹 애플리케이션 개발 지원 전문 서브 에이전트
- 모델: `sonnet`
- 권한: "모든 권한 기능" → frontmatter에 `tools` 필드를 명시하지 않아 전체 툴 접근 허용 (기존 `notion-api-database-expert.md`와 동일한 방식 — 시스템 에이전트 목록에 "Tools: All tools"로 표시됨)

## 파일 포맷 (기존 관례 준수)

`notion-api-database-expert.md`를 참고 템플릿으로 사용:

```yaml
---
name: nextjs-supabase-expert
description: Use this agent when... (한국어 트리거 설명 + 2~3개 <example> 블록, User/assistant/commentary 포함)
model: sonnet
---
```

이어서 본문(한국어)에 다음 섹션 구성:

1. **정체성 선언** — "당신은 Next.js와 Supabase를 전문적으로 다루는 풀스택 개발 전문가입니다" 톤으로 시작
2. **핵심 역할** — 이 레포에 특화된 항목:
   - Supabase 클라이언트 3분할 패턴 구현/유지 (`lib/supabase/client.ts` / `server.ts` / `proxy.ts`) — Fluid compute 환경에서 전역 변수 클라이언트 금지 원칙 명시
   - `proxy.ts`(Next.js 16의 middleware 대체) 세션 갱신 및 리다이렉트 matcher 로직
   - DB 스키마 설계 시 RLS + `on_auth_user_created` 트리거 + `security definer`/`search_path=''` + RPC 노출 차단(`revoke execute`) 패턴 준수 — `supabase/migrations/20260813120000_create_profiles.sql`을 표준 예시로 참조
   - 마이그레이션은 로컬 CLI가 아닌 Supabase MCP(`mcp__supabase__apply_migration`, `list_migrations`, `generate_typescript_types`)로 원격 프로젝트에 직접 적용하는 워크플로우
   - App Router 데이터 페칭 패턴(Server Component + `Suspense`, `app/instruments/page.tsx` 스타일)
   - shadcn/ui(new-york) + TailwindCSS 스타일링 컨벤션 준수
3. **작업 원칙** — TypeScript 우선, 한국어 주석, 에러 핸들링은 실제 발생 가능한 경우에만, 환경변수(`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) 관리, 스키마 변경 후 `database.types.ts` 재생성 필수
4. **작업 프로세스** — 요구사항 분석 → 기존 패턴 재사용 확인(`lib/supabase/`, `docs/guides/`) → 구현 → 검증(lint/type-check/format, 필요 시 MCP로 원격 확인)
5. **자가 검증 체크리스트** — RLS 정책 유무, 클라이언트 컨텍스트(browser/server/proxy) 올바른 선택, 타입 동기화, 커밋/문서 규칙 등
6. **응답 형식** — 한국어 설명, 실행 가능한 코드, 타입 정의, 사용 예시, 주의사항 (기존 템플릿과 동일)

## 실행 단계

1. `.claude/agents/nextjs-supabase-expert.md` 신규 생성 (Write 도구)
2. frontmatter에 `name`, `description`(2~3개 example 블록 포함, 한국어 트리거 시나리오), `model: sonnet` 작성. `tools` 필드는 생략하여 전체 권한 부여
3. 본문은 위 6개 섹션 구조로 이 레포의 실제 파일 경로·패턴명을 인용하여 작성 (일반론이 아닌 이 프로젝트 특화 내용)

## 검증

- 파일 생성 후 `.claude/agents/notion-api-database-expert.md`와 frontmatter 스키마(name/description/model 필드 형식) 일치 여부 육안 확인
- YAML frontmatter가 `---`로 올바르게 열리고 닫히는지 확인
- 별도 빌드/테스트 불필요 (마크다운 설정 파일이므로 lint/type-check 대상 아님)
