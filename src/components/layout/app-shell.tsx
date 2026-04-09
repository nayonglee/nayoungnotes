"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarDays, Search, Settings, Sparkles } from "lucide-react";
import { PinLockOverlay } from "@/components/layout/pin-lock-overlay";
import { useAuthStore } from "@/store/auth-store";
import styles from "@/styles/shell.module.css";

const navigation = [
  { href: "/archive", label: "아카이브", icon: CalendarDays },
  { href: "/search", label: "검색", icon: Search },
  { href: "/settings", label: "설정", icon: Settings }
];

export function AppShell({
  title,
  subtitle,
  headerAccessory,
  children
}: {
  title: string;
  subtitle: string;
  headerAccessory?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const viewer = useAuthStore((state) => state.viewer);
  const sessionReady = useAuthStore((state) => state.sessionReady);
  const configured = useAuthStore((state) => state.supabaseConfigured);

  useEffect(() => {
    if (sessionReady && !viewer) router.replace("/");
  }, [router, sessionReady, viewer]);

  if (!sessionReady || !viewer) {
    return (
      <div className={styles.loadingShell}>
        <div className={styles.loadingCard}>
          <Sparkles size={24} />
          <p>페이지를 준비하고 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.frame}>
      <aside className={styles.sidebar}>
        <div className={styles.coverCard}>
          <div className={styles.coverTop}>
            <span className={styles.coverLabel}>Nayoung Notes</span>
            <span className={styles.modeBadge} data-mode={viewer.mode}>
              {viewer.mode === "preview" ? "로컬 미리보기" : "클라우드"}
            </span>
          </div>

          <div className={styles.coverBody}>
            <div className={styles.coverSpine}>♡ ★ ◎</div>
            <div className={styles.coverMain}>
              <h1>{title}</h1>
              <p>{subtitle}</p>
              <div className={styles.coverMeta}>
                <span>{viewer.email ?? "preview@nayoungnotes.local"}</span>
                <span>{configured ? "연동 준비 완료" : "연동 설정 필요"}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(styles.navLink, active && styles.navLinkActive)}
              >
                <span className={styles.navIconWrap}>
                  <Icon size={17} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={styles.contentColumn}>
        <header className={styles.header}>
          <div>
            <span className={styles.headerLabel}>personal diary</span>
            <h2>{title}</h2>
            <p className={styles.headerSubtitle}>{subtitle}</p>
          </div>
          <div className={styles.headerAccessory}>{headerAccessory}</div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>

      <nav className={styles.mobileTabs}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(styles.mobileTab, active && styles.mobileTabActive)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <PinLockOverlay />
    </div>
  );
}
