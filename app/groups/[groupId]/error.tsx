"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

export default function GroupErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>이 화면을 불러오지 못했습니다</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          일시적인 오류일 수 있어요. 다시 시도해 주세요.
        </p>
        <Button onClick={retry} className="w-fit">
          다시 시도
        </Button>
      </CardContent>
    </Card>
  );
}
