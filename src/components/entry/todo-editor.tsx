"use client";

import type { KeyboardEvent } from "react";
import { useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { CirclePlus, Trash2 } from "lucide-react";
import { createTodoCard } from "@/lib/entry";
import type { TodoCard } from "@/types/diary";
import styles from "@/styles/entry.module.css";

export function TodoEditor({
  items,
  onChange
}: {
  items: TodoCard[];
  onChange: (items: TodoCard[]) => void;
}) {
  const inputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const safeItems = items.length > 0 ? items : [createTodoCard()];

  const updateItem = (id: string, patch: Partial<TodoCard>) => {
    onChange(safeItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    onChange(safeItems.filter((item) => item.id !== id));
  };

  const insertAfter = (index: number) => {
    const next = [...safeItems];
    const created = createTodoCard();
    next.splice(index + 1, 0, created);
    onChange(next);
    window.requestAnimationFrame(() => {
      const target = inputRefs.current[created.id];
      if (!target) return;
      target.focus();
      const length = target.value.length;
      target.setSelectionRange(length, length);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, index: number, item: TodoCard) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      insertAfter(index);
    }

    if (event.key === "Backspace" && !item.text && safeItems.length > 1) {
      event.preventDefault();
      removeItem(item.id);
    }
  };

  return (
    <div className={styles.todoList}>
      {safeItems.map((item, index) => (
        <div key={item.id} className={styles.todoRow}>
          <button
            type="button"
            className={styles.todoCheck}
            data-checked={item.checked}
            onClick={() => updateItem(item.id, { checked: !item.checked })}
          />
          <TextareaAutosize
            className={styles.todoInput}
            minRows={1}
            value={item.text}
            ref={(node) => {
              inputRefs.current[item.id] = node;
            }}
            onChange={(event) => updateItem(item.id, { text: event.target.value })}
            onKeyDown={(event) => handleKeyDown(event, index, item)}
            placeholder="Write a task"
          />
          <button
            type="button"
            className={styles.iconAction}
            onClick={() => removeItem(item.id)}
            aria-label="Remove task"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <button type="button" className={styles.addButton} onClick={() => onChange([...safeItems, createTodoCard()])}>
        <CirclePlus size={16} />
        Add task
      </button>
    </div>
  );
}
