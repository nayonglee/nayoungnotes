"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { loadEntryOverviews } from "@/lib/local/sync";
import { useAuthStore } from "@/store/auth-store";
import styles from "@/styles/search.module.css";

export function SearchScreen() {
  const viewer = useAuthStore((state) => state.viewer);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const results = useQuery({
    queryKey: ["entries", viewer?.id, "search", deferredQuery],
    queryFn: () => loadEntryOverviews(viewer!, deferredQuery),
    enabled: Boolean(viewer)
  });

  return (
    <div className={styles.page}>
      <label className={styles.searchBox}>
        <SearchIcon size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="제목, 본문, 캡션, 체크리스트 검색"
        />
      </label>

      <section className={styles.results}>
        {(results.data ?? []).map((entry) => (
          <Link key={entry.entryDate} href={`/entry/${entry.entryDate}`} className={styles.resultCard}>
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.previewText || "본문이 아직 없습니다."}</p>
            </div>
            <span>{entry.entryDate}</span>
          </Link>
        ))}

        {!results.isFetching && (results.data ?? []).length === 0 ? (
          <article className={styles.emptyState}>
            <strong>검색 결과가 없습니다.</strong>
            <p>제목, 캡션, 본문에 들어간 단어로 다시 찾아보세요.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
