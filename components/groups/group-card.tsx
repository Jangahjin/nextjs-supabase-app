import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

// 의도적 예외: 이 카드는 design.txt의 "raw archive" 무드 요청에 따라 앱 전역 shadcn 테마
// (네이비/오렌지 시맨틱 토큰, rounded-xl)를 쓰지 않고 뉴트럴 팔레트 + 직각 모서리로 작성한다.
// 다른 페이지를 이 패턴으로 따라 만들지 말 것 — 여기서만 의도된 예외다.

const STATUS_LABEL: Record<string, string> = {
  pending: "승인 대기중",
  approved: "가입됨",
};

export function GroupCard({
  id,
  name,
  category,
  description,
  status,
  coverImageUrl,
  updatedAt,
}: {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  status: "pending" | "approved";
  coverImageUrl: string | null;
  updatedAt: string;
}) {
  return (
    <Link
      href={`/groups/${id}`}
      className="group block border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {coverImageUrl ? (
          <Image
            src={`${coverImageUrl}?t=${new Date(updatedAt).getTime()}`}
            alt={`${name} 대표 사진`}
            fill
            sizes="(min-width: 1024px) 480px, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-400 dark:text-neutral-600">
            <ImageOff className="size-6" />
            <span className="text-[10px] uppercase tracking-widest">사진 없음</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-light tracking-wide text-neutral-900 dark:text-neutral-100">
            {name}
          </h3>
          <span className="shrink-0 border border-neutral-300 px-2 py-0.5 text-[10px] uppercase tracking-widest text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            {STATUS_LABEL[status]}
          </span>
        </div>
        {category && (
          <p className="text-xs font-light uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            {category}
          </p>
        )}
        {description && (
          <p className="text-sm font-light leading-relaxed text-neutral-600 dark:text-neutral-300">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}
