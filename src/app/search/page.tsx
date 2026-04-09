import { AppShell } from "@/components/layout/app-shell";
import { SearchScreen } from "@/components/search/search-screen";

export default function SearchPage() {
  return (
    <AppShell title="Search" subtitle="Look up titles, diary text, captions, and checklists.">
      <SearchScreen />
    </AppShell>
  );
}
