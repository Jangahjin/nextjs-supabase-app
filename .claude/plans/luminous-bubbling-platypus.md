# 개발 도구 설정 계획 (ESLint / Prettier / Type Check / Husky+lint-staged / 기타)

## Context

현재 프로젝트는 Next.js 16 + Supabase 스타터킷으로, `eslint.config.mjs`(ESLint 9 flat config, `next/core-web-vitals` + `next/typescript`만 적용)만 구성되어 있고 그 외 코드 품질/일관성 도구는 전혀 없다. 조사 결과 다음 문제가 확인됐다:

- `eslint-config-next`가 `15.3.1`로 고정되어 실제 설치된 `next@16.3.0`과 버전이 어긋나 있다.
- Prettier, Husky, lint-staged가 전혀 설치/설정되어 있지 않아 포맷 일관성과 커밋 전 자동 검증이 없다.
- `tsconfig.json`은 `strict: true`로 잘 구성되어 있지만 `tsc --noEmit`을 실행하는 스크립트가 없다.
- CI(GitHub Actions)가 전혀 없어 push/PR 시 자동 검증이 이뤄지지 않는다.
- `.editorconfig`, `.vscode/` 워크스페이스 설정, Node 버전 고정 파일이 없어 협업 시 환경 차이가 발생할 수 있다.

클로드 코드를 통해 안전하고 일관되게 개발을 진행하려면, 커밋 전에 린트/포맷 오류를 자동으로 잡아주고, 타입 오류를 즉시 확인할 수 있는 로컬 도구 체계와 이를 검증하는 최소 CI가 필요하다. 사용자는 CI 포함, 기존 코드베이스 전체 포맷 즉시 적용, Node 버전 고정을 모두 포함하기로 확정했다.

이 프로젝트는 별도 테스트 러너(Jest/Vitest)가 구성되어 있지 않으므로 이번 작업 범위에는 포함하지 않는다(사용자가 명시적으로 요청한 4가지 + 실용적 추천 도구로 범위 한정).

## 실행 순서

### 1. 패키지 설치

```
npm install -D eslint-config-next@^16.3.1 eslint-config-prettier@^10.1.8 prettier@^3.9.6 prettier-plugin-tailwindcss@^0.8.1 husky@^9.1.7 lint-staged@^17.3.0
```

npm 레지스트리에서 실제 존재 확인된 버전(2026-08-14 기준): `eslint-config-next@16.3.1`, `eslint-config-prettier@10.1.8`, `prettier@3.9.6`, `prettier-plugin-tailwindcss@0.8.1`, `husky@9.1.7`, `lint-staged@17.3.0`(node `>=22.22.1` 요구 — 로컬 Node v24.18.0으로 충족).

### 2. ESLint — 버전 정합 + Prettier 충돌 방지

`eslint.config.mjs`를 수정해 `"prettier"`(eslint-config-prettier)를 extends 배열 **맨 끝**에 추가한다(뒤에 오는 설정이 앞의 stylistic 룰을 덮어써서 충돌을 끈다):

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript", "prettier")];

export default eslintConfig;
```

`eslint-plugin-prettier`(ESLint 룰로 Prettier를 실행)는 넣지 않는다 — Prettier는 별도 `format`/`format:check` 스크립트와 lint-staged로 분리 실행하는 편이 실행 속도와 에러 메시지 명확성 면에서 낫다.

### 3. Prettier — 설정 파일 신규 생성

`.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

기존 코드가 세미콜론/더블쿼트를 쓰고 있어(shadcn/ui 기본 스타일과 일치) 대량 diff를 피하기 위해 이 값으로 맞춘다. `prettier-plugin-tailwindcss`는 `tailwind.config.ts`를 자동 감지해 클래스를 정렬하므로 추가 옵션 불필요.

`.prettierignore`:

```
.next
node_modules
coverage
package-lock.json
*.tsbuildinfo
next-env.d.ts
```

`components/ui`(shadcn 생성 파일 7개 확인됨)는 제외하지 않는다 — 자동 재생성 파일이 아니라 사용자가 직접 수정하는 코드이므로 일관된 포맷을 유지하는 편이 낫다.

### 4. TypeScript type check — 스크립트만 추가

파일 수정 없음. `tsconfig.json`은 이미 `noEmit: true`로 적절히 구성됨. `package.json`에 `type-check` 스크립트만 추가(아래 7번 참고).

### 5. Husky + lint-staged

```
npx husky init
```

자동 생성되는 `.husky/pre-commit`의 기본 내용을 아래로 교체:

```sh
npx lint-staged
```

**Windows 주의사항**: `.husky/pre-commit`이 CRLF로 저장되면 Git Bash가 `\r` 때문에 훅 실행에 실패할 수 있다. `.gitattributes`를 신규 생성해 강제로 LF를 유지한다:

```
.husky/* text eol=lf
```

`package.json`에 `lint-staged` 설정 추가:

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,mdx,css,yml,yaml}": ["prettier --write"]
}
```

ESLint는 JS/TS만 대상으로 하고(JSON/MD는 검사 대상 아님), `eslint --fix`를 `prettier --write`보다 먼저 실행해 ESLint의 코드 수정(import 순서 등) 후 Prettier가 최종 포맷을 정리하도록 한다.

`prepare` 스크립트는 `husky || true`로 작성해, devDependencies가 없는 배포 환경(Vercel 등)에서 `husky: command not found`로 빌드가 실패하지 않도록 방어한다.

### 6. next.config.ts — 엄격 모드 유지 (변경 없음)

`eslint.ignoreDuringBuilds`, `typescript.ignoreBuildErrors`는 현재 모두 미설정(기본값 `false`)이라 빌드 시 린트/타입 에러가 있으면 실패하는 엄격한 상태다. 이 상태를 그대로 유지한다 — pre-commit 훅이 staged 파일만 검사하므로, 훅을 우회(`--no-verify`)하거나 미커밋 파일에 에러가 남아있을 경우 빌드 단계가 마지막 안전망 역할을 한다. **파일 수정 없음.**

### 7. `package.json` scripts / engines / lint-staged 필드 정리

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "type-check": "tsc --noEmit",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "prepare": "husky || true"
},
"engines": {
  "node": ">=22.22.1"
}
```

### 8. 기타 추천 도구

**`.editorconfig`** (신규):

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

**`.vscode/settings.json`** (신규):

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.useFlatConfig": true,
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

**`.vscode/extensions.json`** (신규):

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

**`.nvmrc`** (신규, 로컬 Node v24.18.0 기준 메이저 고정):

```
24
```

### 9. GitHub Actions CI (`.github/workflows/ci.yml`, 신규)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run format:check
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: placeholder-key
```

`lib/supabase/server.ts`·`client.ts`가 `NEXT_PUBLIC_SUPABASE_URL!` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!`를 non-null assertion으로 사용하므로, CI 환경(`.env.local` 없음)에서 `next build`가 undefined 값 때문에 실패하지 않도록 build 스텝에 더미 값을 주입한다. 모든 페이지가 `cookies()`(dynamic API)를 사용해 정적 생성 시점에 실제 Supabase 네트워크 호출이 발생하지 않으므로 더미 값으로도 빌드는 안전하게 통과한다.

### 10. 기존 코드베이스 전체 포맷 적용

설정 완료 직후 다음을 순서대로 실행해 별도의 "포맷팅 전용" 커밋으로 분리한다(사용자 확정):

1. `npm run format` — 전체 코드베이스에 Prettier 적용 (대량 diff 발생 예상: 줄바꿈/따옴표/Tailwind 클래스 순서 등)
2. `npm run lint:fix` — ESLint 자동 수정 가능한 항목 정리
3. `npm run type-check` — 타입 에러 없는지 확인
4. `npm run build` — 빌드 성공 확인

이 포맷팅 변경분은 도구 설정 변경(package.json, 설정 파일)과 분리된 별도 커밋으로 만든다(diff 리뷰 용이성).

## 검증 방법

1. `npm run lint` — ESLint 9 flat config + next/core-web-vitals + next/typescript + prettier 통합 확인, 에러 없이 통과
2. `npm run format:check` — 전체 코드베이스가 Prettier 규칙을 통과하는지 확인
3. `npm run type-check` — `tsc --noEmit`으로 타입 에러 없음 확인
4. `npm run build` — Next.js 빌드 성공 확인 (엄격 모드 유지 상태에서)
5. 임의의 `.ts`/`.tsx` 파일을 의도적으로 포맷 어긋나게 수정 후 `git add` + `git commit` 시도 → pre-commit 훅이 `lint-staged`를 실행해 자동으로 포맷을 고치고 커밋이 성공하는지 확인 (Windows/Git Bash 환경에서 훅이 정상 실행되는지가 핵심 검증 포인트)
6. `git push` 후(또는 로컬에서 `act` 등으로) GitHub Actions 워크플로우가 lint/type-check/format:check/build 4단계를 모두 통과하는지 확인 — 실제 push 전이라면 워크플로우 문법만 `yaml` 검증

## 변경/생성 파일 목록

- `package.json` (scripts, engines, lint-staged, devDependencies 수정)
- `eslint.config.mjs` (prettier extends 추가)
- `.prettierrc.json` (신규)
- `.prettierignore` (신규)
- `.editorconfig` (신규)
- `.gitattributes` (신규)
- `.nvmrc` (신규)
- `.vscode/settings.json` (신규)
- `.vscode/extensions.json` (신규)
- `.husky/pre-commit` (신규, `npx husky init`으로 생성 후 내용 교체)
- `.github/workflows/ci.yml` (신규)
- 코드베이스 전체 파일 (Prettier 포맷 적용으로 인한 diff, 별도 커밋)
