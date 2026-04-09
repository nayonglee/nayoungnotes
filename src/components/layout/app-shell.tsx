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
  { href: "/archive", label: "Archive", icon: CalendarDays },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings }
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

  useEffect(() => {
    if (sessionReady && !viewer) router.replace("/");
  }, [router, sessionReady, viewer]);

  if (!sessionReady || !viewer) {
    return (
      <div className={styles.loadingShell}>
        <div className={styles.loadingCard}>
          <Sparkles size={24} />
          <p>Opening your paper stack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.frame}>
      <aside className={styles.sidebar}>
        <div className={styles.coverCard}>
          <span className={styles.coverLabel}>Nayoung Notes</span>
          <h1>Quietly glowing pages for one person, across every device.</h1>
          <p>{viewer.email ?? "Preview notebook"}</p>
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
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={styles.contentColumn}>
        <header className={styles.header}>
          <div>
            <p className={styles.headerLabel}>single-user synced diary</p>
            <h2>{title}</h2>
            <p className={styles.headerSubtitle}>{subtitle}</p>
          </div>
          <div className={styles.headerAccessory}>{headerAccessory}</div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
      <PinLockOverlay />
    </div>
  );
}
