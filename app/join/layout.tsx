import { AppShell } from "@/components/nav/app-shell";

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
