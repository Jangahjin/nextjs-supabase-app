import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

async function HeaderActions() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;

  return (
    <div className="flex items-center gap-2">
      {userId && <NotificationBell userId={userId} />}
      <AuthButton />
    </div>
  );
}

export function AppHeader() {
  return (
    <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
      <div className="flex w-full max-w-[480px] items-center justify-between p-3 px-5 text-sm">
        <Link href="/groups" className="font-semibold">
          모임 관리
        </Link>
        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <Suspense>
            <HeaderActions />
          </Suspense>
        )}
      </div>
    </nav>
  );
}
