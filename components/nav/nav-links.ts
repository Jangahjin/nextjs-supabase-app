import { Bell, CalendarDays, User, Users, type LucideIcon } from "lucide-react";

export const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/groups", label: "내 모임", icon: Users },
  { href: "/events", label: "내 이벤트", icon: CalendarDays },
  { href: "/notifications", label: "알림", icon: Bell },
  { href: "/profile", label: "프로필", icon: User },
];
