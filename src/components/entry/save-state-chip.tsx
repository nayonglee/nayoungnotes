"use client";

import clsx from "clsx";
import { AlertCircle, CheckCheck, CloudOff, CloudUpload } from "lucide-react";
import type { SaveState } from "@/types/diary";
import styles from "@/styles/entry.module.css";

export function SaveStateChip({
  state,
  detail
}: {
  state: SaveState;
  detail?: string;
}) {
  const icon =
    state === "syncing" ? (
      <CloudUpload size={14} />
    ) : state === "offline-draft" ? (
      <CloudOff size={14} />
    ) : state === "error" ? (
      <AlertCircle size={14} />
    ) : (
      <CheckCheck size={14} />
    );

  const label =
    state === "syncing"
      ? "Syncing..."
      : state === "offline-draft"
        ? "Offline Draft"
        : state === "error"
          ? "Needs attention"
          : "Saved";

  return (
    <span className={clsx(styles.saveChip, styles[`saveChip_${state}`])}>
      {icon}
      <span>{detail ?? label}</span>
    </span>
  );
}
