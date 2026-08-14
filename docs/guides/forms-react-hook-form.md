# 폼 처리 가이드 (현재 패턴: useState + Supabase Auth 직접 호출)

> ⚠️ 이 문서의 이전 버전은 `react-hook-form` + `zod` + `@hookform/resolvers` + Server Actions 조합을 전제로 작성되었지만, 이 패키지들은 `package.json`에 **설치되어 있지 않다**. 실제로 이 저장소의 모든 폼(`components/login-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`)은 순수 `useState` + `<form onSubmit>` + Supabase 클라이언트 직접 호출 패턴을 사용한다. 아래 내용은 그 실제 패턴을 문서화한 것이다.

## 🚀 실제 폼 아키텍처

모든 인증 폼은 `"use client"` 컴포넌트이며 다음 구조를 공유한다:

1. 필드마다 `useState` 하나씩 (`email`, `password` 등)
2. `error: string | null`, `isLoading: boolean` 상태
3. `<form onSubmit={handleXxx}>`에서 `e.preventDefault()` 후 `lib/supabase/client.ts`의 `createClient()`로 브라우저 클라이언트를 만들고 Supabase Auth 메서드를 직접 호출
4. `try/catch/finally`로 에러 메시지와 로딩 상태 관리, 성공 시 `useRouter().push(...)`로 이동

```tsx
// components/login-form.tsx (실제 코드 요약)
"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
```

새 인증/데이터 폼을 추가할 때는 이 패턴을 그대로 따르는 것이 이 코드베이스와 일관성을 유지하는 방법이다.

## 🔐 각 폼이 호출하는 Supabase Auth 메서드

| 컴포넌트             | 파일                                  | 호출 메서드                                                               | 성공 시 동작                                  |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| `LoginForm`          | `components/login-form.tsx`           | `supabase.auth.signInWithPassword({ email, password })`                   | `router.push("/protected")`                   |
| `SignUpForm`         | `components/sign-up-form.tsx`         | `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })` | `router.push("/auth/sign-up-success")`        |
| `ForgotPasswordForm` | `components/forgot-password-form.tsx` | `supabase.auth.resetPasswordForEmail(email, { redirectTo })`              | 같은 화면에서 `success` 상태로 안내 문구 전환 |
| `UpdatePasswordForm` | `components/update-password-form.tsx` | `supabase.auth.updateUser({ password })`                                  | `router.push("/protected")`                   |

이메일 링크를 통한 콜백(회원가입 확인, 비밀번호 재설정 링크 클릭)은 클라이언트 폼이 아니라 `app/auth/confirm/route.ts` Route Handler가 서버에서 `supabase.auth.verifyOtp({ type, token_hash })`를 호출해 처리한다. 즉 이 프로젝트에는 클라이언트 폼 검증과 별개로 **서버 측 검증/후처리가 필요한 흐름은 Server Action이 아니라 Route Handler로 구현되어 있다**는 점을 새 기능 설계 시 참고할 것.

## ✅ 현재 패턴에서 지켜야 할 규칙

```tsx
// ✅ 에러 상태는 항상 초기화 후 시작
setError(null);
setIsLoading(true);

// ✅ Supabase 에러는 throw해서 catch 블록에서 일괄 처리
const { error } = await supabase.auth.xxx(...);
if (error) throw error;

// ✅ finally에서 반드시 로딩 상태 해제
} finally {
  setIsLoading(false);
}

// ✅ 버튼은 isLoading 동안 disabled + 로딩 텍스트
<Button type="submit" disabled={isLoading}>
  {isLoading ? "..." : "Submit"}
</Button>
```

```tsx
// ❌ 클라이언트 검증 없이 바로 제출 (현재도 최소한의 required 속성 정도만 사용 중 —
// 이메일 형식, 비밀번호 강도 같은 규칙 검증은 아직 없음. 추가하려면 아래 "향후 확장" 참고)
// ❌ Supabase 에러 메시지를 그대로 사용자에게 노출 (i18n/문구 다듬기 없이 error.message 그대로 표시 중이므로,
//    사용자 대상 문구를 다듬으려면 이 부분을 손봐야 함)
```

## 🔭 향후 확장: react-hook-form / zod 도입 시

폼이 늘어나거나 클라이언트 측 필드 검증(이메일 형식, 비밀번호 정책, 필드 간 일치 검증 등)이 필요해지면 `react-hook-form` + `zod`를 새로 설치하는 것을 고려할 수 있다. 이 저장소에는 아직 없으므로 도입 시 직접 설치해야 한다.

```bash
npm install react-hook-form zod @hookform/resolvers
npx shadcn@latest add form   # components/ui/form.tsx가 필요해짐
```

설치 후에는 [React Hook Form 공식 문서](https://react-hook-form.com/)와 [Zod 공식 문서](https://zod.dev/), [shadcn/ui Form 컴포넌트 문서](https://ui.shadcn.com/docs/components/form)를 따라 스키마 기반 검증으로 마이그레이션하되, 현재 폼들이 Server Action이 아니라 Supabase 클라이언트를 직접 호출하는 구조라는 점을 감안해 `zodResolver` + `useForm`을 기존 `handleSubmit` 로직 위에 얹는 방식으로 점진적으로 도입할 것 — Server Actions/`useActionState` 기반 예제를 그대로 옮기면 이 프로젝트의 인증 흐름과 어긋난다.

## 🎯 체크리스트

새 폼 작성 시 확인사항 (현재 스택 기준):

- [ ] `"use client"` + `useState`로 필드/에러/로딩 상태 관리
- [ ] `lib/supabase/client.ts`의 `createClient()`로 브라우저 클라이언트 생성
- [ ] `try/catch/finally`로 에러 처리 및 로딩 상태 해제
- [ ] 제출 버튼에 `disabled={isLoading}` + 로딩 텍스트 적용
- [ ] 서버 측 검증이 필요한 콜백(이메일 링크 등)은 Route Handler(`app/.../route.ts`)로 구현
- [ ] `npm run type-check`, `npm run lint` 통과
