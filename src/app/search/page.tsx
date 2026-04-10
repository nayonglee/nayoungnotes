import { AppShell } from "@/components/layout/app-shell";
import { SearchScreen } from "@/components/search/search-screen";

export default function SearchPage() {
  return (
    <AppShell title="Search" subtitle="Find titles, journal text, captions, tasks, and plans">
      <SearchScreen />
    </AppShell>
  );
}
