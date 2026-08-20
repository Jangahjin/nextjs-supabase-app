"use client";

import { cn } from "@/lib/utils";
import { Bell, CalendarDays, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/groups", label: "내 모임", icon: Users },
  { href: "/events", label: "내 이벤트", icon: CalendarDays },
  { href: "/notifications", label: "알림", icon: Bell },
  { href: "/profile", label: "프로필", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-5xl -translate-x-1/2 border-t bg-background">
      <div className="flex h-16 items-center justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
