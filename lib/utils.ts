import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// VERCEL_URL은 프리뷰/프로덕션 공통으로 항상 *.vercel.app 배포 URL이라 커스텀 도메인을 대체하지 못한다.
// 실제 서비스 도메인은 NEXT_PUBLIC_SITE_URL로 명시하고, 없을 때만 Vercel 프로덕션 도메인 → 배포 URL → 로컬 순으로 폴백한다.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
