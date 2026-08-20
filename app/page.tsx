import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (auth?.claims) {
    redirect("/groups");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-bold">모임 관리</h1>
        <p className="text-muted-foreground">
          초대코드 하나로 모임을 만들고, 일정·공지·정산·카풀까지 함께 관리하세요.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/auth/login">로그인</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/sign-up">회원가입</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
