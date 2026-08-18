import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AnnouncementCard({
  groupId,
  id,
  title,
  content,
  pinned,
  createdAt,
}: {
  groupId: string;
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
}) {
  return (
    <Link href={`/groups/${groupId}/announcements/${id}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{title}</CardTitle>
            {pinned && <Badge>고정</Badge>}
          </div>
          <CardDescription>{formatDateTime(createdAt)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">{content}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
