"use client";

import TextareaAutosize from "react-textarea-autosize";
import { createPlannerTemplate, createTeachingPayload, createTodoTemplate } from "@/lib/entry";
import type { DayType, PlannerBlock, TeachingPayload, TodoCard } from "@/types/diary";
import styles from "@/styles/entry.module.css";

const dayTypeLabels: Record<DayType, string> = {
  school: "School",
  teaching: "Teaching",
  prep: "Prep",
  reset: "Reset"
};

export function TeachingBoard({
  entryDate,
  payload,
  onChange,
  onApplyTemplate
}: {
  entryDate: string;
  payload: TeachingPayload;
  onChange: (payload: TeachingPayload) => void;
  onApplyTemplate: (template: {
    teaching: TeachingPayload;
    planner: PlannerBlock[];
    todo: TodoCard[];
  }) => void;
}) {
  const update = (patch: Partial<TeachingPayload>) => onChange({ ...payload, ...patch });

  return (
    <div className={styles.teachingBoard}>
      <div className={styles.teachingHeader}>
        <div className={styles.inlineButtons}>
          {(Object.keys(dayTypeLabels) as DayType[]).map((dayType) => (
            <button
              key={dayType}
              type="button"
              className={payload.dayType === dayType ? styles.secondaryActive : styles.secondaryButton}
              onClick={() => update({ dayType })}
            >
              {dayTypeLabels[dayType]}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() =>
            onApplyTemplate({
              teaching: createTeachingPayload(entryDate),
              planner: createPlannerTemplate(entryDate),
              todo: createTodoTemplate(entryDate)
            })
          }
        >
          Apply my template
        </button>
      </div>

      <div className={styles.teachingMiniGrid}>
        {payload.subjects.map((subject) => (
          <label key={subject.id} className={styles.subjectCard}>
            <div className={styles.subjectTop}>
              <button
                type="button"
                className={styles.todoCheck}
                data-checked={subject.checked}
                onClick={() =>
                  update({
                    subjects: payload.subjects.map((item) =>
                      item.id === subject.id ? { ...item, checked: !item.checked } : item
                    )
                  })
                }
              />
              <span>{subject.label}</span>
            </div>
            <TextareaAutosize
              className={styles.subjectNoteInput}
              minRows={1}
              value={subject.note}
              onChange={(event) =>
                update({
                  subjects: payload.subjects.map((item) =>
                    item.id === subject.id ? { ...item, note: event.target.value } : item
                  )
                })
              }
              placeholder="Plan or note"
            />
          </label>
        ))}
      </div>

      <label className={styles.baseballField}>
        <span className={styles.baseballLabel}>Med school focus</span>
        <TextareaAutosize
          className={styles.baseballTextarea}
          minRows={2}
          value={payload.medSchoolFocus}
          onChange={(event) => update({ medSchoolFocus: event.target.value })}
          placeholder="What has to be protected for med school today?"
        />
      </label>

      <label className={styles.baseballField}>
        <span className={styles.baseballLabel}>Academy work</span>
        <TextareaAutosize
          className={styles.baseballTextarea}
          minRows={2}
          value={payload.academyWork}
          onChange={(event) => update({ academyWork: event.target.value })}
          placeholder="Lesson prep, feedback, printing, messaging..."
        />
      </label>

      <label className={styles.baseballField}>
        <span className={styles.baseballLabel}>Poke prompt</span>
        <TextareaAutosize
          className={styles.baseballTextarea}
          minRows={3}
          value={payload.pokePrompt}
          onChange={(event) => update({ pokePrompt: event.target.value })}
          placeholder="Prompt draft for Poke or any AI assistant"
        />
      </label>
    </div>
  );
}
