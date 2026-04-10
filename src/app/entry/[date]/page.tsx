import { EntryEditor } from "@/components/entry/entry-editor";
import { AppShell } from "@/components/layout/app-shell";

export default async function EntryPage({
  params
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  return (
    <AppShell title="Daily Page" subtitle={date} variant="bare">
      <EntryEditor entryDate={date} />
    </AppShell>
  );
}
