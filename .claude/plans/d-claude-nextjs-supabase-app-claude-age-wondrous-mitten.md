# 구글 소셜 로그인(OAuth) 추가

## Context

현재 이 프로젝트는 이메일/비밀번호 로그인만 지원한다 (`components/login-form.tsx`, `components/sign-up-form.tsx`가 각각 `supabase.auth.signInWithPassword` / `supabase.auth.signUp`을 직접 호출). 사용자가 이메일/비밀번호 입력 없이 구글 계정으로 바로 로그인/가입할 수 있도록 OAuth 로그인을 추가한다.

조사 결과 이 저장소에는 OAuth 콜백(`code` 파라미터 + `exchangeCodeForSession`)을 처리하는 라우트가 없다. `app/auth/confirm/route.ts`는 이메일 확인/매직링크용 OTP(`token_hash`+`type`) 콜백만 처리하는 별개 메커니즘이라 재사용할 수 없으므로 OAuth 전용 콜백 라우트를 새로 만들어야 한다.

사용자 결정사항:

- 구글 버튼은 로그인 + 회원가입 페이지 둘 다에 추가
- 로그인 성공 후 `/protected`로 이동 (기존 이메일 로그인과 동일한 목적지)
- Google Cloud Console의 OAuth Client ID/Secret은 아직 미발급 → 발급 절차 안내 포함

## 구현 범위

### 1. `components/google-auth-button.tsx` (신규, 공용 클라이언트 컴포넌트)

로그인/회원가입 폼 양쪽에서 재사용할 구글 로그인 버튼. `lib/supabase/client.ts`의 `createClient()`를 클릭 핸들러 내부에서 새로 생성하는 기존 패턴을 그대로 따른다.

```tsx
"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function GoogleAuthButton({ onError }: { onError: (message: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    const supabase = createClient();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/protected` },
    });
    if (error) {
      onError(error.message);
      setIsLoading(false);
    }
    // 성공 시 signInWithOAuth가 자동으로 window.location을 구글 로그인 페이지로 이동시킴
  };

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} disabled={isLoading}>
      {/* 구글 브랜드 "G" 로고 인라인 SVG — lucide-react에는 브랜드 아이콘이 없어 직접 포함 */}
      <svg .../>
      {isLoading ? "이동 중..." : "Google로 계속하기"}
    </Button>
  );
}
```

`@supabase/supabase-js`의 `signInWithOAuth`는 브라우저 환경에서 기본적으로 반환된 인증 URL로 `window.location`을 자동 이동시키므로(옵션 `skipBrowserRedirect`를 주지 않는 한), 호출 함수 자체에서 별도 리다이렉트 처리는 필요 없다 — 호출 직후 에러가 없으면 브라우저가 구글 로그인 화면으로 넘어간다.

### 2. `app/auth/callback/route.ts` (신규)

`app/auth/confirm/route.ts`와 동일한 구조(에러 시 `/auth/error?error=...`로 리다이렉트)를 따르되, OTP 대신 PKCE `code` 파라미터를 처리한다.

```ts
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/protected";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
  }

  redirect(`/auth/error?error=${encodeURIComponent("Could not authenticate user")}`);
}
```

`proxy.ts`의 리다이렉트 예외 규칙(`pathname.startsWith("/auth")`)에 `/auth/callback`이 이미 포함되므로 `proxy.ts`/`lib/supabase/proxy.ts`는 수정할 필요가 없다.

### 3. `components/login-form.tsx`, `components/sign-up-form.tsx` 수정

기존 `<form>` 하단, 제출 버튼 다음에 구분선("또는")과 `<GoogleAuthButton onError={setError} />`를 추가한다. 각 폼이 이미 가진 `error` state(`useState<string | null>`)를 그대로 재사용해 구글 로그인 실패도 동일한 위치에 표시한다. 새 shadcn `separator` 컴포넌트를 설치하지 않고 기존 Tailwind 유틸리티만으로 구분선을 구성한다(불필요한 의존성 추가 방지).

### 4. Supabase 프로젝트 설정 (코드 변경 아님 — 외부 콘솔 작업, 사용자가 직접 수행)

Supabase MCP 도구 중 OAuth 프로바이더를 설정하는 도구는 없으므로(스키마/타입/로그 도구만 존재) 아래는 사용자가 브라우저에서 직접 진행해야 한다:

1. **Google Cloud Console** (console.cloud.google.com) → "API 및 서비스" → "사용자 인증 정보"
   - OAuth 동의 화면 구성 (외부 사용자 유형)
   - "OAuth 클라이언트 ID" 생성, 애플리케이션 유형: "웹 애플리케이션"
   - 승인된 리디렉션 URI에 `https://dmsinrvnbznvipmmntho.supabase.co/auth/v1/callback` 추가 (project_ref는 `.mcp.json`에 연결된 원격 프로젝트 기준)
2. **Supabase Dashboard** → Authentication → Providers → Google
   - 활성화 후 1번에서 발급받은 Client ID / Client Secret 입력 후 저장
3. **Supabase Dashboard** → Authentication → URL Configuration → Redirect URLs
   - `http://localhost:3000/auth/callback` (로컬 개발용) 추가
   - 배포된 도메인이 있다면 `https://<배포도메인>/auth/callback`도 추가

이 단계가 끝나기 전에는 코드가 완성되어도 "Google로 계속하기" 클릭 시 Supabase가 `provider is not enabled` 에러를 반환한다.

### 5. 데이터베이스 — 변경 불필요

`supabase/migrations/20260813120000_create_profiles.sql`의 `handle_new_user()` 트리거는 `auth.users` insert 시 프로바이더에 관계없이 실행되며, `raw_user_meta_data ->> 'full_name'` / `'avatar_url'`을 읽는다. Supabase는 Google 로그인 시 이 두 필드를 자동으로 채워주므로 기존 마이그레이션 그대로 구글 가입 사용자의 프로필도 정상 생성된다. 새 마이그레이션이나 `types/database.types.ts` 재생성은 필요 없다.

## 검증

1. `npm run lint`, `npm run type-check` 통과 확인
2. 사용자가 위 4번 외부 설정을 완료한 뒤 `npm run dev` 실행
3. `/auth/login`, `/auth/sign-up`에서 "Google로 계속하기" 클릭 → 구글 로그인 → `/protected`로 리다이렉트되는지, 그리고 `profiles` 테이블에 새 행이 생성되는지 확인 (playwright MCP 또는 수동 브라우저 확인 + `mcp__supabase__execute_sql`로 `select * from profiles order by created_at desc limit 1` 조회)
4. `mcp__supabase__get_advisors`로 RLS/보안 경고 여부 재확인 (스키마 변경이 없으므로 새 경고는 없어야 함)
