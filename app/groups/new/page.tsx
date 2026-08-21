import { GroupForm } from "@/components/groups/group-form";

export default function NewGroupPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">새 모임 만들기</h1>
      <GroupForm />
    </div>
  );
}
