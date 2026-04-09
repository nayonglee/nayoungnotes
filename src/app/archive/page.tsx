import { ArchiveHome } from "@/components/archive/archive-home";
import { AppShell } from "@/components/layout/app-shell";

export default function ArchivePage() {
  return (
    <AppShell title="아카이브" subtitle="달력, 최근 기록, 날짜별 페이지">
      <ArchiveHome />
    </AppShell>
  );
}
