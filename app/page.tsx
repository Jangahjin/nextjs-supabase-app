import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CalendarDays, Car, Megaphone, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: CalendarDays,
    title: "일정 관리",
    description: "모임 일정을 만들고 참여 여부를 한눈에 확인하세요.",
  },
  {
    icon: Megaphone,
    title: "공지사항",
    description: "중요한 소식을 모임원 전체에게 빠르게 전달하세요.",
  },
  {
    icon: Receipt,
    title: "N빵 정산",
    description: "이벤트 비용을 자동으로 나누고 정산 현황을 관리하세요.",
  },
  {
    icon: Car,
    title: "카풀 매칭",
    description: "출발지가 비슷한 모임원끼리 자동으로 카풀을 매칭해요.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (auth?.claims) {
    redirect("/groups");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">모임 관리</span>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/auth/login">로그인</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">시작하기</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center md:py-28">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            초대코드 하나로 시작하는 모임 관리
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            모임 운영의 번거로움을 <br className="hidden md:block" />
            하나의 링크로 끝내세요
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            일정 조율부터 공지, N빵 정산, 카풀 매칭까지 — 모임에 필요한 모든 걸 한 곳에서
            관리하세요.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">
                무료로 시작하기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/login">로그인</Link>
            </Button>
          </div>
        </section>

        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-2">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-6 py-20 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">지금 바로 모임을 만들어보세요</h2>
          <p className="text-muted-foreground">
            회원가입 후 몇 번의 클릭만으로 첫 모임을 시작할 수 있어요.
          </p>
          <Button asChild size="lg">
            <Link href="/auth/sign-up">회원가입</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} 모임 관리
      </footer>
    </div>
  );
}
