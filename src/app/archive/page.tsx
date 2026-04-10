import { ArchiveHome } from "@/components/archive/archive-home";
import { AppShell } from "@/components/layout/app-shell";

export default function ArchivePage() {
  return (
    <AppShell title="Board Archive" subtitle="Your scrapbook board, calendar, and saved pages">
      <ArchiveHome />
    </AppShell>
  );
}
