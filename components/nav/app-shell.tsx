import { AppHeader } from "@/components/nav/app-header";
import { BottomNav } from "@/components/nav/bottom-nav";
import { Suspense } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center">
        <AppHeader />
        <div className="flex w-full flex-1 flex-col gap-8 p-5 pb-20 lg:pb-5">{children}</div>
      </div>
      <Suspense>
        <BottomNav />
      </Suspense>
    </main>
  );
}
