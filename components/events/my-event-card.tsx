import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MyEventCard({
  id,
  title,
  location,
  startAt,
  status,
  role,
}: {
  id: string;
  title: string;
  location: string | null;
  startAt: string;
  status: string;
  role: "organizer" | "participant";
}) {
  return (
    <Link href={`/events/${id}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={role === "organizer" ? "default" : "secondary"}>
                {role === "organizer" ? "주최" : "참여"}
              </Badge>
              {status !== "scheduled" && (
                <Badge variant="secondary">{status === "cancelled" ? "취소됨" : "종료됨"}</Badge>
              )}
            </div>
          </div>
          <CardDescription>{formatDateTime(startAt)}</CardDescription>
        </CardHeader>
        {location && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{location}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
