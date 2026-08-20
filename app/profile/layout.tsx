import { AppShell } from "@/components/nav/app-shell";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
