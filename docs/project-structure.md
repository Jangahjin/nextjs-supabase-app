# 프로젝트 구조 가이드

이 문서는 이 저장소(Next.js 16.3.0, App Router)의 실제 폴더 구조, 파일 조직 및 네이밍 컨벤션을 정의합니다.

## 🏗️ 전체 프로젝트 구조 (실제)

`src/` 디렉토리는 사용하지 않는다. `app/`, `components/`, `lib/`이 프로젝트 루트에 바로 위치한다.

```
nextjs-supabase-app/
├── docs/                   # 📚 프로젝트 문서 (이 파일 포함)
├── app/                    # 🚀 Next.js App Router
├── components/             # 🧩 React 컴포넌트
├── lib/                    # 🛠️ 유틸리티 및 Supabase 클라이언트
├── supabase/
│   └── migrations/        # 🗄️ SQL 마이그레이션
├── proxy.ts                # 🔐 Next.js 16 미들웨어 대체 (구 middleware.ts)
├── components.json         # shadcn/ui 설정
├── next.config.ts          # Next.js 설정
├── tailwind.config.ts      # TailwindCSS v3 설정
├── package.json            # 의존성 및 스크립트
├── tsconfig.json           # TypeScript 설정
├── .mcp.json                # MCP 서버 설정 (supabase, context7 등)
└── CLAUDE.md                # 개발 지침 메인 문서
```

## 📁 세부 폴더 구조 (실제)

### app/ - App Router 페이지

```
app/
├── layout.tsx              # 🎨 루트 레이아웃
├── page.tsx                 # 🏠 홈페이지 (/)
├── globals.css              # 🎨 전역 CSS + shadcn CSS 변수
├── favicon.ico
├── instruments/
│   └── page.tsx             # Supabase 테이블 조회 예시 페이지
├── protected/
│   ├── layout.tsx            # 인증된 사용자용 레이아웃 (nav/footer 포함)
│   └── page.tsx               # 인증 필요 페이지
└── auth/
    ├── confirm/route.ts       # 이메일 확인 Route Handler
    ├── error/page.tsx
    ├── forgot-password/page.tsx
    ├── login/page.tsx
    ├── sign-up/page.tsx
    ├── sign-up-success/page.tsx
    └── update-password/page.tsx
```

**🚀 App Router 규칙:**

- `page.tsx`: 해당 경로의 메인 페이지
- `layout.tsx`: 레이아웃 컴포넌트 (자식 페이지 감쌈)
- `route.ts`: Route Handler (예: `app/auth/confirm/route.ts`)
- `loading.tsx` / `error.tsx` / `not-found.tsx`: 필요 시 추가 (현재 프로젝트에는 없음)

### components/ - 컴포넌트 조직 (실제)

```
components/
├── ui/                      # 🎛️ shadcn/ui 원시 컴포넌트 (현재 7개만 설치됨)
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── checkbox.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   └── label.tsx
├── tutorial/                # 스타터킷 온보딩 안내 컴포넌트
│   ├── code-block.tsx
│   ├── connect-supabase-steps.tsx
│   ├── fetch-data-steps.tsx
│   ├── sign-up-user-steps.tsx
│   └── tutorial-step.tsx
├── auth-button.tsx           # 인증 상태에 따른 버튼 (로그인/로그아웃)
├── deploy-button.tsx
├── env-var-warning.tsx
├── forgot-password-form.tsx
├── hero.tsx
├── login-form.tsx            # 로그인 폼 (클라이언트 상태 + Supabase 직접 호출, 아래 참고)
├── logout-button.tsx
├── next-logo.tsx
├── sign-up-form.tsx
├── supabase-logo.tsx
├── theme-switcher.tsx
└── update-password-form.tsx
```

`layout/`, `navigation/`, `sections/`, `providers/` 같은 하위 카테고리 폴더는 아직 만들어지지 않았다 — 현재는 인증/테마 관련 컴포넌트가 `components/` 바로 아래 평평하게 위치한다. 컴포넌트 수가 늘어나 분류가 필요해지면 아래 "컴포넌트 분류 규칙"을 참고해 하위 폴더를 도입할 것.

**🧩 컴포넌트 분류 규칙 (신규 폴더 도입 시 기준):**

1. **ui/**: shadcn/ui 기반 재사용 가능한 기본 컴포넌트 — 순수 UI, 비즈니스 로직 없음
2. **layout/** (미도입): 페이지 구조를 담당하는 레이아웃 컴포넌트가 늘어나면 도입
3. **navigation/** (미도입): 메뉴, 브레드크럼, 페이지네이션이 늘어나면 도입
4. **sections/** (미도입): 랜딩 페이지 블록 등이 늘어나면 도입
5. **providers/** (미도입): 현재 `ThemeProvider`는 `app/layout.tsx`에서 `next-themes`를 직접 사용 중. Context 프로바이더가 늘어나면 도입

### lib/ - 유틸리티 및 Supabase 클라이언트 (실제)

```
lib/
├── utils.ts                 # cn() 헬퍼 + hasEnvVars 체크
└── supabase/
    ├── client.ts             # 브라우저용 Supabase 클라이언트 (createBrowserClient)
    ├── server.ts              # 서버용 Supabase 클라이언트 (createServerClient + cookies())
    ├── proxy.ts               # updateSession() — 루트 proxy.ts에서 호출
    └── database.types.ts      # Supabase CLI로 자동 생성된 타입 (수동 편집 금지)
```

`lib/schemas/`, `lib/hooks/`, `lib/types/`, `lib/api/`, `lib/constants.ts`는 아직 없다. 필요해지면 아래 확장 가이드를 따라 추가한다.

**📚 lib/ 폴더 확장 가이드 (향후 추가 시):**

```
lib/
├── utils.ts
├── supabase/
├── constants.ts       # 상수 정의
├── types/              # TypeScript 타입 정의
├── hooks/              # 커스텀 훅 (components.json의 @/hooks 별칭은 이미 정의되어 있으나 폴더는 미생성)
├── schemas/             # Zod 스키마 (zod는 현재 미설치 — 도입 시 설치 필요, forms-react-hook-form.md 참고)
└── api/                  # API 관련 유틸리티
```

## 🏷️ 파일 네이밍 컨벤션

### 파일명 규칙

```bash
# ✅ 올바른 파일명 (이 저장소의 실제 컨벤션: kebab-case)
login-form.tsx
auth-button.tsx
sign-up-form.tsx

# ❌ 잘못된 파일명
login_form.tsx        # snake_case (금지)
loginform.tsx          # 소문자만 (금지)
```

### 컴포넌트 네이밍

```typescript
// ✅ 올바른 컴포넌트 네이밍
export function LoginForm() {} // PascalCase
export function AuthButton() {} // PascalCase

// ❌ 잘못된 컴포넌트 네이밍
export function loginForm() {} // camelCase (금지)
export function login_form() {} // snake_case (금지)
```

## 🔗 경로 별칭 (Path Aliases)

`tsconfig.json`에는 `@/*` → `./*` 하나만 정의되어 있고, `components.json`에는 shadcn CLI가 컴포넌트를 생성할 때 참고하는 별칭이 정의되어 있다:

```typescript
// ✅ 경로 별칭 사용 (권장)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LoginForm } from '@/components/login-form'
import { createClient } from '@/lib/supabase/client'

// ❌ 상대 경로 사용 (금지)
import { Button } from '../../components/ui/button'
```

**📍 `components.json`에 정의된 별칭** (모두 `src/` 없이 루트 기준):

- `@/components` → `components`
- `@/lib` → `lib`
- `@/components/ui` → `components/ui`
- `@/hooks` → `hooks` (별칭은 정의되어 있지만 `hooks/` 폴더 자체는 아직 없음 — 첫 커스텀 훅 추가 시 생성)

## 📝 새 파일/폴더 추가 규칙

### 1. 새 UI 컴포넌트 추가

```bash
# shadcn/ui 컴포넌트 추가 (components.json 설정을 따라 components/ui/에 생성됨)
npx shadcn@latest add dialog
npx shadcn@latest add textarea
```

### 2. 새 페이지 추가

```bash
# 정적 페이지
app/about/page.tsx

# 동적 페이지
app/users/[id]/page.tsx

# 그룹 라우트
app/(marketing)/about/page.tsx
```

### 3. 새 비즈니스 컴포넌트 추가

```bash
# 위치 결정 기준:
1. 특정 페이지에서만 사용 → 해당 페이지 폴더 내
2. 여러 페이지에서 사용 → components/ 바로 아래 (현재 컨벤션) 또는 카테고리 폴더 신설
3. 레이아웃/네비게이션 관련 컴포넌트가 늘어나면 layout/, navigation/ 폴더 신설 고려
```

### 4. 새 유틸리티 추가

```bash
# 공통 유틸리티
lib/utils.ts            # 기존 파일에 추가

# 특화된 유틸리티
lib/date-utils.ts       # 새 파일 생성
```

## 🎯 코드 조직 베스트 프랙티스

### 1. 단일 책임 원칙

- 하나의 파일은 하나의 주요 기능만 담당
- 관련된 타입과 유틸리티는 같은 파일에 포함 가능

### 2. 의존성 순서

```typescript
// 1. 외부 라이브러리
import { useState } from 'react'
import type { NextPage } from 'next'

// 2. 내부 라이브러리 (@/ 경로)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 3. 상대 경로
import './component.css'
```

### 3. Export 규칙

```typescript
// ✅ Named export 사용 (권장) — 이 저장소의 컴포넌트들은 대부분 named export
export function LoginForm() {}

// ✅ Default export (페이지/레이아웃 컴포넌트) — App Router 규약상 필수
export default function LoginPage() {}
```

### 4. 파일 크기 관리

- 단일 파일: 300줄 이하 권장
- 300줄 초과 시 분할 고려

## 🚫 금지사항

### ❌ 피해야 할 구조

```bash
# 깊은 중첩 구조 (4단계 이상)
components/pages/auth/forms/login/login-form.tsx

# 의미 없는 폴더명
components/misc/
components/common/
components/shared/

# 혼재된 케이스
components/userProfile/LoginForm.tsx
```

### ❌ 피해야 할 패턴

```typescript
// 거대한 파일 (500줄 이상)
export function SuperMegaComponent() { /* ... */ }

// 깊은 상대 경로
import { utils } from '../../../../lib/utils'
```

## ✅ 체크리스트

새 파일/폴더 추가 시 확인사항:

- [ ] `src/` 없이 루트 기준 경로 사용
- [ ] 적절한 카테고리 폴더에 배치 (현재는 대부분 `components/` 바로 아래)
- [ ] kebab-case 파일명, PascalCase 컴포넌트명 사용
- [ ] `@/` 경로 별칭 사용
- [ ] 새 npm 패키지가 필요하면 실제로 설치되어 있는지 `package.json`에서 먼저 확인
