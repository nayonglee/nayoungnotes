import { EntryEditor } from "@/components/entry/entry-editor";
import { AppShell } from "@/components/layout/app-shell";

export default async function EntryPage({
  params
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  return (
    <AppShell title="하루 페이지" subtitle={date}>
      <EntryEditor entryDate={date} />
    </AppShell>
  );
}
