import { AppShell } from "@/components/nav/app-shell";

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
