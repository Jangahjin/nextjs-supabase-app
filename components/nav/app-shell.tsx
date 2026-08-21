import { AppHeader } from "@/components/nav/app-header";
import { AppFooter } from "@/components/nav/app-footer";
import { BottomNav } from "@/components/nav/bottom-nav";
import { Suspense } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex w-full flex-1 flex-col items-center gap-10">
        <AppHeader />
        <div className="flex w-full max-w-5xl flex-1 flex-col gap-8 p-5 pb-20 lg:pb-5">
          {children}
        </div>
        <AppFooter />
      </div>
      <Suspense>
        <BottomNav />
      </Suspense>
    </main>
  );
}
