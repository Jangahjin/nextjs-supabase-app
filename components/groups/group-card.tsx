import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  pending: "승인 대기중",
  approved: "가입됨",
};

export function GroupCard({
  id,
  name,
  category,
  description,
  status,
}: {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  status: "pending" | "approved";
}) {
  return (
    <Link href={`/groups/${id}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant={status === "approved" ? "default" : "secondary"}>
              {STATUS_LABEL[status]}
            </Badge>
          </div>
          {category && <CardDescription>{category}</CardDescription>}
        </CardHeader>
        {description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{description}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
