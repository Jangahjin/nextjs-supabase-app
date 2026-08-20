import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GroupNotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>페이지를 찾을 수 없습니다</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          요청하신 페이지가 삭제되었거나 주소가 잘못됐어요.
        </p>
      </CardContent>
    </Card>
  );
}
