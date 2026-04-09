import { ArchiveHome } from "@/components/archive/archive-home";
import { AppShell } from "@/components/layout/app-shell";

export default function ArchivePage() {
  return (
    <AppShell title="Archive" subtitle="Calendar, list view, and recent paper trails.">
      <ArchiveHome />
    </AppShell>
  );
}
