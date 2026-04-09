"use client";

import type { KeyboardEvent } from "react";
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
  const safeItems = items.length > 0 ? items : [createTodoCard()];

  const updateItem = (id: string, patch: Partial<TodoCard>) => {
    onChange(safeItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    onChange(safeItems.filter((item) => item.id !== id));
  };

  const insertAfter = (index: number) => {
    const next = [...safeItems];
    next.splice(index + 1, 0, createTodoCard());
    onChange(next);
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
            onChange={(event) => updateItem(item.id, { text: event.target.value })}
            onKeyDown={(event) => handleKeyDown(event, index, item)}
            placeholder="A quick little thing to remember"
          />
          <button
            type="button"
            className={styles.iconAction}
            onClick={() => removeItem(item.id)}
            aria-label="Remove todo"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <button type="button" className={styles.addButton} onClick={() => onChange([...safeItems, createTodoCard()])}>
        <CirclePlus size={16} />
        Add another checkbox
      </button>
    </div>
  );
}
