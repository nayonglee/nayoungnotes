"use client";

import type { KeyboardEvent } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { CirclePlus, Clock3, Trash2 } from "lucide-react";
import { createPlannerBlock } from "@/lib/entry";
import type { PlannerBlock } from "@/types/diary";
import styles from "@/styles/entry.module.css";

function nextHour(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const next = `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:${String(
    minute || 0
  ).padStart(2, "0")}`;
  return next;
}

function formatPlannerTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "12:00 PM";
  const meridiem = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

export function TimePlanner({
  blocks,
  onChange
}: {
  blocks: PlannerBlock[];
  onChange: (blocks: PlannerBlock[]) => void;
}) {
  const safeBlocks = blocks.length > 0 ? blocks : [createPlannerBlock()];

  const updateBlock = (id: string, patch: Partial<PlannerBlock>) => {
    onChange(safeBlocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  };

  const addBlock = (afterIndex?: number) => {
    if (typeof afterIndex === "number") {
      const anchor = safeBlocks[afterIndex];
      const next = [...safeBlocks];
      next.splice(afterIndex + 1, 0, createPlannerBlock(nextHour(anchor.time)));
      onChange(next);
      return;
    }

    const last = safeBlocks.at(-1);
    onChange([...safeBlocks, createPlannerBlock(nextHour(last?.time ?? "18:00"))]);
  };

  const removeBlock = (id: string) => {
    onChange(safeBlocks.filter((block) => block.id !== id));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, index: number, block: PlannerBlock) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addBlock(index);
    }

    if (event.key === "Backspace" && !block.title && !block.note && safeBlocks.length > 1) {
      event.preventDefault();
      removeBlock(block.id);
    }
  };

  return (
    <div className={styles.plannerList}>
      {safeBlocks.map((block, index) => (
        <div key={block.id} className={styles.plannerCard}>
          <div className={styles.plannerMainRow}>
            <div className={styles.plannerTimeStack}>
              <span className={styles.plannerClock}>
                <Clock3 size={14} />
              </span>
              <div className={styles.plannerTimeField}>
                <span className={styles.plannerTimeBadge}>{formatPlannerTime(block.time)}</span>
                <input
                  type="time"
                  className={styles.timeInput}
                  value={block.time}
                  onChange={(event) => updateBlock(block.id, { time: event.target.value })}
                />
              </div>
            </div>

            <input
              className={styles.plannerTitleInput}
              value={block.title}
              onChange={(event) => updateBlock(block.id, { title: event.target.value })}
              placeholder="Lunch, class, call..."
            />

            <button
              type="button"
              className={styles.iconAction}
              onClick={() => removeBlock(block.id)}
              aria-label="Remove plan"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <TextareaAutosize
            className={styles.plannerNoteInput}
            minRows={1}
            value={block.note}
            onChange={(event) => updateBlock(block.id, { note: event.target.value })}
            onKeyDown={(event) => handleKeyDown(event, index, block)}
            placeholder="Small note or place"
          />
        </div>
      ))}

      <button type="button" className={styles.addButton} onClick={() => addBlock()}>
        <CirclePlus size={16} />
        Add plan time
      </button>
    </div>
  );
}
