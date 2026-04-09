import { AppShell } from "@/components/layout/app-shell";
import { SearchScreen } from "@/components/search/search-screen";

export default function SearchPage() {
  return (
    <AppShell title="검색" subtitle="제목, 본문, 캡션, 체크리스트 검색">
      <SearchScreen />
    </AppShell>
  );
}
