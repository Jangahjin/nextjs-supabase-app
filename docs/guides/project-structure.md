# 프로젝트 구조 가이드

이 문서는 이 저장소(Next.js 16 + Supabase 스타터킷)의 실제 폴더 구조, 파일 조직 및 네이밍 컨벤션을 정의합니다.

## 🏗️ 전체 프로젝트 구조

`src/` 디렉토리 없이 `app/`, `components/`, `lib/`이 프로젝트 루트에 바로 위치합니다.

```
nextjs-supabase-app/
├── docs/                   # 📚 프로젝트 문서
│   └── guides/             # 개발 가이드 모음
├── app/                    # 🚀 Next.js App Router
├── components/             # 🧩 React 컴포넌트
├── lib/                    # 🛠️ 유틸리티 및 Supabase 클라이언트
├── supabase/migrations/    # 🗄️ SQL 마이그레이션
├── components.json         # shadcn/ui 설정
├── next.config.ts          # Next.js 설정
├── proxy.ts                # Next.js 16 middleware 대체
├── package.json            # 의존성 및 스크립트
├── tsconfig.json           # TypeScript 설정
└── CLAUDE.md                # 개발 지침 메인 문서
```

## 📁 세부 폴더 구조

### app/ - App Router 페이지

```
app/
├── layout.tsx              # 🎨 루트 레이아웃
├── page.tsx                # 🏠 홈페이지 (/)
├── globals.css             # 🎨 전역 CSS 스타일 (Tailwind 지시어 + CSS 변수)
├── favicon.ico
├── auth/                   # 🔐 인증 관련 라우트
│   ├── login/page.tsx
│   ├── sign-up/page.tsx
│   ├── sign-up-success/page.tsx
│   ├── forgot-password/page.tsx
│   ├── update-password/page.tsx
│   ├── error/page.tsx
│   └── confirm/route.ts    # 이메일 확인 콜백 Route Handler
├── notifications/          # 🔔 인앱 알림 목록 (layout.tsx + page.tsx)
├── events/                 # 📅 전역 "내 이벤트" (주최+참여 통합 뷰, layout.tsx + page.tsx + [eventId]/page.tsx)
├── join/[code]/page.tsx    # ✉️ 이벤트 단위 초대코드로 미리보기 + 참여 신청 (layout.tsx 포함)
├── profile/                # 👤 주최/참여 이벤트 수 통계 (layout.tsx + page.tsx)
└── groups/                 # 🧑‍🤝‍🧑 로그인 후 랜딩 — 모임 관리
    ├── layout.tsx
    ├── page.tsx             # 내 모임 목록
    ├── new/page.tsx         # 모임 생성
    ├── join/[code]/page.tsx # 초대코드로 가입
    └── [groupId]/
        ├── layout.tsx        # 모임 헤더 + 하위 네비게이션(자체 인증/멤버십 체크)
        ├── page.tsx           # 모임 대시보드
        ├── settings/page.tsx
        ├── members/page.tsx
        ├── announcements/{page.tsx, new/page.tsx, [announcementId]/page.tsx}
        └── events/
            ├── page.tsx, new/page.tsx
            └── [eventId]/
                ├── page.tsx           # 일정 상세 (참여자 관리·정산·카풀 진입 링크)
                ├── participants/page.tsx
                ├── settlement/{page.tsx, actions.ts}
                └── carpool/{page.tsx, actions.ts}
```

`app/protected/*`, `app/instruments/*`(Supabase 공식 스타터킷 데모)는 모임 기능 스캐폴딩 과정에서 삭제되었다(커밋 `446a26e`) — 더 이상 존재하지 않는다.

**🚀 App Router 규칙:**

- `page.tsx`: 해당 경로의 메인 페이지
- `layout.tsx`: 레이아웃 컴포넌트 (자식 페이지 감쌈)
- `route.ts`: Route Handler (예: `app/auth/confirm/route.ts`)
- `loading.tsx` / `error.tsx` / `not-found.tsx`: 필요할 때만 추가 (현재 프로젝트에는 없음)

### components/ - 컴포넌트 조직

```
components/
├── ui/                       # 🎛️ shadcn/ui 원시 컴포넌트
│   ├── badge.tsx, button.tsx, card.tsx, checkbox.tsx, input.tsx, label.tsx
│   ├── dropdown-menu.tsx, dialog.tsx, alert-dialog.tsx, table.tsx
│   ├── avatar.tsx, sonner.tsx
├── tutorial/                 # 📘 스타터킷 온보딩용 컴포넌트
├── nav/                       # 🧭 공통 헤더/푸터/앱 셸 (app-header.tsx, app-footer.tsx, app-shell.tsx)
├── groups/                    # 🧑‍🤝‍🧑 모임 생성/설정/가입/멤버 폼
├── events/                    # 🗓️ 일정 생성/RSVP/참여자 행
├── announcements/             # 📢 공지 카드/작성 폼
├── settlements/                # 💰 정산 생성 폼/항목 행
├── carpool/                    # 🚗 카풀 offer/request 폼, 매칭 결과 목록
├── notifications/              # 🔔 헤더 알림 벨(Realtime 구독)
├── auth-button.tsx           # 인증 상태에 따른 헤더 버튼
├── login-form.tsx            # 로그인 폼 (Client Component, useState 기반)
├── sign-up-form.tsx          # 회원가입 폼
├── forgot-password-form.tsx
├── update-password-form.tsx
├── logout-button.tsx
├── google-auth-button.tsx
├── env-var-warning.tsx       # 환경변수 미설정 시 경고 배너
├── theme-switcher.tsx        # next-themes 다크모드 토글
├── hero.tsx
├── deploy-button.tsx
├── supabase-logo.tsx
└── next-logo.tsx
```

도메인별 하위 폴더(`groups/`, `events/`, `announcements/`, `settlements/`, `carpool/`, `notifications/`, `nav/`)가 `ui/`, `tutorial/`과 함께 이미 도입되어 있다 — 새 도메인 기능을 추가할 때는 `components/<feature-plural>/` 폴더를 만들고 kebab-case 파일명(`<feature>-form.tsx`, `<feature>-item-row.tsx` 등)으로 구성할 것.

**🧩 컴포넌트 분류 규칙:**

1. **ui/**: shadcn/ui 기반 재사용 가능한 기본 컴포넌트 — 순수 UI, 비즈니스 로직 없음
2. **tutorial/**: 스타터킷 기본 제공 온보딩 컴포넌트 — 실제 서비스 개발 시작 시 제거 대상으로 간주할 것
3. **도메인 폴더**(`groups/`, `events/`, `announcements/`, `settlements/`, `carpool/`, `notifications/`): 해당 도메인 전용 폼/행/목록 컴포넌트
4. **nav/**: 여러 라우트에서 공유하는 헤더/푸터/앱 셸
5. 그 외: auth/테마 관련 컴포넌트가 `components/` 루트에 평평하게 위치

### lib/ - 유틸리티 및 Supabase 클라이언트

```
lib/
├── utils.ts                 # cn() 헬퍼(clsx + tailwind-merge), hasEnvVars 플래그
└── supabase/
    ├── client.ts             # createBrowserClient — Client Component용
    ├── server.ts              # createServerClient — Server Component/Server Action용
    ├── proxy.ts                # updateSession() — proxy.ts(구 middleware)에서 호출
    └── database.types.ts       # mcp__supabase__generate_typescript_types로 생성되는 DB 타입
```

`env.ts`(환경변수 검증), `constants.ts`, `types/`, `hooks/`, `schemas/`, `api/` 등은 아직 존재하지 않는다. 필요해지면 이 구조를 참고해 추가할 것.

## 🏷️ 파일 네이밍 컨벤션

### 파일명 규칙

```bash
# ✅ 올바른 파일명 (이 프로젝트의 실제 컨벤션: kebab-case)
login-form.tsx
theme-switcher.tsx
env-var-warning.tsx

# ❌ 잘못된 파일명
user_profile.tsx        # snake_case (금지)
userprofile.tsx         # 소문자만 (금지)
```

### 컴포넌트 네이밍

```typescript
// ✅ 올바른 컴포넌트 네이밍
export function LoginForm() {} // PascalCase, named export
export default function LoginPage() {} // 페이지는 default export

// ❌ 잘못된 컴포넌트 네이밍
export function loginForm() {} // camelCase (금지)
```

### 폴더 네이밍

```bash
# ✅ 올바른 폴더명
components/             # 소문자
sign-up-success/        # kebab-case (라우트 폴더)

# ❌ 잘못된 폴더명
Components/            # PascalCase (금지)
sign_up_success/       # snake_case (금지)
```

## 🔗 경로 별칭 (Path Aliases)

`tsconfig.json`은 `@/*` → `./*` 한 가지 별칭만 정의한다. `components.json`(shadcn/ui CLI용)은 이를 세분화해 아래처럼 매핑한다 — 단 `hooks/` 폴더는 실제로 아직 없다.

```typescript
// ✅ 경로 별칭 사용 (권장)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";

// ❌ 상대 경로 사용 지양
import { Button } from "../../../components/ui/button";
```

**📍 `components.json`에 정의된 별칭:**

- `@/components` → `components`
- `@/lib` → `lib`
- `@/components/ui` → `components/ui`
- `@/hooks` → `hooks`(아직 폴더 없음)

`@/ui`, `@/utils` 같은 단축 별칭은 정의되어 있지 않다 — `@/components/ui/*`, `@/lib/utils`로 항상 전체 경로를 써야 한다.

## 📝 새 파일/폴더 추가 규칙

### 1. 새 UI 컴포넌트 추가

```bash
# shadcn/ui 컴포넌트 추가
npx shadcn@latest add [component-name]

# 커스텀 UI 컴포넌트 추가
components/ui/custom-component.tsx
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
2. 여러 페이지에서 사용 → components/ 루트 (또는 필요시 카테고리 폴더 신설)
3. shadcn/ui 원시 컴포넌트 → components/ui/
```

### 4. 새 유틸리티 추가

```bash
# 공통 유틸리티
lib/utils.ts                # 기존 파일에 추가

# 특화된 유틸리티
lib/date-utils.ts           # 새 파일 생성
lib/supabase/*.ts           # Supabase 관련 코드는 반드시 이 폴더에
```

## 🎯 코드 조직 베스트 프랙티스

### 1. 단일 책임 원칙

- 하나의 파일은 하나의 주요 기능만 담당
- 관련된 타입과 유틸리티는 같은 파일에 포함 가능

### 2. 의존성 순서

```typescript
// 1. 외부 라이브러리
import { useState } from "react";
import Link from "next/link";

// 2. 내부 라이브러리 (@/ 경로)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 3. 상대 경로
import "./component.css";
```

### 3. Export 규칙

```typescript
// ✅ Named export 사용 (컴포넌트)
export function LoginForm() {}

// ✅ Default export (페이지/Route Handler)
export default function LoginPage() {}

// ❌ 혼재 사용 지양
export function LoginForm() {}
export default LoginForm;
```

## 🚫 금지사항

### ❌ 피해야 할 구조

```bash
# 깊은 중첩 구조 (4단계 이상)
components/pages/auth/forms/login/LoginForm.tsx

# 의미 없는 폴더명
components/misc/
components/common/
components/shared/

# 혼재된 케이스
Components/userProfile/LoginForm.tsx
```

## ✅ 체크리스트

새 파일/폴더 추가 시 확인사항:

- [ ] 적절한 카테고리 폴더에 배치
- [ ] kebab-case 파일명 사용
- [ ] PascalCase 컴포넌트명 사용
- [ ] `@/*` 경로 별칭 사용
- [ ] 단일 책임 원칙 준수
- [ ] 적절한 export 방식 선택
- [ ] 의존성 import 순서 준수

이 가이드를 따라 일관성 있고 유지보수하기 쉬운 프로젝트 구조를 만들어보세요!
